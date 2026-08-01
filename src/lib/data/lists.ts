import type { ProblemList } from './types'
import { CORPUS, NEETCODE_150 } from './corpus'

/**
 * Blind 75 — Yangshun Tay's classic list. A strict subset of the NeetCode 150
 * corpus; order follows NeetCode's Blind-75 grouping (category order).
 */
const BLIND_75_SLUGS = [
  // Arrays & Hashing
  'contains-duplicate', 'valid-anagram', 'two-sum', 'group-anagrams',
  'top-k-frequent-elements', 'encode-and-decode-strings',
  'product-of-array-except-self', 'longest-consecutive-sequence',
  // Two Pointers
  'valid-palindrome', '3sum', 'container-with-most-water',
  // Sliding Window
  'best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement', 'minimum-window-substring',
  // Stack
  'valid-parentheses',
  // Binary Search
  'find-minimum-in-rotated-sorted-array', 'search-in-rotated-sorted-array',
  // Linked List
  'reverse-linked-list', 'merge-two-sorted-lists', 'reorder-list',
  'remove-nth-node-from-end-of-list', 'linked-list-cycle', 'merge-k-sorted-lists',
  // Trees
  'invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree',
  'subtree-of-another-tree', 'lowest-common-ancestor-of-a-binary-search-tree',
  'binary-tree-level-order-traversal', 'validate-binary-search-tree',
  'kth-smallest-element-in-a-bst',
  'construct-binary-tree-from-preorder-and-inorder-traversal',
  'binary-tree-maximum-path-sum', 'serialize-and-deserialize-binary-tree',
  // Heap / Priority Queue
  'find-median-from-data-stream',
  // Backtracking
  'combination-sum', 'word-search',
  // Tries
  'implement-trie-prefix-tree', 'design-add-and-search-words-data-structure',
  'word-search-ii',
  // Graphs
  'number-of-islands', 'clone-graph', 'pacific-atlantic-water-flow',
  'course-schedule', 'graph-valid-tree',
  'number-of-connected-components-in-an-undirected-graph',
  // Advanced Graphs
  'alien-dictionary',
  // 1-D DP
  'climbing-stairs', 'house-robber', 'house-robber-ii',
  'longest-palindromic-substring', 'palindromic-substrings', 'decode-ways',
  'coin-change', 'maximum-product-subarray', 'word-break',
  'longest-increasing-subsequence',
  // 2-D DP
  'unique-paths', 'longest-common-subsequence',
  // Greedy
  'maximum-subarray', 'jump-game',
  // Intervals
  'insert-interval', 'merge-intervals', 'non-overlapping-intervals',
  'meeting-rooms', 'meeting-rooms-ii',
  // Math & Geometry
  'rotate-image', 'spiral-matrix', 'set-matrix-zeroes',
  // Bit Manipulation
  'single-number', 'number-of-1-bits', 'counting-bits', 'reverse-bits',
  'missing-number',
]

export const LISTS: Array<ProblemList> = [
  {
    id: 'neetcode-150',
    name: 'NeetCode 150',
    blurb: 'The all-rounder. 18 categories, a deliberate difficulty ramp per topic.',
    credit: 'NeetCode',
    sourceUrl: 'https://neetcode.io/practice',
    problems: NEETCODE_150,
  },
  {
    id: 'blind-75',
    name: 'Blind 75',
    blurb: 'The classic shortlist. Every problem earns its place; zero filler.',
    credit: 'Yangshun Tay',
    sourceUrl: 'https://www.techinterviewhandbook.org/best-practice-questions/',
    problems: BLIND_75_SLUGS,
  },
]

export const LIST_BY_ID = new Map(LISTS.map((l) => [l.id, l]))

// integrity: every list slug must exist in the corpus, and Blind 75 must be 75
for (const list of LISTS)
  for (const slug of list.problems)
    if (!(slug in CORPUS)) throw new Error(`${list.id}: unknown slug ${slug}`)
if (BLIND_75_SLUGS.length !== 75)
  throw new Error(`Blind 75 has ${BLIND_75_SLUGS.length} entries`)
if (new Set(BLIND_75_SLUGS).size !== 75) throw new Error('Blind 75 has duplicates')
