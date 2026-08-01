<script module lang="ts">
  import { createRootRoute } from '@tanstack/svelte-router'

  export const Route = createRootRoute({
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'IllustreetCode' },
        {
          name: 'description',
          content: 'Practice lists with an illustrator that draws your own code, step by step.',
        },
      ],
    }),
  })
</script>

<script lang="ts">
  // Scripts injects the client entry + hydration payload — without it the page
  // never hydrates (SSR HTML renders, then nothing).
  import { Link, Outlet, Scripts } from '@tanstack/svelte-router'
  import '../styles/app.css'
</script>

<header>
  <Link to="/" class="brand">Illustreet<span>Code</span></Link>
  <span class="tag">not affiliated with LeetCode</span>
</header>
<main><Outlet /></main>
<Scripts />

<style>
  header {
    display: flex; align-items: baseline; gap: .9rem;
    padding: 1rem 1.4rem .6rem; border-bottom: 2px dashed var(--pencil);
  }
  header :global(.brand) { font-size: 1.35rem; text-decoration: none; }
  header :global(.brand span) { color: var(--violet); }
  .tag { color: var(--muted); font-size: .72rem; margin-left: auto; }
  main { max-width: 1200px; margin: 0 auto; padding: 1.2rem 1.4rem 4rem; }
</style>
