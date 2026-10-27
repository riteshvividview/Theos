import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { readyScenes } from '@/loading/readiness'
import '@/styles/pageLoader.css'

const images = Object.keys(import.meta.glob('/public/images/redesign/*.{jpg,png}')).map(path => path.replace('/public', ''))
function loadImage(url: string) {
  return new Promise<void>(resolve => {
    const image = new Image()
    image.onload = () => { image.decode().catch(() => {}).finally(resolve) }
    image.onerror = () => resolve() // A failed image must not trap the visitor.
    image.src = url
  })
}

// The loader's stage: warm white with two slow cobalt and red glows that drift against the cursor, and, on entry, a portal that
// grows out of the wordmark's red dot onto the first world in depth, settling into exactly the hero's own framing.
const fragment = `precision mediump float;
uniform sampler2D uImage, uDepth;
uniform vec2 uRes, uOrigin, uMouse;
uniform float uTime, uEnter;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return v;}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes, aspect=vec2(uRes.x/uRes.y,1.);
 float e=uEnter*uEnter*(3.-2.*uEnter);
 // Paper with drifting glows; they lean away from the cursor, so the page feels layered.
 vec2 glide=-uMouse*.04;
 float cobalt=exp(-pow(length((uv-vec2(.22,.72)-glide+vec2(sin(uTime*.13),cos(uTime*.11))*.04)*aspect)/.42,2.));
 float red=exp(-pow(length((uv-vec2(.8,.26)-glide*1.6+vec2(cos(uTime*.09),sin(uTime*.12))*.05)*aspect)/.34,2.));
 vec3 paper=vec3(.98,.976,.961)+(hash(gl_FragCoord.xy)-.5)*.018;
 paper=mix(paper,vec3(.62,.7,.95),cobalt*.18);
 paper=mix(paper,vec3(.98,.66,.6),red*.14);
 // The portal from the red dot, its edge rippling with noise, rimmed in the dot's red.
 vec2 fromDot=(gl_FragCoord.xy-uOrigin)/uRes.y;
 float maxR=length(aspect)*1.15;
 float R=e*maxR;
 float ripple=(fbm(fromDot*5.+uTime*.3)-.5)*.08*(1.-e);
 float d=length(fromDot)+ripple;
 float inside=(1.-smoothstep(R-.025,R,d))*step(.0005,uEnter);
 float rim=exp(-pow((d-R+.004)/.006,2.))*step(.0005,uEnter)*(1.-smoothstep(.85,1.,e));
 // Inside: the first world in depth, settling from close up into the hero's cover framing (zoom 1.025).
 float imageAspect=1672./1077., screenAspect=uRes.x/uRes.y;
 vec2 cover=screenAspect>imageAspect?vec2(1.,imageAspect/screenAspect):vec2(screenAspect/imageAspect,1.);
 float zoom=mix(1.4,1.025,e);
 vec2 iuv=.5+(uv-.5)*cover/zoom;
 float near=1.-texture2D(uDepth,iuv).r;
 iuv+=uMouse*(near-.3)*.012*(1.-e);
 iuv+=(uv-uOrigin/uRes)*(near-.3)*.05*(1.-e);
 vec3 world=texture2D(uImage,clamp(iuv,vec2(.001),vec2(.999))).rgb;
 vec3 col=mix(paper,world,inside);
 col=mix(col,vec3(.81,.17,.13),rim*.85);
 gl_FragColor=vec4(col,1.);
}`

function Stage({ origin, mouse, enter }: { origin: { current: [number, number] }; mouse: { current: [number, number] }; enter: { current: number } }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current, gl = el?.getContext('webgl', { antialias: false, alpha: false })
    if (!el || !gl) return
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program); gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(program, n)
    const textures = ['/images/redesign/rhino.jpg', '/images/redesign/rhino-depth.png'].map((src, i) => {
      const texture = gl.createTexture()!, image = new Image()
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([250, 249, 245, 255]))
      ;[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      image.onload = () => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image) }
      image.src = src
      return texture
    })
    gl.uniform1i(u('uImage'), 0); gl.uniform1i(u('uDepth'), 1)
    const eased: [number, number] = [0, 0]
    let frame = 0
    const draw = (t: number) => {
      const dpr = Math.min(devicePixelRatio, 1.5), w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr)
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h }
      eased[0] += (mouse.current[0] - eased[0]) * .06; eased[1] += (mouse.current[1] - eased[1]) * .06
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u('uRes'), w, h); gl.uniform2f(u('uOrigin'), origin.current[0] * dpr, h - origin.current[1] * dpr)
      gl.uniform2f(u('uMouse'), eased[0], eased[1]); gl.uniform1f(u('uTime'), t / 1000); gl.uniform1f(u('uEnter'), enter.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); textures.forEach(t => gl.deleteTexture(t)); gl.deleteProgram(program); gl.deleteBuffer(buffer) }
  }, [origin, mouse, enter])
  return <canvas ref={canvas} className="loader-stage" aria-hidden="true" />
}

export function PageLoader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null), dot = useRef<HTMLSpanElement>(null)
  const [progress, setProgress] = useState(1)
  const [slow, setSlow] = useState(false)
  const [ready, setReady] = useState(false), [entering, setEntering] = useState(false)
  const origin = useRef<[number, number]>([innerWidth / 2, innerHeight / 2]), mouse = useRef<[number, number]>([0, 0]), enter = useRef(0)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    let alive = true, completed = 0, displayed = 1, stalledSince = 0
    const tasks = [...images, '/theos-logo.avif'].map(loadImage)
    tasks.push(document.fonts.load('400 16px "Bodoni Moda"').then(() => {}), document.fonts.load('italic 400 16px "Bodoni Moda"').then(() => {}), document.fonts.load('400 16px Manrope').then(() => {}))
    tasks.push(import('@/three/scenes/CinematicHero').then(() => {}), import('@/three/scenes/AtelierObjects').then(() => {}), import('@/three/scenes/LiquidDrops').then(() => {}))
    tasks.forEach(task => task.catch(() => {}).finally(() => { completed++ }))
    const total = tasks.length + 4
    const timer = window.setInterval(() => {
      if (!alive) return
      const target = Math.floor((completed + readyScenes.size) / total * 100)
      displayed = Math.min(100, Math.max(displayed, Math.min(target, displayed + 2)))
      setProgress(displayed)
      // If a scene is slow to report, the last few percent are not allowed to hold the visitor back.
      if (displayed >= 94 && stalledSince === 0) stalledSince = performance.now()
      if (displayed >= 94 && performance.now() - stalledSince > 2500) displayed = 100
      if (displayed === 100) { setProgress(100); clearInterval(timer); setReady(true) }
    }, 30)
    const timeout = window.setTimeout(() => setSlow(true), 18000)
    return () => { alive = false; clearInterval(timer); clearTimeout(timeout) }
  }, [])

  // Enter through the dot: the portal opens from it, the wordmark swells past the camera, and the hero is revealed in place.
  const go = useCallback(() => {
    if (entering) return
    const box = dot.current?.getBoundingClientRect()
    if (box) origin.current = [box.left + box.width / 2, box.top + box.height / 2]
    setEntering(true)
    const state = { v: 0 }
    gsap.to(state, { v: 1, duration: reduced ? .2 : 2.1, ease: 'power2.inOut', onUpdate: () => { enter.current = state.v },
      // The portal ends on exactly the hero's framing; fading the loader then lets the hero's titles arrive softly.
      onComplete: () => { gsap.to(root.current, { opacity: 0, duration: reduced ? .05 : .55, ease: 'power1.out', onComplete: () => { onComplete(); requestAnimationFrame(() => ScrollTrigger.refresh()) } }) } })
  }, [entering, onComplete, reduced])
  useEffect(() => {
    if (!ready || entering) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }
    addEventListener('keydown', key)
    // Nobody is kept waiting: it opens by itself after a few seconds.
    const auto = window.setTimeout(go, reduced ? 300 : 4000)
    return () => { removeEventListener('keydown', key); clearTimeout(auto) }
  }, [ready, entering, go, reduced])

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const x = e.clientX / innerWidth * 2 - 1, y = e.clientY / innerHeight * 2 - 1
    mouse.current = [x, -y]
    root.current?.style.setProperty('--px', x.toFixed(3)); root.current?.style.setProperty('--py', y.toFixed(3))
  }
  return <div ref={root} className={`page-loader${ready ? ' is-ready' : ''}${entering ? ' is-entering' : ''}`} role="status" aria-label="Loading your experience" data-lenis-prevent onPointerMove={reduced ? undefined : move}>
    <Stage origin={origin} mouse={mouse} enter={enter} />
    <div className="loader-top loader-layer" style={{ '--depth': .25 } as CSSProperties}><span>INTERIORS · FURNITURE · IMAGINATION</span><span>BEYOND THE ORDINARY</span></div>
    <div className="loader-center">
      <button className="loader-wordmark loader-layer" style={{ '--depth': 1 } as CSSProperties} onClick={ready ? go : undefined} disabled={!ready} aria-label={ready ? 'Enter Theos' : 'Theos'}>
        theos<span ref={dot} className="loader-dot" aria-hidden="true" />
      </button>
      <p className="loader-line loader-layer" style={{ '--depth': .5 } as CSSProperties}>{ready ? <>Enter through <em>the dot.</em></> : <>Loading your <em>experience.</em></>}</p>
      <span className="loader-hint loader-layer" style={{ '--depth': .4 } as CSSProperties}>{ready ? 'Click it, or press Enter' : 'A new perspective is taking shape.'}</span>
    </div>
    <div className="loader-bottom loader-layer" style={{ '--depth': .15 } as CSSProperties}>
      <div className="loader-meta"><span>{slow ? 'Preparing the finishing touches' : 'From imagination to a place.'}</span><span className="loader-number" aria-hidden="true">{String(progress).padStart(2, '0')}<small>%</small></span></div>
      <div className="loader-track" role="progressbar" aria-label="Homepage preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
      {slow && !ready && <button onClick={() => { setReady(true) }}>Continue to the experience →</button>}
    </div>
  </div>
}
