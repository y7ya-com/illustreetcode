// Runner worker: user code executes at native speed OFF the main thread, so
// `Run tests` on an infinite loop can't freeze the tab — the main thread
// terminates this worker on timeout. Native (not WASM) on purpose: the stress
// budgets measure real complexity; QuickJS is ~30-50x slower and would fail
// every correct solution. The step-through tracer is the sandboxed path.
import { CONTENT } from '../data/content'
import { runTests } from './index'

self.onmessage = (e: MessageEvent<{ slug: string; code: string }>) => {
  const { slug, code } = e.data
  const P = CONTENT[slug]
  if (!P) {
    self.postMessage(null)
    return
  }
  try {
    self.postMessage(runTests(code, P))
  } catch {
    self.postMessage(null)
  }
}
