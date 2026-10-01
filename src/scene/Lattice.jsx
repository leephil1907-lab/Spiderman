import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { P, fogFar, fogNear, FOG_NEAR } from '../film'
import { col } from '../tokens'

// Wireframe output is non-indexed vertex PAIRS. Both vertices of a segment get
// ONE shared random + an end parameter, so each segment draws itself from one
// end as the build scalar passes its own staggered threshold.
function buildCage() {
  const shells = []
  const ico = new THREE.IcosahedronGeometry(1, 3)
  ico.deleteAttribute('normal'); ico.deleteAttribute('uv')
  const a = mergeVertices(ico)
  a.scale(5.2, 9.2, 4.2)
  shells.push(new THREE.WireframeGeometry(a))
  const cyl = new THREE.CylinderGeometry(6.6, 6.6, 17, 18, 6, true)
  cyl.deleteAttribute('normal'); cyl.deleteAttribute('uv')
  shells.push(new THREE.EdgesGeometry(cyl, 1))

  let total = 0
  for (const s of shells) total += s.attributes.position.count
  const pos = new Float32Array(total * 3)
  const other = new Float32Array(total * 3)
  const rand = new Float32Array(total)
  const end = new Float32Array(total)
  let o = 0
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (const s of shells) {
    const src = s.attributes.position.array
    for (let v = 0; v < src.length / 3; v += 2) {
      const r = rnd()
      for (let e = 0; e < 2; e++) {
        const me = (v + e) * 3, them = (v + 1 - e) * 3
        pos.set([src[me], src[me + 1], src[me + 2]], (o + e) * 3)
        other.set([src[them], src[them + 1], src[them + 2]], (o + e) * 3)
        rand[o + e] = r // SHARED by both ends
        end[o + e] = e  // 0 = origin end, 1 = growing end
      }
      o += 2
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aOther', new THREE.BufferAttribute(other, 3))
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
  return g
}

const vert = /* glsl */ `
  attribute vec3 aOther;
  attribute float aRand;
  attribute float aEnd;
  uniform float uBuild;
  varying float vA;
  varying float vDepth;
  void main() {
    float t0 = aRand * 0.72;
    float k = clamp((uBuild - t0) / 0.28, 0.0, 1.0);
    vec3 p = aEnd > 0.5 ? mix(aOther, position, k) : position;
    vA = step(0.0005, k) * (0.55 + 0.45 * aRand);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vA;
  varying float vDepth;
  void main() {
    float f = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
    // additive: fading the colour to zero makes the line absent, not black
    gl_FragColor = vec4(uColor * vA * uOpacity * f, 1.0);
  }
`

export default function Lattice({ build }) {
  const geo = useMemo(buildCage, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: {
      uBuild: { value: 0 }, uColor: { value: col('bone-400') }, uOpacity: { value: 0.55 },
      uFogNear: { value: FOG_NEAR }, uFogFar: { value: 170 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [])
  useFrame(() => {
    const b = build(P.sp)
    mat.uniforms.uBuild.value = b
    mat.uniforms.uFogFar.value = fogFar(P.p)
    mat.uniforms.uFogNear.value = fogNear(P.p)
  })
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} position={[0, 0.3, 0]} />
}
