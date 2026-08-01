<script lang="ts">
  // CodeMirror 6 wrapper. Emits changes; parent owns persistence.
  import { onMount } from 'svelte'
  import {
    Decoration,
    EditorView,
    drawSelection,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
  } from '@codemirror/view'
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
  import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
  import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
  import { javascript } from '@codemirror/lang-javascript'
  import { Compartment, EditorState } from '@codemirror/state'

  let {
    value = '',
    onChange,
    activeLine = 0,
  }: { value?: string; onChange?: (code: string) => void; activeLine?: number } = $props()

  let host: HTMLDivElement
  let view: EditorView | undefined
  const lineHl = new Compartment()

  export function getValue(): string {
    return view?.state.doc.toString() ?? value
  }
  export function setValue(code: string): void {
    view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } })
  }

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        // deliberately minimal: no autocompletion, no keyword hints, no
        // snippets — the only assistance is brackets and indentation
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          syntaxHighlighting(defaultHighlightStyle),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          javascript(),
          lineHl.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChange?.(u.state.doc.toString())
          }),
          EditorView.theme({
            '&': { fontSize: '13.5px', backgroundColor: 'var(--paper)' },
            '.cm-gutters': { backgroundColor: 'var(--paper)', borderRight: '1px dashed var(--pencil)' },
            '.cm-activeLine': { backgroundColor: 'transparent' },
            '&.cm-focused': { outline: 'none' },
          }),
        ],
      }),
    })
    return () => view?.destroy()
  })

  // step-through line highlight + follow
  const hlDeco = Decoration.line({ class: 'cm-now' })
  $effect(() => {
    if (!view) return
    const line = activeLine
    if (line > 0 && line <= view.state.doc.lines) {
      const l = view.state.doc.line(line)
      view.dispatch({
        effects: [
          lineHl.reconfigure(
            EditorView.decorations.of(Decoration.set([hlDeco.range(l.from)])),
          ),
          EditorView.scrollIntoView(l.from, { y: 'center' }),
        ],
      })
    } else {
      view.dispatch({ effects: lineHl.reconfigure([]) })
    }
  })
</script>

<div bind:this={host} class="editor-host"></div>

<style>
  .editor-host { border: 1.6px solid var(--pencil); border-radius: 8px; overflow: hidden; }
  .editor-host :global(.cm-editor) { max-height: 46vh; }
  .editor-host :global(.cm-scroller) { overflow: auto; }
  .editor-host :global(.cm-now) { background: var(--amber-bg) !important; }
</style>
