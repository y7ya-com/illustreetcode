// Test runner — ported from the prototype's problem.html inline runner.
// Comparators: exact / unordered / groups; modes: return / mutate / roundTrip;
// per-problem custom check(); stress tests gated on a green suite.
import type { ProblemContent, TestCase } from '../data/types'

export interface CaseResult {
  ok: boolean
  args: Array<unknown>
  want: unknown
  got: unknown
  why?: string
}

export interface RunReport {
  rows: Array<CaseResult>
  passed: number
  total: number
  all: boolean
  ms: number
  logs: Array<string>
  parseError?: string
  stress?: {
    ok: boolean
    right: boolean
    took: string
    note: string
    budget: number
    why?: string
  }
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
const cmpAny = (a: unknown, b: unknown): number =>
  (a as never) < (b as never) ? -1 : (a as never) > (b as never) ? 1 : 0

function normalise(v: unknown, cmp?: 'unordered' | 'groups'): unknown {
  if (cmp === 'unordered' && Array.isArray(v)) return [...v].sort(cmpAny)
  if (cmp === 'groups' && Array.isArray(v))
    return v
      .map((g) => (Array.isArray(g) ? [...g].sort(cmpAny) : g))
      .sort((a, b) => cmpAny(JSON.stringify(a), JSON.stringify(b)))
  return v
}

type AnyFn = (...args: Array<unknown>) => unknown

function compile(code: string, names: Array<string>): Record<string, AnyFn> | string {
  try {
    return new Function(
      code +
        '\n;return {' +
        names.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(',') +
        '};',
    )() as Record<string, AnyFn>
  } catch (e) {
    return (e as Error).message
  }
}

export function runTests(code: string, P: ProblemContent): RunReport {
  const names = [P.fn, P.fn2].filter(Boolean) as Array<string>
  const fns = compile(code, names)
  if (typeof fns === 'string')
    return { rows: [], passed: 0, total: P.tests.length, all: false, ms: 0, logs: [], parseError: fns }
  for (const n of names)
    if (typeof fns[n] !== 'function')
      return {
        rows: [], passed: 0, total: P.tests.length, all: false, ms: 0, logs: [],
        parseError: `Couldn't find a function called ${n}.`,
      }

  const logs: Array<string> = []
  const realLog = console.log
  console.log = (...a: Array<unknown>) => {
    logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))
    realLog(...a)
  }

  const rows: Array<CaseResult> = []
  let passed = 0
  const t0 = performance.now()

  const runCase = (test: TestCase): CaseResult => {
    const args = structuredClone(test.args)
    try {
      let got: unknown
      if (P.roundTrip) got = fns[P.fn2!]!(fns[P.fn]!(args[0]))
      else if (P.mode === 'mutate') {
        fns[P.fn]!(...args)
        got = args[0]
      } else got = fns[P.fn]!(...args)
      const want = P.roundTrip ? test.args[0] : test.expect
      const v = P.check
        ? P.check(got, test.args)
        : { ok: same(normalise(got, P.cmp), normalise(want, P.cmp)) }
      return { ok: v.ok, args: test.args, want, got, why: 'why' in v ? v.why : undefined }
    } catch (e) {
      const err = e as Error
      return {
        ok: false, args: test.args,
        want: P.roundTrip ? test.args[0] : test.expect,
        got: undefined, why: `threw ${err.name}: ${err.message}`,
      }
    }
  }

  for (const test of P.tests) {
    const r = runCase(test)
    rows.push(r)
    if (r.ok) passed++
  }

  // stress only after everything else is green — a broken solution shouldn't
  // get 40k elements thrown at it
  let stress: RunReport['stress']
  if (P.stress && passed === P.tests.length) {
    const s = P.stress
    const args = s.args()
    const before = performance.now()
    try {
      const got = P.mode === 'mutate' ? (fns[P.fn]!(...args), args[0]) : fns[P.fn]!(...args)
      const took = performance.now() - before
      const right = same(normalise(got, P.cmp), normalise(s.expect, P.cmp))
      stress = { ok: right && took <= s.budgetMs, took: took.toFixed(0), right, note: s.note, budget: s.budgetMs }
    } catch (e) {
      const err = e as Error
      stress = { ok: false, took: '—', right: false, note: s.note, budget: s.budgetMs, why: `threw ${err.name}: ${err.message}` }
    }
  }

  console.log = realLog
  const ms = performance.now() - t0
  const all = passed === P.tests.length && (!stress || stress.ok)
  return { rows, passed, total: P.tests.length, all, ms, logs, stress }
}
