import { sceneReady } from '@/loading/readiness'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Box3, Color, DoubleSide, MathUtils, NeutralToneMapping, Plane, PMREMGenerator, RectAreaLight, Vector2, Vector3, type DirectionalLight, type Material, type Mesh, type MeshStandardMaterial, type PointLight, type PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'

// The glass pavilion of section 03, built in Blender (tools/pavilion). The rooms rest a little dark; hovering one fills it
// with light (cove wash, ceiling light, LED line, the dining arc lamp) and spills a little of it onto the plinth below.
// Curtains blend between two cloth-simulated shapes (Half: mid-pull, the fabric dragging; Open: gathered), ripple in
// the vertex shader as they move, and can be grabbed and dragged open or shut.
export type PavilionRoomId = 'lounge_west' | 'kitchen' | 'dining' | 'living' | 'lounge_east' | 'bedroom'
type Cloth = {
  mesh: Mesh; dir: number; target: Vector3; velocity: Vector3
  uniforms: { uTime: { value: number }; uWave: { value: number }; uSwing: { value: number }; uTop: { value: number }; uBottom: { value: number }; uGrab: { value: Vector3 }; uPull: { value: Vector3 }
    uWindDir: { value: number } }
}
type Room = {
  id: PavilionRoomId; hit: Mesh; light?: PointLight; lamp?: PointLight; bulb?: MeshStandardMaterial; wash?: RectAreaLight; spill?: RectAreaLight
  cove?: MeshStandardMaterial; curtains: Cloth[]; glow: number; open: number; manual?: number; wave: number
}
type Props = { reduced: boolean; onRoom: (room: PavilionRoomId | null) => void; hold?: PavilionRoomId }

RectAreaLightUniformsLib.init()

// Light levels: a room at rest sits at REST of its full light. The wash is a soft area light along the ceiling cove that
// grazes the back wall; the point light fills the floor and furniture; the spill faces down from under the floor slab.
const REST = .12, WASH_LIT = 11, LIGHT_LIT = 38, LIGHT_REACH = 3.8, COVE_REST = 1.2, COVE_LIT = 14, INTERIOR_AMBIENT = .07
const LAMP_LIT = 11, LAMP_REACH = 2.3, BULB_REST = .05, BULB_LIT = 7, SPILL_LIT = 2.2
// Rooms whose own fill is held back so a feature light reads: the dining room is lit mostly by its arc lamp.
const ROOM_FILL: Partial<Record<PavilionRoomId, number>> = { dining: .25 }
const WARM = new Color('#ffdfb8')
const INTERIOR = /^(Interior_|Core_Wall|Partition_|Furn_|Kitchen_|Dining_|Art_|Rug_)/
// Finishes as in the reference elevation: warm white slabs, true-black frames, ivory walls, mid charcoal curtains.
const FINISH: Record<string, { color: string; roughness: number; metalness?: number }> = {
  Slab_White: { color: '#f6f4ef', roughness: .55, metalness: 0 },
  Steel_Black: { color: '#060606', roughness: .42, metalness: .1 },
  Plinth_Graphite: { color: '#3a3b3e', roughness: .6, metalness: 0 },
  Wall_Cream: { color: '#efe9df', roughness: .9 },
  Ceiling_Warm: { color: '#f1ebe1', roughness: .9 },
  Floor_Oak_Pale: { color: '#8f7d6b', roughness: .5 },
  Curtain_Charcoal: { color: '#45464a', roughness: .9 },
}
// Straight front elevation, eye a little above the floor slab.
const TARGET = new Vector3(0, 2.5, 0), VIEW = new Vector3(0, .06, 1).normalize(), HALF_WIDTH = 18.4
const TURN = .2, ZOOM = .1, PAN = 1.2
// Narrow (phone) framing: below this stage aspect the camera shows about two rooms (COMPACT_HALF metres each side) and
// is swiped along the house within PAN_LIMIT of its centre.
const COMPACT_ASPECT = 1.4, COMPACT_HALF = 4.4, PAN_LIMIT = 13.6
// Cloth: a resting breeze, how much a pull makes the fabric ripple and lag, and how far a drag (in screen widths) pulls.
// WIND: how far (metres) the gusts carry the hem.
const WIND = .8
const BREEZE = .006, RIPPLE = .09, SWING = .12, DRAG = 6
// Stretch: the grabbed fabric follows the hand within REACH metres around the grip, up to PULL_MAX, springing back
// underdamped (a little wobble) on release. Sideways motion mostly goes into drawing the curtain, so it is damped.
const GRIP = .8, PULL_MAX = .7, PULL_SIDE = .45, BULGE = .3, PINCH = .42, STIFF = 70, DAMP = 6

// Ripples run along the fabric and grow toward the free hem; uSwing leans the hem behind a pull; uPull stretches the
// fabric around the grip point, pinned at the rail.
// Idempotent: StrictMode runs the scene setup twice and keeps the first result, so a second material swap would leave
// the kept uniforms driving a material nothing draws.
function makeCloth(mesh: Mesh): Cloth {
  if (mesh.userData.cloth) return mesh.userData.cloth as Cloth
  const geometry = mesh.geometry
  // Rail and hem from the closed shape only (three's bounding box also spans the morph targets).
  const base = geometry.attributes.position, open = geometry.morphAttributes.position?.[mesh.morphTargetDictionary?.Open ?? -1]
  let top = -Infinity, bottom = Infinity, shift = 0
  for (let i = 0; i < base.count; i++) { const y = base.getY(i); top = Math.max(top, y); bottom = Math.min(bottom, y) }
  if (open) for (let i = 0; i < open.count; i++) shift += open.getX(i)
  // The wind blows from the right onto every curtain, carrying the fabric to the left.
  const windDir = -1
  const uniforms = { uTime: { value: 0 }, uWave: { value: BREEZE }, uSwing: { value: 0 }, uTop: { value: top }, uBottom: { value: bottom }, uGrab: { value: new Vector3() }, uPull: { value: new Vector3() }, uWindDir: { value: windDir } }
  const material = (mesh.material as MeshStandardMaterial).clone()
  material.side = DoubleSide
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWave, uSwing, uTop, uBottom, uWindDir;\nuniform vec3 uGrab, uPull;')
      .replace('#include <displacementmap_vertex>', `#include <displacementmap_vertex>
        vec3 fromGrip = transformed - uGrab;
        float grip = exp(-dot(fromGrip, fromGrip) / ${(GRIP * GRIP).toFixed(4)}) * (1. - smoothstep(uTop - .7, uTop - .05, transformed.y));
        // Fabric bunches toward the hand the harder it is pulled, then follows the pull.
        transformed.xy -= fromGrip.xy * grip * min(length(uPull) / ${PULL_MAX.toFixed(2)}, 1.) * ${PINCH.toFixed(2)};
        transformed += uPull * grip;
        transformed.z += length(uPull) * ${BULGE.toFixed(2)} * grip;
        float hang = clamp((uTop - position.y) / max(uTop - uBottom, 1e-3), 0., 1.);
        float ripple = sin(position.x * 7.3 - uTime * 1.7 + position.y * 1.3) * .6 + sin(position.x * 3.1 + uTime * 1.1 - position.y * 2.2) * .4;
        transformed += objectNormal * ripple * uWave * (.25 + hang * hang);
        transformed.x -= uSwing * hang * hang;
        // A gusting wind: the hem drifts with it and the fabric billows softly, travelling across the pleats.
        float gust = (.55 + .45 * sin(uTime * .63 + position.y * .7)) * (.65 + .35 * sin(uTime * 1.71 + position.x * 2.3));
        transformed.x += uWindDir * gust * ${WIND.toFixed(3)} * hang * hang;
        transformed.z += gust * ${(WIND * .7).toFixed(3)} * hang * (.5 + .5 * sin(position.x * 5.5 - uWindDir * uTime * 1.4));`)
  }
  // One key per curtain: a shared key would reuse the first curtain's program without wiring this one's uniforms.
  material.customProgramCacheKey = () => `pavilion-cloth-${mesh.name}`
  mesh.material = material
  const cloth = { mesh, dir: Math.sign(shift) || 1, target: new Vector3(), velocity: new Vector3(), uniforms }
  mesh.userData.cloth = cloth
  return cloth
}

function Pavilion({ reduced, onRoom, hold }: Props) {
  const gltf = useLoader(GLTFLoader, '/models/pavilion/pavilion.glb')
  const { gl, scene, camera, raycaster, pointer, size } = useThree()
  const inside = useRef(false), current = useRef<PavilionRoomId | null>(null), prepared = useRef(false), sway = useRef(0), zoom = useRef(0), distance = useRef(40)
  const drag = useRef<{ room: Room; cloth: Cloth; x: number; open: number; plane: Plane } | null>(null), cursor = useRef('')
  const compact = useRef(false), pan = useRef(0), panShown = useRef(0), panDrag = useRef<{ x: number; start: number } | null>(null)

  const environment = useMemo(() => {
    const generator = new PMREMGenerator(gl), room = new RoomEnvironment(), target = generator.fromScene(room, .04)
    room.dispose(); generator.dispose()
    return target
  }, [gl])

  const rooms = useMemo(() => {
    const byId = new Map<PavilionRoomId, Room>(), curtains: Mesh[] = []
    let bulb: MeshStandardMaterial | undefined
    gltf.scene.traverse(object => {
      // No sun: daylight through the glass would flatten the interior glow.
      if (object.name === 'Sun_Key') object.traverse(child => { if ((child as DirectionalLight).isDirectionalLight) (child as DirectionalLight).intensity = 0 })
      const mesh = object as Mesh
      const interior = INTERIOR.test(object.name) || INTERIOR.test(object.parent?.name ?? '')
      if (mesh.isMesh) for (const material of [mesh.material].flat() as Material[]) {
        const standard = material as MeshStandardMaterial, finish = FINISH[material.name]
        if (finish) { standard.color.set(finish.color); standard.roughness = finish.roughness; if (finish.metalness !== undefined) standard.metalness = finish.metalness }
        if (material.name === 'Glass') material.depthWrite = false
        if (material.name === 'Lamp_Bulb') bulb = standard
        // The renderer ignores envMapIntensity for materials lit by scene.environment, so interior ones hold the map themselves.
        if (interior && material.name !== 'Steel_Black') Object.assign(material, { envMap: environment.texture, envMapIntensity: INTERIOR_AMBIENT })
      }
      if (object.name.startsWith('Curtain') && mesh.isMesh) curtains.push(mesh)
      const match = /^Room_(.+)_(hit|light|lamp|cove)$/.exec(object.name)
      if (!match) return
      const id = match[1] as PavilionRoomId
      const room = byId.get(id) ?? { id, hit: undefined as unknown as Mesh, curtains: [], glow: 0, open: 0, wave: BREEZE }
      byId.set(id, room)
      if (match[2] === 'hit') { room.hit = mesh; (mesh.material as Material).visible = false }
      if (match[2] === 'light' || match[2] === 'lamp') object.traverse(child => {
        const light = child as PointLight
        if (!light.isPointLight) return
        light.color.copy(WARM); light.decay = 1
        if (match[2] === 'light') { light.distance = LIGHT_REACH; room.light = light } else { light.distance = LAMP_REACH; room.lamp = light }
      })
      // Each cove gets its own copy of the shared LED material so rooms glow independently.
      if (match[2] === 'cove') {
        if (!mesh.userData.ownMaterial) { mesh.material = (mesh.material as MeshStandardMaterial).clone(); mesh.userData.ownMaterial = true }
        room.cove = mesh.material as MeshStandardMaterial
      }
    })
    gltf.scene.updateMatrixWorld(true)
    const list = [...byId.values()].filter(room => room.hit)
    const spans = list.map(room => new Box3().setFromObject(room.hit))
    // The loaded scene is cached, so area lights are reused by name on a re-run (StrictMode, hot reload) instead of stacking.
    const area = (name: string, width: number, height: number) => {
      const light = (gltf.scene.getObjectByName(name) as RectAreaLight | undefined) ?? new RectAreaLight(WARM, 0, width, height)
      light.name = name; gltf.scene.add(light); return light
    }
    list.forEach((room, i) => {
      const span = spans[i], width = span.max.x - span.min.x, cx = (span.min.x + span.max.x) / 2, cz = (span.min.z + span.max.z) / 2
      room.wash = area(`Room_${room.id}_wash`, width - .3, .45)
      room.wash.position.set(cx, span.max.y - .12, span.max.z - .4)
      room.wash.lookAt(cx, span.min.y + .4, span.min.z + 1.6)
      room.spill = area(`Room_${room.id}_spill`, width - .4, span.max.z - span.min.z - .6)
      room.spill.position.set(cx, span.min.y - .45, cz)
      room.spill.lookAt(cx, 0, cz)
      if (room.lamp) room.bulb = bulb
    })
    for (const curtain of curtains) {
      const x = new Box3().setFromObject(curtain).getCenter(new Vector3()).x
      const index = spans.findIndex(span => x >= span.min.x && x <= span.max.x)
      if (index >= 0) list[index].curtains.push(makeCloth(curtain))
    }
    return list
  }, [gltf, environment])

  const hits = useMemo(() => rooms.map(room => room.hit), [rooms])
  const cloths = useMemo(() => rooms.flatMap(room => room.curtains.map(cloth => ({ room, cloth }))), [rooms])
  // Not disposed here: StrictMode runs this cleanup and then the effect again with the same memoized map,
  // which would leave the scene lit by a freed texture (black slabs). The renderer's teardown releases it.
  useEffect(() => {
    scene.environment = environment.texture; scene.environmentIntensity = 1
    return () => { scene.environment = null }
  }, [environment, scene])

  // Grab a curtain: the fabric stretches toward the hand around the grip, and sideways motion draws it along its rail.
  // It stays drawn where it is let go while the room is in view; the stretch springs back.
  useEffect(() => {
    const element = gl.domElement, ndc = new Vector2(), point = new Vector3()
    const at = (e: PointerEvent) => { const box = element.getBoundingClientRect(); return ndc.set((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1) }
    const down = (e: PointerEvent) => {
      raycaster.setFromCamera(at(e), camera)
      const hit = raycaster.intersectObjects(cloths.map(c => c.cloth.mesh), false)[0]
      const found = hit && cloths.find(c => c.cloth.mesh === hit.object)
      // In the narrow (phone) framing a swipe off the curtains travels along the house.
      if (!found) { if (compact.current) panDrag.current = { x: e.clientX, start: pan.current }; return }
      const { cloth } = found
      cloth.uniforms.uGrab.value.copy(cloth.mesh.worldToLocal(hit.point.clone()))
      // The hand moves on a plane through the grip, facing the camera.
      const plane = new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()).negate(), hit.point)
      drag.current = { room: found.room, cloth, x: ndc.x, open: found.room.open, plane }
      element.setPointerCapture(e.pointerId); e.preventDefault()
    }
    const move = (e: PointerEvent) => {
      inside.current = true
      const p = panDrag.current
      if (p) {
        const width = element.getBoundingClientRect().width
        pan.current = MathUtils.clamp(p.start - (e.clientX - p.x) / width * COMPACT_HALF * 2, -PAN_LIMIT, PAN_LIMIT)
        return
      }
      const d = drag.current
      if (!d) return
      d.room.manual = MathUtils.clamp(d.open + d.cloth.dir * (at(e).x - d.x) * DRAG, 0, 1)
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(d.plane, point)) return
      const pull = d.cloth.mesh.worldToLocal(point).sub(d.cloth.uniforms.uGrab.value)
      pull.x *= PULL_SIDE; pull.z = 0
      d.cloth.target.copy(pull.clampLength(0, PULL_MAX))
    }
    const up = () => { drag.current?.cloth.target.set(0, 0, 0); drag.current = null; panDrag.current = null }
    const leave = () => { inside.current = false }
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up); element.addEventListener('pointerleave', leave)
    return () => {
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('pointerleave', leave)
    }
  }, [gl, camera, raycaster, cloths])

  // Frame the whole slab whatever the stage's aspect.
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const halfH = Math.atan(Math.tan(MathUtils.degToRad(cam.fov / 2)) * cam.aspect)
    // Fitted for the closest the camera comes (zoomed in, model turned) so the ends never leave the stage.
    // A narrow stage (phones) frames about two rooms instead, and is swiped along the house.
    compact.current = cam.aspect < COMPACT_ASPECT
    distance.current = (compact.current ? COMPACT_HALF : HALF_WIDTH) / Math.tan(halfH) / (1 - ZOOM) + 2.5
    cam.position.copy(VIEW).multiplyScalar(distance.current).add(TARGET)
    cam.lookAt(TARGET)
  }, [camera, size])

  // Warm up while the page loader is still showing: compile every shader and upload every texture with one frame drawn
  // now, even though the canvas does not run until it is near, so reaching the section never stalls the page.
  useEffect(() => {
    if (prepared.current) return
    prepared.current = true
    const frame = requestAnimationFrame(() => { gl.compile(scene, camera); gl.render(scene, camera); sceneReady('pavilion') })
    return () => cancelAnimationFrame(frame)
  }, [gl, scene, camera])

  useFrame(({ clock }, delta) => {
    const dragging = drag.current
    let hovered: Room | undefined = dragging?.room ?? (hold && rooms.find(room => room.id === hold))
    let overCloth = false
    if (!hovered && inside.current) {
      raycaster.setFromCamera(pointer, camera)
      // A curtain belongs to its room even where it overlaps the next one, and the current room is kept while the
      // cursor is still over it, so the turning model can't flip the hover at a boundary (which reset the curtain).
      const clothHit = raycaster.intersectObjects(cloths.map(c => c.cloth.mesh), false)[0]
      overCloth = !!clothHit
      const under = raycaster.intersectObjects(hits, false), previous = rooms.find(room => room.id === current.current)
      hovered = clothHit ? cloths.find(c => c.cloth.mesh === clothHit.object)?.room
        : previous && under.some(hit => hit.object === previous.hit) ? previous
        : under[0] && rooms.find(room => room.hit === under[0].object)
    }
    const id = hovered?.id ?? null
    if (id !== current.current) { current.current = id; onRoom(id) }
    const nextCursor = dragging ? 'grabbing' : overCloth ? 'grab' : ''
    if (nextCursor !== cursor.current) { cursor.current = nextCursor; gl.domElement.style.cursor = nextCursor }

    const instant = reduced || !!hold, glowStep = instant ? 1 : 1 - Math.exp(-delta * 6), time = clock.elapsedTime
    for (const room of rooms) {
      const lit = room === hovered
      if (!lit) room.manual = undefined
      room.glow += ((lit ? 1 : 0) - room.glow) * glowStep
      // A drag follows the hand closely; the hover pull is slower, like drawing a heavy curtain.
      const before = room.open, target = room.manual ?? (lit ? 1 : 0)
      room.open += (target - room.open) * (instant ? 1 : 1 - Math.exp(-delta * (room.manual !== undefined ? 10 : 1.8)))
      const speed = (room.open - before) / Math.max(delta, 1e-3)
      room.wave += (BREEZE + Math.min(Math.abs(speed), 2.5) * RIPPLE * .4 - room.wave) * (1 - Math.exp(-delta * 3))

      const level = MathUtils.lerp(REST, 1, room.glow) * (ROOM_FILL[room.id] ?? 1)
      if (room.wash) room.wash.intensity = WASH_LIT * level
      if (room.light) room.light.intensity = LIGHT_LIT * level
      if (room.spill) room.spill.intensity = SPILL_LIT * room.glow
      if (room.lamp) room.lamp.intensity = LAMP_LIT * room.glow
      if (room.bulb) room.bulb.emissiveIntensity = MathUtils.lerp(BULB_REST, BULB_LIT, room.glow)
      if (room.cove) room.cove.emissiveIntensity = MathUtils.lerp(COVE_REST, COVE_LIT, room.glow)
      // Closed → Half → Open, so the pull reads as the simulated fabric rather than a straight blend.
      const t = room.open, half = t < .5 ? t * 2 : 2 - t * 2, open = Math.max(0, t * 2 - 1)
      for (const cloth of room.curtains) {
        const { mesh, uniforms } = cloth, dict = mesh.morphTargetDictionary, influences = mesh.morphTargetInfluences
        uniforms.uTime.value = time
        uniforms.uWave.value = reduced ? 0 : room.wave
        uniforms.uSwing.value += ((reduced ? 0 : MathUtils.clamp(speed, -2, 2) * SWING * cloth.dir) - uniforms.uSwing.value) * (1 - Math.exp(-delta * 4))
        // Stretch spring: semi-implicit Euler, sub-stepped so a slow frame can't blow it up.
        const pull = uniforms.uPull.value, steps = Math.ceil(Math.min(delta, .05) / .008), dt = Math.min(delta, .05) / steps
        for (let s = 0; s < steps; s++) {
          cloth.velocity.addScaledVector(pull.clone().sub(cloth.target), -STIFF * dt).multiplyScalar(Math.exp(-DAMP * dt))
          pull.addScaledVector(cloth.velocity, dt)
        }
        if (reduced) pull.copy(cloth.target)
        if (!dict || !influences) continue
        if (dict.Half !== undefined) influences[dict.Half] = half
        if (dict.Open !== undefined) influences[dict.Open] = open
      }
    }
    // Narrow framing: the camera glides to where the house has been swiped, square on, no turn.
    if (compact.current) {
      panShown.current += (pan.current - panShown.current) * (reduced ? 1 : 1 - Math.exp(-delta * 8))
      gltf.scene.rotation.y = 0
      camera.position.copy(VIEW).multiplyScalar(distance.current).add(TARGET)
      camera.position.x += panShown.current
      camera.lookAt(TARGET.x + panShown.current, TARGET.y, TARGET.z)
      return
    }
    // The model turns toward the cursor while the camera eases in a little and drifts the same way (held still mid-drag).
    if (!reduced) {
      const ease = 1 - Math.exp(-delta * 2.2)
      if (!dragging) sway.current += ((inside.current ? pointer.x : 0) - sway.current) * ease
      zoom.current += ((inside.current ? 1 : 0) - zoom.current) * ease
      gltf.scene.rotation.y = sway.current * TURN
      camera.position.copy(VIEW).multiplyScalar(distance.current * (1 - ZOOM * zoom.current)).add(TARGET)
      camera.position.x += sway.current * PAN
      camera.lookAt(TARGET.x + sway.current * PAN * .65, TARGET.y, TARGET.z)
    }
  })

  return <primitive object={gltf.scene} />
}

export function PavilionCanvas(props: Props & { running?: boolean }) {
  const { running, ...pavilion } = props
  return <Canvas frameloop={running ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 20, near: .5, far: 200 }} gl={{ alpha: true, antialias: true, toneMapping: NeutralToneMapping, toneMappingExposure: 1.05 }} fallback={null}><Suspense fallback={null}><Pavilion {...pavilion} /></Suspense></Canvas>
}
