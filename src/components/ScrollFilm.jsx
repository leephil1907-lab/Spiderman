import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { P, ENV, OVERLAYS, gate, lin, gates, proveOverlap, toSp, clamp01 } from '../film'
import Figure from '../scene/Figure'
import Room from '../scene/Room'
import Web from '../scene/Web'
import CameraRig from '../scene/CameraRig'
import Post from '../scene/Post'

const DEBUG = new URLSearchParams(location.search).has('debug')

// overlay DOM registry — filled once on mount, written to directly every frame
const REG = []
// the film's own track — p is measured on THIS element, so the film can sit as
// one section of a longer page
const TRACK = { el: null }
const ease = (t) => t * t * (3 - 2 * t)

function writeOverlay(r, sp) {
  const [a0, a1, b0, b1] = r.win
  const op = gate(sp, a0, a1, b0, b1)
  const vis = op < 0.01 ? 'hidden' : 'visible'
  if (r.lastVis !== vis) { r.el.style.visibility = vis; r.lastVis = vis }
  if (vis === 'hidden') return
  r.el.style.opacity = op.toFixed(3)
  if (!r.chars.length) return
  const inRaw = lin(a0, a1, sp)
  const outRaw = lin(b0, b1, sp)
  const n = r.chars.length, den = Math.max(1, n - 1)
  for (let i = 0; i < n; i++) {
    // arrivals FRONT-TO-BACK (first letter first), resolving out of blur;
    // departures BACK-TO-FRONT (last letter first), blurring toward the lens.
    const qi = ease(clamp01((inRaw - (i / den) * 0.45) / 0.55))
    const qo = ease(clamp01((outRaw - ((n - 1 - i) / den) * 0.45) / 0.55))
    const z = (1 - qi) * 360 + qo * 460
    const y = (1 - qi) * -0.08 + qo * 0.06
    const blur = (1 - qi) * 14 + qo * 18
    const o = qi * (1 - qo)
    const key = ((z * 10) | 0) + ':' + ((blur * 10) | 0) + ':' + ((o * 1000) | 0)
    const c = r.chars[i]
    if (c._k === key) continue
    c._k = key
    c.style.transform = `translate3d(0,${y.toFixed(3)}em,${z.toFixed(1)}px)`
    c.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none'
    c.style.opacity = o.toFixed(3)
  }
}

/** The ONLY writer of P. Runs first every frame (priority −1), before any scene useFrame. */
function Driver({ debugEl }) {
  const g = useRef({})
  useFrame(() => {
    const el = TRACK.el
    if (!el) return
    const r = el.getBoundingClientRect()
    const max = r.height - window.innerHeight
    P.p = max > 0 ? clamp01(-r.top / max) : 0
    // off screen → Post skips the composer render (no GPU work below the fold)
    P.onscreen = r.bottom > 0 && r.top < window.innerHeight
    P.sp = toSp(P.p)
    for (const r of REG) writeOverlay(r, P.sp)
    if (DEBUG) {
      gates(P.p, g.current)
      window.__BND.live = { p: +P.p.toFixed(4), sp: +P.sp.toFixed(4), ...Object.fromEntries(Object.entries(g.current).map(([k, v]) => [k, +v.toFixed(3)])) }
      if (debugEl.current) {
        const live = Object.values(g.current).filter((v) => v > 0).length
        debugEl.current.textContent = `p ${P.p.toFixed(3)}  sp ${P.sp.toFixed(3)}  live ${live}\n` +
          Object.entries(g.current).map(([k, v]) => `${k.padEnd(7)}${'█'.repeat(Math.round(v * 12)).padEnd(12, '·')} ${v.toFixed(2)}`).join('\n')
      }
    }
  }, -1)
  return null
}

function Letters({ text }) {
  return text.split(' ').map((w, wi) => (
    <span className="word" key={wi}>
      {[...w].map((ch, i) => <span className="ch" key={i}>{ch}</span>)}
    </span>
  ))
}

function Overlays() {
  const root = useRef()
  useEffect(() => {
    REG.length = 0
    for (const ov of OVERLAYS) {
      const el = root.current.querySelector(`[data-ov="${ov.id}"]`)
      REG.push({ win: ov.win, el, chars: [...el.querySelectorAll('.ch')], lastVis: null })
    }
    // prime the first frame so nothing flashes before the canvas mounts
    for (const r of REG) writeOverlay(r, P.sp)
  }, [])
  const top = () => window.scrollTo({ top: (TRACK.el?.offsetTop || 0), behavior: ENV.reduced ? 'auto' : 'smooth' })
  return (
    <div ref={root}>
      {OVERLAYS.map((ov) => (
        <div key={ov.id} data-ov={ov.id} className={`ov ${ov.cue ? 'cue' : ''} ${ov.cls ? ov.cls.split(' ').filter((c) => c.startsWith('pos-')).join(' ') : ''}`} aria-hidden={ov.id !== 'title' && ov.id !== 'close'}>
          {ov.cue ? <i /> : ov.button ? (
            <div className="close-col">
              <h2 className={`line ${ov.cls}`} style={{ margin: 0 }}><Letters text={ov.text} /></h2>
              <div className="close-actions">
                <Link className="btn btn-primary" to="/membership">Join the Fan Club</Link>
                <button className="again" onClick={top} aria-label="Back to the start of the film">
                  <ArrowUp size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className={`line ${ov.cls.split(' ').filter((c) => !c.startsWith('pos-')).join(' ')}`} role={ov.id === 'title' ? 'heading' : undefined} aria-level={ov.id === 'title' ? 1 : undefined}>
              <Letters text={ov.text} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ScrollFilm() {
  const debugEl = useRef()
  const trackRef = useRef()
  useEffect(() => { TRACK.el = trackRef.current; return () => { TRACK.el = null } }, [])
  useEffect(() => {
    if (DEBUG) {
      window.__BND = { P, gates: (p = P.p) => gates(p), proveOverlap }
      const proof = proveOverlap()
      console.log('[BRAND NEW DAY] act handoff overlap', proof.pass ? 'PASS' : 'FAIL')
      console.table(proof.rows)
    }
    const move = (e) => {
      P.mx = (e.clientX / window.innerWidth) * 2 - 1
      P.my = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <section className="track" id="film-top" ref={trackRef} aria-label="Brand New Day — scroll film">
      <div className="stage">
        <div className="canvas-wrap">
          <Canvas
            dpr={[1, ENV.mobile ? 1 : 1.5]}
            gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
            camera={{ fov: 38, near: 0.1, far: 400, position: [0, 9, 34] }}
          >
            <Driver debugEl={debugEl} />
            <CameraRig />
            <Suspense fallback={null}>
              <Figure />
              <Room />
              <Web />
            </Suspense>
            <Post />
          </Canvas>
        </div>
        <Overlays />
        {DEBUG && (
          <pre ref={debugEl} style={{ position: 'absolute', left: 10, bottom: 10, margin: 0, font: '11px/1.35 ui-monospace,monospace', color: 'var(--color-text-muted)', pointerEvents: 'none', zIndex: 5 }} />
        )}
      </div>
    </section>
  )
}
