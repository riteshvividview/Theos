# Motion and signature refinement — 27 October 2026

The user requested more expressive desktop interactions, slower hero transitions, a reveal that cannot be triggered accidentally by a stationary cursor, and repair of depth-map tearing around the blue-clad woman's face. These instructions supersede the hover-to-reveal behavior documented in the earlier full-homepage revision.

## Changes

- Hero: desktop journey increased from 580vh to 820vh. Transition portion increased from 36% to 52% per world. At the same scroll speed this gives each transition approximately 2.17 times the prior scroll distance, while preserving a readable hold. Scene-navigation scrolling takes 2.8 seconds instead of 1.35. The title exit and shader hold timing follow the new transition boundary.
- Portrait integrity: the bedroom world uses a continuous projective image displacement rather than depth-dependent pixel offsets, both as an incoming and outgoing scene. This preserves the head, face, hair and clothing silhouette while retaining pointer perspective and cinematic camera movement. It remains image-based 2.5D, not reconstructed human geometry.
- Architectural scene: a 280vh sequence with a 90vh sticky stage; hold the drawing, sweep into monochrome form, sweep again into full colour, then hold the result. It reverses with scroll. No pointer-enter, hover or pointer-position reveal handlers remain. Three labelled phase buttons navigate the sequence, or switch directly under reduced motion. A fine scanning rule, drafting grid and progress line make the change legible.
- Spiral: actual material controls for red lacquer, brushed metal and warm clay with interpolated material properties. A locally generated Three.js room environment supplies reflections; no downloaded HDRI or paid asset is involved.
- Gallery: immediate local cursor inspection rings and existing depth/parallax entrances. No global cursor replacement or delayed cursor tracking.
- Stories: shaped O aperture has directional edge shading and an expanding view; no fabricated testimonial copy was added.
- Closing scene: a lazy R3F red torus with metallic orbit geometry, pointer-responsive rotation, gentle suspended motion, a radial SVG measuring illustration, GSAP title/wordmark animation and real email CTA. Offscreen unmounting and reduced motion remain supported.

## Recovery points

1. `.local-backups/redesign-motion-2026-10-26-before/` preserves the full homepage before the scroll-reveal and slow-hero changes. Restore corresponding source paths selectively to remove this entire motion pass.
2. `.local-backups/redesign-enhancement-2026-10-27-before/` preserves the slow-hero/scroll-reveal version before the portrait repair and signature outro. Restore matching `src/pages/Home.tsx`, `src/components/AtelierSections.tsx`, `src/styles/atelierSections.css`, `src/three/scenes/AtelierObjects.tsx`, `src/three/scenes/CinematicHero.tsx`, and `src/shaders/cinematicHero.ts` to undo only the final enhancement pass.

Both snapshots contain full source and `CLAUDE.md`. Earlier snapshots remain untouched. Do not bulk-restore over later unrelated changes. No new asset generation credits were spent; no mobile refinement was performed.

## Evidence

`motion-check.mjs` verifies a stationary cursor cannot reveal the drawing, all scroll phases, reversal, sticky positioning, phase buttons, material selection, reduced-motion controls and the enlarged hero duration, with no page/console errors. Screenshots include `motion-drawing`, `motion-form`, `motion-colour`, `motion-vision` and `motion-metal` in `.local-research/redesign-2026-10-26/review/`.

`enhancement-check.mjs` covers the slower hero navigation, extreme pointer positions on the protected portrait, the closing R3F canvas, document width and return-to-start. These scripts use the local preview on port 5180. The historical `interaction-check.mjs` contains the previous hover-reveal assertions and is not the current motion suite.

Final enhancement browser run passed with no page/console errors. Both portrait extreme-position screenshots and the rendered signature scene were visually inspected. The bedroom title was moved above the figure's head as well. Focused oxlint passed without warnings. Final TypeScript/Vite production build passed using a process-local 2GB Node heap setting after an earlier host-memory allocation failure; no repository build configuration was changed. The existing large Three/R3F chunk warning remains.
