import { useEffect, useState } from 'react'
import { Check, ShoppingBag, Store, ChevronDown, BadgeIndianRupee, AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react'
import { supabase } from './supabaseClient'

/* My orders: things I bought (Purchases) and things I sold (Sales).
   Data comes from the my_orders() database function in backend/payments.sql. */

const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'
export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
export const txnId = (id) => 'AT' + String(id).replace(/-/g, '').slice(0, 10).toUpperCase()
export const when = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const day = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—')

export const STATUS = {
  held: ['In escrow', 'bg-amber-50 text-amber-800'],
  released: ['Paid out to seller', 'bg-[#E4EFE8] text-[#3D5A4D]'],
  disputed: ['Under review', 'bg-red-50 text-red-700'],
  refunded: ['Refunded to buyer', 'bg-[#F3EEE8] text-[#6B6B62]'],
  pending: ['Not paid yet', 'bg-[#F3EEE8] text-[#6B6B62]'],
}
export const Pill = ({ s }) => {
  const [label, cls] = STATUS[s] || [s, 'bg-[#F3EEE8] text-[#6B6B62]']
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>
}

/* Paid → In escrow → Paid out (or Under review / Refunded) */
function Progress({ o }) {
  const bad = o.escrow_status === 'disputed' || o.escrow_status === 'refunded'
  const steps = [
    ['Paid', o.paid_at],
    ['In escrow', o.paid_at],
    bad ? [o.escrow_status === 'refunded' ? 'Refunded' : 'Under review', o.refunded_at || o.disputed_at] : ['Paid out', o.released_at],
  ]
  const reached = o.escrow_status === 'held' ? 2 : 3
  return (
    <ol className="mt-3 flex items-center">
      {steps.map(([label, t], i) => {
        const on = i < reached
        const warn = bad && i === 2
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center text-center">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${warn ? 'bg-red-50 text-red-700' : on ? 'bg-[#256B4F] text-white' : 'border border-[#E4DED4] bg-white text-[#8A8A80]'}`}>
                {warn ? '!' : on ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`mt-1 text-[10px] font-semibold ${on ? 'text-[#17352B]' : 'text-[#8A8A80]'}`}>{label}</span>
              <span className="text-[10px] text-[#8A8A80]">{on && t ? day(t) : i === 2 && o.escrow_status === 'held' ? `by ${day(o.release_at)}` : ''}</span>
            </div>
            {i < 2 && <span className={`mx-1 mb-7 h-0.5 flex-1 rounded ${i + 1 < reached ? 'bg-[#256B4F]' : 'bg-[#E4DED4]'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

function Details({ o }) {
  const [open, setOpen] = useState(false)
  const rows = [
    ['Transaction ID', txnId(o.id)],
    ['Amount', money(o.amount)],
    ['Paid with', o.paid_with || (o.method === 'qr' ? 'UPI (QR scan)' : 'Card')],
    ['Buyer', o.buyer_name || 'AuthentiTrade user'],
    ['Seller', o.seller_name || 'AuthentiTrade user'],
    ['Paid on', when(o.paid_at)],
    o.escrow_status === 'held' && ['Auto-release on', when(o.release_at)],
    o.released_at && ['Paid out on', when(o.released_at)],
    o.refunded_at && ['Refunded on', when(o.refunded_at)],
  ].filter(Boolean)
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-semibold text-[#256B4F] hover:underline">
        {open ? 'Hide' : 'Show'} payment details <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <dl className="mt-2 divide-y divide-[#EFEAE0] rounded-lg border border-[#E4DED4] bg-[#FDFBF6] text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-[#6B6B62]">{k}</dt><dd className="text-right font-medium text-[#17352B]">{v}</dd></div>
          ))}
        </dl>
      )}
    </div>
  )
}

function Thumb({ src }) {
  const [bad, setBad] = useState(false)
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E4DED4]">
      {src && !bad && <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-full w-full object-cover" />}
    </div>
  )
}

function PurchaseCard({ o, act }) {
  return (
    <li className="rounded-xl border border-[#E4DED4] bg-white p-4 text-sm">
      <div className="flex gap-3">
        <Thumb src={o.listing_image} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-[#17352B]">{o.listing_title || 'Listing'}</p>
            <Pill s={o.escrow_status} />
          </div>
          <p className="mt-0.5 text-[#3D4A44]">You paid <b>{money(o.amount)}</b>{o.seller_name ? <> to {o.seller_name}</> : null}</p>
          <p className="text-xs text-[#8A8A80]">{when(o.paid_at)} · {txnId(o.id)}</p>
        </div>
      </div>
      <Progress o={o} />
      {o.escrow_status === 'held' && (
        <>
          <p className="mt-2 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">
            Your money is safe with AuthentiTrade. Release it once you have the item. If you do nothing, it is paid to the seller automatically on {day(o.release_at)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => act('release', o)} className={btn}>I received it, release payment</button>
            <button onClick={() => act('dispute', o)} className={ghost}>Report a problem</button>
          </div>
        </>
      )}
      {o.escrow_status === 'disputed' && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">A moderator is reviewing this order. The payment stays held until they decide.{o.dispute_reason ? ` Your report: “${o.dispute_reason}”` : ''}</p>}
      {o.escrow_status === 'refunded' && <p className="mt-2 rounded-lg bg-[#F3EEE8] px-3 py-2 text-xs text-[#3D4A44]">{money(o.amount)} was refunded to you.{o.resolution_note ? ` Moderator note: ${o.resolution_note}` : ''}</p>}
      <Details o={o} />
    </li>
  )
}

function SaleCard({ o, isNew }) {
  const s = o.escrow_status
  return (
    <li className={`rounded-xl border bg-white p-4 text-sm ${isNew ? 'border-[#256B4F] ring-2 ring-[#256B4F]/20' : 'border-[#E4DED4]'}`}>
      {(s === 'held' || s === 'released') && (
        <div className="-mx-4 -mt-4 mb-3 flex items-center gap-2 rounded-t-xl bg-[#E4EFE8] px-4 py-2.5 text-[#3D5A4D]">
          <BadgeIndianRupee size={17} strokeWidth={1.75} className="shrink-0 text-[#256B4F]" />
          <p className="text-xs font-semibold">
            {s === 'held' ? 'Payment received and held in escrow' : 'Payment released to you'}
          </p>
          {isNew && <span className="ml-auto rounded-full bg-[#256B4F] px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
        </div>
      )}
      <div className="flex gap-3">
        <Thumb src={o.listing_image} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-[#17352B]">{o.listing_title || 'Listing'}</p>
            <Pill s={s} />
          </div>
          <p className="mt-0.5 text-[#3D4A44]"><b>{o.buyer_name || 'A buyer'}</b> paid <b>{money(o.amount)}</b></p>
          <p className="text-xs text-[#8A8A80]">{when(o.paid_at)} · {o.paid_with || (o.method === 'qr' ? 'UPI' : 'Card')} · {txnId(o.id)}</p>
        </div>
      </div>
      <Progress o={o} />
      {s === 'held' && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Hand the item over to the buyer. The money is paid out to you as soon as they confirm delivery, or automatically on {day(o.release_at)}.
        </p>
      )}
      {s === 'released' && <p className="mt-2 text-xs text-[#3D5A4D]">{money(o.amount)} was paid out to you on {day(o.released_at)}.</p>}
      {s === 'disputed' && (
        <p className="mt-2 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>The buyer reported a problem{o.dispute_reason ? `: “${o.dispute_reason}”` : ''}. A moderator is reviewing it and the payment stays held until they decide.</span>
        </p>
      )}
      {s === 'refunded' && (
        <p className="mt-2 flex gap-2 rounded-lg bg-[#F3EEE8] px-3 py-2 text-xs text-[#3D4A44]">
          <RotateCcw size={14} className="mt-0.5 shrink-0" />
          <span>A moderator refunded this payment to the buyer and your listing is live again.{o.resolution_note ? ` Note: ${o.resolution_note}` : ''}</span>
        </p>
      )}
      <Details o={o} />
    </li>
  )
}

export function Orders({ onClose, initialTab = 'bought', onSeen }) {
  const [tab, setTab] = useState(initialTab)
  const [rows, setRows] = useState(null)
  const [fresh, setFresh] = useState(() => new Set()) // sales that were unseen when this window opened
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    await supabase.rpc('release_due')
    const { data, error } = await supabase.rpc('my_orders')
    if (error) {
      setRows([])
      return setErr(/my_orders|function|schema cache/i.test(error.message)
        ? 'Payments are not set up in the database yet. Run backend/payments.sql in the Supabase SQL editor.'
        : error.message)
    }
    setRows(data || [])
    setFresh((prev) => prev.size ? prev : new Set((data || []).filter((o) => o.role === 'seller' && !o.seller_seen_at).map((o) => o.id)))
  }
  useEffect(() => { load() }, [])

  // Opening the Sales tab marks new payments as seen (clears the header badge)
  useEffect(() => {
    if (tab !== 'sold' || !rows?.some((o) => o.role === 'seller' && !o.seller_seen_at)) return
    supabase.rpc('mark_sales_seen').then(() => onSeen?.())
  }, [tab, rows])

  async function act(kind, o) {
    setErr('')
    let res
    if (kind === 'release') {
      if (!window.confirm(`Release ${money(o.amount)} to ${o.seller_name || 'the seller'}? Only do this once you have received the item.`)) return
      res = await supabase.rpc('release_order', { p_order_id: o.id })
    } else {
      const reason = window.prompt('What went wrong? The payment will stay held until a moderator decides.')
      if (reason === null) return
      res = await supabase.rpc('dispute_order', { p_order_id: o.id, p_reason: reason.trim() || null })
    }
    if (res.error) return setErr(res.error.message)
    load()
  }

  const bought = (rows || []).filter((o) => o.role === 'buyer')
  const sold = (rows || []).filter((o) => o.role === 'seller')
  const list = tab === 'bought' ? bought : sold
  const unseen = sold.filter((o) => fresh.has(o.id)).length
  const earned = sold.filter((o) => o.escrow_status === 'released').reduce((s, o) => s + Number(o.amount), 0)
  const held = sold.filter((o) => o.escrow_status === 'held' || o.escrow_status === 'disputed').reduce((s, o) => s + Number(o.amount), 0)

  const tabBtn = (id, Icon, label, n, dot) => (
    <button onClick={() => setTab(id)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-[#17352B] shadow-sm' : 'text-[#6B6B62] hover:text-[#17352B]'}`}>
      <Icon size={15} strokeWidth={1.75} />{label}
      <span className="text-xs font-medium text-[#8A8A80]">{n}</span>
      {dot > 0 && <span className="rounded-full bg-[#C2643C] px-1.5 text-[10px] font-bold text-white">{dot} new</span>}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#F3EEE8] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#17352B]">My orders</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6B6B62]" aria-label="Close">×</button>
        </div>
        <div className="mb-4 flex gap-1 rounded-xl bg-[#E4DED4] p-1">
          {tabBtn('bought', ShoppingBag, 'Purchases', bought.length, 0)}
          {tabBtn('sold', Store, 'Sales', sold.length, tab === 'sold' ? 0 : unseen)}
        </div>

        {tab === 'sold' && sold.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E4DED4] bg-white p-3"><p className="text-[11px] font-semibold uppercase text-[#8A8A80]">Paid out to you</p><p className="text-lg font-bold text-[#256B4F]">{money(earned)}</p></div>
            <div className="rounded-xl border border-[#E4DED4] bg-white p-3"><p className="text-[11px] font-semibold uppercase text-[#8A8A80]">Held in escrow</p><p className="text-lg font-bold text-[#17352B]">{money(held)}</p></div>
          </div>
        )}

        {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
        {rows === null ? <p className="text-sm text-[#6B6B62]">Loading…</p> : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4DED4] bg-white px-4 py-8 text-center text-sm text-[#6B6B62]">
            <ShieldCheck size={26} strokeWidth={1.25} className="mx-auto mb-2 text-[#256B4F]" />
            {tab === 'bought' ? 'You have not bought anything yet. Items you pay for with escrow show up here.' : 'No sales yet. When a buyer pays for one of your listings, you will see it here.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((o) => tab === 'bought'
              ? <PurchaseCard key={o.id} o={o} act={act} />
              : <SaleCard key={o.id} o={o} isNew={fresh.has(o.id)} />)}
          </ul>
        )}
      </div>
    </div>
  )
}
