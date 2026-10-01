import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { P, gates, figureCentre, fogFar, fogNear, FOG_NEAR, latticeBuild } from '../film'
import { field } from '../tokens'
import Lattice from './Lattice'

const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
const COUNT = Q.has('debug') && Q.get('beads') ? +Q.get('beads') : 40000
const HEIGHT = 14
const H_SCARLET = 0.985
const H_COBALT = 0.625

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}
const arc = (from, to) => { let d = to - from; d -= Math.round(d); return d }
function remapHue(h, s) {
  if (s < 0.12) return h
  const dS = arc(h, H_SCARLET), dC = arc(h, H_COBALT)
  const d = Math.abs(dS) < Math.abs(dC) ? dS : dC
  return (((h + 0.85 * d) % 1) + 1) % 1
}

async function samplePlate(url) {
  const img = new Image()
  img.src = url
  await img.decode()
  const W = img.naturalWidth, H = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const { data } = ctx.getImageData(0, 0, W, H)
  const TH = 140
  const runOf = new Int32Array(W * H).fill(-1)
  const runs = []
  const keep = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      if (data[(y * W + x) * 4 + 3] >= TH) {
        const a = x
        while (x < W && data[(y * W + x) * 4 + 3] >= TH) x++
        const id = runs.length
        runs.push([a, x - 1])
        for (let k = a; k < x; k++) { runOf[y * W + k] = id; keep.push(y * W + k) }
      } else x++
    }
  }
  return { W, H, data, keep, runOf, runs }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

const vert = /* glsl */ `
  attribute float aRand;
  attribute vec3 aDir;
  uniform float uShow;
  uniform float uScatter;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    float k = clamp((uShow * 1.35) - aRand * 0.35, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    vec4 wp = instanceMatrix * vec4(position * k, 1.0);
    wp.xyz += aDir * uScatter * (0.35 + aRand);
    vec4 mv = modelViewMatrix * wp;
    vColor = instanceColor;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const frag = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    float f = smoothstep(uFogNear, uFogFar, vDepth);
    gl_FragColor = vec4(mix(vColor, uFogColor, f), 1.0);
  }
`

export default function Figure() {
  const place = useRef()
  const idle = useRef()
  const mesh = useRef()
  const geo = useMemo(() => new THREE.SphereGeometry(0.5, 8, 6), [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uShow: { value: 1 }, uScatter: { value: 0 },
      uFogColor: { value: field('ink-950') }, uFogNear: { value: FOG_NEAR }, uFogFar: { value: 170 },
    },
  }), [])

  useEffect(() => {
    let alive = true
    samplePlate('/spider-man-male.svg').then(({ W, H, data, keep, runOf, runs }) => {
      if (!alive || !mesh.current || !keep.length) return
      const rnd = mulberry(20261001)
      const m = mesh.current
      const scale = HEIGHT / H
      const L = new THREE.Vector3(-0.55, 0.35, 0.76).normalize()
      const n = new THREE.Vector3()
      const M = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const pos = new THREE.Vector3()
      const s = new THREE.Vector3()
      const c = new THREE.Color()
      const rand = new Float32Array(COUNT)
      const dir = new Float32Array(COUNT * 3)
      let cx = 0
      for (const idx of keep) cx += idx % W
      cx /= keep.length
      for (let i = 0; i < COUNT; i++) {
        const idx = keep[Math.floor(rnd() * keep.length)]
        const px = (idx % W) + rnd() - 0.5
        const py = Math.floor(idx / W) + rnd() - 0.5
        const [ra, rb] = runs[runOf[idx]]
        const rc = (ra + rb) / 2, rw = Math.max(1, (rb - ra) / 2)
        const x = (px - cx) * scale
        const y = (H / 2 - py) * scale
        const u = Math.min(1, Math.abs(px - rc) / rw)
        const front = rnd() < 0.72 ? 1 : -1
        const z = front * rw * scale * Math.sqrt(1 - u * u) * 0.9 + (rnd() - 0.5) * 0.06
        n.set(x, y * 0.15, z).normalize()
        const diff = Math.max(n.dot(L), 0)
        const rim = Math.pow(1 - Math.abs(n.z), 3) * (n.x > 0 ? 0.55 : 0.2)
        const shade = 0.16 + 0.95 * diff + rim
        const o = idx * 4
        const [h, sat, l] = rgbToHsl(data[o] / 255, data[o + 1] / 255, data[o + 2] / 255)
        c.setHSL(remapHue(h, sat), sat < 0.12 ? sat : Math.min(1, sat * 1.05), l, THREE.SRGBColorSpace)
        c.multiplyScalar(shade)
        m.setColorAt(i, c)
        const r = 0.085 + rnd() * 0.055
        pos.set(x, y, z)
        s.set(r, r, r)
        M.compose(pos, q, s)
        m.setMatrixAt(i, M)
        rand[i] = rnd()
        dir[i * 3] = n.x + (rnd() - 0.5) * 0.6
        dir[i * 3 + 1] = n.y + (rnd() - 0.2) * 0.6
        dir[i * 3 + 2] = n.z + (rnd() - 0.5) * 0.6
      }
      m.geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 1))
      m.geometry.setAttribute('aDir', new THREE.InstancedBufferAttribute(dir, 3))
      m.instanceMatrix.needsUpdate = true
      m.instanceColor.needsUpdate = true
      m.count = COUNT
      m.visible = true
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const g = useMemo(() => ({}), [])
  useFrame((state) => {
    const { p, sp } = P
    gates(p, g)
    const show = Math.max(g.figure, g.return)
    const c = figureCentre(sp)
    place.current.position.copy(c)
    place.current.visible = show > 0.001
    const t = state.clock.elapsedTime
    idle.current.position.y = Math.sin(t * 0.8) * 0.18
    idle.current.rotation.set(P.my * 0.1, P.mx * 0.28, 0, 'YXZ')
    mat.uniforms.uShow.value = show
    mat.uniforms.uScatter.value = (1 - show) * 16
    mat.uniforms.uFogFar.value = fogFar(p)
    mat.uniforms.uFogNear.value = fogNear(p)
  })

  return (
    <group ref={place} position={[0, 9, 0]}>
      <group ref={idle}>
        <instancedMesh ref={mesh} args={[geo, mat, COUNT]} count={0} frustumCulled={false} visible={false}>
          <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(COUNT * 3), 3]} />
        </instancedMesh>
      </group>
      <Lattice build={latticeBuild} />
    </group>
  )
}
