# IllustreetCode

Interview-prep problem lists with a twist: an **illustrator** that runs *your*
solution — right or wrong — and draws every step. Arrays become cells, index
variables become carets that slide, and dashed provenance links show where a
newly-written value came from. Watching wrong code go wrong is the point.

Not affiliated with LeetCode. Every problem statement here is written from
scratch; list orderings are curated facts, credited and linked to their sources.

## Stack

- [TanStack Start + Svelte 5](https://github.com/y7ya-com/router) — the
  experimental community port, consumed as prebuilt `github:` distros
  (`@tanstack/svelte-start` et al., `v0.0.6-experimental`). This app is its
  first real consumer and doubles as the port's dogfood.
- TypeScript strict, Vite, CodeMirror 6, vitest.
- Tracing: **acorn** AST instrumentation (statement-level probes, real scope
  analysis) executed inside **QuickJS-WASM** in a Web Worker. Your code runs in
  a sandbox on your machine — never on a server: no page/worker globals are
  reachable, a deadline interrupt stops runaway loops that no probe can reach
  (`for(;;){}`), and memory is capped. Worker `terminate()` remains the outer
  backstop, and a plain in-worker eval is the fallback if WASM fails to load.
  Tests run natively in a separate worker on purpose — stress budgets measure
  real complexity, and QuickJS's ~30–50x slowdown would fail correct solutions.
- No login wall. Progress lives in localStorage; signing in (scaffolded, not
  yet live) will sync it to Cloudflare D1.

> **npm, not pnpm.** The distro set relies on transitive `github:` deps, which
> pnpm blocks (`ERR_PNPM_EXOTIC_SUBDEP`). npm and bun handle them with zero
> config.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # data integrity + tracer adversarial suite
npm run build      # client + SSR bundles
```

## Layout

```
src/
  routes/            file-based routes (__root, index, l.$listId, p.$slug)
  lib/
    data/            problem corpus (150), lists (NeetCode 150, Blind 75),
                     statements+tests for 20 written-up problems
    tracer/          acorn instrumentation + worker runner  ← fidelity lives here
    illustrate/      the drawing engine (see invariants below)
    runner/          test execution: comparators, modes, stress tests
    progress/        localStorage store (per-problem, cross-list)
    server/          better-auth + drizzle schema for D1 (scaffold)
```

## The illustrator's invariants

Each of these encodes a bug that shipped once in the prototype. Do not
"simplify" them away:

1. Chip identity is `(container, value, nth-occurrence-in-container)`.
2. FLIP measures offsets **relative to the owning row** via the offsetParent
   chain — page reflow is not data movement; sub-4px deltas are jitter.
3. Pointer→container binding comes from the source text (`bucket[i]`), value
   ranges only as fallback.
4. Pointer lanes are fixed for the whole run.
5. Provenance links need two independent matches, or a scalar named on the
   currently-executing line.
6. A trace that stops early (step cap / timeout) keeps its partial steps.

## Cloud sync — not live yet

`src/lib/server/` has the drizzle schema (better-auth tables + progress with a
stash column so merge never silently drops a solution), the per-request
better-auth factory for D1, and `drizzle/0000_init.sql`. To go live it needs:

1. A Cloudflare account: `wrangler d1 create illustreetcode`, paste the id into
   `wrangler.jsonc`, `wrangler d1 migrations apply illustreetcode --remote`.
2. Secrets: `BETTER_AUTH_SECRET`, GitHub/Google OAuth app credentials.
3. `/api/auth/*` server routes — pending server-route support in the
   svelte-start adapter.

## Problem content

20 of 150 problems have full statements, tests (exact / unordered / groups /
round-trip / mutate / custom-checker) and stress tests with time budgets that
fail O(n²) solutions on 40k-element inputs. The other 130 render with a link
out to LeetCode and a tickable checkbox — nothing 404s. Lists shipped:
NeetCode 150 and Blind 75 (a verified subset). More lists are a data-file drop
in `src/lib/data/lists.ts`; Grind 75 was deliberately not seeded from memory —
its ordering should be imported from the source, not guessed.
