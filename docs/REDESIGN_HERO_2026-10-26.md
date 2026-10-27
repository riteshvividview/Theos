# Theos opening redesign — 26 October 2026

## Scope and reference

Implemented the opening four-world sequence from `REDESIGN_REFERENCE_STUDY_2026-10-26.md`. This replaces the old homepage entry, with a temporary contact ending. The later gallery, timeline, sketch-to-reality, focus and testimonial sections are not implemented in this revision.

Order: white rhino and ivory lounge → eye-relief interior → cobalt bedroom → pool and blue spheres. The PDF artwork is preserved. No substitute stock imagery or approximate furniture models were introduced.

## Implementation

- `src/pages/Home.tsx`: framed navigation, accessible scene controls, editorial titles, mobile navigation and temporary contact ending.
- `src/config/cinematicHero.ts`: source images, focal points, copy and scene timing.
- `src/animations/useCinematicJourney.ts`: one reversible GSAP/ScrollTrigger playhead, title entrances and scene navigation.
- `src/three/scenes/CinematicHero.tsx` and `src/shaders/cinematicHero.ts`: one fullscreen R3F plane, expanding circular aperture, coordinated zoom, depth-map pointer parallax, restrained pool shimmer. This is image-based 2.5D, not reconstructed model geometry.
- `src/styles/cinematicHero.css`: responsive framing and typography.
- `src/hooks/useSmoothScroll.ts`: existing single GSAP-driven Lenis instance; shared programmatic scrolling and live reduced-motion preference handling.
- `src/three/SceneCanvas.tsx`: lazy loading and error boundary; old scene exports preserved.
- `index.html`: description and first-image preload.

The stage stays in place through the four worlds, then releases into normal document flow. Native sticky positioning handles the stage; ScrollTrigger supplies the playhead without a second pin spacer. Navigation uses the same Lenis scroll path. Motion reduces to scene changes when reduced motion is requested. Plain image posters remain available if WebGL fails.

## Assets and provenance

`public/images/redesign/` contains four 1672×1077 JPEGs extracted from the supplied PDF: rhino (`image-000`), eye (`image-002`), bedroom (`image-001`), pool (`image-005`). They have not been regenerated or upscaled. Fullscreen portrait uses a deliberate crop of these landscape originals.

Four Magnific depth maps were generated from these images at 5 credits each, 20 credits total. A balance of 36 credits was reported before these operations. Depth maps were reduced to 768px width grayscale PNGs for delivery. The combined shipped image/depth assets total approximately 1.72MB. Magnific returned dark foreground values; the shader explicitly inverts them. Research files, full depth outputs and downloaded Pinterest reference videos stay under `.local-research/` and are not delivered as site assets.

## Validation

Production TypeScript/Vite build passed. Browser review at 1600×1000 and 390×844 covered all four scenes, an intermediate circular transition, reverse scrolling, scene navigation, mobile navigation and reduced-motion scene switching. No page/console errors were recorded in that run; no horizontal document overflow was found at the phone viewport. Evidence: `.local-research/redesign-2026-10-26/review/`.

Focused lint on all seven changed TypeScript/TSX files passed without output. A final browser run also passed contact-stage release, return-to-start, live reduced-motion preference changes and simulated WebGL context loss with poster fallback, with no page errors. The full legacy project has lint warnings in older files. Browser checks do not constitute measured performance on physical mobile GPUs. Source art is limited to the PDF's original resolution.

## Revert safely

This folder was not a Git repository when work began. The before-state is preserved at `.local-backups/redesign-hero-2026-10-26-before/`.

Restore these matching paths from that backup to undo this revision: `src/pages/Home.tsx`, `src/three/SceneCanvas.tsx`, `src/hooks/useSmoothScroll.ts`, `index.html`, `CLAUDE.md`. The backup also contains the full original `src/`, package files and their lockfile; dependencies were not changed.

Revision-only files: `src/config/cinematicHero.ts`, `src/animations/useCinematicJourney.ts`, `src/three/scenes/CinematicHero.tsx`, `src/shaders/cinematicHero.ts`, `src/styles/cinematicHero.css` and `public/images/redesign/`. Remove these only after restoring their callers and confirming no later work depends on them. Preserve this record, the reference study and research evidence. Restore selectively so future unrelated edits survive.
