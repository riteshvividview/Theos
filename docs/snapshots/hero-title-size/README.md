# Hero headline sizes (before 2026-11-05)

`cinematicHero.css` here is the hero stylesheet before the three hero headlines were made smaller (they overlapped their
sublines in the Rink display face). The change is the block at the end of `src/styles/cinematicHero.css` headed
"Smaller hero headlines": headline sizes clamp(30px,2.9vw,56px) / clamp(32px,3.2vw,62px) / clamp(28px,2.7vw,50px) for
worlds 1 / 2 / 3, with each subline 2.9 x the headline size below its top.

To revert: delete that block, or copy `cinematicHero.css` from here back to `src/styles/`.
Before: clamp(38px,3.8vw,72px) / clamp(40px,4.2vw,80px) / clamp(36px,3.4vw,64px), subline at 2.5 x.
