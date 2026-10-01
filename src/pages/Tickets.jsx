import MemberNav from '../components/MemberNav'
import { ListSkeleton } from '../components/Skeleton'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Send, Ticket, CircleCheck, Clock, Archive, ChevronDown, CircleUserRound, LoaderCircle, MailCheck } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSettings } from '../lib/settings'
import { SpiderBadge } from '../components/Brand'
import Footer from '../components/Footer'

const toDate = (s) => new Date(/T/.test(s) ? s : String(s).replace(' ', 'T') + 'Z')
const when = (s) => toDate(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const STATUS = {
  open: ['Waiting for the team', Clock, ''],
  answered: ['Team replied', CircleCheck, 'ok'],
  closed: ['Closed', Archive, 'muted'],
}
export function StatusPill({ status }) {
  const [label, Icon, cls] = STATUS[status] || STATUS.open
  return <span className={`ticket-status ${cls}`}><Icon size={13} strokeWidth={2} aria-hidden="true" />{label}</span>
}

/** Contact form shown in the Help centre (works signed in or as a guest). */
export function TicketForm() {
  const { user } = useAuth()
  const settings = useSettings()
  const [cats, setCats] = useState([])
  const [f, setF] = useState({ name: '', email: '', category: '', subject: '', message: '', website: '' })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  useEffect(() => { api('/support/ticket-categories').then((d) => { setCats(d.categories); setF((x) => ({ ...x, category: d.categories[0] })) }).catch(() => {}) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (settings && !settings.support.ticketsEnabled) return null
  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!user && f.name.trim().length < 2) v.name = 'Tell us your name.'
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) v.email = 'Enter a valid email.'
    if (f.subject.trim().length < 4) v.subject = 'Add a short subject.'
    if (f.message.trim().length < 10) v.message = 'Tell us a little more (10+ characters).'
    setErr(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try { setDone(await api('/support/tickets', { method: 'POST', body: f })) } catch (e2) { setErr(e2.field ? { [e2.field]: e2.message } : { form: e2.message }) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <section className="ticket-card ticket-done" id="ticket" aria-live="polite">
        <MailCheck size={26} strokeWidth={1.5} aria-hidden="true" />
        <h2>Ticket {done.ref} received</h2>
        <p className="muted">We’ve emailed a confirmation{user ? '' : ' with a private link to follow your ticket'}. The team usually replies within 24 hours.</p>
        {user ? <Link className="btn btn-sm" to="/tickets">View my tickets</Link>
          : done.key && <Link className="btn btn-sm" to={`/tickets/${done.ref}?key=${done.key}`}>View ticket</Link>}
      </section>
    )
  }
  return (
    <form className="ticket-card form" id="ticket" onSubmit={submit} noValidate>
      <div>
        <h2 className="with-ic dash-h"><Ticket size={18} strokeWidth={1.75} aria-hidden="true" />Send us a message</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Opens a support ticket. We reply by email{user ? ' and on your Tickets page' : ''}.</p>
      </div>
      {!user && (
        <div className="grid-2">
          <div className="field"><label htmlFor="t-name">Your name</label><input id="t-name" className="input" value={f.name} onChange={set('name')} aria-invalid={!!err.name} autoComplete="name" />{err.name && <div className="field-error">{err.name}</div>}</div>
          <div className="field"><label htmlFor="t-email">Email</label><input id="t-email" className="input" type="email" value={f.email} onChange={set('email')} aria-invalid={!!err.email} autoComplete="email" />{err.email && <div className="field-error">{err.email}</div>}</div>
        </div>
      )}
      <div className="grid-2">
        <div className="field"><label htmlFor="t-cat">Topic</label><select id="t-cat" className="input" value={f.category} onChange={set('category')}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="t-sub">Subject</label><input id="t-sub" className="input" maxLength={120} value={f.subject} onChange={set('subject')} aria-invalid={!!err.subject} />{err.subject && <div className="field-error">{err.subject}</div>}</div>
      </div>
      <div className="field"><label htmlFor="t-msg">Message</label><textarea id="t-msg" className="input" rows={5} maxLength={5000} value={f.message} onChange={set('message')} aria-invalid={!!err.message} placeholder="Include your member number or payment reference if it’s about billing." />{err.message && <div className="field-error">{err.message}</div>}</div>
      {/* honeypot for bots */}
      <input className="sr-only" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} name="website" />
      {err.form && <p className="alert alert-error" role="alert">{err.form}</p>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Send size={16} strokeWidth={2} aria-hidden="true" />}Send message</button>
      </div>
    </form>
  )
}

function Conversation({ ticket, onReply }) {
  const settings = useSettings()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const send = async (e) => {
    e.preventDefault()
    if (body.trim().length < 2) return
    setBusy(true); setErr('')
    try { await onReply(body); setBody('') } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <div className="ticket-thread">
      {ticket.messages.map((m) => (
        <div key={m.id} className={`ticket-msg ${m.sender}`}>
          <span className="ticket-av" aria-hidden="true">{m.sender === 'admin' ? <SpiderBadge size={28} /> : <CircleUserRound size={28} strokeWidth={1.25} />}</span>
          <div>
            <div className="ticket-who"><b>{m.sender === 'admin' ? settings?.support.agentName || 'BND Team' : 'You'}</b><time className="faint">{when(m.created_at)}</time></div>
            {m.body.split('\n').map((l, i) => <p key={i}>{l || '\u00a0'}</p>)}
          </div>
        </div>
      ))}
      <form className="ticket-reply" onSubmit={send}>
        <label htmlFor={`r-${ticket.ref}`} className="sr-only">Add a reply</label>
        <textarea id={`r-${ticket.ref}`} className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={ticket.status === 'closed' ? 'Reply to reopen this ticket…' : 'Add more detail or reply to the team…'} />
        {err && <p className="field-error">{err}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-sm btn-primary" disabled={busy || body.trim().length < 2}><Send size={15} aria-hidden="true" />Send reply</button></div>
      </form>
    </div>
  )
}

/** /tickets — a signed-in member's tickets. */
export function MyTickets() {
  const [tickets, setTickets] = useState(null)
  const [open, setOpen] = useState(null)
  const load = useCallback(() => api('/support/tickets').then((d) => setTickets(d.tickets)).catch(() => setTickets([])), [])
  useEffect(() => { load() }, [load])
  return (
    <>
      <main className="club" id="main">
        <MemberNav />
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Support</span>
          <h1 className="h-2" style={{ fontSize: 'clamp(28px,4vw,40px)', marginBottom: 8 }}>My tickets</h1>
          <p className="muted" style={{ marginTop: 0 }}>Your messages to the club team. Need something else? <Link to="/help#ticket">Open a new ticket</Link>.</p>
          {tickets === null ? <ListSkeleton rows={3} /> : tickets.length === 0 ? (
            <div className="dash-empty" style={{ marginTop: 24 }}><Ticket size={22} strokeWidth={1.5} aria-hidden="true" /><p className="muted">No tickets yet.</p><Link className="btn btn-sm" to="/help#ticket">Contact support</Link></div>
          ) : (
            <ul className="ticket-list">
              {tickets.map((t) => (
                <li key={t.ref} className={`ticket-card ${open === t.ref ? 'open' : ''}`}>
                  <button className="ticket-sum" aria-expanded={open === t.ref} onClick={() => setOpen(open === t.ref ? null : t.ref)}>
                    <div><b>{t.subject}</b><span className="faint">{t.ref} · {t.category} · updated {when(t.updated_at)}</span></div>
                    <StatusPill status={t.status} />
                    <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" className="chev" />
                  </button>
                  {open === t.ref && <Conversation ticket={t} onReply={async (body) => { await api(`/support/tickets/${t.ref}/reply`, { method: 'POST', body: { body } }); await load() }} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

/** /tickets/:ref?key=… — a guest's private ticket link (from the confirmation email). */
export function TicketView() {
  const { ref } = useParams()
  const [sp] = useSearchParams()
  const key = sp.get('key') || ''
  const [ticket, setTicket] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { api(`/support/tickets/${encodeURIComponent(ref)}?key=${encodeURIComponent(key)}`).then((d) => setTicket(d.ticket)).catch((e) => setErr(e.message)) }, [ref, key])
  return (
    <>
      <main className="club" id="main">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <span className="eyebrow">Support ticket</span>
          {err ? (
            <div className="locked"><h1 className="h-2" style={{ fontSize: 28 }}>Ticket not found</h1><p className="muted">{err}</p><Link className="btn" to="/help#ticket">Contact support</Link></div>
          ) : !ticket ? <ListSkeleton rows={2} /> : (
            <>
              <h1 className="h-2" style={{ fontSize: 'clamp(26px,4vw,36px)', marginBottom: 6 }}>{ticket.subject}</h1>
              <div className="row" style={{ gap: 10, marginBottom: 20 }}><span className="faint">{ticket.ref} · {ticket.category}</span><StatusPill status={ticket.status} /></div>
              <div className="ticket-card open">
                <Conversation ticket={ticket} onReply={async (body) => { const d = await api(`/support/tickets/${ticket.ref}/reply`, { method: 'POST', body: { body, key } }); setTicket(d.ticket) }} />
              </div>
              <p className="faint" style={{ fontSize: 13, marginTop: 14 }}>Keep this link private — anyone with it can read this ticket.</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
