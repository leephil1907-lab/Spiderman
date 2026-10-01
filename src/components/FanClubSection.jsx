import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, IdCard, Unlock, MessagesSquare, Brain, PartyPopper, Image as ImageIcon, BookLock, Orbit, LayoutDashboard, ArrowRight, Check, Lock, Users, Globe2, MapPin } from 'lucide-react'
import { Reveal, CountUp } from './Motion'
import MemberCard from './MemberCard'
import { api } from '../lib/api'
import { tierById, hasTier } from '../../shared/tiers.js'

const STEPS = [
  { icon: UserPlus, t: 'Join free', d: 'One minute, no card. Worldwide.' },
  { icon: IdCard, t: 'Get your card', d: 'A numbered digital member card, instantly.' },
  { icon: Unlock, t: 'Unlock more', d: 'Upgrade any time for parties and the Vault.' },
]
const AREAS = [
  { id: 'theories', icon: MessagesSquare, t: 'Theory Board', d: 'Post and vote on theories', tier: 'free' },
  { id: 'trivia', icon: Brain, t: 'Trivia', d: 'Global leaderboard', tier: 'free' },
  { id: 'events', icon: PartyPopper, t: 'Watch parties', d: 'RSVP in cities worldwide', tier: 'webslinger' },
  { id: 'wallpapers', icon: ImageIcon, t: 'Wallpapers', d: 'Desktop & phone packs', tier: 'webslinger' },
  { id: 'vault', icon: BookLock, t: 'Spoiler Vault', d: 'Deep dives, spoilers inside', tier: 'spidersense' },
  { id: 'lounge', icon: Orbit, t: 'Multiverse Lounge', d: 'Live Q&A and drops', tier: 'multiverse' },
]
const SAMPLE = { name: 'Your Name', memberNo: 'BND-000000-FC', tier: 'webslinger', createdAt: new Date().toISOString(), renewsAt: null, email: 'you@example.com' }

export default function FanClubSection({ user, locale, children }) {
  const [s, setS] = useState(null)
  useEffect(() => { api('/stats').then(setS).catch(() => setS(null)) }, [])
  const t = user ? tierById(user.tier) : null
  return (
    <section className="section fanclub" id="fanclub">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Fan Club</span>
          <h2 className="h-2">The club for people who remember.</h2>
          <p className="lede" style={{ marginTop: 12 }}>Theories, trivia, watch parties and the Spoiler Vault, with your own member card and personal dashboard.</p>
        </Reveal>

        <div className="fc-grid">
          <div className="fc-left">
            {user ? (
              <Reveal className="fc-you">
                <span className="faint fc-k">Signed in as member {user.memberNo}</span>
                <h3>Welcome back, {user.name.split(' ')[0]}.</h3>
                <p className="muted">{t.level} · {t.name} plan</p>
                <div className="row" style={{ marginTop: 14 }}>
                  <Link className="btn btn-primary btn-sm" to="/dashboard"><LayoutDashboard size={15} aria-hidden="true" />Open your dashboard</Link>
                  <Link className="btn btn-sm" to="/club">Enter the Club<ArrowRight size={15} aria-hidden="true" /></Link>
                </div>
              </Reveal>
            ) : (
              <ol className="fc-steps">
                {STEPS.map((x, i) => (
                  <Reveal as="li" key={x.t} delay={i * 80}>
                    <span className="fc-step-n">{i + 1}</span>
                    <x.icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span><b>{x.t}</b><small>{x.d}</small></span>
                  </Reveal>
                ))}
              </ol>
            )}

            <ul className="fc-areas">
              {AREAS.map((a, i) => {
                const ok = user ? hasTier(user.tier, a.tier) : a.tier === 'free'
                const to = user ? (ok ? `/club?tab=${a.id}` : `/membership?plan=${a.tier}`) : `/signup${a.tier === 'free' ? '' : `?plan=${a.tier}`}`
                return (
                  <Reveal as="li" key={a.id} delay={(i % 3) * 60}>
                    <Link to={to} className={`fc-area${ok ? ' ok' : ''}`}>
                      <span className="fc-area-ic"><a.icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>
                      <span className="fc-area-t"><b>{a.t}</b><small>{a.d}</small></span>
                      <span className="fc-area-tier">{ok ? <Check size={14} strokeWidth={2.25} aria-label="Included" /> : <><Lock size={11} aria-hidden="true" />{tierById(a.tier).name}</>}</span>
                    </Link>
                  </Reveal>
                )
              })}
            </ul>

            {s && s.members >= 100 && (
              <Reveal className="fc-stats">
                <span><Users size={15} aria-hidden="true" /><b><CountUp to={s.members} /></b> members</span>
                <span><Globe2 size={15} aria-hidden="true" /><b><CountUp to={s.countries} /></b> countries</span>
                <span><MapPin size={15} aria-hidden="true" /><b><CountUp to={s.cities} /></b> party cities</span>
              </Reveal>
            )}
          </div>

          <Reveal delay={120} className="fc-card">
            <div className="fc-card-glow" aria-hidden="true" />
            <MemberCard user={user || SAMPLE} locale={locale} />
            <p className="faint fc-card-note">{user ? 'Your card. Tap to flip it.' : 'Every member gets a numbered card like this. Tap to flip it.'}</p>
            {!user && <Link className="btn btn-primary" to="/signup">Join the club, free<ArrowRight size={16} aria-hidden="true" /></Link>}
          </Reveal>
        </div>

        <div id="membership" className="fc-tiers">{children}</div>
      </div>
    </section>
  )
}
