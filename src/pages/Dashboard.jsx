import MemberNav from '../components/MemberNav'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MessagesSquare, Heart, Brain, Ticket, CalendarDays, MapPin, Lock, Check, ChevronRight, Settings, CreditCard,
  IdCard, MonitorPlay, Play, Image as ImageIcon, BookLock, Orbit, PartyPopper, PenLine, UserPlus, Sparkles, LifeBuoy, Circle, CircleCheck,
} from 'lucide-react'
import { StatusPill } from './Tickets'
import Footer from '../components/Footer'
import { Reveal, Countdown, CountUp } from '../components/Motion'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { countryName, useLocale } from '../lib/locale'
import { TIERS, tierById, priceOf, hasTier } from '../../shared/tiers.js'
import { formatMoney } from '../../shared/currency.js'
import { openChat } from '../components/SupportChat'
import MemberCard from '../components/MemberCard'
import { HOME_RELEASE } from '../content/film'

const AREAS = [
  { id: 'card', label: 'Member card', tier: 'free', icon: IdCard },
  { id: 'theories', label: 'Theory Board', tier: 'free', icon: MessagesSquare },
  { id: 'trivia', label: 'Trivia', tier: 'free', icon: Brain },
  { id: 'events', label: 'Watch parties', tier: 'webslinger', icon: PartyPopper },
  { id: 'wallpapers', label: 'Wallpapers', tier: 'webslinger', icon: ImageIcon },
  { id: 'vault', label: 'Spoiler Vault', tier: 'spidersense', icon: BookLock },
  { id: 'lounge', label: 'Multiverse Lounge', tier: 'multiverse', icon: Orbit },
]
const ACT = {
  joined: [UserPlus, (a) => `Joined the club · ${a.label}`],
  theory: [PenLine, (a) => `Posted a theory: “${a.label}”`],
  payment: [CreditCard, (a) => (a.amount ? `${tierById(a.label).name} · ${formatMoney(a.amount)}/${a.interval === 'year' ? 'yr' : 'mo'}` : `Switched to ${tierById(a.label).name}`)],
  rsvp: [Ticket, (a) => `RSVP’d: ${a.label}`],
  quiz: [Brain, (a) => `Trivia best score ${a.label}`],
}
const toDate = (s) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
function ago(s) {
  const d = (Date.now() - toDate(s).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (d < 60) return rtf.format(-Math.round(d), 'second')
  if (d < 3600) return rtf.format(-Math.round(d / 60), 'minute')
  if (d < 86400) return rtf.format(-Math.round(d / 3600), 'hour')
  return rtf.format(-Math.round(d / 86400), 'day')
}

export default function Dashboard() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const [sp] = useSearchParams()
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)) }, [user.tier])

  const t = tierById(user.tier)
  const digitalOut = Date.now() >= new Date(HOME_RELEASE.digitalISO).getTime()
  const next = TIERS.find((x) => x.rank === t.rank + 1)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const s = d?.stats
  const steps = d ? [
    ['Add your country', !!user.country, '/account'],
    ['Post your first theory', s.theories > 0, '/club?tab=theories'],
    ['Take the trivia challenge', s.quizBest !== null, '/club?tab=trivia'],
    ['RSVP to a watch party', s.rsvps > 0, hasTier(user.tier, 'webslinger') ? '/club?tab=events' : '/membership?plan=webslinger'],
  ] : []
  const doneSteps = steps.filter((x) => x[1]).length
  const fmtEv = (e, o) => new Intl.DateTimeFormat(undefined, { timeZone: e.tz, ...o }).format(new Date(e.starts_at))

  return (
    <>
      <main className="club dash" id="main">
        <MemberNav />
        <div className="wrap">
          <Reveal className="dash-head dash-hero">
            <div className="dash-hero-art" aria-hidden="true"><img src="/media/bnd-ninjas.jpg" alt="" /><img className="dash-hero-fig" src="/plate.png" alt="" /></div>
            <div>
              <span className="eyebrow">Your dashboard</span>
              <h1 className="h-2">{greet}, {user.name.split(' ')[0]}.</h1>
              <p className="muted" style={{ marginTop: 6 }}>Member {user.memberNo} · {t.level} {t.name}{user.country ? ` · ${countryName(user.country)}` : ''}</p>
            </div>
            <div className="row">
              <Link className="btn btn-sm" to="/account"><Settings size={15} strokeWidth={1.75} aria-hidden="true" />Account settings</Link>
              <Link className="btn btn-sm btn-primary" to="/club">Open the Club<ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" /></Link>
            </div>
          </Reveal>

          {sp.get('welcome') && (
            <div className="alert alert-ok with-ic" role="status" style={{ marginTop: 22 }}>
              <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" /><span>Welcome to the club! Your member card is ready. Start with the checklist below.</span>
            </div>
          )}
          {err && <div className="alert alert-error" role="alert" style={{ marginTop: 22 }}>{err}</div>}

          <div className="dash-grid">
            {/* member card + plan */}
            <Reveal className="dash-card span-2">
              <div className="dash-plan">
                <MemberCard user={user} locale={locale} />
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="tier-level">{t.level}</span>
                    <span className="status-pill"><i aria-hidden="true" />{t.name}</span>
                  </div>
                  {t.rank > 0 && user.billingInterval ? (
                    <p className="muted"><b className="tabular" style={{ color: 'var(--color-text)', fontSize: 22 }}>{formatMoney(priceOf(t.id, user.billingInterval))}</b> / {user.billingInterval}
                      <br />Renews {toDate(user.renewsAt).toLocaleDateString(locale, { dateStyle: 'long' })}</p>
                  ) : <p className="muted">Free plan · no card on file</p>}
                  {next ? (
                    <div className="upsell">
                      <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800 }}>Next tier</span>
                      <b>{next.name} · {formatMoney(next.price.month)}/mo</b>
                      <span className="muted" style={{ fontSize: 14 }}>{next.perks[1]}</span>
                      <Link className="btn btn-sm btn-primary" to={`/membership?plan=${next.id}`} style={{ marginTop: 6, alignSelf: 'start' }}>Upgrade to {next.name}</Link>
                    </div>
                  ) : <p className="with-ic" style={{ color: 'var(--ok)' }}><CircleCheck size={16} strokeWidth={2} aria-hidden="true" />You have every perk in the club.</p>}
                </div>
              </div>
            </Reveal>

            {/* checklist */}
            <Reveal className="dash-card" delay={80}>
              <div className="row"><h2 className="dash-h">Get started</h2><span className="spacer" /><span className="faint tabular" style={{ fontSize: 13 }}>{doneSteps}/{steps.length || 4}</span></div>
              <div className="progress" aria-hidden="true"><i style={{ width: `${(doneSteps / (steps.length || 4)) * 100}%` }} /></div>
              <ul className="checklist">
                {steps.map(([label, ok, href]) => (
                  <li key={label} className={ok ? 'ok' : ''}>
                    {ok ? <CircleCheck size={18} strokeWidth={2} aria-hidden="true" /> : <Circle size={18} strokeWidth={1.5} aria-hidden="true" />}
                    {ok ? <span>{label}</span> : <Link to={href}>{label}</Link>}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* stats */}
            <div className="dash-stats span-3">
              {[
                [MessagesSquare, 'Theories posted', s?.theories],
                [Heart, 'Likes received', s?.likesReceived],
                [Brain, s?.quizRank ? `Trivia best · #${s.quizRank} worldwide` : 'Trivia best', s?.quizBest, s?.quizTotal],
                [Ticket, 'Upcoming RSVPs', s?.rsvps],
              ].map(([Icon, label, v, of]) => (
                <div key={label} className="stat">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <b>{v === undefined ? '—' : v === null ? '—' : <><CountUp to={v} />{of ? <small className="of">/{of}</small> : null}</>}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* film at home */}
            <Reveal className="dash-card span-3 dash-film">
              <span className="dash-film-ic"><MonitorPlay size={20} strokeWidth={1.75} aria-hidden="true" /></span>
              <div className="dash-film-t">
                <span className="faint" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800 }}>Brand New Day at home</span>
                <b>{digitalOut ? 'Out now on Digital' : `On Digital ${HOME_RELEASE.digital}`} · 4K, Blu-ray & DVD {HOME_RELEASE.disc}</b>
              </div>
              {!digitalOut && <Countdown to={HOME_RELEASE.digitalISO} />}
              <div className="row">
                <Link className="btn btn-sm" to="/#at-home">Extras & editions</Link>
                <Link className="btn btn-sm" to="/#trailer"><Play size={14} aria-hidden="true" />Trailers</Link>
              </div>
            </Reveal>

            {/* events */}
            <Reveal className="dash-card span-2">
              <div className="row"><h2 className="dash-h">Your watch parties</h2><span className="spacer" /><Link className="dash-link" to="/club?tab=events">All parties<ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" /></Link></div>
              {d?.myEvents?.length ? (
                <ul className="party-list">
                  {d.myEvents.map((e) => (
                    <li key={e.id}>
                      <span className="pl-date tabular">{fmtEv(e, { day: '2-digit', month: 'short' })}</span>
                      <span className="pl-city">{e.title} · {e.city}</span>
                      <span className="pl-time muted tabular">{fmtEv(e, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span>
                    </li>
                  ))}
                </ul>
              ) : d?.nextEvent ? (
                <div className="next-party" style={{ marginTop: 6 }}>
                  <p className="muted">No RSVPs yet. The next party you can join:</p>
                  <h3 style={{ fontSize: 19, margin: '10px 0 4px' }}>{d.nextEvent.title}</h3>
                  <p className="muted ev-meta">
                    <span className="with-ic"><MapPin size={14} strokeWidth={1.75} aria-hidden="true" />{d.nextEvent.city}</span>
                    <span className="with-ic"><CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />{fmtEv(d.nextEvent, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span>
                  </p>
                  <Countdown to={d.nextEvent.starts_at} />
                  <Link className="btn btn-sm btn-primary" to="/club?tab=events" style={{ marginTop: 16 }}>RSVP now</Link>
                </div>
              ) : (
                <div className="dash-empty">
                  <Lock size={20} strokeWidth={1.5} aria-hidden="true" />
                  <p className="muted">Watch parties start at <b style={{ color: 'var(--color-text)' }}>Web-Slinger</b> ({formatMoney(tierById('webslinger').price.month)}/mo).</p>
                  <Link className="btn btn-sm" to="/membership?plan=webslinger">See Web-Slinger</Link>
                </div>
              )}
            </Reveal>

            {/* access */}
            <Reveal className="dash-card" delay={80}>
              <h2 className="dash-h">Your access</h2>
              <ul className="access">
                {AREAS.map((a) => {
                  const ok = hasTier(user.tier, a.tier)
                  return (
                    <li key={a.id}>
                      <Link to={ok ? `/club?tab=${a.id}` : `/membership?plan=${a.tier}`} className={ok ? '' : 'locked-row'}>
                        <a.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                        <span>{a.label}</span>
                        {ok ? <Check size={15} strokeWidth={2.25} className="yes" aria-label="Unlocked" /> : <span className="need"><Lock size={12} strokeWidth={2} aria-hidden="true" />{tierById(a.tier).name}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Reveal>

            {/* activity */}
            <Reveal className="dash-card span-2">
              <h2 className="dash-h">Recent activity</h2>
              <ul className="activity">
                {(d?.activity || []).map((a, i) => {
                  const [Icon, text] = ACT[a.kind] || [Circle, () => a.label]
                  return (
                    <li key={i}>
                      <span className="act-ic"><Icon size={15} strokeWidth={1.75} aria-hidden="true" /></span>
                      <span className="act-text">{text(a)}</span>
                      <time className="faint" dateTime={toDate(a.at).toISOString()}>{ago(a.at)}</time>
                    </li>
                  )
                })}
              </ul>
            </Reveal>

            {/* support */}
            <Reveal className="dash-card" delay={80}>
              <h2 className="dash-h with-ic"><LifeBuoy size={18} strokeWidth={1.75} aria-hidden="true" />Help & support</h2>
              {d?.support ? (
                <p className="muted" style={{ marginTop: 10 }}>You have an open conversation ({d.support.status === 'human' ? 'with the club team' : 'with the assistant'}), updated {ago(d.support.updated_at)}.</p>
              ) : <p className="muted" style={{ marginTop: 10 }}>Questions about billing, your account or events? Get an instant answer, or talk to the club team.{t.id === 'multiverse' ? ' You get priority support.' : ''}</p>}
              {d?.tickets?.length > 0 && (
                <ul className="dash-tickets">
                  {d.tickets.map((tk) => (
                    <li key={tk.ref}><Link to="/tickets"><span className="dash-tk-sub">{tk.subject}</span><StatusPill status={tk.status} /></Link></li>
                  ))}
                </ul>
              )}
              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn btn-sm btn-primary" onClick={() => openChat()}>{d?.support ? 'Continue chat' : 'Start a chat'}</button>
                <Link className="btn btn-sm" to="/tickets">My tickets</Link>
                <Link className="btn btn-sm" to="/help">Help centre</Link>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
