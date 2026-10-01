import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { P, gates, cobaltWeight, makePose, pose } from '../film'
import { col } from '../tokens'

// A wireframe shell (rings + longitudinals) built along +Y, then rotateX(PI/2)
// so the axis runs down -Z with the camera inside.
function shell(r, radial, ringStep, y0, y1) {
  const v = []
  for (let i = 0; i < radial; i++) {
    const a = (i / radial) * Math.PI * 2
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    for (let y = y0; y < y1; y += ringStep * 4) v.push(x, y, z, x, Math.min(y + ringStep * 4, y1), z)
  }
  for (let y = y0; y <= y1; y += ringStep) {
    for (let i = 0; i < radial; i++) {
      const a0 = (i / radial) * Math.PI * 2, a1 = ((i + 1) / radial) * Math.PI * 2
      v.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.rotateX(Math.PI / 2) // +Y → +Z; built over negative y so it runs down -Z
  return g
}

const SHELLS = [
  { r: 9, radial: 20, step: 5, drift: 0.055 },
  { r: 13.95, radial: 28, step: 7, drift: -0.03 }, // counter-rotates
  { r: 19.8, radial: 36, step: 9.5, drift: 0.014 },
]
const DRIFT_GAIN = 40 // radians of drift per unit sp × drift — a function of p, not of time

export default function Room() {
  const refs = useRef([])
  const bar = useRef()
  const cobalt = useMemo(() => col('cobalt-500'), [])
  const neutral = useMemo(() => col('bone-500'), [])
  const geos = useMemo(() => SHELLS.map((s) => shell(s.r, s.radial, s.step, -300, 22)), [])
  const mats = useMemo(() => SHELLS.map(() => new THREE.LineBasicMaterial({
    color: cobalt.clone(), transparent: true, opacity: 0.22, depthWrite: false, fog: true,
  })), [cobalt])
  const barMat = useMemo(() => new THREE.MeshBasicMaterial({ color: col('bone-400'), transparent: true, opacity: 0, fog: false, depthWrite: false }), [])
  const g = useMemo(() => ({}), [])
  const o = useMemo(makePose, [])

  useFrame(() => {
    const { p, sp } = P
    gates(p, g)
    const cw = cobaltWeight(sp)
    SHELLS.forEach((s, i) => {
      const m = refs.current[i]
      if (!m) return
      m.visible = g.room > 0.002
      m.rotation.z = s.drift * sp * DRIFT_GAIN
      // neutral bone while the figure is still on screen; cobalt only once it has gone
      mats[i].color.copy(neutral).lerp(cobalt, cw)
      mats[i].opacity = 0.22 * g.room * (0.55 + 0.45 * cw)
    })
    // one thin horizon bar at the vanishing point — no ground plane, fog is the floor
    pose(sp, o)
    bar.current.position.set(o.base.x, o.base.y - 0.9, o.base.z - 120)
    barMat.opacity = 0.35 * g.room * (1 - g.drop)
    bar.current.visible = barMat.opacity > 0.002
  })

  return (
    <>
    <group position={[0, 9, 0]}>
      {geos.map((geo, i) => (
        <lineSegments key={i} ref={(el) => (refs.current[i] = el)} geometry={geo} material={mats[i]} frustumCulled={false} />
      ))}
    </group>
    <mesh ref={bar} material={barMat} position={[0, 0, -120]} frustumCulled={false}>
        <planeGeometry args={[260, 0.05]} />
      </mesh>
    </>
  )
}
