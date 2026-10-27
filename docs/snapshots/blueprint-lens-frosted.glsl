// Snapshot of the blueprint cursor lens before the paint-splash version (2026-10-27).
// To revert: replace the lens block in blueprintFragment (src/three/scenes/AtelierObjects.tsx, from "// Free lens:" up to
// "gl_FragColor") with the GLSL below, and restore this radius line in the Blueprint frame loop:
//   u.uLensR.value = MathUtils.damp(u.uLensR.value, l.inside && !l.built ? .19 : 0, 4, dt)

 // Free lens: a soft, breathing blob that stretches with the cursor's movement, with a blurred, frosted-grey edge.
 // A double-click floods the build from that point.
 vec2 aspect=vec2(screenAspect,1.), frag=gl_FragCoord.xy/uRes;
 vec2 toLens=(frag-uLens)*aspect, toTrail=(frag-uTrail)*aspect, toOrigin=(frag-uOrigin)*aspect;
 float on=smoothstep(0.,.04,uLensR);
 float lag=length((uLens-uTrail)*aspect);
 float R=uLensR*(1.+.09*sin(uTime*.7)+.06*sin(uTime*1.3+1.7)+lag*1.2);
 float ang=atan(toLens.y,toLens.x);
 float edgeNoise=(fbm(frag*aspect*2.6+vec2(uTime*.12,-uTime*.09))-.5)*.16+sin(ang*3.+uTime*.6)*.012;
 float blob=smin(length(toLens)-R,length(toTrail)-R*.7,.18)+edgeNoise*on;
 float lens=(1.-smoothstep(-.11,.04,blob))*on;
 float buildR=uBuild*2.6;
 float build=1.-smoothstep(buildR-.08,buildR+.08,length(toOrigin)+edgeNoise*2.);
 float real=max(lens,build);
 // The soft zone around the edge, where the blur and the frosted grey live.
 float band=exp(-pow((blob+.035)/.065,2.))*on*(1.-build);
 vec2 lensUv=focus+(uLens-.5)*span;
 vec2 builtLens=mix(builtUv,lensUv,.025*lens*(1.-build));
 vec2 bend=normalize(toLens+1e-5)*band*.004;
 vec3 sharp=vec3(texture2D(uBuilt,builtLens+bend).r,texture2D(uBuilt,builtLens).g,texture2D(uBuilt,builtLens-bend).b);
 vec2 spread=vec2(.004,.0062)*band;
 vec3 soft=(texture2D(uBuilt,builtLens+spread).rgb+texture2D(uBuilt,builtLens-spread).rgb+texture2D(uBuilt,builtLens+vec2(spread.x,-spread.y)).rgb+texture2D(uBuilt,builtLens+vec2(-spread.x,spread.y)).rgb)*.25;
 vec3 built=mix(sharp,soft,band);
 vec3 col=mix(study,built,real);
 // A cool frosted-grey edge: desaturated, slightly blue-cold, with a fine drifting grain like breath on glass.
 float grey=dot(col,vec3(.299,.587,.114));
 float frost=(fbm(frag*aspect*90.+uTime*.15)-.5)*.06;
 col=mix(col,vec3(grey)*vec3(.9,.94,1.)+frost,band*.6);
