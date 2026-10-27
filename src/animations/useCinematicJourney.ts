import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HERO_END, TRANSITION_START, cinematicWorlds } from '@/config/cinematicHero'
import { holdScrollAt, scrollPageTo } from '@/hooks/useSmoothScroll'

gsap.registerPlugin(ScrollTrigger)

export function useCinematicJourney(root: RefObject<HTMLElement | null>, reduced: boolean) {
  const progress = useRef(0)
  const [active, setActive] = useState(0)
  const trigger = useRef<ScrollTrigger | null>(null)
  const navigating = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!root.current) return
    const element = root.current
    let paceRef: (() => void) | null = null
    const ctx = gsap.context(() => {
      const titles = gsap.utils.toArray<HTMLElement>('.atelier-title')
      const meters = gsap.utils.toArray<HTMLElement>('.atelier-meter-fill')
      // Scroll sets where the journey should be; the journey travels there at its own calm pace (MAX_SPEED worlds per second),
      // so a hard flick still plays every passage at the same speed.
      const MAX_SPEED = .32
      // The eye → bedroom and bedroom → pool passages are the slowest, so the crumble, the walk and the clouds read clearly.
      const speedAt = (p: number) => (p > 1.4 && p < 2.05) || (p > 2.4 && p < 3.05) ? .2 : MAX_SPEED
      // However hard the page is scrolled, it may run at most LEAD worlds ahead of (or behind) the animation; past that it is
      // held, so every passage plays in full and nothing is skipped. Programmatic navigation (the world buttons) is exempt.
      const LEAD = .25
      const target = { value: 0 }, shown = { value: 0 }
      const render = () => {
        const p = shown.value
        progress.current = p
        const current = Math.min(3, Math.floor(p + .08))
        setActive(old => old === current ? old : current)
        element.dataset.world = cinematicWorlds[current].id
        element.style.setProperty('--journey-progress', String(p / HERO_END))
        // Past the pool the water rises into the page below; the stage's overlays fade with it.
        element.style.setProperty('--hero-outro', gsap.utils.clamp(0, 1, (p - 3.22) / .4).toFixed(3))
        titles.forEach((title, i) => {
          const local = p - i
          const enter = i === 0 ? 1 : gsap.utils.clamp(0, 1, local / .12)
          const exit = i === 3 ? 1 : 1 - gsap.utils.clamp(0, 1, (local - (TRANSITION_START - .16)) / .16)
          const visible = local >= 0 && local < 1 ? enter * exit : 0
          gsap.set(title, { autoAlpha: reduced ? Number(current === i) : visible, y: reduced ? 0 : (1 - enter) * 28 - (1 - exit) * 18 })
        })
        meters.forEach((meter, i) => gsap.set(meter, { scaleX: gsap.utils.clamp(0, 1, p - i) }))
        const lastMeter = meters[3]
        if (lastMeter) gsap.set(lastMeter, { scaleX: gsap.utils.clamp(0, 1, (p - 3) / .64) })
      }
      const timeline = gsap.to(target, { value: HERO_END, ease: 'none', onUpdate: () => { if (reduced) { shown.value = target.value; render() } },
        scrollTrigger: { id: 'theos-cinematic-hero', trigger: element, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
      })
      trigger.current = timeline.scrollTrigger ?? null
      shown.value = target.value
      render()
      const pace = () => {
        const gap = target.value - shown.value
        if (reduced || Math.abs(gap) < 1e-4) { if (shown.value !== target.value) { shown.value = target.value; render() } return }
        const dt = gsap.ticker.deltaRatio(60) / 60
        // Eased approach with a small floor so it always arrives, never faster than MAX_SPEED and never past the target.
        const step = Math.abs(gap) * (1 - Math.exp(-4.5 * dt)) + .02 * dt
        shown.value += Math.sign(gap) * Math.min(step, speedAt(shown.value) * dt, Math.abs(gap))
        render()
        const st = trigger.current
        if (st && navigating.current === null && Math.abs(target.value - shown.value) > LEAD) {
          const hold = shown.value + Math.sign(target.value - shown.value) * LEAD
          holdScrollAt(st.start + (st.end - st.start) * hold / HERO_END)
        }
        if (navigating.current !== null && Math.abs(shown.value - navigating.current) < .02) navigating.current = null
      }
      gsap.ticker.add(pace)
      paceRef = pace
      if (!reduced) {
        gsap.from('.atelier-header', { y: -16, opacity: 0, duration: 1.05, ease: 'power3.out', delay: .15 })
        gsap.from('.atelier-title:first-child .atelier-line > span', { yPercent: 115, rotate: 2, stagger: .16, duration: 1.25, ease: 'power3.out', delay: .28 })
        gsap.from('.atelier-bottom', { opacity: 0, y: 10, duration: 1, delay: .8 })
      }
    }, element)
    // The section has explicit viewport sizing; refresh after fonts settle.
    let alive = true
    void document.fonts.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; if (paceRef) gsap.ticker.remove(paceRef); ctx.revert(); trigger.current = null }
  }, [root, reduced])

  const goToWorld = useCallback((index: number) => {
    const scrollTrigger = trigger.current
    if (!scrollTrigger) return
    const targetProgress = index === 0 ? 0 : index + .20
    navigating.current = targetProgress
    window.setTimeout(() => { if (navigating.current === targetProgress) navigating.current = null }, 9000)
    const y = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * targetProgress / HERO_END
    scrollPageTo(y, reduced, 2.8)
  }, [reduced])
  return { progress, active, goToWorld }
}
