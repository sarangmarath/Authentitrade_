/* import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const MAX_MB = 5
const sel = (k, o, extra = {}) => ({ k, t: 'select', o, req: true, ...extra })
const txt = (k, ph, extra = {}) => ({ k, ph, req: true, ...extra })
const num = (k, ph, extra = {}) => ({ k, t: 'number', ph, req: true, ...extra })

const ID_PROOF = { k: 'id', label: 'Government photo ID', req: true, hint: 'Aadhaar, PAN, passport or driving licence. The name must match your other documents.' }

const CONFIG = {
  vehicle: {
    label: 'Vehicle', blurb: 'Cars, bikes, SUVs, commercial vehicles', minPhotos: 3,
    fields: [
      sel('Vehicle type', ['Car', 'SUV', 'Bike / scooter', 'Commercial / construction', 'Other']),
      txt('Make', 'Honda'), txt('Model', 'City VX'), num('Year', '2019'),
      sel('Fuel', ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']),
      sel('Transmission', ['Manual', 'Automatic']),
      num('Kilometres driven', '42000'),
      sel('Owners', ['1st owner', '2nd owner', '3rd owner or more']),
      txt('Registration number', 'TN 01 AB 1234'),
      txt('VIN / chassis number', '17 characters'),
    ],
    proofs: [
      { k: 'rc', label: 'Registration certificate (RC)', req: true, hint: 'Must show the owner name and the VIN / chassis number.' },
      ID_PROOF,
      { k: 'insurance', label: 'Valid insurance copy', hint: 'Optional, but buyers trust listings that include it.' },
      { k: 'service', label: 'Service history', hint: 'Optional.' },
    ],
  },
  luxury: {
    label: 'Luxury item', blurb: 'Watches, bags, jewellery, accessories', minPhotos: 2,
    fields: [
      sel('Item type', ['Watch', 'Bag', 'Jewellery', 'Shoes / clothing', 'Other']),
      txt('Brand', 'Omega'), txt('Model / name', 'Seamaster 300M'),
      sel('Condition', ['New with tags', 'Like new', 'Good', 'Fair']),
      num('Year purchased', '2021'),
      txt('Serial number', 'Printed on the item or papers', { req: false }),
      sel('Box and papers', ['Both included', 'Box only', 'Papers only', 'Neither']),
    ],
    proofs: [
      { k: 'invoice', label: 'Purchase invoice or receipt', req: true, hint: 'Shows where and when you bought it, in your name.' },
      ID_PROOF,
      { k: 'auth', label: 'Authenticity card or certificate', hint: 'Optional, strongly recommended for watches and jewellery.' },
    ],
  },
  collectible: {
    label: 'Collectible', blurb: 'Coins, comics, cards, art, memorabilia', minPhotos: 2,
    fields: [
      sel('Collectible type', ['Coins / stamps', 'Comics / books', 'Trading cards', 'Art', 'Memorabilia', 'Other']),
      txt('Item / series name', 'Marvel Silver Age set'),
      txt('Era or year', '1968'),
      sel('Condition', ['Mint', 'Very good', 'Good', 'Fair']),
      txt('Edition / grade', 'First edition, PSA 8', { req: false }),
    ],
    proofs: [
      { k: 'provenance', label: 'Purchase receipt or provenance document', req: true, hint: 'Receipt, auction invoice or a signed statement of how you obtained it.' },
      ID_PROOF,
      { k: 'auth', label: 'Grading or authenticity certificate', hint: 'Optional.' },
    ],
  },
}

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'

/* 64-bit perceptual (difference) hash of an image, as 16 hex characters.
   The database compares these to catch photos reused from other listings. *//*
async function dHash(file) {
  try {
    const bmp = await createImageBitmap(file)
    const c = document.createElement('canvas')
    c.width = 9; c.height = 8
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, 9, 8)
    const d = ctx.getImageData(0, 0, 9, 8).data
    const g = (x, y) => { const i = (y * 9 + x) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 }
    let bits = ''
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += g(x, y) > g(x + 1, y) ? '1' : '0'
    return BigInt('0b' + bits).toString(16).padStart(16, '0')
  } catch { return null }
}

function Section({ n, title, children }) {
  return (
    <section className="rounded-2xl border border-[#E4DED4] bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#17352B]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#256B4F] text-sm text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  )
}
const Fld = ({ label, req, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-[#17352B]">{label}{req && <span className="text-[#C2643C]"> *</span>}</span>
    {children}
  </label>
)

export default function PostPage({ userId, onExit }) {
  const [cat, setCat] = useState(null)
  const [base, setBase] = useState({ title: '', price: '', location: '', description: '' })
  const [vals, setVals] = useState({})
  const [photos, setPhotos] = useState([])
  const [proofs, setProofs] = useState({})
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const c = cat ? CONFIG[cat] : null
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])

  const tooBig = (f) => f.size > MAX_MB * 1024 * 1024
  function addPhotos(list) {
    const ok = [...list].filter((f) => !tooBig(f))
    if (ok.length < list.length) setErr(`Files over ${MAX_MB} MB were skipped.`)
    setPhotos((p) => [...p, ...ok].slice(0, 8))
  }
  function setProof(k, f) {
    if (f && tooBig(f)) return setErr(`That file is over ${MAX_MB} MB.`)
    setProofs((p) => ({ ...p, [k]: f }))
  }

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!base.title.trim() || !base.price || !base.location.trim()) return setErr('Please fill in the title, price and location.')
    const missing = c.fields.filter((f) => f.req && !String(vals[f.k] || '').trim()).map((f) => f.k)
    if (missing.length) return setErr(`Please fill in: ${missing.join(', ')}.`)
    if (photos.length < c.minPhotos) return setErr(`Add at least ${c.minPhotos} photos of the item.`)
    const lacking = c.proofs.filter((p) => p.req && !proofs[p.k]).map((p) => p.label)
    if (lacking.length) return setErr(`Please upload: ${lacking.join(', ')}.`)
    if (!agree) return setErr('Please confirm the ownership declaration.')

    setBusy(true)
    try {
      const hashes = (await Promise.all(photos.map(dHash))).filter(Boolean)
      const urls = []
      for (const f of photos) {
        const path = `${userId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`
        const { error } = await supabase.storage.from('listing-images').upload(path, f)
        if (error) throw error
        urls.push(supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl)
      }
      const proofPaths = []
      for (const p of c.proofs) {
        const f = proofs[p.k]
        if (!f) continue
        const path = `${userId}/${crypto.randomUUID()}-${p.k}-${f.name.replace(/[^\w.-]/g, '_')}`
        const { error } = await supabase.storage.from('listing-proofs').upload(path, f)
        if (error) throw error
        proofPaths.push(path)
      }
      const details = Object.fromEntries(c.fields.map((f) => [f.k, String(vals[f.k] || '').trim()]).filter(([, v]) => v))
      const { error } = await supabase.from('listings').insert({
        seller_id: userId, title: base.title.trim(), description: base.description.trim(), category: cat,
        price: Number(base.price), location: base.location.trim(),
        vin: cat === 'vehicle' ? vals['VIN / chassis number']?.trim() || null : null,
        image_urls: urls, proof_paths: proofPaths, details, image_hashes: hashes,
      })
      if (error) throw error
      setDone(true)
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#256B4F] text-2xl text-white">✓</div>
        <h1 className="mt-4 text-2xl font-bold text-[#17352B]">Listing submitted</h1>
        <p className="mt-2 text-sm text-[#6B6B62]">A moderator is checking your documents. Your listing goes live once it is verified. You can follow its status under Dashboard. Your ID and ownership documents are private and are never shown to buyers.</p>
        <button onClick={onExit} className="mt-6 rounded-xl bg-[#256B4F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E5A42]">Back to marketplace</button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={onExit} className="text-sm font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
      <div>
        <h1 className="text-3xl font-bold text-[#17352B]">Post a listing</h1>
        <p className="mt-1 text-sm text-[#6B6B62]">Tell buyers about your item and upload proof that it is yours. Every listing is verified before it goes live.</p>
      </div>

      <Section n="1" title="What are you selling?">
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(CONFIG).map(([id, x]) => (
            <button type="button" key={id} onClick={() => { setCat(id); setVals({}); setProofs({}); setErr('') }}
              className={`rounded-xl border-2 p-4 text-left transition hover:shadow ${cat === id ? 'border-[#256B4F] bg-[#E4EFE8]' : 'border-[#E4DED4] bg-[#FDFBF6]'}`}>
              <p className="font-semibold text-[#17352B]">{x.label}</p>
              <p className="mt-1 text-xs text-[#6B6B62]">{x.blurb}</p>
            </button>
          ))}
        </div>
      </Section>

      {c && (
        <form onSubmit={submit} className="space-y-5">
          <Section n="2" title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Fld label="Listing title" req><input className={inp} value={base.title} onChange={(e) => setBase({ ...base, title: e.target.value })} placeholder="Honda City VX, 2019, single owner" /></Fld></div>
              <Fld label="Price (INR)" req><input className={inp} type="number" min="1" value={base.price} onChange={(e) => setBase({ ...base, price: e.target.value })} /></Fld>
              <Fld label="City / location" req><input className={inp} value={base.location} onChange={(e) => setBase({ ...base, location: e.target.value })} placeholder="Chennai" /></Fld>
              <div className="sm:col-span-2"><Fld label="Description"><textarea className={inp} rows={4} value={base.description} onChange={(e) => setBase({ ...base, description: e.target.value })} placeholder="Condition, reasons for selling, anything a buyer should know." /></Fld></div>
            </div>
          </Section>

          <Section n="3" title={`${c.label} details`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {c.fields.map((f) => (
                <Fld key={f.k} label={f.k} req={f.req}>
                  {f.t === 'select' ? (
                    <select className={inp} value={vals[f.k] || ''} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })}>
                      <option value="">Select…</option>{f.o.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className={inp} type={f.t === 'number' ? 'number' : 'text'} min={f.t === 'number' ? 0 : undefined}
                      value={vals[f.k] || ''} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })} placeholder={f.ph} />
                  )}
                </Fld>
              ))}
            </div>
          </Section>

          <Section n="4" title="Photos of the item">
            <p className="mb-3 text-xs text-[#6B6B62]">Add at least {c.minPhotos} clear photos (up to 8, {MAX_MB} MB each). Show different angles{cat === 'vehicle' ? ', the interior, odometer and chassis plate' : ' and any marks or serial numbers'}. Use your own photos: pictures copied from other listings are flagged.</p>
            <input type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} className="text-sm text-[#6B6B62]" />
            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((u, i) => (
                  <div key={u} className="relative h-20 w-24 overflow-hidden rounded-lg border border-[#E4DED4]">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label="Remove photo"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white">×</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section n="5" title="Proof that it belongs to you">
            <p className="mb-4 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">These documents are stored privately. Only our verification team can open them, and buyers never see them.</p>
            <div className="space-y-4">
              {c.proofs.map((p) => (
                <Fld key={p.k} label={p.label} req={p.req}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setProof(p.k, e.target.files[0] || null)} className="text-sm text-[#6B6B62]" />
                  <span className="mt-1 block text-xs text-[#8A8A80]">{proofs[p.k] ? `Selected: ${proofs[p.k].name}` : p.hint}</span>
                </Fld>
              ))}
            </div>
          </Section>

          <label className="flex items-start gap-2 rounded-2xl border border-[#E4DED4] bg-white p-4 text-sm text-[#3D4A44]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#256B4F]" />
            <span>I confirm that I own this item, that the details and documents are genuine, and that I allow AuthentiTrade to verify them.</span>
          </label>

          {err && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#256B4F] py-3.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-60">
            {busy ? 'Uploading and submitting…' : 'Submit for verification'}
          </button>
        </form>
      )}
      {!c && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </main>
  )
}
*/

import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const MAX_MB = 5
const sel = (k, o, extra = {}) => ({ k, t: 'select', o, req: true, ...extra })
const txt = (k, ph, extra = {}) => ({ k, ph, req: true, ...extra })
const num = (k, ph, extra = {}) => ({ k, t: 'number', ph, req: true, ...extra })

const ID_PROOF = { k: 'id', label: 'Government photo ID', req: true, hint: 'Aadhaar, PAN, passport or driving licence. The name must match your other documents.' }

const CONFIG = {
  vehicle: {
    label: 'Vehicle', blurb: 'Cars, bikes, SUVs, commercial vehicles', minPhotos: 3,
    fields: [
      sel('Vehicle type', ['Car', 'SUV', 'Bike / scooter', 'Commercial / construction', 'Other']),
      txt('Make', 'Honda'), txt('Model', 'City VX'), num('Year', '2019'),
      sel('Fuel', ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']),
      sel('Transmission', ['Manual', 'Automatic']),
      num('Kilometres driven', '42000'),
      sel('Owners', ['1st owner', '2nd owner', '3rd owner or more']),
      txt('Registration number', 'TN 01 AB 1234'),
      txt('VIN / chassis number', '17 characters'),
    ],
    proofs: [
      { k: 'rc', label: 'Registration certificate (RC)', req: true, hint: 'Must show the owner name and the VIN / chassis number.' },
      ID_PROOF,
      { k: 'insurance', label: 'Valid insurance copy', hint: 'Optional, but buyers trust listings that include it.' },
      { k: 'service', label: 'Service history', hint: 'Optional.' },
    ],
  },
  luxury: {
    label: 'Luxury item', blurb: 'Watches, bags, jewellery, accessories', minPhotos: 2,
    fields: [
      sel('Item type', ['Watch', 'Bag', 'Jewellery', 'Shoes / clothing', 'Other']),
      txt('Brand', 'Omega'), txt('Model / name', 'Seamaster 300M'),
      sel('Condition', ['New with tags', 'Like new', 'Good', 'Fair']),
      num('Year purchased', '2021'),
      txt('Serial number', 'Printed on the item or papers', { req: false }),
      sel('Box and papers', ['Both included', 'Box only', 'Papers only', 'Neither']),
    ],
    proofs: [
      { k: 'invoice', label: 'Purchase invoice or receipt', req: true, hint: 'Shows where and when you bought it, in your name.' },
      ID_PROOF,
      { k: 'auth', label: 'Authenticity card or certificate', hint: 'Optional, strongly recommended for watches and jewellery.' },
    ],
  },
  collectible: {
    label: 'Collectible', blurb: 'Coins, comics, cards, art, memorabilia', minPhotos: 2,
    fields: [
      sel('Collectible type', ['Coins / stamps', 'Comics / books', 'Trading cards', 'Art', 'Memorabilia', 'Other']),
      txt('Item / series name', 'Marvel Silver Age set'),
      txt('Era or year', '1968'),
      sel('Condition', ['Mint', 'Very good', 'Good', 'Fair']),
      txt('Edition / grade', 'First edition, PSA 8', { req: false }),
    ],
    proofs: [
      { k: 'provenance', label: 'Purchase receipt or provenance document', req: true, hint: 'Receipt, auction invoice or a signed statement of how you obtained it.' },
      ID_PROOF,
      { k: 'auth', label: 'Grading or authenticity certificate', hint: 'Optional.' },
    ],
  },
}

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'

/* 64-bit perceptual (difference) hash of an image, as 16 hex characters.
   The database compares these to catch photos reused from other listings. */
async function dHash(file) {
  try {
    const bmp = await createImageBitmap(file)
    const c = document.createElement('canvas')
    c.width = 9; c.height = 8
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, 9, 8)
    const d = ctx.getImageData(0, 0, 9, 8).data
    const g = (x, y) => { const i = (y * 9 + x) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 }
    let bits = ''
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += g(x, y) > g(x + 1, y) ? '1' : '0'
    return BigInt('0b' + bits).toString(16).padStart(16, '0')
  } catch { return null }
}

function Section({ n, title, children }) {
  return (
    <section className="rounded-2xl border border-[#E4DED4] bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#17352B]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#256B4F] text-sm text-white">{n}</span>{title}
      </h2>
      {children}
    </section>
  )
}
const Fld = ({ label, req, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-[#17352B]">{label}{req && <span className="text-[#C2643C]"> *</span>}</span>
    {children}
  </label>
)

export default function PostPage({ userId, onExit }) {
  const [cat, setCat] = useState(null)
  const [base, setBase] = useState({ title: '', price: '', location: '', description: '' })
  const [vals, setVals] = useState({})
  const [photos, setPhotos] = useState([])
  const [proofs, setProofs] = useState({})
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const c = cat ? CONFIG[cat] : null
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])

  const tooBig = (f) => f.size > MAX_MB * 1024 * 1024
  function addPhotos(list) {
    const ok = [...list].filter((f) => !tooBig(f))
    if (ok.length < list.length) setErr(`Files over ${MAX_MB} MB were skipped.`)
    setPhotos((p) => [...p, ...ok].slice(0, 8))
  }
  function setProof(k, f) {
    if (f && tooBig(f)) return setErr(`That file is over ${MAX_MB} MB.`)
    setProofs((p) => ({ ...p, [k]: f }))
  }

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (!base.title.trim() || !base.price || !base.location.trim()) return setErr('Please fill in the title, price and location.')
    const missing = c.fields.filter((f) => f.req && !String(vals[f.k] || '').trim()).map((f) => f.k)
    if (missing.length) return setErr(`Please fill in: ${missing.join(', ')}.`)
    if (photos.length < c.minPhotos) return setErr(`Add at least ${c.minPhotos} photos of the item.`)
    const lacking = c.proofs.filter((p) => p.req && !proofs[p.k]).map((p) => p.label)
    if (lacking.length) return setErr(`Please upload: ${lacking.join(', ')}.`)
    if (!agree) return setErr('Please confirm the ownership declaration.')

    setBusy(true)
    try {
      const hashes = (await Promise.all(photos.map(dHash))).filter(Boolean)
      const urls = []
      for (const f of photos) {
        const path = `${userId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`
        const { error } = await supabase.storage.from('listing-images').upload(path, f)
        if (error) throw error
        urls.push(supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl)
      }
      const proofPaths = []
      for (const p of c.proofs) {
        const f = proofs[p.k]
        if (!f) continue
        const path = `${userId}/${crypto.randomUUID()}-${p.k}-${f.name.replace(/[^\w.-]/g, '_')}`
        const { error } = await supabase.storage.from('listing-proofs').upload(path, f)
        if (error) throw error
        proofPaths.push(path)
      }
      const details = Object.fromEntries(c.fields.map((f) => [f.k, String(vals[f.k] || '').trim()]).filter(([, v]) => v))
      const { error } = await supabase.from('listings').insert({
        seller_id: userId, title: base.title.trim(), description: base.description.trim(), category: cat,
        price: Number(base.price), location: base.location.trim(),
        vin: cat === 'vehicle' ? vals['VIN / chassis number']?.trim() || null : null,
        image_urls: urls, proof_paths: proofPaths, details, image_hashes: hashes,
      })
      if (error) throw error
      setDone(true)
    } catch (x) { setErr(/mime|not supported|invalid/i.test(x.message) ? 'One of your files is not a supported type. Use JPG, PNG or WebP for photos, and JPG, PNG, WebP or PDF for documents.' : x.message) }
    setBusy(false)
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#256B4F] text-2xl text-white">✓</div>
        <h1 className="mt-4 text-2xl font-bold text-[#17352B]">Listing submitted</h1>
        <p className="mt-2 text-sm text-[#6B6B62]">A moderator is checking your documents. Your listing goes live once it is verified. Your ID and ownership documents are private and are never shown to buyers.</p>
        <button onClick={onExit} className="mt-6 rounded-xl bg-[#256B4F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E5A42]">Back to marketplace</button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={onExit} className="text-sm font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
      <div>
        <h1 className="text-3xl font-bold text-[#17352B]">Post a listing</h1>
        <p className="mt-1 text-sm text-[#6B6B62]">Tell buyers about your item and upload proof that it is yours. Every listing is verified before it goes live.</p>
      </div>

      <Section n="1" title="What are you selling?">
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(CONFIG).map(([id, x]) => (
            <button type="button" key={id} onClick={() => { setCat(id); setVals({}); setProofs({}); setErr('') }}
              className={`rounded-xl border-2 p-4 text-left transition hover:shadow ${cat === id ? 'border-[#256B4F] bg-[#E4EFE8]' : 'border-[#E4DED4] bg-[#FDFBF6]'}`}>
              <p className="font-semibold text-[#17352B]">{x.label}</p>
              <p className="mt-1 text-xs text-[#6B6B62]">{x.blurb}</p>
            </button>
          ))}
        </div>
      </Section>

      {c && (
        <form onSubmit={submit} className="space-y-5">
          <Section n="2" title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Fld label="Listing title" req><input className={inp} value={base.title} onChange={(e) => setBase({ ...base, title: e.target.value })} placeholder="Honda City VX, 2019, single owner" /></Fld></div>
              <Fld label="Price (INR)" req><input className={inp} type="number" min="1" value={base.price} onChange={(e) => setBase({ ...base, price: e.target.value })} /></Fld>
              <Fld label="City / location" req><input className={inp} value={base.location} onChange={(e) => setBase({ ...base, location: e.target.value })} placeholder="Chennai" /></Fld>
              <div className="sm:col-span-2"><Fld label="Description"><textarea className={inp} rows={4} value={base.description} onChange={(e) => setBase({ ...base, description: e.target.value })} placeholder="Condition, reasons for selling, anything a buyer should know." /></Fld></div>
            </div>
          </Section>

          <Section n="3" title={`${c.label} details`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {c.fields.map((f) => (
                <Fld key={f.k} label={f.k} req={f.req}>
                  {f.t === 'select' ? (
                    <select className={inp} value={vals[f.k] || ''} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })}>
                      <option value="">Select…</option>{f.o.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className={inp} type={f.t === 'number' ? 'number' : 'text'} min={f.t === 'number' ? 0 : undefined}
                      value={vals[f.k] || ''} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })} placeholder={f.ph} />
                  )}
                </Fld>
              ))}
            </div>
          </Section>

          <Section n="4" title="Photos of the item">
            <p className="mb-3 text-xs text-[#6B6B62]">Add at least {c.minPhotos} clear photos (up to 8, {MAX_MB} MB each). Show different angles{cat === 'vehicle' ? ', the interior, odometer and chassis plate' : ' and any marks or serial numbers'}. Use your own photos: pictures copied from other listings are flagged.</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} className="text-sm text-[#6B6B62]" />
            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((u, i) => (
                  <div key={u} className="relative h-20 w-24 overflow-hidden rounded-lg border border-[#E4DED4]">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label="Remove photo"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white">×</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section n="5" title="Proof that it belongs to you">
            <p className="mb-4 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">These documents are stored privately. Only our verification team can open them, and buyers never see them.</p>
            <div className="space-y-4">
              {c.proofs.map((p) => (
                <Fld key={p.k} label={p.label} req={p.req}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProof(p.k, e.target.files[0] || null)} className="text-sm text-[#6B6B62]" />
                  <span className="mt-1 block text-xs text-[#8A8A80]">{proofs[p.k] ? `Selected: ${proofs[p.k].name}` : p.hint}</span>
                </Fld>
              ))}
            </div>
          </Section>

          <label className="flex items-start gap-2 rounded-2xl border border-[#E4DED4] bg-white p-4 text-sm text-[#3D4A44]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#256B4F]" />
            <span>I confirm that I own this item, that the details and documents are genuine, and that I allow AuthentiTrade to verify them.</span>
          </label>

          {err && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#256B4F] py-3.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-60">
            {busy ? 'Uploading and submitting…' : 'Submit for verification'}
          </button>
        </form>
      )}
      {!c && err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </main>
  )
}