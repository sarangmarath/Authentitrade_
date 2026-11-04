import { useState } from 'react'
import { ArrowLeft, Clock, BadgeCheck, Receipt, Scale, Lock, ShieldCheck } from 'lucide-react'
import { PayFlow } from './Pay'

const money = (n) => '₹' + Number(n).toLocaleString('en-IN')

/* One image with fallbacks (some sample photos have several possible file types) */
function CandImg({ cands, alt, className }) {
  const [n, setN] = useState(0)
  const src = cands?.[n]
  if (!src) return <div className="grid h-full w-full place-items-center text-xs text-[#8A8A80]">No photo</div>
  return <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setN(n + 1)} className={className} />
}

const FEATURES = [
  [ShieldCheck, 'Escrow protected'], [Clock, '7-day auto release'], [BadgeCheck, 'Verified listing'],
  [Scale, 'Dispute support'], [Receipt, 'Instant receipt'], [Lock, 'Card never stored'],
]

export default function Checkout({ item, gallery, onBack, onOrders }) {
  const [i, setI] = useState(0)
  const pics = gallery.length ? gallery : [[]]
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-[#256B4F] hover:underline">
        <ArrowLeft size={15} strokeWidth={1.75} />Back to listing
      </button>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
        <section className="self-start rounded-2xl border border-[#E4DED4] bg-white p-4">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#E9E2D6]">
            <CandImg key={i} cands={pics[i]} alt={item.title} className="h-full w-full object-cover" />
          </div>
          {pics.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {pics.slice(0, 5).map((c, k) => (
                <button key={k} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}
                  className={`aspect-[4/3] overflow-hidden rounded-lg border-2 ${k === i ? 'border-[#256B4F]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <CandImg cands={c} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[#17352B] sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-[#6B6B62]">Secure checkout with AuthentiTrade escrow{item.location ? ` · ${item.location}` : ''}</p>

          <div className="mt-5 rounded-2xl border border-[#E4DED4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B62]">Escrow checkout price</p>
              <span className="rounded-md bg-[#E4EFE8] px-2.5 py-1 text-[11px] font-semibold text-[#256B4F]">Protected payment</span>
            </div>
            <p className="font-display mt-1 text-4xl font-semibold text-[#17352B]">{money(item.price)}</p>
            <p className="mb-4 mt-2 text-sm text-[#6B6B62]">Your money is held in escrow. The seller is paid only when you confirm the item arrived, or automatically after 7 days.</p>
            <PayFlow item={item} compact onClose={onBack} onOrders={onOrders} />
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-[#3D4A44]">
              {FEATURES.map(([I, t]) => (
                <li key={t} className="flex items-center gap-2"><I size={15} strokeWidth={1.5} className="shrink-0 text-[#256B4F]" />{t}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}