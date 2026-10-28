import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
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

// The loader constructs the logo: fine construction lines go up first (SVG, from the logo's measured letters), then the outline
// is traced left to right with a red pen tip, then the letters fill. On entry the first world rises from below behind a band of
// liquid glass while the page lifts away, landing at exactly the hero's framing.
const fragment = `precision highp float;
uniform sampler2D uImage, uLogo;
uniform vec2 uRes;
uniform vec4 uMark;          // the logo's box on screen: centre (px, y up) and half-size (px)
uniform float uTime, uProgress, uEnter, uReady;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec4 logoAt(vec2 lp){ return (lp.x>0.&&lp.x<1.&&lp.y>0.&&lp.y<1.)?texture2D(uLogo,lp):vec4(0.); }
// The page at a pixel: cream paper and the logo as far as it has been drawn and filled.
vec3 page(vec2 q){
  vec3 c=vec3(.98,.976,.961)+(hash(floor(q))-.5)*.012;
  vec2 lp=(q-uMark.xy)/(uMark.zw*2.)+.5;
  if(lp.x<-.02||lp.x>1.02||lp.y<-.02||lp.y>1.02)return c;
  vec4 l=logoAt(lp);
  vec2 px=1.25/(uMark.zw*2.);
  float edge=clamp(length(vec2(logoAt(lp+vec2(px.x,0.)).a-logoAt(lp-vec2(px.x,0.)).a,logoAt(lp+vec2(0.,px.y)).a-logoAt(lp-vec2(0.,px.y)).a))*1.4,0.,1.);
  float red=smoothstep(.15,.35,l.r-l.g);
  vec3 ink=mix(vec3(.078,.161,.29),vec3(.81,.17,.13),red);
  // The pen moves left to right with a slightly uneven front.
  float key=lp.x*.92+(vnoise(lp*vec2(26.,7.))-.5)*.06;
  float pen=uProgress*1.08-.04;
  float drawn=1.-smoothstep(pen-.008,pen+.008,key);
  float fillFront=smoothstep(.8,1.,uProgress)*1.15-.06;
  float filled=(1.-smoothstep(fillFront-.04,fillFront+.04,key))*l.a;
  c=mix(c,ink,max(edge*drawn,filled));
  c=mix(c,vec3(.95,.25,.18),exp(-pow((key-pen)/.006,2.))*edge*step(uProgress,.999));
  return c;
}
vec3 world(vec2 uv){
  float imageAspect=1672./1077., screenAspect=uRes.x/uRes.y;
  vec2 cover=screenAspect>imageAspect?vec2(1.,imageAspect/screenAspect):vec2(screenAspect/imageAspect,1.);
  return texture2D(uImage,clamp(.5+(uv-.5)*cover/1.025,vec2(.001),vec2(.999))).rgb;
}
void main(){
  vec2 frag=gl_FragCoord.xy, uv=frag/uRes;
  // The first world rises from below behind a band of liquid glass. The band refracts the page and the world as it passes, splits
  // colour at its rim, carries a bright crest and a darker meniscus; while it moves fast the world streaks upward and the page
  // stretches as it lifts away. It lands crisp at exactly the hero's framing; nothing of the world shows before.
  float s=uEnter*uEnter*(3.-2.*uEnter);
  float speed=sin(s*3.14159);
  float x=uv.x*2.-1.;
  float edge=mix(-.14,1.2,s)+(.07*(1.-x*x)+.025*sin(uv.x*6.2832*.8+s*2.)+.012*sin(uv.x*23.+uTime*2.))*speed;
  float d=(uv.y-edge)*uRes.y;                       // pixels above the edge
  float band=70.*speed+2.;
  float t=clamp(d/band,-1.,1.);
  float lens=(1.-t*t)*step(abs(d),band);            // 1 at the band's centre, 0 at its rims
  vec2 bend=vec2(0.,-t*lens*34.*speed)+vec2(sin(uv.y*40.+uTime*3.)*3.*lens,0.);
  float lift=s*s*.35*uRes.y;
  // The page, lifting and stretching upward while it moves, refracted inside the band.
  vec3 pg=vec3(0.);
  if(uEnter<.0005)pg=page(frag);
  else{ for(int i=0;i<4;i++){ float k=float(i)/3.; pg+=page(frag-vec2(0.,lift+k*speed*26.)+bend); } pg/=4.; }
  vec3 col=pg;
  col*=1.-.3*exp(-max(d-band,0.)/30.)*step(.0005,uEnter)*step(band,d);
  if(uEnter>.0005){
    // The world, streaking upward while it rises fast, refracted with a colour split inside the band.
    vec2 wuv=uv+vec2(0.,(1.-s)*.18)+bend/uRes;
    vec2 split=vec2(0.,lens*.006*speed);
    vec3 w=vec3(0.);
    for(int i=0;i<5;i++){ float k=float(i)/4.; vec2 q=wuv-vec2(0.,k*speed*.03); w+=vec3(world(q+split).r,world(q).g,world(q-split).b); }
    w/=5.;
    float below=1.-smoothstep(-1.,1.,d-band*.15);
    col=mix(col,w,below);
    // The glass itself: a faint cool tint, a bright crest and a darker meniscus beneath it.
    col=mix(col,col*vec3(.96,.98,1.02)+.03,lens*.6);
    col+=vec3(1.,.98,.95)*exp(-pow((d-band*.35)/2.2,2.))*.55*speed;
    col*=1.-.25*exp(-pow((d+band*.25)/3.,2.))*speed;
  }
  if(uEnter>=.999)col=world(uv);
  gl_FragColor=vec4(col,1.);
}`

// The logo's geometry, read from its pixels: each letter's horizontal span, the letters' top and bottom, and the 'o' (the fourth
// letter): its centre and its counter's and outer radii. Units are fractions of the logo (y from the top). Falls back to a guess.
type LogoGeometry = { letters: [number, number][]; top: number; bottom: number; o: [number, number, number, number] }
const fallbackGeometry: LogoGeometry = { letters: [[0, .12], [.15, .33], [.36, .55], [.58, .78], [.8, .97]], top: .1, bottom: .9, o: [.68, .62, .05, .09] }
function analyseLogo(image: HTMLImageElement): LogoGeometry {
  try {
    const c = document.createElement('canvas'), W = c.width = image.naturalWidth, H = c.height = image.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(image, 0, 0)
    const d = g.getImageData(0, 0, W, H).data, solid = (x: number, y: number) => d[(y * W + x) * 4 + 3] > 128
    // Runs of columns that contain ink, with their vertical extent.
    const runs: [number, number, number, number][] = []
    let open = false
    for (let x = 0; x < W; x++) {
      let top = -1, bottom = -1
      for (let y = 0; y < H; y++) if (solid(x, y)) { if (top < 0) top = y; bottom = y }
      if (top < 0) { open = false; continue }
      if (!open) { runs.push([x, x, top, bottom]); open = true }
      else { const r = runs[runs.length - 1]; r[1] = x; r[2] = Math.min(r[2], top); r[3] = Math.max(r[3], bottom) }
    }
    // Letters are the tall runs (this drops the registered mark).
    const tallest = Math.max(...runs.map(r => r[3] - r[2]))
    const letters = runs.filter(r => r[3] - r[2] > tallest * .45 && r[1] - r[0] > W * .02)
    if (letters.length < 4) return fallbackGeometry
    const o = letters[3], cx = Math.round((o[0] + o[1]) / 2)
    let oy0 = -1, oy1 = -1
    for (let y = 0; y < H; y++) if (solid(cx, y)) { if (oy0 < 0) oy0 = y; oy1 = y }
    const cy = Math.round((oy0 + oy1) / 2)
    let inner = 0
    while (cx + inner < W && !solid(cx + inner, cy)) inner++
    return {
      letters: letters.map(r => [r[0] / W, r[1] / W]),
      top: Math.min(...letters.map(r => r[2])) / H, bottom: Math.max(...letters.map(r => r[3])) / H,
      o: [cx / W, cy / H, inner / W, (o[1] - o[0]) / 2 / W],
    }
  } catch { return fallbackGeometry }
}

function Stage({ mark, progress, enter, ready, onGeometry }: { mark: { current: [number, number, number, number] }; progress: { current: number }; enter: { current: number }; ready: { current: boolean }; onGeometry: (g: LogoGeometry) => void }) {
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
    let geometry = fallbackGeometry
    const textures = ['/images/redesign/rhino.jpg', '/theos-logo.avif'].map((src, i) => {
      const texture = gl.createTexture()!, image = new Image()
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(i === 1 ? [0, 0, 0, 0] : [250, 249, 245, 255]))
      ;[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      image.onload = () => {
        if (i === 1) { geometry = analyseLogo(image); onGeometry(geometry) }
        gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      }
      image.src = src
      return texture
    })
    gl.uniform1i(u('uImage'), 0); gl.uniform1i(u('uLogo'), 1)
    let frame = 0, drawn = 0, last = performance.now()
    const draw = (t: number) => {
      const dpr = Math.min(devicePixelRatio, 1.5), w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr)
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h }
      // The pen eases toward the real progress, so the drawing is smooth however the loading arrives.
      const dt = Math.min(.05, (t - last) / 1000); last = t
      drawn += (progress.current - drawn) * (1 - Math.exp(-5 * dt))
      const [mx, my, mw, mh] = mark.current
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u('uRes'), w, h); gl.uniform4f(u('uMark'), mx * dpr, h - my * dpr, mw * dpr, mh * dpr)
      gl.uniform1f(u('uTime'), t / 1000); gl.uniform1f(u('uProgress'), Math.min(1, Math.max(0, (drawn - .3) / .7) + (progress.current >= 1 ? .002 : 0))); gl.uniform1f(u('uEnter'), enter.current); gl.uniform1f(u('uReady'), ready.current ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); textures.forEach(t => gl.deleteTexture(t)); gl.deleteProgram(program); gl.deleteBuffer(buffer) }
  }, [mark, progress, enter, ready, onGeometry])
  return <canvas ref={canvas} className="loader-stage" aria-hidden="true" />
}

// Setting-out lines around the logo, as an architect or type designer draws them: cap line and baseline running past the mark,
// a guide at each letter, construction circles on the 'o', a dimension line beneath. They draw in over the first part of the
// loading. The SVG spans the logo box in 0..100 units both ways; `aspect` (width / height) keeps the circles round.
function Construction({ geometry, aspect }: { geometry: LogoGeometry; aspect: number }) {
  const { letters, top, bottom, o } = geometry
  // Each line draws on its own timed beat (CSS), smooth however the loading arrives.
  const dash = (k: number) => ({ '--i': Math.round(k * 20) }) as CSSProperties
  const ox = o[0] * 100, oy = o[1] * 100, rOut = o[3] * 100, rIn = o[2] * 100
  const T = top * 100, B = bottom * 100
  return <svg className="loader-construction" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path d={`M-18 ${T}H118`} pathLength={1} style={dash(0)} />
    <path d={`M-18 ${B}H118`} pathLength={1} style={dash(.05)} />
    <path d={`M-18 ${(T + B) / 2}H118`} pathLength={1} style={dash(.15)} className="is-faint" />
    {letters.map(([a, b], i) => <path key={i} d={`M${a * 100} ${T - 18}V${B + 18}M${b * 100} ${T - 18}V${B + 18}`} pathLength={1} style={dash(.2 + i * .06)} className="is-faint" />)}
    <ellipse cx={ox} cy={oy} rx={rOut * 1.35} ry={rOut * 1.35 * aspect} pathLength={1} style={dash(.35)} className="is-red" />
    <ellipse cx={ox} cy={oy} rx={rIn} ry={rIn * aspect} pathLength={1} style={dash(.45)} />
    <path d={`M${ox - rOut * 1.7} ${oy}H${ox + rOut * 1.7}M${ox} ${oy - rOut * aspect * 1.7}V${oy + rOut * aspect * 1.7}`} pathLength={1} style={dash(.4)} className="is-red" />
    <path d={`M0 ${B + 26}H100M0 ${B + 21}V${B + 31}M100 ${B + 21}V${B + 31}`} pathLength={1} style={dash(.5)} />
  </svg>
}

export function PageLoader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null), markBox = useRef<HTMLButtonElement>(null)
  const [progress, setProgress] = useState(1), [slow, setSlow] = useState(false), [ready, setReady] = useState(false), [entering, setEntering] = useState(false)
  const mark = useRef<[number, number, number, number]>([innerWidth / 2, innerHeight / 2, 200, 60]), drawn = useRef(0), enter = useRef(0), isReady = useRef(false)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const [geometry, setGeometry] = useState<LogoGeometry>(fallbackGeometry), [aspect, setAspect] = useState(3)
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
      // If a scene is slow to report, the last few percent are not allowed to hold the visitor back.
      if (displayed >= 94 && stalledSince === 0) stalledSince = performance.now()
      if (displayed >= 94 && performance.now() - stalledSince > 2500) displayed = 100
      setProgress(displayed); drawn.current = displayed / 100
      if (displayed === 100) { clearInterval(timer); window.setTimeout(() => { isReady.current = true; setReady(true) }, reduced ? 0 : 900) }
    }, 30)
    const timeout = window.setTimeout(() => setSlow(true), 18000)
    return () => { alive = false; clearInterval(timer); clearTimeout(timeout) }
  }, [reduced])

  // The box takes the logo file's own proportions and marks where the shader draws it.
  useEffect(() => { const img = new Image(); img.onload = () => { setAspect(img.naturalWidth / img.naturalHeight); if (markBox.current) markBox.current.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}` }; img.src = '/theos-logo.avif' }, [])
  useEffect(() => {
    const measure = () => { const b = markBox.current?.getBoundingClientRect(); if (b) mark.current = [b.left + b.width / 2, b.top + b.height / 2, b.width / 2, b.height / 2] }
    measure(); const ro = new ResizeObserver(measure); if (markBox.current) ro.observe(markBox.current); addEventListener('resize', measure)
    return () => { ro.disconnect(); removeEventListener('resize', measure) }
  }, [])

  // Into the dot: the zoom ends on exactly the hero; fading the loader then lets the hero's titles arrive softly.
  const go = useCallback(() => {
    if (entering) return
    setEntering(true)
    const state = { v: 0 }
    gsap.to(state, { v: 1, duration: reduced ? .2 : 2.6, ease: 'power1.inOut', onUpdate: () => { enter.current = state.v },
      onComplete: () => { gsap.to(root.current, { opacity: 0, duration: reduced ? .05 : .5, ease: 'power1.out', onComplete: () => { onComplete(); requestAnimationFrame(() => ScrollTrigger.refresh()) } }) } })
  }, [entering, onComplete, reduced])
  useEffect(() => {
    if (!ready || entering) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }
    addEventListener('keydown', key)
    // Nobody is kept waiting: it opens by itself shortly after the logo is complete.
    const auto = window.setTimeout(go, reduced ? 300 : 3000)
    return () => { removeEventListener('keydown', key); clearTimeout(auto) }
  }, [ready, entering, go, reduced])

  return <div ref={root} className={`page-loader${ready ? ' is-ready' : ''}`} role="status" aria-label={`Loading your experience, ${progress} percent`} data-lenis-prevent>
    <Stage mark={mark} progress={drawn} enter={enter} ready={isReady} onGeometry={setGeometry} />
    <button ref={markBox} className={`loader-mark${entering ? ' is-entering' : ''}`} onClick={ready ? go : undefined} disabled={!ready} aria-label={ready ? 'Enter Theos' : 'Theos'}>
      <Construction geometry={geometry} aspect={aspect} />
    </button>
    <div className={`loader-count${entering ? ' is-entering' : ''}`} aria-hidden="true">
      <span>{ready ? 'Constructed' : progress < 30 ? 'Setting out' : progress < 90 ? 'Drawing the line' : 'Finishing'}</span>
      <strong>{progress}<small>%</small></strong>
    </div>
    {slow && !ready && <button className="loader-continue" onClick={() => { isReady.current = true; setReady(true) }}>Continue to the experience →</button>}
  </div>
}
