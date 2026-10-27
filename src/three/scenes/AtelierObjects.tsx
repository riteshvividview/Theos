import { sceneReady } from '@/loading/readiness'
import { useEffect, useMemo, useRef, Suspense, type MutableRefObject } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, DoubleSide, Group, MathUtils, ShaderMaterial, TextureLoader, SRGBColorSpace, Color, MeshPhysicalMaterial, PMREMGenerator } from 'three'
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

const vertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`
const fragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform float uReveal;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
 vec2 uv=vUv;
 vec4 photo=texture2D(uImage,uv);
 vec2 px=vec2(1./1672.,1./1077.);
 float dx=lum(texture2D(uImage,uv+vec2(px.x,0.)).rgb)-lum(texture2D(uImage,uv-vec2(px.x,0.)).rgb);
 float dy=lum(texture2D(uImage,uv+vec2(0.,px.y)).rgb)-lum(texture2D(uImage,uv-vec2(0.,px.y)).rgb);
 float edge=clamp(length(vec2(dx,dy))*6.,0.,1.);
 vec3 paper=mix(vec3(.98,.98,.965),vec3(.11,.22,.34),edge*.8);
 float grid=step(.986,fract(uv.x*42.))+step(.986,fract(uv.y*27.));
 paper=mix(paper,vec3(.58,.66,.73),min(grid,.5)*.18);
 float form=clamp(uReveal*2.,0.,1.);
 float colour=clamp((uReveal-.5)*2.,0.,1.);
 float formMask=(1.-smoothstep(form-.035,form+.035,uv.x))*smoothstep(0.,.02,form);
 float colourMask=(1.-smoothstep(colour-.035,colour+.035,uv.x))*smoothstep(0.,.02,colour);
 if(form>.999)formMask=1.;
 if(colour>.999)colourMask=1.;
 vec3 material=vec3(lum(photo.rgb)) * vec3(1.01,1.,.98);
 vec3 result=mix(mix(paper,material,formMask),photo.rgb,colourMask);
 gl_FragColor=vec4(result,1.);
 #include <colorspace_fragment>
}`

function Drawing({ reveal, reduced }: { reveal: MutableRefObject<number>; reduced:boolean }) {
  const source=useLoader(TextureLoader,'/images/redesign/architecture.jpg')
  const image=useMemo(()=>{const texture=source.clone();texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;return texture},[source])
  const material=useRef<ShaderMaterial>(null)
  useEffect(()=>()=>image.dispose(),[image])
  const uniforms=useMemo(()=>({uImage:{value:image},uReveal:{value:0}}),[image])
  useFrame((_,dt)=>{if(!material.current)return; const u=material.current.uniforms; u.uReveal.value=reduced?reveal.current:MathUtils.damp(u.uReveal.value,reveal.current,7,dt)})
  return <mesh><planeGeometry args={[2,2]} /><shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthTest={false} depthWrite={false} toneMapped={false} /></mesh>
}

export function DrawingCanvas(props: { reveal: MutableRefObject<number>; reduced:boolean; running?:boolean }) {
  return <Canvas frameloop={props.running ? 'always' : 'demand'} flat dpr={[1,1.5]} gl={{alpha:true,antialias:false}} fallback={null}><Suspense fallback={null}><Drawing {...props} /><Prepared name="drawing"/></Suspense></Canvas>
}
