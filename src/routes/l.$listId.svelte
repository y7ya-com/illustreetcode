<script module lang="ts">
  import { createFileRoute, notFound } from '@tanstack/svelte-router'
  import { LIST_BY_ID } from '../lib/data/lists'

  export const Route = createFileRoute('/l/$listId')({
    loader: ({ params }) => {
      const list = LIST_BY_ID.get(params.listId)
      if (!list) throw notFound()
      return list
    },
    head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'List'} · IllustreetCode` }] }),
  })
</script>

<script lang="ts">
  import { Link } from '@tanstack/svelte-router'
  import { CATEGORIES, CORPUS } from '../lib/data/corpus'
  import { CONTENT } from '../lib/data/content'
  import { loadProgress, setSolved } from '../lib/progress'

  const list = Route.useLoaderData()

  // read post-hydration only — see index.svelte
  let progress = $state<ReturnType<typeof loadProgress>>({})
  $effect(() => {
    progress = loadProgress()
  })

  const grouped = $derived(
    CATEGORIES.map((cat) => ({
      cat,
      items: list.current.problems.filter((s) => CORPUS[s]!.category === cat),
    })).filter((g) => g.items.length > 0),
  )
  const total = $derived(list.current.problems.length)
  const solved = $derived(list.current.problems.filter((s) => progress[s]).length)
  const weeks = Math.max(1, (new Date('2027-01-01').getTime() - Date.now()) / 6048e5)

  function toggle(slug: string, checked: boolean): void {
    progress = { ...setSolved(slug, checked) }
  }
</script>

<div class="head">
  <h1>{list.current.name}</h1>
  <span class="stats">
    {solved} / {total}
    · ~{Math.ceil((total - solved) / weeks)}/wk to finish by Jan 1
  </span>
</div>
<div class="bar"><div style:width="{(100 * solved) / Math.max(1, total)}%"></div></div>

{#each grouped as g (g.cat)}
  <details open={g.items.some((s) => !progress[s])}>
    <summary>
      {g.cat}
      <span class="cnt">{g.items.filter((s) => progress[s]).length} / {g.items.length}</span>
    </summary>
    {#each g.items as slug (slug)}
      {@const p = CORPUS[slug]!}
      <div class="item" class:done={!!progress[slug]}>
        <input
          type="checkbox"
          checked={!!progress[slug]}
          onchange={(e) => toggle(slug, e.currentTarget.checked)}
        />
        <Link to="/p/$slug" params={{ slug }} search={{ list: list.current.id }}>{p.title}</Link>
        {#if !CONTENT[slug]}<span class="ext-only" title="opens on LeetCode — not written up here yet">↗ only</span>{/if}
        {#if p.premium}<span class="lock" title="LeetCode Premium">🔒</span>{/if}
        <span class="diff diff-{p.difficulty}">
          {p.difficulty === 'E' ? 'Easy' : p.difficulty === 'M' ? 'Med' : 'Hard'}
        </span>
      </div>
    {/each}
  </details>
{/each}

<style>
  .head { display: flex; align-items: baseline; gap: 1rem; }
  h1 { font-size: 1.6rem; font-weight: 400; margin: .3rem 0; }
  .stats { color: var(--muted); font-size: .85rem; }
  .bar {
    height: 10px; border: 1.6px solid var(--ink); border-radius: var(--sks);
    overflow: hidden; background: #fff; transform: rotate(-.3deg); max-width: 680px;
  }
  .bar div { height: 100%; background: var(--green-bg); border-right: 1.6px solid var(--ink); transition: width .3s; }
  details { margin-top: 1.7rem; max-width: 680px; }
  summary { cursor: pointer; display: flex; align-items: baseline; gap: .6rem; font-size: 1.1rem; list-style: none; user-select: none; }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: '▸'; color: var(--muted); font-size: .8rem; transition: transform .15s; }
  details[open] summary::before { transform: rotate(90deg); }
  summary .cnt { color: var(--muted); font-size: .82rem; }
  .item { display: flex; align-items: center; gap: .7rem; padding: .45rem 0 .45rem 1.2rem; border-bottom: 1.5px dashed var(--pencil); }
  .item:last-child { border-bottom: 0; }
  .item input {
    appearance: none; width: 19px; height: 19px; flex: none; margin: 0; cursor: pointer;
    background: #fff; border: 1.6px solid var(--ink); border-radius: var(--sks); transform: rotate(-2deg);
  }
  .item input:checked { background: var(--green-bg); }
  .item input:checked::after { content: '✓'; display: block; text-align: center; line-height: 15px; font-size: 14px; }
  .item :global(a) { text-decoration: none; }
  .item :global(a:hover) { text-decoration: underline wavy; text-underline-offset: 3px; }
  .item.done :global(a) { color: var(--muted); text-decoration: line-through; }
  .lock { font-size: .75rem; opacity: .65; }
  .ext-only { color: var(--muted); font-size: .68rem; }
  .diff { margin-left: auto; flex: none; font-size: .78rem; }
</style>
