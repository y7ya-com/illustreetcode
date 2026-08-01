import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { tanstackStart } from '@tanstack/svelte-start/plugin/vite'

export default defineConfig({
  plugins: [tanstackStart({ srcDirectory: 'src' }), svelte()],
  // the QuickJS worker code-splits (wasm variant is its own chunk) — the
  // default iife worker format can't code-split
  worker: { format: 'es' },
  resolve: {
    // CM6 breaks on duplicate @codemirror/state instances (instanceof checks)
    dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
  },
  optimizeDeps: {
    include: [
      'codemirror',
      '@codemirror/lang-javascript',
      '@codemirror/view',
      '@codemirror/state',
      '@codemirror/commands',
      'acorn',
      'acorn-walk',
    ],
  },
})
