import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { Field, PasswordField } from '../components/Field'
import { useAuth } from '../lib/auth'
import { tierById } from '../../shared/tiers.js'
import { COUNTRY_CODES } from '../../shared/countries.js'
import { useLocale, countryName } from '../lib/locale'
import { useMemo } from 'react'
import { useSettings } from '../lib/settings'

export default function Signup() {
  const settings = useSettings()
  if (settings && (!settings.site.signupsOpen || settings.site.maintenance)) {
    return (
      <AuthLayout>
        <h1 className="h-2" style={{ fontSize: 28 }}>Sign-ups are paused</h1>
        <p className="muted">We’re not taking new members for a short while. Please check back soon — existing members can still <Link to="/login">log in</Link>.</p>
      </AuthLayout>
    )
  }
  return <SignupForm />
}

function SignupForm() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const plan = sp.get('plan')
  const { country: guess } = useLocale()
  const [f, setF] = useState({ name: '', email: '', password: '', country: guess, agree: false })
  const countries = useMemo(() => COUNTRY_CODES.map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1])), [])
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (f.name.trim().length < 2) v.name = 'Tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) v.email = 'Enter a valid email.'
    if (f.password.length < 8 || !/[a-z]/i.test(f.password) || !/\d/.test(f.password)) v.password = 'At least 8 characters, with a letter and a number.'
    if (!f.agree) v.agree = 'Please accept the club rules.'
    setErr(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      await signup({ name: f.name, email: f.email, password: f.password, country: f.country })
      if (plan && plan !== 'free') nav(`/membership?plan=${plan}&billing=${sp.get('billing') === 'year' ? 'year' : 'month'}`, { replace: true })
      else nav(sp.get('next') || '/dashboard?welcome=1', { replace: true })
    } catch (e2) {
      setErr(e2.field ? { [e2.field]: e2.message } : { form: e2.message })
    } finally { setBusy(false) }
  }

  return (
    <AuthLayout line1="Brand new day." line2="Same neighborhood.">
      <h1>Join the Fan Club</h1>
      <p className="sub">
        {plan && plan !== 'free'
          ? <>Create your free account first, then finish upgrading to <b style={{ color: 'var(--color-text)' }}>{tierById(plan).name}</b>.</>
          : 'Free forever. Upgrade any time for watch parties and the Spoiler Vault.'}
      </p>
      <form className="form" onSubmit={submit} noValidate>
        {err.form && <div className="alert alert-error" role="alert">{err.form}</div>}
        <Field label="Name" autoComplete="name" value={f.name} onChange={set('name')} error={err.name} />
        <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={err.email} />
        {err.email?.includes('already') && <p className="help" style={{ marginTop: -8 }}><Link to="/login" style={{ color: 'var(--color-text)' }}>Log in instead</Link> or <Link to="/forgot-password" style={{ color: 'var(--color-text)' }}>reset your password</Link>.</p>}
        <div className="field">
          <label htmlFor="country">Country or region</label>
          <select id="country" className="input" value={f.country} onChange={set('country')} autoComplete="country">
            {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
          <div className="help">Used to show cinemas and watch parties near you. You can change it later.</div>
        </div>
        <PasswordField label="Password" autoComplete="new-password" meter value={f.password} onChange={set('password')} error={err.password} help="8+ characters, with a letter and a number." />
        <label className="check">
          <input type="checkbox" checked={f.agree} onChange={set('agree')} />
          <span>I’ll keep spoilers tagged and be decent to other fans, and I accept the <Link to="/terms" style={{ color: 'var(--color-text)' }}>Terms</Link> and <Link to="/privacy" style={{ color: 'var(--color-text)' }}>Privacy Policy</Link>.</span>
        </label>
        {err.agree && <div className="field-error" style={{ marginTop: -8 }}>{err.agree}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating your card…' : 'Create account'}</button>
      </form>
      <p className="auth-foot">Already a member? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  )
}
