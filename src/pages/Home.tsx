import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ArrowLeft, ArrowRight, Menu, X } from 'lucide-react'
import { CinematicCanvas } from '@/three/SceneCanvas'
import { cinematicWorlds } from '@/config/cinematicHero'
import { useCinematicJourney } from '@/animations/useCinematicJourney'
import { scrollPageTo } from '@/hooks/useSmoothScroll'
import { AtelierSections, AtelierOutro } from '@/components/AtelierSections'
import '@/styles/cinematicHero.css'

export function Home() {
  const root = useRef<HTMLElement>(null)
  const menuToggle = useRef<HTMLButtonElement>(null)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroVisible,setHeroVisible] = useState(true)
  const { progress, active, goToWorld } = useCinematicJourney(root, reduced)
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setFailed(true); setReady(false) }, [])
  const world = cinematicWorlds[active]
  useEffect(()=>{
    const el=root.current
    if(!el)return
    const observer=new IntersectionObserver(([entry])=>setHeroVisible(entry.isIntersecting))
    observer.observe(el)
    return()=>observer.disconnect()
  },[])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuToggle.current?.focus() }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [menuOpen])

  const navigate = (index: number) => { goToWorld(index); setMenuOpen(false) }
  const goToContact = () => {
    const contact = document.getElementById('collection')
    if (contact) scrollPageTo(contact.getBoundingClientRect().top + window.scrollY, reduced)
  }

  return <main className="atelier-home">
    <a href="#atelier-contact" className="atelier-skip">Skip the visual journey</a>
    <section ref={root} className="atelier-journey" aria-label="Theos — beyond the ordinary" data-world={world.id}>
      <div className={`atelier-stage${ready && !failed ? ' is-ready' : ''}${active === 1 ? ' is-ivory' : ''}`}>
        <div className="atelier-poster" aria-hidden="true">
          {cinematicWorlds.map((scene, i) => <img key={scene.id} src={scene.image} alt="" fetchPriority={i === 0 ? 'high' : 'auto'} className={active === i ? 'is-current' : ''} style={{ objectPosition: `${scene.portraitFocus * 100}% center` }} />)}
        </div>
        {!failed && <div className="atelier-canvas" aria-hidden="true"><CinematicCanvas progress={progress} reduced={reduced} onReady={onReady} onFailure={onFailure} running={heroVisible} /></div>}
        <div className="atelier-shade" aria-hidden="true" />

        <header className="atelier-header">
          <a className="atelier-logo" href="#" onClick={e => { e.preventDefault(); navigate(0) }} aria-label="Theos home">theos<span aria-hidden="true">.</span></a>
          <nav className="atelier-desktop-nav" aria-label="Explore the worlds">
            {cinematicWorlds.map((scene, i) => <button key={scene.id} onClick={() => navigate(i)} aria-current={active === i ? 'step' : undefined}>{scene.navigation}</button>)}
          </nav>
          <a className="atelier-factory" href="https://theos.co.in/" target="_blank" rel="noreferrer">Factory <ArrowUpRight size={14} strokeWidth={1.25} /></a>
          <button className="atelier-menu-toggle" ref={menuToggle} aria-expanded={menuOpen} aria-controls="atelier-mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </header>
        {menuOpen && <nav id="atelier-mobile-menu" className="atelier-mobile-menu" aria-label="Explore the worlds">
          {cinematicWorlds.map((scene, i) => <button key={scene.id} onClick={() => navigate(i)} aria-current={active === i ? 'step' : undefined}><span>0{i + 1}</span>{scene.navigation}<ArrowUpRight size={18} /></button>)}
          <a href="https://theos.co.in/" target="_blank" rel="noreferrer">Explore the factory <ArrowUpRight size={18} /></a>
        </nav>}

        <h1 className="sr-only">Theos. For interiors that don’t do ordinary.</h1>
        <div className="atelier-titles">
          {cinematicWorlds.map((scene, i) => <div key={scene.id} className={`atelier-title atelier-title-${i}`} aria-hidden={active !== i}>
            <h2 className="atelier-line atelier-line-first"><span>{scene.lines[0]}</span></h2>
            <p className="atelier-line atelier-line-second"><span>{scene.lines[1]}</span></p>
          </div>)}
        </div>

        <div className="atelier-bottom">
          <div className="atelier-world-caption"><span className="atelier-star" aria-hidden="true">✳</span><span>Beyond the ordinary<br /><small>Interiors · Furniture · Imagination</small></span></div>
          <button className="atelier-scroll" onClick={() => active < 3 ? navigate(active + 1) : goToContact()}><span>{active < 3 ? 'Scroll to discover' : 'Explore our perspectives'}</span><ArrowDown size={17} strokeWidth={1.25} /></button>
          <div className="atelier-scene-controls">
            <button aria-label="Previous world" disabled={active === 0} onClick={() => navigate(active - 1)}><ArrowLeft size={16} strokeWidth={1.3} /></button>
            <span aria-live="polite" aria-atomic="true">0{active + 1}<span className="atelier-count-divider">/</span>04<span className="sr-only"> — {world.name}</span></span>
            <button aria-label="Next world" disabled={active === 3} onClick={() => navigate(active + 1)}><ArrowRight size={16} strokeWidth={1.3} /></button>
          </div>
        </div>
        <div className="atelier-meters" aria-label="Choose a scene">
          {cinematicWorlds.map((scene, i) => <button key={scene.id} onClick={() => navigate(i)} aria-label={`Go to ${scene.name}`} aria-current={active === i ? 'step' : undefined}><span className="atelier-meter-fill" /></button>)}
        </div>
      </div>
    </section>
    <AtelierSections reduced={reduced}/>
    <AtelierOutro reduced={reduced} onBeginning={()=>navigate(0)}/>
  </main>
}
