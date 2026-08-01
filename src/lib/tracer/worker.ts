// Tracer worker: instruments on the worker side, executes inside QuickJS-WASM
// (user code sees no worker/page globals, and a deadline interrupt stops
// probe-less infinite loops). Falls back to in-worker eval only if the WASM
// module itself fails to load; the main thread's terminate() stays as the
// last backstop either way.
import { instrument } from './instrument'
import { trace } from './run'
import { traceInVM } from './vm'
import type { TraceRequest, TraceResult } from './types'

self.onmessage = async (e: MessageEvent<TraceRequest>) => {
  const { code, fnName, extraNames, args } = e.data
  let out: (TraceResult & { engine?: string }) | null = null
  try {
    const names = [fnName, ...extraNames].filter(Boolean)
    const instrumented = instrument(code, names)
    const vmResult = await traceInVM(instrumented, e.data)
    if (vmResult) out = { ...vmResult, engine: 'quickjs-wasm' }
    else {
      const fb = trace(code, fnName, extraNames, args)
      if (fb) out = { ...fb, engine: 'fallback' }
    }
  } catch {
    try {
      const fb = trace(code, fnName, extraNames, args)
      if (fb) out = { ...fb, engine: 'fallback' }
    } catch {
      out = null
    }
  }
  self.postMessage(out)
}
