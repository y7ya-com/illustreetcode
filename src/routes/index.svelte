<script module lang="ts">
  import { createFileRoute } from '@tanstack/svelte-router'

  export const Route = createFileRoute('/')({})
</script>

<script lang="ts">
  import { Link } from '@tanstack/svelte-router'
  import { LISTS } from '../lib/data/lists'
  import { CORPUS } from '../lib/data/corpus'
  import { CONTENT } from '../lib/data/content'
  import { loadProgress } from '../lib/progress'

  // localStorage differs from the server's empty render — read it only after
  // hydration or every returning visitor gets a hydration mismatch.
  let progress = $state<ReturnType<typeof loadProgress>>({})
  $effect(() => {
    progress = loadProgress()
  })
  const done = (slugs: Array<string>) => slugs.filter((s) => progress[s]).length
  const runnable = (slugs: Array<string>) => slugs.filter((s) => CONTENT[s]).length
</script>

<h1>Pick a list</h1>
<p class="sub">
  One problem corpus, {Object.keys(CORPUS).length} problems, organised the NeetCode way.
  Solve a problem once and it ticks in every list that contains it. No login needed —
  sign in later only to sync progress across devices.
</p>

<div class="cards">
  {#each LISTS as list (list.id)}
    <Link to="/l/$listId" params={{ listId: list.id }} class="card">
      <h2>{list.name}</h2>
      <p>{list.blurb}</p>
      <div class="meta">
        <span>{done(list.problems)} / {list.problems.length} solved</span>
        <span>{runnable(list.problems)} runnable in-browser</span>
        <span class="credit">curated by {list.credit}</span>
      </div>
    </Link>
  {/each}
</div>

<style>
  h1 { font-size: 1.7rem; font-weight: 400; margin: .4rem 0; }
  .sub { color: var(--muted); max-width: 46rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 1rem; margin-top: 1.4rem; }
  .cards :global(.card) {
    border: 1.6px solid var(--pencil); border-radius: var(--sk); background: #fff;
    padding: 1rem 1.2rem; text-decoration: none; transform: rotate(-.25deg);
    transition: transform .15s, border-color .15s;
  }
  .cards :global(.card:nth-child(even)) { border-radius: var(--sk2); transform: rotate(.3deg); }
  .cards :global(.card:hover) { transform: rotate(0) scale(1.02); border-color: var(--ink); }
  .cards :global(.card h2) { margin: 0 0 .3rem; font-size: 1.2rem; font-weight: 400; }
  .cards :global(.card p) { margin: 0 0 .8rem; color: var(--muted); font-size: .9rem; }
  .meta { display: flex; flex-wrap: wrap; gap: .8rem; font-size: .78rem; color: var(--muted); }
  .meta .credit { margin-left: auto; }
</style>
