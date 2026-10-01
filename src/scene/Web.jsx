import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { P, ENV, WEB, PHASE, gates, spine, pose, makePose, smooth, lin } from '../film'
import { hex } from '../tokens'

// Fewer SEGMENTS per strand on mobile — never fewer strands: the camera swings
// once per table entry, and a strand missing from a swing is the desync the
// shared table exists to prevent.
const SEG = ENV.mobile ? 14 : 30
const N = WEB.length


export default function Web() {
  const size = useThree((s) => s.size)
  const { lines, pos, colr, posBuf, colBuf, mat } = useMemo(() => {
    const pos = new Float32Array(N * SEG * 6)
    const colr = new Float32Array(N * SEG * 6)
    const geo = new LineSegmentsGeometry()
    geo.setPositions(pos)
    geo.setColors(colr)
    const mat = new LineMaterial({
      vertexColors: true,
      linewidth: 2.4, // screen-space px; resolution MUST be set or this is wildly wrong
      worldUnits: false,
      transparent: true,
      depthWrite: false,
      // ADDITIVE, and not for glow: one opacity for the whole object, so the
      // per-strand fade lives in vertex colours — under normal blending a colour
      // fading to zero is a BLACK line on a red field rather than an absent one.
      blending: THREE.AdditiveBlending,
      toneMapped: true,
    })
    const lines = new LineSegments2(geo, mat)
    lines.frustumCulled = false
    // instanceStart/instanceEnd are two views on ONE interleaved buffer, stride 6:
    // [x1,y1,z1,x2,y2,z2] per segment — we write it in place, never reallocate.
    const posBuf = geo.attributes.instanceStart.data
    const colBuf = geo.attributes.instanceColorStart.data
    return { lines, pos: posBuf.array, colr: colBuf.array, posBuf, colBuf, mat }
  }, [])

  const bone = useMemo(() => new THREE.Color(hex('bone-50')), [])
  const scarlet = useMemo(() => new THREE.Color(hex('scarlet-500')), [])
  // gain in display terms: sRGB bone ≈ 0.95 → ×1.25 ≈ 1.19 > 1.15 threshold
  const BONE = useMemo(() => bone.clone().convertLinearToSRGB().multiplyScalar(1.25), [bone])
  const SCAR = useMemo(() => scarlet.clone().convertLinearToSRGB().multiplyScalar(1.25), [scarlet])

  const oRel = useMemo(makePose, [])
  const g = useMemo(() => ({}), [])
  const tmp = useMemo(() => ({
    anchor: new THREE.Vector3(), origin: new THREE.Vector3(), end: new THREE.Vector3(),
    a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Color(),
  }), [])

  const hand = (sp, side, pz, out) => {
    pose(sp, pz)
    return out.copy(pz.pos)
      .addScaledVector(pz.right, side * 0.8)
      .addScaledVector(pz.trueUp, -1.1)
      .addScaledVector(pz.fwd, 2.2)
  }

  useFrame(() => {
    const { p, sp } = P
    gates(p, g)
    mat.resolution.set(size.width, size.height)
    const { anchor, origin, end, a, b, c } = tmp
    for (let si = 0; si < N; si++) {
      const w = WEB[si]
      const t = (sp - w.at) / w.span
      const base = si * SEG * 6
      if (t <= 0 || t >= 1 || g.web <= 0.0005) {
        for (let k = 0; k < SEG * 6; k++) { pos[base + k] = 0; colr[base + k] = 0 }
        continue
      }
      // anchor DERIVED from the camera spine — never authored in world space
      spine(w.at, anchor)
      anchor.x += w.side * w.radius
      anchor.y += w.lift
      anchor.z -= w.lead
      // the hand holds the strand until release; after release the free end stays
      // where it was let go — still a pure function of sp.
      const tHand = Math.min(t, PHASE.TAUT)
      hand(w.at + tHand * w.span, w.side, oRel, origin)

      const fire = lin(0, PHASE.FIRE, t)
      const fireE = 1 - Math.pow(1 - fire, 3)
      end.copy(origin).lerp(anchor, fireE)
      const rel = lin(PHASE.TAUT, PHASE.RELEASE, t)
      const fade = 1 - lin(PHASE.RELEASE, 1, t)
      // TAUT: near-zero sag. RELEASE: sag grows and a wave travels the strand.
      const sag = 0.04 + 3.6 * rel * rel + 1.2 * lin(PHASE.RELEASE, 1, t)
      const waveA = 0.9 * rel * (0.4 + 0.6 * fade)
      const alpha = fade * smooth(0, 0.02, t) * g.web
      const len = origin.distanceTo(end)

      for (let k = 0; k < SEG; k++) {
        for (let e = 0; e < 2; e++) {
          const s = (k + e) / SEG
          const bell = 4 * s * (1 - s)
          const wave = Math.sin((s * 2.5 - rel * 3.2) * Math.PI * 2) * bell * waveA
          const pt = e === 0 ? a : b
          pt.copy(origin).lerp(end, s)
          pt.y -= sag * bell * Math.min(1, len / 20)
          pt.x += wave * 0.35 * w.side
          pt.y += wave
          // scarlet only as an impulse at the firing edge — MIXED, not added:
          // adding it to a strand already over threshold gives a hueless knot.
          const edge = smooth(0.72, 1.0, s) * (1 - smooth(0.55, 1.0, fire)) * (fire > 0 ? 1 : 0)
          c.copy(BONE).lerp(SCAR, edge).multiplyScalar(alpha * (0.35 + 0.65 * Math.min(1, s * 4)))
          const off = base + k * 6 + e * 3
          pos[off] = pt.x; pos[off + 1] = pt.y; pos[off + 2] = pt.z
          colr[off] = c.r; colr[off + 1] = c.g; colr[off + 2] = c.b
        }
      }
    }
    posBuf.needsUpdate = true
    colBuf.needsUpdate = true
  })

  return <primitive object={lines} />
}
