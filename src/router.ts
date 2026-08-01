import { createRouter } from '@tanstack/svelte-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/svelte-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
