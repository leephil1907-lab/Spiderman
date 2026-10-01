// Live support chat: instant assistant answers + hand-off to the club team.
// The launcher (club logo) can be dragged anywhere and snaps to the nearest side, so it
// never permanently covers content. Position is remembered. Arrow keys move it too.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Send, UserRound, ArrowRight, GripVertical, Ellipsis, LogOut, Mail } from 'lucide-react'
import { SpiderBadge } from './Brand'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSettings } from '../lib/settings'

const POS_KEY = 'bnd.chat.pos'
const SIZE = 56
const MARGIN = 16
const EVT = 'bnd:chat-open'
/** Open the chat from anywhere (optionally sending a first message). */
export const openChat = (text) => window.dispatchEvent(new CustomEvent(EVT, { detail: { text } }))

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
function loadPos() {
  try { const p = JSON.parse(localStorage.getItem(POS_KEY)); if (p && (p.side === 'left' || p.side === 'right') && typeof p.y === 'number') return p } catch { /* ignore */ }
  return { side: 'right', y: 1 } // y = 0..1 of the free vertical space (1 = bottom)
}
const WELCOME = (name) => ({
  id: 'welcome', sender: 'bot',
  body: `Hi${name ? ' ' + name.split(' ')[0] : ''}! I’m the BND Club assistant. I can answer questions about memberships, billing, your account, watch parties and the film, or connect you with a person from the club team.`,
  meta: { suggestions: ['Membership tiers', 'Payment methods', 'How do I cancel?', 'Talk to a person'] },
})

export default function SupportChat() {
  const { user } = useAuth()
  const loc = useLocation()
  const settings = useSettings()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(loadPos)
  const [drag, setDrag] = useState(null) // {x,y} while dragging
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [thread, setThread] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [menu, setMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState(null)
  const [err, setErr] = useState(null)
  const btn = useRef()
  const list = useRef()
  const input = useRef()
  const lastId = useRef(0)
  const pending = useRef(null)
  const dragState = useRef(null)
  const openRef = useRef(open)
  openRef.current = open

  // ── data ──
  const merge = useCallback((incoming, th) => {
    if (th !== undefined) setThread(th)
    if (!incoming?.length) return
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id))
    setMsgs((cur) => {
      const seen = new Set(cur.map((m) => m.id))
      return [...cur, ...incoming.filter((m) => !seen.has(m.id))]
    })
    if (!openRef.current && incoming.some((m) => m.sender === 'agent')) setUnread((n) => n + incoming.filter((m) => m.sender === 'agent').length)
  }, [])
  const load = useCallback(async () => {
    try {
      const d = await api('/support/thread')
      lastId.current = 0
      setMsgs([]); merge(d.messages, d.thread)
    } catch { /* offline */ }
  }, [merge])
  useEffect(() => { load() }, [load, user?.id])

  // live updates: fast while open, slow in the background when a person is handling the thread
  useEffect(() => {
    if (!thread || thread.status === 'closed') return
    if (!open && thread.status !== 'human') return
    const id = setInterval(async () => {
      if (document.hidden) return
      try { const d = await api(`/support/messages?after=${lastId.current}`); merge(d.messages, d.thread) } catch { /* ignore */ }
    }, open ? 4000 : 15000)
    return () => clearInterval(id)
  }, [open, thread, merge])

  const send = useCallback(async (body) => {
    body = String(body || '').trim()
    if (!body) return
    setErr(null)
    const temp = { id: `t${Date.now()}`, sender: 'user', body, temp: true }
    setMsgs((m) => [...m, temp]); setText('')
    setTyping(true)
    try {
      // the server recognises "talk to a person" (and similar) and hands the thread to the team
      const [d] = await Promise.all([
        api('/support/messages', { method: 'POST', body: { body } }),
        new Promise((r) => setTimeout(r, reduced() ? 0 : 550)), // a beat so replies don't feel robotic
      ])
      setMsgs((m) => m.filter((x) => x.id !== temp.id))
      merge(d.messages, d.thread)
    } catch (e) {
      setErr(e.message)
      setMsgs((m) => m.filter((x) => x.id !== temp.id)); setText(body)
    } finally { setTyping(false) }
  }, [merge])

  const leaveEmail = async (e) => {
    e.preventDefault(); setEmailErr(null)
    try { const d = await api('/support/handoff', { method: 'POST', body: { email } }); merge(d.messages, d.thread); setEmail('') }
    catch (e2) { setEmailErr(e2.message) }
  }
  const endChat = async () => {
    setMenu(false)
    try { await api('/support/close', { method: 'POST', body: {} }) } catch { /* ignore */ }
    setThread(null); setMsgs([]); lastId.current = 0
  }

  // open from elsewhere on the site
  useEffect(() => {
    const h = (e) => { setOpen(true); if (e.detail?.text) pending.current = e.detail.text }
    window.addEventListener(EVT, h)
    return () => window.removeEventListener(EVT, h)
  }, [])
  useEffect(() => {
    if (!open) return
    setUnread(0)
    if (pending.current) { const t = pending.current; pending.current = null; send(t) }
    setTimeout(() => input.current?.focus({ preventScroll: true }), 50)
  }, [open, send])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' }) }, [msgs, typing, open])
  useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  // ── position / dragging ──
  useLayoutEffect(() => {
    const r = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])
  const minY = 76 + (parseInt(document.documentElement.style.getPropertyValue('--ab-h')) || 0) // keep clear of the nav + announcement bar
  const maxY = vp.h - SIZE - MARGIN
  const restX = pos.side === 'left' ? MARGIN : vp.w - SIZE - MARGIN
  const restY = clamp(minY + pos.y * (maxY - minY), minY, maxY)
  const x = drag ? drag.x : restX
  const y = drag ? drag.y : restY
  const save = (p) => { setPos(p); try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ } }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    dragState.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y, moved: false, id: e.pointerId }
    btn.current.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const s = dragState.current
    if (!s) return
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy
    if (!s.moved && Math.hypot(dx, dy) < 6) return
    s.moved = true
    setDrag({ x: clamp(s.ox + dx, 4, vp.w - SIZE - 4), y: clamp(s.oy + dy, minY - 10, vp.h - SIZE - 4) })
  }
  const onPointerUp = (e) => {
    const s = dragState.current
    dragState.current = null
    try { btn.current.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    if (s?.moved && drag) {
      save({ side: drag.x + SIZE / 2 < vp.w / 2 ? 'left' : 'right', y: clamp((drag.y - minY) / Math.max(1, maxY - minY), 0, 1) })
      setDrag(null)
    } else if (s) setOpen((o) => !o)
  }
  const onKeyDown = (e) => {
    const step = 0.08
    if (e.key === 'ArrowLeft') { e.preventDefault(); save({ ...pos, side: 'left' }) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); save({ ...pos, side: 'right' }) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); save({ ...pos, y: clamp(pos.y - step, 0, 1) }) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); save({ ...pos, y: clamp(pos.y + step, 0, 1) }) }
  }

  if (settings && !settings.support.chatEnabled) return null

  // panel placement: same side as the launcher, opening towards the roomier half
  const mobile = vp.w < 560
  const panelH = Math.min(600, vp.h - 110)
  const above = y + SIZE / 2 > vp.h / 2
  const panelStyle = mobile ? undefined : {
    [pos.side]: MARGIN,
    top: above ? clamp(y - panelH - 12, 72, vp.h - panelH - 8) : clamp(y + SIZE + 12, 72, vp.h - panelH - 8),
    height: panelH,
  }
  const status = thread?.status === 'human' ? 'Club team · we’ll reply right here' : 'Assistant · replies instantly'
  const shown = msgs.length ? msgs : [WELCOME(user?.name)]
  const lastBot = [...shown].reverse().find((m) => m.sender !== 'user')
  const suggestions = !typing && thread?.status !== 'human' && lastBot?.meta?.suggestions?.length ? lastBot.meta.suggestions : []
  const needEmail = thread?.status === 'human' && !thread.hasEmail && !user

  return (
    <>
      <button
        ref={btn}
        className={`chat-launcher ${drag ? 'dragging' : ''} ${open ? 'is-open' : ''}`}
        style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
        aria-label={open ? 'Close support chat' : `Open support chat${unread ? ` (${unread} new)` : ''}. Drag or use arrow keys to move.`}
        aria-expanded={open}
        aria-controls="support-chat"
        title="Support chat · drag to move"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragState.current = null; setDrag(null) }}
        onKeyDown={onKeyDown}
        onClick={(e) => { if (e.detail === 0) setOpen((o) => !o) }} // keyboard Enter/Space
      >
        {open ? <X size={22} strokeWidth={2} /> : <SpiderBadge size={SIZE - 8} />}
        {!open && unread > 0 && <span className="chat-unread" aria-hidden="true">{unread}</span>}
        <span className="chat-grip" aria-hidden="true"><GripVertical size={12} strokeWidth={2} /></span>
      </button>

      {open && (
        <section id="support-chat" className={`chat-panel ${mobile ? 'sheet' : ''}`} style={panelStyle} role="dialog" aria-label="Support chat">
          <header className="chat-head">
            <span className="chat-avatar"><SpiderBadge size={36} /><i className="online" aria-hidden="true" /></span>
            <div className="chat-title"><b>BND Support</b><span>{status}</span></div>
            <span className="spacer" />
            <div className="chat-menu-wrap">
              <button className="icon-btn" aria-label="More options" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Ellipsis size={18} strokeWidth={1.75} /></button>
              {menu && (
                <div className="chat-menu" role="menu">
                  <button role="menuitem" onClick={() => { setMenu(false); send('Talk to a person') }} disabled={thread?.status === 'human'}><UserRound size={15} strokeWidth={1.75} aria-hidden="true" />Talk to a person</button>
                  <button role="menuitem" onClick={endChat} disabled={!thread}><LogOut size={15} strokeWidth={1.75} aria-hidden="true" />End chat</button>
                </div>
              )}
            </div>
            <button className="icon-btn" aria-label="Close chat" onClick={() => { setOpen(false); btn.current?.focus() }}><X size={18} strokeWidth={1.75} /></button>
          </header>

          <div className="chat-list" ref={list} aria-live="polite">
            {shown.map((m) => m.sender === 'system' ? (
              <p key={m.id} className="chat-system">{m.body}</p>
            ) : (
              <div key={m.id} className={`chat-row ${m.sender === 'user' ? 'me' : 'them'}`}>
                {m.sender !== 'user' && <span className="chat-avatar sm"><SpiderBadge size={26} /></span>}
                <div className={`bubble ${m.sender}`}>
                  {m.sender === 'agent' && <span className="who">{m.meta?.agent || 'Club team'} · Club team</span>}
                  {m.body.split('\n').map((l, i) => <span key={i} className="ln">{l || '\u00a0'}</span>)}
                  {m.meta?.link && (
                    <button className="bubble-link" onClick={() => { navigate(m.meta.link.href); if (mobile) setOpen(false) }}>
                      {m.meta.link.label}<ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {typing && <div className="chat-row them"><span className="chat-avatar sm"><SpiderBadge size={26} /></span><div className="bubble bot typing" aria-label="Assistant is typing"><i /><i /><i /></div></div>}
            {needEmail && (
              <form className="chat-email" onSubmit={leaveEmail}>
                <label htmlFor="chat-email" className="with-ic"><Mail size={14} strokeWidth={1.75} aria-hidden="true" />Where should we reply if you leave?</label>
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <input id="chat-email" className="input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} />
                  <button className="btn btn-sm btn-primary" disabled={!email}>Save</button>
                </div>
                {emailErr && <span className="err">{emailErr}</span>}
              </form>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="chat-chips">{suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
          )}
          {err && <p className="chat-err" role="alert">{err}</p>}
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <label htmlFor="chat-text" className="sr-only">Message</label>
            <textarea id="chat-text" ref={input} rows={1} maxLength={1500} placeholder={thread?.status === 'human' ? 'Message the club team…' : 'Ask a question…'}
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }} />
            <button className="chat-send" aria-label="Send" disabled={!text.trim() || typing}><Send size={17} strokeWidth={2} /></button>
          </form>
          <p className="chat-foot">Chats are saved to help us support you · <a href="/privacy">Privacy</a></p>
        </section>
      )}
    </>
  )
}
