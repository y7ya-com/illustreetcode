// The illustrator. Ported from the prototype's visualise.js with globals
// removed; drawing bodies are near-verbatim on purpose — each odd-looking
// choice is a shipped bug's fix:
//
//   1. chip identity = (container, value, nth occurrence IN that container)
//   2. FLIP measures offsets relative to the owning row (offsetParent chain),
//      never the viewport — page reflow is not data movement
//   3. pointer→container binding comes from analyse.ts (source text first)
//   4. pointer lanes are fixed for the whole run
//   5. provenance links need two independent matches, or a scalar named on
//      the currently executing line
//   6. deltas under 4px are reflow jitter — ignored
import { fmt } from '../tracer'
import { analyse, clen } from './analyse'
import type { Meta } from './analyse'
import type { Step } from '../tracer'

const esc = (s: unknown): string =>
  String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]!)

const isArr = (v: unknown): v is { __arr: Array<unknown> } =>
  !!v && typeof v === 'object' && '__arr' in (v as object)
const isMap = (v: unknown): v is { __map: Array<[unknown, unknown]> } =>
  !!v && typeof v === 'object' && '__map' in (v as object)
const isSet = (v: unknown): v is { __set: Array<unknown> } =>
  !!v && typeof v === 'object' && '__set' in (v as object)
const isHole = (v: unknown): boolean => !!v && typeof v === 'object' && '__hole' in (v as object)

const plain = (v: unknown): unknown => (v === null || typeof v !== 'object' ? v : undefined)
const flatVals = (el: unknown): Array<unknown> =>
  isArr(el)
    ? el.__arr.map(plain).filter((v) => v !== undefined)
    : plain(el) !== undefined
      ? [plain(el)]
      : []

interface Ptr {
  n: string
  v: number
  moved: boolean
}

export interface PlayerOptions {
  /** container for variable rows (position:relative context lives inside) */
  rows: HTMLElement
  /** SVG overlay for provenance links */
  links: SVGSVGElement
  /** host that both live in (for link geometry) */
  host: HTMLElement
  onStep?: (at: number, total: number, line: number, lineText: string) => void
}

export class Player {
  private steps: Array<Step> = []
  private code: Array<string> = []
  private meta: Meta = { pointers: new Map(), byContainer: new Map(), order: [] }
  at = 0

  constructor(private opts: PlayerOptions) {}

  load(steps: Array<Step>, code: string): void {
    this.steps = steps
    this.code = code.split('\n')
    this.meta = analyse(steps, code)
    this.at = 0
  }

  get total(): number {
    return this.steps.length
  }

  go(n: number): void {
    this.at = Math.max(0, Math.min(this.steps.length - 1, n))
    this.render()
  }

  // ---------------------------------------------------------------- drawing
  private chipKey(owner: string, v: unknown, seen: Record<string, number>): string {
    const k = typeof v === 'object' ? fmt(v) : JSON.stringify(v)
    const n = (seen[k!] = (seen[k!] ?? -1) + 1)
    return `chip:${owner}:${k}#${n}`
  }

  private drawChip(owner: string, v: unknown, seen: Record<string, number>, cls = ''): string {
    return `<span class="chip ${cls}" data-key="${esc(this.chipKey(owner, v, seen))}">${esc(fmt(v))}</span>`
  }

  private drawLanes(name: string, i: number, ptrs: Array<Ptr>): string {
    const mine = this.meta.byContainer.get(name)
    if (!mine?.length) return ''
    return `<span class="lanes">${mine
      .map((n) => {
        const p = ptrs.find((x) => x.n === n)
        return p && p.v === i
          ? `<span class="caret${p.moved ? ' moved' : ''}" data-key="ptr:${esc(n)}">▲${esc(n)}</span>`
          : `<span class="lane"></span>`
      })
      .join('')}</span>`
  }

  private drawCell(
    name: string,
    i: number,
    inner: string,
    ptrs: Array<Ptr>,
    cls: string,
    vals?: Array<unknown>,
  ): string {
    const tag =
      vals === undefined ? '' : ` data-idx="${i}" data-vals="${esc(JSON.stringify(vals))}"`
    return `<span class="cell ${cls}" data-key="cell:${esc(name)}:${i}"${tag}>
      <span class="val">${inner}</span><i class="idx">${i}</i>${this.drawLanes(name, i, ptrs)}</span>`
  }

  private drawValue(
    name: string,
    v: unknown,
    ptrs: Array<Ptr>,
    changed: Set<number> | null,
  ): string {
    const seen: Record<string, number> = {} // per-container occurrence counter
    const lanes = (this.meta.byContainer.get(name) ?? []).length
    const strip = (body: string) => `<span class="cells" style="--lanes:${lanes}">${body}</span>`

    if (typeof v === 'string' && v.length && v.length <= 200) {
      return strip(
        [...v]
          .map((ch, i) => this.drawCell(name, i, esc(ch), ptrs, changed?.has(i) ? 'hit' : ''))
          .join(''),
      )
    }
    if (isArr(v)) {
      return strip(
        v.__arr
          .map((el, i) => {
            const hole = isHole(el)
            const inner = hole
              ? `<span class="hole">·</span>`
              : isArr(el)
                ? `<span class="mini">${el.__arr.map((x) => this.drawChip(name, x, seen)).join('')}</span>`
                : this.drawChip(name, el, seen)
            return this.drawCell(
              name,
              i,
              inner,
              ptrs,
              (hole ? 'empty ' : '') + (changed?.has(i) ? 'hit' : ''),
              flatVals(el),
            )
          })
          .join(''),
      )
    }
    if (isMap(v)) {
      return strip(
        v.__map
          .map(
            ([k, val], i) =>
              `<span class="cell${changed?.has(i) ? ' hit' : ''}" data-key="cell:${esc(name)}:${i}"` +
              ` data-mapk="${esc(JSON.stringify(plain(k)))}" data-mapv="${esc(JSON.stringify(plain(val)))}">` +
              `<span class="val">${this.drawChip(name, k, seen, 'k')}` +
              `<span class="to">→</span>${this.drawChip(name, val, seen)}</span></span>`,
          )
          .join(''),
      )
    }
    if (isSet(v)) {
      return strip(
        v.__set
          .map((x) => `<span class="cell"><span class="val">${this.drawChip(name, x, seen)}</span></span>`)
          .join(''),
      )
    }
    const p = plain(v)
    return (
      `<span class="scalar" data-scalar="${esc(name)}"` +
      (p === undefined ? '' : ` data-val="${esc(JSON.stringify(p))}"`) +
      `>${esc(fmt(v))}</span>`
    )
  }

  private changedIndexes(now: unknown, before: unknown): Set<number> | null {
    if (isMap(now) && isMap(before)) {
      const s = new Set<number>()
      for (let i = 0; i < now.__map.length; i++)
        if (fmt(now.__map[i]) !== fmt(before.__map[i])) s.add(i)
      return s
    }
    if (!isArr(now) || !isArr(before)) {
      if (typeof now === 'string' && typeof before === 'string') {
        const s = new Set<number>()
        for (let i = 0; i < now.length; i++) if (now[i] !== before[i]) s.add(i)
        return s
      }
      return null
    }
    const s = new Set<number>()
    for (let i = 0; i < now.__arr.length; i++)
      if (fmt(now.__arr[i]) !== fmt(before.__arr[i])) s.add(i)
    return s
  }

  // ---------------------------------------------------------------- FLIP
  // Offsets relative to the owning row via the offsetParent chain. Two reasons
  // not to use getBoundingClientRect: a row growing shifts everything below it
  // (reflow ≠ data movement), and a transformed cell becomes an offsetParent,
  // so a bare offsetLeft measures chips and cells in different frames.
  private offsetInRow(el: HTMLElement): { x: number; y: number } {
    const row = el.closest('.vrow')
    let x = 0
    let y = 0
    let n: Element | null = el
    while (n && n !== row) {
      const h = n as HTMLElement
      x += h.offsetLeft
      y += h.offsetTop
      n = h.offsetParent
    }
    return { x, y }
  }

  private measure(): Map<string, { x: number; y: number }> {
    const m = new Map<string, { x: number; y: number }>()
    for (const el of this.opts.rows.querySelectorAll<HTMLElement>('[data-key]'))
      m.set(el.dataset.key!, this.offsetInRow(el))
    return m
  }

  private paint(html: string): void {
    const before = this.measure()
    this.opts.rows.innerHTML = html
    const after = this.measure()

    for (const [key, to] of after) {
      const from = before.get(key)
      const el = this.opts.rows.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)
      if (!el) continue
      if (!from) {
        el.classList.add('enter')
        continue
      }
      const dx = from.x - to.x
      const dy = from.y - to.y
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) continue // reflow jitter
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.classList.add('flying')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.transition = ''
          el.style.transform = ''
          setTimeout(() => el.classList.remove('flying'), 320)
        }),
      )
    }

    // keep pointers in view; instant, not smooth — links are drawn right after
    for (const strip of this.opts.rows.querySelectorAll<HTMLElement>('.cells')) {
      const cells = [...strip.querySelectorAll<HTMLElement>('.caret')].map(
        (c) => c.closest('.cell') as HTMLElement,
      )
      if (!cells.length) continue
      const lo = Math.min(...cells.map((c) => c.offsetLeft))
      const hi = Math.max(...cells.map((c) => c.offsetLeft + c.offsetWidth))
      let mid = (lo + hi) / 2
      if (hi - lo > strip.clientWidth) {
        const moved = strip.querySelector('.caret.moved')?.closest('.cell') as HTMLElement | null
        if (!moved) continue
        mid = moved.offsetLeft + moved.offsetWidth / 2
      }
      strip.scrollLeft = Math.max(0, mid - strip.clientWidth / 2)
    }

    this.drawLinks()
  }

  // ---------------------------------------------------------------- links
  // Provenance: for a cell that just changed at index i holding value v,
  // sources are (a) a map entry whose key AND value match (v, i) either way
  // round, or (b) a scalar holding v or i that is NAMED on the current line.
  private lineText = ''

  private drawLinks(): void {
    const svg = this.opts.links
    const host = this.opts.host
    svg.innerHTML = ''
    svg.setAttribute('width', String(host.clientWidth))
    svg.setAttribute('height', String(host.scrollHeight))
    svg.setAttribute('viewBox', `0 0 ${host.clientWidth} ${host.scrollHeight}`)

    const base = host.getBoundingClientRect()
    const at = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top, h: r.height }
    }
    const num = (s: string | undefined): unknown => {
      try {
        return s === undefined ? undefined : JSON.parse(s)
      } catch {
        return undefined
      }
    }
    const eq = (a: unknown, b: unknown): boolean =>
      a !== undefined && a !== null && String(a) === String(b)
    const onLine = (n: string | undefined): boolean =>
      !!n && new RegExp(`\\b${n}\\b`).test(this.lineText)

    const links: Array<{ from: Element; to: Element; label: string }> = []
    for (const cell of host.querySelectorAll<HTMLElement>('.cell.hit[data-vals]')) {
      const idx = cell.dataset.idx
      const vals = (num(cell.dataset.vals) as Array<unknown>) ?? []
      for (const v of vals) {
        for (const pair of host.querySelectorAll<HTMLElement>('[data-mapk]')) {
          const k = num(pair.dataset.mapk)
          const mv = num(pair.dataset.mapv)
          if ((eq(k, v) && eq(mv, idx)) || (eq(mv, v) && eq(k, idx)))
            links.push({ from: pair, to: cell, label: '' })
        }
        for (const sc of host.querySelectorAll<HTMLElement>('[data-val]')) {
          if (!onLine(sc.dataset.scalar)) continue
          const sv = num(sc.dataset.val)
          if (eq(sv, v)) links.push({ from: sc, to: cell, label: 'what' })
          else if (eq(sv, idx)) links.push({ from: sc, to: cell, label: 'where' })
        }
      }
    }

    for (const { from, to, label } of links.slice(0, 4)) {
      const a = at(from)
      const b = at(to)
      const ay = a.y + a.h / 2
      const by = b.y + b.h / 2
      const mx = (a.x + b.x) / 2
      const my = (ay + by) / 2 - Math.max(22, Math.abs(b.x - a.x) * 0.16)
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', `M ${a.x} ${ay} Q ${mx} ${my} ${b.x} ${by}`)
      p.setAttribute('class', 'link')
      svg.append(p)
      if (label) {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        t.setAttribute('x', String(mx))
        t.setAttribute('y', String(my + 3))
        t.setAttribute('class', 'linklabel')
        t.textContent = label
        svg.append(t)
      }
    }
  }

  // ---------------------------------------------------------------- render
  render(): void {
    const step = this.steps[this.at]
    if (!step) return
    this.lineText = (this.code[step.line - 1] ?? '').trim()
    this.opts.onStep?.(this.at, this.steps.length, step.line, this.lineText)

    const prev = this.at > 0 ? this.steps[this.at - 1]!.vars : {}
    const ptrs: Array<Ptr> = [...this.meta.pointers.keys()]
      .filter((n) => typeof step.vars[n] === 'number')
      .map((n) => ({
        n,
        v: step.vars[n] as number,
        moved: prev[n] !== step.vars[n],
      }))

    const scalars: Array<string> = []
    const blocks: Array<string> = []

    for (const [name, val] of Object.entries(step.vars)) {
      if (this.meta.pointers.has(name)) continue // drawn as a caret instead
      const was = name in prev ? prev[name] : undefined
      const changed = name in prev && fmt(was) !== fmt(val)
      const fresh = !(name in prev)
      const cells = this.changedIndexes(val, was)

      const big =
        (typeof val === 'string' && val.length > 0) ||
        isArr(val) ||
        isMap(val) ||
        isSet(val)
      const body = this.drawValue(name, val, ptrs, changed ? cells : null)
      const row = `<div class="vrow${changed ? ' changed' : ''}${fresh ? ' fresh' : ''}">
        <span class="vname">${esc(name)}</span>${body}</div>`
      ;(big ? blocks : scalars).push(row)
    }

    const ptrRow = ptrs.length
      ? `<div class="vrow ptrs"><span class="vname">pointers</span>` +
        ptrs
          .map(
            (p) =>
              `<span class="pchip${prev[p.n] !== p.v ? ' changed' : ''}">${esc(p.n)} = ${p.v}</span>`,
          )
          .join('') +
        `</div>`
      : ''

    this.paint(
      blocks.join('') + ptrRow + scalars.join('') ||
        `<div class="vrow"><span class="vname">—</span></div>`,
    )
  }
}
