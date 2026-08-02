<script module lang="ts">
  import { createFileRoute, notFound } from '@tanstack/svelte-router'
  import { CORPUS } from '../lib/data/corpus'

  export const Route = createFileRoute('/p/$slug')({
    validateSearch: (s: Record<string, unknown>) => ({
      list: typeof s['list'] === 'string' ? s['list'] : undefined,
    }),
    loader: ({ params }) => {
      const meta = CORPUS[params.slug]
      if (!meta) throw notFound()
      return { slug: params.slug, meta }
    },
    head: ({ loaderData }) => ({
      meta: [{ title: `${loaderData?.meta.title ?? 'Problem'} · IllustreetCode` }],
    }),
  })
</script>

<script lang="ts">
  import { Link } from '@tanstack/svelte-router'
  import { CONTENT } from '../lib/data/content'
  import { SOLUTIONS } from '../lib/data/solutions'
  import { loadSolution, saveSolution, setSolved, loadProgress } from '../lib/progress'
  import { runTestsAsync } from '../lib/runner'
  import type { RunReport } from '../lib/runner'
  import Editor from '../lib/components/Editor.svelte'
  import TestResults from '../lib/components/TestResults.svelte'
  import Visualiser from '../lib/components/Visualiser.svelte'

  const data = Route.useLoaderData()
  const search = Route.useSearch()

  const slug = $derived(data.current.slug)
  const meta = $derived(data.current.meta)
  const content = $derived(CONTENT[slug])
  const solution = $derived(SOLUTIONS[slug])
  const lcUrl = $derived(`https://leetcode.com/problems/${slug}/`)

  let editor: ReturnType<typeof Editor> | undefined = $state()
  let viz: ReturnType<typeof Visualiser> | undefined = $state()
  let report: RunReport | null = $state(null)
  let solvedFlag = $state(false)
  let activeLine = $state(0)
  let tab = $state<'desc' | 'draw'>('desc')
  let revealed = $state(false)
  let running = $state(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    solvedFlag = !!loadProgress()[slug]
  })

  const starterCode = () => content?.starter ?? `var solve = function() {\n\n};`

  // saved code is applied after hydration; SSR always renders the starter
  $effect(() => {
    const saved = loadSolution(slug)
    if (saved && editor && saved !== editor.getValue()) editor.setValue(saved)
  })

  function onChange(code: string): void {
    viz?.markStale(code)
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveSolution(slug, code), 800)
  }

  async function run(): Promise<void> {
    if (!content || !editor || running) return
    const code = editor.getValue()
    saveSolution(slug, code)
    running = true
    try {
      report = await runTestsAsync(slug, code)
      // the drawing always reflects the last run — no separate action
      tab = 'draw'
      await viz?.showYours()
    } finally {
      running = false
    }
    if (report?.all && !solvedFlag) {
      setSolved(slug, true)
      solvedFlag = true
    }
  }

  function reset(): void {
    if (content && editor && confirm('Discard your code and restore the starter?')) {
      editor.setValue(content.starter)
      saveSolution(slug, content.starter)
    }
  }

  function loadReference(): void {
    if (solution && editor && confirm('Replace your code with the reference solution?')) {
      editor.setValue(solution)
      saveSolution(slug, solution)
    }
  }

  function onKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      run()
      e.preventDefault()
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="crumbs">
  {#if search.current.list}
    <Link to="/l/$listId" params={{ listId: search.current.list }} class="crumb">← back to list</Link>
  {:else}
    <Link to="/" class="crumb">← all lists</Link>
  {/if}
</div>

<div class="head">
  <h1>{meta.title}</h1>
  <div class="meta">
    <span class="diff-{meta.difficulty}">
      {meta.difficulty === 'E' ? 'Easy' : meta.difficulty === 'M' ? 'Med' : 'Hard'}
    </span>
    <span class="cat">{meta.category}</span>
    {#if meta.premium}<span class="cat">🔒 premium on LeetCode</span>{/if}
    <a href={lcUrl} target="_blank" rel="noopener">leetcode ↗</a>
    {#if solvedFlag}<span class="solved">✓ solved</span>{/if}
  </div>
</div>

{#if content}
  <div class="cols">
    <div class="left">
      <div class="tabs">
        <button class="tabbtn" class:active={tab === 'desc'} onclick={() => (tab = 'desc')}>
          Description
        </button>
        <button class="tabbtn" class:active={tab === 'draw'} onclick={() => (tab = 'draw')}>
          Illustration
        </button>
      </div>

      <div class="tabbody" hidden={tab !== 'desc'}>
        <!-- eslint-disable-next-line svelte/no-at-html-tags — our own authored HTML -->
        <div class="stmt">{@html content.statement}</div>
        {#if content.examples?.length}
          <h2>Examples</h2>
          {#each content.examples as e, i (i)}
            <div class="eg">
              <div><span class="k">Input</span><span class="mono">{e.in}</span></div>
              <div><span class="k">Output</span><span class="mono">{e.out}</span></div>
              {#if e.note}<span class="note">{e.note}</span>{/if}
            </div>
          {/each}
        {/if}
        {#if content.constraints?.length}
          <h2>Constraints</h2>
          <ul class="cons">
            {#each content.constraints as c, i (i)}<li>{c}</li>{/each}
          </ul>
        {/if}

        {#if solution}
          <h2>Stuck?</h2>
          <div class="stuck">
            <button
              onclick={() => {
                tab = 'draw'
                viz?.showReference()
              }}>Show illustrated solution</button>
            {#if !revealed}
              <button onclick={() => (revealed = true)}>Show code</button>
            {/if}
          </div>
          {#if revealed}
            <pre class="solution mono">{solution}</pre>
            <button onclick={loadReference}>Load into editor</button>
          {/if}
        {/if}
      </div>

      <div class="tabbody" hidden={tab !== 'draw'}>
        {#key slug}
          <Visualiser
            bind:this={viz}
            {content}
            reference={solution}
            getCode={() => editor?.getValue() ?? ''}
            onActiveLine={(l) => (activeLine = l)}
          />
        {/key}
      </div>
    </div>

    <div class="right">
      {#key slug}
        <div class="toolbar">
          <button class="primary" onclick={run} disabled={running}>
            {running ? 'running…' : 'Run tests'}
          </button>
          <button onclick={reset}>Reset</button>
          <span class="hint">⌘↵ runs · runs redraw the illustration</span>
        </div>
        <Editor bind:this={editor} value={starterCode()} {onChange} {activeLine} />
        <TestResults {report} />
      {/key}
    </div>
  </div>
{:else}
  <div class="missing">
    Not written up here yet — <a href={lcUrl} target="_blank" rel="noopener">open it on LeetCode</a>.
    Tick it on the list page once you've solved it there.
  </div>
{/if}

<style>
  .crumbs { margin-bottom: .3rem; }
  :global(.crumb) { color: var(--muted); font-size: .85rem; text-decoration: none; }
  .head { display: flex; align-items: baseline; gap: 1.2rem; flex-wrap: wrap; margin-bottom: .9rem; }
  h1 { font-size: 1.5rem; font-weight: 400; margin: 0; }
  .meta { display: flex; align-items: center; gap: .7rem; font-size: .82rem; flex-wrap: wrap; }
  .meta .cat, .meta a { color: var(--muted); }
  .solved { color: var(--pass); }

  .cols { display: flex; gap: 1.6rem; align-items: flex-start; }
  .left { width: 46%; min-width: 340px; }
  .right { flex: 1; min-width: 0; }
  @media (max-width: 960px) {
    .cols { flex-direction: column; }
    .left, .right { width: 100%; }
  }

  .tabs { display: flex; gap: .4rem; border-bottom: 2px dashed var(--pencil); }
  .tabbtn {
    border: 1.6px solid var(--pencil); border-bottom: none;
    border-radius: 12px 14px 0 0 / 10px 12px 0 0;
    background: var(--panel); color: var(--muted); transform: none;
    padding: .25rem 1rem; margin-bottom: -2px;
  }
  .tabbtn:hover { background: var(--amber-bg); transform: none; }
  .tabbtn.active {
    background: var(--paper); color: var(--ink); border-color: var(--ink);
    border-bottom: 2px solid var(--paper);
  }
  .tabbody { padding: .8rem .1rem 0; }

  .stmt :global(p) { margin: .7rem 0; }
  .stmt :global(ul) { margin: .7rem 0; padding-left: 1.3rem; }
  .stmt :global(code) { background: var(--amber-bg); border-radius: var(--sks); padding: .05em .4em; font-size: .85em; }
  .stmt :global(.hint) { color: var(--muted); font-style: italic; border-left: 3px dashed var(--pencil); padding-left: .9rem; }
  h2 { font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 400; margin: 1.6rem 0 .6rem; }
  .eg { border: 1.6px solid var(--pencil); border-radius: var(--sk); padding: .7rem 1rem; margin-bottom: .7rem; font-size: .88rem; background: #fff; transform: rotate(-.25deg); }
  .eg:nth-of-type(even) { border-radius: var(--sk2); transform: rotate(.3deg); }
  .eg div { display: flex; gap: .6rem; }
  .eg .k { color: var(--muted); min-width: 3.8em; flex: none; }
  .eg .note { color: var(--muted); font-style: italic; margin-top: .35rem; display: block; }
  .cons { list-style: none; padding: 0; margin: 0; font-size: .88rem; color: var(--muted); }
  .cons li::before { content: '· '; }
  .solution {
    border: 1.6px solid var(--pencil); border-radius: 8px; background: #fff;
    padding: .8rem 1rem; font-size: .8rem; line-height: 1.5; overflow-x: auto;
    white-space: pre;
  }
  .missing { padding: 1rem; border: 1.6px dashed var(--pencil); border-radius: var(--sk); color: var(--muted); background: #fff; margin-top: 1rem; }
  .stuck { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: .7rem; }
  .toolbar { display: flex; align-items: center; gap: .6rem; margin-bottom: .7rem; flex-wrap: wrap; }
  .hint { color: var(--muted); font-size: .75rem; margin-left: auto; }
</style>
