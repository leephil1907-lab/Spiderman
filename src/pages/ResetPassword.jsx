import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { PasswordField } from '../components/Field'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function ResetPassword() {
  const [sp] = useSearchParams()
  const token = sp.get('token') || ''
  const { setUser } = useAuth()
  const nav = useNavigate()
  const [valid, setValid] = useState(null)
  const [f, setF] = useState({ password: '', confirm: '' })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { api(`/auth/reset/check?token=${encodeURIComponent(token)}`).then((d) => setValid(d.valid)).catch(() => setValid(false)) }, [token])

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (f.password.length < 8 || !/[a-z]/i.test(f.password) || !/\d/.test(f.password)) v.password = 'At least 8 characters, with a letter and a number.'
    if (f.password !== f.confirm) v.confirm = 'Passwords don’t match.'
    setErr(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const d = await api('/auth/reset', { method: 'POST', body: { token, password: f.password } })
      setUser(d.user)
      nav('/club?reset=1', { replace: true })
    } catch (e2) { setErr(e2.field ? { [e2.field]: e2.message } : { form: e2.message }) } finally { setBusy(false) }
  }

  return (
    <AuthLayout line1="Brand new day." line2="Brand new password.">
      <h1>Set a new password</h1>
      {valid === null && <p className="sub">Checking your link…</p>}
      {valid === false && (
        <div className="stack" style={{ marginTop: 20 }}>
          <div className="alert alert-error" role="alert">This reset link is invalid, already used, or older than 30 minutes.</div>
          <Link className="btn btn-primary btn-block" to="/forgot-password">Request a new link</Link>
        </div>
      )}
      {valid && (
        <>
          <p className="sub">Choose something you haven’t used here before. This signs you out on every other device.</p>
          <form className="form" onSubmit={submit} noValidate>
            {err.form && <div className="alert alert-error" role="alert">{err.form}</div>}
            <PasswordField label="New password" autoComplete="new-password" meter value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} help="8+ characters, with a letter and a number." />
            <PasswordField label="Confirm new password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={err.confirm} />
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save and log in'}</button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
