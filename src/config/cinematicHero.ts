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
}

export const cinematicWorlds: CinematicWorld[] = [
  { id: 'beyond-ordinary', name: 'Beyond the ordinary', navigation: 'Home', image: '/images/redesign/rhino2.jpg', depth: '/images/redesign/rhino2-depth.png', aspect: 2172 / 724, alt: 'A wide view of a bright modern living room: a cream L-shaped sofa with orange cushions, two tan leather armchairs, a dark coffee table on a shag rug, a branching brass chandelier and a marble feature wall, with garden views through tall curtained windows.', lines: ['for interiors that', 'don’t do ordinary.'], exit: [.6, .38], entry: [.5, .5], portraitFocus: .45 },
  { id: 'perspective', name: 'A different perspective', navigation: 'Perspective', image: '/images/redesign/eye.jpg', depth: '/images/redesign/eye-depth.png', aspect: 1672 / 1077, alt: 'A monumental eye carved into an ivory interior, with sculptural furniture and vivid red figures.', lines: ['bold when needed', 'where space becomes narrative.'], exit: [.508, .398], entry: [.508, .398], portraitFocus: .50 },
  { id: 'imagination', name: 'Imagination takes form', navigation: 'Imagination', image: '/images/redesign/bedroom.jpg', depth: '/images/redesign/bedroom-depth.png', aspect: 1672 / 1077, alt: 'Cobalt blue furniture on white pebbles, with a blue-clad woman holding a red heart.', lines: ['where imagination', 'finds form'], exit: [.923, .44], entry: [.354, .49], portraitFocus: .43 },
  { id: 'extraordinary-living', name: 'Extraordinary living', navigation: 'Living', image: '/images/redesign/pool.jpg', depth: '/images/redesign/pool-depth.png', aspect: 1672 / 1077, alt: 'Blue sculptural spheres and an ivory bathtub beside a reflecting pool and white arches.', lines: ['Ordinary spaces.', 'Extraordinary living.'], exit: [.50, .5], entry: [.87, .58], portraitFocus: .58 },
]

// Past the pool the water floods to cream (paced, like every passage); the next section then rises straight over it.
export const HERO_END = 3.62
export const TRANSITION_START = .48

export function getHeroFrame(progress: number, reduced: boolean) {
  const value = Math.max(0, Math.min(HERO_END, progress))
  const index = Math.min(3, Math.floor(value))
  const local = value - index
  const transition = index < 3 ? Math.max(0, (local - TRANSITION_START) / (1 - TRANSITION_START)) : 0
  return { index: reduced && transition > .5 ? index + 1 : index, next: Math.min(index + 1, 3), local, transition: reduced ? 0 : transition }
}
