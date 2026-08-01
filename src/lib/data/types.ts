export type Difficulty = 'E' | 'M' | 'H'

export interface TestCase {
  args: Array<unknown>
  expect?: unknown
}

export interface StressTest {
  note: string
  budgetMs: number
  args: () => Array<unknown>
  expect: unknown
}

export type CheckResult = { ok: boolean; why?: string }

/** Statement, tests and editor scaffolding for one problem — our own wording, never LeetCode's. */
export interface ProblemContent {
  fn: string
  /** Second entry point (encode/decode-style problems). */
  fn2?: string
  brief: string
  /** HTML. Written by us. */
  statement: string
  examples?: Array<{ in: string; out: string; note?: string }>
  constraints?: Array<string>
  starter: string
  /** compare mode: return value (default), mutate args[0], or decode(encode(x)) === x */
  mode?: 'mutate'
  roundTrip?: boolean
  cmp?: 'unordered' | 'groups'
  /** Custom validator for problems with many correct answers. */
  check?: (out: unknown, args: Array<unknown>) => CheckResult
  premium?: boolean
  tests: Array<TestCase>
  stress?: StressTest
}

export interface ProblemList {
  id: string
  name: string
  blurb: string
  credit: string
  sourceUrl: string
  /** Slugs in list order. Progress is per-problem; lists are views. */
  problems: Array<string>
}
