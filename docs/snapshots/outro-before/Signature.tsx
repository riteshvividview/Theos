// The closing red O sculpture as it was before the interior scene (2026-10-27). It lived in src/three/scenes/AtelierObjects.tsx,
// and AtelierOutro rendered <SignatureCanvas running={near} reduced={reduced}/> inside .outro-sculpture with the .outro-radial SVG.

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

