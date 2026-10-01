import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { P, pose, makePose, fogFar, fogNear, FOG_NEAR } from '../film'
import { field } from '../tokens'

export default function CameraRig() {
  const { camera, scene, size } = useThree()
  const o = useMemo(makePose, [])
  useMemo(() => {
    camera.rotation.order = 'YXZ' // default XYZ leaks visible roll once both axes are non-zero
    scene.background = field('ink-950')
    // no ground plane: where a floor would be, fog is
    scene.fog = new THREE.Fog(field('ink-950'), FOG_NEAR, 170)
  }, [camera, scene])

  useFrame(() => {
    // vertical half-frame ~19°, horizontal ≥ ~22° even on a portrait phone
    const aspect = size.width / size.height
    const minH = THREE.MathUtils.degToRad(22)
    const vHalf = Math.max(THREE.MathUtils.degToRad(19), Math.atan(Math.tan(minH) / aspect))
    const fov = THREE.MathUtils.radToDeg(vHalf * 2)
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix() }

    pose(P.sp, o)
    camera.position.copy(o.pos)
    camera.up.copy(o.up)
    camera.lookAt(o.look)
    scene.fog.far = fogFar(P.p)
    scene.fog.near = fogNear(P.p)
  })
  return null
}
