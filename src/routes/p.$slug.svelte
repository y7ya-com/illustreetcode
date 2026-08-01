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
  import { loadSolution, saveSolution, setSolved, loadProgress } from '../lib/progress'
  import { runTests } from '../lib/runner'
  import type { RunReport } from '../lib/runner'
  import Editor from '../lib/components/Editor.svelte'
  import TestResults from '../lib/components/TestResults.svelte'
  import Visualiser from '../lib/components/Visualiser.svelte'

  const data = Route.useLoaderData()
  const search = Route.useSearch()

  const slug = $derived(data.current.slug)
  const meta = $derived(data.current.meta)
  const content = $derived(CONTENT[slug])
  const lcUrl = $derived(`https://leetcode.com/problems/${slug}/`)

  let editor: ReturnType<typeof Editor> | undefined = $state()
  let viz: ReturnType<typeof Visualiser> | undefined = $state()
  let report: RunReport | null = $state(null)
  let solvedFlag = $state(false)
  let activeLine = $state(0)
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

  function run(): void {
    if (!content || !editor) return
    const code = editor.getValue()
    saveSolution(slug, code)
    report = runTests(code, content)
    if (report.all && !solvedFlag) {
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

  function onKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      run()
      e.preventDefault()
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="cols">
  <div class="left">
    {#if search.current.list}
      <Link to="/l/$listId" params={{ listId: search.current.list }} class="crumb">← back to list</Link>
    {:else}
      <Link to="/" class="crumb">← all lists</Link>
    {/if}
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

    {#if content}
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
    {:else}
      <div class="missing">
        Not written up here yet — <a href={lcUrl} target="_blank" rel="noopener">open it on LeetCode</a>.
        Tick it on the list page once you've solved it there.
      </div>
    {/if}
  </div>

  <div class="right">
    {#if content}
      {#key slug}
        <div class="toolbar">
          <button class="primary" onclick={run}>Run tests</button>
          <button onclick={reset}>Reset</button>
          <span class="hint">⌘↵ runs</span>
        </div>
        <Editor bind:this={editor} value={starterCode()} {onChange} {activeLine} />
        <div class="below">
          <Visualiser bind:this={viz} {content} getCode={() => editor?.getValue() ?? ''} onActiveLine={(l) => (activeLine = l)} />
        </div>
        <TestResults {report} />
      {/key}
    {/if}
  </div>
</div>

<style>
  .cols { display: flex; gap: 2rem; align-items: flex-start; }
  @media (max-width: 900px) {
    .cols { flex-direction: column; }
    .left, .right { width: 100%; position: static; }
  }
  .below { margin-top: .8rem; }
  .left { width: 44%; min-width: 320px; }
  .right { flex: 1; min-width: 0; position: sticky; top: 1rem; }
  :global(.crumb) { color: var(--muted); font-size: .85rem; text-decoration: none; }
  h1 { font-size: 1.55rem; font-weight: 400; margin: .5rem 0 .4rem; }
  .meta { display: flex; align-items: center; gap: .7rem; font-size: .82rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
  .meta .cat, .meta a { color: var(--muted); }
  .solved { color: var(--pass); }
  .stmt :global(p) { margin: .75rem 0; }
  .stmt :global(ul) { margin: .75rem 0; padding-left: 1.3rem; }
  .stmt :global(code) { background: var(--amber-bg); border-radius: var(--sks); padding: .05em .4em; font-size: .85em; }
  .stmt :global(.hint) { color: var(--muted); font-style: italic; border-left: 3px dashed var(--pencil); padding-left: .9rem; }
  h2 { font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 400; margin: 1.8rem 0 .6rem; }
  .eg { border: 1.6px solid var(--pencil); border-radius: var(--sk); padding: .7rem 1rem; margin-bottom: .7rem; font-size: .88rem; background: #fff; transform: rotate(-.25deg); }
  .eg:nth-of-type(even) { border-radius: var(--sk2); transform: rotate(.3deg); }
  .eg div { display: flex; gap: .6rem; }
  .eg .k { color: var(--muted); min-width: 3.8em; flex: none; }
  .eg .note { color: var(--muted); font-style: italic; margin-top: .35rem; display: block; }
  .cons { list-style: none; padding: 0; margin: 0; font-size: .88rem; color: var(--muted); }
  .cons li::before { content: '· '; }
  .missing { padding: 1rem; border: 1.6px dashed var(--pencil); border-radius: var(--sk); color: var(--muted); background: #fff; margin-top: 1rem; }
  .toolbar { display: flex; align-items: center; gap: .6rem; margin-bottom: .7rem; flex-wrap: wrap; }
  .hint { color: var(--muted); font-size: .75rem; margin-left: auto; }
</style>
