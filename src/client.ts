// Custom client entry — the package default swallows hydration errors
// (hydrateStart().then(...) with no catch). This one reports them.
import { hydrate } from 'svelte'
import { StartClient, hydrateStart } from '@tanstack/svelte-start/client'

hydrateStart()
  .then((router) => {
    const target = document.getElementById('app')
    if (!target) throw new Error('missing #app element')
    hydrate(StartClient, { target, props: { router } })
  })
  .catch((e: unknown) => {
    console.error('[illustreetcode] hydration failed:', e)
  })
