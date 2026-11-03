# Blueprint section snapshot (2026-11-03)

Section 03 ("Ordinary spaces. Extraordinary living.") as it was before the sticky blueprint → as-built stage was removed from the homepage.

- `AtelierSections.tsx`: the full `Architecture` component (scroll-driven `--open`, cursor lens, click-to-build, Blueprint / As built buttons).
- `AtelierObjects.tsx`: `Blueprint` / `BlueprintCanvas` shader (still present in `src/three/scenes/AtelierObjects.tsx`).
- `atelierSections.css`: `.architecture-sequence`, `.architecture-pin`, `.construction-bar`, `.blueprint-cursor`, `.drawing-*` rules (still in the live stylesheet).
- Images: `public/images/redesign/architecture-plan.*`, `architecture.jpg`, `architecture-depth.png` (kept).

To revert, copy the `Architecture` function (and the `BlueprintCanvas` lazy import / `BlueprintLens` type import) back into `src/components/AtelierSections.tsx` and render it as `<Architecture reduced={reduced}/>`. To reuse on another page, lift the same component and import `@/styles/atelierSections.css`.
