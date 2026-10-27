# Theos — current homepage

## Architecture

React + TypeScript + Vite; Three.js / React Three Fiber; GSAP + ScrollTrigger; one GSAP-driven Lenis instance; Tailwind v4; lucide-react.

`App.tsx` renders `Home` inside `MainLayout`. There are no secondary pages. `Home` composes the four-world hero, `AtelierSections` and `AtelierOutro`. `SceneCanvas` lazily loads the hero; `AtelierObjects` provides the procedural ribbon, architectural drawing shader and closing sculpture.

## Behavior

- Desktop hero uses 820vh travel and expanded circular transitions. The blue-clad figure uses coherent projective movement to avoid tearing.
- Nine-image asymmetric gallery with native dialog previews.
- Procedural 3D process ribbon with lacquer/metal/clay choices.
- Sticky drawing → form → colour sequence driven by scroll and phase buttons, never hover.
- Animated SVG focus icons and expandable O-shaped visual stories.
- Reflective 3D O closing scene and email CTA.
- Reduced motion, offscreen rendering pauses and graceful imagery fallbacks.

The current project is desktop-focused. Actual client footage and quotes remain pending; visual studies are labelled accordingly.

## Records

Read `docs/REDESIGN_FULL_2026-10-26.md`, `docs/REDESIGN_MOTION_2026-10-27.md` and `docs/PROJECT_CLEANUP_2026-10-27.md`. Old source paths in historical documents refer to local recovery archives, not current files. No legacy model binaries, alternate pages or downloaded research are shipped in this repository.
