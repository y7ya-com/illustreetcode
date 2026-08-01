export interface Step {
  /** 1-based line in the user's original source. */
  line: number
  vars: Record<string, unknown>
}

export interface TraceResult {
  steps: Array<Step>
  error: string | null
  result: unknown
}

export interface TraceRequest {
  code: string
  fnName: string
  extraNames: Array<string>
  args: Array<unknown>
}
