// In-house motion components (no extra deps). Everything respects
// prefers-reduced-motion and only animates transform / opacity / filter.
import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fade-up-and-sharpen when the element first enters the viewport. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (reduced()) { setShown(true); return }
    const el = ref.current
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal-in ${shown ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>{children}</Tag>
}

/** Infinite horizontal ticker. Content is duplicated once for a seamless loop. */
export function Marquee({ children, speed = 38, className = '' }) {
  return (
    <div className={`marquee ${className}`} style={{ '--speed': `${speed}s` }} aria-hidden="true">
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group">{children}</div>
      </div>
    </div>
  )
}

/** Counts up to `to` once visible. Formats with Intl in the user's locale. */
export function CountUp({ to, decimals = 0, prefix = '', suffix = '', duration = 1600 }) {
  const ref = useRef()
  const [v, setV] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (reduced()) { setV(to); return }
    let raf
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration)
        setV(to * (1 - Math.pow(1 - k, 4)))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [to, duration])
  const n = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v)
  return <span ref={ref} className="tabular">{prefix}{n}{suffix}</span>
}

/** Cursor spotlight: sets --mx/--my on the element; CSS paints the glow. */
export function useSpotlight() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || window.matchMedia('(pointer: coarse)').matches) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])
  return ref
}

/** Live countdown to an ISO date. */
export function Countdown({ to }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  let s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000))
  const d = Math.floor(s / 86400); s -= d * 86400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  const cell = (n, l) => <div className="cd-cell"><b className="tabular">{String(n).padStart(2, '0')}</b><span>{l}</span></div>
  return <div className="countdown" role="timer" aria-label={`${d} days ${h} hours ${m} minutes`}>{cell(d, 'days')}{cell(h, 'hrs')}{cell(m, 'min')}{cell(s, 'sec')}</div>
}
