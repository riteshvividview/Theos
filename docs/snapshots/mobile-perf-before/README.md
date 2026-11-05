# Mobile speed and iPhone fit (before 2026-11-05)

Copies of the files as they were before the phone scrolling, iPhone gap and pavilion-swipe changes. The project was
also at git commit `96d8b29` just before; `git checkout 96d8b29 -- <file>` restores any single file, including the
unused assets removed in the cleanup.

## What changed (phones only, 760px wide or less)

- `useCinematicJourney.ts`: the hero journey runs faster on phones (MAX_SPEED .85, slow passages .55, closing flood .8;
  were .32 / .2 / .3) and never holds the page (LEAD Infinity; was .25). Holding fought iOS momentum and felt stuck.
- `responsive.css` (end): the pinned hero stage fills the large viewport (`100lvh`, was `100svh`) so no strip shows
  under it when Safari's toolbars collapse; the journey is shorter (`420svh`, was `487svh`); poster images cover.
- `CinematicHero.tsx`: the hero renders at 1x pixel density on phones (was up to 1.25x).
- `useSmoothScroll.ts`: `ScrollTrigger.config({ ignoreMobileResize: true })`, so toolbar show/hide doesn't recalculate
  every trigger mid-scroll (this one applies everywhere, but only matters on mobile browsers).
- `Pavilion.tsx`: a swipe travels about two rooms (factor 4, was 2) and the view follows twice as fast (16, was 8).

## Cleanup

Unused files were removed from `public/` (originals of the compressed testimonial videos and portraits, original phone
images, unused hero images and depth maps, old pavilion previews, unused fonts, the dev preview pages). The Blender file
moved to `tools/pavilion/pavilion.blend` and the content brief to `docs/Theos Website Content.pdf`.

To revert everything: copy the files here back to `src/` (paths in their headers), or check out `96d8b29`.
