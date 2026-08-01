import type { TraceRequest, TraceResult } from './types'

export { fmt } from './snapshot'
export { trace, STEP_CAP } from './run'
export type { Step, TraceRequest, TraceResult } from './types'

/** Hard ceiling before we give up on a trace (worker terminated). */
export const TRACE_MS = 4000

/** Trace in a Worker: a whole-function-on-one-line infinite loop can't hang the tab. */
export type TraceOutcome = (TraceResult & { engine?: 'quickjs-wasm' | 'fallback' }) | null

export function traceAsync(req: TraceRequest): Promise<TraceOutcome> {
  return new Promise<TraceOutcome>((resolve) => {
    let w: Worker
    try {
      w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(null)
      return
    }
    const stop = setTimeout(() => {
      w.terminate()
      resolve({
        steps: [],
        result: undefined,
        error: `Gave up after ${TRACE_MS / 1000}s — this looks like an infinite loop.`,
      })
    }, TRACE_MS)
    w.onmessage = (ev: MessageEvent<TraceOutcome>) => {
      clearTimeout(stop)
      w.terminate()
      resolve(ev.data)
    }
    w.onerror = () => {
      clearTimeout(stop)
      w.terminate()
      resolve(null)
    }
    w.postMessage(req)
  })
}
