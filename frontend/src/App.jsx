import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Home from './Home'

/* ---------- Put your exported Figma photos in frontend/public/ ---------- */
const IMAGES = {
  login: '/login.jpg',
  register: '/register.jpg',
  verify: '/verify.jpg',
}

/* true = your image already contains the logo + headline (screenshot crops).
   Set to false if you export clean photos from Figma. */
const TEXT_IN_IMAGE = true

const COPY = {
  login: {
    tag: 'Materials worth keeping',
    title: 'Good materials deserve another chapter.',
    text: 'Source reclaimed timber, stone, fixtures, and surplus stock from trusted sellers near you.',
  },
  register: {
    tag: 'Join the circular economy',
    title: 'Build something new from what already exists.',
    text: 'Join thousands of makers, renovators, and studios giving quality materials a useful second life.',
  },
  verify: {
    tag: 'Trade with confidence',
    title: 'A safer loop starts with verified people.',
    text: 'A quick identity check helps protect every buyer, seller, and material story in our community.',
  },
}

/* ---------- Small shared pieces ---------- */
const inputCls =
  'w-full rounded-xl border border-[#E4DED4] bg-[#FDFBF6] py-3 pl-10 pr-3 text-sm text-[#17352B] placeholder:text-[#9A9A90] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25'
const primaryBtn =
  'w-full rounded-xl bg-[#256B4F] py-3 text-sm font-semibold text-white transition hover:bg-[#1E5A42] disabled:opacity-60'
const ghostBtn =
  'flex w-full items-center justify-center gap-2 rounded-xl border border-[#E4DED4] bg-[#FDFBF6] py-3 text-sm font-semibold text-[#17352B] transition hover:bg-white'

function Icon({ d }) {
  return (
    <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A80]" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
const MAIL = 'M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z'
const LOCK = 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3'
const USER = 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0'

function Field({ label, icon, type = 'text', value, onChange, placeholder, toggle }) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#17352B]">{label}</span>
      <div className="relative">
        <Icon d={icon} />
        <input
          type={isPw && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className={inputCls + (isPw ? ' pr-10' : '')}
        />
        {isPw && toggle !== false && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8A80] hover:text-[#17352B]"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </label>
  )
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-[#9A9A90]">
      <span className="h-px flex-1 bg-[#E4DED4]" /> or <span className="h-px flex-1 bg-[#E4DED4]" />
    </div>
  )
}

function Shell({ view, children }) {
  const c = COPY[view]
  return (
    <div className="min-h-screen bg-[#F3EEE8] p-3 font-[Inter,system-ui,sans-serif] sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl gap-6 lg:grid-cols-2 sm:min-h-[calc(100vh-2.5rem)]">
        {/* Photo panel */}
        <aside
          className="relative hidden overflow-hidden rounded-3xl bg-[#1F3B30] bg-cover bg-top lg:block"
          style={{ backgroundImage: `url(${IMAGES[view]})` }}
        >
          {!TEXT_IN_IMAGE && <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
          <div className="absolute left-6 top-6 flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#256B4F]">♻</span>
            <span className="font-semibold">AuthentiTrade</span>
          </div>
          <div className="absolute inset-x-8 bottom-8 text-white">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/80">— {c.tag}</p>
            <h2 className="text-4xl font-semibold leading-tight">{c.title}</h2>
            <p className="mt-4 max-w-sm text-sm text-white/80">{c.text}</p>
            <p className="mt-6 text-xs text-white/70">Verified sellers · Protected payments · Material histories</p>
          </div>
          </>}
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-2 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  )
}

const Heading = ({ eyebrow, title, sub }) => (
  <div className="mb-6">
    {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2643C]">{eyebrow}</p>}
    <h1 className="mt-1 text-3xl font-bold leading-tight text-[#17352B]">{title}</h1>
    {sub && <p className="mt-2 text-sm text-[#6B6B62]">{sub}</p>}
  </div>
)

/* ---------- OTP boxes ---------- */
function OtpInput({ value, onChange }) {
  const refs = useRef([])
  const digits = value.padEnd(6, ' ').split('')

  function setAt(i, ch) {
    const arr = digits.map((d) => (d === ' ' ? '' : d))
    arr[i] = ch
    onChange(arr.join('').slice(0, 6))
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '')
            setAt(i, ch)
            if (ch && i < 5) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
            if (t) {
              e.preventDefault()
              onChange(t)
              refs.current[Math.min(t.length, 5)]?.focus()
            }
          }}
          className="h-14 w-full min-w-0 rounded-xl border border-[#E4DED4] bg-[#FDFBF6] text-center text-xl font-semibold text-[#17352B] focus:border-[#256B4F] focus:outline-none focus:ring-2 focus:ring-[#256B4F]/25"
        />
      ))}
    </div>
  )
}

const strongPw = (p) => p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)
const PW_RULE = 'Use 8+ characters with an uppercase letter, a number, and a symbol.'

/* ---------- App ---------- */
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home') // home | login | register | verify | forgot | reset
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(600)
  const [message, setMessage] = useState({ text: '', ok: false })
  const [loading, setLoading] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [verifyMode, setVerifyMode] = useState('signup') // signup | login (2nd step)
  const pending2fa = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(pending2fa.current ? null : s))
    return () => l.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setProfile(null)
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
  }, [session])

  useEffect(() => {
    if (view !== 'verify') return
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [view])

  const say = (text, ok = false) => setMessage({ text, ok })
  const go = (v) => { if (v !== 'verify') pending2fa.current = false; setView(v); say('') }
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  async function onLogin(e) {
    e.preventDefault()
    setLoading(true); say('')
    pending2fa.current = true
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      pending2fa.current = false
      if (/not confirmed/i.test(error.message)) {
        await supabase.auth.resend({ type: 'signup', email })
        setVerifyMode('signup'); setSeconds(600); setCode(''); go('verify')
      } else say(error.message)
      setLoading(false)
      return
    }
    // Step 1 done (password OK). Drop the session and require an emailed code (step 2).
    await supabase.auth.signOut()
    const { error: otpErr } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setLoading(false)
    if (otpErr) { pending2fa.current = false; return say(otpErr.message) }
    setVerifyMode('login'); setSeconds(600); setCode(''); go('verify')
  }

  async function onRegister(e) {
    e.preventDefault()
    say('')
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))
      return say('Use 8+ characters with an uppercase letter, a number, and a symbol.')
    if (password !== confirm) return say('Passwords do not match.')
    if (!agree) return say('Please accept the Terms of Use and Privacy Policy.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: 'buyer' } },
    })
    setLoading(false)
    if (error) return say(error.message)
    setVerifyMode('signup'); setSeconds(600); setCode(''); go('verify')
  }

  async function onVerify(e) {
    e.preventDefault()
    if (code.length < 6) return say('Enter the 6-digit code from your email.')
    setLoading(true); say('')
    pending2fa.current = false // allow the session once the code is right
    let { error } = await supabase.auth.verifyOtp({ email, token: code, type: verifyMode === 'login' ? 'email' : 'signup' })
    if (error && verifyMode === 'signup') {
      const retry = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      error = retry.error
    }
    setLoading(false)
    if (error) {
      if (verifyMode === 'login') pending2fa.current = true
      say(error.message)
    }
  }

  async function resend() {
    const { error } = verifyMode === 'login'
      ? await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      : await supabase.auth.resend({ type: 'signup', email })
    if (error) return say(error.message)
    setSeconds(600); say('A new code is on its way.', true)
  }

  async function onForgot(e) {
    e.preventDefault()
    setLoading(true); say('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (error) return say(error.message)
    setCode(''); setNewPw(''); setNewPw2(''); go('reset')
    say('If that email has an account, we sent a 6-digit code.', true)
  }

  async function onReset(e) {
    e.preventDefault(); say('')
    if (code.length < 6) return say('Enter the 6-digit code from your email.')
    if (!strongPw(newPw)) return say(PW_RULE)
    if (newPw !== newPw2) return say('Passwords do not match.')
    setLoading(true)
    pending2fa.current = true // keep the temporary recovery session hidden
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
    if (error) { pending2fa.current = false; setLoading(false); return say(error.message) }
    const { error: upErr } = await supabase.auth.updateUser({ password: newPw })
    await supabase.auth.signOut()
    pending2fa.current = false
    setLoading(false)
    if (upErr) return say(upErr.message)
    setPassword(''); go('login')
    say('Password updated. Log in with your new password.', true)
  }

  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

  /* Marketplace home: public for everyone, buyers and sellers alike */
  if (view === 'home' || session) {
    return (
      <Home session={session} profile={profile}
        onLogin={() => go('login')} onSignup={() => go('register')}
        onLogout={() => { supabase.auth.signOut(); setView('home') }} />
    )
  }

  const Msg = () => message.text && (
    <p role="alert" className={`mt-3 text-center text-sm ${message.ok ? 'text-[#256B4F]' : 'text-red-600'}`}>{message.text}</p>
  )
  const link = 'font-semibold text-[#256B4F] hover:underline'

  /* ----- Login ----- */
  if (view === 'login') {
    return (
      <Shell view="login">
        <button type="button" onClick={() => go('home')} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
        <Heading eyebrow="AuthentiTrade access" title="Welcome back to AuthentiTrade"
          sub="Log in to revisit saved materials, messages, and active orders on AuthentiTrade." />
        <form onSubmit={onLogin} className="space-y-4">
          <Field label="Email address" icon={MAIL} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" icon={LOCK} type="password" value={password} onChange={setPassword} placeholder="Your password" />
          <div className="flex items-center justify-between text-xs text-[#6B6B62]">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-[#256B4F]" /> Remember me for 30 days</label>
            <button type="button" className={link} onClick={() => go('forgot')}>Forgot password?</button>
          </div>
          <button type="submit" disabled={loading} className={primaryBtn}>{loading ? 'Please wait…' : 'Log in'}</button>
        </form>
        <Divider />
        <button onClick={google} className={ghostBtn}><b className="text-[#4285F4]">G</b> Continue with Google</button>
        <p className="mt-5 text-center text-sm text-[#6B6B62]">New to AuthentiTrade? <button className={link} onClick={() => go('register')}>Create an account</button></p>
        <Msg />
        <p className="mt-6 text-center text-[11px] text-[#9A9A90]">By continuing, you agree to our Terms and acknowledge our Privacy Policy.</p>
      </Shell>
    )
  }

  /* ----- Register ----- */
  if (view === 'register') {
    return (
      <Shell view="register">
        <button type="button" onClick={() => go('home')} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to marketplace</button>
        <Heading eyebrow="Free buyer account" title="Create your account"
          sub="Save materials, message verified sellers, and manage orders in one place." />
        <form onSubmit={onRegister} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" icon={USER} value={fullName} onChange={setFullName} placeholder="Maya Chen" />
            <Field label="Email address" icon={MAIL} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" icon={LOCK} type="password" value={password} onChange={setPassword} placeholder="Password" />
            <Field label="Confirm password" icon={LOCK} type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" />
          </div>
          <p className="text-[11px] text-[#9A9A90]">Use 8+ characters with an uppercase letter, a number, and a symbol.</p>
          <label className="flex items-start gap-2 text-xs text-[#6B6B62]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#256B4F]" />
            <span>I agree to the <b className="text-[#17352B]">Terms of Use</b> and <b className="text-[#17352B]">Privacy Policy</b>, and I'm happy to receive essential account updates.</span>
          </label>
          <button type="submit" disabled={loading} className={primaryBtn}>{loading ? 'Please wait…' : 'Create account'}</button>
        </form>
        <Divider />
        <button onClick={google} className={ghostBtn}><b className="text-[#4285F4]">G</b> Sign up with Google</button>
        <p className="mt-5 text-center text-sm text-[#6B6B62]">Already have an account? <button className={link} onClick={() => go('login')}>Log in</button></p>
        <Msg />
      </Shell>
    )
  }

  /* ----- Forgot password: ask for email ----- */
  if (view === 'forgot') {
    return (
      <Shell view="login">
        <button type="button" onClick={() => go('login')} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to login</button>
        <Heading title="Forgot your password?" sub="Enter your email and we'll send a 6-digit code to reset it." />
        <form onSubmit={onForgot} className="space-y-4">
          <Field label="Email address" icon={MAIL} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <button type="submit" disabled={loading} className={primaryBtn}>{loading ? 'Please wait…' : 'Send reset code'}</button>
        </form>
        <Msg />
      </Shell>
    )
  }

  /* ----- Reset password: code + new password ----- */
  if (view === 'reset') {
    return (
      <Shell view="login">
        <button type="button" onClick={() => go('login')} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to login</button>
        <Heading title="Reset your password" sub={<>Enter the 6-digit code we sent to <b className="text-[#17352B]">{email}</b> and choose a new password.</>} />
        <form onSubmit={onReset} className="space-y-4">
          <div>
            <span className="mb-2 block text-xs font-semibold text-[#17352B]">Verification code</span>
            <OtpInput value={code} onChange={setCode} />
            <div className="mt-2 text-right text-xs"><button type="button" onClick={onForgot} className={link}>Resend code</button></div>
          </div>
          <Field label="New password" icon={LOCK} type="password" value={newPw} onChange={setNewPw} placeholder="New password" />
          <Field label="Confirm new password" icon={LOCK} type="password" value={newPw2} onChange={setNewPw2} placeholder="Repeat new password" />
          <p className="text-[11px] text-[#9A9A90]">{PW_RULE}</p>
          <button type="submit" disabled={loading} className={primaryBtn}>{loading ? 'Please wait…' : 'Update password'}</button>
        </form>
        <Msg />
      </Shell>
    )
  }

  /* ----- Verify email (6-digit code) ----- */
  return (
    <Shell view="verify">
      <button onClick={() => go('login')} className="mb-5 text-xs font-semibold text-[#256B4F] hover:underline">← Back to login</button>
      <Heading title={verifyMode === 'login' ? 'Two-step verification' : 'Check your inbox'}
        sub={<>We sent a 6-digit verification code to <b className="text-[#17352B]">{email}</b>.</>} />
      <form onSubmit={onVerify}>
        <span className="mb-2 block text-xs font-semibold text-[#17352B]">Verification code</span>
        <OtpInput value={code} onChange={setCode} />
        <div className="mt-2 flex justify-between text-xs text-[#9A9A90]">
          <span>{seconds > 0 ? `Code expires in ${timer}` : 'Code expired'}</span>
          <button type="button" onClick={resend} className={link}>Resend code</button>
        </div>
        <button type="submit" disabled={loading} className={primaryBtn + ' mt-5'}>{loading ? 'Please wait…' : 'Verify email'}</button>
      </form>
      <Divider />
      <button onClick={google} className={ghostBtn}><b className="text-[#4285F4]">G</b> Verify with Google account</button>
      <p className="mt-5 text-center text-sm text-[#6B6B62]">Not your email? <button className={link} onClick={() => go('register')}>Change email address</button></p>
      <Msg />
      <p className="mt-5 rounded-lg bg-[#E4EFE8] px-3 py-2.5 text-xs text-[#3D5A4D]">We'll never ask you to share this code with a buyer or seller.</p>
    </Shell>
  )
}