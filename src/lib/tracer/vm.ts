// QuickJS-WASM executor. The user's (instrumented) code runs inside a WASM
// sandbox on the user's machine — never on a server, and never with access to
// the worker/page globals. What the sandbox buys over plain in-worker eval:
//
//   - isolation: no fetch/postMessage/DOM/globals reachable from user code
//   - a deterministic interrupt: runaway loops stop at a deadline even when
//     no instrumentation probe landed inside them (whole-function-on-one-line)
//   - a memory ceiling
//
// Marshalling rule: never cross the WASM boundary per variable. The snapshot
// is built INSIDE the VM (__snap, a JS-source port of snapshot.ts) and the
// whole trace comes out as ONE JSON string.
import {
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
} from 'quickjs-emscripten-core'
import releaseVariant from '@jitl/quickjs-singlefile-mjs-release-sync'
import type { QuickJSWASMModule } from 'quickjs-emscripten-core'
import { STEP_CAP } from './run'
import type { TraceRequest, TraceResult } from './types'

export const VM_TIME_MS = 3500
const VM_MEMORY_BYTES = 64 * 1024 * 1024
const VM_STACK_BYTES = 1024 * 1024

let modPromise: Promise<QuickJSWASMModule> | null = null
function loadModule(): Promise<QuickJSWASMModule> {
  modPromise ??= newQuickJSWASMModuleFromVariant(releaseVariant)
  return modPromise
}

// VM-side prelude: __snap mirrors snapshot.ts (host copy is the oracle — a
// vitest parity case asserts both produce identical JSON), plus the __step /
// __peek probes the instrumented source calls.
const PRELUDE = `
"use strict";
globalThis.__HOLE = { __hole: 1 };
globalThis.__OOS = { __oos: 1 };
globalThis.__snap = function __snap(v, depth) {
  depth = depth || 0;
  if (v === null) return null;
  if (typeof v === 'function') return { __fn: v.name || 'fn' };
  if (typeof v !== 'object') return v;
  if (depth > 3) return { __deep: 1 };
  if (Array.isArray(v)) {
    if (v.length > 64) return { __big: 'Array(' + v.length + ')' };
    var a = [];
    for (var i = 0; i < v.length; i++) a.push(i in v ? __snap(v[i], depth + 1) : __HOLE);
    return { __arr: a };
  }
  if (v instanceof Map) {
    if (v.size > 40) return { __big: 'Map(' + v.size + ')' };
    var m = [];
    v.forEach(function (val, k) { m.push([__snap(k, depth + 1), __snap(val, depth + 1)]); });
    return { __map: m };
  }
  if (v instanceof Set) {
    if (v.size > 40) return { __big: 'Set(' + v.size + ')' };
    var s = [];
    v.forEach(function (x) { s.push(__snap(x, depth + 1)); });
    return { __set: s };
  }
  var o = {};
  var keys = Object.keys(v);
  for (var j = 0; j < keys.length && j < 40; j++) o[keys[j]] = __snap(v[keys[j]], depth + 1);
  if (keys.length > 40) o['…'] = { __big: '+' + (keys.length - 40) + ' more' };
  return { __obj: o };
};
globalThis.__steps = [];
globalThis.__live = false;   // module-level probes are dropped, same as run.ts
globalThis.__peek = function (get) {
  try { return __snap(get()); } catch (e) { return __OOS; }
};
globalThis.__step = function (line, vars) {
  if (!__live) return;
  if (__steps.length >= ${STEP_CAP}) throw new Error('__CAP__');
  __steps.push({ line: line, vars: vars });
};
`

/**
 * Run an already-instrumented source inside QuickJS. Returns null when the VM
 * itself is unavailable (caller falls back to in-worker eval).
 */
export async function traceInVM(
  instrumented: string,
  req: TraceRequest,
): Promise<TraceResult | null> {
  let mod: QuickJSWASMModule
  try {
    mod = await loadModule()
  } catch {
    return null
  }

  const runtime = mod.newRuntime()
  runtime.setMemoryLimit(VM_MEMORY_BYTES)
  runtime.setMaxStackSize(VM_STACK_BYTES)
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + VM_TIME_MS))
  const vm = runtime.newContext()

  const evalJson = (src: string): { ok: true; value: unknown } | { ok: false; error: string } => {
    const r = vm.evalCode(src)
    if (r.error) {
      const e = vm.dump(r.error) as { name?: string; message?: string } | string
      r.error.dispose()
      const msg =
        typeof e === 'string' ? e : `${e?.name ?? 'Error'}: ${e?.message ?? 'unknown'}`
      return { ok: false, error: msg }
    }
    const v = vm.dump(r.value) as unknown
    r.value.dispose()
    return { ok: true, value: v }
  }

  try {
    const names = [req.fnName, ...req.extraNames].filter(Boolean)
    const setup = evalJson(
      PRELUDE +
        '\n' +
        instrumented +
        `\n;globalThis.__fns = {${names
          .map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`)
          .join(',')}};` +
        `\n(typeof __fns[${JSON.stringify(req.fnName)}] === 'function')`,
    )
    if (!setup.ok || setup.value !== true) return null // caller degrades; test run shows the real error

    // args enter the VM as JSON — fresh objects, no cloning concerns
    const exec = evalJson(
      `globalThis.__out = (function () {
        var args = ${JSON.stringify(req.args)};
        __live = true;
        try {
          var r = __fns[${JSON.stringify(req.fnName)}].apply(null, args);
          __live = false;
          return { result: __snap(r), error: null };
        } catch (e) {
          __live = false;
          return {
            result: undefined,
            error: e && e.message === '__CAP__'
              ? '__CAP__'
              : String(e && e.name ? e.name + ': ' + e.message : e),
          };
        }
      })(); 1`,
    )

    // steps survive an interrupt: the context outlives the aborted eval
    const stepsOut = evalJson(`JSON.stringify(__steps)`)
    const steps = stepsOut.ok ? (JSON.parse(stepsOut.value as string) as TraceResult['steps']) : []

    if (!exec.ok) {
      const interrupted = /interrupt/i.test(exec.error)
      return {
        steps,
        result: undefined,
        error: interrupted
          ? `Stopped after ${(VM_TIME_MS / 1000).toFixed(1)}s in the sandbox — this looks like an infinite loop.`
          : exec.error,
      }
    }

    const outRes = evalJson(`JSON.stringify({ result: __out.result, error: __out.error })`)
    if (!outRes.ok) return { steps, result: undefined, error: exec.ok ? null : 'trace readback failed' }
    const out = JSON.parse(outRes.value as string) as { result: unknown; error: string | null }
    return {
      steps,
      result: out.result,
      error:
        out.error === '__CAP__'
          ? `Stopped after ${STEP_CAP} steps — this looks like an infinite loop.`
          : out.error,
    }
  } finally {
    vm.dispose()
    runtime.dispose()
  }
}
