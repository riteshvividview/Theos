import { sceneReady } from '@/loading/readiness'
import { useEffect, useMemo, useRef, Suspense, type MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, DoubleSide, Group, MathUtils, ShaderMaterial, TextureLoader, Color, MeshPhysicalMaterial, PMREMGenerator, Vector2 } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

function Prepared({ name }: { name: string }) {
  const done = useRef(false)
  useFrame(() => { if (!done.current) { done.current = true; requestAnimationFrame(() => sceneReady(name)) } })
  return null
}

function StudioEnvironment() {
  const {gl}=useThree()
  const environment=useMemo(()=>{
    const generator=new PMREMGenerator(gl),room=new RoomEnvironment(),target=generator.fromScene(room,.04)
    room.dispose();generator.dispose()
    return target
  },[gl])
  useEffect(()=>()=>environment.dispose(),[environment])
  return <primitive object={environment.texture} attach="environment"/>
}

function ribbonGeometry() {
  const positions: number[] = [], indices: number[] = []
  const steps = 320
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, angle = t * Math.PI * 6.6
    for (let j = 0; j < 2; j++) positions.push(Math.cos(angle) * 1.22, 3.1 - t * 6.2 + (j - .5) * .69, Math.sin(angle) * 1.22)
    if (i < steps) { const a = i * 2; indices.push(a, a+1, a+2, a+1, a+3, a+2) }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals()
  return geo
}

function Ribbon({ progress, active, reduced, finish }: { progress: MutableRefObject<number>; active: number; reduced: boolean; finish:string }) {
  const group = useRef<Group>(null)
  const material=useRef<MeshPhysicalMaterial>(null)
  const colour=useMemo(()=>new Color(finish==='metal'?'#bcc3cd':finish==='clay'?'#c97554':'#e72516'),[finish])
  const geometry = useMemo(() => ribbonGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ pointer }, dt) => {
    if (!group.current) return
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, reduced ? -.25 : -.25 + progress.current * 1.5 + pointer.x * .25, 4, dt)
    group.current.rotation.z = MathUtils.damp(group.current.rotation.z, reduced ? 0 : pointer.y * .025, 4, dt)
    if(material.current){const blend=reduced?1:1-Math.exp(-5*dt);material.current.color.lerp(colour,blend);material.current.roughness=MathUtils.lerp(material.current.roughness,finish==='clay'?.82:finish==='metal'?.23:.28,blend);material.current.metalness=MathUtils.lerp(material.current.metalness,finish==='metal'?.88:finish==='clay'?0:.24,blend)}
  })
  return <>
    <ambientLight intensity={.7} />
    <directionalLight position={[3, 5, 5]} intensity={3} color="#fff3e4" />
    <directionalLight position={[-4, 0, -3]} intensity={1.2} color="#ff694e" />
    <pointLight position={[2, 2.5-active*1.6, 3]} intensity={7} color="#ffd8bd" distance={7} />
    <group ref={group} rotation={[0, -.25, 0]}>
      <mesh geometry={geometry}><meshPhysicalMaterial ref={material} color="#e72516" metalness={.24} roughness={.28} clearcoat={.8} side={DoubleSide} /></mesh>
      {[.10,.32,.57,.81].map((t,i) => {
        const a=t*Math.PI*6.6
        return <group key={t} position={[Math.cos(a)*1.2, 3.1-t*6.2+.36, Math.sin(a)*1.2]} scale={.12}>
          <mesh position={[0,.8,0]}><sphereGeometry args={[.19,12,8]} /><meshStandardMaterial color={active===i?'#f5e7cf':'#152232'} /></mesh>
          <mesh position={[0,.35,0]}><capsuleGeometry args={[.15,.45,4,8]} /><meshStandardMaterial color={active===i?'#f5e7cf':'#152232'} /></mesh>
          {[-1,1].map(side=><mesh key={side} position={[side*.12,-.15,0]} rotation={[0,0,side*.1]}><capsuleGeometry args={[.06,.42,4,6]} /><meshStandardMaterial color="#152232" /></mesh>)}
        </group>
      })}
    </group>
  </>
}

export function RibbonCanvas(props: { progress: MutableRefObject<number>; active: number; reduced: boolean; finish:string; running?:boolean }) {
  return <Canvas frameloop={props.running ? 'always' : 'demand'} dpr={[1,1.5]} camera={{ position:[0,.1,10.5], fov:40 }} gl={{ alpha:true, antialias:true }} fallback={<img src="/images/redesign/spiral-reference.jpg" alt="Red spiral sculpture" />}><StudioEnvironment/><Ribbon {...props} /><Prepared name="ribbon"/></Canvas>
}

function Signature({reduced}:{reduced:boolean}) {
  const group=useRef<Group>(null)
  useFrame(({pointer,clock},dt)=>{
    if(!group.current)return
    group.current.rotation.y=MathUtils.damp(group.current.rotation.y,reduced?-.35:-.35+pointer.x*.5,5,dt)
    group.current.rotation.x=MathUtils.damp(group.current.rotation.x,reduced?.18:.18+pointer.y*.25,5,dt)
    group.current.position.y=reduced?0:Math.sin(clock.elapsedTime*.55)*.055
    group.current.rotation.z=reduced?-.2:-.2+Math.sin(clock.elapsedTime*.2)*.07
  })
  return <><StudioEnvironment/><ambientLight intensity={.4}/><directionalLight position={[4,6,5]} intensity={3}/><pointLight position={[-3,0,2]} color="#ff7862" intensity={12}/>
    <group ref={group} rotation={[.18,-.35,-.2]}>
      <mesh scale={[1,1.15,1]}><torusGeometry args={[1.22,.30,40,160]}/><meshPhysicalMaterial color="#c52232" metalness={.5} roughness={.22} clearcoat={1} envMapIntensity={1.1}/></mesh>
      <mesh rotation={[.22,.4,.15]} scale={[1,1.15,1]}><torusGeometry args={[1.8,.012,8,160]}/><meshStandardMaterial color="#c1c9d9" metalness={.8} roughness={.25}/></mesh>
      <mesh rotation={[-.5,.25,0]} scale={[1,1.15,1]}><torusGeometry args={[1.91,.007,8,160]}/><meshStandardMaterial color="#8294b0" metalness={.5} roughness={.3}/></mesh>
      <mesh position={[1.78,.13,.1]}><sphereGeometry args={[.065,20,14]}/><meshStandardMaterial color="#f1d6b7" metalness={.7} roughness={.2}/></mesh>
    </group></>
}

export function SignatureCanvas({reduced,running}:{reduced:boolean;running?:boolean}) {
  return <Canvas frameloop={running ? 'always' : 'demand'} dpr={[1,1.5]} camera={{position:[0,0,6.8],fov:43}} gl={{alpha:true,antialias:true}}><Signature reduced={reduced}/><Prepared name="signature"/></Canvas>
}

// Blueprint → as-built reveal: the architectural study and the finished interior fill the stage, each moving on its own depth map.
export type BlueprintLens = { x: number; y: number; inside: boolean; built: boolean; originX: number; originY: number }

const IMAGE_ASPECT = 1562 / 1007

const blueprintVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`
const blueprintFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage, uBuilt, uBuiltDepth;
uniform vec2 uRes, uLens, uParallax;
uniform float uLensR, uBuild, uZoom, uPush, uTime, uImageAspect, uReveal;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return v;}
void main(){
 // Cover the stage from a focal point low in the room, so the furniture stays in frame at any viewport shape.
 float screenAspect=uRes.x/uRes.y;
 vec2 span=screenAspect>uImageAspect?vec2(1.,uImageAspect/screenAspect):vec2(screenAspect/uImageAspect,1.);
 span/=uZoom;
 vec2 focus=clamp(vec2(.5,.45),span*.5,1.-span*.5);
 vec2 base=focus+(vUv-.5)*span;

 // The plan was drawn from the finished interior itself, so both share one layout and one depth map, and move as one:
 // near surfaces (dark in the map) push and parallax further.
 float near=1.-texture2D(uBuiltDepth,base).r;
 vec2 builtUv=focus+(base-focus)*(1.-uPush*(.03+.07*near))+uParallax*(near-.45)*.022;
 builtUv=clamp(builtUv,.002,.998);
 vec3 study=texture2D(uImage,builtUv).rgb;
 // Entrance: the stage starts as blank paper in the page's cream; the plan draws itself on, dark ink first from the vanishing
 // point outward, then the mid-tones, then its colour.
 if(uReveal<.999){
  float ink=dot(study,vec3(.299,.587,.114));
  float key=length((vUv-vec2(.5,.45))*vec2(screenAspect,1.))*.42+ink*.5+(fbm(vUv*vec2(screenAspect,1.)*6.)-.5)*.2;
  float drawn=smoothstep(key-.06,key+.02,uReveal*1.5-.12);
  vec3 sketch=mix(vec3(ink),study,smoothstep(.55,1.,uReveal));
  study=mix(vec3(.98,.976,.961),sketch,drawn);
 }

 // One formless reveal: a soft, edgeless glow of the built room around the cursor, its shape gently warped by large, slow,
 // smooth noise so it never reads as a circle. A double-click grows it until it covers the stage.
 vec2 aspect=vec2(screenAspect,1.), frag=gl_FragCoord.xy/uRes;
 float grow=uBuild*uBuild*(3.-2.*uBuild);
 // Grown far enough that the soft falloff lies well beyond every corner, so nothing of the plan lingers at the end.
 float R=mix(uLensR,length(aspect)*4.,grow*grow);
 vec2 field=frag*aspect*1.8;
 vec2 warp=(vec2(vnoise(field+uTime*.1),vnoise(field+vec2(7.1,3.4)-uTime*.08))-.5)*min(R,.3)*.8;
 float d=length((frag-uLens)*aspect+warp)/max(R,1e-3);
 float real=smoothstep(.05,.88,exp(-d*d*1.3))*step(.002,R);
 real=max(real,smoothstep(.8,1.,grow));
 vec3 col=mix(study,texture2D(uBuilt,builtUv).rgb,real);
 gl_FragColor=vec4(col,1.);
}`

function Blueprint({ progress, lens, reduced }: { progress: MutableRefObject<number>; lens: MutableRefObject<BlueprintLens>; reduced: boolean }) {
  // The plan and the finished interior are pixel-aligned and share one depth map.
  const loaded = useLoader(TextureLoader, ['/images/redesign/architecture-plan.jpg', '/images/redesign/Interiorimg.png', '/images/redesign/Interiorimg-depth.png'])
  // Sampled as raw sRGB: the shader composes in display space and writes straight to the canvas.
  const textures = useMemo(() => loaded.map(source => { const texture = source.clone(); texture.needsUpdate = true; return texture }), [loaded[0], loaded[1], loaded[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures])
  const uniforms = useMemo(() => ({ uImage: { value: textures[0] }, uBuilt: { value: textures[1] }, uBuiltDepth: { value: textures[2] }, uRes: { value: new Vector2(1, 1) }, uLens: { value: new Vector2(.5, .5) }, uParallax: { value: new Vector2() }, uImageAspect: { value: IMAGE_ASPECT }, uLensR: { value: 0 }, uReveal: { value: 0 }, uBuild: { value: 0 }, uZoom: { value: 1 }, uPush: { value: 0 }, uTime: { value: 0 } }), [textures])
  const material = useRef<ShaderMaterial>(null), drift = useRef(new Vector2())
  useFrame(({ clock, size, gl }, rawDt) => {
    if (!material.current) return
    // Uniforms are read from the live material; the props object is only the initial value.
    const u = material.current.uniforms, dt = Math.min(rawDt, 1 / 20), l = lens.current, p = reduced ? .3 : progress.current, t = reduced ? 0 : clock.elapsedTime
    u.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio())
    u.uTime.value = t
    // Scroll: the image settles from a slight zoom as the stage opens, then the camera pushes into the room.
    u.uZoom.value = MathUtils.damp(u.uZoom.value, MathUtils.lerp(1.14, 1, MathUtils.smoothstep(p, 0, .3)), 6, dt)
    u.uPush.value = MathUtils.damp(u.uPush.value, reduced ? 0 : MathUtils.smoothstep(p, .3, 1), 5, dt)
    // The cursor is the camera: it drives the depth parallax, with a slow idle sway on top.
    const aimX = l.inside ? (l.x - .5) * 2 : 0, aimY = l.inside ? (l.y - .5) * 2 : 0
    drift.current.set(MathUtils.damp(drift.current.x, aimX, 3, dt), MathUtils.damp(drift.current.y, aimY, 3, dt))
    u.uParallax.value.set(drift.current.x + (reduced ? 0 : Math.sin(t * .33) * .45), drift.current.y + (reduced ? 0 : Math.cos(t * .27) * .3))
    // A closed lens reopens where the cursor is, rather than sliding in from where it last left.
    if (u.uLensR.value < .005 && u.uBuild.value < .001) u.uLens.value.set(l.x, l.y)
    const centre = u.uBuild.value > .001 ? [l.originX, l.originY] : [l.x, l.y]
    // It drifts after the cursor rather than snapping to it.
    u.uLens.value.set(MathUtils.damp(u.uLens.value.x, centre[0], 7, dt), MathUtils.damp(u.uLens.value.y, centre[1], 7, dt))
    u.uLensR.value = MathUtils.damp(u.uLensR.value, l.inside ? .32 : 0, 5, dt)
    // The plan draws itself onto the paper as the stage scrolls in.
    u.uReveal.value = reduced ? 1 : MathUtils.damp(u.uReveal.value, MathUtils.smoothstep(p, .04, .36), 3.5, dt)
    // The circle grows out over about 0.9 s, or shrinks back to the cursor.
    u.uBuild.value = reduced ? Number(l.built) : MathUtils.clamp(u.uBuild.value + (l.built ? 1 : -1) * dt / .9, 0, 1)
  })
  return <mesh frustumCulled={false}><planeGeometry args={[2, 2]} /><shaderMaterial ref={material} vertexShader={blueprintVertex} fragmentShader={blueprintFragment} uniforms={uniforms} depthTest={false} depthWrite={false} toneMapped={false} /></mesh>
}

export function BlueprintCanvas(props: { progress: MutableRefObject<number>; lens: MutableRefObject<BlueprintLens>; reduced: boolean; running?: boolean }) {
  const { running, ...blueprint } = props
  return <Canvas frameloop={running ? 'always' : 'demand'} flat dpr={[1, 1.5]} gl={{ alpha: false, antialias: false }} fallback={null}><Suspense fallback={null}><Blueprint {...blueprint} /><Prepared name="drawing" /></Suspense></Canvas>
}
