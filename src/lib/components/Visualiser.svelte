<script lang="ts">
  // Step-through panel: transport + variable rows + provenance overlay.
  // All drawing invariants live in lib/illustrate/player.ts.
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

  let open = $state(false)
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
    if (open && tracedCode && code !== tracedCode) stale = true
  }

  async function visualise(): Promise<void> {
    // default to the smallest input — shortest trace, easiest to follow
    if (caseIdx < 0)
      caseIdx =
        content.tests
          .map((t, i) => [JSON.stringify(t.args).length, i] as const)
          .sort((a, b) => a[0] - b[0])[0]?.[1] ?? 0
    if (!whichFn) whichFn = content.fn2 ?? content.fn
    open = true
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
        error = `Can't step through ${fn2} until ${content.fn} runs cleanly — ${(e as Error).message}`
        running = false
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
    engine = t?.engine === 'quickjs-wasm' ? 'wasm sandbox' : t?.engine === 'fallback' ? 'no sandbox (fallback)' : ''
    if (!t) {
      error = "Couldn't step through this code — it didn't parse. Run tests to see the real error."
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
    if (!open || !total) return
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

<button class="primary" onclick={visualise} disabled={running}>
  {running ? 'tracing…' : 'Step through'}
</button>
<div class="viz" class:stale hidden={!open}>
  <div class="bar">
    <button onclick={() => player?.go(at - 1)} disabled={!total}>◀</button>
    <button onclick={() => player?.go(at + 1)} disabled={!total}>▶</button>
    <input
      type="range" min="0" max={Math.max(0, total - 1)} value={at}
      oninput={(e) => player?.go(+e.currentTarget.value)}
    />
    <span class="pos">{total ? `${at + 1} / ${total}` : ''}</span>
    {#if engine}<span class="engine" title="where your code executed">{engine}</span>{/if}
    {#if content.fn2}
      <select bind:value={whichFn} onchange={visualise}>
        <option value={content.fn}>{content.fn}()</option>
        <option value={content.fn2}>{content.fn2}()</option>
      </select>
    {/if}
    <select bind:value={caseIdx} onchange={visualise}>
      <option value={-1} disabled hidden>input…</option>
      {#each content.tests as t, i (i)}
        <option value={i}>input {i + 1}: {JSON.stringify(t.args).slice(0, 40)}</option>
      {/each}
    </select>
    <button onclick={() => (open = false)}>✕</button>
  </div>
  {#if stale}<div class="stalebar">code changed — press Step through again</div>{/if}
  <div class="line mono">{total ? `line ${lineNo}:  ${lineText}` : ''}</div>
  {#if returned}<div class="ret mono">{returned}</div>{/if}
  {#if error}<div class="verr">{error}</div>{/if}
  <div class="viz-host">
    <div bind:this={rows}></div>
  </div>
</div>

<style>
  .viz {
    border-top: 3px solid var(--ink); background: var(--panel);
    padding: .7rem 1rem 1rem; margin-top: 1rem;
  }
  .viz.stale { opacity: .55; }
  .bar { display: flex; align-items: center; gap: .55rem; }
  .bar input[type='range'] { flex: 1; accent-color: var(--ink); min-width: 80px; }
  .pos {
    font-size: .82rem; color: var(--muted); font-variant-numeric: tabular-nums;
    min-width: 5.5em; text-align: right;
  }
  .stalebar { color: var(--red); font-size: .78rem; margin-top: .3rem; }
  .engine {
    font-size: .68rem; color: var(--violet); border: 1.5px solid var(--violet);
    border-radius: var(--sks); padding: 0 .45rem; white-space: nowrap;
    transform: rotate(-.5deg); background: var(--violet-bg);
  }
  .line { font-size: .8rem; color: var(--muted); margin: .6rem 0 .4rem; white-space: pre; overflow-x: auto; }
  .ret { font-size: .82rem; color: var(--pass); margin: 0 0 .6rem; }
</style>
