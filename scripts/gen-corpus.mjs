// One-shot: generate src/lib/data/corpus.ts from the prototype's neetcode.js.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('/Users/y/Documents/LEARNING/neetcode.js', 'utf8')
const DATA = new Function(src + ';return DATA;')()

const categories = DATA.map(([cat]) => cat)
const problems = []
for (const [cat, items] of DATA)
  for (const [title, slug, diff, prem] of items)
    problems.push({ slug, title, difficulty: diff, category: cat, premium: prem === 'p' })

if (problems.length !== 150) throw new Error(`expected 150, got ${problems.length}`)

const lines = problems.map(p =>
  `  ${JSON.stringify(p.slug)}: { title: ${JSON.stringify(p.title)}, difficulty: ${JSON.stringify(p.difficulty)}, category: ${JSON.stringify(p.category)}${p.premium ? ', premium: true' : ''} },`)

writeFileSync('src/lib/data/corpus.ts', `// Generated from the prototype's neetcode.js — do not hand-edit problem rows.
// NeetCode's category taxonomy is the base ordering for the whole corpus.
import type { Difficulty } from './types'

export interface CorpusEntry {
  title: string
  difficulty: Difficulty
  category: string
  premium?: boolean
}

export const CATEGORIES = ${JSON.stringify(categories, null, 2)} as const

export const CORPUS: Record<string, CorpusEntry> = {
${lines.join('\n')}
}

/** NeetCode 150 order = corpus insertion order (category-grouped). */
export const NEETCODE_150: Array<string> = Object.keys(CORPUS)
`)
console.log('corpus.ts:', problems.length, 'problems,', categories.length, 'categories')
