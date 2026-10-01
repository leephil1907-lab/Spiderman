import { useCallback, useEffect, useRef, useState } from 'react'
import { Inbox as InboxIc, Bot, Archive, Send, Crown, CircleUserRound, Mail, CheckCheck, Ticket, MessageCircle, CircleCheck, RotateCcw, MailOpen } from 'lucide-react'
import { SpiderBadge } from '../components/Brand'
import { tierById } from '../../shared/tiers.js'
import { useHQ, when, Empty } from './Panel'

export default function Inbox() {
  const [view, setView] = useState('tickets')
  return (
    <div className="hq-section">
      <header className="hq-head">
        <div><h1>Inbox</h1><p className="muted">Answer email enquiries (support tickets) and live chats. Replies to tickets are emailed to the member.</p></div>
        <div className="hq-seg" role="tablist" aria-label="Inbox type">
          <button role="tab" aria-selected={view === 'tickets'} className={view === 'tickets' ? 'on' : ''} onClick={() => setView('tickets')}><Ticket size={15} strokeWidth={1.75} aria-hidden="true" />Tickets</button>
          <button role="tab" aria-selected={view === 'chats'} className={view === 'chats' ? 'on' : ''} onClick={() => setView('chats')}><MessageCircle size={15} strokeWidth={1.75} aria-hidden="true" />Live chats</button>
        </div>
      </header>
      {view === 'tickets' ? <Tickets /> : <Chats />}
    </div>
  )
}

const T_TABS = [['open', 'Open', MailOpen], ['answered', 'Answered', CheckCheck], ['closed', 'Closed', Archive]]
function Tickets() {
  const { call, notify, refreshBadges } = useHQ()
  const [tab, setTab] = useState('open')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [sel, setSel] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef()

  const loadList = useCallback(() => call(`/admin/tickets?status=${tab}`).then((d) => { setRows(d.tickets); setCounts(d.counts) }).catch(() => {}), [call, tab])
  const loadDetail = useCallback(() => sel && call(`/admin/tickets/${sel}`).then(setDetail).catch(() => {}), [call, sel])
  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { loadDetail() }, [loadDetail])
  useEffect(() => { const id = window.setInterval(() => { if (!document.hidden) loadList() }, 15000); return () => window.clearInterval(id) }, [loadList])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [detail?.messages?.length])

  const send = async (close) => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      await call(`/admin/tickets/${sel}/reply`, { method: 'POST', body: { body: reply, close } })
      setReply(''); notify(close ? 'Reply sent and ticket closed' : 'Reply sent — the member was emailed')
      await loadDetail(); loadList(); refreshBadges()
    } catch (e) { notify(e.message, 'err') } finally { setBusy(false) }
  }
  const setStatus = async (status) => {
    await call(`/admin/tickets/${sel}/status`, { method: 'POST', body: { status } })
    notify(`Ticket marked ${status}`); loadDetail(); loadList(); refreshBadges()
  }
  const t = detail?.ticket

  return (
    <div className="inbox hq-inbox">
      <aside className="inbox-list">
        <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
          {T_TABS.map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => { setTab(id); setSel(null); setDetail(null) }}>
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />{label}<span className="count">{counts[id] || 0}</span>
            </button>
          ))}
        </div>
        <ul>
          {rows.length === 0 && <li className="empty muted">No {tab} tickets.</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <button className={sel === r.id ? 'on' : ''} onClick={() => setSel(r.id)}>
                <div className="row" style={{ gap: 8 }}>
                  <b>{r.subject}</b>
                  {r.tier === 'multiverse' && <span className="tag hot with-ic"><Crown size={11} strokeWidth={2} aria-hidden="true" />Priority</span>}
                  <span className="spacer" /><time className="faint">{when(r.updated_at)}</time>
                </div>
                <span className="preview"><span className="faint">{r.ref} · {r.name} · </span>{r.last_sender === 'admin' && <CheckCheck size={13} strokeWidth={2} aria-label="You replied" />} {r.last}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="inbox-thread">
        {!t ? <Empty icon={Ticket}>Pick a ticket to read and reply.</Empty> : (
          <>
            <header className="inbox-head">
              <CircleUserRound size={30} strokeWidth={1.25} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <b>{t.subject}</b>
                <div className="faint" style={{ fontSize: 13 }}>
                  {t.ref} · {t.category} · {t.name} · <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Re: ${t.subject} [${t.ref}]`)}`} className="with-ic" style={{ color: 'inherit' }}><Mail size={12} strokeWidth={1.75} aria-hidden="true" />{t.email}</a>
                  {t.member_no ? ` · ${t.member_no} · ${tierById(t.tier).name}` : ' · Guest'}
                </div>
              </div>
              <span className="spacer" />
              {t.status !== 'closed'
                ? <button className="btn btn-sm" onClick={() => setStatus('closed')}><CircleCheck size={15} strokeWidth={1.75} aria-hidden="true" />Close</button>
                : <button className="btn btn-sm" onClick={() => setStatus('open')}><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />Reopen</button>}
            </header>
            <div className="chat-list" ref={list}>
              {detail.messages.map((m) => (
                <div key={m.id} className={`chat-row ${m.sender === 'user' ? 'them' : 'me'}`}>
                  {m.sender === 'user' && <span className="chat-avatar sm"><CircleUserRound size={24} strokeWidth={1.25} /></span>}
                  <div className={`bubble ${m.sender === 'user' ? 'bot' : 'user'}`}>
                    <span className="who">{m.sender === 'user' ? t.name : 'Team'} · {when(m.created_at)}</span>
                    {m.body.split('\n').map((l, i) => <span key={i} className="ln">{l || '\u00a0'}</span>)}
                  </div>
                  {m.sender !== 'user' && <span className="chat-avatar sm"><SpiderBadge size={26} /></span>}
                </div>
              ))}
            </div>
            <form className="hq-reply" onSubmit={(e) => { e.preventDefault(); send(false) }}>
              <label htmlFor="treply" className="sr-only">Reply</label>
              <textarea id="treply" className="input" rows={4} placeholder={`Reply to ${t.name} — this is emailed to them…`} value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(false) }} />
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <span className="faint" style={{ fontSize: 12, marginRight: 'auto' }}>Ctrl/⌘ + Enter to send</span>
                <button type="button" className="btn btn-sm" disabled={busy || !reply.trim()} onClick={() => send(true)}>Send &amp; close</button>
                <button className="btn btn-primary btn-sm" disabled={busy || !reply.trim()}><Send size={15} strokeWidth={2} aria-hidden="true" />Send reply</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

const C_TABS = [['human', 'Waiting', InboxIc], ['bot', 'With assistant', Bot], ['closed', 'Closed', Archive]]
function Chats() {
  const { call, notify, refreshBadges } = useHQ()
  const [tab, setTab] = useState('human')
  const [threads, setThreads] = useState([])
  const [counts, setCounts] = useState({})
  const [sel, setSel] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef()

  const loadList = useCallback(() => call(`/admin/support/threads?status=${tab}`).then((d) => { setThreads(d.threads); setCounts(d.counts) }).catch(() => {}), [call, tab])
  const loadDetail = useCallback(() => sel && call(`/admin/support/threads/${sel}`).then(setDetail).catch(() => {}), [call, sel])
  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { loadDetail() }, [loadDetail])
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) { loadList(); loadDetail() } }, 5000)
    return () => window.clearInterval(id)
  }, [loadList, loadDetail])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [detail?.messages?.length])

  const send = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setBusy(true)
    try { await call(`/admin/support/threads/${sel}/reply`, { method: 'POST', body: { body: reply } }); setReply(''); await loadDetail(); loadList() } catch (er) { notify(er.message, 'err') } finally { setBusy(false) }
  }
  const close = async () => { await call(`/admin/support/threads/${sel}/close`, { method: 'POST', body: {} }); notify('Conversation closed'); setSel(null); setDetail(null); loadList(); refreshBadges() }
  const t = detail?.thread

  return (
    <div className="inbox hq-inbox">
      <aside className="inbox-list">
        <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
          {C_TABS.map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => { setTab(id); setSel(null); setDetail(null) }}>
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />{label}<span className="count">{counts[id] || 0}</span>
            </button>
          ))}
        </div>
        <ul>
          {threads.length === 0 && <li className="empty muted">Nothing here.</li>}
          {threads.map((th) => (
            <li key={th.id}>
              <button className={sel === th.id ? 'on' : ''} onClick={() => setSel(th.id)}>
                <div className="row" style={{ gap: 8 }}>
                  <b>{th.name || th.email || `Guest #${th.id}`}</b>
                  {!!th.priority && <span className="tag hot with-ic"><Crown size={11} strokeWidth={2} aria-hidden="true" />Priority</span>}
                  <span className="spacer" /><time className="faint">{when(th.updated_at)}</time>
                </div>
                <span className="preview">{th.last_sender === 'agent' && <CheckCheck size={13} strokeWidth={2} aria-label="You replied" />} {th.last}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="inbox-thread">
        {!detail ? <Empty icon={MessageCircle}>Pick a conversation.</Empty> : (
          <>
            <header className="inbox-head">
              <CircleUserRound size={30} strokeWidth={1.25} aria-hidden="true" />
              <div>
                <b>{detail.user?.name || t.name || 'Guest'}</b>
                <div className="faint" style={{ fontSize: 13 }}>
                  {detail.user ? `${detail.user.member_no} · ${tierById(detail.user.tier).name}` : 'Not signed in'}
                  {(detail.user?.email || t.email) && <> · <a href={`mailto:${detail.user?.email || t.email}`} className="with-ic" style={{ color: 'inherit' }}><Mail size={12} strokeWidth={1.75} aria-hidden="true" />{detail.user?.email || t.email}</a></>}
                </div>
              </div>
              <span className="spacer" />
              {t.status !== 'closed' && <button className="btn btn-sm" onClick={close}>Close conversation</button>}
            </header>
            <div className="chat-list" ref={list}>
              {detail.messages.map((m) => m.sender === 'system' ? <p key={m.id} className="chat-system">{m.body}</p> : (
                <div key={m.id} className={`chat-row ${m.sender === 'user' ? 'them' : 'me'}`}>
                  {m.sender === 'user' && <span className="chat-avatar sm"><CircleUserRound size={24} strokeWidth={1.25} /></span>}
                  <div className={`bubble ${m.sender === 'user' ? 'bot' : m.sender === 'bot' ? 'user muted-bubble' : 'user'}`}>
                    <span className="who">{m.sender === 'user' ? 'Visitor' : m.sender === 'bot' ? 'Assistant' : m.meta?.agent || 'Team'} · {when(m.created_at)}</span>
                    {m.body.split('\n').map((l, i) => <span key={i} className="ln">{l || '\u00a0'}</span>)}
                  </div>
                  {m.sender !== 'user' && <span className="chat-avatar sm"><SpiderBadge size={26} /></span>}
                </div>
              ))}
            </div>
            <form className="chat-input" onSubmit={send}>
              <label htmlFor="reply" className="sr-only">Reply</label>
              <textarea id="reply" rows={2} placeholder="Reply as the club team…" value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e) }} />
              <button className="chat-send" aria-label="Send reply" disabled={busy || !reply.trim()}><Send size={17} strokeWidth={2} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
