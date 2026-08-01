<script module lang="ts">
  import { createFileRoute } from '@tanstack/svelte-router'

  export const Route = createFileRoute('/about')({})
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  let mounted = $state(false)
  onMount(() => (mounted = true))
</script>

<h1>About</h1>
<p data-probe={mounted ? 'mounted' : 'ssr'}>Static content, zero localStorage.</p>
