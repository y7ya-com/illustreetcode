// AST-based instrumentation. Replaces the prototype's regex statement-splitter,
// which was style-sensitive: a loop body on the same line as its `for` recorded
// one step for the whole loop, and a function written on a single line got no
// probe at all (and could then hang the page — nothing inside the loop ever ran
// a step-cap check).
//
// Two passes, both position-precise:
//   1. brace every non-block loop/if/else body (inline, no newlines added)
//   2. insert `__step(<originalLine>, {name: __peek(() => name), …})` probes
//      around every statement
//
// Probes are inserted inline (`;__step(…);`), so original line numbers survive
// verbatim — the recorded `line` is read off the AST of the user's own source.

import { parse } from 'acorn'
import { ancestor } from 'acorn-walk'
import type { Node } from 'acorn'

interface AnyNode extends Node {
  body?: AnyNode | Array<AnyNode>
  consequent?: AnyNode | Array<AnyNode>
  alternate?: AnyNode | null
  declarations?: Array<AnyNode>
  id?: AnyNode | null
  params?: Array<AnyNode>
  properties?: Array<AnyNode>
  elements?: Array<AnyNode | null>
  left?: AnyNode
  right?: AnyNode
  argument?: AnyNode
  value?: AnyNode
  key?: AnyNode
  init?: AnyNode | null
  loc?: { start: { line: number }; end: { line: number } } | null
}

const PARSE_OPTS = { ecmaVersion: 'latest', locations: true } as const

/** Pass 1: `for (…) x++` → `for (…) { x++ }` — inline, line numbers intact. */
export function braceBodies(code: string): string {
  const tree = parse(code, PARSE_OPTS) as AnyNode
  const splices: Array<{ at: number; text: string }> = []

  const braceIfNeeded = (body: AnyNode | null | undefined) => {
    if (!body || body.type === 'BlockStatement' || body.type === 'EmptyStatement') return
    splices.push({ at: body.start, text: '{ ' })
    splices.push({ at: body.end, text: ' }' })
  }

  ancestor(tree as never, {
    ForStatement: (n) => braceIfNeeded((n as AnyNode).body as AnyNode),
    ForOfStatement: (n) => braceIfNeeded((n as AnyNode).body as AnyNode),
    ForInStatement: (n) => braceIfNeeded((n as AnyNode).body as AnyNode),
    WhileStatement: (n) => braceIfNeeded((n as AnyNode).body as AnyNode),
    DoWhileStatement: (n) => braceIfNeeded((n as AnyNode).body as AnyNode),
    IfStatement: (n) => {
      const node = n as AnyNode
      braceIfNeeded(node.consequent as AnyNode)
      if (node.alternate && node.alternate.type !== 'IfStatement')
        braceIfNeeded(node.alternate)
    },
  })

  splices.sort((a, b) => b.at - a.at)
  let out = code
  for (const s of splices) out = out.slice(0, s.at) + s.text + out.slice(s.at)
  return out
}

/** Names bound by a declaration pattern (handles destructuring + defaults). */
function patternNames(node: AnyNode | null | undefined, out: Array<string>): void {
  if (!node) return
  switch (node.type) {
    case 'Identifier':
      out.push((node as unknown as { name: string }).name)
      break
    case 'ObjectPattern':
      for (const p of node.properties ?? []) patternNames((p.value ?? p.argument) as AnyNode, out)
      break
    case 'ArrayPattern':
      for (const el of node.elements ?? []) patternNames(el, out)
      break
    case 'AssignmentPattern':
      patternNames(node.left, out)
      break
    case 'RestElement':
      patternNames(node.argument, out)
      break
  }
}

const FN_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

/**
 * Pass 2: probe insertion. For each statement directly inside a block/program,
 * insert a probe carrying the names visible at that point (enclosing function
 * params + declarations that appear earlier in source within enclosing
 * functions). __peek guards TDZ/out-of-scope reads at runtime, so over-listing
 * a name is safe — it renders as —.
 */
export function instrument(code: string, exclude: Array<string> = []): string {
  const braced = braceBodies(code)
  const tree = parse(braced, PARSE_OPTS) as AnyNode
  const skip = new Set(exclude)

  // declaration sites: [sourcePos, name, enclosing fn node (or null = module)]
  const decls: Array<{ pos: number; name: string; fn: AnyNode | null }> = []
  const enclosingFn = (ancestors: Array<Node>): AnyNode | null => {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const a = ancestors[i] as AnyNode
      if (FN_TYPES.has(a.type)) return a
    }
    return null
  }

  ancestor(tree as never, {
    VariableDeclarator: (n, _s, anc) => {
      const names: Array<string> = []
      patternNames((n as AnyNode).id, names)
      const fn = enclosingFn(anc as unknown as Array<Node>)
      for (const name of names) decls.push({ pos: (n as AnyNode).start, name, fn })
    },
    Function: (n, _s, anc) => {
      const node = n as AnyNode
      const names: Array<string> = []
      for (const p of node.params ?? []) patternNames(p, names)
      // params belong to THIS function's scope
      for (const name of names) decls.push({ pos: node.start, name, fn: node })
      if (node.id) {
        const fnName = (node.id as unknown as { name: string }).name
        const outer = enclosingFn((anc as unknown as Array<Node>).slice(0, -1))
        decls.push({ pos: node.start, name: fnName, fn: outer })
      }
    },
  })

  // probe points: after every statement in a block, before abrupt-exit statements
  const ABRUPT = new Set(['ReturnStatement', 'BreakStatement', 'ContinueStatement', 'ThrowStatement'])
  const probes: Array<{ at: number; line: number; fns: Set<AnyNode | null> }> = []

  const fnChain = (ancestors: Array<Node>): Set<AnyNode | null> => {
    const set = new Set<AnyNode | null>([null])
    for (const a of ancestors) if (FN_TYPES.has((a as AnyNode).type)) set.add(a as AnyNode)
    return set
  }

  const visitBlock = (stmts: Array<AnyNode>, ancestors: Array<Node>) => {
    for (const st of stmts) {
      if (st.type === 'FunctionDeclaration' || st.type === 'EmptyStatement') continue
      const line = st.loc?.start.line ?? 0
      if (ABRUPT.has(st.type)) probes.push({ at: st.start, line, fns: fnChain(ancestors) })
      else probes.push({ at: st.end, line, fns: fnChain(ancestors) })
    }
  }

  ancestor(tree as never, {
    Program: (n, _s, anc) =>
      visitBlock(((n as AnyNode).body as Array<AnyNode>) ?? [], anc as unknown as Array<Node>),
    BlockStatement: (n, _s, anc) =>
      visitBlock(((n as AnyNode).body as Array<AnyNode>) ?? [], anc as unknown as Array<Node>),
  })

  // Payload order = declaration order: sort declaration sites by source
  // position so rendered rows follow the code's own layout (params first,
  // then declarations top-to-bottom), not discovery order.
  decls.sort((a, b) => a.pos - b.pos)

  // Build each probe's payload: names declared earlier in source, in a scope
  // that encloses the probe (module scope or any enclosing function).
  const splices = probes.map(({ at, line, fns }) => {
    const names: Array<string> = []
    for (const d of decls) {
      if (skip.has(d.name) || names.includes(d.name)) continue
      if (d.pos > at) continue
      if (d.fn !== null && !fns.has(d.fn)) continue
      names.push(d.name)
    }
    const pairs = names.map((n) => `${JSON.stringify(n)}:__peek(()=>${n})`).join(',')
    return { at, text: `;__step(${line},{${pairs}});` }
  })

  splices.sort((a, b) => b.at - a.at)
  let out = braced
  for (const s of splices) out = out.slice(0, s.at) + s.text + out.slice(s.at)
  return out
}
