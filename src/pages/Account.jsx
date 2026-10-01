import { useEffect, useMemo, useState } from 'react'
import { Download, Trash2, LogOut, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Field, PasswordField } from '../components/Field'
import { tierById, priceOf } from '../../shared/tiers.js'
import { COUNTRY_CODES } from '../../shared/countries.js'
import { formatMoney } from '../../shared/currency.js'
import { useLocale, countryName } from '../lib/locale'
import Footer from '../components/Footer'

export default function Account() {
  const { user, setUser, logout } = useAuth()
  const nav = useNavigate()
  const { locale } = useLocale()
  const [name, setName] = useState(user.name)
  const [country, setCountry] = useState(user.country || '')
  const [delPw, setDelPw] = useState('')
  const [delMsg, setDelMsg] = useState(null)
  const [delOpen, setDelOpen] = useState(false)
  const countries = useMemo(() => COUNTRY_CODES.map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1])), [])
  const [nameMsg, setNameMsg] = useState(null)
  const [pw, setPw] = useState({ current: '', password: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [payments, setPayments] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { api('/membership/payments').then((d) => setPayments(d.payments)) }, [user.tier])

  const saveName = async (e) => {
    e.preventDefault(); setNameMsg(null)
    try { const d = await api('/account', { method: 'PATCH', body: { name, country: country || null } }); setUser(d.user); setNameMsg({ ok: 'Saved.' }) }
    catch (e2) { setNameMsg({ err: e2.message }) }
  }
  const savePw = async (e) => {
    e.preventDefault(); setPwMsg(null); setBusy(true)
    try { await api('/account/password', { method: 'POST', body: pw }); setPw({ current: '', password: '' }); setPwMsg({ ok: 'Password changed. Other devices were signed out.' }) }
    catch (e2) { setPwMsg({ err: e2.message, field: e2.field }) } finally { setBusy(false) }
  }
  const downgrade = async () => {
    if (!confirm('Drop back to the free plan? You’ll lose access to paid perks.')) return
    const d = await api('/membership/checkout', { method: 'POST', body: { tier: 'free' } })
    setUser(d.user)
  }
  const exportData = async () => {
    const r = await fetch('/api/account/export', { credentials: 'same-origin' })
    const blob = await r.blob()
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `brand-new-day-${user.memberNo}.json` })
    a.click(); URL.revokeObjectURL(a.href)
  }
  const del = async (e) => {
    e.preventDefault(); setDelMsg(null)
    try { await api('/account/delete', { method: 'POST', body: { password: delPw } }); setUser(null); nav('/?deleted=1') }
    catch (e2) { setDelMsg(e2.message) }
  }
  const t = tierById(user.tier)
  return (
    <>
      <main className="club" id="main">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <span className="eyebrow">Account</span>
          <h1 className="h-2" style={{ marginBottom: 8 }}>Your account</h1>
          <p className="muted" style={{ marginBottom: 28 }}><Link to="/dashboard" style={{ color: "var(--color-text)" }}>← Back to your dashboard</Link></p>
          <div className="stack" style={{ gap: 18 }}>
            <section className="panel stack">
              <div className="row"><h2 style={{ fontSize: 20 }}>Membership</h2><span className="spacer" /><span className="status-pill"><i aria-hidden="true" />{t.name}</span></div>
              <p className="muted">Member no. <b style={{ color: 'var(--color-text)' }}>{user.memberNo}</b> · {t.rank && user.billingInterval ? `${formatMoney(priceOf(t.id, user.billingInterval))} / ${user.billingInterval} · renews ${new Date(user.renewsAt.replace(' ', 'T') + 'Z').toLocaleDateString(locale, { dateStyle: 'medium' })}` : 'Free plan'}</p>
              <div className="row">
                <Link className="btn btn-primary btn-sm" to="/membership">{t.id === 'multiverse' ? 'Change plan' : 'Upgrade'}</Link>
                {t.id !== 'free' && <button className="btn btn-sm" onClick={downgrade}>Switch to free</button>}
              </div>
              {payments.length > 0 && (
                <table className="lb" style={{ marginTop: 8 }}>
                  <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Ref</th></tr></thead>
                  <tbody>{payments.map((p) => (
                    <tr key={p.reference}><td className="tabular">{new Date(p.created_at.replace(' ', 'T') + 'Z').toLocaleDateString(locale)}</td><td>{tierById(p.tier).name}</td><td className="tabular">{formatMoney(p.amount)}{p.amount ? ` / ${p.interval === 'year' ? 'yr' : 'mo'}` : ''}{p.provider.endsWith('simulated') ? ' (test)' : ''}</td><td className="faint" style={{ fontSize: 12 }}>{p.reference}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </section>

            <form className="panel form" onSubmit={saveName} noValidate>
              <h2 style={{ fontSize: 20 }}>Profile</h2>
              <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} error={nameMsg?.err} help={nameMsg?.ok} />
              <Field label="Email" value={user.email} disabled help="Contact support to change your email." />
              <div>
                <div className="field">
                  <label htmlFor="acc-country">Country or region</label>
                  <select id="acc-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Prefer not to say</option>
                    {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div><button className="btn btn-sm btn-primary">Save</button></div>
            </form>

            <form className="panel form" onSubmit={savePw} noValidate>
              <h2 style={{ fontSize: 20 }}>Change password</h2>
              {pwMsg?.ok && <div className="alert alert-ok" role="status">{pwMsg.ok}</div>}
              {pwMsg?.err && !pwMsg.field && <div className="alert alert-error" role="alert">{pwMsg.err}</div>}
              <PasswordField label="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwMsg?.field === 'current' ? pwMsg.err : null}
                aside={<Link to="/forgot-password">Forgot it?</Link>} />
              <PasswordField label="New password" autoComplete="new-password" meter value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={pwMsg?.field === 'password' ? pwMsg.err : null} help="8+ characters, with a letter and a number." />
              <div><button className="btn btn-sm btn-primary" disabled={busy || !pw.current || !pw.password}>{busy ? 'Saving…' : 'Update password'}</button></div>
            </form>

            <section className="panel stack">
              <h2 className="with-ic" style={{ fontSize: 20 }}><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />Your data</h2>
              <p className="muted">Download everything we hold about you, or delete your account for good. See our <Link to="/privacy" style={{ color: 'var(--color-text)' }}>Privacy Policy</Link>.</p>
              <div className="row">
                <button className="btn btn-sm" onClick={exportData}><Download size={15} strokeWidth={1.75} aria-hidden="true" />Export my data</button>
                {!delOpen && <button className="btn btn-sm btn-danger" onClick={() => setDelOpen(true)}><Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />Delete account</button>}
              </div>
              {delOpen && (
                <form className="form danger-zone" onSubmit={del} noValidate>
                  <p>This permanently deletes your profile, theories, trivia scores and RSVPs. Payment records are kept only as long as tax law requires. This can’t be undone.</p>
                  <PasswordField label="Confirm with your password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} error={delMsg} />
                  <div className="row">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDelOpen(false); setDelPw(''); setDelMsg(null) }}>Cancel</button>
                    <button className="btn btn-sm btn-danger" disabled={!delPw}>Delete permanently</button>
                  </div>
                </form>
              )}
            </section>

            <div className="row"><button className="btn btn-ghost" onClick={async () => { await logout(); nav('/') }}><LogOut size={16} strokeWidth={1.75} aria-hidden="true" />Log out</button></div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
