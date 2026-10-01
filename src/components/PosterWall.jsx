import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { Reveal } from './Motion'

export const BND_POSTERS = [
  { id: 'bnd-reflection', title: 'Reflection', alt: 'Spider-Man: Brand New Day official poster — Peter Parker reflected in the Spider-Man mask' },
  { id: 'bnd-hoodie', title: 'Hoodie', alt: 'Spider-Man: Brand New Day official poster — Spider-Man in a hoodie over the suit' },
  { id: 'bnd-dive', title: 'Dive', alt: 'Spider-Man: Brand New Day official poster — Spider-Man diving between skyscrapers' },
  { id: 'bnd-ninjas', title: 'Street Level', alt: 'Spider-Man: Brand New Day official poster — Spider-Man facing ninjas' },
]
export const SAGA = [
  { id: 'homecoming', year: 2017, title: 'Homecoming', alt: 'Spider-Man: Homecoming official poster' },
  { id: 'far-from-home', year: 2019, title: 'Far From Home', alt: 'Spider-Man: Far From Home official poster' },
  { id: 'no-way-home', year: 2021, title: 'No Way Home', alt: 'Spider-Man: No Way Home official poster' },
  { id: 'bnd-hoodie', year: 2026, title: 'Brand New Day', alt: 'Spider-Man: Brand New Day official poster', now: true },
]

export function Poster({ id, alt, eager }) {
  return (
    <picture>
      <source srcSet={`/media/${id}.webp`} type="image/webp" />
      <img src={`/media/${id}.jpg`} alt={alt} width="900" height="1350" loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  )
}

// Pointer-driven 3D tilt, written straight to CSS vars (no React re-render).
function tilt(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
  el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${(x * 11).toFixed(2)}deg`)
  el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`)
  el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`)
}
function untilt(e) { const s = e.currentTarget.style; s.setProperty('--rx', '0deg'); s.setProperty('--ry', '0deg') }

function Lightbox({ list, index, onClose, onStep }) {
  const ref = useRef(null)
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onStep(1); if (e.key === 'ArrowLeft') onStep(-1) }
    window.addEventListener('keydown', k); ref.current?.focus()
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = o }
  }, [onClose, onStep])
  const p = list[index]
  return (
    <div className="pw-lightbox" role="dialog" aria-modal="true" aria-label={`${p.title} poster`} onClick={onClose}>
      <button ref={ref} className="pw-lb-btn pw-lb-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <button className="pw-lb-btn pw-lb-prev" onClick={(e) => { e.stopPropagation(); onStep(-1) }} aria-label="Previous poster"><ChevronLeft size={22} /></button>
      <figure key={p.id} onClick={(e) => e.stopPropagation()}>
        <Poster id={p.id} alt={p.alt} eager />
        <figcaption>{p.title} <span>{index + 1} / {list.length}</span></figcaption>
      </figure>
      <button className="pw-lb-btn pw-lb-next" onClick={(e) => { e.stopPropagation(); onStep(1) }} aria-label="Next poster"><ChevronRight size={22} /></button>
    </div>
  )
}

export default function PosterWall() {
  const [open, setOpen] = useState(null) // { list, index }
  const step = (d) => setOpen((o) => o && { ...o, index: (o.index + d + o.list.length) % o.list.length })
  return (
    <>
      <div className="pw-head"><b>Official posters</b><small>Tap to view full size</small></div>
      <div className="pw-row" role="list">
        {BND_POSTERS.map((p, i) => (
          <Reveal key={p.id} delay={i * 70} className="pw-cell" role="listitem">
            <button className="pw-card" onPointerMove={tilt} onPointerLeave={untilt} onClick={() => setOpen({ list: BND_POSTERS, index: i })} aria-label={`View ${p.title} poster full size`}>
              <Poster id={p.id} alt={p.alt} />
              <span className="pw-glare" aria-hidden="true" />
              <span className="pw-cap"><span>{p.title}</span><Maximize2 size={14} aria-hidden="true" /></span>
            </button>
          </Reveal>
        ))}
      </div>

      <div className="pw-head pw-saga-head"><b>The Tom Holland saga</b><small>Four films, one Peter Parker</small></div>
      <ol className="pw-saga">
        {SAGA.map((p, i) => (
          <Reveal as="li" key={p.year} delay={i * 70} className={`pw-saga-item${p.now ? ' is-now' : ''}`}>
            <button className="pw-card" onPointerMove={tilt} onPointerLeave={untilt} onClick={() => setOpen({ list: SAGA, index: i })} aria-label={`View ${p.title} poster full size`}>
              <Poster id={p.id} alt={p.alt} />
              <span className="pw-glare" aria-hidden="true" />
            </button>
            <span className="pw-saga-meta"><span className="pw-year">{p.year}</span><b>{p.title}</b>{p.now && <span className="tag hot">Now playing</span>}</span>
          </Reveal>
        ))}
      </ol>
      {open && createPortal(<Lightbox list={open.list} index={open.index} onClose={() => setOpen(null)} onStep={step} />, document.body)}
    </>
  )
}
