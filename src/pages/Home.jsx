import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Play, Ticket, ArrowUpRight, EyeOff, MapPin, CalendarDays, Clapperboard, Clock, Users, Globe2, Images, ExternalLink } from 'lucide-react'
import ScrollFilm from '../components/ScrollFilm'
import TierCards, { BillingToggle } from '../components/TierCards'
import Footer from '../components/Footer'
import { SpiderMark, MarvelLogo } from '../components/Brand'
import PosterWall from '../components/PosterWall'
import { Reveal, Marquee, CountUp, Countdown, useSpotlight } from '../components/Motion'
import { FILM, CAST, TIMELINE, CINEMA_REGIONS, IMAX, regionForCountry } from '../content/film'
import { useAuth } from '../lib/auth'
import { useLocale } from '../lib/locale'
import { api } from '../lib/api'

const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('')

function CastCard({ c, i }) {
  const [shown, setShown] = useState(!c.reveal)
  const ref = useSpotlight()
  return (
    <Reveal delay={(i % 4) * 60}>
      <div ref={ref} className="cast-card spot">
        <div className="avatar" aria-hidden="true">{initials(c.name)}</div>
        <div>
          <b>{c.name}</b>
          {shown ? <span>{c.role}</span> : (
            <button className="reveal" onClick={() => setShown(true)} aria-label={`Reveal ${c.name}'s role (spoiler)`}>
              <span className="blur" aria-hidden="true">Hidden role name</span>
              <span className="hint with-ic"><EyeOff size={12} strokeWidth={2} aria-hidden="true" />Spoiler · tap</span>
            </button>
          )}
        </div>
      </div>
    </Reveal>
  )
}

function Stats() {
  const [s, setS] = useState(null)
  useEffect(() => { api('/stats').then(setS).catch(() => setS({ members: 0, countries: 0, cities: 0 })) }, [])
  return (
    <section className="stats" aria-label="By the numbers">
      <div className="wrap stats-grid">
        <div className="stat"><Clapperboard size={18} strokeWidth={1.75} aria-hidden="true" /><b>$<CountUp to={2.4} decimals={1} />B+</b><span>worldwide box office<small>{FILM.boxOfficeNote}</small></span></div>
        <div className="stat"><Clock size={18} strokeWidth={1.75} aria-hidden="true" /><b><CountUp to={145} /></b><span>minutes of Spider-Man</span></div>
        <div className="stat"><CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" /><b><CountUp to={10} /></b><span>years of Tom Holland’s Peter Parker</span></div>
        <div className="stat"><Globe2 size={18} strokeWidth={1.75} aria-hidden="true" /><b>{s ? <CountUp to={s.cities} /> : '—'}</b><span>cities hosting member watch parties</span></div>
      </div>
    </section>
  )
}

function FilmMedia() {
  return (
    <section className="section film-media" id="gallery">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Film media</span>
          <h2 className="h-2">See the new Spider-Man world.</h2>
          <p className="lede" style={{ marginTop: 12 }}>Official film media, trailer footage and promotional artwork from the current Spider-Man: Brand New Day campaign.</p>
        </Reveal>
        <div className="media-grid">
          <Reveal className="media-feature">
            <a href={FILM.trailerUrl} target="_blank" rel="noopener noreferrer" className="media-tile media-trailer" aria-label="Open the official Spider-Man: Brand New Day final trailer on YouTube">
              <img src={FILM.trailerThumbnail} alt="Spider-Man: Brand New Day final trailer thumbnail" loading="lazy" />
              <span className="media-overlay" aria-hidden="true"><span className="play"><Play size={24} fill="currentColor" /></span><b>Final Trailer</b><small>Peter’s Journey · Sony Pictures Entertainment</small></span>
            </a>
          </Reveal>
          <Reveal delay={80}>
            <a href={FILM.officialGalleryUrl} target="_blank" rel="noopener noreferrer" className="media-tile media-poster" aria-label="Open the official Spider-Man Brand New Day gallery">
              <img src="/media/bnd-ninjas.jpg" alt="Spider-Man: Brand New Day official poster artwork" loading="lazy" />
              <span className="media-overlay"><Images size={18} /><span><b>Official Gallery</b><small>Posters, trailers and film imagery</small></span><ArrowUpRight size={16} /></span>
            </a>
          </Reveal>
          <Reveal delay={140}>
            <a href={FILM.officialFilmUrl} target="_blank" rel="noopener noreferrer" className="media-source">
              <span className="media-source-icon"><ExternalLink size={20} /></span>
              <span><b>Official Sony Pictures film page</b><small>Current film details, gallery, trailer and cinema information.</small></span>
              <ArrowUpRight size={16} />
            </a>
          </Reveal>
        </div>
        <PosterWall />
      </div>
    </section>
  )
}

function NextParty() {
  const [events, setEvents] = useState(null)
  useEffect(() => { api('/events/upcoming').then((d) => setEvents(d.events)).catch(() => setEvents([])) }, [])
  if (!events?.length) return null
  const next = events[0]
  const fmt = (e, opts) => new Intl.DateTimeFormat(undefined, { timeZone: e.tz, ...opts }).format(new Date(e.starts_at))
  return (
    <section className="section" id="parties">
      <div className="wrap grid-2" style={{ alignItems: 'start' }}>
        <Reveal>
          <span className="eyebrow">Watch parties</span>
          <h2 className="h-2">Same film. Every time zone.</h2>
          <p className="lede" style={{ marginTop: 12 }}>Members rewatch together in cities around the world. Web-Slinger members can RSVP from the Club.</p>
          <div className="panel next-party" style={{ marginTop: 28 }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="tag hot">Next up</span>
              <span className="with-ic muted"><MapPin size={15} strokeWidth={1.75} aria-hidden="true" />{next.city}</span>
            </div>
            <h3 style={{ fontSize: 22, margin: '12px 0 4px' }}>{next.title}</h3>
            <p className="muted with-ic"><CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />{fmt(next, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</p>
            <Countdown to={next.starts_at} />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <ul className="party-list">
            {events.slice(1).map((e) => (
              <li key={e.id}>
                <span className="pl-date tabular">{fmt(e, { day: '2-digit', month: 'short' })}</span>
                <span className="pl-city">{e.city}</span>
                <span className="pl-time muted tabular">{fmt(e, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span>
              </li>
            ))}
          </ul>
          <Link className="btn" to="/club?tab=events" style={{ marginTop: 18 }}><Users size={16} strokeWidth={1.75} aria-hidden="true" />See all parties</Link>
        </Reveal>
      </div>
    </section>
  )
}

function WhereToWatch() {
  const { country } = useLocale()
  const [region, setRegion] = useState(() => regionForCountry(country))
  const r = CINEMA_REGIONS.find((x) => x.id === region)
  return (
    <section className="section" id="watch">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">Where to watch</span>
          <h2 className="h-2">On the biggest screen near you.</h2>
          <p className="lede" style={{ marginTop: 12 }}>Showtimes change week to week. Pick your region and check your nearest cinema for current listings.</p>
        </Reveal>
        <div className="seg" role="tablist" aria-label="Region">
          {CINEMA_REGIONS.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === region} className="seg-btn" onClick={() => setRegion(x.id)}>{x.name}</button>
          ))}
        </div>
        <div className="cinemas" role="tabpanel" aria-label={r.name}>
          {r.chains.map((c) => (
            <a key={c.name} className="btn" href={c.url} target="_blank" rel="noopener noreferrer">
              <Ticket size={16} strokeWidth={1.75} aria-hidden="true" />{c.name}<ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ))}
          <a className="btn btn-ghost" href={IMAX.url} target="_blank" rel="noopener noreferrer">{IMAX.name}<ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const loc = useLocation()
  const nav = useNavigate()
  const { user } = useAuth()
  const [interval, setBilling] = useState('month')
  useEffect(() => {
    if (!loc.hash) return
    const el = document.getElementById(loc.hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [loc.hash])

  return (
    <>
      <ScrollFilm />

      <Marquee className="ticker">
        {['HOLD ON', 'LET GO', 'BRAND NEW DAY', 'HOLD ON', 'LET GO', 'IN CINEMAS WORLDWIDE'].map((t, i) => (
          <span key={i} className="ticker-item">{t}<SpiderMark size={20} className="ticker-mark" /></span>
        ))}
      </Marquee>

      <main id="main">
        <section className="section" id="film">
          <div className="wrap grid-2">
            <Reveal>
              <span className="status-pill"><i aria-hidden="true" />{FILM.status}</span>
              <h2 className="h-display" style={{ marginTop: 22 }}>The world forgot.<br /><span className="muted">He didn’t.</span></h2>
              <div className="stack" style={{ marginTop: 26 }}>
                {FILM.synopsis.map((p, i) => <p key={i} className="lede">{p}</p>)}
              </div>
              <div className="row" style={{ marginTop: 30 }}>
                <a className="btn btn-primary" href="#watch"><Ticket size={16} strokeWidth={1.75} aria-hidden="true" />Where to watch</a>
                <a className="btn" href="#trailer"><Play size={16} strokeWidth={1.75} aria-hidden="true" />Watch the trailer</a>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="poster">
                {FILM.posterSrc ? <img src={FILM.posterSrc} alt={`${FILM.title} poster`} /> : (
                  <div className="poster-art" aria-hidden="true">
                    <SpiderMark size={520} className="poster-emblem" />
                    <div className="poster-logo"><MarvelLogo height={22} /></div>
                    <img src="/plate.png" alt="" />
                    <div className="poster-title"><small>SPIDER-MAN</small>BRAND<br />NEW DAY</div>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
          <div className="wrap">
            <Reveal>
              <dl className="facts">
                <div className="fact"><dt>Released</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(FILM.releaseISO))}<small>US date · varies by country</small></dd></div>
                <div className="fact"><dt>Director</dt><dd>{FILM.director}</dd></div>
                <div className="fact"><dt>Written by</dt><dd>{FILM.writers}</dd></div>
                <div className="fact"><dt>Music</dt><dd>{FILM.music}</dd></div>
                <div className="fact"><dt>Runtime · Rating</dt><dd>{FILM.runtime} · {FILM.rating}<small>US rating</small></dd></div>
                <div className="fact"><dt>Studios</dt><dd>{FILM.studios}</dd></div>
              </dl>
            </Reveal>
          </div>
        </section>

        <Stats />

        <section className="section" id="trailer">
          <div className="wrap">
            <Reveal>
              <span className="eyebrow">Final trailer</span>
              <h2 className="h-2" style={{ marginBottom: 28 }}>Watch it again. You know you will.</h2>
            </Reveal>
            <Reveal className="video">
              {FILM.trailerYouTubeId ? (
                <iframe src={`https://www.youtube-nocookie.com/embed/${FILM.trailerYouTubeId}?rel=0`} title={`${FILM.title} final trailer`} loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <div className="video-empty"><div><div className="play" aria-hidden="true"><Play size={26} strokeWidth={1.5} fill="currentColor" /></div><p className="muted">Trailer unavailable</p></div></div>
              )}
            </Reveal>
          </div>
        </section>

        <FilmMedia />

        <section className="section" id="cast">
          <div className="wrap">
            <Reveal>
              <span className="eyebrow">Cast</span>
              <h2 className="h-2">Who’s swinging back in.</h2>
              <p className="lede" style={{ marginTop: 12 }}>Some roles are blurred because they give the plot away. Tap one to reveal it.</p>
            </Reveal>
            <div className="cast">{CAST.map((c, i) => <CastCard key={c.name} c={c} i={i} />)}</div>
          </div>
        </section>

        <section className="section" id="timeline">
          <div className="wrap">
            <Reveal>
              <span className="eyebrow">The road here</span>
              <h2 className="h-2">Ten years of one kid from Queens.</h2>
            </Reveal>
            <ol className="timeline">
              {TIMELINE.map((t, i) => (
                <Reveal as="li" key={t.year} delay={i * 70} className={i === TIMELINE.length - 1 ? 'now' : ''}>
                  <span className="yr">{t.year}</span>
                  <div><b>{t.title}</b><p>{t.note}</p></div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <WhereToWatch />
        <NextParty />

        <section className="section" id="membership">
          <div className="wrap">
            <Reveal>
              <span className="eyebrow">Fan Club</span>
              <h2 className="h-2">Pick your level of spider-sense.</h2>
              <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
                <p className="lede">Four tiers, from free to the full Multiverse. One price worldwide, in US dollars.</p>
                <span className="spacer" />
                <BillingToggle value={interval} onChange={setBilling} />
              </div>
            </Reveal>
            <TierCards current={user?.tier} currentInterval={user?.billingInterval} interval={interval}
              onChoose={(t, iv) => nav(user ? `/membership?plan=${t.id}&billing=${iv}` : `/signup?plan=${t.id}&billing=${iv}`)} />
            <p style={{ marginTop: 20 }}><Link to="/membership" className="dash-link">Compare every tier in detail<ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" /></Link></p>
          </div>
        </section>

        <section className="section cta-band">
          <div className="wrap">
            <Reveal>
              <SpiderMark size={56} className="cta-mark" />
              <h2 className="h-display">Brand new day.<br /><span className="muted">Same neighborhood.</span></h2>
              <div className="row">
                {user ? <Link className="btn btn-primary" to="/dashboard">Go to your dashboard</Link> : <><Link className="btn btn-primary" to="/signup">Join free</Link><Link className="btn" to="/login">Log in</Link></>}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
