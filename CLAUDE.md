# Theos — current homepage

## Architecture

React + TypeScript + Vite; Three.js / React Three Fiber; GSAP + ScrollTrigger; one GSAP-driven Lenis instance; Tailwind v4; lucide-react.

`App.tsx` renders `Home` inside `MainLayout`. There are no secondary pages. `Home` composes the four-world hero, `AtelierSections` and `AtelierOutro`. `SceneCanvas` lazily loads the hero; `AtelierObjects` provides the procedural ribbon, depth-parallax blueprint reveal shader and closing sculpture.

## Behavior

- Desktop hero uses 820vh travel with depth-map parallax. Worlds hand over by flying through a shared detail on an exponential zoom: rhino eye → carved eye, red iris → red heart, blue archway → pool arches (`exit` / `entry` in `cinematicHero.ts`). The next world grows inside the detail as a miniature and dissolves in along an organic edge, with radial motion streaks. The journey is paced (`MAX_SPEED` in `useCinematicJourney`), so hard scrolling never speeds a passage up. The bedroom figure uses coherent projective movement to avoid tearing.
- Draggable orbital gallery (15 frames on an invisible sphere, depth-dimmed) with native dialog previews; static tiles remain the WebGL fallback.
- Procedural 3D process ribbon with lacquer/metal/clay choices.
- Sticky blueprint sequence: scroll raises and draws the blueprint, then pushes into the room; a cursor lens reveals the built interior and double-click (or the Blueprint / As built buttons) builds it all.
- Animated SVG focus icons and expandable O-shaped visual stories.
- Cream → navy hand-over (`OutroRise` in `AtelierSections.tsx`): the navy rises over the stories section as the footer scrolls in, its top a crisp curved wave that drifts as it rises; at rest the footer meets the cream along that curve.
- Closing scene: seven liquid drops ray-marched as metaballs (`LiquidDrops.tsx`): scroll gathers them into the theos O and its dot, drag throws a drop (spring physics), nearby drops shy from the cursor, click morphs the material (chrome, red lacquer, glass, pearl) under a procedural studio light. Half resolution, created only near the footer. The previous red O is kept in `docs/snapshots/outro-before/`. Email CTA.
- Reduced motion, offscreen rendering pauses and graceful imagery fallbacks.

The current project is desktop-focused. Actual client footage and quotes remain pending; visual studies are labelled accordingly.

## Records

Read `docs/REDESIGN_FULL_2026-10-26.md`, `docs/REDESIGN_MOTION_2026-10-27.md` and `docs/PROJECT_CLEANUP_2026-10-27.md`. Old source paths in historical documents refer to local recovery archives, not current files. No model binaries, alternate pages or downloaded research are shipped in this repository.
