import { describe, expect, it } from 'vitest'
import { CATEGORIES, CORPUS, NEETCODE_150 } from '../corpus'
import { CONTENT } from '../content'
import { LISTS } from '../lists'

describe('corpus', () => {
  it('has exactly 150 problems in 18 categories', () => {
    expect(NEETCODE_150).toHaveLength(150)
    expect(CATEGORIES).toHaveLength(18)
  })
  it('every problem has a known category', () => {
    for (const p of Object.values(CORPUS))
      expect(CATEGORIES).toContain(p.category)
  })
})

describe('lists', () => {
  it('blind-75 is 75 unique corpus slugs', () => {
    const blind = LISTS.find((l) => l.id === 'blind-75')!
    expect(blind.problems).toHaveLength(75)
    expect(new Set(blind.problems).size).toBe(75)
    for (const s of blind.problems) expect(CORPUS[s]).toBeDefined()
  })
})

describe('content', () => {
  it('every content slug exists in the corpus', () => {
    for (const slug of Object.keys(CONTENT)) expect(CORPUS[slug]).toBeDefined()
  })
  it('ported content keeps all 20 problems with tests', () => {
    expect(Object.keys(CONTENT).length).toBe(20)
    for (const c of Object.values(CONTENT)) expect(c.tests.length).toBeGreaterThan(0)
  })
})
