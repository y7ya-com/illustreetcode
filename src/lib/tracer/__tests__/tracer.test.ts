// The adversarial cases that broke the prototype's regex splitter, plus
// behaviour-preservation checks. Every one of these is a bug that shipped once.
import { describe, expect, it } from 'vitest'
import { braceBodies, instrument } from '../instrument'
import { STEP_CAP, trace } from '../run'

const TOPK_COMPACT = `var topKFrequent = function(nums, k) {
    const freq = {};
    for (const n of nums) freq[n] = (freq[n] || 0) + 1;
    const pairs = Object.entries(freq);
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs.slice(0, k).map(p => Number(p[0]));
};`

describe('braceBodies', () => {
  it('braces one-line loop bodies without changing behaviour', () => {
    const braced = braceBodies(TOPK_COMPACT)
    const a = new Function(TOPK_COMPACT + ';return topKFrequent;')() as never as (
      n: Array<number>, k: number) => Array<number>
    const b = new Function(braced + ';return topKFrequent;')() as never as (
      n: Array<number>, k: number) => Array<number>
    expect(b([1, 1, 1, 2, 2, 3], 2)).toEqual(a([1, 1, 1, 2, 2, 3], 2))
  })
  it('leaves regex literals, strings and object literals alone', () => {
    const src = `var f = function(s){ const c = s.replace(/[^a-z]/g, ""); const o = { a: 1 }; return c + o.a; };`
    const braced = braceBodies(src)
    const f = new Function(braced + ';return f;')() as never as (s: string) => string
    expect(f('a;b{c}')).toBe('abc1')
  })
})

describe('trace fidelity — the bugs that shipped once', () => {
  it('compact loop body records one step per iteration (was: 1 step for 6)', () => {
    const t = trace(TOPK_COMPACT, 'topKFrequent', [], [[12, 12, 12, 30, 30, 44], 2])!
    // 6 iteration probes + 1 post-loop probe, all carrying the for's line
    const loopSteps = t.steps.filter((s) => s.line === 3)
    expect(loopSteps.length).toBe(7)
    const iterations = loopSteps.filter((s) => 'n' in s.vars && s.vars['n'] !== undefined)
    expect(iterations.length).toBeGreaterThanOrEqual(6)
    expect(t.error).toBeNull()
  })
  it('line numbers refer to the original source', () => {
    const t = trace(TOPK_COMPACT, 'topKFrequent', [], [[1, 2], 2])!
    const lines = new Set(t.steps.map((s) => s.line))
    for (const l of lines) expect(l).toBeGreaterThanOrEqual(2)
    expect(Math.max(...lines)).toBeLessThanOrEqual(6)
  })
  it('multi-line infinite loop hits the step cap with steps preserved', () => {
    const t = trace(
      `var f = function(){\n  let i = 0;\n  while (true) {\n    i++;\n  }\n  return i;\n};`,
      'f', [], [])!
    expect(t.error).toMatch(/infinite loop/)
    expect(t.steps.length).toBe(STEP_CAP)
  })
  it('ONE-LINE infinite loop also hits the cap (was: hung the tab)', () => {
    const t = trace(`var f = function(){ while (true) { const x = 1; } return 1; };`, 'f', [], [])!
    expect(t.error).toMatch(/infinite loop/)
  })
  it('throwing code keeps all steps up to the throw', () => {
    const t = trace(
      `var f = function(a){\n  const x = 1;\n  return a.length;\n};`,
      'f', [], [null])!
    expect(t.error).toMatch(/TypeError/)
    expect(t.steps.length).toBeGreaterThan(0)
  })
  it('scope: inner-function locals are not attributed to outer probes', () => {
    const t = trace(
      `var f = function(xs){\n  const doubled = xs.map(function(v){ const twice = v * 2; return twice; });\n  return doubled;\n};`,
      'f', [], [[1, 2]])!
    // probes INSIDE the callback correctly see both scopes; the probe in the
    // OUTER function body must not list the callback-local `twice`
    const outerProbe = t.steps.filter((s) => 'doubled' in s.vars && !('v' in s.vars))
    expect(outerProbe.length).toBeGreaterThan(0)
    for (const s of outerProbe) expect('twice' in s.vars).toBe(false)
  })
  it('destructured declarations are visible', () => {
    const t = trace(
      `var f = function(m){\n  for (const [num, count] of m) {\n    const y = num + count;\n  }\n  return 1;\n};`,
      'f', [], [new Map([[1, 2]])])!
    const inLoop = t.steps.find((s) => s.line === 3)
    expect(inLoop).toBeDefined()
    expect(inLoop!.vars['num']).toBe(1)
    expect(inLoop!.vars['count']).toBe(2)
  })
  it('syntax errors return null (caller degrades gracefully)', () => {
    expect(trace(`var f = function(){ const x = ; };`, 'f', [], [])).toBeNull()
  })
})

describe('parity with prototype semantics', () => {
  it("user's bucket-sort solution traces with real variable states", () => {
    const code = `var topKFrequent = function(nums, k) {
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
    const t = trace(code, 'topKFrequent', [], [[12, 12, 12, 30, 30, 44], 2])!
    expect(t.error).toBeNull()
    expect(t.result).toEqual({ __arr: [12, 30] })
    // bucket must show holes (index 0) once populated
    const last = t.steps[t.steps.length - 1]!
    expect(JSON.stringify(last.vars['bucket'])).toContain('__hole')
  })
})
