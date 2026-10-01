import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Megaphone, Ticket, CalendarDays, Clapperboard, Gift, Zap, Star, Globe, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react'
import { useSettings } from '../lib/settings'
import { SpiderMark } from './Brand'

export const AB_ICONS = { sparkles: Sparkles, megaphone: Megaphone, ticket: Ticket, calendar: CalendarDays, film: Clapperboard, gift: Gift, zap: Zap, star: Star, globe: Globe }
const CYCLE = ['flip', 'slide', 'blur', 'zoom', 'swing']
const H = 38
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function ItemLink({ item, children, className }) {
  if (!item.link) return <span className={className}>{children}</span>
  return /^https?:/i.test(item.link)
    ? <a className={className} href={item.link} target="_blank" rel="noopener noreferrer">{children}</a>
    : <Link className={className} to={item.link}>{children}</Link>
}
function Message({ item }) {
  const Icon = AB_ICONS[item.icon] || Sparkles
  return (
    <ItemLink item={item} className="ab-msg">
      <Icon className="ab-ic" size={15} strokeWidth={1.75} aria-hidden="true" />
      <span className="ab-text">{item.text}</span>
      {item.link && <span className="ab-cta">{item.linkLabel || 'Learn more'}<ArrowRight size={13} strokeWidth={2} aria-hidden="true" /></span>}
    </ItemLink>
  )
}

/**
 * Site-wide announcement bar. `config` comes from admin settings; `preview` renders it
 * inline (inside the control panel) instead of fixed to the top of the page.
 */
export function AnnouncementBarView({ config, preview = false, onDismiss }) {
  const items = config.items || []
  const [i, setI] = useState(0)
  const [prev, setPrev] = useState(null) // { index, fx } — the message animating out
  const [fxIn, setFxIn] = useState(null)
  const [paused, setPaused] = useState(false)
  const turn = useRef(0)
  const reduced = useMemo(reducedMotion, [])
  const n = items.length
  const idx = n ? i % n : 0

  useEffect(() => { setI(0); setPrev(null) }, [n, config.mode])

  const go = (dir) => {
    if (n < 2) return
    turn.current += 1
    const fx = reduced ? 'none' : config.transition === 'mix' ? CYCLE[turn.current % CYCLE.length] : config.transition
    setPrev({ index: idx, fx, dir })
    setFxIn({ fx, dir })
    setI((v) => (v + dir + n) % n)
  }

  if (!n) return null
  const theme = `ab-theme-${config.theme || 'scarlet'}`

  if (config.mode === 'marquee') {
    const loop = [...items, ...items]
    return (
      <div className={`ab ab-marquee ${theme} ${preview ? 'ab-preview' : ''}`} role="region" aria-label="Announcements">
        <div className="ab-track" style={{ animationDuration: `${config.speed || 40}s` }} data-reduced={reduced || undefined}>
          {loop.map((it, k) => (
            <span className="ab-mq-item" key={k} aria-hidden={k >= n || undefined}>
              <Message item={it} />
              <SpiderMark size={14} className="ab-sep" />
            </span>
          ))}
        </div>
        {config.dismissible && onDismiss && <button className="ab-btn ab-close" onClick={onDismiss} aria-label="Dismiss announcements"><X size={15} strokeWidth={2} /></button>}
      </div>
    )
  }

  const auto = !reduced && n > 1 && !paused
  return (
    <div className={`ab ab-rotate ${theme} ${preview ? 'ab-preview' : ''}`} role="region" aria-label="Announcements" aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="ab-web" aria-hidden="true" />
      {n > 1 && <button className="ab-btn ab-prev" onClick={() => go(-1)} aria-label="Previous announcement"><ChevronLeft size={16} strokeWidth={2} /></button>}
      <div className="ab-stage" aria-live={auto ? 'off' : 'polite'}>
        {prev && prev.fx !== 'none' && (
          <div key={`o${turn.current}`} className={`ab-slide ab-out fx-${prev.fx} ${prev.dir < 0 ? 'ab-rev' : ''}`} aria-hidden="true" onAnimationEnd={() => setPrev(null)}>
            <Message item={items[prev.index % n]} />
          </div>
        )}
        <div key={`i${turn.current}`} className={`ab-slide ab-in ${fxIn && fxIn.fx !== 'none' ? `fx-${fxIn.fx}` : ''} ${fxIn?.dir < 0 ? 'ab-rev' : ''}`}>
          <Message item={items[idx]} />
        </div>
        {turn.current > 0 && !reduced && <span key={`s${turn.current}`} className="ab-sheen" aria-hidden="true" />}
      </div>
      {n > 1 && <span className="ab-count" aria-hidden="true">{idx + 1}/{n}</span>}
      {n > 1 && <button className="ab-btn ab-next" onClick={() => go(1)} aria-label="Next announcement"><ChevronRight size={16} strokeWidth={2} /></button>}
      {config.dismissible && onDismiss && <button className="ab-btn ab-close" onClick={onDismiss} aria-label="Dismiss announcements"><X size={15} strokeWidth={2} /></button>}
      {n > 1 && !reduced && (
        // the progress bar *is* the timer: when its CSS animation ends we advance, so hover-pause is free
        <span key={`p${turn.current}`} className="ab-progress" aria-hidden="true"
          style={{ animationDuration: `${config.interval || 5}s`, animationPlayState: auto ? 'running' : 'paused' }}
          onAnimationEnd={() => go(1)} />
      )}
    </div>
  )
}

export default function AnnouncementBar() {
  const settings = useSettings()
  const cfg = settings?.announcement
  const key = `bnd.ab.dismissed`
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(key) } catch { return null } })
  const show = !!(cfg?.enabled && cfg.items?.length && dismissed !== String(cfg.version))

  // publish the bar height so the nav and page paddings move down with it
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--ab-h', show ? `${H}px` : '0px')
    return () => document.documentElement.style.setProperty('--ab-h', '0px')
  }, [show])

  if (!show) return null
  const dismiss = () => { try { localStorage.setItem(key, String(cfg.version)) } catch { /* private mode */ } setDismissed(String(cfg.version)) }
  return <AnnouncementBarView config={cfg} onDismiss={dismiss} />
}
