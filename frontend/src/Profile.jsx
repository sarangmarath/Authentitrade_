
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const inp = 'w-full rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2.5 text-sm text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const lbl = 'mb-1.5 block text-xs font-semibold text-[#17352B]'
const btn = 'rounded-xl bg-[#256B4F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E5A42] disabled:opacity-60'
const smallBtn = 'rounded-lg border border-[#E4DED4] bg-[#FDFBF6] px-3 py-2 text-xs font-semibold text-[#17352B] hover:bg-white'
const smallBtnDark = 'rounded-lg bg-[#256B4F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E5A42]'

export default function Profile({ session, profile, onBack, onProfileUpdated }) {
  const [f, setF] = useState({ full_name: '', secondary_email: '', address: '', permanent_location: '', avatar_url: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [detected, setDetected] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locAsked, setLocAsked] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  useEffect(() => {
    if (!profile) return
    setF({
      full_name: profile.full_name || '',
      secondary_email: profile.secondary_email || '',
      address: profile.address || '',
      permanent_location: profile.permanent_location || '',
      avatar_url: profile.avatar_url || '',
    })
  }, [profile])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const emailOk = !!session.user.email_confirmed_at

  async function save(e) {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      let avatar_url = f.avatar_url
      if (avatarFile) {
        const path = `${session.user.id}/${crypto.randomUUID()}-${avatarFile.name.replace(/[^\w.-]/g, '_')}`
        const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        if (error) throw error
        avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profiles').update({
        full_name: f.full_name, secondary_email: f.secondary_email,
        address: f.address, permanent_location: f.permanent_location, avatar_url,
      }).eq('id', session.user.id)
      if (error) throw error
      setF((p) => ({ ...p, avatar_url }))
      setAvatarFile(null)
      setMsg('Profile saved.')
      onProfileUpdated?.()
    } catch (err) { setMsg(err.message) }
    setSaving(false)
  }

  function detectLocation() {
    setLocLoading(true); setLocAsked(false); setLocMsg('')
    if (!navigator.geolocation) { setLocLoading(false); return setLocMsg('Location is not supported on this device or browser.') }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          const data = await res.json()
          setDetected(data.display_name || `${latitude}, ${longitude}`)
        } catch { setDetected(`${latitude}, ${longitude}`) }
        setLocLoading(false); setLocAsked(true)
      },
      () => { setLocLoading(false); setLocMsg('Location permission was denied.') }
    )
  }

  return (
    <div className="min-h-screen bg-[#F3EEE8] px-4 py-8 font-[Inter,system-ui,sans-serif] text-[#17352B]">
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
        <h1 className="text-2xl font-bold">My profile</h1>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 rounded-full border border-[#E4DED4] bg-[#E4DED4] bg-cover bg-center"
            style={{ backgroundImage: `url(${avatarPreview || f.avatar_url || ''})` }} />
          <label className="cursor-pointer text-sm font-semibold text-[#256B4F] hover:underline">
            Change photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const file = e.target.files[0]; if (!file) return; setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)) }} />
          </label>
        </div>

        <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-[#E4DED4] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={lbl}>Full name</span>
              <input className={inp} value={f.full_name} onChange={set('full_name')} maxLength={100} />
            </label>
            <label>
              <span className={lbl}>Email {emailOk
                ? <span className="ml-1 text-[#256B4F]">✓ Verified</span>
                : <span className="ml-1 text-red-600">Not verified</span>}</span>
              <input className={inp} value={session.user.email} disabled />
            </label>
            <label className="sm:col-span-2">
              <span className={lbl}>Secondary email (optional)</span>
              <input className={inp} type="email" value={f.secondary_email} onChange={set('secondary_email')} placeholder="backup@example.com" />
            </label>
          </div>

          <label>
            <span className={lbl}>Address</span>
            <input className={inp} value={f.address} onChange={set('address')} />
          </label>
          <label>
            <span className={lbl}>Permanent location</span>
            <input className={inp} value={f.permanent_location} onChange={set('permanent_location')} />
          </label>

          <div>
            <button type="button" onClick={detectLocation} disabled={locLoading} className={smallBtn}>
              {locLoading ? 'Detecting…' : 'Use my current location'}
            </button>
            {locMsg && <p className="mt-2 text-xs text-red-600">{locMsg}</p>}
            {locAsked && detected && (
              <div className="mt-2 rounded-lg bg-[#E4EFE8] p-3 text-sm text-[#3D5A4D]">
                <p>Detected: {detected}</p>
                <p className="mt-1">Is this your permanent address?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { setF((p) => ({ ...p, permanent_location: detected })); setLocAsked(false) }} className={smallBtnDark}>Yes, use this</button>
                  <button type="button" onClick={() => setLocAsked(false)} className={smallBtn}>No, I'll type it</button>
                </div>
              </div>
            )}
          </div>

          {msg && <p className="text-sm text-[#256B4F]">{msg}</p>}
          <button disabled={saving} className={btn}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>

        <div className="mt-6 rounded-2xl border border-[#E4DED4] bg-white p-5">
          <h2 className="font-semibold">Email verification</h2>
          <p className="mt-1 text-xs text-[#8A8A80]">
            {emailOk
              ? `${session.user.email} was verified with the 6-digit code we emailed when you signed up.`
              : 'Your email is not verified yet. Log out and log in again to get a new code.'}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E4DED4] bg-white p-5">
          <h2 className="font-semibold">Identity verification</h2>
          {profile?.aadhaar_verified ? (
            <p className="mt-1 text-xs font-semibold text-[#256B4F]">✓ Identity verified by our team</p>
          ) : (
            <p className="mt-1 text-xs text-[#8A8A80]">
              Not available yet. When you post a listing, our team checks your photo ID as part of the review. Never share your Aadhaar number in chat.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}