import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { Field } from '../components/Field'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setBusy(true)
    try { setDone(await api('/auth/forgot', { method: 'POST', body: { email } })) }
    catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout line1="Lost the thread?" line2="We’ll spin a new one.">
      <h1>Forgot password</h1>
      <p className="sub">Enter the email you joined with. We’ll send a link to set a new password.</p>
      {done ? (
        <div className="stack">
          <div className="alert alert-ok" role="status">{done.message}</div>
          {done.demoLink && (
            <div className="alert alert-demo">
              <b>Demo mode:</b> email isn’t connected yet, so here’s the link the email would contain:{' '}
              <Link to={done.demoLink}>Open reset link →</Link>
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => setDone(null)}>Use a different email</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          {err && <div className="alert alert-error" role="alert">{err}</div>}
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary btn-block" disabled={busy || !email}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
      <p className="auth-foot">Remembered it? <Link to="/login">Back to log in</Link></p>
    </AuthLayout>
  )
}
