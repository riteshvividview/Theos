# Theos — current homepage

## Architecture

React + TypeScript + Vite; Three.js / React Three Fiber; GSAP + ScrollTrigger; one GSAP-driven Lenis instance; Tailwind v4; lucide-react.

`App.tsx` renders `Home` inside `MainLayout`. There are no secondary pages. `Home` composes the four-world hero, `AtelierSections` and `AtelierOutro`. `SceneCanvas` lazily loads the hero; `AtelierObjects` provides the procedural ribbon, depth-parallax blueprint reveal shader and closing sculpture.

## Behavior

- The hero has three worlds (the fourth, the pool, was removed; four-world files and revert notes in `docs/snapshots/hero-four-worlds/`). Each world's `passage` sets how it hands over (glass, portal or clouds); the eye world now rises through the clouds into the third. Desktop hero uses 717svh travel with depth-map parallax. The first world (`section1.jpg`, a navy and ivory dining bar; the third world is `section3.jpg`, a white colonnaded salon) hands over through a pane of fluted (reeded) glass that sweeps right to left, each rib refracting the scene, the carved-eye room showing through it and remaining once it has passed (`uDepthPass`). The previous hero is kept in `docs/snapshots/hero-before/`. The later worlds hand over by flying through a shared detail on an exponential zoom: red iris → red heart, blue archway → pool arches (`exit` / `entry` in `cinematicHero.ts`). The next world grows inside the detail as a miniature and dissolves in along an organic edge, with radial motion streaks. The journey is paced (`MAX_SPEED` in `useCinematicJourney`), so hard scrolling never speeds a passage up. The bedroom figure uses coherent projective movement to avoid tearing.
- Draggable orbital gallery (15 frames on an invisible sphere, depth-dimmed) with native dialog previews; static tiles remain the WebGL fallback.
- Procedural 3D process ribbon with lacquer/metal/clay choices.
- Section 03 (About Theos) shows the glass pavilion (`Pavilion.tsx`, model in `public/models/pavilion/`, built in Blender): rooms rest a little dark and fill with light on hover, curtains are cloth-simulated and can be dragged and stretched, "Interior" sits behind it as plain type. The earlier blueprint → as-built stage is kept in `docs/snapshots/blueprint-section/` (`BlueprintCanvas` remains in `AtelierObjects`).
- Type (variables in `cinematicHero.css`): display lines, headings and their accents in Altheria Mystique; short bold titles (step names, focus titles, the pavilion's backdrop word) in Maveryn — both self-hosted from `public/fonts/`; UI in Poppins and sublines/paragraphs in Poppins Light (Google Fonts, linked in `index.html`).
- Copy follows `public/Theos Website Content.pdf` (hero headlines and sublines, Gallery, process flow, About Theos, Essence of Theos, closing statement). The stories section and footer are not covered by it.
- Animated SVG focus icons and expandable O-shaped visual stories.
- Cream → navy hand-over (`OutroRise` in `AtelierSections.tsx`): the navy rises over the stories section as the footer scrolls in, its top a crisp curved wave that drifts as it rises; at rest the footer meets the cream along that curve.
- Footer: an interactive index of the page (from the brief) with a cursor-trailing round preview, plus studio and social columns (placeholder links). The liquid-drops closing scene was removed and is kept in `docs/snapshots/outro-liquid/` for reuse; the older red O is in `docs/snapshots/outro-before/`. Email CTA.
- Reduced motion, offscreen rendering pauses and graceful imagery fallbacks.

The current project is desktop-focused. Actual client footage and quotes remain pending; visual studies are labelled accordingly.

## Records

Read `docs/REDESIGN_FULL_2026-10-26.md`, `docs/REDESIGN_MOTION_2026-10-27.md` and `docs/PROJECT_CLEANUP_2026-10-27.md`. Old source paths in historical documents refer to local recovery archives, not current files. No model binaries, alternate pages or downloaded research are shipped in this repository.
