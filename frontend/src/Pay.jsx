/* 

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, CreditCard, QrCode, Lock, ShieldCheck, Delete, Loader2 } from 'lucide-react'
import { supabase } from './supabaseClient'

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'
const money = (n) => '₹' + Number(n).toLocaleString('en-IN')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const txnId = (id) => 'AT' + String(id).replace(/-/g, '').slice(0, 10).toUpperCase()
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
const groupExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d }
const brandOf = (n) => { const d = n.replace(/\s/g, ''); return /^4/.test(d) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^(60|65|81|82|508)/.test(d) ? 'RuPay' : /^3[47]/.test(d) ? 'Amex' : '' }
const when = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '')

/* Price limits live in the app_settings table. The server enforces them; this only shapes the page. 
const DEFAULT_LIMITS = { lo: 10000, hi: 200000 }
let limitsCache = null
export function useTier(price) {
  const [lim, setLim] = useState(limitsCache || DEFAULT_LIMITS)
  useEffect(() => {
    if (limitsCache) return
    supabase.from('app_settings').select('key,value').then(({ data }) => {
      if (!data) return
      const m = Object.fromEntries(data.map((r) => [r.key, Number(r.value)]))
      limitsCache = { lo: m.online_only_below ?? DEFAULT_LIMITS.lo, hi: m.contact_only_above ?? DEFAULT_LIMITS.hi }
      setLim(limitsCache)
    })
  }, [])
  return price > lim.hi ? 'contact' : price < lim.lo ? 'online' : 'both'
}

const TestBanner = () => (
  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
    Test mode: no real money moves, and card details are never saved.
  </p>
)

function cardError({ num, exp, cvv }) {
  if (!/^\d{13,19}$/.test(num.replace(/\s/g, ''))) return 'Enter a valid-looking card number (13 to 19 digits).'
  const m = exp.match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m || +m[1] < 1 || +m[1] > 12) return 'Enter the expiry as MM/YY.'
  if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) return 'This card has expired.'
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter the 3 or 4 digit CVV.'
  return ''
}

/* Buy box shown on the detail page. Which buttons appear depends on the price tier. 
export function PayBox({ item, session, isSample, onLogin, tier, onOrders }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')

  function start() {
    if (!session) return onLogin()
    if (isSample) return setMsg('This is a sample listing, so there is nothing to buy. Post a real listing to try payments.')
    if (item.seller_id === session.user.id) return setMsg('This is your own listing.')
    setMsg(''); setOpen(true)
  }

  if (tier === 'contact') {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Contact the seller to buy</p>
        <p className="mt-1 text-xs">Items at this price are not paid for online, so escrow does not cover this deal. Stay safe:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Inspect the item in person first.</li>
          <li>Check that the papers (for a vehicle, the RC) are in the seller's name.</li>
          <li>Pay by bank transfer to the owner named on the papers.</li>
          <li>Never pay a deposit before you have seen the item.</li>
        </ul>
      </div>
    )
  }

  return (
    <>
      <button onClick={start} className="mt-5 w-full rounded-xl bg-[#256B4F] py-3 text-sm font-semibold text-white transition hover:bg-[#1E5A42]">
        Pay online with escrow (test mode)
      </button>
      {tier === 'both' && (
        <p className="mt-2 text-xs text-[#6B6B62]">Or chat with the seller to arrange a direct deal. Direct deals are not covered by escrow.</p>
      )}
      {msg && <p className="mt-3 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">{msg}</p>}
      {open && <PayModal item={item} onClose={() => setOpen(false)} onOrders={onOrders} />}
    </>
  )
}

function useCountdown(iso) {
  const [s, setS] = useState(null)
  useEffect(() => {
    if (!iso) return
    const tick = () => setS(Math.max(0, Math.round((new Date(iso) - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [iso])
  return s
}

function Processing({ lines }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="py-12 text-center">
      <Loader2 className="mx-auto animate-spin text-[#256B4F]" size={44} strokeWidth={1.5} />
      <p className="mt-5 text-sm font-semibold text-[#17352B]">{lines[i]}</p>
      <p className="mt-1 text-xs text-[#8A8A80]">Please do not close this window.</p>
    </div>
  )
}

const Tick = ({ size = 64 }) => (
  <div className="fade-up mx-auto grid place-items-center rounded-full bg-[#256B4F] text-white" style={{ width: size, height: size }}>
    <Check size={size * 0.5} strokeWidth={2.5} />
  </div>
)

function Receipt({ rows }) {
  return (
    <dl className="mt-5 divide-y divide-[#EFEAE0] rounded-xl border border-[#E4DED4] bg-white text-left text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
          <dt className="text-[#6B6B62]">{k}</dt>
          <dd className="text-right font-medium text-[#17352B]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function PayModal({ item, onClose, onOrders }) {
  const [tab, setTab] = useState('card') // card | qr
  const [step, setStep] = useState('method') // method | otp | processing | done
  const [order, setOrder] = useState(null)
  const [qr, setQr] = useState('')
  const [card, setCard] = useState({ name: '', num: '', exp: '', cvv: '' })
  const [otp, setOtp] = useState('')
  const [paid, setPaid] = useState(null) // { method, last4, at }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const left = useCountdown(tab === 'qr' && step === 'method' ? order?.qr_expires_at : null)
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname)
  const brand = brandOf(card.num)

  async function createOrder(method) {
    const { data, error } = await supabase.rpc('create_order', { p_listing_id: item.id, p_method: method })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }

  function submitCard(e) {
    e.preventDefault()
    const bad = cardError(card)
    if (bad) return setErr(bad)
    setErr(''); setOtp(''); setStep('otp')
  }

  async function submitOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setErr('Enter the 6-digit OTP.')
    setErr(''); setStep('processing')
    try {
      const [o] = await Promise.all([createOrder('card'), sleep(900)])
      const { error } = await supabase.rpc('pay_order', { p_order_id: o.id, p_method: 'card' })
      if (error) throw error
      await sleep(1500)
      const { data } = await supabase.from('transactions').select('release_at,paid_at').eq('id', o.id).single()
      setPaid({ method: `${brand || 'Card'} ending ${card.num.replace(/\s/g, '').slice(-4)}`, at: data?.paid_at })
      setOrder({ ...o, release_at: data?.release_at })
      setCard({ name: '', num: '', exp: '', cvv: '' }) // never kept
      setStep('done')
    } catch (x) { setErr(x.message); setStep('method') }
  }

  async function startQr() {
    setBusy(true); setErr(''); setQr('')
    try {
      const o = await createOrder('qr')
      setQr(await QRCode.toDataURL(`${window.location.origin}/?pay=${o.id}&t=${o.qr_token}`, { width: 240, margin: 1 }))
      setOrder(o)
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  useEffect(() => { if (tab === 'qr' && step === 'method' && !order && !busy && !err) startQr() }, [tab])

  // Laptop side of the QR flow: wait until the phone has paid
  useEffect(() => {
    if (tab !== 'qr' || step !== 'method' || !order) return
    const t = setInterval(async () => {
      const { data } = await supabase.from('transactions').select('escrow_status,release_at,paid_at').eq('id', order.id).single()
      if (data?.escrow_status === 'held') {
        clearInterval(t)
        setOrder((o) => ({ ...o, release_at: data.release_at }))
        setPaid({ method: 'UPI (QR scan)', at: data.paid_at })
        setStep('processing')
        setTimeout(() => setStep('done'), 1500)
      }
    }, 2500)
    return () => clearInterval(t)
  }, [tab, step, order?.id])

  const set = (k) => (e) => setCard({ ...card, [k]: e.target.value })
  const expired = left === 0
  const tabBtn = (id, Icon, label) => (
    <button type="button" onClick={() => { setTab(id); setErr('') }}
      className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${tab === id ? 'border-[#256B4F] text-[#256B4F]' : 'border-transparent text-[#6B6B62] hover:text-[#17352B]'}`}>
      <Icon size={16} strokeWidth={1.75} />{label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4" onClick={step === 'method' ? onClose : undefined}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#F3EEE8] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-2xl bg-[#0B3D2E] px-5 py-4 text-white">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={16} strokeWidth={1.75} />AuthentiTrade Secure Pay</p>
            <p className="mt-0.5 text-[11px] text-white/70">Escrow protected · Test mode, no real money</p>
          </div>
          {step === 'method' && <button onClick={onClose} className="text-2xl leading-none text-white/80" aria-label="Close">×</button>}
        </div>

        <div className="p-5">
          {step !== 'done' && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E4DED4] bg-white px-4 py-3">
              <div className="min-w-0 pr-3"><p className="truncate text-sm font-semibold text-[#17352B]">{item.title}</p><p className="text-xs text-[#8A8A80]">Held until you confirm delivery</p></div>
              <p className="shrink-0 text-lg font-bold text-[#17352B]">{money(item.price)}</p>
            </div>
          )}

          {step === 'method' && (
            <>
              <div className="flex border-b border-[#E4DED4]">{tabBtn('card', CreditCard, 'Card')}{tabBtn('qr', QrCode, 'UPI QR')}</div>

              {tab === 'card' && (
                <form onSubmit={submitCard} className="mt-4 space-y-3">
                  <input className={inp} placeholder="Name on card" value={card.name} onChange={set('name')} autoComplete="off" />
                  <div className="relative">
                    <input className={inp + ' pr-24'} placeholder="Card number" inputMode="numeric" value={card.num} onChange={(e) => setCard({ ...card, num: groupCard(e.target.value) })} autoComplete="off" />
                    {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#E4EFE8] px-2 py-0.5 text-[11px] font-bold text-[#256B4F]">{brand}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inp} placeholder="MM/YY" inputMode="numeric" value={card.exp} onChange={(e) => setCard({ ...card, exp: groupExp(e.target.value) })} autoComplete="off" />
                    <input className={inp} placeholder="CVV" inputMode="numeric" maxLength={4} type="password" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} autoComplete="off" />
                  </div>
                  {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
                  <button className={btn + ' flex w-full items-center justify-center gap-2 py-3'}><Lock size={15} strokeWidth={1.75} />Pay {money(item.price)}</button>
                  <p className="text-center text-[11px] text-[#8A8A80]">Card details are only used on this screen and are never saved.</p>
                </form>
              )}

              {tab === 'qr' && (
                <div className="mt-4 text-center">
                  {busy || (!qr && !err) ? (
                    <div className="grid h-60 place-items-center"><Loader2 className="animate-spin text-[#256B4F]" size={32} /></div>
                  ) : qr ? (
                    <>
                      <div className="relative mx-auto h-60 w-60">
                        <img src={qr} alt="Payment QR code" className={`h-full w-full rounded-xl border border-[#E4DED4] bg-white p-2 ${expired ? 'opacity-20' : ''}`} />
                        {expired && <button onClick={() => { setOrder(null); startQr() }} className={btn + ' absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}>New QR code</button>}
                      </div>
                      <p className="mt-3 text-sm text-[#3D4A44]">Scan with your phone camera and confirm the payment.</p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-xs text-[#8A8A80]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#256B4F]" />Waiting for payment{left != null && !expired && <> · expires in {mmss(left)}</>}
                      </p>
                      {local && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">You are on localhost, which your phone cannot open. Use the deployed site, or run <code>npm run dev -- --host</code> and open the laptop's network address.</p>}
                    </>
                  ) : null}
                  {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
                </div>
              )}
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={submitOtp} className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E4EFE8] text-[#256B4F]"><Lock size={22} strokeWidth={1.5} /></div>
              <p className="mt-3 font-semibold text-[#17352B]">Verify with your bank</p>
              <p className="mt-1 text-sm text-[#6B6B62]">Enter the 6-digit OTP sent to your registered mobile number.</p>
              <input className={inp + ' mt-4 text-center text-xl tracking-[0.5em]'} inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              <p className="mt-2 text-[11px] text-[#8A8A80]">Test mode: any 6 digits work.</p>
              {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
              <div className="mt-4 flex gap-2">
                <button className={btn + ' flex-1 py-3'}>Verify and pay</button>
                <button type="button" onClick={() => { setErr(''); setStep('method') }} className={ghost}>Cancel</button>
              </div>
            </form>
          )}

          {step === 'processing' && <Processing lines={['Contacting your bank…', 'Verifying payment details…', 'Securing funds in escrow…']} />}

          {step === 'done' && (
            <div className="text-center">
              <Tick />
              <p className="mt-4 text-lg font-bold text-[#17352B]">Payment successful</p>
              <p className="mt-1 text-sm text-[#6B6B62]">{money(item.price)} is now held safely in escrow.</p>
              <Receipt rows={[
                ['Item', item.title],
                ['Amount', money(item.price)],
                ['Paid with', paid?.method || '—'],
                ['Transaction ID', txnId(order?.id)],
                ['Date and time', when(paid?.at || Date.now())],
                ['Status', 'Held in escrow'],
                ['Auto-release', when(order?.release_at)],
              ]} />
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => { onClose(); onOrders?.() }} className={btn}>View my orders</button>
                <button onClick={onClose} className={ghost}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* My orders: things I bought and things I sold 
const STATUS = {
  held: ['In escrow', 'bg-amber-50 text-amber-800'],
  released: ['Released to seller', 'bg-[#E4EFE8] text-[#3D5A4D]'],
  disputed: ['Under review', 'bg-red-50 text-red-700'],
  refunded: ['Refunded', 'bg-[#F3EEE8] text-[#6B6B62]'],
}
export function Orders({ me, onClose }) {
  const [rows, setRows] = useState(null)
  const [titles, setTitles] = useState({})
  const [err, setErr] = useState('')

  async function load() {
    await supabase.rpc('release_due')
    const { data, error } = await supabase.from('transactions').select('*')
      .in('escrow_status', Object.keys(STATUS)).order('created_at', { ascending: false }).limit(50)
    if (error) { setErr(error.message); return setRows([]) }
    setRows(data || [])
    const ids = [...new Set((data || []).map((r) => r.listing_id))]
    if (ids.length) {
      const { data: ls } = await supabase.from('listings').select('id,title').in('id', ids)
      setTitles(Object.fromEntries((ls || []).map((l) => [l.id, l.title])))
    }
  }
  useEffect(() => { load() }, [])

  async function act(fn, id, ask) {
    if (!window.confirm(ask)) return
    setErr('')
    const { error } = await supabase.rpc(fn, { p_order_id: id })
    if (error) return setErr(error.message)
    load()
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#F3EEE8] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#17352B]">My orders</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6B6B62]" aria-label="Close">×</button>
        </div>
        {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
        {rows === null ? <p className="text-sm text-[#6B6B62]">Loading…</p> : rows.length === 0 ? (
          <p className="text-sm text-[#6B6B62]">No orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((o) => {
              const buyer = o.buyer_id === me
              const [label, cls] = STATUS[o.escrow_status] || [o.escrow_status, 'bg-[#F3EEE8]']
              return (
                <li key={o.id} className="rounded-xl border border-[#E4DED4] bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{titles[o.listing_id] || 'Listing'}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>
                  </div>
                  <p className="mt-1 text-[#3D4A44]">{buyer ? 'You bought for' : 'You sold for'} <b>{money(o.amount)}</b> · {when(o.paid_at)}</p>
                  <p className="mt-0.5 text-xs text-[#8A8A80]">Transaction {txnId(o.id)} · {o.method === 'qr' ? 'UPI' : 'Card'}</p>
                  {o.escrow_status === 'held' && (
                    <p className="mt-1 text-xs text-[#8A8A80]">{buyer ? 'Released automatically' : 'You are paid when the buyer confirms, or automatically'} on {when(o.release_at)}.</p>
                  )}
                  {o.escrow_status === 'disputed' && <p className="mt-1 text-xs text-[#8A8A80]">A moderator is reviewing this order. The payment stays held until they decide.</p>}
                  {buyer && o.escrow_status === 'held' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => act('release_order', o.id, 'Release the payment to the seller? Only do this once you have received the item.')} className={btn}>I received it, release</button>
                      <button onClick={() => act('dispute_order', o.id, 'Report a problem? The payment will stay held until a moderator decides.')} className={ghost}>Report a problem</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* Phone side of the QR flow. Opened from the QR code, no login needed. Looks like a UPI payment screen. */
/*export function PhonePay({ orderId, token }) {
  const [info, setInfo] = useState(undefined) // undefined = loading, null = invalid
  const [step, setStep] = useState('review') // review | pin | processing | done
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.rpc('order_preview', { p_order_id: orderId, p_token: token }).then(({ data }) => setInfo(data || null))
  }, [orderId, token])

  async function pay() {
    setStep('processing'); setErr('')
    const [{ error }] = await Promise.all([supabase.rpc('pay_order_by_token', { p_order_id: orderId, p_token: token }), sleep(2200)])
    if (error) { setErr(error.message); return setStep('review') }
    setStep('done')
  }
  const press = (d) => {
    const next = d === 'del' ? pin.slice(0, -1) : (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4 && d !== 'del') setTimeout(pay, 250)
  }

  const done = step === 'done' || info?.status === 'held'
  return (
    <div className="mx-auto min-h-screen max-w-sm bg-[#F3EEE8] font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <div className="bg-[#0B3D2E] px-5 pb-6 pt-5 text-white">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={16} strokeWidth={1.75} />AuthentiTrade Pay</p>
        <p className="mt-0.5 text-[11px] text-white/70">Test mode · no real money moves</p>
      </div>
      <div className="-mt-3 rounded-t-2xl bg-[#F3EEE8] px-5 pt-6">
        {info === undefined ? <p className="py-10 text-center text-sm text-[#6B6B62]">Loading…</p>
          : info === null ? <p className="py-10 text-center text-sm text-red-700">This payment link has expired or is not valid. Create a new QR code on your laptop.</p>
          : done ? (
            <div className="py-6 text-center">
              <Tick size={72} />
              <p className="mt-4 text-lg font-bold">Payment successful</p>
              <p className="mt-1 text-3xl font-bold text-[#256B4F]">{money(info.amount)}</p>
              <Receipt rows={[['To', 'AuthentiTrade Escrow'], ['For', info.title], ['Transaction ID', txnId(orderId)], ['Date and time', when(Date.now())], ['Status', 'Held in escrow']]} />
              <p className="mt-5 text-sm text-[#6B6B62]">You can go back to your laptop now.</p>
            </div>
          ) : step === 'processing' ? <Processing lines={['Connecting to your bank…', 'Authorising payment…', 'Almost done…']} />
          : step === 'pin' ? (
            <div className="text-center">
              <p className="font-semibold">Enter your UPI PIN</p>
              <p className="mt-1 text-xs text-[#8A8A80]">Paying {money(info.amount)} · Test mode: any 4 digits work</p>
              <div className="my-6 flex justify-center gap-4">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-[#256B4F] ${pin.length > i ? 'bg-[#256B4F]' : ''}`} />)}</div>
              <div className="mx-auto grid max-w-[16rem] grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
                  <button key={k} onClick={() => press(k)} className="grid h-14 place-items-center rounded-xl border border-[#E4DED4] bg-white text-xl font-semibold active:bg-[#E4EFE8]">
                    {k === 'del' ? <Delete size={20} strokeWidth={1.75} /> : k}
                  </button>
                ))}
              </div>
              <button onClick={() => { setPin(''); setStep('review') }} className="mt-5 text-sm font-semibold text-[#6B6B62]">Cancel</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[#6B6B62]">You are paying</p>
              <p className="mt-1 text-4xl font-bold">{money(info.amount)}</p>
              <Receipt rows={[['To', 'AuthentiTrade Escrow'], ['For', info.title], ['Protection', 'Held until you confirm delivery']]} />
              {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
              <button onClick={() => { setPin(''); setStep('pin') }} className={btn + ' mt-5 w-full py-3.5 text-base'}>Proceed to pay</button>
              <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[#8A8A80]"><Lock size={11} />Secured by AuthentiTrade escrow</p>
            </div>
          )}
      </div>
    </div>
  )
}
*/
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, CreditCard, QrCode, Lock, ShieldCheck, Delete, Loader2 } from 'lucide-react'
import { supabase } from './supabaseClient'

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'
const money = (n) => '₹' + Number(n).toLocaleString('en-IN')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const txnId = (id) => 'AT' + String(id).replace(/-/g, '').slice(0, 10).toUpperCase()
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
const groupExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d }
const brandOf = (n) => { const d = n.replace(/\s/g, ''); return /^4/.test(d) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^(60|65|81|82|508)/.test(d) ? 'RuPay' : /^3[47]/.test(d) ? 'Amex' : '' }
const when = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '')

/* Price limits live in the app_settings table. The server enforces them; this only shapes the page. */
const DEFAULT_LIMITS = { lo: 10000, hi: 200000 }
let limitsCache = null
export function useTier(price) {
  const [lim, setLim] = useState(limitsCache || DEFAULT_LIMITS)
  useEffect(() => {
    if (limitsCache) return
    supabase.from('app_settings').select('key,value').then(({ data }) => {
      if (!data) return
      const m = Object.fromEntries(data.map((r) => [r.key, Number(r.value)]))
      limitsCache = { lo: m.online_only_below ?? DEFAULT_LIMITS.lo, hi: m.contact_only_above ?? DEFAULT_LIMITS.hi }
      setLim(limitsCache)
    })
  }, [])
  return price > lim.hi ? 'contact' : price < lim.lo ? 'online' : 'both'
}

const TestBanner = () => (
  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
    Test mode: no real money moves, and card details are never saved.
  </p>
)

function cardError({ num, exp, cvv }) {
  if (!/^\d{13,19}$/.test(num.replace(/\s/g, ''))) return 'Enter a valid-looking card number (13 to 19 digits).'
  const m = exp.match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m || +m[1] < 1 || +m[1] > 12) return 'Enter the expiry as MM/YY.'
  if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) return 'This card has expired.'
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter the 3 or 4 digit CVV.'
  return ''
}

/* Buy box shown on the detail page. Which buttons appear depends on the price tier. */
export function PayBox({ item, session, isSample, onLogin, tier, onCheckout }) {
  const [msg, setMsg] = useState('')

  function start() {
    if (!session) return onLogin()
    if (isSample) return setMsg('This is a sample listing, so there is nothing to buy. Post a real listing to try payments.')
    if (item.seller_id === session.user.id) return setMsg('This is your own listing.')
    setMsg(''); onCheckout(item)
  }

  if (tier === 'contact') {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Contact the seller to buy</p>
        <p className="mt-1 text-xs">Items at this price are not paid for online, so escrow does not cover this deal. Stay safe:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Inspect the item in person first.</li>
          <li>Check that the papers (for a vehicle, the RC) are in the seller's name.</li>
          <li>Pay by bank transfer to the owner named on the papers.</li>
          <li>Never pay a deposit before you have seen the item.</li>
        </ul>
      </div>
    )
  }

  return (
    <>
      <button onClick={start} className="mt-5 w-full rounded-xl bg-[#256B4F] py-3 text-sm font-semibold text-white transition hover:bg-[#1E5A42]">
        Pay online with escrow 
      </button>
      {tier === 'both' && (
        <p className="mt-2 text-xs text-[#6B6B62]">Or chat with the seller to arrange a direct deal. Direct deals are not covered by escrow.</p>
      )}
      {msg && <p className="mt-3 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">{msg}</p>}
    </>
  )
}

function useCountdown(iso) {
  const [s, setS] = useState(null)
  useEffect(() => {
    if (!iso) return
    const tick = () => setS(Math.max(0, Math.round((new Date(iso) - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [iso])
  return s
}

function Processing({ lines }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="py-12 text-center">
      <Loader2 className="mx-auto animate-spin text-[#256B4F]" size={44} strokeWidth={1.5} />
      <p className="mt-5 text-sm font-semibold text-[#17352B]">{lines[i]}</p>
      <p className="mt-1 text-xs text-[#8A8A80]">Please do not close this window.</p>
    </div>
  )
}

const Tick = ({ size = 64 }) => (
  <div className="fade-up mx-auto grid place-items-center rounded-full bg-[#256B4F] text-white" style={{ width: size, height: size }}>
    <Check size={size * 0.5} strokeWidth={2.5} />
  </div>
)

function Receipt({ rows }) {
  return (
    <dl className="mt-5 divide-y divide-[#EFEAE0] rounded-xl border border-[#E4DED4] bg-white text-left text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
          <dt className="text-[#6B6B62]">{k}</dt>
          <dd className="text-right font-medium text-[#17352B]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PayFlow({ item, onClose, onOrders, compact }) {
  const [tab, setTab] = useState('card') // card | qr
  const [step, setStep] = useState('method') // method | otp | processing | done
  const [order, setOrder] = useState(null)
  const [qr, setQr] = useState('')
  const [card, setCard] = useState({ name: '', num: '', exp: '', cvv: '' })
  const [otp, setOtp] = useState('')
  const [paid, setPaid] = useState(null) // { method, last4, at }
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const left = useCountdown(tab === 'qr' && step === 'method' ? order?.qr_expires_at : null)
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname)
  const brand = brandOf(card.num)

  async function createOrder(method) {
    const { data, error } = await supabase.rpc('create_order', { p_listing_id: item.id, p_method: method })
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }

  function submitCard(e) {
    e.preventDefault()
    const bad = cardError(card)
    if (bad) return setErr(bad)
    setErr(''); setOtp(''); setStep('otp')
  }

  async function submitOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setErr('Enter the 6-digit OTP.')
    setErr(''); setStep('processing')
    try {
      const [o] = await Promise.all([createOrder('card'), sleep(900)])
      const label = `${brand || 'Card'} •••• ${card.num.replace(/\s/g, '').slice(-4)}` // only a label, never the card number
      const { error } = await supabase.rpc('pay_order', { p_order_id: o.id, p_method: 'card', p_paid_with: label })
      if (error) throw error
      await sleep(1500)
      const { data } = await supabase.from('transactions').select('release_at,paid_at').eq('id', o.id).single()
      setPaid({ method: `${brand || 'Card'} ending ${card.num.replace(/\s/g, '').slice(-4)}`, at: data?.paid_at })
      setOrder({ ...o, release_at: data?.release_at })
      setCard({ name: '', num: '', exp: '', cvv: '' }) // never kept
      setStep('done')
    } catch (x) { setErr(x.message); setStep('method') }
  }

  async function startQr() {
    setBusy(true); setErr(''); setQr('')
    try {
      const o = await createOrder('qr')
      setQr(await QRCode.toDataURL(`${window.location.origin}/?pay=${o.id}&t=${o.qr_token}`, { width: 240, margin: 1 }))
      setOrder(o)
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  useEffect(() => { if (tab === 'qr' && step === 'method' && !order && !busy && !err) startQr() }, [tab])

  // Laptop side of the QR flow: wait until the phone has paid
  useEffect(() => {
    if (tab !== 'qr' || step !== 'method' || !order) return
    const t = setInterval(async () => {
      const { data } = await supabase.from('transactions').select('escrow_status,release_at,paid_at').eq('id', order.id).single()
      if (data?.escrow_status === 'held') {
        clearInterval(t)
        setOrder((o) => ({ ...o, release_at: data.release_at }))
        setPaid({ method: 'UPI (QR scan)', at: data.paid_at })
        setStep('processing')
        setTimeout(() => setStep('done'), 1500)
      }
    }, 2500)
    return () => clearInterval(t)
  }, [tab, step, order?.id])

  const set = (k) => (e) => setCard({ ...card, [k]: e.target.value })
  const expired = left === 0
  const tabBtn = (id, Icon, label) => (
    <button type="button" onClick={() => { setTab(id); setErr('') }}
      className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${tab === id ? 'border-[#256B4F] text-[#256B4F]' : 'border-transparent text-[#6B6B62] hover:text-[#17352B]'}`}>
      <Icon size={16} strokeWidth={1.75} />{label}
    </button>
  )

  return (
      <div className="overflow-hidden rounded-2xl border border-[#E4DED4] bg-[#F3EEE8]">
        <div className="flex items-center justify-between rounded-t-2xl bg-[#0B3D2E] px-5 py-4 text-white">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={16} strokeWidth={1.75} />AuthentiTrade Secure Pay</p>
            <p className="mt-0.5 text-[11px] text-white/70">Escrow protected · Test mode, no real money</p>
          </div>
          {step === 'method' && <button onClick={onClose} className="text-2xl leading-none text-white/80" aria-label="Close">×</button>}
        </div>

        <div className="p-5">
          {!compact && step !== 'done' && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E4DED4] bg-white px-4 py-3">
              <div className="min-w-0 pr-3"><p className="truncate text-sm font-semibold text-[#17352B]">{item.title}</p><p className="text-xs text-[#8A8A80]">Held until you confirm delivery</p></div>
              <p className="shrink-0 text-lg font-bold text-[#17352B]">{money(item.price)}</p>
            </div>
          )}

          {step === 'method' && (
            <>
              <div className="flex border-b border-[#E4DED4]">{tabBtn('card', CreditCard, 'Card')}{tabBtn('qr', QrCode, 'UPI QR')}</div>

              {tab === 'card' && (
                <form onSubmit={submitCard} className="mt-4 space-y-3">
                  <input className={inp} placeholder="Name on card" value={card.name} onChange={set('name')} autoComplete="off" />
                  <div className="relative">
                    <input className={inp + ' pr-24'} placeholder="Card number" inputMode="numeric" value={card.num} onChange={(e) => setCard({ ...card, num: groupCard(e.target.value) })} autoComplete="off" />
                    {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#E4EFE8] px-2 py-0.5 text-[11px] font-bold text-[#256B4F]">{brand}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inp} placeholder="MM/YY" inputMode="numeric" value={card.exp} onChange={(e) => setCard({ ...card, exp: groupExp(e.target.value) })} autoComplete="off" />
                    <input className={inp} placeholder="CVV" inputMode="numeric" maxLength={4} type="password" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} autoComplete="off" />
                  </div>
                  {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
                  <button className={btn + ' flex w-full items-center justify-center gap-2 py-3'}><Lock size={15} strokeWidth={1.75} />Pay {money(item.price)}</button>
                  <p className="text-center text-[11px] text-[#8A8A80]">Card details are only used on this screen and are never saved.</p>
                </form>
              )}

              {tab === 'qr' && (
                <div className="mt-4 text-center">
                  {busy || (!qr && !err) ? (
                    <div className="grid h-60 place-items-center"><Loader2 className="animate-spin text-[#256B4F]" size={32} /></div>
                  ) : qr ? (
                    <>
                      <div className="relative mx-auto h-60 w-60">
                        <img src={qr} alt="Payment QR code" className={`h-full w-full rounded-xl border border-[#E4DED4] bg-white p-2 ${expired ? 'opacity-20' : ''}`} />
                        {expired && <button onClick={() => { setOrder(null); startQr() }} className={btn + ' absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}>New QR code</button>}
                      </div>
                      <p className="mt-3 text-sm text-[#3D4A44]">Scan with your phone camera and confirm the payment.</p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-xs text-[#8A8A80]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#256B4F]" />Waiting for payment{left != null && !expired && <> · expires in {mmss(left)}</>}
                      </p>
                      {local && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">You are on localhost, which your phone cannot open. Use the deployed site, or run <code>npm run dev -- --host</code> and open the laptop's network address.</p>}
                    </>
                  ) : null}
                  {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
                </div>
              )}
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={submitOtp} className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#E4EFE8] text-[#256B4F]"><Lock size={22} strokeWidth={1.5} /></div>
              <p className="mt-3 font-semibold text-[#17352B]">Verify with your bank</p>
              <p className="mt-1 text-sm text-[#6B6B62]">Enter the 6-digit OTP sent to your registered mobile number.</p>
              <input className={inp + ' mt-4 text-center text-xl tracking-[0.5em]'} inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              <p className="mt-2 text-[11px] text-[#8A8A80]">Test mode: any 6 digits work.</p>
              {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
              <div className="mt-4 flex gap-2">
                <button className={btn + ' flex-1 py-3'}>Verify and pay</button>
                <button type="button" onClick={() => { setErr(''); setStep('method') }} className={ghost}>Cancel</button>
              </div>
            </form>
          )}

          {step === 'processing' && <Processing lines={['Contacting your bank…', 'Verifying payment details…', 'Securing funds in escrow…']} />}

          {step === 'done' && (
            <div className="text-center">
              <Tick />
              <p className="mt-4 text-lg font-bold text-[#17352B]">Payment successful</p>
              <p className="mt-1 text-sm text-[#6B6B62]">{money(item.price)} is now held safely in escrow.</p>
              <Receipt rows={[
                ['Item', item.title],
                ['Amount', money(item.price)],
                ['Paid with', paid?.method || '—'],
                ['Transaction ID', txnId(order?.id)],
                ['Date and time', when(paid?.at || Date.now())],
                ['Status', 'Held in escrow'],
                ['Auto-release', when(order?.release_at)],
              ]} />
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => { onClose(); onOrders?.() }} className={btn}>View my orders</button>
                <button onClick={onClose} className={ghost}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}

/* My orders (Purchases and Sales) now lives in Orders.jsx */
export { Orders } from './Orders'

/* Phone side of the QR flow. Opened from the QR code, no login needed. Looks like a UPI payment screen. */
export function PhonePay({ orderId, token }) {
  const [info, setInfo] = useState(undefined) // undefined = loading, null = invalid
  const [step, setStep] = useState('review') // review | pin | processing | done
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.rpc('order_preview', { p_order_id: orderId, p_token: token }).then(({ data }) => setInfo(data || null))
  }, [orderId, token])

  async function pay() {
    setStep('processing'); setErr('')
    const [{ error }] = await Promise.all([supabase.rpc('pay_order_by_token', { p_order_id: orderId, p_token: token }), sleep(2200)])
    if (error) { setErr(error.message); return setStep('review') }
    setStep('done')
  }
  const press = (d) => {
    const next = d === 'del' ? pin.slice(0, -1) : (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4 && d !== 'del') setTimeout(pay, 250)
  }

  const done = step === 'done' || info?.status === 'held'
  return (
    <div className="mx-auto min-h-screen max-w-sm bg-[#F3EEE8] font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <div className="bg-[#0B3D2E] px-5 pb-6 pt-5 text-white">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={16} strokeWidth={1.75} />AuthentiTrade Pay</p>
        <p className="mt-0.5 text-[11px] text-white/70">Test mode · no real money moves</p>
      </div>
      <div className="-mt-3 rounded-t-2xl bg-[#F3EEE8] px-5 pt-6">
        {info === undefined ? <p className="py-10 text-center text-sm text-[#6B6B62]">Loading…</p>
          : info === null ? <p className="py-10 text-center text-sm text-red-700">This payment link has expired or is not valid. Create a new QR code on your laptop.</p>
          : done ? (
            <div className="py-6 text-center">
              <Tick size={72} />
              <p className="mt-4 text-lg font-bold">Payment successful</p>
              <p className="mt-1 text-3xl font-bold text-[#256B4F]">{money(info.amount)}</p>
              <Receipt rows={[['To', 'AuthentiTrade Escrow'], ['For', info.title], ['Transaction ID', txnId(orderId)], ['Date and time', when(Date.now())], ['Status', 'Held in escrow']]} />
              <p className="mt-5 text-sm text-[#6B6B62]">You can go back to your laptop now.</p>
            </div>
          ) : step === 'processing' ? <Processing lines={['Connecting to your bank…', 'Authorising payment…', 'Almost done…']} />
          : step === 'pin' ? (
            <div className="text-center">
              <p className="font-semibold">Enter your UPI PIN</p>
              <p className="mt-1 text-xs text-[#8A8A80]">Paying {money(info.amount)} · Test mode: any 4 digits work</p>
              <div className="my-6 flex justify-center gap-4">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-[#256B4F] ${pin.length > i ? 'bg-[#256B4F]' : ''}`} />)}</div>
              <div className="mx-auto grid max-w-[16rem] grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
                  <button key={k} onClick={() => press(k)} className="grid h-14 place-items-center rounded-xl border border-[#E4DED4] bg-white text-xl font-semibold active:bg-[#E4EFE8]">
                    {k === 'del' ? <Delete size={20} strokeWidth={1.75} /> : k}
                  </button>
                ))}
              </div>
              <button onClick={() => { setPin(''); setStep('review') }} className="mt-5 text-sm font-semibold text-[#6B6B62]">Cancel</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[#6B6B62]">You are paying</p>
              <p className="mt-1 text-4xl font-bold">{money(info.amount)}</p>
              <Receipt rows={[['To', 'AuthentiTrade Escrow'], ['For', info.title], ['Protection', 'Held until you confirm delivery']]} />
              {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
              <button onClick={() => { setPin(''); setStep('pin') }} className={btn + ' mt-5 w-full py-3.5 text-base'}>Proceed to pay</button>
              <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[#8A8A80]"><Lock size={11} />Secured by AuthentiTrade escrow</p>
            </div>
          )}
      </div>
    </div>
  )
}