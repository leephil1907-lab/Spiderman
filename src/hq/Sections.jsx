import { useCallback, useEffect, useState } from 'react'
import { Users, UserPlus, DollarSign, Ticket, MessageCircle, CalendarDays, Search, Trash2, Ban, RotateCcw, Plus, Pencil, X, ScrollText, MessagesSquare, ShieldCheck, TriangleAlert, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { TIERS, tierById } from '../../shared/tiers.js'
import { useHQ, when, usd, Empty } from './Panel'

// ───────── overview ─────────
export function Overview() {
  const { call, go } = useHQ()
  const [d, setD] = useState(null)
  useEffect(() => { call('/admin/overview').then(setD).catch(() => {}) }, [call])
  if (!d) return <div className="hq-section"><div className="hq-skel" /></div>
  const total = Math.max(1, d.members)
  const stats = [
    ['Members', d.members, Users, null],
    ['New this week', d.signups7d, UserPlus, null],
    ['Revenue · 30 days', usd(d.revenue30d), DollarSign, d.simulatedPayments ? 'Includes simulated test payments' : null],
    ['Open tickets', d.openTickets, Ticket, 'inbox'],
    ['Chats waiting', d.waitingChats, MessageCircle, 'inbox'],
    ['Upcoming events', d.upcomingEvents, CalendarDays, 'events'],
  ]
  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Overview</h1><p className="muted">What’s happening across the club right now.</p></div></header>
      <div className="hq-stats">
        {stats.map(([label, v, Icon, link]) => {
          const inner = <><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span className="hq-stat-v tabular">{v}</span><span className="hq-stat-l">{label}</span></>
          return typeof link === 'string'
            ? <button key={label} className="hq-stat link" onClick={() => go(link)}>{inner}</button>
            : <div key={label} className="hq-stat" title={link || undefined}>{inner}{link && <small className="faint">{link}</small>}</div>
        })}
      </div>
      <div className="hq-grid-2">
        <section className="hq-card">
          <h2>Members by tier</h2>
          <div className="hq-tierbar" role="img" aria-label="Members by tier">
            {TIERS.map((t, i) => d.byTier[t.id] ? <span key={t.id} className={`tb-${i}`} style={{ flex: d.byTier[t.id] }} /> : null)}
          </div>
          <ul className="hq-legend">
            {TIERS.map((t, i) => <li key={t.id}><i className={`tb-${i}`} />{t.name}<span className="spacer" /><b className="tabular">{d.byTier[t.id]}</b><span className="faint tabular">{Math.round((d.byTier[t.id] / total) * 100)}%</span></li>)}
          </ul>
        </section>
        <section className="hq-card">
          <h2>Latest members</h2>
          <ul className="hq-list">
            {d.recentMembers.map((m) => <li key={m.id}><b>{m.name}</b><span className="faint">{m.email}</span><span className="spacer" /><span className="tag">{tierById(m.tier).name}</span></li>)}
          </ul>
        </section>
        <section className="hq-card span-2">
          <h2>Recent payments</h2>
          {d.recentPayments.length === 0 ? <p className="muted">No payments yet.</p> : (
            <ul className="hq-list">
              {d.recentPayments.map((p, i) => <li key={i}><b>{p.name}</b><span className="faint">{tierById(p.tier).name} · {p.interval === 'year' ? 'yearly' : 'monthly'}</span><span className="spacer" /><span className="faint">{p.provider}</span><b className="tabular">{usd(p.amount)}</b><time className="faint">{when(p.created_at)}</time></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

// ───────── members ─────────
export function Members() {
  const { call, notify } = useHQ()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ members: [], total: 0 })
  const [confirm, setConfirm] = useState(null)
  const load = useCallback(() => call(`/admin/members?q=${encodeURIComponent(q)}&tier=${tier}&page=${page}`).then(setData).catch(() => {}), [call, q, tier, page])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const patch = async (m, body, msg) => {
    try { await call(`/admin/members/${m.id}`, { method: 'PATCH', body }); notify(msg); load() } catch (e) { notify(e.message, 'err') }
  }
  const del = async () => {
    try { await call(`/admin/members/${confirm.id}`, { method: 'DELETE' }); notify('Member deleted'); setConfirm(null); load() } catch (e) { notify(e.message, 'err') }
  }
  const pages = Math.ceil(data.total / 25)
  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Members</h1><p className="muted">{data.total} member{data.total === 1 ? '' : 's'}. Change a tier (complimentary upgrade), suspend or delete accounts.</p></div></header>
      <div className="hq-toolbar">
        <label className="hq-search"><Search size={16} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">Search members</span>
          <input className="input" placeholder="Search name, email or member no." value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} /></label>
        <label className="sr-only" htmlFor="tierf">Filter by tier</label>
        <select id="tierf" className="input hq-select" value={tier} onChange={(e) => { setTier(e.target.value); setPage(0) }}>
          <option value="">All tiers</option>{TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="hq-table-wrap">
        <table className="hq-table">
          <thead><tr><th>Member</th><th>Tier</th><th>Country</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} className={m.disabled ? 'dim' : ''}>
                <td><b>{m.name}</b>{m.isAdmin && <span className="tag with-ic" style={{ marginLeft: 6 }}><ShieldCheck size={11} aria-hidden="true" />Admin</span>}<div className="faint">{m.email} · {m.member_no}</div></td>
                <td>
                  <select className="input hq-select sm" aria-label={`Tier for ${m.name}`} value={m.tier} onChange={(e) => patch(m, { tier: e.target.value }, `${m.name} → ${tierById(e.target.value).name}`)}>
                    {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {m.renews_at && <div className="faint">renews {new Date(m.renews_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</div>}
                </td>
                <td>{m.country || '—'}</td>
                <td className="faint">{when(m.created_at)}</td>
                <td>{m.disabled ? <span className="tag hot">Suspended</span> : <span className="tag ok">Active</span>}</td>
                <td className="hq-actions">
                  {!m.isAdmin && (m.disabled
                    ? <button className="hq-icon" title="Restore" aria-label={`Restore ${m.name}`} onClick={() => patch(m, { disabled: false }, `${m.name} restored`)}><RotateCcw size={16} /></button>
                    : <button className="hq-icon" title="Suspend (signs them out)" aria-label={`Suspend ${m.name}`} onClick={() => patch(m, { disabled: true }, `${m.name} suspended`)}><Ban size={16} /></button>)}
                  {!m.isAdmin && <button className="hq-icon danger" title="Delete" aria-label={`Delete ${m.name}`} onClick={() => setConfirm(m)}><Trash2 size={16} /></button>}
                </td>
              </tr>
            ))}
            {data.members.length === 0 && <tr><td colSpan={6}><Empty icon={Users}>No members match.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="hq-pager">
          <button className="hq-icon" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
          <span className="faint">Page {page + 1} of {pages}</span>
          <button className="hq-icon" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
        </div>
      )}
      {confirm && (
        <Confirm title={`Delete ${confirm.name}?`} onCancel={() => setConfirm(null)} onConfirm={del} danger>
          This permanently deletes {confirm.email}, their RSVPs, theories and payment history. This can’t be undone.
        </Confirm>
      )}
    </div>
  )
}

// ───────── events ─────────
const tzOffsetMin = (date, tz) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]))
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime()) / 60000)
}
/** "2026-10-16T19:00" wall-clock in `tz` → "2026-10-16T19:00:00-04:00" */
function zonedISO(local, tz) {
  const guess = new Date(local + ':00Z')
  const off = tzOffsetMin(new Date(guess.getTime() - tzOffsetMin(guess, tz) * 60000), tz)
  const s = off < 0 ? '-' : '+', a = Math.abs(off)
  return `${local}:00${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`
}
function wallClock(iso, tz) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
  } catch { return '' }
}
const BLANK = { title: '', city: '', venue: '', local: '', tz: 'UTC', capacity: 100, min_tier: 'webslinger' }

export function Events() {
  const { call, notify } = useHQ()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(null) // null | {id?, ...}
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(null)
  const load = useCallback(() => call('/admin/events').then((d) => setEvents(d.events)).catch(() => {}), [call])
  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e.preventDefault(); setErr('')
    if (!form.local) return setErr('Pick a start date and time.')
    let starts_at
    try { starts_at = zonedISO(form.local, form.tz) } catch { return setErr('Unknown time zone (use e.g. Africa/Lagos, Europe/London).') }
    const body = { ...form, starts_at }
    try {
      await call(form.id ? `/admin/events/${form.id}` : '/admin/events', { method: form.id ? 'PUT' : 'POST', body })
      notify(form.id ? 'Event updated' : 'Event created'); setForm(null); load()
    } catch (e2) { setErr(e2.message) }
  }
  const del = async () => { await call(`/admin/events/${confirm.id}`, { method: 'DELETE' }); notify('Event deleted'); setConfirm(null); load() }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const now = Date.now()

  return (
    <div className="hq-section">
      <header className="hq-head">
        <div><h1>Events</h1><p className="muted">Watch parties shown in the Club. Times are entered in the venue’s local time zone.</p></div>
        <button className="btn btn-primary btn-sm" onClick={() => { setErr(''); setForm({ ...BLANK, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }) }}><Plus size={16} aria-hidden="true" />New event</button>
      </header>
      {form && (
        <form className="hq-card hq-form" onSubmit={save}>
          <div className="row"><h2>{form.id ? 'Edit event' : 'New event'}</h2><span className="spacer" /><button type="button" className="hq-icon" onClick={() => setForm(null)} aria-label="Cancel"><X size={18} /></button></div>
          <div className="hq-fields">
            <L label="Title" wide><input className="input" value={form.title} onChange={set('title')} required /></L>
            <L label="City"><input className="input" value={form.city} onChange={set('city')} required /></L>
            <L label="Venue"><input className="input" value={form.venue} onChange={set('venue')} required /></L>
            <L label="Starts (local time)"><input className="input" type="datetime-local" value={form.local} onChange={set('local')} required /></L>
            <L label="Time zone"><input className="input" value={form.tz} onChange={set('tz')} placeholder="Africa/Lagos" required /></L>
            <L label="Capacity"><input className="input" type="number" min={1} value={form.capacity} onChange={set('capacity')} /></L>
            <L label="Minimum tier"><select className="input" value={form.min_tier} onChange={set('min_tier')}>{TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></L>
          </div>
          {err && <p className="alert alert-error">{err}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><button type="button" className="btn btn-sm" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary btn-sm">{form.id ? 'Save changes' : 'Create event'}</button></div>
        </form>
      )}
      <div className="hq-table-wrap">
        <table className="hq-table">
          <thead><tr><th>Event</th><th>When (local)</th><th>Tier</th><th>RSVPs</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className={new Date(e.starts_at) < now ? 'dim' : ''}>
                <td><b>{e.title}</b><div className="faint">{e.venue} · {e.city}</div></td>
                <td>{wallClock(e.starts_at, e.tz).replace('T', ' ')}<div className="faint">{e.tz}</div></td>
                <td><span className="tag">{tierById(e.min_tier).name}</span></td>
                <td className="tabular">{e.going} / {e.capacity}</td>
                <td className="hq-actions">
                  <button className="hq-icon" aria-label={`Edit ${e.title}`} onClick={() => { setErr(''); setForm({ id: e.id, title: e.title, city: e.city, venue: e.venue, tz: e.tz, capacity: e.capacity, min_tier: e.min_tier, local: wallClock(e.starts_at, e.tz) }) }}><Pencil size={16} /></button>
                  <button className="hq-icon danger" aria-label={`Delete ${e.title}`} onClick={() => setConfirm(e)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5}><Empty icon={CalendarDays}>No events yet.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {confirm && <Confirm title={`Delete “${confirm.title}”?`} danger onCancel={() => setConfirm(null)} onConfirm={del}>{confirm.going} RSVP{confirm.going === 1 ? '' : 's'} will be removed.</Confirm>}
    </div>
  )
}

// ───────── community ─────────
export function Community() {
  const { call, notify } = useHQ()
  const [rows, setRows] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const load = useCallback(() => call('/admin/theories').then((d) => setRows(d.theories)).catch(() => {}), [call])
  useEffect(() => { load() }, [load])
  const del = async () => { await call(`/admin/theories/${confirm.id}`, { method: 'DELETE' }); notify('Post removed'); setConfirm(null); load() }
  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Community</h1><p className="muted">Moderate the Theory Board. Removing a post deletes it for everyone.</p></div></header>
      {rows && rows.length === 0 && <Empty icon={MessagesSquare}>No posts yet.</Empty>}
      <div className="hq-posts">
        {rows?.map((t) => (
          <article key={t.id} className="hq-card hq-post">
            <div className="row" style={{ gap: 8 }}>
              <b>{t.title}</b>{!!t.spoiler && <span className="tag hot">Spoiler</span>}<span className="spacer" />
              <button className="hq-icon danger" aria-label={`Remove “${t.title}”`} onClick={() => setConfirm(t)}><Trash2 size={16} /></button>
            </div>
            <p>{t.body}</p>
            <div className="faint row" style={{ gap: 10, fontSize: 12 }}><span>{t.author} · {t.member_no}</span><span className="with-ic"><Heart size={12} aria-hidden="true" />{t.likes}</span><span>{when(t.created_at)}</span></div>
          </article>
        ))}
      </div>
      {confirm && <Confirm title="Remove this post?" danger onCancel={() => setConfirm(null)} onConfirm={del}>“{confirm.title}” by {confirm.author} will be deleted.</Confirm>}
    </div>
  )
}

// ───────── audit ─────────
const ACTION = { unlock: 'Unlocked panel', 'unlock.failed': 'Failed unlock attempt', lock: 'Locked panel', 'settings.update': 'Updated settings', 'member.tier': 'Changed tier', 'member.suspend': 'Suspended member', 'member.restore': 'Restored member', 'member.delete': 'Deleted member', 'event.create': 'Created event', 'event.update': 'Updated event', 'event.delete': 'Deleted event', 'theory.delete': 'Removed post', 'ticket.reply': 'Replied to ticket', 'ticket.status': 'Changed ticket status' }
export function Audit() {
  const { call } = useHQ()
  const [log, setLog] = useState(null)
  useEffect(() => { call('/admin/audit').then((d) => setLog(d.log)).catch(() => {}) }, [call])
  return (
    <div className="hq-section">
      <header className="hq-head"><div><h1>Audit log</h1><p className="muted">Every action taken in this panel, newest first. Failed unlock attempts are recorded too.</p></div></header>
      <div className="hq-table-wrap">
        <table className="hq-table">
          <thead><tr><th>When</th><th>Action</th><th>Details</th><th>By</th><th>IP</th></tr></thead>
          <tbody>
            {log?.map((a, i) => (
              <tr key={i}>
                <td className="faint">{when(a.created_at)}</td>
                <td>{a.action === 'unlock.failed' ? <span className="with-ic hq-warn"><TriangleAlert size={14} aria-hidden="true" />{ACTION[a.action]}</span> : ACTION[a.action] || a.action}</td>
                <td>{a.detail || '—'}</td><td>{a.name || '—'}</td><td className="faint tabular">{a.ip}</td>
              </tr>
            ))}
            {log?.length === 0 && <tr><td colSpan={5}><Empty icon={ScrollText}>Nothing logged yet.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ───────── shared ─────────
export function L({ label, children, wide, help, group }) {
  const cls = `hq-field ${wide ? 'wide' : ''}`
  // `group` for button sets (a <label> would leak its text into every button's name)
  if (group) return <div className={cls} role="group" aria-label={label}><span aria-hidden="true">{label}</span>{children}{help && <small className="faint">{help}</small>}</div>
  return <label className={cls}><span>{label}</span>{children}{help && <small className="faint">{help}</small>}</label>
}
export function Confirm({ title, children, onCancel, onConfirm, danger }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onCancel(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onCancel])
  return (
    <div className="modal-back" onClick={onCancel}>
      <div className="modal hq-confirm" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2><p className="muted">{children}</p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-sm" onClick={onCancel} autoFocus>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
