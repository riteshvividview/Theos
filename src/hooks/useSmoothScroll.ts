import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let currentLenis: Lenis | null = null
let scrollLocked = true
export function setScrollLocked(locked: boolean) {
  scrollLocked = locked
  if (locked) currentLenis?.stop()
  else currentLenis?.start()
}

export function scrollPageTo(top: number, immediate = false, duration = 1.35) {
  if (currentLenis) currentLenis.scrollTo(top, { immediate, duration })
  else window.scrollTo({ top, behavior: immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}

gsap.registerPlugin(ScrollTrigger)

/**
 * Drives Lenis from GSAP's own ticker so there is exactly one rAF loop
 * driving both smooth scroll and ScrollTrigger — never call
 * `requestAnimationFrame` or `lenis.raf` separately alongside this.
 */
export function useSmoothScroll() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    })
    currentLenis = lenis
    if (scrollLocked) lenis.stop()

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (currentLenis === lenis) currentLenis = null
    }
  }, [reduced])
}
