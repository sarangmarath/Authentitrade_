
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import Chat, { Inbox } from './Chat'
import PostPage from './Post'
import Profile from './Profile'
import Admin from './Admin'
import { CategoryNav, FilterBar } from './Browse'
import { TAXONOMY, DEFAULT_FILTERS, applyFilters, emptyText } from './Taxonomy'
import './dark.css'

const CURRENCY = 'INR'
const EXTS = ['jpg', 'jpeg', 'png', 'webp']
const SAMPLES = [
  { id: 's1', file: 'sample-honda-city', title: 'Honda City VX, 2019', price: 950000, category: 'vehicle',
    description: 'Well-kept sedan with full service history, single owner, and no accidents. Smooth automatic gearbox, ideal for city and highway use.',
    details: [['Year', '2019'], ['Fuel', 'Petrol'], ['Transmission', 'Automatic'], ['Driven', '42,000 km'], ['Owners', '1st owner']] },
  { id: 's2', file: 'sample-royal-enfield', title: 'Royal Enfield Classic 350', price: 165000, category: 'vehicle',
    description: 'Classic cruiser in great condition with original paint and recent service. Papers and insurance up to date.',
    details: [['Year', '2021'], ['Fuel', 'Petrol'], ['Engine', '349 cc'], ['Driven', '12,000 km'], ['Owners', '1st owner']] },
  { id: 's3', file: 'sample-omega-seamaster', title: 'Vintage Omega Seamaster', price: 185000, category: 'luxury',
    description: 'Pre-owned automatic dive watch on a mesh bracelet. Keeps good time and comes with its original box.',
    details: [['Condition', 'Pre-owned'], ['Movement', 'Automatic'], ['Bracelet', 'Steel mesh'], ['Includes', 'Original box']] },
  { id: 's4', file: 'sample-comic-set', title: 'First-edition comic set', price: 42000, category: 'collectible',
    description: 'Collector set kept in protective sleeves, with minimal wear on the covers. A great addition to any collection.',
    details: [['Condition', 'Very good'], ['Storage', 'Bagged and boarded'], ['Type', 'Hardcover collection']] },
  { id: 's5', file: 'sample-hyundai-creta', title: 'Hyundai Creta SUV', price: 1150000, category: 'vehicle',
    description: 'Comfortable family SUV with a clean interior, regular servicing and a strong diesel engine.',
    details: [['Year', '2020'], ['Fuel', 'Diesel'], ['Transmission', 'Manual'], ['Driven', '55,000 km'], ['Owners', '1st owner']] },
  { id: 's6', file: 'sample-rental-swift', title: 'Maruti Suzuki Swift, ex-rental', price: 480000, category: 'vehicle',
    description: 'Fuel-efficient hatchback retired from a rental fleet. Fully serviced and ready to drive.',
    details: [['Year', '2018'], ['Fuel', 'Petrol'], ['Transmission', 'Manual'], ['Driven', '68,000 km'], ['Owners', '2nd owner']] },
  { id: 's7', file: 'sample-backhoe-loader', title: 'Backhoe loader, low hours', price: 2400000, category: 'vehicle',
    description: 'Working backhoe loader with low hours, regularly maintained, suitable for construction and earthmoving.',
    details: [['Year', '2017'], ['Hours', '3,200 hrs'], ['Fuel', 'Diesel'], ['Owners', '1st owner']] },
]
const SAMPLE_EXTRA = {
  s1: { highlights: ['Single owner', 'Full service history', 'No accidents', 'Automatic'], specs: [['Colour', 'Platinum white'], ['Insurance', 'Comprehensive, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s2: { highlights: ['Original paint', 'Recent service', 'Papers up to date', '349 cc'], specs: [['Colour', 'Stealth black'], ['Insurance', 'Valid for 1 year'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s3: { highlights: ['Automatic movement', 'Original box', 'Keeps good time', 'Steel mesh bracelet'], specs: [['Case size', '41 mm'], ['Water resistance', '300 m'], ['Papers', 'Not included'], ['Location', 'Mumbai']] },
  s4: { highlights: ['Protective sleeves', 'Minimal cover wear', 'Complete set'], specs: [['Era', 'Silver Age'], ['Items', '12 issues'], ['Grading', 'Ungraded'], ['Location', 'Bengaluru']] },
  s5: { highlights: ['Family SUV', 'Diesel engine', 'Regular servicing', 'Clean interior'], specs: [['Colour', 'Polar white'], ['Insurance', 'Comprehensive, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s6: { highlights: ['Fuel efficient', 'Fully serviced', 'Ex-rental fleet'], specs: [['Colour', 'Silver'], ['Insurance', 'Third-party, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s7: { highlights: ['Low hours', 'Regularly maintained', 'Diesel', 'Single owner'], specs: [['Bucket', 'Standard'], ['Service', 'Every 250 hrs'], ['Location', 'Hosur']] },
}
// Only checks an admin actually ticked are shown to buyers. Keys must match Admin.jsx.
const CHECK_LABELS = {
  id_checked: 'Seller photo ID checked',
  docs_checked: 'Ownership documents checked',
  vin_matched: 'VIN / chassis number matched to the RC',
  photos_reviewed: 'Item photos reviewed',
}
const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n)
const label = (c) => TAXONOMY.find((x) => x.id === c)?.label || c

const candsFor = (item) =>
  item.file ? EXTS.map((e) => `/${item.file}.${e}`) : item.image_urls?.[0] ? [item.image_urls[0]] : []

function Pic({ cands, alt, className }) {
  const [n, setN] = useState(0)
  const src = cands[n]
  if (!src) return <div className="grid h-full w-full place-items-center text-xs text-[#6B6B62]">No photo</div>
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setN(n + 1)} className={className} />
}

function Card({ item, onOpen, saved, onSave }) {
  const isSample = item.id.startsWith('s')
  return (
    <article role="button" tabIndex={0} onClick={() => onOpen(item.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(item.id)}
      className="group fade-up cursor-pointer overflow-hidden rounded-2xl border border-[#E4DED4] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#256B4F]">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#CFE3D8] to-[#E9DFCF]">
        <Pic cands={candsFor(item)} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isSample ? 'bg-white/90 text-[#6B6B62]' : 'bg-[#256B4F] text-white'}`}>
          {isSample ? 'Sample' : '✓ Verified'}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onSave(item.id) }} onKeyDown={(e) => e.stopPropagation()}
          aria-label={saved ? 'Remove from saved' : 'Save listing'}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-base text-[#C2643C]">{saved ? '♥' : '♡'}</button>
      </div>
      <div className="p-4">
        <p className="text-lg font-bold text-[#17352B]">{money(item.price)}</p>
        <h3 className="mt-1 line-clamp-2 text-sm text-[#3D4A44]">{item.title}</h3>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-[#8A8A80]">{label(item.category)}{item.location ? ` · ${item.location}` : ''}</span>
          <span className="font-semibold text-[#256B4F] opacity-0 transition group-hover:opacity-100">View details →</span>
        </div>
      </div>
    </article>
  )
}

function Detail({ item, onBack, session, onLogin, onChat }) {
  const isSample = item.id.startsWith('s')
  const gallery = item.file ? [candsFor(item)] : (item.image_urls || []).map((u) => [u])
  const [pic, setPic] = useState(0)
  const [msg, setMsg] = useState('')
  const fromObj = item.details && !Array.isArray(item.details) ? Object.entries(item.details) : null
  const extra = isSample ? SAMPLE_EXTRA[item.id] : null
  const specs = Array.isArray(item.details) ? [...item.details, ...(extra?.specs || [])] : [
    ['Category', label(item.category)],
    ...(item.location ? [['Location', item.location]] : []),
    ...(fromObj || []),
    ...(!fromObj && item.vin ? [['VIN', item.vin]] : []),
    ...(item.created_at ? [['Listed', new Date(item.created_at).toLocaleDateString()]] : []),
  ]
  const highlights = extra?.highlights || (fromObj || specs).slice(0, 4).map(([k, v]) => `${k}: ${v}`)
  const act = (text) => (session ? setMsg(text) : onLogin())
  const done = Object.entries(item.review_checks || {}).filter(([, v]) => v).map(([k]) => CHECK_LABELS[k]).filter(Boolean)

  async function startChat() {
    if (!session) return onLogin()
    if (isSample) return setMsg('This is a sample listing, so there is no seller to chat with. Post a real listing to try chat.')
    if (item.seller_id === session.user.id) return setMsg('This is your own listing. Buyers will message you here; read them under Chats in the top bar.')
    setMsg('')
    const me = session.user.id
    const { data: found } = await supabase.from('conversations').select('id')
      .eq('listing_id', item.id).eq('buyer_id', me).maybeSingle()
    let id = found?.id
    if (!id) {
      const { data, error } = await supabase.from('conversations')
        .insert({ listing_id: item.id, buyer_id: me, seller_id: item.seller_id }).select('id').single()
      if (error) return setMsg(error.message)
      id = data.id
    }
    onChat({ id, title: item.title })
  }

  return (
    <main className="fade-up mx-auto max-w-6xl px-4 py-6">
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-[#256B4F] hover:underline">← Back to listings</button>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#E4DED4] bg-gradient-to-br from-[#CFE3D8] to-[#E9DFCF]">
            <Pic key={pic} cands={gallery[pic] || []} alt={item.title} className="h-full w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((g, i) => (
                <button key={i} onClick={() => setPic(i)} aria-label={`Photo ${i + 1}`}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === pic ? 'border-[#256B4F]' : 'border-transparent'}`}>
                  <Pic cands={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-[#E4DED4] bg-white p-6">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isSample ? 'bg-[#F3EEE8] text-[#6B6B62]' : 'bg-[#256B4F] text-white'}`}>
            {isSample ? 'Sample listing' : '✓ Verified'}
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight">{item.title}</h1>
          <p className="mt-1 text-xs text-[#8A8A80]">{label(item.category)}</p>
          <p className="mt-4 text-3xl font-bold text-[#256B4F]">{money(item.price)}</p>
          <button onClick={() => act('Escrow checkout is the next feature we will build. This is a preview.')}
            className="mt-5 w-full rounded-xl bg-[#256B4F] py-3 text-sm font-semibold text-white transition hover:bg-[#1E5A42]">Buy with escrow</button>
          <button onClick={startChat}
            className="mt-2 w-full rounded-xl border border-[#E4DED4] py-3 text-sm font-semibold transition hover:bg-[#F3EEE8]">Chat with seller</button>
          {msg && <p className="mt-3 rounded-lg bg-[#E4EFE8] px-3 py-2 text-xs text-[#3D5A4D]">{msg}</p>}
          <p className="mt-4 text-xs text-[#6B6B62]">Escrow is coming soon. For now, inspect the item and check the papers before you pay.</p>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E4DED4] bg-white p-6">
          <h2 className="text-lg font-bold">Description</h2>
          {highlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {highlights.map((h) => <span key={h} className="rounded-full bg-[#E4EFE8] px-3 py-1 text-xs font-medium text-[#3D5A4D]">{h}</span>)}
            </div>
          )}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#3D4A44]">{item.description || 'The seller has not added a description yet.'}</p>
        </section>
        <section className="rounded-2xl border border-[#E4DED4] bg-white p-6">
          <h2 className="text-lg font-bold">Details</h2>
          <dl className="mt-2 divide-y divide-[#EFEAE0] text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-[#6B6B62]">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E4DED4] bg-white p-6">
          <h2 className="text-lg font-bold">Verification</h2>
          {isSample ? (
            <p className="mt-2 text-sm text-[#6B6B62]">This is a sample listing, so no documents were checked. Real listings show the checks our team completed before going live.</p>
          ) : done.length ? (
            <ul className="mt-3 space-y-2 text-sm text-[#3D4A44]">
              {done.map((c) => (
                <li key={c} className="flex items-start gap-2"><span className="mt-0.5 text-[#256B4F]">✓</span>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#6B6B62]">Reviewed and approved by our team.</p>
          )}
        </section>
        <section className="rounded-2xl border border-[#E4DED4] bg-white p-6">
          <h2 className="text-lg font-bold">Buying safely</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#3D4A44]">
            <li>Inspect the item in person before you pay.</li>
            <li>Meet in a public place and bring someone with you.</li>
            <li>Check the papers match the seller's name and the item.</li>
            <li>Keep chatting on AuthentiTrade.</li>
            <li>Never share your login codes with anyone.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}

export default function Home({ session, profile, onLogin, onSignup, onLogout }) {
  const [items, setItems] = useState(null)
  const [f, setF] = useState(DEFAULT_FILTERS)
  const [q, setQ] = useState('')
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved') || '[]') } catch { return [] }
  })
  const [posting, setPosting] = useState(false)
  const [chat, setChat] = useState(null)
  const [inbox, setInbox] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const loadProfile = () => session && supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setMyProfile(data))
  const who = myProfile || profile
  const [dark, setDark] = useState(() => {
    try { const t = localStorage.getItem('theme'); if (t) return t === 'dark' } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])
  useEffect(() => { try { localStorage.setItem('saved', JSON.stringify(saved)) } catch {} }, [saved])
  const toggleSave = (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const readHash = () => (window.location.hash.match(/^#\/listing\/(.+)$/) || [])[1] || null
  const [openId, setOpenId] = useState(readHash)
  useEffect(() => {
    const h = () => setOpenId(readHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [openId, posting])
  const open = (id) => { setPosting(false); window.location.hash = `/listing/${id}` }
  const close = () => { window.location.hash = '' }

  const loadItems = () =>
    supabase.from('listings')
      .select('id,seller_id,title,description,price,category,vin,location,details,image_urls,created_at,review_checks')
      .eq('verification_status', 'verified').eq('listing_status', 'active')
      .order('created_at', { ascending: false }).limit(48)
      .then(({ data, error }) => {
        if (error) console.error('loadItems failed:', error.message)
        setItems(data || [])
      })
  useEffect(() => { loadItems() }, [])

  // Asks the database whether this user is an admin. The real protection is in the database;
  // this only decides whether to show the button.
  useEffect(() => {
    if (!session) { setIsAdmin(false); setShowAdmin(false); return }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(data === true))
  }, [session])

  const real = items && items.length > 0
  const base = useMemo(() => (real ? items : SAMPLES), [real, items])
  const shown = useMemo(() => applyFilters(base, f, q, saved), [base, f, q, saved])

  const selected = !posting && openId && items ? base.find((i) => i.id === openId) : null
  const post = () => { if (!session) return onLogin(); if (openId) close(); setPosting(true) }
  const home = !selected && !posting

  if (showProfile && session) {
    return <Profile session={session} profile={who} onBack={() => setShowProfile(false)} onProfileUpdated={loadProfile} />
  }
  if (showAdmin && session && isAdmin) {
    return <Admin session={session} onBack={() => { setShowAdmin(false); loadItems() }} />
  }

  return (
    <div className="min-h-screen bg-[#F3EEE8] font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fade-up{animation:fadeUp .4s ease both}`}</style>
      <header className="sticky top-0 z-40 border-b border-[#E4DED4] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={() => { setPosting(false); close(); setF(DEFAULT_FILTERS) }} className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#256B4F] text-white">♻</span> AuthentiTrade
          </button>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" title={dark ? 'Light mode' : 'Dark mode'}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#E4DED4] text-base hover:bg-[#F3EEE8]">{dark ? '☀' : '☾'}</button>
            {session ? (
              <>
                {isAdmin && <button onClick={() => setShowAdmin(true)} className="font-semibold text-[#C2643C] hover:underline">Admin</button>}
                <button onClick={() => setInbox(true)} className="font-semibold hover:underline">Chats</button>
                <button onClick={() => { loadProfile(); setShowProfile(true) }} className="font-semibold text-[#6B6B62] hover:underline">Hi, {who?.full_name?.split(' ')[0] || 'Profile'}</button>
                <button onClick={onLogout} className="font-semibold text-[#256B4F] hover:underline">Log out</button>
              </>
            ) : (
              <>
                <button onClick={onLogin} className="font-semibold hover:underline">Log in</button>
                <button onClick={onSignup} className="hidden font-semibold text-[#256B4F] hover:underline sm:inline">Sign up</button>
              </>
            )}
            <button onClick={post} className="rounded-lg bg-[#256B4F] px-4 py-2 font-semibold text-white hover:bg-[#1E5A42]">Post a listing</button>
          </div>
        </div>
        <CategoryNav cat={f.cat} active={!posting}
          onPick={(cat, sub = '') => { setF({ ...DEFAULT_FILTERS, cat, sub }); setPosting(false); if (openId) close() }} />
      </header>

      {home && (<>
      <section className="mx-auto mt-5 max-w-6xl px-4">
        <div className="rounded-3xl bg-[#17352B] bg-cover bg-center px-6 py-12 text-center text-white sm:py-16"
          style={{ backgroundImage: "linear-gradient(rgba(23,53,43,0.82), rgba(37,107,79,0.68)), url('/hero.jpg')" }}>
          <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Buy and sell verified vehicles, luxury items and collectibles.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">One account does both. Browse as a buyer, list as a seller, whenever you like.</p>
          <div className="mx-auto mt-6 flex max-w-2xl gap-2 rounded-2xl bg-white p-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for anything"
              className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm text-[#17352B] focus:outline-none" />
            <button className="rounded-xl bg-[#256B4F] px-5 text-sm font-semibold text-white">Search</button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
        {[['Reviewed listings', 'Our team reviews each listing’s documents before it goes live.'], ['Protected payments', 'Escrow holds money until you receive the item. Coming soon.'], ['VIN checks', 'Vehicle numbers are compared with the registration certificate.']].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-[#E4DED4] bg-white p-4">
            <p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs text-[#6B6B62]">{d}</p>
          </div>
        ))}
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">{real ? 'Fresh listings' : 'Preview listings'}</h2>
          {items && !real && <p className="text-xs text-[#8A8A80]">Sample items shown until the first verified listing goes live.</p>}
        </div>
        <FilterBar items={base} f={f} setF={setF} count={shown.length} />
        {items === null ? (
          <p className="text-sm text-[#6B6B62]">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-[#6B6B62]">{emptyText(f)}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {shown.map((i) => <Card key={i.id} item={i} onOpen={open} saved={saved.includes(i.id)} onSave={toggleSave} />)}
          </div>
        )}
      </main>
      </>)}

      {selected && <Detail key={selected.id} item={selected} onBack={close} session={session} onLogin={onLogin} onChat={setChat} />}

      {posting && session && <PostPage userId={session.user.id} onExit={() => setPosting(false)} />}

      {inbox && session && <Inbox me={session.user.id} onClose={() => setInbox(false)} onPick={(c) => { setInbox(false); setChat(c) }} />}
      {chat && session && <Chat conversationId={chat.id} title={chat.title} me={session.user.id} onClose={() => setChat(null)} />}
    </div>
  )
}

