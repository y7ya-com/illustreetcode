// Value snapshots + formatting. Ported from the prototype's tracer.js —
// behaviour-identical (holes as ·, out-of-scope as —, Map/Set markers).

export const HOLE = { __hole: 1 } as const
export const OOS = { __oos: 1 } as const

export function snap(v: unknown, depth = 0): unknown {
  if (v === null) return null
  if (typeof v === 'function') return { __fn: v.name || 'fn' }
  if (typeof v !== 'object') return v
  if (depth > 3) return { __deep: 1 }

  if (Array.isArray(v)) {
    if (v.length > 64) return { __big: `Array(${v.length})` }
    const a: Array<unknown> = []
    for (let i = 0; i < v.length; i++) a.push(i in v ? snap(v[i], depth + 1) : HOLE)
    return { __arr: a }
  }
  if (v instanceof Map) {
    if (v.size > 40) return { __big: `Map(${v.size})` }
    return { __map: [...v].map(([k, val]) => [snap(k, depth + 1), snap(val, depth + 1)]) }
  }
  if (v instanceof Set) {
    if (v.size > 40) return { __big: `Set(${v.size})` }
    return { __set: [...v].map((x) => snap(x, depth + 1)) }
  }
  const o: Record<string, unknown> = {}
  const keys = Object.keys(v as object)
  for (const k of keys.slice(0, 40)) o[k] = snap((v as Record<string, unknown>)[k], depth + 1)
  if (keys.length > 40) o['…'] = { __big: `+${keys.length - 40} more` }
  return { __obj: o }
}

export function fmt(s: unknown): string {
  if (s === undefined) return 'undefined'
  if (s === null) return 'null'
  if (typeof s === 'string') return JSON.stringify(s)
  if (typeof s !== 'object') return String(s)
  const m = s as Record<string, unknown>
  if (m.__hole) return '·'
  if (m.__oos) return '—'
  if (m.__deep) return '…'
  if (m.__big) return String(m.__big)
  if (m.__fn) return 'ƒ ' + String(m.__fn)
  if (m.__arr) return '[' + (m.__arr as Array<unknown>).map(fmt).join(', ') + ']'
  if (m.__set) return 'Set {' + (m.__set as Array<unknown>).map(fmt).join(', ') + '}'
  if (m.__map)
    return (
      'Map {' +
      (m.__map as Array<[unknown, unknown]>).map(([k, v]) => fmt(k) + ' → ' + fmt(v)).join(', ') +
      '}'
    )
  if (m.__obj)
    return (
      '{' +
      Object.entries(m.__obj as Record<string, unknown>)
        .map(([k, v]) => k + ': ' + fmt(v))
        .join(', ') +
      '}'
    )
  return String(s)
}
