import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { P } from '../film'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'

// Grain in DISPLAY space — after the output pass, where film grain actually lands.
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.055 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; varying vec2 vUv;
    float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float n = h(gl_FragCoord.xy + fract(uTime) * 917.0) - 0.5;
      // grain rides the midtones; it should not lift the black field into grey
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += n * uAmount * (0.35 + 0.65 * smoothstep(0.0, 0.5, l));
      gl_FragColor = vec4(c.rgb, 1.0);
    }`,
}

export default function Post() {
  const { gl, scene, camera, size, viewport } = useThree()
  const { composer, bloom, grain } = useMemo(() => {
    const composer = new EffectComposer(gl) // HalfFloat targets
    composer.addPass(new RenderPass(scene, camera))
    // ORDER IS THE ARGUMENT: bloom → vignette → tone map (OutputPass) → grain
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.55, 0.45, 1.15)
    // default 0.01 clips hard → a rim tracing the shape instead of a glow off it
    bloom.highPassUniforms.smoothWidth.value = 0.35
    composer.addPass(bloom)
    const vig = new ShaderPass(VignetteShader)
    // darkness 1.0 and NOT above: >1 mixes toward a NEGATIVE colour on a float
    // target, and ACES maps negatives back to positive per channel — on a red
    // field only G and B go negative, so the corners come back GREEN.
    vig.uniforms.darkness.value = 1.0
    vig.uniforms.offset.value = 1.3 // shape the falloff here instead
    composer.addPass(vig)
    composer.addPass(new OutputPass())
    const grain = new ShaderPass(GrainShader)
    composer.addPass(grain)
    return { composer, bloom, grain }
  }, [gl, scene, camera])

  useEffect(() => {
    composer.setPixelRatio(viewport.dpr)
    composer.setSize(size.width, size.height)
  }, [composer, size, viewport.dpr])
  useEffect(() => () => composer.dispose(), [composer])

  useFrame((state) => {
    if (!P.onscreen) return
    grain.uniforms.uTime.value = state.clock.elapsedTime
    composer.render()
  }, 1)
  return null
}
