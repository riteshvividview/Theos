# Hero with four worlds (before 2026-11-03)

Copies of the hero files from before the fourth world (the pool, "Spaces That Speak Quality") was removed and the
eye → third-world passage was switched from the opening carved wall to the clouds. `config.cinematicHero.ts` is
`src/config/cinematicHero.ts` and `shader.cinematicHero.ts` is `src/shaders/cinematicHero.ts`; the others keep their names.

## What changed

- `src/config/cinematicHero.ts`: the pool world was removed from `cinematicWorlds`. `HERO_END` and `getHeroFrame` now follow
  the number of worlds (`LAST_WORLD = cinematicWorlds.length - 1`, `HERO_END = LAST_WORLD + .62`). Each world names how it
  hands over with `passage`: world 1 `'glass'`, world 2 `'clouds'` (it was the carved-wall `'portal'`).
- `src/three/scenes/CinematicHero.tsx`: the portal texture index, the passages (from `passage`), the closing flood (on the last
  world), and the pool and portrait flags (by world id) no longer assume four worlds.
- `src/animations/useCinematicJourney.ts`: the last world, the closing flood, the last meter and the slow passages follow the
  world count and `passage`.
- `src/pages/Home.tsx`: the counter shows the real count; the last-world checks use `LAST_WORLD`.
- `src/styles/cinematicHero.css`: the desktop nav has three columns; the hero scroll length was shortened in proportion
  (915 → 717svh, 597 → 487svh, 498 → 416svh) so every passage keeps its pace.

## To revert

- Bring the pool back: add its entry back to the end of `cinematicWorlds` (it is in `config.cinematicHero.ts` here), set the
  third world's `passage: 'clouds'`, set the nav to `repeat(4, 150px)` and the journey heights back to 915 / 597 / 498svh.
- Bring the opening carved wall back for the eye world: set its `passage` to `'portal'`.
- Or restore every file from this folder.

The pool images (`public/images/redesign/pool.jpg`, `pool-depth.png`) are still in place.
