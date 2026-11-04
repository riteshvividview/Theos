# Footer liquid drops (removed 2026-11-04)

The closing scene's seven liquid drops, ray-marched as metaballs: scroll gathers them into the theos O and its dot, drag
throws a drop, nearby drops shy from the cursor, and a click changes the material (chrome, red lacquer, glass, pearl).
It was replaced in the footer by an interactive link index; it is kept here to reuse in another section.

- `LiquidDrops.tsx`: the whole scene (`SignatureCanvas`). Copy it back to `src/three/scenes/`.
- `AtelierSections.tsx`, `atelierSections.css`, `PageLoader.tsx`: the files as they were, with the scene in the footer.

## To use it again

1. Copy `LiquidDrops.tsx` to `src/three/scenes/`.
2. Lazy-load it: `const SignatureCanvas=lazy(()=>import('@/three/scenes/LiquidDrops').then(m=>({default:m.SignatureCanvas})))`.
3. Render `<SignatureCanvas running={near} reduced={reduced} progress={progress}/>` inside a sized, positioned container, where
   `progress` is a ref from 0 to 1 (how gathered the drops are) and `near` is true while it is on screen.
4. The canvas uses the `.outro-passage` and `.outro-passage-hint` styles (in `atelierSections.css` here).
5. It reports `sceneReady('signature')`; if the page loader should wait for it, add it back to the loader's scene count.
