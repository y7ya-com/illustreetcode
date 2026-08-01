// Pointer detection. Ported near-verbatim from the prototype's visualise.js —
// every rule here is a shipped bug's fix; see docs/HANDOFF.md §2.1 in the
// LEARNING repo for the history.
import type { Step } from '../tracer'

export interface Meta {
  /** pointer variable → container variable it indexes */
  pointers: Map<string, string>
  /** container → pointer names bound to it (lane order, FIXED for the run) */
  byContainer: Map<string, Array<string>>
  order: Array<string>
}

const isArr = (v: unknown): v is { __arr: Array<unknown> } =>
  !!v && typeof v === 'object' && '__arr' in (v as object)

export const clen = (v: unknown): number | null =>
  isArr(v) ? v.__arr.length : typeof v === 'string' ? v.length : null

export function analyse(steps: Array<Step>, code: string): Meta {
  const vals = new Map<string, Set<number>>()
  const lens = new Map<string, number>()
  for (const s of steps)
    for (const [n, v] of Object.entries(s.vars)) {
      if (typeof v === 'number' && Number.isInteger(v)) {
        if (!vals.has(n)) vals.set(n, new Set())
        vals.get(n)!.add(v)
      }
      const L = clen(v)
      if (L !== null) lens.set(n, Math.max(lens.get(n) ?? 0, L))
    }

  // Strongest signal for "x indexes y" is the source actually saying y[x].
  // Range-guessing alone binds `count` to `nums` just because its values are
  // small — when it really indexes `bucket`.
  const written = new Map<string, string>()
  for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\s*\[\s*([A-Za-z_$][\w$]*)\s*\]/g))
    if (lens.has(m[1]!)) written.set(m[2]!, m[1]!)

  const pointers = new Map<string, string>()
  for (const [n, set] of vals) {
    if (set.size < 2) continue // constants aren't pointers
    const max = Math.max(...set)
    const min = Math.min(...set)
    if (min < -1 || max > 200) continue

    if (written.has(n)) {
      pointers.set(n, written.get(n)!)
      continue
    }
    // fallback: tightest container that fits. Strictly greater — a pointer
    // reaching 6 needs length >= 7.
    let best: string | null = null
    for (const [cn, L] of lens) if (L > max && (best === null || L < lens.get(best)!)) best = cn
    if (best) pointers.set(n, best)
  }

  // Lanes are fixed for the whole run: if they came and went with scope, cell
  // heights would change and every cell would animate as if it had moved.
  const byContainer = new Map<string, Array<string>>()
  for (const [n, c] of pointers) byContainer.set(c, [...(byContainer.get(c) ?? []), n])

  return { pointers, byContainer, order: [...pointers.keys()] }
}
