# Theos

Desktop-focused cinematic homepage for Theos, built with React, TypeScript, Vite, React Three Fiber / Three.js, GSAP and Lenis.

## Development

```sh
npm ci
npm run dev
```

## Validation and build

```sh
npm run lint
npm run build
npm run preview
```

## Structure

- `src/pages/Home.tsx` — homepage composition and hero controls.
- `src/components/AtelierSections.tsx` — gallery, process, architecture, focus, stories and closing scene.
- `src/three/scenes/` — lazily loaded homepage rendering.
- `src/shaders/` — hero transitions and portrait-safe movement.
- `src/animations/`, `src/hooks/` — GSAP orchestration and the shared Lenis loop.
- `src/config/`, `src/styles/` — scene content and presentation.
- `public/images/redesign/`, `public/fonts/` — active imagery and licensed fonts.
- `docs/` — design decisions, validation and recovery records.

All required homepage assets are included in ordinary Git. Git LFS is not required. The 3D spiral and closing sculpture are procedural; there are no external model downloads.

The stories section contains labelled visual studies pending approved client video and quotes. Supplied reference imagery is not represented as verified Theos client work.

Local research and recovery archives are excluded from Git. See `docs/PROJECT_CLEANUP_2026-10-27.md` for the cleanup scope and original-workstation recovery paths.
