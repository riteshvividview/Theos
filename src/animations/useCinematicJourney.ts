import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HERO_END, TRANSITION_START, cinematicWorlds } from '@/config/cinematicHero'
import { scrollPageTo } from '@/hooks/useSmoothScroll'

gsap.registerPlugin(ScrollTrigger)

export function useCinematicJourney(root: RefObject<HTMLElement | null>, reduced: boolean) {
  const progress = useRef(0)
  const [active, setActive] = useState(0)
  const trigger = useRef<ScrollTrigger | null>(null)

  useLayoutEffect(() => {
    if (!root.current) return
    const element = root.current
    const ctx = gsap.context(() => {
      const titles = gsap.utils.toArray<HTMLElement>('.atelier-title')
      const meters = gsap.utils.toArray<HTMLElement>('.atelier-meter-fill')
      const playhead = { value: 0 }
      const render = () => {
        const p = playhead.value
        progress.current = p
        const current = Math.min(3, Math.floor(p + .08))
        setActive(old => old === current ? old : current)
        element.dataset.world = cinematicWorlds[current].id
        element.style.setProperty('--journey-progress', String(p / HERO_END))
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
      const timeline = gsap.to(playhead, { value: HERO_END, ease: 'none', onUpdate: render,
        scrollTrigger: { id: 'theos-cinematic-hero', trigger: element, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
      })
      trigger.current = timeline.scrollTrigger ?? null
      render()
      if (!reduced) {
        gsap.from('.atelier-header', { y: -16, opacity: 0, duration: 1.05, ease: 'power3.out', delay: .15 })
        gsap.from('.atelier-title:first-child .atelier-line > span', { yPercent: 115, rotate: 2, stagger: .16, duration: 1.25, ease: 'power3.out', delay: .28 })
        gsap.from('.atelier-bottom', { opacity: 0, y: 10, duration: 1, delay: .8 })
      }
    }, element)
    // The section has explicit viewport sizing; refresh after fonts settle.
    let alive = true
    void document.fonts.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; ctx.revert(); trigger.current = null }
  }, [root, reduced])

  const goToWorld = useCallback((index: number) => {
    const scrollTrigger = trigger.current
    if (!scrollTrigger) return
    const targetProgress = index === 0 ? 0 : index + .20
    const y = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * targetProgress / HERO_END
    scrollPageTo(y, reduced, 2.8)
  }, [reduced])
  return { progress, active, goToWorld }
}
