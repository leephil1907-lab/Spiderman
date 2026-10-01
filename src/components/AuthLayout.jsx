import { Fragment, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MarvelLogo, SpiderMark } from './Brand'

// Remembers the previous auth page so switching login ⇄ signup slides the form
// in the right direction while the art panel stays put instead of replaying its entrance.
let lastAuthPage = null
const ORDER = { login: 0, signup: 1, other: 2 }

// Web geometry for the art panel: radial spokes + concentric rings, drawn in with stroke-dashoffset.
const CX = 300, CY = 260, SPOKES = 14, RINGS = [60, 118, 182, 252, 330, 420]
const spokes = Array.from({ length: SPOKES }, (_, i) => {
  const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2
  return `M${CX} ${CY}L${(CX + Math.cos(a) * 560).toFixed(1)} ${(CY + Math.sin(a) * 560).toFixed(1)}`
})
const rings = RINGS.map((r, k) => {
  let d = ''
  for (let i = 0; i <= SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2
    const sag = i % SPOKES === 0 ? 0 : r * 0.07 // each segment sags slightly toward the centre
    const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r
    if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`
    else {
      const am = a - Math.PI / SPOKES
      d += `Q${(CX + Math.cos(am) * (r - sag)).toFixed(1)} ${(CY + Math.sin(am) * (r - sag)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
    }
  }
  return { d, k }
})

function Words({ text, base }) {
  const words = text.split(' ')
  return words.map((w, i) => (
    <Fragment key={i}><span className="aw"><span style={{ '--d': `${base + i * 0.07}s` }}>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>
  ))
}

/** Plays the exit motion, then resolves. Call before navigating away after a successful submit. */
export function authExit() {
  const el = document.querySelector('.auth')
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve()
  el.classList.add('auth-leaving')
  return new Promise((r) => setTimeout(r, 420))
}

export default function AuthLayout({ children, line1 = 'Hold on.', line2 = 'Let go.' }) {
  const { pathname } = useLocation()
  const page = pathname === '/signup' ? 'signup' : pathname === '/login' ? 'login' : 'other'
  const from = useRef(lastAuthPage).current
  const swap = from && from !== page
  const dir = swap ? (ORDER[page] > ORDER[from] ? 'fwd' : 'back') : 'in'
  const art = useRef(null)
  useEffect(() => { lastAuthPage = page }, [page])
  useEffect(() => () => { setTimeout(() => { if (!document.querySelector('.auth')) lastAuthPage = null }, 0) }, [])

  // Cursor parallax: written to CSS variables, no React re-render.
  useEffect(() => {
    const el = art.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)) })
    }
    const leave = () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0) }
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf) }
  }, [])

  return (
    <main className={`auth auth-${page} auth-${swap ? 'swap' : 'enter'} auth-dir-${dir}`} id="main" data-auth-page={page}>
      <div className="auth-art" ref={art} aria-hidden="true">
        <svg className="auth-web" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
          <g className="aw-spokes">{spokes.map((d, i) => <path key={i} d={d} pathLength="1" style={{ '--i': i }} />)}</g>
          <g className="aw-rings">{rings.map(({ d, k }) => <path key={k} d={d} pathLength="1" style={{ '--i': k }} />)}</g>
        </svg>
        <div className="auth-glow" />
        <div className="auth-beads">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
        <SpiderMark size={620} className="auth-emblem" />
        <div className="auth-logo"><MarvelLogo height={26} /></div>
        <div className="auth-fig">
          <span className="auth-thread" />
          <img className="auth-spider" src="/plate.png" alt="" />
        </div>
        <div className="quote" key={line1}><Words text={line1} base={0.55} /><br /><span className="muted-line"><Words text={line2} base={0.55 + line1.split(' ').length * 0.07 + 0.08} /></span></div>
        <div className="auth-scan" />
      </div>
      <div className="auth-main">
        <svg className="auth-web auth-web-m" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className="aw-spokes">{spokes.map((d, i) => <path key={i} d={d} pathLength="1" style={{ '--i': i }} />)}</g>
          <g className="aw-rings">{rings.map(({ d, k }) => <path key={k} d={d} pathLength="1" style={{ '--i': k }} />)}</g>
        </svg>
        <div className="auth-card" key={pathname}>{children}</div>
      </div>
    </main>
  )
}
