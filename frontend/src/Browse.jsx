import { useState } from 'react'
import { TAXONOMY, PRICES, SORTS, DEFAULT_FILTERS, brandOf, cityOf, subOf } from './Taxonomy'

const sel = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none'
const pill = (on) => `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${on ? 'bg-[#17352B] text-white' : 'bg-[#F3EEE8] text-[#3D4A44] hover:bg-[#E9E2D6]'}`

/* Category bar. Hover (or focus) a category on desktop to open its menu. */
export function CategoryNav({ cat, active, onPick }) {
  const [open, setOpen] = useState(null)
  const t = TAXONOMY.find((x) => x.id === open)
  const pick = (c, s = '') => { setOpen(null); onPick(c, s) }
  const items = [{ id: 'all', label: 'All' }, { id: 'saved', label: '♥ Saved' }, ...TAXONOMY]
  return (
    <div className="relative" onMouseLeave={() => setOpen(null)} onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
        {items.map((x) => (
          <button key={x.id} onClick={() => pick(x.id)}
            onMouseEnter={() => setOpen(x.subs ? x.id : null)} onFocus={() => setOpen(x.subs ? x.id : null)}
            aria-expanded={open === x.id} className={pill(active && cat === x.id)}>{x.label}</button>
        ))}
      </nav>
      {t && (
        <div className="absolute inset-x-0 top-full z-50 hidden border-b border-[#E4DED4] bg-white shadow-xl md:block">
          <div className="mx-auto max-w-6xl px-4 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">{t.label}{!t.live && <span className="ml-2 rounded-full bg-[#F3EEE8] px-2 py-0.5 text-[10px] font-semibold text-[#6B6B62]">Coming soon</span>}</h3>
              <button onClick={() => pick(t.id)} className="text-xs font-semibold text-[#256B4F] hover:underline">View all →</button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              {t.subs.map((s) => (
                <button key={s} onClick={() => pick(t.id, s)} className="rounded-lg px-3 py-2 text-left text-sm text-[#3D4A44] hover:bg-[#F3EEE8]">{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* Breadcrumb, filters, sort and brand chips above the listing grid */
export function FilterBar({ items, f, setF, count }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const t = TAXONOMY.find((x) => x.id === f.cat)
  const scope = items.filter((i) => (f.cat === 'all' || f.cat === 'saved' || i.category === f.cat) && (!f.sub || subOf(i) === f.sub))
  const cities = [...new Set(scope.map(cityOf).filter(Boolean))].sort()
  const counts = {}
  scope.forEach((i) => { const b = brandOf(i); if (b) counts[b] = (counts[b] || 0) + 1 })
  const brands = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const dirty = f.sub || f.brand || f.city || f.price || f.minYear || f.maxKm
  const motors = f.cat === 'vehicle'
  const year = new Date().getFullYear()

  return (
    <div className="mb-5 space-y-3">
      <p className="text-xs text-[#6B6B62]">
        <button onClick={() => setF(DEFAULT_FILTERS)} className="font-semibold text-[#256B4F] hover:underline">Home</button>
        {f.cat === 'saved' && ' › Saved'}
        {t && <> › <button onClick={() => setF({ ...DEFAULT_FILTERS, cat: f.cat })} className="font-semibold text-[#256B4F] hover:underline">{t.label}</button></>}
        {f.sub && ` › ${f.sub}`}
      </p>

      <div className="grid gap-3 rounded-2xl border border-[#E4DED4] bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        {t && <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">Type</span>
          <select className={sel} value={f.sub} onChange={set('sub')}><option value="">All</option>{t.subs.map((s) => <option key={s}>{s}</option>)}</select></label>}
        <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">City</span>
          <select className={sel} value={f.city} onChange={set('city')}><option value="">Anywhere</option>{cities.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">Price</span>
          <select className={sel} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })}>{PRICES.map(([l], i) => <option key={l} value={i}>{l}</option>)}</select></label>
        {motors && <>
          <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">Year from</span>
            <select className={sel} value={f.minYear} onChange={set('minYear')}><option value="">Any</option>{Array.from({ length: 15 }, (_, i) => year - i).map((y) => <option key={y}>{y}</option>)}</select></label>
          <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">Max km</span>
            <select className={sel} value={f.maxKm} onChange={set('maxKm')}><option value="">Any</option>{[20000, 50000, 80000, 100000].map((k) => <option key={k} value={k}>{k.toLocaleString('en-IN')} km</option>)}</select></label>
        </>}
        <label><span className="mb-1 block text-[11px] font-semibold uppercase text-[#8A8A80]">Sort by</span>
          <select className={sel} value={f.sort} onChange={set('sort')}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold">{count} {count === 1 ? 'listing' : 'listings'}</span>
        {brands.map(([b, n]) => (
          <button key={b} onClick={() => setF({ ...f, brand: f.brand === b ? '' : b })} className={pill(f.brand === b)}>{b} ({n})</button>
        ))}
        {dirty && <button onClick={() => setF({ ...DEFAULT_FILTERS, cat: f.cat })} className="text-xs font-semibold text-[#C2643C] hover:underline">Clear filters</button>}
      </div>
    </div>
  )
}