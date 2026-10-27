import { sceneReady } from '@/loading/readiness'
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { MathUtils, NoColorSpace, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2 } from 'three'
import { cinematicWorlds, getHeroFrame } from '@/config/cinematicHero'
import { cinematicFragment, cinematicVertex } from '@/shaders/cinematicHero'

export interface CinematicHeroProps {
  progress: MutableRefObject<number>
  reduced: boolean
  onReady: () => void
  onFailure: () => void
  running?: boolean
}

function CinematicPlane({ progress, reduced, onReady }: Omit<CinematicHeroProps, 'onFailure'>) {
  const textures = useLoader(TextureLoader, cinematicWorlds.flatMap(world => [world.image, world.depth]))
  const material = useRef<ShaderMaterial>(null)
  const pointer = useRef(new Vector2())
  const prepared = useRef(false)
  const { size } = useThree()
  const uniforms = useMemo(() => ({
    uCurrent: { value: textures[0] }, uNext: { value: textures[2] },
    uDepthCurrent: { value: textures[1] }, uDepthNext: { value: textures[3] },
    uResolution: { value: new Vector2(1, 1) }, uPointer: { value: new Vector2() },
    uExit: { value: new Vector2() }, uProgress: { value: 0 }, uHold: { value: 0 },
    uFocusCurrent: { value: .5 }, uFocusNext: { value: .5 },
    uReduced: { value: 0 }, uTime: { value: 0 },
    uPoolCurrent: { value: 0 }, uPoolNext: { value: 0 },
    uPortraitCurrent: { value: 0 }, uPortraitNext: { value: 0 },
  }), [textures])

  useEffect(() => {
    textures.forEach((texture, i) => {
      texture.colorSpace = i % 2 === 0 ? SRGBColorSpace : NoColorSpace
      texture.needsUpdate = true
    })
    onReady()
  }, [textures, onReady])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      pointer.current.set(event.clientX / window.innerWidth * 2 - 1, 1 - event.clientY / window.innerHeight * 2)
    }
    const leave = () => pointer.current.set(0, 0)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [])

  useFrame(({ clock }, delta) => {
    if (!material.current) return
    if (!prepared.current) { prepared.current = true; requestAnimationFrame(() => sceneReady('hero')) }
    const frame = getHeroFrame(progress.current, reduced)
    const u = material.current.uniforms
    const world = cinematicWorlds[frame.index]
    const next = cinematicWorlds[frame.next]
    u.uCurrent.value = textures[frame.index * 2]
    u.uDepthCurrent.value = textures[frame.index * 2 + 1]
    u.uNext.value = textures[frame.next * 2]
    u.uDepthNext.value = textures[frame.next * 2 + 1]
    u.uResolution.value.set(size.width, size.height)
    u.uExit.value.set(world.exit[0], 1 - world.exit[1])
    u.uProgress.value = frame.transition
    u.uHold.value = frame.local
    u.uFocusCurrent.value = world.portraitFocus
    u.uFocusNext.value = next.portraitFocus
    u.uReduced.value = reduced ? 1 : 0
    u.uPoolCurrent.value = frame.index === 3 ? 1 : 0
    u.uPoolNext.value = frame.next === 3 ? 1 : 0
    u.uPortraitCurrent.value = frame.index === 2 ? 1 : 0
    u.uPortraitNext.value = frame.next === 2 ? 1 : 0
    u.uTime.value = clock.elapsedTime
    const p = u.uPointer.value as Vector2
    p.x = MathUtils.damp(p.x, reduced ? 0 : pointer.current.x, 9, delta)
    p.y = MathUtils.damp(p.y, reduced ? 0 : pointer.current.y, 9, delta)
  })

  return <mesh frustumCulled={false}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={cinematicVertex} fragmentShader={cinematicFragment} depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
}

export function CinematicHero(props: CinematicHeroProps) {
  return <Canvas className="atelier-webgl" frameloop={props.running === false ? 'never' : 'always'} flat dpr={[1, 1.5]} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} fallback={null} onCreated={({ gl }) => {
    gl.setClearAlpha(0)
    gl.domElement.addEventListener('webglcontextlost', props.onFailure, { once: true })
  }}>
    <Suspense fallback={null}><CinematicPlane progress={props.progress} reduced={props.reduced} onReady={props.onReady} /></Suspense>
  </Canvas>
}
