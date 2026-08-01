<script lang="ts">
  // The illustration panel. Lives in the Description/Illustration tab pair and
  // refreshes automatically after every test run — there is no separate
  // "step through" action. Drawing invariants live in lib/illustrate/player.ts.
  import { onMount } from 'svelte'
  import { Player } from '../illustrate/player'
  import { traceAsync } from '../tracer'
  import type { ProblemContent } from '../data/types'

  let {
    content,
    getCode,
    onActiveLine,
  }: {
    content: ProblemContent
    getCode: () => string
    onActiveLine?: (line: number) => void
  } = $props()

  let rows: HTMLDivElement
  let player: Player | undefined

  let hasTrace = $state(false)
  let running = $state(false)
  let stale = $state(false)
  let at = $state(0)
  let total = $state(0)
  let lineNo = $state(0)
  let lineText = $state('')
  let error = $state('')
  let returned = $state('')
  let engine = $state('')
  let caseIdx = $state(-1)
  let whichFn = $state('')
  let tracedCode = ''

  onMount(() => {
    player = new Player({
      rows,
      onStep: (a, t, ln, lt) => {
        at = a
        total = t
        lineNo = ln
        lineText = lt
        onActiveLine?.(ln)
      },
    })
  })

  export function markStale(code: string): void {
    if (hasTrace && tracedCode && code !== tracedCode) stale = true
  }

  /** Re-trace the current editor code. Called after every test run. */
  export async function refresh(): Promise<void> {
    if (running) return
    if (caseIdx < 0)
      caseIdx =
        content.tests
          .map((t, i) => [JSON.stringify(t.args).length, i] as const)
          .sort((a, b) => a[0] - b[0])[0]?.[1] ?? 0
    if (!whichFn) whichFn = content.fn2 ?? content.fn

    running = true
    stale = false
    error = ''
    returned = ''
    const code = getCode()
    tracedCode = code
    const fn2 = content.fn2

    // decode's input is whatever encode produced — run encode for real first
    let args = structuredClone(content.tests[caseIdx]!.args)
    if (content.roundTrip && fn2 && whichFn === fn2) {
      try {
        const enc = new Function(code + `\n;return ${content.fn};`)() as (a: unknown) => unknown
        args = [enc(args[0])]
      } catch (e) {
        error = `Can't draw ${fn2} until ${content.fn} runs cleanly — ${(e as Error).message}`
        running = false
        hasTrace = true
        return
      }
    }

    const t = await traceAsync({
      code,
      fnName: whichFn,
      extraNames: [content.fn, fn2].filter((n): n is string => !!n && n !== whichFn),
      args,
    })
    running = false
    hasTrace = true
    engine =
      t?.engine === 'quickjs-wasm' ? 'wasm sandbox' : t?.engine === 'fallback' ? 'no sandbox' : ''
    if (!t) {
      error = "Couldn't draw this code — it didn't parse. The test panel shows the real error."
      total = 0
      return
    }
    if (t.error) error = t.error
    if (!t.steps.length) {
      if (!t.error) error = 'No steps recorded — is the function body empty?'
      total = 0
      return
    }
    const { fmt } = await import('../tracer')
    returned = t.error ? '' : `returned  ${fmt(t.result)}`
    player!.load(t.steps, code)
    player!.go(0)
  }

  function key(e: KeyboardEvent): void {
    if (!hasTrace || !total) return
    const target = e.target as HTMLElement
    if (target.closest('.cm-editor, input, select, textarea')) return
    if (e.key === 'ArrowLeft') {
      player?.go(at - 1)
      e.preventDefault()
    }
    if (e.key === 'ArrowRight') {
      player?.go(at + 1)
      e.preventDefault()
    }
  }
</script>

<svelte:window onkeydown={key} />

<div class="viz" class:stale>
  {#if !hasTrace}
    <p class="empty">Run the tests and your code gets drawn here, step by step.</p>
  {:else}
    <div class="bar">
      <button onclick={() => player?.go(at - 1)} disabled={!total}>◀</button>
      <button onclick={() => player?.go(at + 1)} disabled={!total}>▶</button>
      <input
        type="range" min="0" max={Math.max(0, total - 1)} value={at}
        oninput={(e) => player?.go(+e.currentTarget.value)}
      />
      <span class="pos">{total ? `${at + 1} / ${total}` : ''}</span>
      {#if engine}<span class="engine" title="where your code executed">{engine}</span>{/if}
    </div>
    <div class="bar picks">
      {#if content.fn2}
        <select bind:value={whichFn} onchange={refresh}>
          <option value={content.fn}>{content.fn}()</option>
          <option value={content.fn2}>{content.fn2}()</option>
        </select>
      {/if}
      <select bind:value={caseIdx} onchange={refresh}>
        <option value={-1} disabled hidden>input…</option>
        {#each content.tests as t, i (i)}
          <option value={i}>input {i + 1}: {JSON.stringify(t.args).slice(0, 44)}</option>
        {/each}
      </select>
      {#if running}<span class="pos">tracing…</span>{/if}
    </div>
    {#if stale}<div class="stalebar">code changed — run tests to redraw</div>{/if}
    <div class="line mono">{total ? `line ${lineNo}:  ${lineText}` : ''}</div>
    {#if returned}<div class="ret mono">{returned}</div>{/if}
    {#if error}<div class="verr">{error}</div>{/if}
  {/if}
  <div class="viz-host">
    <div bind:this={rows}></div>
  </div>
</div>

<style>
  .viz { padding: .3rem 0 1rem; }
  .viz.stale { opacity: .55; }
  .empty { color: var(--muted); font-style: italic; }
  .bar { display: flex; align-items: center; gap: .55rem; }
  .bar.picks { margin-top: .45rem; }
  .bar input[type='range'] { flex: 1; accent-color: var(--ink); min-width: 80px; }
  .pos {
    font-size: .82rem; color: var(--muted); font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .engine {
    font-size: .68rem; color: var(--violet); border: 1.5px solid var(--violet);
    border-radius: var(--sks); padding: 0 .45rem; white-space: nowrap;
    transform: rotate(-.5deg); background: var(--violet-bg);
  }
  .stalebar { color: var(--red); font-size: .78rem; margin-top: .3rem; }
  .line { font-size: .8rem; color: var(--muted); margin: .6rem 0 .4rem; white-space: pre; overflow-x: auto; }
  .ret { font-size: .82rem; color: var(--pass); margin: 0 0 .6rem; }
</style>
