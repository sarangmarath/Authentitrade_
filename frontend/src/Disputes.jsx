import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'
const REASONS = ['Item not as described', 'Suspected fraud or stolen item', 'Seller asked to pay outside AuthentiTrade', 'Abusive behaviour', 'Other']

/* Report a problem from inside a chat */
export function NewDispute({ conversationId, me, onClose }) {
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (details.trim().length < 10) return setErr('Please describe what happened (at least 10 characters).')
    setBusy(true); setErr('')
    const { error } = await supabase.from('disputes').insert({
      conversation_id: conversationId, reporter_id: me, reason, details: details.trim(),
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#F3EEE8] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#17352B]">Report a problem</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6B6B62]" aria-label="Close">×</button>
        </div>
        {done ? (
          <>
            <p className="text-sm text-[#3D4A44]">Thanks. A moderator will review your report.</p>
            <button onClick={onClose} className={btn + ' mt-4'}>Close</button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <select className={inp} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <textarea className={inp} rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened? Include dates, amounts and anything the seller said." />
            {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
            <div className="flex gap-2">
              <button disabled={busy} className={btn}>{busy ? 'Sending…' : 'Submit report'}</button>
              <button type="button" onClick={onClose} className={ghost}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* Disputes list. admin = moderator view (all disputes, can resolve); otherwise only my own */
export function DisputeList({ me, admin }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    let q = supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(50)
    if (!admin) q = q.eq('reporter_id', me)
    const { data, error } = await q
    if (error) { setErr(error.message); return setRows([]) }
    setRows(data || [])
  }
  useEffect(() => { load() }, [admin, me])

  async function close(d, status) {
    const note = window.prompt(status === 'resolved' ? 'Resolution note:' : 'Why is this dismissed?')
    if (!note || note.trim().length < 3) return
    const { error } = await supabase.from('disputes').update({ status, resolution: note.trim() }).eq('id', d.id)
    if (error) return setErr(error.message)
    load()
  }

  if (rows === null) return <p className="text-sm text-[#6B6B62]">Loading…</p>
  return (
    <div>
      {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      {rows.length === 0 ? <p className="text-sm text-[#6B6B62]">No disputes.</p> : (
        <ul className="space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="rounded-xl border border-[#E4DED4] bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{d.reason}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${d.status === 'open' ? 'bg-amber-50 text-amber-800' : 'bg-[#E4EFE8] text-[#3D5A4D]'}`}>{d.status}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-[#3D4A44]">{d.details}</p>
              <p className="mt-2 text-xs text-[#8A8A80]">{new Date(d.created_at).toLocaleString()}</p>
              {d.resolution && <p className="mt-2 rounded-lg bg-[#F3EEE8] px-3 py-2 text-xs text-[#3D4A44]">Moderator note: {d.resolution}</p>}
              {admin && d.status === 'open' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => close(d, 'resolved')} className={btn}>Resolve</button>
                  <button onClick={() => close(d, 'dismissed')} className={ghost}>Dismiss</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}