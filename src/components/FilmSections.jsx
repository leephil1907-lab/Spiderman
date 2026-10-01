import { useState } from 'react'
import { Play, MonitorPlay, Disc3, CalendarPlus, Download, ArrowUpRight, Clapperboard, Laugh, Sparkles, Film, Users, Drama, Search, Shirt, Camera, Zap, Swords, BookOpen, ChevronDown } from 'lucide-react'
import { Reveal, Countdown } from './Motion'
import SocialLinks from './Social'
import { FILM, TRAILERS, HOME_RELEASE, CREDITS } from '../content/film'

/* ── Trailers: a facade (thumbnail) that loads the YouTube player only on click ── */
export function TrailerPlayer() {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const t = TRAILERS[idx]
  const pick = (i) => { setIdx(i); setPlaying(true) }
  return (
    <div className="trailer-player">
      <Reveal className="video tp-stage">
        {playing ? (
          <iframe key={t.id} src={`https://www.youtube-nocookie.com/embed/${t.id}?rel=0&autoplay=1`} title={`${FILM.title} — ${t.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <button className="tp-facade" onClick={() => setPlaying(true)} aria-label={`Play ${t.title}`}>
            <picture key={t.id}>
              <source srcSet={`/media/trailer-${t.id}.webp`} type="image/webp" />
              <img src={`/media/trailer-${t.id}.jpg`} alt="" width="1280" height="720" />
            </picture>
            <span className="tp-shade" aria-hidden="true" />
            <span className="tp-play" aria-hidden="true"><Play size={30} fill="currentColor" /></span>
            <span className="tp-label"><b>{t.title}</b><small>{t.sub}</small></span>
          </button>
        )}
      </Reveal>
      <div className="tp-list" role="tablist" aria-label="Official trailers">
        {TRAILERS.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === idx} className={`tp-item${i === idx ? ' on' : ''}`} onClick={() => pick(i)}>
            <span className="tp-thumb">
              <picture><source srcSet={`/media/trailer-${x.id}.webp`} type="image/webp" /><img src={`/media/trailer-${x.id}.jpg`} alt="" loading="lazy" width="1280" height="720" /></picture>
              <span className="tp-mini" aria-hidden="true"><Play size={14} fill="currentColor" /></span>
            </span>
            <span className="tp-meta"><b>{x.title}</b><small>{i === 0 ? 'Newest · ' : ''}{x.sub}</small></span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Calendar helpers (client-side .ics + Google Calendar link) ── */
const ymd = (iso) => iso.slice(0, 10).replace(/-/g, '')
const nextDay = (iso) => { const d = new Date(iso); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, '') }
function gcal(title, iso) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${ymd(iso)}/${nextDay(iso)}`, details: `${FILM.title} — ${HOME_RELEASE.buyUrl}` })
  return `https://calendar.google.com/calendar/render?${q}`
}
function downloadIcs(title, iso) {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BND Fan Club//EN', 'BEGIN:VEVENT', `UID:${ymd(iso)}-bnd@fanclub`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${ymd(iso)}`, `DTEND;VALUE=DATE:${nextDay(iso)}`, `SUMMARY:${title}`, `DESCRIPTION:${HOME_RELEASE.buyUrl}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const EXTRA_ICONS = [Laugh, Sparkles, Clapperboard, Search, Zap, Swords, BookOpen, Users, Film, Shirt, Camera]

export function AtHome() {
  const now = Date.now()
  const digitalOut = now >= new Date(HOME_RELEASE.digitalISO).getTime()
  const releases = [
    { key: 'digital', icon: MonitorPlay, label: 'Digital', date: HOME_RELEASE.digital, iso: HOME_RELEASE.digitalISO, cal: `${FILM.title} on Digital` },
    { key: 'disc', icon: Disc3, label: '4K Ultra HD · Blu-ray · DVD', date: HOME_RELEASE.disc, iso: HOME_RELEASE.discISO, cal: `${FILM.title} on 4K, Blu-ray & DVD` },
  ]
  return (
    <section className="section at-home" id="at-home">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Coming home</span>
          <h2 className="h-2">Own the brand new day.</h2>
          <p className="lede" style={{ marginTop: 12 }}>Sony Pictures Home Entertainment announced the home release on September 29, 2026, with more than ten behind-the-scenes extras.</p>
        </Reveal>
        <div className="ah-grid">
          {releases.map((r, i) => {
            const out = Date.now() >= new Date(r.iso).getTime()
            return (
              <Reveal key={r.key} delay={i * 90} className={`ah-card${i === 0 && !digitalOut ? ' is-next' : ''}`}>
                <div className="ah-top"><span className="ah-ic"><r.icon size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="ah-label">{r.label}</span>{out && <span className="tag hot">Available now</span>}</div>
                <b className="ah-date">{r.date}</b>
                {!out && <Countdown to={r.iso} />}
                <div className="row ah-actions">
                  {out
                    ? <a className="btn btn-sm btn-primary" href={HOME_RELEASE.buyUrl} target="_blank" rel="noopener noreferrer">Get it now<ArrowUpRight size={14} aria-hidden="true" /></a>
                    : <a className="btn btn-sm btn-primary" href={HOME_RELEASE.buyUrl} target="_blank" rel="noopener noreferrer">Pre-order<ArrowUpRight size={14} aria-hidden="true" /></a>}
                  {!out && <a className="btn btn-sm" href={gcal(r.cal, r.iso)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={14} aria-hidden="true" />Google</a>}
                  {!out && <button className="btn btn-sm" onClick={() => downloadIcs(r.cal, r.iso)}><Download size={14} aria-hidden="true" />Apple / Outlook</button>}
                </div>
              </Reveal>
            )
          })}
          <Reveal delay={180} className="ah-card ah-editions">
            <div className="ah-top"><span className="ah-ic"><Disc3 size={20} strokeWidth={1.75} aria-hidden="true" /></span><span className="ah-label">Collector editions</span></div>
            <ul>{HOME_RELEASE.editions.map((e) => <li key={e.name}><b>{e.name}</b><small>{e.note}</small></li>)}</ul>
          </Reveal>
        </div>

        <Reveal><div className="pw-head" style={{ marginTop: 44 }}><b>Bonus features</b><small>4K UHD, Blu-ray & Digital</small></div></Reveal>
        <ul className="extras">
          {HOME_RELEASE.extras.map((x, i) => {
            const Icon = EXTRA_ICONS[i % EXTRA_ICONS.length]
            return (
              <Reveal as="li" key={x.title} delay={(i % 4) * 60} className="extra">
                <span className="extra-ic"><Icon size={17} strokeWidth={1.75} aria-hidden="true" /></span>
                <span><small>{x.kind}</small><b>{x.title}</b><span className="muted">{x.note}</span></span>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export function FullCredits() {
  const [open, setOpen] = useState(false)
  return (
    <Reveal className={`credits${open ? ' open' : ''}`}>
      <button className="credits-toggle" aria-expanded={open} aria-controls="full-credits" onClick={() => setOpen((o) => !o)}>
        <Drama size={16} strokeWidth={1.75} aria-hidden="true" />Full credits & rating<ChevronDown size={16} className="credits-chev" aria-hidden="true" />
      </button>
      <div id="full-credits" className="credits-body" hidden={!open}>
        <dl className="credits-grid">
          {CREDITS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.map((n) => <span key={n}>{n}</span>)}</dd></div>)}
        </dl>
        <p className="credits-foot"><span className="tag">PG-13</span>{FILM.ratingReason}</p>
        <div className="credits-social"><span className="faint">Follow the film</span><SocialLinks /></div>
        <p className="faint" style={{ fontSize: 12, marginTop: 10 }}>MARVEL and all related character names: © & ™ 2026 MARVEL. Fan site, not affiliated with Sony Pictures or Marvel.</p>
      </div>
    </Reveal>
  )
}
