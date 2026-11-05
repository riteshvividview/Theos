export interface CinematicWorld {
  id: string
  name: string
  navigation: string
  image: string
  depth: string
  /** Width over height of the photograph. */
  aspect: number
  alt: string
  lines: [string, string]
  /** Image coordinates, top-left origin: the detail the camera flies into when leaving this world. */
  exit: [number, number]
  /** The matching detail this world grows out of when arriving (eye into eye, red into red, arch into arch). */
  entry: [number, number]
  portraitFocus: number
  /** On screens wider than the image, which band of its height to show: 0 top, .5 middle (default), 1 bottom. */
  verticalFocus?: number
  /** How the hero leaves this world: a sweep of fluted glass, the carved wall opening into an arch, or up through the
   *  clouds and down into the next world. Without one it flies into its exit detail. */
  passage?: 'glass' | 'portal' | 'clouds'
}

const desktopWorlds: CinematicWorld[] = [
  { id: 'beyond-ordinary', name: 'Designed Around Real Living', navigation: 'Home', image: '/images/redesign/world1.jpg', depth: '/images/redesign/world1-depth.png', aspect: 1672 / 941, alt: 'A white stone hall with a carved elephant head above an indoor pool, waterfalls falling from its rock wall, and a floor-to-ceiling glass wall onto the forest.', lines: ['Designed Around Real Living', 'Where Luxury Comes Home.'], exit: [.53, .34], entry: [.5, .5], portraitFocus: .45, passage: 'glass' },
  { id: 'perspective', name: 'Rewriting Your Home Story', navigation: 'Perspective', image: '/images/redesign/eye.jpg', depth: '/images/redesign/eye-depth.png', aspect: 1672 / 1077, alt: 'A monumental eye carved into an ivory interior, with sculptural furniture and vivid red figures.', lines: ['Rewriting Your Home Story', 'A new perspective on living.'], exit: [.508, .398], entry: [.508, .398], portraitFocus: .50, passage: 'clouds' },
  { id: 'imagination', name: 'Where Possibilities Take Shape', navigation: 'Imagination', image: '/images/redesign/world3.jpg', depth: '/images/redesign/world3-depth.png', aspect: 1672 / 940, alt: 'A white bathing hall with arched curtained windows, where a blue marble bathtub is sculpted as a sea turtle with gilded shell and flippers.', lines: ['Where Possibilities Take Shape', 'Your vision, brought to life.'], exit: [.76, .5], entry: [.76, .5], portraitFocus: .55, verticalFocus: 1 },
  // The fourth world (the pool, "Spaces That Speak Quality") was removed; its entry and the four-world files are kept in
  // docs/snapshots/hero-four-worlds/. Adding it back here restores it: everything below follows the number of worlds.
]

// Phones (portrait, up to 760px wide) get portrait versions of each world, framed so the subject sits clear of the
// headline; the detail points move to where those details are in the portrait images. Chosen once, at load.
const mobileVariant: Record<string, Partial<CinematicWorld>> = {
  "beyond-ordinary": { image: "/images/redesign/m-world1.jpg", depth: "/images/redesign/m-world1-depth.png", aspect: 941 / 1672, exit: [.45, .5], portraitFocus: .5, verticalFocus: .5 },
  perspective: { image: "/images/redesign/m-world2.jpg", depth: "/images/redesign/m-world2-depth.png", aspect: 941 / 1672, exit: [.5, .51], entry: [.5, .51], portraitFocus: .5, verticalFocus: .5 },
  imagination: { image: "/images/redesign/m-world3.jpg", depth: "/images/redesign/m-world3-depth.png", aspect: 941 / 1672, exit: [.5, .5], entry: [.5, .5], portraitFocus: .5, verticalFocus: 1 },
}
const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches
export const cinematicWorlds: CinematicWorld[] = narrow ? desktopWorlds.map(world => ({ ...world, ...mobileVariant[world.id] })) : desktopWorlds

// The last world, then the flood to cream (paced, like every passage); the next section then rises straight over it.
export const LAST_WORLD = cinematicWorlds.length - 1
export const HERO_END = LAST_WORLD + .62
export const TRANSITION_START = .48

export function getHeroFrame(progress: number, reduced: boolean) {
  const value = Math.max(0, Math.min(HERO_END, progress))
  const index = Math.min(LAST_WORLD, Math.floor(value))
  const local = value - index
  const transition = index < LAST_WORLD ? Math.max(0, (local - TRANSITION_START) / (1 - TRANSITION_START)) : 0
  return { index: reduced && transition > .5 ? index + 1 : index, next: Math.min(index + 1, LAST_WORLD), local, transition: reduced ? 0 : transition }
}
