// Admin control panel. Not linked anywhere; rendered by NotFound only when the server
// confirms (for an admin account) that the current URL is the secret ADMIN_PATH.
// All data comes from /api/admin/*, which the server guards independently.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, Inbox as InboxIc, Users, CalendarDays, MessagesSquare, Megaphone, Settings2, ScrollText, Lock,
  ShieldCheck, ExternalLink, Menu, X, LoaderCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SpiderBadge } from '../components/Brand'
import { PasswordField } from '../components/Field'
import Inbox from './Inbox'
import { Overview, Members, Events, Community, Audit } from './Sections'
import { Announcements, SiteSettings } from './SiteSettings'
import './hq.css'

const Ctx = createContext(null)
export const useHQ = () => useContext(Ctx)

const NAV = [
  ['overview', 'Overview', LayoutDashboard],
  ['inbox', 'Inbox', InboxIc],
  ['members', 'Members', Users],
  ['events', 'Events', CalendarDays],
  ['community', 'Community', MessagesSquare],
  ['announcements', 'Announcements', Megaphone],
  ['settings', 'Settings', Settings2],
  ['audit', 'Audit log', ScrollText],
]

export default function Panel({ unlocked: initiallyUnlocked }) {
  const { user } = useAuth()
  const [locked, setLocked] = useState(!initiallyUnlocked)
  const [sec, setSec] = useState(() => (NAV.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) : 'overview'))
  const [badges, setBadges] = useState({})
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    document.body.classList.add('admin-mode')
    const prevTitle = document.title
    document.title = 'Control panel'
    return () => { document.body.classList.remove('admin-mode'); document.title = prevTitle }
  }, [])
  useEffect(() => { history.replaceState(null, '', `${location.pathname}#${sec}`); setMenu(false) }, [sec])

  // every admin request goes through here: a 423 means the unlock expired
  const call = useCallback(async (path, opts) => {
    try { return await api(path, opts) } catch (e) { if (e.status === 423) setLocked(true); throw e }
  }, [])
  const notify = useCallback((msg, kind = 'ok') => { setToast({ msg, kind, id: Date.now() }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  const refreshBadges = useCallback(() => call('/admin/overview').then((d) => setBadges({ inbox: d.openTickets + d.waitingChats })).catch(() => {}), [call])
  useEffect(() => {
    if (locked) return
    refreshBadges()
    const id = window.setInterval(() => { if (!document.hidden) refreshBadges() }, 30000)
    return () => window.clearInterval(id)
  }, [locked, refreshBadges])

  const lock = async () => { await api('/admin/lock', { method: 'POST', body: {} }).catch(() => {}); setLocked(true) }
  const ctx = useMemo(() => ({ call, notify, refreshBadges, go: setSec }), [call, notify, refreshBadges])

  if (locked) return <Unlock email={user?.email} onDone={() => setLocked(false)} />
  const Section = { overview: Overview, inbox: Inbox, members: Members, events: Events, community: Community, announcements: Announcements, settings: SiteSettings, audit: Audit }[sec]

  return (
    <Ctx.Provider value={ctx}>
      <div className="hq">
        <aside className={`hq-side ${menu ? 'open' : ''}`}>
          <div className="hq-brand"><SpiderBadge size={30} /><div><b>BND</b><small>Control panel</small></div>
            <button className="hq-icon hq-close-menu" onClick={() => setMenu(false)} aria-label="Close menu"><X size={18} /></button></div>
          <nav aria-label="Control panel">
            {NAV.map(([id, label, Icon]) => (
              <button key={id} className={`hq-nav ${sec === id ? 'on' : ''}`} aria-current={sec === id ? 'page' : undefined} onClick={() => setSec(id)}>
                <Icon size={17} strokeWidth={1.75} aria-hidden="true" />{label}
                {!!badges[id] && <span className="hq-badge">{badges[id]}</span>}
              </button>
            ))}
          </nav>
          <div className="hq-side-foot">
            <a className="hq-nav" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={17} strokeWidth={1.75} aria-hidden="true" />View site</a>
            <button className="hq-nav" onClick={lock}><Lock size={17} strokeWidth={1.75} aria-hidden="true" />Lock panel</button>
            <p className="hq-who"><ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />{user?.name}</p>
          </div>
        </aside>
        <main className="hq-main" id="main">
          <div className="hq-topbar">
            <button className="hq-icon" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
            <b>{NAV.find(([id]) => id === sec)?.[1]}</b>
          </div>
          <Section />
        </main>
        {toast && <div key={toast.id} className={`hq-toast ${toast.kind}`} role="status">{toast.msg}</div>}
      </div>
    </Ctx.Provider>
  )
}

function Unlock({ email, onDone }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await api('/admin/unlock', { method: 'POST', body: { password: pw } }); onDone() } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <div className="hq-unlock">
      <form className="hq-unlock-card" onSubmit={submit}>
        <SpiderBadge size={44} />
        <h1>Control panel</h1>
        <p className="muted">Confirm it’s you to continue. The panel locks itself after 30 minutes without activity.</p>
        <p className="hq-signed">Signed in as <b>{email}</b></p>
        <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} error={err} autoComplete="current-password" autoFocus required />
        <button className="btn btn-primary btn-block" disabled={busy || !pw}>
          {busy ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Lock size={17} strokeWidth={1.75} aria-hidden="true" />}Unlock
        </button>
        <a className="hq-back" href="/">Back to the site</a>
      </form>
    </div>
  )
}

// ── shared bits ──
export const toDate = (s) => new Date(/[T]/.test(s) ? s : String(s).replace(' ', 'T') + 'Z')
export const when = (s) => (s ? toDate(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—')
export const usd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

export function Switch({ checked, onChange, label, help }) {
  return (
    <label className="hq-switch">
      <input type="checkbox" role="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="hq-switch-ui" aria-hidden="true" />
      <span className="hq-switch-text"><b>{label}</b>{help && <small>{help}</small>}</span>
    </label>
  )
}
export function Seg({ value, options, onChange, label }) {
  return (
    <div className="hq-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button type="button" key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}
export function Empty({ icon: Icon, children }) {
  return <div className="hq-empty"><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><p>{children}</p></div>
}
