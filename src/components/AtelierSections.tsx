import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowUpRight, ArrowLeft, ArrowRight, X, Plus, Rotate3d } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollPageTo } from '@/hooks/useSmoothScroll'
import type { OrbitCard, OrbitControl } from '@/three/scenes/CollectionOrbit'
import type { BlueprintLens, Finish } from '@/three/scenes/AtelierObjects'
import '@/styles/atelierSections.css'

const RibbonCanvas=lazy(()=>import('@/three/scenes/AtelierObjects').then(m=>({default:m.RibbonCanvas})))
const BlueprintCanvas=lazy(()=>import('@/three/scenes/AtelierObjects').then(m=>({default:m.BlueprintCanvas})))
const CollectionOrbitCanvas=lazy(()=>import('@/three/scenes/CollectionOrbit').then(m=>({default:m.CollectionOrbitCanvas})))
const SignatureCanvas=lazy(()=>import('@/three/scenes/LiquidDrops').then(m=>({default:m.SignatureCanvas})))
gsap.registerPlugin(ScrollTrigger)

class ArtBoundary extends Component<{children:ReactNode; fallback:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}

const gallery = [
  {file:'material', title:'A study in contrast', detail:'Emerald texture. Reflective metal. A meeting of opposites.', x:24,y:8,w:17,h:24},
  {file:'sculpture', title:'Objects with a point of view', detail:'Sculptural furniture turns a room into a conversation.', x:68,y:1,w:21,h:26},
  {file:'vanity', title:'Unexpected reflections', detail:'Soft contours and expressive material choices.', x:6,y:35,w:18,h:25},
  {file:'chandelier', title:'A different kind of classic', detail:'Traditional proportions, seen through a new lens.', x:30,y:39,w:12,h:18},
  {file:'salon', title:'Room for the extraordinary', detail:'A striped pendant, a blue sofa, a little theatre. The composition at the heart of this visual collection.', x:42,y:26,w:28,h:40},
  {file:'cobalt', title:'Blue, beyond an accent', detail:'Colour gives the space a rhythm of its own.', x:77,y:44,w:19,h:26},
  {file:'arch', title:'Quiet geometry', detail:'An arch, a curve, a moment of stillness.', x:24,y:65,w:24,h:32},
  {file:'alcove', title:'Depth in the details', detail:'Repeated textures find their focus in one warm opening.', x:63,y:65,w:12,h:18},
  {file:'stair', title:'A line through space', detail:'Architecture as movement. Red as punctuation.', x:50,y:84,w:15,h:21},
]
const stages=[
  {title:'A conversation.', label:'Discover', body:'We begin with the way you live. Your rituals, your objects, the things a space should make possible.'},
  {title:'A point of view.', label:'Imagine', body:'Ideas find a language in sketches, materials and proportion. A clear vision takes shape.'},
  {title:'Made with intent.', label:'Craft', body:'Design meets the hands that make it. Every junction, surface and finish becomes part of the story.'},
  {title:'Room to belong.', label:'Live', body:'The vision becomes a place. Personal, considered, and ready for the everyday moments that make it yours.'},
]

function useNear() {
  const ref=useRef<HTMLDivElement>(null), [near,setNear]=useState(false)
  useEffect(()=>{const el=ref.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>setNear(entry.isIntersecting),{rootMargin:'350px'});observer.observe(el);return()=>observer.disconnect()},[])
  return {ref,near}
}

function SectionLabel({number,children}:{number:string;children:ReactNode}) {return <div className="editorial-label"><span>{number}</span><span>{children}</span><span className="editorial-label-line" /></div>}

const chapters=[['collection','Collection'],['process','Process'],['philosophy','Philosophy'],['focus','Focus'],['stories','Stories']]
function ChapterRail({reduced}:{reduced:boolean}) {
  const [chapter,setChapter]=useState(-1)
  useEffect(()=>{
    const update=()=>{
      let current=-1
      chapters.forEach(([id],i)=>{const box=document.getElementById(id)?.getBoundingClientRect();if(box&&box.top<innerHeight*.55&&box.bottom>innerHeight*.25)current=i})
      setChapter(current)
    }
    const st=ScrollTrigger.create({start:0,end:'max',onUpdate:update,onRefresh:update});update()
    return()=>st.kill()
  },[])
  return <nav className={`chapter-rail${chapter>=0?' is-visible':''}`} aria-label="Homepage chapters" inert={chapter<0}>
    {chapters.map(([id,label],i)=><button key={id} aria-label={label} aria-current={chapter===i?'location':undefined} onClick={()=>{const el=document.getElementById(id);if(el)scrollPageTo(el.getBoundingClientRect().top+scrollY,reduced)}}><span>{label}</span><i/></button>)}
  </nav>
}

const orbitCards:OrbitCard[]=[...gallery,...[4,0,7,2,8,6].map(i=>gallery[i])].map(card=>({file:card.file,title:card.title,aspect:card.w*1.15/card.h,size:1.38}))

function StaticCollection({open}:{open:(i:number)=>void}) {
  return <>{gallery.map((card,i)=><button key={card.file} className={`collection-tile collection-tile-${i}`} style={{left:`${card.x}%`,top:`${card.y}%`,width:`${card.w}%`,height:`${card.h}%`}} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--pointer-x',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--pointer-y',`${e.clientY-r.top}px`)}} onClick={()=>open(i)} aria-label={`Explore ${card.title}`}>
    <div className="collection-image"><img src={`/images/redesign/gallery-${card.file}.jpg`} alt={card.title} loading="lazy" /><span className="collection-tint" /></div>
    <span className="collection-caption"><span>{card.title}</span><Plus size={17}/></span>
    <span className="collection-loupe" aria-hidden="true"><ArrowUpRight size={22}/></span>
  </button>)}</>
}

function Gallery({reduced}:{reduced:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null), [selected,setSelected]=useState(4)
  const {ref,near}=useNear(), intro=useRef(0), [active,setActive]=useState(0), [pointing,setPointing]=useState(false), [dragging,setDragging]=useState(false)
  const control=useRef<OrbitControl>({dragging:false,moved:0,pending:[0,0],velocity:[.12,0],nudge:0})
  const azimuth=useRef<HTMLElement>(null), elevation=useRef<HTMLElement>(null), dial=useRef<HTMLDivElement>(null), meter=useRef<HTMLElement>(null)
  const telemetry=(az:number,el:number,speed:number)=>{
    const wrap=(az%360+360)%360, tiltDeg=((el+180)%360+360)%360-180
    if(azimuth.current)azimuth.current.textContent=`${String(Math.round(wrap)%360).padStart(3,'0')}°`
    if(elevation.current)elevation.current.textContent=`${tiltDeg<0?'−':'+'}${String(Math.abs(Math.round(tiltDeg))).padStart(2,'0')}°`
    dial.current?.style.setProperty('--orbit-az',`${-wrap}deg`)
    meter.current?.style.setProperty('--orbit-speed',speed.toFixed(3))
  }
  const open=(i:number)=>{setSelected(i);dialog.current?.showModal()}
  const item=gallery[selected], front=gallery.findIndex(card=>card.file===orbitCards[active]?.file)
  useLayoutEffect(()=>{if(!ref.current)return;const st=ScrollTrigger.create({trigger:ref.current,start:'top 90%',end:'top 25%',scrub:true,onUpdate:self=>{intro.current=self.progress},onRefresh:self=>{intro.current=self.progress}});return()=>st.kill()},[ref])
  const startDrag=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(e.button!==0)return
    const c=control.current, width=e.currentTarget.clientWidth
    let x=e.clientX, y=e.clientY
    c.dragging=true;c.moved=0;setDragging(true)
    const move=(ev:PointerEvent)=>{const dx=ev.clientX-x,dy=ev.clientY-y;x=ev.clientX;y=ev.clientY;c.moved+=Math.abs(dx)+Math.abs(dy);c.pending=[c.pending[0]+dx/width*Math.PI*1.3,c.pending[1]+dy/width*Math.PI*1.3]}
    const end=()=>{c.dragging=false;setDragging(false);removeEventListener('pointermove',move);removeEventListener('pointerup',end);removeEventListener('pointercancel',end)}
    addEventListener('pointermove',move);addEventListener('pointerup',end);addEventListener('pointercancel',end)
  }
  const keys=(e:ReactKeyboardEvent)=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();control.current.nudge+=(e.key==='ArrowLeft'?-1:1)*.35}
    else if((e.key==='Enter'||e.key===' ')&&front>=0){e.preventDefault();open(front)}
  }
  return <section id="collection" className="atelier-collection editorial-section">
    <SectionLabel number="01">A collection of perspectives</SectionLabel>
    <div className="collection-composition">
      <h2 className="collection-left editorial-reveal">bold<br/>when<br/><em>needed.</em></h2>
      <ArtBoundary fallback={<StaticCollection open={open}/>}>
        <div ref={ref} className={`collection-orbit-stage${pointing?' is-pointing':''}${dragging?' is-dragging':''}`} onPointerDown={startDrag} onKeyDown={keys} tabIndex={0} role="group" aria-roledescription="carousel" aria-label="Visual collection. Drag or use the arrow keys to turn, Enter to open the image in front.">
          <Suspense fallback={null}><CollectionOrbitCanvas running={near} cards={orbitCards} control={control} intro={intro} reduced={reduced} onSelect={i=>open(gallery.findIndex(card=>card.file===orbitCards[i].file))} onActive={setActive} onHover={setPointing} onTelemetry={telemetry}/></Suspense>
        </div>
        <div className="collection-orbit-caption" aria-live="polite"><span>{String(front+1).padStart(2,'0')} <i>/</i> 09</span><strong>{gallery[front]?.title}</strong><em><Rotate3d size={13}/>Drag to turn the collection</em></div>
        <div className="orbit-hud" aria-hidden="true">
          <span className="orbit-hud-title">THEOS / ORBIT STUDY</span>
          <dl><div><dt>AZ</dt><dd ref={azimuth}>000°</dd></div><div><dt>EL</dt><dd ref={elevation}>+10°</dd></div><div><dt>FRAMES</dt><dd>15</dd></div></dl>
          <span className="orbit-hud-meter"><i ref={meter}/></span>
        </div>
        <div ref={dial} className="orbit-dial" aria-hidden="true">
          <svg viewBox="0 0 160 160" fill="none"><g className="orbit-dial-face">{Array.from({length:72},(_,i)=><line key={i} x1="80" y1={i%6?9:4} x2="80" y2={i%18?14:20} transform={`rotate(${i*5} 80 80)`}/>)}<text x="80" y="36">N</text><text x="80" y="132">S</text><text x="128" y="84">E</text><text x="32" y="84">W</text></g><circle cx="80" cy="80" r="58" strokeDasharray="1 5"/><path d="M80 80V30" className="orbit-dial-needle"/><circle cx="80" cy="80" r="3" className="orbit-dial-core"/></svg>
          <span>Material<br/>Colour<br/>Form</span>
        </div>
        <span className="orbit-mark orbit-mark-tl"/><span className="orbit-mark orbit-mark-tr"/><span className="orbit-mark orbit-mark-bl"/><span className="orbit-mark orbit-mark-br"/>
      </ArtBoundary>
      <p className="collection-right editorial-reveal">where<br/>space<br/>becomes<br/><em>narrative.</em></p>
      <svg className="collection-orbit" viewBox="0 0 1000 900" fill="none" aria-hidden="true"><path className="draw-line" d="M95 120C560 -140 1090 430 810 755S60 880 95 360"/><circle cx="95" cy="120" r="5" /></svg>
    </div>
    <div className="collection-foot"><span>Material / Colour / Form</span><p>Nine perspectives.<br/>Infinite ways to feel at home.</p><span>Explore a detail <ArrowUpRight size={15}/></span></div>
    <dialog ref={dialog} className="collection-dialog" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close()}}>
      <button className="dialog-close" onClick={()=>dialog.current?.close()} aria-label="Close image"><X/></button>
      <img src={`/images/redesign/gallery-${item.file}.jpg`} alt={item.title}/>
      <div><span className="editorial-kicker">Visual collection / {String(selected+1).padStart(2,'0')}</span><h3>{item.title}</h3><p>{item.detail}</p><div className="dialog-controls"><button aria-label="Previous image" onClick={()=>setSelected((selected+8)%9)}><ArrowLeft/></button><button aria-label="Next image" onClick={()=>setSelected((selected+1)%9)}><ArrowRight/></button></div></div>
    </dialog>
  </section>
}

const finishOptions:[Finish,string][]=[['lacquer','Red lacquer'],['metal','Brushed metal'],['clay','Warm clay'],['brass','Aged brass'],['velvet','Cobalt velvet']]

function Timeline({reduced}:{reduced:boolean}) {
  const {ref,near}=useNear(), section=useRef<HTMLElement>(null), progress=useRef(0)
  const [hovered,setHovered]=useState<number|null>(null),[current,setCurrent]=useState(0)
  const [finish,setFinish]=useState<Finish>('lacquer'),[entered,setEntered]=useState(false)
  // The spiral's entrance plays once, when a third of the sculpture is first on screen; it never plays in reverse.
  useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setEntered(true);io.disconnect()}},{threshold:.32});io.observe(el);return()=>io.disconnect()},[ref])
  useLayoutEffect(()=>{if(!section.current)return;const st=ScrollTrigger.create({trigger:section.current,start:'top 65%',end:'bottom 35%',onUpdate:self=>{progress.current=self.progress;setCurrent(Math.min(3,Math.floor(self.progress*4)))}});return()=>st.kill()},[])
  const active=hovered??current
  return <section ref={section} id="process" className="atelier-process editorial-section">
    <SectionLabel number="02">The thread that connects it all</SectionLabel>
    <div className="process-heading editorial-reveal"><h2>From a thought.<br/><em>To a place.</em></h2><p>A continuous conversation<br/>between imagination and making.</p></div>
    <div className="process-stage">
      <div ref={ref} className="process-sculpture" aria-hidden="true"><ArtBoundary fallback={<img src="/images/redesign/spiral-reference.jpg" alt=""/>}><Suspense fallback={<img src="/images/redesign/spiral-reference.jpg" alt=""/>}>{<RibbonCanvas running={near} progress={progress} active={active} reduced={reduced} finish={finish} entered={entered}/>}</Suspense></ArtBoundary></div>
      {stages.map((stage,i)=><button key={stage.label} className={`process-step process-step-${i}${active===i?' is-active':''}`} onPointerEnter={()=>setHovered(i)} onPointerLeave={()=>setHovered(null)} onFocus={()=>setHovered(i)} onBlur={()=>setHovered(null)} onClick={()=>setHovered(i)} aria-pressed={active===i}>
        <span className="process-index">0{i+1}<span>{stage.label}</span></span><h3>{stage.title}</h3><p>{stage.body}</p><span className="process-rule"/>
      </button>)}
      <div className="process-axis" aria-hidden="true"><span>IDEA</span><i/><span>EXPERIENCE</span></div>
    </div>
    <div className="material-controls"><span>One form. Different feelings.</span><div>{finishOptions.map(([id,label])=><button key={id} onClick={()=>setFinish(id)} aria-pressed={finish===id}><i className={`material-swatch material-${id}`}/>{label}</button>)}</div></div>
    <p className="process-note">Different disciplines. One considered journey.</p>
  </section>
}

function Architecture({reduced}:{reduced:boolean}) {
  const {ref,near}=useNear(), progress=useRef(0), sequence=useRef<HTMLDivElement>(null), cursor=useRef<HTMLDivElement>(null)
  const lens=useRef<BlueprintLens>({x:.5,y:.5,inside:false,built:false,originX:.5,originY:.5})
  const [built,setBuilt]=useState(false),[open,setOpen]=useState(reduced),[hovering,setHovering]=useState(false)
  useLayoutEffect(()=>{
    const element=sequence.current;if(!element)return
    if(reduced){progress.current=.3;element.style.setProperty('--open','1');setOpen(true);return}
    // The stage opens from an inset frame to full bleed over the first part of the scroll.
    const update=(p:number)=>{progress.current=p;element.style.setProperty('--open',gsap.utils.clamp(0,1,p/.3).toFixed(3));setOpen(p>.28)}
    const st=ScrollTrigger.create({id:'architecture-sequence',trigger:element,start:'top bottom',end:'bottom bottom',onUpdate:self=>update(self.progress),onRefresh:self=>update(self.progress)})
    update(st.progress)
    return()=>st.kill()
  },[reduced])
  const point=(e:ReactPointerEvent<HTMLDivElement>)=>{
    const box=e.currentTarget.getBoundingClientRect(), x=(e.clientX-box.left)/box.width, y=(e.clientY-box.top)/box.height
    Object.assign(lens.current,{x,y:1-y,inside:true})
    cursor.current?.style.setProperty('--lx',`${x*100}%`);cursor.current?.style.setProperty('--ly',`${y*100}%`)
  }
  // The build floods out from (or retreats into) the point that was double-clicked.
  const build=(next:boolean,origin:[number,number]=[.5,.5])=>{const l=lens.current;l.originX=origin[0];l.originY=origin[1];l.built=next;setBuilt(next)}
  return <section id="philosophy" className="atelier-architecture editorial-section">
    <SectionLabel number="03">From the first line to the last detail</SectionLabel>
    <div className="architecture-heading editorial-reveal"><h2>Ordinary spaces.<br/><em>Extraordinary living.</em></h2><p>We see a space for what it can become.<br/>A place to gather. A place to pause.<br/>A place that feels entirely your own.</p></div>
    <div ref={sequence} className="architecture-sequence" data-built={built} data-open={open}>
    <div className="architecture-pin">
    <div ref={ref} className="architecture-drawing" role="img" aria-label="Architectural study of a living room. Hover to see it built, double-click to reveal the finished interior." onPointerEnter={e=>{point(e);setHovering(true)}} onPointerMove={point} onPointerLeave={()=>{lens.current.inside=false;setHovering(false)}} onDoubleClick={()=>build(!built,[lens.current.x,lens.current.y])}>
      <ArtBoundary fallback={<img className="architecture-base" src="/images/redesign/architecture-plan.jpg" alt=""/>}><Suspense fallback={<img className="architecture-base" src="/images/redesign/architecture-plan.jpg" alt=""/>}><div className="architecture-canvas"><BlueprintCanvas running={near} progress={progress} lens={lens} reduced={reduced}/></div></Suspense></ArtBoundary>
      <div ref={cursor} className={`blueprint-cursor${hovering?' is-visible':''}`} aria-hidden="true"><span>{built?'The first line':'As built'}</span><small>{built?'Double-click to return':'Double-click to build it all'}</small></div>
    </div>
    <div className="construction-bar"><span>THE ANATOMY OF A SPACE</span><div>{(['Blueprint','As built'] as const).map((label,i)=><button key={label} onClick={()=>build(i===1)} aria-pressed={built===(i===1)}>0{i+1} / {label}</button>)}</div><span>HOVER TO BUILD · DOUBLE-CLICK FOR ALL</span></div>
    <span className="drawing-coordinate">THEOS / STUDY 001<br/>PLAN · SECTION · AS BUILT</span>
    <div className="drawing-status"><span>{built?'Imagination, fully built.':open?'Proportion becomes presence.':'Everything begins with a line.'}</span><i><b/></i></div>
    </div>
    </div>
    <div className="architecture-foot"><span>Drawn with imagination.<br/>Resolved with intention.</span><p>Design and making belong together. From the architecture of a room to the furniture within it, we consider the whole experience — and the details that make it personal.</p></div>
  </section>
}

function FocusIcon({index}:{index:number}) {
  return <svg className={`focus-icon focus-icon-${index}`} viewBox="0 0 220 150" fill="none" aria-hidden="true">{Array.from({length:11},(_,i)=>index===0?<ellipse key={i} cx={65+i*9} cy="75" rx={54-i*4.3} ry={65-i*5.5}/>:index===1?<rect key={i} x={30+i*4.9} y={17+i*4.9} width={160-i*9.8} height={116-i*9.8} rx={58-i*4.8}/>:<rect key={i} x={43+i*5.2} y={8+i*5.2} width={134-i*10.4} height={134-i*10.4}/>)}</svg>
}

function FocusPoints() {
  const points=[['Design','with Purpose','We imagine spaces that inspire better living, blending function, art and emotion.'],['Spaces','that Belong','Every space is a reflection of people, place and possibility — crafted to feel timeless.'],['Crafted','by People','A passionate team that brings together design, detail and dedication to create spaces with soul.']]
  return <section id="focus" className="atelier-focus editorial-section"><SectionLabel number="04">What stays with us</SectionLabel><div className="focus-grid">{points.map((point,i)=><article key={point[0]} className="focus-point" tabIndex={0}><FocusIcon index={i}/><h2>{point[0]}<br/><em>{point[1]}</em></h2><p>{point[2]}</p><span className="focus-number">(0{i+1})</span></article>)}</div><p className="focus-statement editorial-reveal">Not just a space to look at.<br/><em>A place to feel.</em></p></section>
}

const stories=[{image:'gallery-salon.jpg',title:'A little theatre.',text:'Colour, character and a room with something to say.',category:'Expression / Visual study'}, {image:'gallery-cobalt.jpg',title:'A different rhythm.',text:'Sculptural forms in conversation with light and space.',category:'Form / Visual study'}, {image:'pool.jpg',title:'Room to exhale.',text:'Open skies. Still water. A slower way to inhabit a space.',category:'Atmosphere / Visual study'}]

function Stories({reduced}:{reduced:boolean}) {
  const section=useRef<HTMLElement>(null), [active,setActive]=useState(0),[expanded,setExpanded]=useState(false)
  const story=stories[active]
  useLayoutEffect(()=>{if(!section.current)return;const ctx=gsap.context(()=>{gsap.fromTo('.story-image',{scale:1.12,opacity:0},{scale:1,opacity:1,duration:reduced?0:1.2,ease:'power2.out'});gsap.fromTo('.story-description',{y:20,opacity:0},{y:0,opacity:1,duration:reduced?0:.65})},section);return()=>ctx.revert()},[active,reduced])
  return <section ref={section} id="stories" className={`atelier-stories editorial-section${expanded?' is-expanded':''}`}><SectionLabel number="05">Spaces with stories</SectionLabel><div className="stories-stage">
    <div className="story-description"><span className="editorial-kicker">{story.category}</span><h2>{story.title}</h2><p>{story.text}</p><button className="story-expand" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Close the view':'Step inside'}<ArrowUpRight size={20}/></button></div>
    <button className="story-aperture" onClick={()=>setExpanded(!expanded)} aria-label={expanded?'Close expanded study':'Expand visual study'}><div className="story-image" key={story.image} style={{backgroundImage:`url(/images/redesign/${story.image})`}}/><span className="story-ring"/><span className="story-aperture-label">THEOS <span>°</span></span></button>
    <span className="story-side-note">A perspective worth sharing.</span>
    <div className="story-navigation"><div><button aria-label="Previous story" onClick={()=>setActive((active+2)%3)}><ArrowLeft size={18}/></button><span>0{active+1} <i>/</i> 03</span><button aria-label="Next story" onClick={()=>setActive((active+1)%3)}><ArrowRight size={18}/></button></div><span>Interiors. Objects. Atmospheres.</span></div>
    </div></section>
}

export function AtelierSections({reduced}:{reduced:boolean}) {
  const root=useRef<HTMLDivElement>(null)
  useLayoutEffect(()=>{if(!root.current)return; const ctx=gsap.context(()=>{
    if(reduced)return
    gsap.utils.toArray<HTMLElement>('.editorial-reveal, .editorial-label, .architecture-foot').forEach(el=>gsap.from(el,{y:45,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',toggleActions:'play none none reverse'}}))
    gsap.utils.toArray<HTMLElement>('.collection-tile').forEach((el,i)=>{
      gsap.from(el,{y:70+(i%3)*22,opacity:0,rotate:(i%2?1:-1)*3,duration:1.1,delay:(i%3)*.07,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 100%'}})
      gsap.to(el.querySelector('.collection-image'),{yPercent:i%2?4:-4,ease:'none',scrollTrigger:{trigger:'.collection-composition',start:'top bottom',end:'bottom top',scrub:true}})
    })
    gsap.utils.toArray<SVGPathElement>('.draw-line').forEach(path=>{const length=path.getTotalLength();gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:path.closest('section'),start:'top 80%',end:'bottom 65%',scrub:true}})})
    gsap.utils.toArray<HTMLElement>('.focus-point').forEach((el,i)=>{gsap.from(el,{y:65,opacity:0,duration:1,delay:i*.12,scrollTrigger:{trigger:'.focus-grid',start:'top 80%'}});gsap.from(el.querySelectorAll('svg > *'),{opacity:0,scale:.75,transformOrigin:'50% 50%',stagger:.045,duration:1.2,clearProps:'transform,opacity',ease:'power2.out',scrollTrigger:{trigger:el,start:'top 80%'}})})
    gsap.from('.story-aperture',{y:90,scale:.9,duration:1.4,ease:'power3.out',scrollTrigger:{trigger:'.stories-stage',start:'top 85%'}})
  },root);let alive=true;document.fonts.ready.then(()=>{if(alive)ScrollTrigger.refresh()});return()=>{alive=false;ctx.revert()}},[reduced])
  return <div ref={root} className="atelier-editorial" style={{'--motion':reduced?'0s':'1s'} as CSSProperties}><ChapterRail reduced={reduced}/><Gallery reduced={reduced}/><Timeline reduced={reduced}/><Architecture reduced={reduced}/><FocusPoints/><Stories reduced={reduced}/></div>
}

// Cream → navy: the navy rises over the stories section as the footer scrolls in, its top a clean curved wave (a soft dip that
// drifts as it rises). At rest the footer meets the cream along that same curve. Crisp edge, no fade; drawn only while on screen.
const riseFragment=`precision highp float;
uniform vec2 uRes;uniform float uLevel;
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;float px=1.2/uRes.y;
 float centre=.6-uLevel*.18;
 float dip=1.-exp(-pow((uv.x-centre)/.34,2.));
 float swell=.5+.5*cos((uv.x+uLevel*.4)*6.2832*.9);
 float edge=uLevel*1.18+(.035+.03*(1.-uLevel))*dip+.012*swell;
 float navy=1.-smoothstep(edge-px,edge+px,uv.y);
 gl_FragColor=vec4(vec3(.078,.161,.259)*navy,navy);
}`
function OutroRise({level,reduced}:{level:MutableRefObject<number>;reduced:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const el=canvas.current,gl=el?.getContext('webgl',{premultipliedAlpha:true,antialias:false})
    if(!el||!gl)return
    const compile=(type:number,src:string)=>{const sh=gl.createShader(type)!;gl.shaderSource(sh,src);gl.compileShader(sh);return sh}
    const program=gl.createProgram()!
    gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,riseFragment));gl.linkProgram(program);gl.useProgram(program)
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
    const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0)
    const u=(n:string)=>gl.getUniformLocation(program,n)
    let frame=0,shown=-1,eased=level.current
    // The story navigation floats above the navy; each part turns white once the edge has risen past it.
    const riders=[...document.querySelectorAll<HTMLElement>('.story-navigation > *')]
    const edgeAt=(x:number,lv:number)=>{const dip=1-Math.exp(-(((x-(.6-lv*.18))/.34)**2)),swell=.5+.5*Math.cos((x+lv*.4)*Math.PI*2*.9);return lv*1.18+(.035+.03*(1-lv))*dip+.012*swell}
    const draw=()=>{
      frame=requestAnimationFrame(draw)
      const box=el.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)return
      eased+=((reduced?(level.current>.5?1:0):level.current)-eased)*.18
      riders.forEach(r=>{const b=r.getBoundingClientRect(),x=(b.left+b.width/2-box.left)/box.width,edgeY=box.bottom-edgeAt(x,eased)*box.height;r.toggleAttribute('data-on-navy',b.top+b.height/2>edgeY)})
      const w=Math.round(el.clientWidth*Math.min(devicePixelRatio,1.5)),h=Math.round(el.clientHeight*Math.min(devicePixelRatio,1.5))
      if(Math.abs(eased-shown)<.0002&&el.width===w&&el.height===h)return
      shown=eased
      if(el.width!==w||el.height!==h){el.width=w;el.height=h}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u('uRes'),w,h);gl.uniform1f(u('uLevel'),eased)
      gl.drawArrays(gl.TRIANGLES,0,3)
    }
    frame=requestAnimationFrame(draw)
    return()=>{cancelAnimationFrame(frame);gl.deleteProgram(program);gl.deleteBuffer(buffer)}
  },[level,reduced])
  return <div className="outro-rise" aria-hidden="true"><canvas ref={canvas}/></div>
}

export function AtelierOutro({reduced,onBeginning}:{reduced:boolean;onBeginning:()=>void}) {
  const {ref,near}=useNear(),root=useRef<HTMLElement>(null),roomProgress=useRef(reduced?1:0),riseLevel=useRef(0)
  // The navy rises from the footer's top edge, covering the view by the time that edge is a quarter of the way down.
  useLayoutEffect(()=>{if(!root.current)return;const st=ScrollTrigger.create({trigger:root.current,start:'top bottom',end:'top 25%',onUpdate:self=>{riseLevel.current=self.progress},onRefresh:self=>{riseLevel.current=self.progress}});return()=>st.kill()},[])
  // The closing room assembles as the footer scrolls into view.
  useLayoutEffect(()=>{if(!root.current)return;const st=ScrollTrigger.create({trigger:root.current,start:'top 85%',end:'bottom bottom',onUpdate:self=>{roomProgress.current=self.progress},onRefresh:self=>{roomProgress.current=self.progress}});return()=>st.kill()},[])
  useLayoutEffect(()=>{if(reduced||!root.current)return;const ctx=gsap.context(()=>{
    gsap.from('.outro-title > span',{yPercent:70,opacity:0,stagger:.14,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:root.current,start:'top 70%'}})
    gsap.from('.outro-wordmark',{yPercent:35,opacity:.15,ease:'none',scrollTrigger:{trigger:root.current,start:'top bottom',end:'bottom bottom',scrub:true}})
  },root);return()=>ctx.revert()},[reduced])
  return <><OutroRise level={riseLevel} reduced={reduced}/><footer ref={root} id="atelier-contact" className="atelier-outro">
    <div className="outro-top"><span>THEOS / BEYOND THE ORDINARY</span><span>A new perspective starts here.</span></div>
    <div className="outro-main"><div className="outro-copy"><h2 className="outro-title"><span>Make room</span><span>for <em>what’s next.</em></span></h2><a href="mailto:care@theos.co.in" className="outro-contact">Start a conversation <ArrowUpRight size={24}/></a><p>Interiors. Furniture. Imagination.</p></div>
      <div ref={ref} className="outro-sculpture" role="group" aria-label="Liquid drops of material"><ArtBoundary fallback={<span className="outro-fallback">o</span>}><Suspense fallback={<span className="outro-fallback">o</span>}>{<SignatureCanvas running={near} reduced={reduced} progress={roomProgress}/>}</Suspense></ArtBoundary></div>
    </div>
    <div className="outro-bottom"><a href="mailto:care@theos.co.in">care@theos.co.in</a><span>Designed with purpose. Made personal.</span><button onClick={onBeginning}>Back to the beginning <ArrowUpRight size={15}/></button></div>
    <div className="outro-wordmark" aria-hidden="true">theos<span>.</span></div>
  </footer></>
}
