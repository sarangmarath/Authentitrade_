/*import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SignedFile from './SignedFile'
import { DisputeList } from './Disputes'

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'

const PROOF_LABEL = {
  rc: 'Registration certificate (RC)', id: 'Government photo ID', insurance: 'Insurance copy',
  service: 'Service history', invoice: 'Purchase invoice', auth: 'Authenticity / grading certificate', provenance: 'Provenance document',
}
// stored as `${userId}/${uuid}-${key}-${filename}`
const proofKey = (p) => ((p.split('/')[1] || '').slice(37).split('-')[0])

const CHECKLIST = {
  vehicle: [
    { key: 'id_checked', text: 'Name on the ID matches the owner name on the RC' },
    { key: 'vin_matched', text: 'VIN / chassis number on the RC matches the listing' },
    { key: 'photos_reviewed', text: 'Photos show the same vehicle described in the documents' },
  ],
  luxury: [
    { key: 'id_checked', text: 'Name on the ID matches the name on the invoice' },
    { key: 'docs_checked', text: 'Brand, model and serial on the invoice match the listing' },
    { key: 'photos_reviewed', text: 'Photos look genuine and match the listing' },
  ],
  collectible: [
    { key: 'id_checked', text: 'Name on the ID matches the name on the receipt or statement' },
    { key: 'docs_checked', text: 'The document describes the same item as the listing' },
    { key: 'photos_reviewed', text: 'Photos look genuine and match the listing' },
  ],
}

function riskStyle(raw) {
  const score = raw ?? 0
  if (score >= 40) return ['High risk', 'bg-red-50 text-red-700']
  if (score >= 20) return ['Medium risk', 'bg-amber-50 text-amber-800']
  return ['Low risk', 'bg-[#E4EFE8] text-[#3D5A4D]']
}

function ReviewCard({ l, seller, me, onDone }) {
  const items = CHECKLIST[l.category] || CHECKLIST.vehicle
  const [checks, setChecks] = useState(items.map(() => false))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rl, rc] = riskStyle(l.risk_score)
  const allOk = checks.every(Boolean)

  async function approve() {
    setBusy(true); setErr('')
    try {
      const { error } = await supabase.from('listings').update({
        verification_status: 'verified', reject_reason: null, reviewed_by: me, reviewed_at: new Date().toISOString(),
        //review_checklist: Object.fromEntries(items.map((t, i) => [t, checks[i]])),
        review_checks: { docs_checked: true, ...Object.fromEntries(items.map((it, i) => [it.key, checks[i]])) },

      }).eq('id', l.id)
      if (error) throw error
      const { error: e2 } = await supabase.from('profiles').update({ kyc_status: 'verified' }).eq('id', l.seller_id)
      if (e2) throw e2
      onDone()
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  async function reject() {
    if (reason.trim().length < 5) return setErr('Write the reason for rejecting. The seller will see it.')
    setBusy(true); setErr('')
    const { error } = await supabase.from('listings').update({
      verification_status: 'rejected', reject_reason: reason.trim(), reviewed_by: me, reviewed_at: new Date().toISOString(),
    }).eq('id', l.id)
    setBusy(false)
    if (error) return setErr(error.message)
    onDone()
  }

  return (
    <li className="rounded-2xl border border-[#E4DED4] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{l.title}</h3>
          <p className="text-sm text-[#256B4F] font-semibold">{money(l.price)} · {l.category}{l.location ? ` · ${l.location}` : ''}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${rc}`}>{rl} ({l.risk_score})</span>
      </div>

      {l.risk_flags?.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 rounded-lg bg-red-50 px-6 py-2 text-xs text-red-700">
          {l.risk_flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-[#8A8A80]">Seller</p>
          <p>{seller?.full_name || 'Unknown'} · ID status: <b>{seller?.kyc_status || 'not checked'}</b></p>
          <p className="mb-1 mt-3 text-xs font-semibold uppercase text-[#8A8A80]">Listing details</p>
          <dl className="divide-y divide-[#EFEAE0]">
            {l.vin && <div className="flex justify-between gap-3 py-1"><dt className="text-[#6B6B62]">VIN</dt><dd className="font-mono text-xs">{l.vin}</dd></div>}
            {Object.entries(l.details || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1"><dt className="text-[#6B6B62]">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {l.description && <p className="mt-3 whitespace-pre-line text-xs text-[#3D4A44]">{l.description}</p>}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-[#8A8A80]">Photos</p>
          <div className="flex flex-wrap gap-2">
            {(l.image_urls || []).map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-20 w-24 rounded-lg border border-[#E4DED4] object-cover" /></a>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase text-[#8A8A80]">Private documents</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(l.proof_paths || []).map((p) => <SignedFile key={p} bucket="listing-proofs" path={p} label={PROOF_LABEL[proofKey(p)] || 'Document'} />)}
        {(!l.proof_paths || l.proof_paths.length === 0) && <p className="text-sm text-red-700">No documents were uploaded.</p>}
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-[#F3EEE8] p-3">
        {items.map((t, i) => (
          <label key={t.key} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 accent-[#256B4F]" checked={checks[i]}
              onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))} />
            <span>{t.text}</span>
          </label>
        ))}
      </div>
      <textarea className={inp + ' mt-3'} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejecting (required to reject, shown to the seller)" />
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy || !allOk} onClick={approve} className={btn}>Approve listing</button>
        <button disabled={busy} onClick={reject} className={ghost}>Reject listing</button>
        {!allOk && <span className="self-center text-xs text-[#8A8A80]">Tick every check to approve.</span>}
      </div>
    </li>
  )
}

export default function Admin({ session, onBack }) {
  const me = session.user.id
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState(null)
  const [sellers, setSellers] = useState({})
  const [err, setErr] = useState('')

  async function load() {
    setRows(null); setErr('')
    const q = supabase.from('listings').select('*')
    const { data, error } = tab === 'pending'
      ? await q.eq('verification_status', 'pending').order('created_at', { ascending: true })
      : await q.neq('verification_status', 'pending').order('reviewed_at', { ascending: false }).limit(50)
    if (error) return setErr(error.message)
    setRows(data || [])
    const ids = [...new Set((data || []).map((x) => x.seller_id))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id,full_name,kyc_status').in('id', ids)
      setSellers(Object.fromEntries((ps || []).map((p) => [p.id, p])))
    }
  }
  useEffect(() => { if (tab !== 'disputes') load() }, [tab])

  async function takeDown(l) {
    const reason = window.prompt('Reason for taking this listing down (shown to the seller):')
    if (!reason || reason.trim().length < 5) return
    const { error } = await supabase.from('listings').update({ verification_status: 'rejected', reject_reason: reason.trim(), reviewed_by: me, reviewed_at: new Date().toISOString() }).eq('id', l.id)
    if (error) return setErr(error.message)
    load()
  }

  return (
    <div className="min-h-screen bg-[#F3EEE8] px-4 py-8 font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
        <h1 className="text-2xl font-bold">Moderator review</h1>
        <div className="mt-4 flex gap-2">
          {[['pending', 'Pending'], ['reviewed', 'Reviewed'], ['disputes', 'Disputes']].map(([k, l]) => (
            //<button key={k} onClick={() => setTab(k)}
            <button key={k} onClick={() => { setErr(''); setTab(k) }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-[#17352B] text-white' : 'bg-white text-[#3D4A44] hover:bg-[#E9E2D6]'}`}>{l}</button>
          ))}
        </div>
        {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err} (If this says permission denied, your account is not marked as admin yet.)</p>}

        <div className="mt-5">
          {tab === 'disputes' ? <DisputeList me={me} admin />
          : rows === null ? <p className="text-sm text-[#6B6B62]">{err ? '' : 'Loading…'}</p>
          : rows.length === 0 ? <p className="text-sm text-[#6B6B62]">{tab === 'pending' ? 'Nothing waiting for review.' : 'No reviewed listings yet.'}</p>
          : tab === 'pending' ? (
            <ul className="space-y-4">{rows.map((l) => <ReviewCard key={l.id} l={l} seller={sellers[l.seller_id]} me={me} onDone={load} />)}</ul>
          ) : (
            <ul className="space-y-2">
              {rows.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4DED4] bg-white p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-xs text-[#8A8A80]">{sellers[l.seller_id]?.full_name || 'Seller'} · {l.reviewed_at ? new Date(l.reviewed_at).toLocaleDateString() : ''}{l.reject_reason ? ` · ${l.reject_reason}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${l.verification_status === 'verified' ? 'bg-[#256B4F] text-white' : 'bg-red-50 text-red-700'}`}>{l.verification_status}</span>
                    {l.verification_status === 'verified' && <button onClick={() => takeDown(l)} className="rounded-lg border border-[#E4DED4] px-3 py-1.5 text-xs font-semibold hover:bg-[#F3EEE8]">Take down</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
*/

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SignedFile from './Signedfile'
import { DisputeList } from './Disputes'

const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const btn = 'rounded-xl bg-[#256B4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-50'
const ghost = 'rounded-xl border border-[#E4DED4] px-4 py-2.5 text-sm font-semibold hover:bg-[#F3EEE8] disabled:opacity-50'

const PROOF_LABEL = {
  rc: 'Registration certificate (RC)', id: 'Government photo ID', insurance: 'Insurance copy',
  service: 'Service history', invoice: 'Purchase invoice', auth: 'Authenticity / grading certificate', provenance: 'Provenance document',
}
// stored as `${userId}/${uuid}-${key}-${filename}`
const proofKey = (p) => ((p.split('/')[1] || '').slice(37).split('-')[0])

// Keys must match CHECK_LABELS in Home.jsx. id_checked and docs_checked are required by the database to approve.
const CHECKLIST = {
  vehicle: [
    { key: 'id_checked', text: 'Name on the ID matches the owner name on the RC' },
    { key: 'docs_checked', text: 'The RC is genuine and in the seller\u2019s name' },
    { key: 'vin_matched', text: 'VIN / chassis number on the RC matches the listing' },
    { key: 'photos_reviewed', text: 'Photos show the same vehicle described in the documents' },
  ],
  luxury: [
    { key: 'id_checked', text: 'Name on the ID matches the name on the invoice' },
    { key: 'docs_checked', text: 'Brand, model and serial on the invoice match the listing' },
    { key: 'photos_reviewed', text: 'Photos look genuine and match the listing' },
  ],
  collectible: [
    { key: 'id_checked', text: 'Name on the ID matches the name on the receipt or statement' },
    { key: 'docs_checked', text: 'The document describes the same item as the listing' },
    { key: 'photos_reviewed', text: 'Photos look genuine and match the listing' },
  ],
}

function riskStyle(raw) {
  const score = raw ?? 0
  if (score >= 40) return ['High risk', 'bg-red-50 text-red-700']
  if (score >= 20) return ['Medium risk', 'bg-amber-50 text-amber-800']
  return ['Low risk', 'bg-[#E4EFE8] text-[#3D5A4D]']
}

function ReviewCard({ l, seller, onDone }) {
  const items = CHECKLIST[l.category] || CHECKLIST.vehicle
  const [checks, setChecks] = useState(items.map(() => false))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rl, rc] = riskStyle(l.risk_score)
  const allOk = checks.every(Boolean)

  async function decide(decision) {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('review_listing', {
      p_id: l.id,
      p_decision: decision,
      p_checks: decision === 'verified' ? Object.fromEntries(items.map((it, i) => [it.key, checks[i]])) : {},
      p_reason: decision === 'rejected' ? reason.trim() : null,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    onDone()
  }
  function reject() {
    if (reason.trim().length < 5) return setErr('Write the reason for rejecting. The seller will see it.')
    decide('rejected')
  }

  return (
    <li className="rounded-2xl border border-[#E4DED4] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{l.title}</h3>
          <p className="text-sm font-semibold text-[#256B4F]">{money(l.price)} · {l.category}{l.location ? ` · ${l.location}` : ''}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${rc}`}>{rl} ({l.risk_score ?? 0})</span>
      </div>

      {l.risk_flags?.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 rounded-lg bg-red-50 px-6 py-2 text-xs text-red-700">
          {l.risk_flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="text-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-[#8A8A80]">Seller</p>
          <p>{seller?.full_name || 'Unknown'} · ID status: <b>{seller?.kyc_status || 'not checked'}</b></p>
          <p className="mb-1 mt-3 text-xs font-semibold uppercase text-[#8A8A80]">Listing details</p>
          <dl className="divide-y divide-[#EFEAE0]">
            {l.vin && <div className="flex justify-between gap-3 py-1"><dt className="text-[#6B6B62]">VIN</dt><dd className="font-mono text-xs">{l.vin}</dd></div>}
            {Object.entries(l.details || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1"><dt className="text-[#6B6B62]">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {l.description && <p className="mt-3 whitespace-pre-line text-xs text-[#3D4A44]">{l.description}</p>}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-[#8A8A80]">Photos</p>
          <div className="flex flex-wrap gap-2">
            {(l.image_urls || []).map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-20 w-24 rounded-lg border border-[#E4DED4] object-cover" /></a>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase text-[#8A8A80]">Private documents</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(l.proof_paths || []).map((p) => <SignedFile key={p} bucket="listing-proofs" path={p} label={PROOF_LABEL[proofKey(p)] || 'Document'} />)}
        {(!l.proof_paths || l.proof_paths.length === 0) && <p className="text-sm text-red-700">No documents were uploaded.</p>}
      </div>

      <div className="mt-4 space-y-2 rounded-xl bg-[#F3EEE8] p-3">
        {items.map((t, i) => (
          <label key={t.key} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 accent-[#256B4F]" checked={checks[i]}
              onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))} />
            <span>{t.text}</span>
          </label>
        ))}
      </div>
      <textarea className={inp + ' mt-3'} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejecting (required to reject, shown to the seller)" />
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy || !allOk} onClick={() => decide('verified')} className={btn}>Approve listing</button>
        <button disabled={busy} onClick={reject} className={ghost}>Reject listing</button>
        {!allOk && <span className="self-center text-xs text-[#8A8A80]">Tick every check to approve.</span>}
      </div>
    </li>
  )
}

export default function Admin({ session, onBack }) {
  const me = session.user.id
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState(null)
  const [sellers, setSellers] = useState({})
  const [err, setErr] = useState('')

  async function load() {
    setRows(null); setErr('')
    const { data, error } = await supabase.rpc('admin_listings', { p_status: tab })
    if (error) { setRows([]); return setErr(error.message) }
    setRows(data || [])
    const ids = [...new Set((data || []).map((x) => x.seller_id))]
    if (ids.length) {
      const { data: ps } = await supabase.rpc('admin_seller_info', { p_ids: ids })
      setSellers(Object.fromEntries((ps || []).map((p) => [p.id, p])))
    }
  }
  useEffect(() => { if (tab !== 'disputes') load() }, [tab])

  async function takeDown(l) {
    const reason = window.prompt('Reason for taking this listing down (shown to the seller):')
    if (!reason || reason.trim().length < 5) return
    const { error } = await supabase.rpc('review_listing', { p_id: l.id, p_decision: 'rejected', p_checks: {}, p_reason: reason.trim() })
    if (error) return setErr(error.message)
    load()
  }

  return (
    <div className="min-h-screen bg-[#F3EEE8] px-4 py-8 font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
        <h1 className="text-2xl font-bold">Moderator review</h1>
        <div className="mt-4 flex gap-2">
          {[['pending', 'Pending'], ['reviewed', 'Reviewed'], ['disputes', 'Disputes']].map(([k, l]) => (
            <button key={k} onClick={() => { setErr(''); setTab(k) }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? 'bg-[#17352B] text-white' : 'bg-white text-[#3D4A44] hover:bg-[#E9E2D6]'}`}>{l}</button>
          ))}
        </div>
        {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err} (If this says &quot;Not allowed&quot;, your account is not in the admins table yet.)</p>}

        <div className="mt-5">
          {tab === 'disputes' ? <DisputeList me={me} admin />
          : rows === null ? <p className="text-sm text-[#6B6B62]">{err ? '' : 'Loading…'}</p>
          : rows.length === 0 ? <p className="text-sm text-[#6B6B62]">{tab === 'pending' ? 'Nothing waiting for review.' : 'No reviewed listings yet.'}</p>
          : tab === 'pending' ? (
            <ul className="space-y-4">{rows.map((l) => <ReviewCard key={l.id} l={l} seller={sellers[l.seller_id]} onDone={load} />)}</ul>
          ) : (
            <ul className="space-y-2">
              {rows.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4DED4] bg-white p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.title}</p>
                    <p className="text-xs text-[#8A8A80]">{sellers[l.seller_id]?.full_name || 'Seller'} · {l.reviewed_at ? new Date(l.reviewed_at).toLocaleDateString() : ''}{l.rejection_reason ? ` · ${l.rejection_reason}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${l.verification_status === 'verified' ? 'bg-[#256B4F] text-white' : 'bg-red-50 text-red-700'}`}>{l.verification_status}</span>
                    {l.verification_status === 'verified' && <button onClick={() => takeDown(l)} className="rounded-lg border border-[#E4DED4] px-3 py-1.5 text-xs font-semibold hover:bg-[#F3EEE8]">Take down</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}