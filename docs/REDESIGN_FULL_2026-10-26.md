# Remaining homepage sections — 26 October 2026

## Authorized direction

The user authorized all remaining PDF sections, followed by creative enhancement using the studied animation references. This revision is desktop-focused. No new mobile layout work, paid image generation, Magnific credits or model purchases were used. Existing hero mobile styles remain untouched.

## Delivered

1. **Collection:** nine original PDF images in the asymmetric composition, dominant central salon, navy-tinted supporting windows, split editorial copy, staggered GSAP entrances, internal image parallax, scroll-drawn orbit, hover detail labels and keyboard-accessible native image dialog with previous/next controls.
2. **Process:** a procedural, lit Three.js red helical ribbon and small abstract human figures. Scroll and pointer position rotate the geometry; four process steps respond to hover/focus and move the highlight. The PDF contains lorem ipsum rather than dates, so the text describes Discover / Imagine / Craft / Live, not invented company history.
3. **Philosophy:** an aligned edge-detection drawing of the supplied architectural image. Pointer entry grows a circular colour reveal; leaving restores the drawing. The button holds the reveal open. SVG construction guides draw with scroll. The final image is the supplied architectural composite, not an independently generated clean-room rendering.
4. **Focus:** the three PDF statements with bespoke navy line SVGs, GSAP staggered illustration entrances, and distinct hover/focus transformations. Additional editorial statement connects this to the final chapter.
5. **Stories:** an oversized red O-shaped aperture, image-to-open-frame expansion, three selectable visual studies, animated image/text changes and accessible controls. **No client project footage, approved quote or attribution was supplied.** This is deliberately labelled as visual studies, not fabricated testimonials. Real testimonial media/content remains the sole editorial dependency for this chapter.

The first four-world hero remains intact. Its final CTA now leads into the collection. A discreet chapter rail uses the same Lenis instance to move between sections. The hero pauses rendering out of view; the two new R3F canvases mount near their sections and unmount away from them. Reduced-motion preferences remove entrance/scroll decoration and rotation. No third-party Pinterest footage is shipped.

## Files and assets

- `src/components/AtelierSections.tsx`: section composition, gallery data, interactions, GSAP orchestration and chapter navigation.
- `src/three/scenes/AtelierObjects.tsx`: lazy-loaded ribbon geometry and architectural reveal shader.
- `src/styles/atelierSections.css`: desktop layouts, transitions and SVG interactions.
- `src/pages/Home.tsx`: integration, collection CTA and hero visibility observation.
- `src/three/scenes/CinematicHero.tsx`: offscreen frame-loop pause.
- `public/images/redesign/gallery-*.jpg`: PDF embedded images 006–014, copied intact; original watermarks/credits retained. These remain supplied visual-reference imagery, not verified Theos-built projects.
- `architecture.jpg`: PDF image 016. `spiral-reference.jpg`: PDF image 015 used as loading/failure fallback.

## Validation

Production TypeScript/Vite build passed. Focused oxlint on changed source files passed without warnings. Vite retains a large Three/R3F chunk warning; no physical-GPU performance claims were made.

At 1600×1000, automated browser checks passed: gallery opening/next/Escape, live ribbon canvas and selected-step response, architecture sketch/colour visual difference and held reveal, SVG hover transformation, story selection and expansion, Lenis chapter navigation, no horizontal page overflow and no page/console errors. Actual GPU-rendered screenshots were inspected, rather than accepting only the loading posters.

Evidence and repeatable scripts are under `.local-research/redesign-2026-10-26/`: `interaction-check.mjs`, `gpu-check.mjs`, `sections-check.mjs` and `review/`. Earlier hero-only test scripts contain the old contact-CTA expectation and are historical evidence, not the current full-homepage suite.

## Revert this phase only

The previous hero-only version is preserved in `.local-backups/redesign-full-2026-10-26-before/` (full `src/`, `index.html`, `CLAUDE.md`). Restore these matching paths selectively: `src/pages/Home.tsx`, `src/three/scenes/CinematicHero.tsx`, `CLAUDE.md`.

After restoring callers, remove revision-only `src/components/AtelierSections.tsx`, `src/three/scenes/AtelierObjects.tsx`, `src/styles/atelierSections.css`, `public/images/redesign/gallery-*.jpg`, `architecture.jpg`, and `spiral-reference.jpg` only if no subsequent work uses them. Retain the original four hero images/depth maps. The separate `redesign-hero-2026-10-26-before` snapshot restores the older pre-redesign homepage; do not confuse the two recovery points. Preserve later unrelated changes when restoring.
