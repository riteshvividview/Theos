import { useEffect, useRef, useState } from 'react'

// The testimonial films inside the stories ring. One WebGL canvas plays the current film; changing testimonial runs a
// liquid hand-over: a noise-edged front sweeps across, the two films ripple apart along it with a slight colour split
// and a soft light on the seam. Films play only while on screen; reduced motion swaps instantly.
const fragment = `precision highp float;
uniform sampler2D uFrom, uTo;
uniform vec2 uRes;
uniform float uMix, uTime, uAspect;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}
// Cover the square canvas with the centre of a 16:9 film.
vec2 cover(vec2 uv){float canvas=uRes.x/uRes.y;return vec2(.5+(uv.x-.5)*canvas/uAspect,uv.y);}
vec3 film(sampler2D t,vec2 uv,float split){
  uv=clamp(uv,vec2(.001),vec2(.999));
  return vec3(texture2D(t,cover(uv+vec2(split,0.))).r,texture2D(t,cover(uv)).g,texture2D(t,cover(uv-vec2(split,0.))).b);
}
void main(){
  float m=uMix, wave=sin(m*3.14159);
  // The front runs from lower left to upper right, its edge torn by drifting noise.
  float n=fbm(vUv*3.2+vec2(uTime*.12,-uTime*.08));
  float front=dot(vUv-.5,normalize(vec2(1.,.7)))*.9+.5+(n-.5)*.55;
  float level=m*1.5-.25;
  float edge=smoothstep(level-.06,level+.06,front);
  vec2 push=vec2(n-.5,fbm(vUv*3.2+9.)-.5)*.09*wave;
  vec3 a=film(uFrom,vUv+push*(1.-edge),.006*wave);
  vec3 b=film(uTo,vUv-push*edge*.6+(1.-m)*vec2(-.02,.015),.006*wave);
  vec3 c=mix(b,a,edge);
  float seam=exp(-pow((front-level)/.035,2.))*wave;
  c+=vec3(1.,.93,.86)*seam*.22;
  gl_FragColor=vec4(c,1.);
}`

export function TestimonialFilm({ films, active, running, reduced }: { films: { src: string; poster: string }[]; active: number; running: boolean; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), videos = useRef<HTMLVideoElement[]>([])
  const state = useRef({ from: active, to: active, mix: 1, start: 0 })
  const [failed, setFailed] = useState(false)

  // A new testimonial starts the hand-over from whatever is showing now.
  useEffect(() => {
    const s = state.current
    if (active === s.to) return
    s.from = s.mix >= .5 ? s.to : s.from; s.to = active; s.mix = reduced ? 1 : 0; s.start = performance.now()
    const next = videos.current[active]
    if (next) { next.currentTime = 0; void next.play().catch(() => {}) }
  }, [active, reduced])

  useEffect(() => {
    const el = canvas.current, gl = el?.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!el || !gl) { setFailed(true); return }
    const compile = (type: number, src: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); return sh }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setFailed(true); return }
    gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(program, n)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const textures = films.map(() => {
      const t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([236, 233, 228, 255]))
      ;[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE))
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      return t
    })
    // Until a film has a frame, its poster stands in.
    const posters = films.map((film, i) => { const img = new Image(); img.onload = () => { if (!ready[i]) upload(i, img) }; img.src = film.poster; return img })
    const ready = films.map(() => false)
    const upload = (i: number, source: TexImageSource) => { gl.bindTexture(gl.TEXTURE_2D, textures[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source) }
    gl.uniform1i(u('uFrom'), 0); gl.uniform1i(u('uTo'), 1); gl.uniform1f(u('uAspect'), 16 / 9)
    let frame = 0
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      const s = state.current
      if (s.mix < 1) s.mix = Math.min(1, (now - s.start) / 1500)
      const eased = s.mix * s.mix * (3 - 2 * s.mix)
      ;[s.from, s.to].forEach(i => {
        const v = videos.current[i]
        if (v && v.readyState >= 2) { upload(i, v); ready[i] = true }
      })
      const w = Math.round(el.clientWidth * Math.min(devicePixelRatio, 1.5)), h = Math.round(el.clientHeight * Math.min(devicePixelRatio, 1.5))
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h }
      gl.viewport(0, 0, w, h)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[s.mix >= 1 ? s.to : s.from])
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[s.to])
      gl.uniform2f(u('uRes'), w, h); gl.uniform1f(u('uMix'), s.mix >= 1 ? 0 : eased); gl.uniform1f(u('uTime'), now / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); textures.forEach(t => gl.deleteTexture(t)); gl.deleteProgram(program); gl.deleteBuffer(buffer); posters.forEach(p => { p.onload = null }) }
  }, [films])

  // Only the films in view play; the rest wait at their first frame.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      const s = state.current, wanted = running && (i === s.to || (i === s.from && s.mix < 1))
      if (wanted) void v.play().catch(() => {}); else v.pause()
    })
  }, [running, active])

  return <>
    {films.map((film, i) => <video key={film.src} ref={el => { if (el) videos.current[i] = el }} className={failed ? `story-film-fallback${i === active ? ' is-current' : ''}` : 'story-film-source'} src={film.src} poster={film.poster} muted loop playsInline preload="auto" aria-hidden="true" />)}
    {!failed && <canvas ref={canvas} className="story-film" aria-hidden="true" />}
  </>
}
