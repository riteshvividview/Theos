import { sceneReady } from '@/loading/readiness'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Group, MathUtils, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Texture } from 'three'

export type OrbitCard = { file: string; title: string; aspect: number; size: number }
// Shared between the DOM drag handlers and the frame loop.
export type OrbitControl = { dragging: boolean; moved: number; pending: [number, number]; velocity: [number, number]; nudge: number }

const RADIUS = 2.7
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return v;}`

const cardVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const cardFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec2 uCover, uPointer;
uniform float uAspect, uFacing, uHover, uOpacity, uSpeed, uReveal, uTime, uSeed;
${noise}
float roundedBox(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
 vec2 p=(vUv-.5)*vec2(uAspect,1.);
 float d=roundedBox(p,vec2(uAspect*.5,.5),.05);
 float aa=fwidth(d);
 float mask=1.-smoothstep(-aa,aa,d);
 // Entrance: the frame burns in along a noise front.
 float grain=fbm(vUv*vec2(uAspect,1.)*5.+uSeed*9.);
 float front=uReveal*1.25-.12;
 float shown=1.-smoothstep(front-.025,front,grain);
 float ember=smoothstep(front-.11,front-.025,grain)*shown*step(uReveal,.999);
 // Hover ripple radiating from the pointer.
 vec2 toPointer=(vUv-uPointer)*vec2(uAspect,1.);
 float dist=length(toPointer);
 vec2 ripple=dist>0.?toPointer/dist*sin(dist*46.-uTime*7.)*.0045*uHover*exp(-dist*5.):vec2(0.);
 vec2 uv=(vUv-.5)*uCover*(1.-.06*uHover)+.5+ripple;
 uv.x+=sin(vUv.y*3.14159)*uSpeed*.014;
 float blur=(1.-uFacing)*2.6;
 vec2 split=vec2(uSpeed*.005+uHover*.0012,0.);
 vec3 col=vec3(texture2D(uMap,uv+split,blur).r,texture2D(uMap,uv,blur).g,texture2D(uMap,uv-split,blur).b);
 vec3 receded=mix(vec3(lum(col)),col,.3)*vec3(.5,.52,.68);
 col=mix(receded,col,uFacing);
 col+=exp(-dist*4.)*.08*uHover;
 col+=(1.-smoothstep(0.,.018,-d))*.2*uFacing;
 col+=(hash(vUv*730.+fract(uTime)*13.)-.5)*.035;
 col=mix(col,vec3(1.,.42,.22),ember);
 gl_FragColor=vec4(col,mask*uOpacity*max(shown,ember));
 #include <colorspace_fragment>
}`

const auraFragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uSpeed, uOpen;
${noise}
void main(){
 vec2 p=(vUv-.5)*vec2(5.,2.);
 float r=length(p);
 float warp=fbm(p*1.6-uTime*.04);
 float n=fbm(p*1.25+vec2(uTime*.025,-uTime*.018)+warp*1.4);
 vec3 navy=vec3(.17,.21,.45), red=vec3(.78,.18,.11), gold=vec3(.86,.67,.43);
 vec3 col=mix(navy,red,smoothstep(.42,.78,n));
 col=mix(col,gold,smoothstep(.55,.85,fbm(p*2.4+3.+uTime*.03))*.6);
 float halo=smoothstep(.95,.1,r);
 float rim=exp(-pow((r-.48)*9.,2.));
 float alpha=(halo*(n*.9+.15)*.13+rim*.05*(.6+n))*(1.+uSpeed*.9)*uOpen;
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
}`

const ringVertex = `
attribute float aAngle;
varying float vAngle, vDepth;
uniform float uRadius;
void main(){vAngle=aAngle; vec4 world=modelMatrix*vec4(position,1.); vDepth=(world.z)/uRadius; gl_Position=projectionMatrix*viewMatrix*world;}`
const ringFragment = `
precision highp float;
varying float vAngle, vDepth;
uniform float uTime, uDash, uFlow, uOpen, uAlpha;
void main(){
 float dash=step(.5,fract(vAngle*uDash-uTime*uFlow));
 float alpha=mix(.12,1.,smoothstep(-1.,1.,vDepth))*uAlpha*uOpen*mix(.35,1.,dash);
 gl_FragColor=vec4(vec3(.16,.2,.32),alpha);
}`

const dustVertex = `
attribute float aSeed;
varying float vSeed, vDepth;
uniform float uTime, uPixel, uRadius;
void main(){
 vSeed=aSeed;
 vec4 world=modelMatrix*vec4(position,1.);
 vDepth=world.z/uRadius;
 vec4 view=viewMatrix*world;
 float twinkle=.55+.45*sin(uTime*(1.2+aSeed*2.)+aSeed*40.);
 gl_PointSize=(2.+aSeed*4.)*twinkle*uPixel*(14./-view.z);
 gl_Position=projectionMatrix*view;
}`
const dustFragment = `
precision highp float;
varying float vSeed, vDepth;
uniform float uOpen;
void main(){
 float d=length(gl_PointCoord-.5);
 float disc=smoothstep(.5,.1,d);
 vec3 col=vSeed>.86?vec3(.75,.16,.1):vSeed>.7?vec3(.8,.62,.38):vec3(.2,.25,.42);
 gl_FragColor=vec4(col,disc*mix(.12,.55,smoothstep(-1.,1.,vDepth))*uOpen);
}`

function fibonacciSphere(count: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i + .5) / count * 2, ring = Math.sqrt(1 - y * y), theta = i * golden
    return new Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring)
  })
}

function circleGeometry(radius: number, segments = 320) {
  const positions: number[] = [], angles: number[] = []
  for (let i = 0; i < segments; i++) { const t = i / segments, a = t * Math.PI * 2; positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius); angles.push(t) }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('aAngle', new Float32BufferAttribute(angles, 1))
  return geometry
}

function dustGeometry(count: number) {
  const positions: number[] = [], seeds: number[] = []
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = RADIUS * (.55 + Math.random() * 1.05), s = Math.sqrt(1 - u * u)
    positions.push(Math.cos(a) * s * r, u * r, Math.sin(a) * s * r); seeds.push(Math.random())
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1))
  return geometry
}

// Orbital paths drawn as an illustration around the collection: radius multiplier, tilt (x, z), dash count, flow speed.
const paths: [number, number, number, number, number][] = [[1.18, .42, -.2, 90, .02], [1.34, -.95, .55, 140, -.012], [1.06, 1.35, .25, 60, .03]]

type Telemetry = (azimuth: number, elevation: number, speed: number) => void
type OrbitProps = { cards: OrbitCard[]; control: MutableRefObject<OrbitControl>; intro: MutableRefObject<number>; reduced: boolean; onSelect: (i: number) => void; onActive: (i: number) => void; onHover: (hovering: boolean) => void; onTelemetry?: Telemetry }

function Orbit({ cards, control, intro, reduced, onSelect, onActive, onHover, onTelemetry }: OrbitProps) {
  const files = useMemo(() => [...new Set(cards.map(card => card.file))], [cards])
  const textures = useLoader(TextureLoader, files.map(file => `/images/redesign/gallery-${file}.jpg`)) as Texture[]
  const geometry = useMemo(() => new PlaneGeometry(1, 1), [])
  const anchors = useMemo(() => fibonacciSphere(cards.length), [cards.length])
  const materials = useMemo(() => cards.map((card, i) => {
    const texture = textures[files.indexOf(card.file)]
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    const image = texture.image as HTMLImageElement, imageAspect = image.width / image.height
    const cover = imageAspect > card.aspect ? [card.aspect / imageAspect, 1] : [1, imageAspect / card.aspect]
    return new ShaderMaterial({ vertexShader: cardVertex, fragmentShader: cardFragment, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { uMap: { value: texture }, uCover: { value: cover }, uAspect: { value: card.aspect }, uFacing: { value: 1 }, uHover: { value: 0 }, uOpacity: { value: 1 }, uSpeed: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uSeed: { value: (i * .618) % 1 }, uPointer: { value: new Vector2(.5, .5) } } })
  }), [cards, textures, files])
  const aura = useMemo(() => new ShaderMaterial({ vertexShader: cardVertex, fragmentShader: auraFragment, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, uniforms: { uTime: { value: 0 }, uSpeed: { value: 0 }, uOpen: { value: 0 } } }), [])
  const rings = useMemo(() => paths.map(([scale, , , dash, flow]) => ({ geometry: circleGeometry(RADIUS * scale), material: new ShaderMaterial({ vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthTest: false, depthWrite: false, uniforms: { uTime: { value: 0 }, uDash: { value: dash }, uFlow: { value: flow }, uOpen: { value: 0 }, uAlpha: { value: .26 }, uRadius: { value: RADIUS * scale } } }) })), [])
  const dust = useMemo(() => ({ geometry: dustGeometry(340), material: new ShaderMaterial({ vertexShader: dustVertex, fragmentShader: dustFragment, transparent: true, depthTest: false, depthWrite: false, uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uOpen: { value: 0 }, uRadius: { value: RADIUS } } }) }), [])
  useEffect(() => () => {
    geometry.dispose(); aura.dispose(); materials.forEach(material => material.dispose())
    rings.forEach(ring => { ring.geometry.dispose(); ring.material.dispose() }); dust.geometry.dispose(); dust.material.dispose()
  }, [geometry, aura, materials, rings, dust])

  const meshes = useRef<(Mesh | null)[]>([]), tilt = useRef<Group>(null), ringGroups = useRef<(Group | null)[]>([]), satellites = useRef<(Mesh | null)[]>([]), dustGroup = useRef<Group>(null)
  const orientation = useRef(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .18))
  const ringTilts = useMemo(() => paths.map(([, x, z]) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z))), [])
  const scratch = useMemo(() => ({ v: new Vector3(), q: new Quaternion(), x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0) }), [])
  const hovered = useRef(-1), active = useRef(-1), lastScroll = useRef(scrollY), prepared = useRef(false), angles = useRef([0, 10])
  const boost = useMemo(() => new Float32Array(cards.length), [cards.length])

  useFrame(({ pointer, clock, gl }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20), c = control.current, { v, q, x, y } = scratch, time = reduced ? 0 : clock.elapsedTime
    // Rotation: drag deltas are applied directly; afterwards velocity eases back to a slow drift.
    let yaw = c.pending[0], pitch = c.pending[1]
    if (c.dragging) {
      c.velocity[0] = MathUtils.lerp(c.velocity[0], yaw / dt, .35); c.velocity[1] = MathUtils.lerp(c.velocity[1], pitch / dt, .35)
    } else if (reduced) {
      c.velocity[0] = c.velocity[1] = 0
    } else {
      const scrollDelta = scrollY - lastScroll.current
      c.velocity[0] = MathUtils.damp(c.velocity[0], .12, 1.6, dt); c.velocity[1] = MathUtils.damp(c.velocity[1], 0, 1.6, dt)
      yaw += c.velocity[0] * dt; pitch += c.velocity[1] * dt + MathUtils.clamp(scrollDelta, -80, 80) * .0014
    }
    lastScroll.current = scrollY
    yaw += c.nudge; c.nudge = 0; c.pending = [0, 0]
    orientation.current.premultiply(q.setFromAxisAngle(y, yaw)).premultiply(q.setFromAxisAngle(x, pitch)).normalize()
    angles.current[0] += MathUtils.radToDeg(yaw); angles.current[1] += MathUtils.radToDeg(pitch)
    const speed = Math.min(1, Math.hypot(c.velocity[0], c.velocity[1]) / 6)

    if (tilt.current) {
      tilt.current.rotation.y = MathUtils.damp(tilt.current.rotation.y, reduced ? 0 : pointer.x * .06, 3, dt)
      tilt.current.rotation.x = MathUtils.damp(tilt.current.rotation.x, reduced ? 0 : -pointer.y * .05, 3, dt)
    }
    const open = reduced ? 1 : intro.current, eased = 1 - Math.pow(1 - open, 3), decor = MathUtils.smoothstep(open, .25, 1)
    aura.uniforms.uTime.value = time; aura.uniforms.uOpen.value = decor
    aura.uniforms.uSpeed.value = MathUtils.damp(aura.uniforms.uSpeed.value, speed, 3, dt)
    ringGroups.current.forEach((group, i) => {
      if (!group) return
      group.quaternion.copy(orientation.current).multiply(ringTilts[i])
      const u = rings[i].material.uniforms; u.uTime.value = time; u.uOpen.value = decor
      const satellite = satellites.current[i], a = time * (.22 + i * .09) + i * 2.1, r = RADIUS * paths[i][0]
      satellite?.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
    })
    if (dustGroup.current) { dustGroup.current.quaternion.copy(orientation.current); dustGroup.current.rotateY(time * .03) }
    dust.material.uniforms.uTime.value = time; dust.material.uniforms.uOpen.value = decor; dust.material.uniforms.uPixel.value = gl.getPixelRatio()

    let front = -1, frontZ = -Infinity
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      v.copy(anchors[i]).applyQuaternion(orientation.current).multiplyScalar(RADIUS * MathUtils.lerp(.35, 1, eased))
      const facing = MathUtils.smoothstep(v.z / RADIUS, -.75, .85), card = cards[i]
      mesh.position.copy(v)
      // Equal area for every frame; depth and the front-most (active) frame decide its size.
      boost[i] = reduced ? Number(i === active.current) : MathUtils.damp(boost[i], i === active.current ? 1 : 0, 5, dt)
      const scale = card.size / Math.sqrt(card.aspect) * MathUtils.lerp(.58, 1.1, facing * facing) * (1 + boost[i] * .24) * MathUtils.lerp(.6, 1, eased)
      mesh.scale.set(scale * card.aspect, scale, 1)
      mesh.renderOrder = 10 + Math.round((v.z + RADIUS * 2) * 100)
      const u = materials[i].uniforms
      u.uFacing.value = facing; u.uTime.value = time
      u.uOpacity.value = MathUtils.lerp(.08, 1, facing * facing)
      u.uReveal.value = reduced ? 1 : MathUtils.smoothstep(open, i / cards.length * .5, i / cards.length * .5 + .5)
      u.uHover.value = MathUtils.damp(u.uHover.value, hovered.current === i ? 1 : 0, 8, dt)
      u.uSpeed.value = MathUtils.damp(u.uSpeed.value, reduced ? 0 : speed, 6, dt)
      if (v.z > frontZ) { frontZ = v.z; front = i }
    })
    if (front !== active.current) { active.current = front; onActive(front) }
    onTelemetry?.(angles.current[0], angles.current[1], speed)
    if (!prepared.current) { prepared.current = true; requestAnimationFrame(() => sceneReady('collection')) }
  })

  const facing = (i: number) => materials[i].uniforms.uFacing.value > .45
  const over = (e: ThreeEvent<PointerEvent>, i: number) => {
    e.stopPropagation(); hovered.current = facing(i) ? i : -1; onHover(hovered.current >= 0)
    if (e.uv) materials[i].uniforms.uPointer.value.copy(e.uv)
  }
  const out = (i: number) => { if (hovered.current === i) { hovered.current = -1; onHover(false) } }
  const click = (e: ThreeEvent<MouseEvent>, i: number) => { e.stopPropagation(); if (control.current.moved < 6 && facing(i)) onSelect(i) }

  return <>
    <mesh position={[0, 0, -6]} scale={[40, 16, 1]} geometry={geometry} material={aura} renderOrder={0} raycast={() => null} />
    <group ref={tilt}>
      {rings.map((ring, i) => <group key={i} ref={el => { ringGroups.current[i] = el }}>
        <lineLoop geometry={ring.geometry} material={ring.material} renderOrder={1} raycast={() => null} />
        <mesh ref={el => { satellites.current[i] = el }} renderOrder={2} raycast={() => null}><sphereGeometry args={[i === 0 ? .055 : .035, 16, 12]} /><meshBasicMaterial color={i === 0 ? '#bf291b' : i === 1 ? '#2b3a6b' : '#c79a62'} transparent depthTest={false} /></mesh>
      </group>)}
      <group ref={dustGroup}><points geometry={dust.geometry} material={dust.material} renderOrder={3} raycast={() => null} /></group>
      {cards.map((card, i) => <mesh key={`${card.file}-${i}`} ref={el => { meshes.current[i] = el }} geometry={geometry} material={materials[i]} onPointerOver={e => over(e, i)} onPointerMove={e => over(e, i)} onPointerOut={() => out(i)} onClick={e => click(e, i)} />)}
    </group>
  </>
}

export function CollectionOrbitCanvas(props: OrbitProps & { running?: boolean }) {
  const { running, ...orbit } = props
  return <Canvas frameloop={running ? 'always' : 'demand'} dpr={[1, 1.75]} camera={{ position: [0, 0, 14], fov: 29 }} gl={{ alpha: true, antialias: true }}><Orbit {...orbit} /></Canvas>
}
