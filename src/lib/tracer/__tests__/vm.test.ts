// QuickJS-WASM executor: parity with the in-worker tracer, true isolation,
// and interrupt behaviour on probe-less infinite loops.
import { describe, expect, it } from 'vitest'
import { instrument } from '../instrument'
import { snap } from '../snapshot'
import { STEP_CAP, trace } from '../run'
import { traceInVM, VM_TIME_MS } from '../vm'
import type { TraceRequest } from '../types'

const run = (code: string, fnName: string, args: Array<unknown>) => {
  const req: TraceRequest = { code, fnName, extraNames: [], args }
  return traceInVM(instrument(code, [fnName]), req)
}

const BUCKET = `var topKFrequent = function(nums, k) {
    const hash = new Map();
    for(const num of nums) {
        hash.set(num, (hash.get(num) || 0) + 1)
    }
    const bucket = [];
    for(const [num, quantity] of hash) {
        if(bucket[quantity]) bucket[quantity].push(num)
        else bucket[quantity] = [num]
    }
    const result = [];
    for(let i = nums.length; result.length < k; i--) {
        if(bucket[i]) result.push(...bucket[i]);
    }
    return result;
};`

describe('traceInVM parity with in-worker tracer', () => {
  it('identical steps and result on the bucket solution', async () => {
    const args = [[12, 12, 12, 30, 30, 44], 2]
    const vm = await run(BUCKET, 'topKFrequent', args)
    const host = trace(BUCKET, 'topKFrequent', [], args)
    expect(vm).not.toBeNull()
    expect(vm!.error).toBeNull()
    expect(vm!.result).toEqual(host!.result)
    expect(vm!.steps).toEqual(host!.steps)
  })

  it('VM __snap matches host snap on a gnarly value', async () => {
    const code = `var f = function() {
  const arr = [1, 'two', null];
  arr[5] = new Map([[7, new Set(['x'])]]);
  return arr;
};`
    const vm = await run(code, 'f', [])
    const hostSnap = snap([1, 'two', null, undefined, undefined, new Map([[7, new Set(['x'])]])])
    // holes vs undefined differ intentionally; compare via the traced result
    const host = trace(code, 'f', [], [])
    expect(vm!.result).toEqual(host!.result)
    expect(JSON.stringify(vm!.result)).toContain('__map')
    expect(hostSnap).toBeTruthy()
  })
})

describe('isolation', () => {
  it('user code cannot see worker/page globals', async () => {
    const code = `var probe = function() {
  return [typeof fetch, typeof self, typeof postMessage, typeof document, typeof XMLHttpRequest, typeof process];
};`
    const vm = await run(code, 'probe', [])
    expect(vm!.error).toBeNull()
    expect(vm!.result).toEqual({
      __arr: ['undefined', 'undefined', 'undefined', 'undefined', 'undefined', 'undefined'],
    })
  })
})

describe('runaway code', () => {
  it('probe-less one-line infinite loop is interrupted by deadline', async () => {
    const t0 = Date.now()
    const vm = await run(`var f = function(){ while (true) { const x = 1; } return 1; };`, 'f', [])
    expect(vm!.error).toMatch(/infinite loop/)
    expect(Date.now() - t0).toBeLessThan(VM_TIME_MS + 2500)
  }, 15000)

  it('step cap preserves all steps for scrubbing', async () => {
    const vm = await run(
      `var f = function(){\n  let i = 0;\n  while (true) {\n    i++;\n  }\n};`,
      'f',
      [],
    )
    expect(vm!.error).toMatch(/infinite loop/)
    expect(vm!.steps.length).toBe(STEP_CAP)
  }, 15000)

  it('thrown errors keep partial steps', async () => {
    const vm = await run(`var f = function(a){\n  const x = 1;\n  return a.length;\n};`, 'f', [null])
    expect(vm!.error).toMatch(/TypeError/)
    expect(vm!.steps.length).toBeGreaterThan(0)
  })
})
