export const cinematicVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const cinematicFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uNext;
uniform sampler2D uDepthCurrent;
uniform sampler2D uDepthNext;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uExit;
uniform vec2 uEntry;
uniform float uPortalPass;
uniform float uCloudPass;
uniform float uOutro;
uniform sampler2D uPortal;
uniform sampler2D uPortalDepth;
uniform float uProgress;
uniform float uHold;
uniform float uFocusCurrent;
uniform float uFocusNext;
uniform float uReduced;
uniform float uTime;
uniform float uPoolCurrent;
uniform float uPoolNext;
uniform float uPortraitCurrent;
uniform float uPortraitNext;

vec2 imageScale() {
  float screenAspect = uResolution.x / uResolution.y;
  float imageAspect = 1672.0 / 1077.0;
  return vec2(min(1.0, screenAspect / imageAspect), min(1.0, imageAspect / screenAspect));
}

vec2 imageCenter(float focus) {
  vec2 s = imageScale();
  return vec2(mix(.5, focus, 1.0 - smoothstep(.7, 1.2, uResolution.x / uResolution.y)), .5);
}

vec2 imageUV(vec2 screenUV, float focus, float zoom, vec2 center) {
  return imageCenter(focus) + ((screenUV - .5) / zoom + center - .5) * imageScale();
}

vec4 photograph(sampler2D photo, sampler2D depthMap, vec2 uv, float pool, float portrait) {
  // These generated depth maps encode near objects as dark. Read the actual
  // map convention rather than assuming a model's nominal output polarity.
  float nearDepth = 1.0 - texture2D(depthMap, uv).r;
  vec2 offset = uPointer * (nearDepth - .30) * .006 * (1.0 - uReduced);
  // Keep the bedroom figure intact across sharp depth boundaries. This
  // coherent projective movement retains depth without warping her face.
  vec2 planarOffset = uPointer * .002 - (uv-.5) * dot(uv-.5,uPointer) * .009;
  offset = mix(offset, planarOffset * (1.0-uReduced), portrait);
  vec2 displaced = uv + offset;
  // A tiny reflection-only displacement keeps architecture and people rigid.
  float water = 1.0 - smoothstep(.0, .23, uv.y);
  displaced.x += sin(uv.y * 140.0 + uTime * .8) * .00065 * water * pool * (1.0-uReduced);
  return texture2D(photo, clamp(displaced, vec2(.001), vec2(.999)));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = .5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }

// eye-portal.jpg is the eye world with its carved wall opened into an arch, redrawn slightly off eye.jpg. This is the measured
// best fit over the figures, foxes, platform and pillars (edge registration; residual within about 3 px), eye-world uv (y up).
vec2 toPortal(vec2 a) { return vec2(.9875 * a.x - .0052, .0398 + .9765 * a.y); }
vec2 fromPortal(vec2 q) { return vec2((q.x + .0052) / .9875, (q.y - .0398) / .9765); }
// Plaster cracking: jittered Voronoi cells, returning the distance to the nearest crack and the cell's id.
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec3 plasterCells(vec2 x) {
  vec2 n = floor(x), f = fract(x), cell = vec2(0.0), toCell = vec2(0.0);
  float nearest = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), r = g + hash2(n + g) * .85 - f;
    float d = dot(r, r);
    if (d < nearest) { nearest = d; toCell = r; cell = g; }
  }
  float crack = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = cell + vec2(float(i), float(j)), r = g + hash2(n + g) * .85 - f;
    if (dot(toCell - r, toCell - r) > 1e-5) crack = min(crack, dot(.5 * (toCell + r), normalize(r - toCell)));
  }
  return vec3(crack, n + cell);
}
// The carved wall behind the figures, in eye-world uv (y up): its rectangle, minus anything standing in front of it.
float carvedWall(vec2 a, float far) {
  float box = smoothstep(.255, .262, a.x) * (1.0 - smoothstep(.752, .759, a.x)) * smoothstep(.3, .31, a.y);
  return box * smoothstep(.34, .44, far);
}

// The arch opening in portal uv (y up): straight jambs with an elliptical crown, hard-edged like real plaster.
float archOpening(vec2 q) {
  float jambs = smoothstep(.3705, .3725, q.x) * (1.0 - smoothstep(.6125, .6145, q.x));
  float shaft = jambs * smoothstep(.3, .302, q.y) * (1.0 - step(.755, q.y));
  float crown = (1.0 - smoothstep(.985, 1.0, length((q - vec2(.4925, .755)) / vec2(.1215, .195)))) * step(.755, q.y);
  return max(shaft, crown);
}

// Depth-parallaxed photograph with a radial zoom blur toward the vanishing point.
vec4 streaked(sampler2D photo, sampler2D depthMap, vec2 uv, vec2 towards, float amount, float pool, float portrait) {
  vec4 sum = vec4(0.0);
  if (amount < .0005) return photograph(photo, depthMap, uv, pool, portrait);
  for (int i = 0; i < 6; i++) sum += photograph(photo, depthMap, mix(uv, towards, amount * float(i) / 5.0), pool, portrait);
  return sum / 6.0;
}

// The figures, foxes and hall as a layer in front of the opened wall: its colour and coverage at uv, defocused like a lens.
// Each tap only counts what is actually in front, so the white wall behind never bleeds into the figures.
vec4 hallLayer(vec2 uv, float radius) {
  vec3 colour = vec3(0.0);
  float cover = 0.0;
  const int TAPS = 12;
  // A per-pixel rotation of the tap spiral turns discrete copies into a smooth, faintly grainy lens blur.
  float spin = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) * 6.2832;
  for (int i = 0; i < TAPS; i++) {
    float r = radius < .0004 ? 0.0 : sqrt((float(i) + .5) / float(TAPS)) * radius, a = float(i) * 2.39996 + spin;
    vec2 q = uv + vec2(cos(a), sin(a) * 1.55) * r;
    // One depth read per tap keeps this light enough for modest GPUs.
    float front = 1.0 - carvedWall(q, texture2D(uDepthCurrent, q).r);
    colour += photograph(uCurrent, uDepthCurrent, q, uPoolCurrent, uPortraitCurrent).rgb * front;
    cover += front;
    if (radius < .0004) { cover *= float(TAPS); colour *= float(TAPS); break; }
  }
  return vec4(colour / max(cover, 1e-4), cover / float(TAPS));
}

// One layer of cloud: domain-warped fbm moving on the wind, shaded by sampling toward the sun (up and to the left).
float cloud(vec2 p, float drift, float cover, out float lit) {
  vec2 q = p + vec2(uTime * drift, uTime * drift * .25);
  vec2 warp = vec2(fbm(q * 1.3 + 3.1 + uTime * .02), fbm(q * 1.3 - 7.4 - uTime * .015));
  float d = fbm(q * 2.0 + warp * 1.25);
  float towardSun = fbm((q + vec2(-.035, .045)) * 2.0 + warp * 1.25);
  lit = clamp((d - towardSun) * 5.0 + .62, 0.0, 1.0);
  return smoothstep(cover, cover + .2, d);
}

void main() {
  const float DEPTH = 9.0;
  vec2 s = imageScale();
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float holdZoom = mix(1.025, 1.045, smoothstep(0.0, .48, uHold)) * (1.0 - uReduced) + uReduced;
  float t = uProgress;
  // The camera flies into the leaving world's exit detail on an exponential zoom, so the speed of travel feels constant.
  float travel = t * t * (3.0 - 2.0 * t);
  float zoomA = holdZoom * exp(log(DEPTH) * travel);
  vec2 centreA = imageCenter(uFocusCurrent);
  vec2 exitScreen = clamp(.5 + (uExit - centreA) * holdZoom / s, vec2(.05), vec2(.95));
  vec2 uvA = uExit + (vUv - exitScreen) * s / zoomA;

  // The next world already lives inside that detail, a miniature at the same point, growing with the zoom until it is the frame.
  // Its matching entry detail (eye for eye, red for red, arch for arch) is what the camera is flying toward.
  const float ARRIVE = 1.025;
  vec2 centreB = imageCenter(uFocusNext);
  vec2 entryFinal = .5 + (uEntry - centreB) * ARRIVE / s;
  // It reaches full frame a little before the leaving world's zoom ends, so its own edges are never seen.
  float travelB = smoothstep(0.0, .82, t);
  float zoomB = ARRIVE * exp(log(DEPTH) * (travelB - 1.0));
  vec2 anchor = mix(exitScreen, entryFinal, smoothstep(.3, .82, t));
  vec2 uvB = uEntry + (vUv - anchor) * s / zoomB;

  // Motion: streaks along the flight, strongest mid-flight.
  float rush = sin(t * 3.14159) * .045 * (1.0 - uReduced);
  vec4 a = streaked(uCurrent, uDepthCurrent, uvA, uExit, rush, uPoolCurrent, uPortraitCurrent);
  vec4 b = streaked(uNext, uDepthNext, uvB, uEntry, rush * .6, uPoolNext, uPortraitNext);
  // Outside its own frame the miniature world simply isn't there yet.
  float inside = smoothstep(0.0, .03, uvB.x) * (1.0 - smoothstep(.97, 1.0, uvB.x)) * smoothstep(0.0, .03, uvB.y) * (1.0 - smoothstep(.97, 1.0, uvB.y));

  // It dissolves in from its entry detail outward along a soft, organic edge measured in the next world's own space.
  float reach = length((uvB - uEntry) * vec2(1672.0 / 1077.0, 1.0));
  float grain = fbm((uvB - uEntry) * 7.0 + uTime * .05) - .5;
  // The window stays well inside the miniature's frame until that frame has covered the screen, then opens fully.
  float radius = mix(.03, .42, smoothstep(.1, .72, t)) + smoothstep(.8, .97, t) * 1.6;
  // The edge is feathered by at least a fixed width on screen (converted into the next world's scale), so even the tiny
  // first glimpse inside the eye has a soft, blurred rim rather than a crisp ring.
  float feather = max(radius * .55, .035 * s.y / max(zoomB, 1e-3));
  float arrived = (1.0 - smoothstep(radius - feather, radius + feather * .35, reach + grain * radius * .45)) * inside * smoothstep(0.0, .14, t);
  if (uProgress <= .00001) arrived = 0.0;
  if (uProgress >= .99999) arrived = 1.0;
  vec4 colour = mix(a, b, arrived);

  // Eye → bedroom: the eye opens onto her world. The carved eye crumbles away far-first as ivory dust, revealing an arch of daylight
  // in the same wall with the woman far beyond it; then we walk through the hall, the figures swelling past us, out through the arch,
  // and her world grows from the opening until it is the frame.
  // Pool → the page below: the camera tilts to the water, ripples spread, and the water rises into the cream of the next section.
  if (uOutro > .0001) {
    float o = uOutro;
    vec2 look = centreA + vec2(0.0, -.2 * o);
    float zoom = holdZoom * (1.0 + 1.1 * o * o);
    vec2 dropScreen = vec2(.5, .3);
    vec2 toDrop = (vUv - dropScreen) * aspect;
    float far = length(toDrop);
    float ring = sin(far * 70.0 - uTime * 4.0 - o * 26.0) * exp(-far * 2.2) * o * (1.0 - uReduced);
    vec2 uvW = look + (vUv - .5) * s / zoom + normalize(toDrop + 1e-5) * ring * .006;
    vec3 water = photograph(uCurrent, uDepthCurrent, uvW, uPoolCurrent, uPortraitCurrent).rgb;
    // The cream of the gallery section (#faf9f5), in linear light.
    const vec3 CREAM = vec3(.955, .947, .913);
    float level = o * 1.35 - .2;
    float front = vUv.y * .85 + ring * .04 + (fbm(vUv * aspect * 3.0 + uTime * .1) - .5) * .12;
    float flood = 1.0 - smoothstep(level - .035, level + .035, front);
    float crest = smoothstep(level - .09, level - .035, front) * flood;
    vec3 caustics = vec3(1.0) * (fbm(vUv * aspect * 11.0 + uTime * .25) - .5) * .05 * (1.0 - o);
    vec3 shown = mix(water, CREAM + caustics, flood) + vec3(1.0) * crest * .12;
    if (o >= .999) shown = CREAM;
    gl_FragColor = vec4(shown, 1.0);
    #include <colorspace_fragment>
    return;
  }

  // Bedroom → pool: up through the sky into the clouds and down out of them. The worlds swap inside the cloud, unseen.
  if (uCloudPass > .5 && uProgress > .00001 && uProgress < .99999) {
    float rise = smoothstep(0.0, .5, t), descend = smoothstep(.5, 1.0, t);
    float peak = 1.0 - abs(t - .5) * 2.0;
    peak = peak * peak * (3.0 - 2.0 * peak);
    // Tilt up into the bedroom's sky; arrive at the pool from above, tilting down into its resting frame.
    vec2 upA = centreA + vec2(0.0, .2 * rise) + (vUv - .5) * s / (holdZoom * (1.0 + .3 * rise));
    vec2 downB = centreB + vec2(0.0, .2 * (1.0 - descend)) + (vUv - .5) * s / (ARRIVE * (1.0 + .3 * (1.0 - descend)));
    vec3 shown = t < .5 ? photograph(uCurrent, uDepthCurrent, clamp(upA, vec2(.001), vec2(.999)), uPoolCurrent, uPortraitCurrent).rgb
                        : photograph(uNext, uDepthNext, clamp(downB, vec2(.001), vec2(.999)), uPoolNext, uPortraitNext).rgb;
    // Three layers at different depths: as we fly forward each grows at its own rate, so they slide past with parallax.
    vec2 p = (vUv - .5) * aspect;
    float cover = mix(.92, .12, peak);
    float gust = .02 + peak * .05;
    vec3 shade = vec3(.58, .66, .8), light = vec3(1.0, .985, .955);
    float lit;
    float far = cloud(p / (1.0 + t * 1.2) * 1.6 + 11.0, gust * .6, cover + .08, lit);
    shown = mix(shown, mix(shade, light, lit) * .96, far * .85);
    float mid = cloud(p / (1.0 + t * 2.4) * 1.1 + 4.0, gust, cover, lit);
    shown = mix(shown, mix(shade, light, lit), mid * .92);
    float near = cloud(p / (1.0 + t * 4.5) * .7 - 6.0, gust * 1.6, cover - .06, lit);
    shown = mix(shown, mix(shade * 1.05, light, lit), near);
    // Inside the cloud: all white, with the sun glowing through from the upper left.
    shown = mix(shown, light, smoothstep(.86, 1.0, peak));
    shown += vec3(1.0, .9, .72) * exp(-length((vUv - vec2(.22, .92)) * aspect) * 2.6) * .35 * peak * (1.0 - uReduced);
    gl_FragColor = vec4(shown, 1.0);
    #include <colorspace_fragment>
    return;
  }

  if (uPortalPass > .5 && uProgress > .00001 && uProgress < .99999) {
    // Slow and legible: the wall breaks away over the first half, the view through the arch holds, then we walk through.
    float crumble = smoothstep(0.0, .5, t), walk = smoothstep(.6, 1.0, t);
    // Only the carved wall changes. The figures, foxes, platform and floor stay from eye.jpg throughout, so nothing ghosts.
    const vec2 ARCH = vec2(.4925, .6), HER = vec2(.353, .42);
    vec2 archA = fromPortal(ARCH);
    vec2 archScreen = .5 + (archA - centreA) * holdZoom / s;
    vec2 restScreen = .5 + (HER - centreB) * ARRIVE / s;
    // Walking through the doorway: the hall and its arch rush past toward the camera while the far world barely moves.
    float zoomHall = exp(mix(log(holdZoom), log(6.5), walk * walk * (3.0 - 2.0 * walk)));
    vec2 aUv = archA + (vUv - archScreen) * s / zoomHall;
    vec2 pUv = toPortal(aUv);
    float rush = sin(walk * 3.14159) * .05 * (1.0 - uReduced);
    // The figures and foxes pass close to the camera, so they fall out of focus as we walk, softly over the world behind them.
    vec4 room = hallLayer(aUv, walk * .02 / max(1.0, zoomHall * .5));
    vec4 arch = streaked(uPortal, uPortalDepth, pUv, toPortal(archA), rush, 0.0, 0.0);
    // Both images must agree it is wall, so neither set of figures can show through the other's.
    float wall = 1.0 - room.a;
    // Through the opening: her world, the woman centred in the arch at first, drifting to her resting place as we arrive.
    vec2 herScreen = mix(vec2(.49, .62), restScreen, walk);
    float zoomHer = exp(mix(log(1.1), log(ARRIVE), walk));
    vec4 her = photograph(uNext, uDepthNext, clamp(HER + (vUv - herScreen) * s / zoomHer, vec2(.001), vec2(.999)), uPoolNext, uPortraitNext);
    float opening = archOpening(pUv) * wall;
    vec3 beyond = mix(arch.rgb, her.rgb, opening);

    // The carved eye cracks from the eye outward; each fragment erodes from its cracks inward, slips down and is gone.
    vec3 cells = plasterCells(vUv * aspect * 13.0);
    vec2 cellCentre = (cells.yz + .5) / 13.0 / aspect;
    float delay = length((cellCentre - archScreen) * aspect) * .55 + hash(cells.yz) * .25;
    float f = clamp((crumble * 1.25 - delay) / .32, 0.0, 1.0);
    float aa = fwidth(cells.x) * 1.2;
    float intact = f <= 0.0 ? 1.0 : smoothstep(f * .55 - aa, f * .55 + aa, cells.x) * step(f, .999);
    vec3 plaster = photograph(uCurrent, uDepthCurrent, aUv + vec2(0.0, f * f * .035), uPoolCurrent, uPortraitCurrent).rgb;
    plaster *= 1.0 - .45 * (1.0 - smoothstep(0.0, .035, cells.x)) * smoothstep(0.0, .12, f);
    plaster += vec3(1.0, .95, .88) * (1.0 - smoothstep(f * .55, f * .55 + .06, cells.x)) * f * .22;
    // Fragments cast a thin shadow onto the arch behind them as they fall.
    beyond *= 1.0 - .25 * (1.0 - smoothstep(f * .55, f * .55 + .08, cells.x)) * (1.0 - intact) * step(.001, f);
    vec3 wallNow = crumble >= 1.0 ? beyond : mix(beyond, plaster, intact);
    vec3 shown = mix(wallNow, room.rgb, room.a);
    gl_FragColor = vec4(shown, 1.0);
    #include <colorspace_fragment>
    return;
  }
  // A warm light where the two worlds meet, and a slight darkening of the leaving world as it is passed through.
  colour.rgb += vec3(1.0, .9, .78) * arrived * (1.0 - arrived) * .5 * smoothstep(.25, .55, t) * (1.0 - uReduced);
  colour.rgb *= mix(1.0, .82, (1.0 - arrived) * smoothstep(.2, .7, t));
  gl_FragColor = colour;
  #include <colorspace_fragment>
}
`
