import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown, Download } from 'lucide-react'
import { supabase } from './supabaseClient'
import { Pill, money, txnId, when } from './Orders'

/* Admin → Payments: every escrow payment on the marketplace.
   Data comes from admin_payments() in backend/payments.sql (admins only). */

const btn = 'rounded-lg bg-[#256B4F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-lg border border-[#E4DED4] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'
const FILTERS = [['all', 'All'], ['held', 'In escrow'], ['disputed', 'Disputed'], ['released', 'Paid out'], ['refunded', 'Refunded'], ['pending', 'Started, not paid']]

const plural = (n) => `${n} payment${n === 1 ? '' : 's'}`

function Stat({ label, value, sub, tone = 'text-[#17352B]' }) {
  return (
    <div className="rounded-xl border border-[#E4DED4] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A80]">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-[#6B6B62]">{sub}</p>}
    </div>
  )
}

function Person({ role, name, email }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase text-[#8A8A80]">{role}</p>
      <p className="truncate font-medium text-[#17352B]">{name || 'No name'}</p>
      {email && <p className="truncate text-xs text-[#6B6B62]">{email}</p>}
    </div>
  )
}

function PaymentRow({ p, onResolve, busy }) {
  const [open, setOpen] = useState(p.escrow_status === 'disputed')
  const canAct = p.escrow_status === 'held' || p.escrow_status === 'disputed'
  const rows = [
    ['Transaction ID', txnId(p.id)],
    ['Order reference', p.id],
    ['Method', p.paid_with || (p.method === 'qr' ? 'UPI (QR scan)' : 'Card')],
    ['Checkout started', when(p.created_at)],
    ['Paid', when(p.paid_at)],
    p.escrow_status === 'held' && ['Auto-release', when(p.release_at)],
    p.disputed_at && ['Disputed', when(p.disputed_at)],
    p.released_at && ['Paid out', when(p.released_at)],
    p.refunded_at && ['Refunded', when(p.refunded_at)],
    p.resolved_by_name && ['Decided by', p.resolved_by_name],
    p.resolution_note && ['Moderator note', p.resolution_note],
  ].filter(Boolean)

  return (
    <li className={`rounded-xl border bg-white p-4 text-sm ${p.escrow_status === 'disputed' ? 'border-red-200' : 'border-[#E4DED4]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#17352B]">{p.listing_title || 'Listing'}</p>
          <p className="text-xs text-[#8A8A80]">{txnId(p.id)} · {when(p.paid_at || p.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-[#17352B]">{money(p.amount)}</p>
          <Pill s={p.escrow_status} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Person role="Buyer" name={p.buyer_name} email={p.buyer_email} />
        <Person role="Seller" name={p.seller_name} email={p.seller_email} />
        <div><p className="text-[10px] font-semibold uppercase text-[#8A8A80]">Paid with</p><p className="font-medium text-[#17352B]">{p.paid_with || (p.method === 'qr' ? 'UPI (QR scan)' : 'Card')}</p></div>
      </div>
      {p.escrow_status === 'disputed' && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Buyer reported a problem{p.dispute_reason ? `: “${p.dispute_reason}”` : ' (no reason given)'}.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canAct && <>
          <button disabled={busy} onClick={() => onResolve(p, 'released')} className={btn}>Release to seller</button>
          <button disabled={busy} onClick={() => onResolve(p, 'refunded')} className={ghost}>Refund buyer</button>
        </>}
        <button onClick={() => setOpen(!open)} className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#256B4F] hover:underline">
          {open ? 'Hide' : 'Full'} details <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {open && (
        <dl className="mt-2 divide-y divide-[#EFEAE0] rounded-lg border border-[#E4DED4] bg-[#FDFBF6] text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-[#6B6B62]">{k}</dt><dd className="break-all text-right font-medium text-[#17352B]">{v}</dd></div>
          ))}
        </dl>
      )}
    </li>
  )
}

export default function AdminPayments() {
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setErr('')
    await supabase.rpc('release_due')
    const { data, error } = await supabase.rpc('admin_payments', { p_status: null })
    if (error) {
      setRows([])
      return setErr(/admin_payments|schema cache/i.test(error.message)
        ? 'Payments are not set up in the database yet. Run backend/payments.sql in the Supabase SQL editor.'
        : error.message)
    }
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function resolve(p, decision) {
    const verb = decision === 'released' ? `Release ${money(p.amount)} to ${p.seller_name || 'the seller'}` : `Refund ${money(p.amount)} to ${p.buyer_name || 'the buyer'}`
    const note = window.prompt(`${verb}?\n\nAdd a short note (shown to the buyer and seller):`)
    if (note === null) return
    setBusyId(p.id); setErr('')
    const { error } = await supabase.rpc('admin_resolve_order', { p_order_id: p.id, p_decision: decision, p_note: note.trim() || null })
    setBusyId(null)
    if (error) return setErr(error.message)
    load()
  }

  const all = rows || []
  const sum = (st) => all.filter((r) => st.includes(r.escrow_status)).reduce((s, r) => s + Number(r.amount), 0)
  const count = (st) => all.filter((r) => st.includes(r.escrow_status)).length
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return all
      .filter((r) => (filter === 'all' ? r.escrow_status !== 'pending' : r.escrow_status === filter))
      .filter((r) => !t || [r.listing_title, r.buyer_name, r.buyer_email, r.seller_name, r.seller_email, txnId(r.id), r.id]
        .some((v) => String(v || '').toLowerCase().includes(t)))
  }, [rows, filter, q])

  function exportCsv() {
    const head = ['Transaction ID', 'Item', 'Amount', 'Status', 'Paid with', 'Buyer', 'Buyer email', 'Seller', 'Seller email', 'Paid at', 'Released at', 'Refunded at']
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = shown.map((r) => [txnId(r.id), r.listing_title, r.amount, r.escrow_status, r.paid_with, r.buyer_name, r.buyer_email, r.seller_name, r.seller_email, r.paid_at, r.released_at, r.refunded_at].map(cell).join(','))
    const url = URL.createObjectURL(new Blob([[head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `authentitrade-payments-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); URL.revokeObjectURL(url)
  }

  if (rows === null) return <p className="text-sm text-[#6B6B62]">Loading…</p>

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total paid" value={money(sum(['held', 'released', 'disputed', 'refunded']))} sub={plural(count(['held', 'released', 'disputed', 'refunded']))} />
        <Stat label="Held in escrow" value={money(sum(['held', 'disputed']))} sub={`${count(['held'])} held · ${count(['disputed'])} disputed`} tone="text-amber-800" />
        <Stat label="Paid out to sellers" value={money(sum(['released']))} sub={plural(count(['released']))} tone="text-[#256B4F]" />
        <Stat label="Refunded" value={money(sum(['refunded']))} sub={plural(count(['refunded']))} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === k ? 'bg-[#17352B] text-white' : 'bg-white text-[#3D4A44] hover:bg-[#E9E2D6]'}`}>
            {l}{k === 'disputed' && count(['disputed']) > 0 && <span className="ml-1 rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-red-700">{count(['disputed'])}</span>}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2">
          <Search size={15} className="text-[#8A8A80]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, buyer, seller, email or transaction ID" className="w-full bg-transparent text-sm focus:outline-none" />
        </label>
        <button onClick={exportCsv} disabled={!shown.length} className={ghost + ' flex items-center gap-1.5'}><Download size={14} />CSV</button>
      </div>

      {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      {shown.length === 0 ? (
        <p className="mt-5 text-sm text-[#6B6B62]">{all.length === 0 ? 'No payments yet. They appear here as soon as a buyer pays.' : 'No payments match this filter.'}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((p) => <PaymentRow key={p.id} p={p} busy={busyId === p.id} onResolve={resolve} />)}
        </ul>
      )}
    </div>
  )
}
