import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { HERO_END, LAST_WORLD, TRANSITION_START, cinematicWorlds } from '@/config/cinematicHero'
import { holdScrollAt, scrollPageTo } from '@/hooks/useSmoothScroll'
import { onReveal } from '@/loading/readiness'

gsap.registerPlugin(ScrollTrigger)

export function useCinematicJourney(root: RefObject<HTMLElement | null>, reduced: boolean) {
  const progress = useRef(0)
  const [active, setActive] = useState(0)
  const trigger = useRef<ScrollTrigger | null>(null)
  const navigating = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!root.current) return
    const element = root.current
    let paceRef: (() => void) | null = null, stopIntro: (() => void) | null = null
    const ctx = gsap.context(() => {
      const titles = gsap.utils.toArray<HTMLElement>('.atelier-title')
      const meters = gsap.utils.toArray<HTMLElement>('.atelier-meter-fill')
      // Scroll sets where the journey should be; the journey travels there at its own calm pace (MAX_SPEED worlds per second),
      // so a hard flick still plays every passage at the same speed.
      // Phones scroll natively with momentum, so there the journey runs faster and never holds the page (holding fights
      // iOS momentum and feels stuck). Previous phone values were the desktop ones: .32, .2, .3 and LEAD .25.
      const phone = matchMedia("(max-width: 760px)").matches
      const MAX_SPEED = phone ? .85 : .32
      // The wall-opening and cloud passages are the slowest, so the crumble, the walk and the clouds read clearly.
      // The flood past the last world rises and drains at the same calm, even pace in both directions.
      const slow = cinematicWorlds.flatMap((world, i) => world.passage === 'portal' || world.passage === 'clouds' ? [i] : [])
      const speedAt = (p: number) => p > LAST_WORLD + .2 ? (phone ? .8 : .3) : slow.some(i => p > i + .4 && p < i + 1.05) ? (phone ? .55 : .2) : MAX_SPEED
      // However hard the page is scrolled, it may run at most LEAD worlds ahead of (or behind) the animation; past that it is
      // held, so every passage plays in full and nothing is skipped. Programmatic navigation (the world buttons) is exempt.
      const LEAD = phone ? Infinity : .25
      const target = { value: 0 }, shown = { value: 0 }
      const render = () => {
        const p = shown.value
        progress.current = p
        const current = Math.min(LAST_WORLD, Math.floor(p + .08))
        setActive(old => old === current ? old : current)
        element.dataset.world = cinematicWorlds[current].id
        element.style.setProperty('--journey-progress', String(p / HERO_END))
        // Past the last world the floor floods into the page below; the stage's overlays fade with it.
        element.style.setProperty('--hero-outro', gsap.utils.clamp(0, 1, (p - LAST_WORLD - .22) / .4).toFixed(3))
        titles.forEach((title, i) => {
          const local = p - i
          const enter = i === 0 ? 1 : gsap.utils.clamp(0, 1, local / .12)
          const last = i === LAST_WORLD
          const exit = last ? 1 : 1 - gsap.utils.clamp(0, 1, (local - (TRANSITION_START - .16)) / .16)
          const visible = local >= 0 && local < 1 ? enter * exit : 0
          // The last world's lines never fade: as the floor floods into the next section they rise with it, solid,
          // and leave over the top of the screen.
          const lift = last ? gsap.utils.clamp(0, 1, (local - .22) / .4) : 0
          gsap.set(title, { autoAlpha: reduced ? Number(current === i) : visible, y: reduced ? 0 : (1 - enter) * 28 - (1 - exit) * 18 - lift * lift * innerHeight * .85 })
        })
        meters.forEach((meter, i) => gsap.set(meter, { scaleX: gsap.utils.clamp(0, 1, p - i) }))
        const lastMeter = meters[LAST_WORLD]
        if (lastMeter) gsap.set(lastMeter, { scaleX: gsap.utils.clamp(0, 1, (p - LAST_WORLD) / (HERO_END - LAST_WORLD)) })
      }
      const timeline = gsap.to(target, { value: HERO_END, ease: 'none', onUpdate: () => { if (reduced) { shown.value = target.value; render() } },
        // The journey ends one screen before the section does: that last screen is where the next section slides up over the
        // flooded (cream) stage, so no empty screen is left between them.
        scrollTrigger: { id: 'theos-cinematic-hero', trigger: element, start: 'top top', end: () => `+=${element.offsetHeight - 2 * innerHeight}`, scrub: true, invalidateOnRefresh: true },
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
        // On first sight (when the loader starts to dissolve): the white fade pours down from the top and settles, then
        // the headline rises in, then its subline. Everything waits hidden until then. The fade is revealed with a clip
        // (not its opacity), so the per-world CSS that shows and hides it is untouched.
        const intro = gsap.timeline({ paused: true })
        intro.from('.atelier-header', { y: -16, opacity: 0, duration: 1.05, ease: 'power3.out' }, 0)
          .fromTo('.atelier-mist', { clipPath: 'inset(0 0 100% 0)', yPercent: -8 }, { clipPath: 'inset(0 0 0% 0)', yPercent: 0, duration: 1.3, ease: 'power2.out', clearProps: 'clipPath,transform' }, .05)
          .from('.atelier-title:first-child .atelier-line > span', { yPercent: 115, rotate: 2, stagger: .22, duration: 1.2, ease: 'power3.out' }, 1.0)
          .from('.atelier-bottom', { opacity: 0, y: 10, duration: 1 }, 1.45)
        intro.progress(0).pause()
        stopIntro = onReveal(() => intro.play())
      }
    }, element)
    // The section has explicit viewport sizing; refresh after fonts settle.
    let alive = true
    void document.fonts.ready.then(() => { if (alive) ScrollTrigger.refresh() })
    return () => { alive = false; stopIntro?.(); if (paceRef) gsap.ticker.remove(paceRef); ctx.revert(); trigger.current = null }
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
