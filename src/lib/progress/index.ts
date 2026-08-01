// Progress + saved solutions. Logged-out: localStorage (per-browser — the
// honest trade; login will sync to D1). Progress is keyed per PROBLEM, never
// per list: solving two-sum ticks it in every list that contains it.
const P_KEY = 'istc:progress:v1'
const S_KEY = (slug: string) => `istc:solution:${slug}`

export type Progress = Record<string, { status: 'solved'; solvedAt: number }>

const canStore = typeof localStorage !== 'undefined'

export function loadProgress(): Progress {
  if (!canStore) return {}
  try {
    return JSON.parse(localStorage.getItem(P_KEY) ?? '{}') as Progress
  } catch {
    return {}
  }
}

export function setSolved(slug: string, solved: boolean): Progress {
  const p = loadProgress()
  if (solved) p[slug] = { status: 'solved', solvedAt: p[slug]?.solvedAt ?? Date.now() }
  else delete p[slug]
  if (canStore) localStorage.setItem(P_KEY, JSON.stringify(p))
  return p
}

export function loadSolution(slug: string): string | null {
  return canStore ? localStorage.getItem(S_KEY(slug)) : null
}

export function saveSolution(slug: string, code: string): void {
  if (canStore) localStorage.setItem(S_KEY(slug), code)
}
