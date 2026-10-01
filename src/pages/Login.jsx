import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { Field, PasswordField } from '../components/Field'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const reset = sp.get('reset') === '1'
  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setBusy(true)
    try { await login(f.email, f.password); nav(sp.get('next') || '/dashboard', { replace: true }) }
    catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout line1="Welcome back," line2="web-head.">
      <h1>Log in</h1>
      <p className="sub">Your club card, your theories, your seat at the next watch party.</p>
      <form className="form" onSubmit={submit} noValidate>
        {reset && <div className="alert alert-ok" role="status">Password updated. Log in with your new password.</div>}
        {err && <div className="alert alert-error" role="alert">{err}</div>}
        <Field label="Email" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <PasswordField label="Password" autoComplete="current-password" required value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          aside={<Link to="/forgot-password">Forgot password?</Link>} />
        <button className="btn btn-primary btn-block" disabled={busy || !f.email || !f.password}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="auth-foot">New here? <Link to={`/signup${sp.get('next') ? `?next=${encodeURIComponent(sp.get('next'))}` : ''}`}>Join the club, free</Link></p>
    </AuthLayout>
  )
}
