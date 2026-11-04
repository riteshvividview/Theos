import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { sceneReady } from '@/loading/readiness'

// The closing scene, "elements of a home": seven drops of liquid material, ray-marched as metaballs so they merge like mercury.
// Scroll gathers them from a loose scatter into the theos O and its dot; drag throws a drop (springs bring it home with a wobble)
// and nearby drops shy from the cursor; a click morphs the material — chrome, red lacquer, glass, pearl. No backdrop: the drops
// sit on the footer's navy under a procedural studio light. Half resolution, created only near the footer.
const COUNT = 7, FOV = 35, CAMERA_Z = 5
const fragment = `precision highp float;
uniform vec2 uRes;
uniform vec4 uB[7];
uniform float uTime, uK, uMatA, uMatB, uMix;
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float map(vec3 p){
  float d = 1e3;
  for (int i = 0; i < 7; i++) d = smin(d, length(p - uB[i].xyz) - uB[i].w, uK);
  return d + sin(p.x * 7. + uTime * 1.3) * sin(p.y * 6. - uTime) * .008;
}
vec3 normalAt(vec3 p){ vec2 e = vec2(.0015, -.0015); return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)); }
// A studio: dark cyclorama, a tall warm softbox on the left, a cool strip on the right, a red bounce from below.
vec3 env(vec3 r){
  vec3 c = mix(vec3(.03, .05, .1), vec3(.2, .26, .38), smoothstep(-.4, .9, r.y));
  c += vec3(1., .95, .88) * smoothstep(.02, 0., abs(r.x + .45) - .16) * smoothstep(-.1, .4, r.y) * 2.4;
  c += vec3(.85, .92, 1.) * smoothstep(.02, 0., abs(r.y - .15) - .05) * smoothstep(.2, .5, r.x) * 1.6;
  c += vec3(.85, .16, .1) * smoothstep(.2, -.9, r.y) * .45;
  return c;
}
vec3 shade(float m, vec3 p, vec3 n, vec3 rd){
  vec3 r = reflect(rd, n);
  float fres = pow(1. - max(dot(-rd, n), 0.), 4.);
  vec3 key = normalize(vec3(-.6, .5, .7));
  float spec = pow(max(dot(r, key), 0.), 60.);
  if (m < .5) return env(r) * vec3(.96, .97, 1.) + spec * .6;                                   // liquid chrome
  if (m < 1.5) return vec3(.62, .05, .04) * (.35 + .65 * max(dot(n, key), 0.)) + env(r) * (.08 + .9 * fres) + spec * 1.2; // red lacquer
  if (m < 2.5) {                                                                                 // clear glass
    vec3 t = env(refract(rd, n, 1. / 1.45)) * vec3(.86, .92, 1.);
    return mix(t, env(r), .08 + .9 * fres) + spec * 1.4;
  }
  vec3 film = .5 + .5 * cos(6.2832 * (vec3(0., .33, .67) + fres * 1.8 + n.y * .35 + uTime * .03)); // iridescent pearl
  return env(r) * mix(vec3(.95, .93, .9), film, .55) * 1.1 + spec;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = vec3(0., 0., ${CAMERA_Z.toFixed(1)}), rd = normalize(vec3(uv * ${(2 * Math.tan(FOV / 2 * Math.PI / 180)).toFixed(4)}, -1.));
  float t = 2.5, d = 1.;
  for (int i = 0; i < 64; i++) { d = map(ro + rd * t); if (d < .001 || t > 8.) break; t += d; }
  if (d > .01) { gl_FragColor = vec4(0.); return; }
  vec3 p = ro + rd * t, n = normalAt(p);
  vec3 col = mix(shade(uMatA, p, n, rd), shade(uMatB, p, n, rd), uMix);
  gl_FragColor = vec4(pow(col, vec3(.9)), 1.);
}`

const materials = ['Liquid chrome', 'Red lacquer', 'Clear glass', 'Pearl']
type Drop = { x: number; y: number; z: number; vx: number; vy: number; r: number; sx: number; sy: number; sz: number }

export function SignatureCanvas({ reduced, running, progress }: { reduced: boolean; running?: boolean; progress: MutableRefObject<number> }) {
  const canvas = useRef<HTMLCanvasElement>(null), [lost, setLost] = useState(false), [material, setMaterial] = useState(0), [grabbing, setGrabbing] = useState(false)
  // It never holds up the page loader: the scene is created only when the footer comes near.
  useEffect(() => { sceneReady('signature') }, [])
  useEffect(() => {
    if (!running || lost) return
    const el = canvas.current, gl = el?.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
    if (!el || !gl) { setLost(true); return }
    const onLost = (e: Event) => { e.preventDefault(); setLost(true) }
    el.addEventListener('webglcontextlost', onLost)
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program); gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(program, n)

    // Drops: six make the O, one the dot. Each also has a loose scatter position for before the scroll gathers them.
    const drops: Drop[] = Array.from({ length: COUNT }, (_, i) => {
      const r = i < 6 ? .4 : .26, sx = (Math.random() - .5) * 2.6, sy = (Math.random() - .5) * 2.2, sz = (Math.random() - .5) * .6
      return { x: sx, y: sy, z: sz, vx: 0, vy: 0, r, sx, sy, sz }
    })
    const halfH = CAMERA_Z * Math.tan(FOV / 2 * Math.PI / 180)
    const toWorld = (cx: number, cy: number) => { const b = el.getBoundingClientRect(), aspect = b.width / b.height; return [((cx - b.left) / b.width * 2 - 1) * halfH * aspect, (1 - (cy - b.top) / b.height * 2) * halfH] }
    const cursor = { x: 99, y: 99 }
    let held = -1, moved = 0, lastX = 0, lastY = 0
    const pointerDown = (e: PointerEvent) => {
      const [x, y] = toWorld(e.clientX, e.clientY); moved = 0; lastX = x; lastY = y
      held = drops.reduce((best, d, i) => Math.hypot(d.x - x, d.y - y) < d.r * 1.35 && (best < 0 || Math.hypot(d.x - x, d.y - y) < Math.hypot(drops[best].x - x, drops[best].y - y)) ? i : best, -1)
      el.setPointerCapture(e.pointerId); if (held >= 0) setGrabbing(true)
    }
    const pointerMove = (e: PointerEvent) => {
      const [x, y] = toWorld(e.clientX, e.clientY); cursor.x = x; cursor.y = y
      if (held >= 0) { const d = drops[held]; d.vx = (x - lastX) * 60; d.vy = (y - lastY) * 60; d.x = x; d.y = y }
      moved += Math.abs(x - lastX) + Math.abs(y - lastY); lastX = x; lastY = y
    }
    const pointerUp = () => {
      if (held < 0 && moved < .03 && cursor.x < 90) { matTarget += 1; setMaterial(matTarget % 4) }
      held = -1; setGrabbing(false)
    }
    const leave = () => { cursor.x = 99; cursor.y = 99 }
    el.addEventListener('pointerdown', pointerDown); addEventListener('pointermove', pointerMove, { passive: true }); addEventListener('pointerup', pointerUp); el.addEventListener('pointerleave', leave)

    let matTarget = 0, matFrom = 0, matMix = 1, frame = 0, last = performance.now()
    const scale = .6, packed = new Float32Array(COUNT * 4)
    const draw = (now: number) => {
      const dt = Math.min(.033, (now - last) / 1000); last = now
      const w = Math.max(1, Math.round(el.clientWidth * scale)), h = Math.max(1, Math.round(el.clientHeight * scale))
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h }
      const time = now / 1000, gather = reduced ? 1 : Math.min(1, Math.max(0, (progress.current - .05) / .55))
      const g = gather * gather * (3 - 2 * gather)
      drops.forEach((d, i) => {
        // Home: the scatter, gathering into the O (squashed slightly tall) and its dot as the footer scrolls in; always breathing a little.
        const a = Math.PI / 2 + i * Math.PI / 3, ox = i < 6 ? Math.cos(a) * .92 : 1.32, oy = i < 6 ? Math.sin(a) * 1.04 : -1.02
        const hx = d.sx + (ox - d.sx) * g + Math.sin(time * .7 + i) * .05, hy = d.sy + (oy - d.sy) * g + Math.cos(time * .6 + i * 1.7) * .05
        d.z = d.sz * (1 - g)
        if (i === held) return
        let ax = (hx - d.x) * 16 - d.vx * 4.4, ay = (hy - d.y) * 16 - d.vy * 4.4
        // Shy of the cursor.
        const cx = d.x - cursor.x, cy = d.y - cursor.y, cd = Math.hypot(cx, cy)
        if (cd < .9 && cd > 1e-3 && held < 0) { const push = (1 - cd / .9) * 26; ax += cx / cd * push; ay += cy / cd * push }
        d.vx += ax * dt; d.vy += ay * dt; d.x += d.vx * dt; d.y += d.vy * dt
      })
      drops.forEach((d, i) => packed.set([d.x, d.y, d.z, d.r], i * 4))
      // Material morph: a short blend from the last material to the chosen one.
      if (matFrom !== matTarget % 4 && matMix >= 1) { matMix = 0 }
      if (matMix < 1) { matMix = Math.min(1, matMix + dt / .7); if (matMix >= 1) matFrom = matTarget % 4 }
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u('uRes'), w, h); gl.uniform4fv(u('uB[0]') ?? u('uB'), packed); gl.uniform1f(u('uTime'), time)
      gl.uniform1f(u('uK'), .3 + .45 * g); gl.uniform1f(u('uMatA'), matFrom); gl.uniform1f(u('uMatB'), matTarget % 4); gl.uniform1f(u('uMix'), matMix >= 1 ? 1 : matMix * matMix * (3 - 2 * matMix))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame); el.removeEventListener('pointerdown', pointerDown); removeEventListener('pointermove', pointerMove); removeEventListener('pointerup', pointerUp); el.removeEventListener('pointerleave', leave)
      el.removeEventListener('webglcontextlost', onLost); gl.deleteProgram(program); gl.deleteBuffer(buffer)
    }
  }, [reduced, progress, running, lost])
  if (lost) return <span className="outro-fallback">o</span>
  return <>
    <canvas ref={canvas} className={`outro-passage${grabbing ? ' is-dragging' : ''}`} aria-label="Liquid drops: drag to throw them, click to change their material." />
    <div className="outro-passage-hint" aria-live="polite"><span>{materials[material]}</span><em>Drag a drop · Click to change the material · Scroll to gather them</em></div>
  </>
}
