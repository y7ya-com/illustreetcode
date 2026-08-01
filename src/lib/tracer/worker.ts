// Worker wrapper: isolation from the page + guaranteed kill via terminate().
import { trace } from './run'
import type { TraceRequest } from './types'

self.onmessage = (e: MessageEvent<TraceRequest>) => {
  const { code, fnName, extraNames, args } = e.data
  let out = null
  try {
    out = trace(code, fnName, extraNames, args)
  } catch {
    out = null
  }
  self.postMessage(out)
}
