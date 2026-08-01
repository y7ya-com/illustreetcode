// Executes instrumented code and records steps. Runs inside a Worker in the
// app (see worker.ts) so a runaway loop is killable; pure enough to run in
// vitest directly.
import { OOS, snap } from './snapshot'
import { instrument } from './instrument'
import type { Step, TraceResult } from './types'

export const STEP_CAP = 4000

export function trace(
  code: string,
  fnName: string,
  extraNames: Array<string>,
  args: Array<unknown>,
): TraceResult | null {
  const steps: Array<Step> = []
  let live = false

  const __peek = (get: () => unknown): unknown => {
    try {
      return snap(get())
    } catch {
      return OOS
    }
  }
  const __step = (line: number, vars: Record<string, unknown>): void => {
    if (!live) return
    if (steps.length >= STEP_CAP) throw new Error('__CAP__')
    steps.push({ line, vars })
  }

  const names = [fnName, ...extraNames].filter(Boolean)
  const tail = `\n;return {${names
    .map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`)
    .join(',')}};`

  let fns: Record<string, unknown>
  try {
    fns = new Function('__step', '__peek', instrument(code, names) + tail)(
      __step,
      __peek,
    ) as Record<string, unknown>
  } catch {
    return null // didn't parse / didn't compile — caller shows the real error via test run
  }
  if (typeof fns[fnName] !== 'function') return null

  let error: string | null = null
  let result: unknown
  live = true
  try {
    result = (fns[fnName] as (...a: Array<unknown>) => unknown)(...structuredClone(args))
  } catch (e) {
    const err = e as Error
    error =
      err.message === '__CAP__'
        ? `Stopped after ${STEP_CAP} steps — this looks like an infinite loop.`
        : `${err.name}: ${err.message}`
  }
  live = false

  return { steps, error, result: snap(result) }
}
