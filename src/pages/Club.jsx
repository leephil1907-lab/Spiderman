import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { hasTier, tierById } from '../../shared/tiers.js'
import { QUIZ } from '../content/film'
import { Field } from '../components/Field'
import Footer from '../components/Footer'
import { Lock, Heart, Trash2, Download, MapPin, CalendarDays, Users, Check, Trophy, IdCard, MessagesSquare, Brain, PartyPopper, Image as ImageIcon, BookLock, Orbit } from 'lucide-react'
import MemberCard from '../components/MemberCard'

const TABS = [
  { id: 'card', label: 'Member card', tier: 'free', icon: IdCard },
  { id: 'theories', label: 'Theory Board', tier: 'free', icon: MessagesSquare },
  { id: 'trivia', label: 'Trivia', tier: 'free', icon: Brain },
  { id: 'events', label: 'Watch parties', tier: 'webslinger', icon: PartyPopper },
  { id: 'wallpapers', label: 'Wallpapers', tier: 'webslinger', icon: ImageIcon },
  { id: 'vault', label: 'Spoiler Vault', tier: 'spidersense', icon: BookLock },
  { id: 'lounge', label: 'Multiverse Lounge', tier: 'multiverse', icon: Orbit },
]
const fmtDate = (s) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Locked({ needs }) {
  const t = tierById(needs)
  return (
    <div className="panel locked">
      <div className="lock-ic" aria-hidden="true"><Lock size={22} strokeWidth={1.5} /></div>
      <h3 className="h-2" style={{ fontSize: 24 }}>{t.name} members only</h3>
      <p className="muted" style={{ margin: '10px auto 22px', maxWidth: '44ch' }}>{t.tagline} Unlock {t.perks.slice(1).join(', ').toLowerCase()}.</p>
      <Link className="btn btn-primary" to={`/membership?plan=${t.id}`}>Upgrade to {t.name}</Link>
    </div>
  )
}

function Theories({ user }) {
  const [list, setList] = useState(null)
  const [f, setF] = useState({ title: '', body: '', spoiler: false })
  const [err, setErr] = useState({})
  const [open, setOpen] = useState({})
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => api('/club/theories').then((d) => setList(d.theories)), [])
  useEffect(() => { load() }, [load])
  const post = async (e) => {
    e.preventDefault(); setBusy(true); setErr({})
    try { await api('/club/theories', { method: 'POST', body: f }); setF({ title: '', body: '', spoiler: false }); load() }
    catch (e2) { setErr(e2.field ? { [e2.field]: e2.message } : { form: e2.message }) } finally { setBusy(false) }
  }
  const like = async (id) => { await api(`/club/theories/${id}/like`, { method: 'POST' }); load() }
  const del = async (id) => { if (confirm('Delete this theory?')) { await api(`/club/theories/${id}`, { method: 'DELETE' }); load() } }
  return (
    <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '0.8fr 1.2fr' }}>
      <form className="panel form" onSubmit={post} noValidate>
        <h3 style={{ fontSize: 20 }}>Post a theory</h3>
        {err.form && <div className="alert alert-error">{err.form}</div>}
        <Field label="Title" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} error={err.title} />
        <div className="field">
          <label htmlFor="tb">Your theory</label>
          <textarea id="tb" className="input" maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} aria-invalid={!!err.body} />
          {err.body && <div className="field-error">{err.body}</div>}
        </div>
        <label className="check"><input type="checkbox" checked={f.spoiler} onChange={(e) => setF({ ...f, spoiler: e.target.checked })} /> <span>Contains spoilers (blurred until tapped)</span></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post theory'}</button>
      </form>
      <div className="stack" aria-live="polite">
        {list === null && <p className="muted">Loading…</p>}
        {list?.length === 0 && <div className="panel"><p className="muted">No theories yet. Be the first to call it.</p></div>}
        {list?.map((t) => (
          <article key={t.id} className="theory">
            <h4>{t.title}</h4>
            <div className="meta">
              <span>{t.author}</span>
              {t.author_tier !== 'free' && <span className="tag hot">{tierById(t.author_tier).name}</span>}
              <span>{fmtDate(t.created_at)}</span>
              {!!t.spoiler && <span className="tag">Spoiler</span>}
            </div>
            <p className={`body ${t.spoiler && !open[t.id] ? 'hidden' : ''}`} onClick={() => setOpen({ ...open, [t.id]: true })}
              title={t.spoiler && !open[t.id] ? 'Tap to reveal spoiler' : undefined}>{t.body}</p>
            <div className="row">
              <button className="like with-ic" aria-pressed={!!t.liked} aria-label={`${t.liked ? 'Unlike' : 'Like'} (${t.likes})`} onClick={() => like(t.id)}><Heart size={15} strokeWidth={2} fill={t.liked ? 'currentColor' : 'none'} aria-hidden="true" />{t.likes}</button>
              {!!t.mine && <button className="btn btn-ghost btn-sm" onClick={() => del(t.id)}><Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />Delete</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Trivia() {
  const qs = useMemo(() => [...QUIZ].sort(() => Math.random() - 0.5), [])
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const [board, setBoard] = useState([])
  const [finished, setFinished] = useState(false)
  const loadBoard = () => api('/club/leaderboard').then((d) => setBoard(d.rows))
  useEffect(() => { loadBoard() }, [])
  const q = qs[i]
  const choose = (k) => { if (pick !== null) return; setPick(k); if (k === q.c) setScore((s) => s + 1) }
  const next = async () => {
    if (i + 1 < qs.length) { setI(i + 1); setPick(null); return }
    setFinished(true)
    await api('/club/quiz', { method: 'POST', body: { score, total: qs.length } })
    loadBoard()
  }
  const restart = () => { setI(0); setPick(null); setScore(0); setFinished(false) }
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="panel">
        {!finished ? (
          <>
            <div className="row" style={{ marginBottom: 12 }}><span className="faint">Question {i + 1} of {qs.length}</span><span className="spacer" /><span className="faint">Score {score}</span></div>
            <div className="progress"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
            <h3 style={{ fontSize: 22, marginTop: 22 }}>{q.q}</h3>
            <div className="quiz-opts">
              {q.a.map((a, k) => (
                <button key={a} className={`opt ${pick !== null && k === q.c ? 'right' : ''} ${pick === k && k !== q.c ? 'wrong' : ''}`} disabled={pick !== null} onClick={() => choose(k)}>{a}</button>
              ))}
            </div>
            {pick !== null && <div className="row" style={{ marginTop: 18 }}><span className="muted">{pick === q.c ? 'Correct.' : `It’s ${q.a[q.c]}.`}</span><span className="spacer" /><button className="btn btn-primary" onClick={next}>{i + 1 < qs.length ? 'Next' : 'See score'}</button></div>}
          </>
        ) : (
          <div className="locked" style={{ padding: 20 }}>
            <div className="h-display" style={{ fontSize: 64 }}>{score}/{qs.length}</div>
            <p className="muted" style={{ margin: '8px 0 20px' }}>{score === qs.length ? 'Perfect. Your spider-sense is working.' : score >= 7 ? 'Strong. Rewatch and come back for the perfect run.' : 'Not bad. The best score counts, so try again.'}</p>
            <button className="btn" onClick={restart}>Play again</button>
          </div>
        )}
      </div>
      <div className="panel">
        <h3 className="with-ic" style={{ fontSize: 20, marginBottom: 10 }}><Trophy size={18} strokeWidth={1.75} aria-hidden="true" />Global leaderboard</h3>
        {board.length === 0 ? <p className="muted">No scores yet.</p> : (
          <table className="lb"><thead><tr><th>#</th><th>Member</th><th>Best</th></tr></thead>
            <tbody>{board.map((r, k) => <tr key={k}><td>{k + 1}</td><td>{r.name} {r.tier !== 'free' && <span className="tag hot" style={{ marginLeft: 6 }}>{tierById(r.tier).name}</span>}</td><td>{r.best}/{r.total}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Events() {
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const load = () => api('/club/events').then((d) => setList(d.events))
  useEffect(() => { load() }, [])
  const rsvp = async (id) => { setErr(null); try { await api(`/club/events/${id}/rsvp`, { method: 'POST' }); load() } catch (e) { setErr(e.message) } }
  return (
    <div className="stack">
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <div className="events">
        {list?.map((e) => {
          const d = new Date(e.starts_at)
          const f = (o, tz = e.tz) => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...o }).format(d)
          const yours = f({ weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }, undefined)
          return (
            <div key={e.id} className="event">
              <div className="date-chip"><b>{f({ day: 'numeric' })}</b><span>{f({ month: 'short' })}</span></div>
              <div>
                <b>{e.title} · {e.city}</b>
                <p className="muted ev-meta" style={{ fontSize: 14 }}>
                  <span className="with-ic"><MapPin size={14} strokeWidth={1.75} aria-hidden="true" />{e.venue}</span>
                  <span className="with-ic"><CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />{f({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} local · {yours} your time</span>
                  <span className="with-ic"><Users size={14} strokeWidth={1.75} aria-hidden="true" />{e.going}/{e.capacity} going</span>
                </p>
                {!e.allowed && <span className="tag hot" style={{ marginTop: 6, display: 'inline-block' }}>{tierById(e.min_tier).name} only</span>}
              </div>
              {e.allowed ? (
                <button className={`btn btn-sm ${e.mine ? '' : 'btn-primary'}`} onClick={() => rsvp(e.id)} disabled={!e.mine && e.going >= e.capacity}>
                  {e.mine ? <><Check size={14} strokeWidth={2.5} aria-hidden="true" />Going · cancel</> : e.going >= e.capacity ? 'Full' : 'RSVP'}
                </button>
              ) : <Link className="btn btn-sm" to={`/membership?plan=${e.min_tier}`}>Upgrade</Link>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Gallery({ endpoint, render }) {
  const [data, setData] = useState(null)
  useEffect(() => { api(endpoint).then(setData).catch(() => setData({ items: [] })) }, [endpoint])
  if (!data) return <p className="muted">Loading…</p>
  if (!data.items?.length) return <div className="panel"><p className="muted">No content has been published here yet. Check back when the club team adds it.</p></div>
  return render(data.items)
}

export default function Club() {
  const { user } = useAuth()
  const [sp, setSp] = useSearchParams()
  const tab = TABS.find((t) => t.id === sp.get('tab')) || TABS[0]
  const welcome = sp.get('welcome') === '1', resetOk = sp.get('reset') === '1'
  const allowed = hasTier(user.tier, tab.tier)
  return (
    <>
      <main className="club" id="main">
        <div className="wrap">
          <div className="club-head">
            <div>
              <span className="eyebrow">Members area</span>
              <h1 className="h-2">Hey, {user.name.split(' ')[0]}.</h1>
            </div>
            <span className="status-pill"><i aria-hidden="true" />{tierById(user.tier).name}</span>
          </div>
          {welcome && <div className="alert alert-ok" role="status" style={{ marginBottom: 20 }}>Welcome to the club. Your member card is ready below.</div>}
          {resetOk && <div className="alert alert-ok" role="status" style={{ marginBottom: 20 }}>Password updated. You’re logged in, and every other device has been signed out.</div>}
          <div className="tabs" role="tablist" aria-label="Club sections">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className="tab" aria-selected={t.id === tab.id} onClick={() => setSp({ tab: t.id })}>
                <t.icon size={16} strokeWidth={1.75} aria-hidden="true" />{t.label}{!hasTier(user.tier, t.tier) && <Lock className="lock" size={12} strokeWidth={2} aria-label="locked" />}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={tab.label}>
            {!allowed ? <Locked needs={tab.tier} /> : (
              <>
                {tab.id === 'card' && <MemberCard user={user} locale={undefined} />}
                {tab.id === 'theories' && <Theories user={user} />}
                {tab.id === 'trivia' && <Trivia />}
                {tab.id === 'events' && <Events />}
                {tab.id === 'wallpapers' && (
                  <Gallery endpoint="/club/wallpapers" render={(items) => (
                    <div className="walls">{items.map((w) => (
                      <div key={w.title} className="wall">
                        <div className="thumb"><img src={w.src} alt="" /></div>
                        <div className="wb"><div><b style={{ fontSize: 14 }}>{w.title}</b><div className="faint" style={{ fontSize: 12 }}>{w.size}{w.placeholder ? ' · placeholder' : ''}</div></div>
                          <a className="btn btn-sm" href={w.src} download><Download size={14} strokeWidth={1.75} aria-hidden="true" />Download</a></div>
                      </div>
                    ))}</div>
                  )} />
                )}
                {tab.id === 'vault' && (
                  <Gallery endpoint="/club/vault" render={(items) => (
                    <div className="stack">{items.map((v) => (
                      <article key={v.title} className="panel">
                        <span className="eyebrow">{v.kicker}</span>
                        <h3 className="h-2" style={{ fontSize: 24 }}>{v.title}</h3>
                        {v.body.split(/\n\n+/).map((p, k) => <p key={k} className="muted" style={{ marginTop: 12 }}>{p}</p>)}
                        {v.placeholder && <p className="faint" style={{ fontSize: 12, marginTop: 14 }}>Placeholder: edit server/content/spoiler-vault.json</p>}
                      </article>
                    ))}</div>
                  )} />
                )}
                {tab.id === 'lounge' && (
                  <Gallery endpoint="/club/lounge" render={(items) => (
                    <div className="stack">{items.map((v) => (
                      <article key={v.title} className="panel">
                        <span className="eyebrow">{v.kicker}</span>
                        <h3 className="h-2" style={{ fontSize: 24 }}>{v.title}</h3>
                        {v.body.split(/\n\n+/).map((p, k) => <p key={k} className="muted" style={{ marginTop: 12 }}>{p}</p>)}
                        {v.placeholder && <p className="faint" style={{ fontSize: 12, marginTop: 14 }}>Placeholder: edit server/content/multiverse-lounge.json</p>}
                      </article>
                    ))}</div>
                  )} />
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
