import { useRef, useState } from 'react'
import { TAXONOMY, META, subOf } from './Taxonomy'

const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C2643C]'

/* Text-only category bar with a mega-menu. Hover (or focus) a category on desktop. */
export function CategoryNav({ items = [], cat, active, onPick, onSell }) {
  const [open, setOpen] = useState(null)
  const timer = useRef()
  const later = (fn, ms) => { clearTimeout(timer.current); timer.current = setTimeout(fn, ms) }
  const pick = (c, s = '') => { clearTimeout(timer.current); setOpen(null); onPick(c, s) }
  const t = TAXONOMY.find((x) => x.id === open)
  const bar = [{ id: 'all', label: 'All' }, { id: 'saved', label: 'Saved' }, ...TAXONOMY]
  const count = (c, s) => items.filter((i) => i.category === c && subOf(i) === s).length

  return (
    <div className="relative" onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={() => later(() => setOpen(null), 160)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}>
      <nav className="mx-auto flex max-w-6xl gap-7 overflow-x-auto px-4">
        {bar.map((x) => {
          const on = active && cat === x.id
          return (
            <button key={x.id} onClick={() => pick(x.id)} aria-expanded={open === x.id}
              onMouseEnter={() => later(() => setOpen(x.subs ? x.id : null), 90)} onFocus={() => setOpen(x.subs ? x.id : null)}
              className={`relative whitespace-nowrap pb-3 pt-1 text-sm transition ${on ? 'font-semibold text-[#17352B]' : 'font-medium text-[#6B6B62] hover:text-[#17352B]'}`}>
              {x.label}
              <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#256B4F] transition ${on || open === x.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          )
        })}
      </nav>

      {t && (
        <div className="fade-up absolute inset-x-0 top-full z-50 hidden md:block">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-[220px_1fr_280px] overflow-hidden rounded-b-2xl border border-t-0 border-[#E4DED4] bg-white shadow-2xl">
              <ul className="border-r border-[#EFEAE0] py-4">
                {TAXONOMY.map((x) => {
                  const on = x.id === t.id
                  return (
                    <li key={x.id}>
                      <button onMouseEnter={() => setOpen(x.id)} onClick={() => pick(x.id)}
                        className={`flex w-full items-center justify-between border-l-2 px-5 py-2.5 text-left text-sm transition ${on ? 'border-[#256B4F] bg-[#F3EEE8] font-semibold text-[#17352B]' : 'border-transparent text-[#6B6B62] hover:text-[#17352B]'}`}>
                        {x.label}<span aria-hidden className={on ? 'opacity-100' : 'opacity-0'}>→</span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="px-8 py-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className={eyebrow}>{t.live ? 'Browse' : 'Coming soon'}</p>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight">{t.label}</h3>
                    <p className="mt-1 text-sm text-[#6B6B62]">{META[t.id].blurb}</p>
                  </div>
                  <button onClick={() => pick(t.id)} className="shrink-0 border-b border-[#256B4F] pb-0.5 text-sm font-semibold text-[#256B4F] hover:opacity-80">View all →</button>
                </div>
                <ul className="mt-5 grid grid-cols-2 gap-x-8 lg:grid-cols-3">
                  {t.subs.map((s) => (
                    <li key={s}>
                      <button onClick={() => pick(t.id, s)}
                        className="group flex w-full items-baseline justify-between border-b border-[#EFEAE0] py-3 text-left text-sm transition hover:border-[#256B4F]">
                        <span className="font-medium transition group-hover:text-[#256B4F]">{s}</span>
                        <span className="text-xs text-[#8A8A80]">{t.live ? count(t.id, s) : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5">
                <div className="flex h-full flex-col justify-between rounded-2xl bg-[#17352B] p-6 text-white">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{t.live ? 'Verified before it goes live' : 'On the way'}</p>
                    <p className="mt-3 text-xl font-bold leading-snug">{t.live ? `Selling ${t.label.toLowerCase()}?` : `${t.label} are coming`}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{t.live ? 'Upload proof of ownership. Our team checks it, then buyers see the Verified badge.' : 'We are adding verified sellers first.'}</p>
                  </div>
                  {t.live && <button onClick={() => { setOpen(null); onSell?.() }} className="mt-6 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#17352B] transition hover:bg-[#E4EFE8]">Post a listing</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* "Shop by category" tiles for the home page */
export function CategoryTiles({ items, onPick }) {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4">
      <p className={eyebrow}>Explore</p>
      <h2 className="mb-4 mt-1 text-2xl font-bold tracking-tight">Shop by category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TAXONOMY.map((t, i) => {
          const n = items.filter((x) => x.category === t.id).length
          return (
            <button key={t.id} onClick={() => onPick(t.id)}
              className="group flex min-h-[150px] flex-col justify-between rounded-2xl border border-[#E4DED4] bg-white p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-[#17352B] hover:bg-[#17352B] hover:text-white hover:shadow-xl">
              <span className="text-xs font-semibold tracking-widest text-[#C2643C] transition group-hover:text-white/60">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-base font-bold">{t.label}</p>
                <p className="mt-1 text-xs text-[#6B6B62] transition group-hover:text-white/70">{META[t.id].blurb}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <span>{t.live ? `${n} ${n === 1 ? 'listing' : 'listings'}` : 'Coming soon'}</span>
                  <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}