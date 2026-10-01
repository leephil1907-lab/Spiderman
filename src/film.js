// ─────────────────────────────────────────────────────────────────────────────
// THE ONE RULE: every value in the scene is a pure function of one scalar `p`.
// `P` is a plain mutable object written ONCE per frame by <Driver/>; every
// useFrame reads it. Nothing in here holds state, springs or lerps-to-target.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'

export const P = { p: 0, sp: 0, mx: 0, my: 0, onscreen: true }

const mq = (q) => typeof window !== 'undefined' && window.matchMedia && window.matchMedia(q).matches
export const ENV = {
  mobile: mq('(max-width: 768px)') || mq('(pointer: coarse)'),
  reduced: mq('(prefers-reduced-motion: reduce)'),
}

// ── scalar helpers ──────────────────────────────────────────────────────────
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lin = (a, b, x) => clamp01((x - a) / (b - a))
export const smooth = (a, b, x) => { const t = lin(a, b, x); return t * t * (3 - 2 * t) }
/** trapezoid gate: smooth in over [a0,a1], smooth out over [b0,b1] */
export const gate = (x, a0, a1, b0, b1) => smooth(a0, a1, x) * (1 - smooth(b0, b1, x))
export const toSp = (p) => clamp01(p / 0.82)

// ── ACTS ────────────────────────────────────────────────────────────────────
// Acts 1-5 on the act axis `sp`; the closing wipe (6) on real `p`.
// Every boundary overlaps its neighbour by ≥0.06 of the act axis.
export const ACTS = [
  { key: 'figure', axis: 'sp', g: [-2, -1, 0.12, 0.24] },
  { key: 'room',   axis: 'sp', g: [0.16, 0.26, 0.64, 0.80] },
  { key: 'web',    axis: 'sp', g: [0.24, 0.30, 0.66, 0.74] },
  { key: 'drop',   axis: 'sp', g: [0.62, 0.70, 0.84, 0.92] },
  { key: 'return', axis: 'sp', g: [0.75, 0.88, 2, 3] },
  { key: 'wipe',   axis: 'p',  g: [0.84, 1.0, 2, 3] },
]
export function gates(p, out = {}) {
  const sp = toSp(p)
  for (const a of ACTS) out[a.key] = gate(a.axis === 'sp' ? sp : p, ...a.g)
  return out
}
/** Cobalt is only allowed once the figure (scarlet) is fully gone, and must be
 *  gone again before the figure returns. Scarlet and cobalt never share a frame. */
export const cobaltWeight = (sp) => smooth(0.24, 0.32, sp) * (1 - smooth(0.62, 0.74, sp))

// ── THE WEB TABLE — one table drives BOTH strands and the camera swing ──────
const SPACING = [0.045, 0.045, 0.038, 0.035, 0.031] // tightens → corridor accelerates
const AT0 = 0.31
const RADIUS = [5.4, 5.8, 6.0, 6.3, 6.6, 7.0]
const LIFT = [2.4, 3.0, 2.6, 3.4, 3.0, 3.8]
export const WEB = RADIUS.map((radius, i) => ({
  at: AT0 + SPACING.slice(0, i).reduce((a, b) => a + b, 0),
  span: 0.075,
  side: i % 2 === 0 ? 1 : -1,
  radius,
  lead: 3.8 * radius, // atan(r/lead) ≈ 14.7° against a ~29° half-frame
  lift: LIFT[i],
}))
export const PHASE = { FIRE: 0.12, TAUT: 0.55, RELEASE: 0.8 }
export const SWING_U = [0.08, 0.82]

// ── THE CAMERA SPINE ────────────────────────────────────────────────────────
// Gear changes 300 → 150 → 360 units / unit sp, stepping exactly where strand 0
// catches (at + 0.12·span) and lets go (at + 0.55·span).
const s0 = WEB[0]
const CATCH = s0.at + PHASE.FIRE * s0.span
const LETGO = s0.at + PHASE.TAUT * s0.span
const V1 = 300, V2 = 150, V3 = 360
const S_REST = 0.10, S_CORR = 0.62, S_ARRIVE = 0.88
// ease-in rest leg ends at exactly V1 (Δz = V1·Δs/2) → no kick
const z0 = 34
const z1 = z0 - (V1 * S_REST) / 2
const z2 = z1 - V1 * (CATCH - S_REST)
const z3 = z2 - V2 * (LETGO - CATCH)
const z4 = z3 - V3 * (S_CORR - LETGO)
// ease-out drop leg starts at exactly V3 (Δz = V3·Δs/2) → no stop at corridor end
const z5 = z4 - (V3 * (S_ARRIVE - S_CORR)) / 2
const z6 = z5 - 8
export const FIG_A = new THREE.Vector3(0, 9, 0)
export const FIG_B = new THREE.Vector3(0, -30, z5 - 32)

const EASE = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  smooth: (t) => t * t * (3 - 2 * t),
}
// leg ease describes the leg INTO that waypoint. Corridor legs are LINEAR:
// chained smoothsteps would bring the camera to a full stop on every waypoint.
const WAY = [
  { s: 0, pos: [0, 9, z0] },
  { s: S_REST, pos: [0, 9, z1], ease: 'in' },
  { s: CATCH, pos: [0, 9, z2], ease: 'linear' },
  { s: LETGO, pos: [0, 9, z3], ease: 'linear' },
  { s: S_CORR, pos: [0, 9, z4], ease: 'linear' },
  { s: S_ARRIVE, pos: [0, -30, z5], ease: 'out', easeY: 'smooth' },
  { s: 1, pos: [0, -30, z6], ease: 'smooth' },
]
export function spine(sp, out = new THREE.Vector3()) {
  let i = 1
  while (i < WAY.length - 1 && sp > WAY[i].s) i++
  const a = WAY[i - 1], b = WAY[i]
  const t = lin(a.s, b.s, sp)
  const e = EASE[b.ease](t)
  const ey = EASE[b.easeY || b.ease](t)
  return out.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * e,
    a.pos[1] + (b.pos[1] - a.pos[1]) * ey,
    a.pos[2] + (b.pos[2] - a.pos[2]) * e,
  )
}

/** Swing: summed offset from the web table. Every envelope is exactly zero at
 *  both ends, so the terms sum without leaving a permanent offset. */
export function swing(sp) {
  const amp = ENV.reduced ? 0 : 1
  let x = 0, y = 0, bank = 0
  for (const w of WEB) {
    const t = (sp - w.at) / w.span
    const u = (t - SWING_U[0]) / (SWING_U[1] - SWING_U[0])
    if (u <= 0 || u >= 1) continue
    const e = Math.sin(Math.PI * u) * amp
    x += w.side * 3.2 * e
    y -= 1.5 * e
    bank += w.side * 0.15 * e
  }
  return { x, y, bank }
}

const _k = new THREE.Vector3()
const _v = new THREE.Vector3()
const _c = new THREE.Vector3()
function rodrigues(v, k, th, out) {
  const c = Math.cos(th), s = Math.sin(th)
  _c.crossVectors(k, v)
  return out.copy(v).multiplyScalar(c).addScaledVector(_c, s).addScaledVector(k, k.dot(v) * (1 - c))
}

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const ALT_UP = new THREE.Vector3(0, 0, -1)
/** Full camera pose as a pure function of sp. */
export function pose(sp, o) {
  spine(sp, o.base)
  const sw = swing(sp)
  // offset on POSITION ONLY — the camera rotates to hold the axis → reads as an arc
  o.pos.copy(o.base)
  o.pos.x += sw.x
  o.pos.y += sw.y
  const ud = lin(S_CORR, S_ARRIVE, sp)
  const env = Math.sin(Math.PI * ud)
  const pitch = 0.5 * env
  o.dir.set(0, -Math.tan(pitch), -1).normalize()
  o.look.copy(o.base).addScaledVector(o.dir, 40)
  // bank: rotate the UP vector about the view axis, sin envelope, never a full roll
  const bank = sw.bank + THREE.MathUtils.degToRad(15) * env
  _k.subVectors(o.look, o.pos).normalize()
  o.fwd.copy(_k)
  const ref = Math.abs(_k.dot(WORLD_UP)) > 0.985 ? ALT_UP : WORLD_UP // near-vertical guard
  rodrigues(ref, _k, bank, o.up)
  o.right.crossVectors(_k, o.up).normalize()
  o.trueUp.crossVectors(o.right, _k).normalize()
  return o
}
export const makePose = () => ({
  base: new THREE.Vector3(), pos: new THREE.Vector3(), look: new THREE.Vector3(),
  dir: new THREE.Vector3(), up: new THREE.Vector3(), fwd: new THREE.Vector3(),
  right: new THREE.Vector3(), trueUp: new THREE.Vector3(),
})

/** Fog far closes for the wipe so the far end dissolves instead of showing a wall. */
export const fogFar = (p) => 170 - 158 * smooth(0.84, 1.0, p)
export const FOG_NEAR = 14
/** near closes with far, so the fog band never inverts */
export const fogNear = (p) => FOG_NEAR - 10 * smooth(0.84, 1.0, p)

/** Figure world anchor: act-1 plate at FIG_A, act-5 at FIG_B (swap happens while invisible). */
export const figureCentre = (sp) => (sp < 0.5 ? FIG_A : FIG_B)
/** ONE scalar weaves and un-weaves the lattice (and re-weaves it on return). */
export const latticeBuild = (sp) =>
  smooth(0.0, 0.1, sp) * (1 - smooth(0.12, 0.22, sp)) + smooth(0.84, 0.97, sp)

// ── DOM overlay windows — on the ACT axis, never on real p ─────────────────
export const OVERLAYS = [
  { id: 'title', text: 'BRAND NEW DAY', cls: 't-title', win: [-2, -1, 0.05, 0.13], kind: 'open' },
  { id: 'cue', cue: true, win: [-2, -1, 0.01, 0.04] },
  { id: 'h1', text: 'HOLD ON', cls: 't-phrase pos-l pos-low', win: [0.17, 0.22, 0.27, 0.31] },
  { id: 'l1', text: 'LET GO', cls: 't-phrase pos-r pos-high', win: [0.33, 0.36, 0.40, 0.43] },
  { id: 'h2', text: 'HOLD ON', cls: 't-phrase pos-l pos-high muted', win: [0.43, 0.46, 0.50, 0.53] },
  { id: 'l2', text: 'LET GO', cls: 't-phrase pos-r pos-low', win: [0.54, 0.58, 0.66, 0.71] },
  { id: 'h3', text: 'HOLD ON', cls: 't-phrase muted', win: [0.72, 0.76, 0.82, 0.86] },
  { id: 'close', text: 'BRAND NEW DAY', cls: 't-title', win: [0.88, 0.96, 2, 3], kind: 'close', button: true },
]

// ── dev proof that the handoff overlaps ─────────────────────────────────────
export function proveOverlap(step = 0.0005) {
  const rows = []
  for (let i = 0; i < ACTS.length - 1; i++) {
    const A = ACTS[i].key, B = ACTS[i + 1].key
    let lo = null, hi = null
    for (let p = 0; p <= 1.00001; p += step) {
      const g = gates(p)
      if (g[A] > 0 && g[B] > 0) { if (lo === null) lo = p; hi = p }
    }
    const width = lo === null ? 0 : ACTS[i + 1].axis === 'p' ? hi - lo : toSp(hi) - toSp(lo)
    rows.push({ boundary: `${A}|${B}`, fromP: lo?.toFixed(3), toP: hi?.toFixed(3), overlapSp: +width.toFixed(3), ok: lo !== null })
  }
  // no p anywhere with zero live acts
  let dead = 0
  for (let p = 0; p <= 1; p += step) { const g = gates(p); if (!Object.values(g).some((v) => v > 0)) dead++ }
  return { rows, deadFrames: dead, pass: rows.every((r) => r.ok) && dead === 0 }
}
