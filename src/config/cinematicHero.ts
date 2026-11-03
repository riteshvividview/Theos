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
}

export const cinematicWorlds: CinematicWorld[] = [
  { id: 'beyond-ordinary', name: 'Designed Around Real Living', navigation: 'Home', image: '/images/redesign/section1.jpg', depth: '/images/redesign/section1-depth.png', aspect: 1672 / 941, alt: 'A navy and ivory dining bar: a woman in a polka-dot suit sits at a striped tiled counter on velvet bar stools, beside a round dining table with egg chairs on a checkerboard floor.', lines: ['Designed Around Real Living', 'Where Luxury Comes Home.'], exit: [.267, .407], entry: [.5, .5], portraitFocus: .55 },
  { id: 'perspective', name: 'Rewriting Your Home Story', navigation: 'Perspective', image: '/images/redesign/eye.jpg', depth: '/images/redesign/eye-depth.png', aspect: 1672 / 1077, alt: 'A monumental eye carved into an ivory interior, with sculptural furniture and vivid red figures.', lines: ['Rewriting Your Home Story', 'A new perspective on living.'], exit: [.508, .398], entry: [.508, .398], portraitFocus: .50 },
  { id: 'imagination', name: 'Where Possibilities Take Shape', navigation: 'Imagination', image: '/images/redesign/section3.jpg', depth: '/images/redesign/section3-depth.png', aspect: 1672 / 941, alt: 'A white colonnaded salon with arched alcoves and bronze busts: a woman in a sculptural navy gown stands before a white modular sofa, beside a monstera and a black horse-head sculpture on a navy rug.', lines: ['Where Possibilities Take Shape', 'Your vision, brought to life.'], exit: [.225, .45], entry: [.335, .52], portraitFocus: .4, verticalFocus: 1 },
  { id: 'extraordinary-living', name: 'Spaces That Speak Quality', navigation: 'Living', image: '/images/redesign/pool.jpg', depth: '/images/redesign/pool-depth.png', aspect: 1672 / 1077, alt: 'Blue sculptural spheres and an ivory bathtub beside a reflecting pool and white arches.', lines: ['Spaces That Speak Quality', 'Every detail, intentional.'], exit: [.50, .5], entry: [.87, .58], portraitFocus: .58 },
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
