// Three reads the SAME primitives the CSS declares (tier 1), never its own hexes.
import * as THREE from 'three'
const FALLBACK = {
  'ink-950': '#150406', 'ink-900': '#1e070a', 'ink-800': '#2c0e13', 'ink-700': '#431a20',
  'bone-50': '#f2f3f5', 'bone-400': '#9a8a8d', 'bone-500': '#75666a',
  'scarlet-500': '#e0202b', 'scarlet-300': '#ff5d64', 'cobalt-500': '#2b4fd0',
}
function read(name) {
  if (typeof document === 'undefined') return FALLBACK[name]
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--raw-${name}`).trim()
  return v || FALLBACK[name]
}
export const hex = (name) => read(name)
/** THREE.Color in linear working space (hex is interpreted as sRGB). */
export const col = (name) => new THREE.Color(read(name))

// ── display-referred binding ────────────────────────────────────────────────
// ACES (three's fit) has a toe that clips tiny inputs to black, so a raw
// #150406 fed in as linear comes out neutral black — the red disappears.
// `field(name)` returns the pre-tone-map linear colour that lands EXACTLY on the
// token after OutputPass (exposure 1), so the darkest field keeps its hue.
const IN = [[0.59719, 0.35458, 0.04823], [0.076, 0.90834, 0.01566], [0.0284, 0.13383, 0.83777]]
const OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]]
const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081)
export function aces(v) {
  const c = mul(IN, v.map((x) => x / 0.6)).map(fit)
  return mul(OUT, c).map((x) => Math.min(1, Math.max(0, x)))
}
export function field(name) {
  const t = new THREE.Color(read(name)) // linear target
  const target = [t.r, t.g, t.b]
  let x = target.slice()
  for (let i = 0; i < 400; i++) {
    const y = aces(x)
    x = x.map((xi, k) => Math.max(0, xi + (target[k] - y[k]) * 0.9))
  }
  return new THREE.Color(x[0], x[1], x[2])
}
