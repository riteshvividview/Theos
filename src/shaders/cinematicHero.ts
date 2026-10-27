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

void main() {
  float t = smoothstep(0.0, 1.0, uProgress);
  float holdZoom = mix(1.025, 1.045, smoothstep(0.0, .48, uHold)) * (1.0-uReduced) + uReduced;
  vec2 exitScreen = (uExit - imageCenter(uFocusCurrent)) / imageScale() + .5;
  exitScreen = clamp(exitScreen, vec2(.15), vec2(.85));
  vec2 outgoingCenter = mix(vec2(.5), exitScreen, t * .75);
  vec2 uvA = imageUV(vUv, uFocusCurrent, mix(holdZoom, 2.15, t), outgoingCenter);
  vec2 uvB = imageUV(vUv, uFocusNext, mix(1.18, 1.025, t), vec2(.5));
  vec4 a = photograph(uCurrent, uDepthCurrent, uvA, uPoolCurrent, uPortraitCurrent);
  vec4 b = photograph(uNext, uDepthNext, uvB, uPoolNext, uPortraitNext);

  vec2 origin = mix(exitScreen, vec2(.5), t);
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float distanceToCenter = length((vUv-origin)*aspect);
  float radius = mix(-.035, length(aspect) * .66, t);
  float edge = .012;
  float aperture = 1.0 - smoothstep(radius-edge, radius+edge, distanceToCenter);
  // A spatial portal, not a full-frame crossfade. Only the fine boundary blends.
  if (uProgress <= .00001) aperture = 0.0;
  if (uProgress >= .99999) aperture = 1.0;
  gl_FragColor = mix(a, b, aperture);
  #include <colorspace_fragment>
}
`
