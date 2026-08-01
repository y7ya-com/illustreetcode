<script lang="ts">
  import type { RunReport } from '../runner'
  let { report }: { report: RunReport | null } = $props()
  const show = (v: unknown): string => (v === undefined ? 'undefined' : JSON.stringify(v))
</script>

{#if report}
  <div class="out">
    {#if report.parseError}
      <div class="verr mono">{report.parseError}</div>
    {:else}
      <div class="summary" style:color={report.all ? 'var(--pass)' : 'var(--fail)'}>
        {report.all
          ? 'All tests passed'
          : report.passed === report.total
            ? `${report.passed} / ${report.total} correct, but too slow at scale`
            : `${report.passed} / ${report.total} passed`} · {report.ms.toFixed(1)}ms
      </div>
      {#if report.stress}
        <div class="t" class:ok={report.stress.ok} class:no={!report.stress.ok}>
          <span class="mark">{report.stress.ok ? '✓' : '✕'}</span>
          <div class="body">
            <div class="row"><span class="lbl">scale</span><span class="val">{report.stress.note}</span></div>
            <div class="row">
              <span class="lbl">time</span>
              <span class="val">{report.stress.took}ms <em>/ {report.stress.budget}ms budget</em></span>
            </div>
            {#if !report.stress.right}
              <div class="row"><span class="lbl"></span><span class="val verr">{report.stress.why ?? 'wrong answer at scale'}</span></div>
            {:else if !report.stress.ok}
              <div class="row"><span class="lbl"></span><span class="val verr">correct, but too slow — this is the complexity the problem is testing</span></div>
            {/if}
          </div>
        </div>
      {/if}
      {#each report.rows as r, i (i)}
        <div class="t" class:ok={r.ok} class:no={!r.ok}>
          <span class="mark">{r.ok ? '✓' : '✕'}</span>
          <div class="body">
            <div class="row"><span class="lbl">input</span><span class="val mono">{r.args.map(show).join(', ')}</span></div>
            {#if !r.ok}
              <div class="row"><span class="lbl">expected</span><span class="val mono">{show(r.want)}</span></div>
              <div class="row"><span class="lbl">got</span><span class="val mono">{show(r.got)}</span></div>
              {#if r.why}<div class="row"><span class="lbl"></span><span class="val verr">{r.why}</span></div>{/if}
            {/if}
          </div>
        </div>
      {/each}
      {#if report.logs.length}
        <div class="logs mono">console:
{report.logs.join('\n')}</div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .out {
    border-top: 2px dashed var(--pencil); padding: .8rem 0 .4rem;
    font-size: .87rem; margin-top: 1rem;
  }
  .summary { margin-bottom: .6rem; }
  .t { border-top: 1.5px dashed var(--pencil-soft); padding: .5rem 0; display: flex; gap: .6rem; align-items: baseline; }
  .t .mark { flex: none; font-size: 1.1rem; }
  .t.ok .mark { color: var(--pass); }
  .t.no .mark { color: var(--fail); }
  .t .body { min-width: 0; flex: 1; }
  .t .row { display: flex; gap: .55rem; }
  .t .lbl { color: var(--muted); min-width: 5em; flex: none; }
  .t .row .val { overflow-x: auto; white-space: pre; font-size: .82rem; }
  .t.ok .body { color: var(--muted); }
  .t em { color: var(--muted); font-style: normal; }
  .logs { margin-top: .7rem; color: var(--muted); white-space: pre-wrap; font-size: .8rem; }
</style>
