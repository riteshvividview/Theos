import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { ArrowUpRight, ArrowLeft, ArrowRight, X, Plus } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollPageTo } from '@/hooks/useSmoothScroll'
import '@/styles/atelierSections.css'

const RibbonCanvas=lazy(()=>import('@/three/scenes/AtelierObjects').then(m=>({default:m.RibbonCanvas})))
const DrawingCanvas=lazy(()=>import('@/three/scenes/AtelierObjects').then(m=>({default:m.DrawingCanvas})))
const SignatureCanvas=lazy(()=>import('@/three/scenes/AtelierObjects').then(m=>({default:m.SignatureCanvas})))
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

function Gallery() {
  const dialog=useRef<HTMLDialogElement>(null), [selected,setSelected]=useState(4)
  const open=(i:number)=>{setSelected(i);dialog.current?.showModal()}
  const item=gallery[selected]
  return <section id="collection" className="atelier-collection editorial-section">
    <SectionLabel number="01">A collection of perspectives</SectionLabel>
    <div className="collection-composition">
      <h2 className="collection-left editorial-reveal">bold<br/>when<br/><em>needed.</em></h2>
      {gallery.map((card,i)=><button key={card.file} className={`collection-tile collection-tile-${i}`} style={{left:`${card.x}%`,top:`${card.y}%`,width:`${card.w}%`,height:`${card.h}%`}} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--pointer-x',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--pointer-y',`${e.clientY-r.top}px`)}} onClick={()=>open(i)} aria-label={`Explore ${card.title}`}>
        <div className="collection-image"><img src={`/images/redesign/gallery-${card.file}.jpg`} alt={card.title} loading="lazy" /><span className="collection-tint" /></div>
        <span className="collection-caption"><span>{card.title}</span><Plus size={17}/></span>
        <span className="collection-loupe" aria-hidden="true"><ArrowUpRight size={22}/></span>
      </button>)}
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

function Timeline({reduced}:{reduced:boolean}) {
  const {ref,near}=useNear(), section=useRef<HTMLElement>(null), progress=useRef(0)
  const [hovered,setHovered]=useState<number|null>(null),[current,setCurrent]=useState(0)
  const [finish,setFinish]=useState('lacquer')
  useLayoutEffect(()=>{if(!section.current)return;const st=ScrollTrigger.create({trigger:section.current,start:'top 65%',end:'bottom 35%',onUpdate:self=>{progress.current=self.progress;setCurrent(Math.min(3,Math.floor(self.progress*4)))}});return()=>st.kill()},[])
  const active=hovered??current
  return <section ref={section} id="process" className="atelier-process editorial-section">
    <SectionLabel number="02">The thread that connects it all</SectionLabel>
    <div className="process-heading editorial-reveal"><h2>From a thought.<br/><em>To a place.</em></h2><p>A continuous conversation<br/>between imagination and making.</p></div>
    <div className="process-stage">
      <div ref={ref} className="process-sculpture" aria-hidden="true"><ArtBoundary fallback={<img src="/images/redesign/spiral-reference.jpg" alt=""/>}><Suspense fallback={<img src="/images/redesign/spiral-reference.jpg" alt=""/>}>{near&&<RibbonCanvas progress={progress} active={active} reduced={reduced} finish={finish}/>}</Suspense></ArtBoundary></div>
      {stages.map((stage,i)=><button key={stage.label} className={`process-step process-step-${i}${active===i?' is-active':''}`} onPointerEnter={()=>setHovered(i)} onPointerLeave={()=>setHovered(null)} onFocus={()=>setHovered(i)} onBlur={()=>setHovered(null)} onClick={()=>setHovered(i)} aria-pressed={active===i}>
        <span className="process-index">0{i+1}<span>{stage.label}</span></span><h3>{stage.title}</h3><p>{stage.body}</p><span className="process-rule"/>
      </button>)}
      <div className="process-axis" aria-hidden="true"><span>IDEA</span><i/><span>EXPERIENCE</span></div>
    </div>
    <div className="material-controls"><span>One form. Different feelings.</span><div>{[['lacquer','Red lacquer'],['metal','Brushed metal'],['clay','Warm clay']].map(([id,label])=><button key={id} onClick={()=>setFinish(id)} aria-pressed={finish===id}><i className={`material-swatch material-${id}`}/>{label}</button>)}</div></div>
    <p className="process-note">Different disciplines. One considered journey.</p>
  </section>
}

function Architecture({reduced}:{reduced:boolean}) {
  const {ref,near}=useNear(), reveal=useRef(0),sequence=useRef<HTMLDivElement>(null),trigger=useRef<ScrollTrigger|null>(null)
  const [phase,setPhase]=useState(0)
  useLayoutEffect(()=>{
    const element=sequence.current;if(!element||reduced)return
    const update=(p:number)=>{
      const value=gsap.utils.clamp(0,1,(p-.18)/.64)
      reveal.current=value
      setPhase(value<.08?0:value<.57?1:2)
      element.style.setProperty('--construction',String(value))
      element.style.setProperty('--scan',`${(value<=.5?value*2:(value-.5)*2)*100}%`)
      element.dataset.progress=value.toFixed(3)
    }
    const st=ScrollTrigger.create({id:'architecture-sequence',trigger:element,start:'top 8%',end:'bottom 92%',onUpdate:self=>update(self.progress),onRefresh:self=>update(self.progress)})
    trigger.current=st;update(st.progress)
    return()=>{st.kill();trigger.current=null}
  },[reduced])
  const goToPhase=(index:number)=>{
    if(reduced){reveal.current=index*.5;setPhase(index);sequence.current?.style.setProperty('--construction',String(index*.5));return}
    const st=trigger.current;if(st)scrollPageTo(st.start+(st.end-st.start)*[.12,.5,.9][index],false,1.8)
  }
  return <section id="philosophy" className="atelier-architecture editorial-section">
    <SectionLabel number="03">From the first line to the last detail</SectionLabel>
    <div className="architecture-heading editorial-reveal"><h2>Ordinary spaces.<br/><em>Extraordinary living.</em></h2><p>We see a space for what it can become.<br/>A place to gather. A place to pause.<br/>A place that feels entirely your own.</p></div>
    <div ref={sequence} className="architecture-sequence" data-phase={phase}>
    <div className="architecture-pin">
    <div className="construction-bar"><span>THE ANATOMY OF A SPACE</span><div>{['01 / The drawing','02 / The form','03 / The vision'].map((label,i)=><button key={label} onClick={()=>goToPhase(i)} aria-current={phase===i?'step':undefined}>{label}</button>)}</div><span>SCROLL TO RESOLVE ↓</span></div>
    <div ref={ref} className="architecture-drawing">
      <img className="architecture-base" src="/images/redesign/architecture.jpg" alt="White architectural interior and blue furniture among construction lines"/>
      <ArtBoundary fallback={null}><Suspense fallback={null}>{near&&<div className="architecture-canvas"><DrawingCanvas reveal={reveal} reduced={reduced}/></div>}</Suspense></ArtBoundary>
      <svg className="architecture-guides" viewBox="0 0 1672 1077" fill="none" aria-hidden="true"><path className="draw-line" d="M80 0V1050M1592 0V1050M10 960H1660M835 100V1020M240 960L835 230L1440 960M510 960V270H1150V960"/><circle cx="835" cy="540" r="155"/><path d="M60 1020H100M80 1000V1040M1572 1020H1612M1592 1000V1040" className="guide-accent"/></svg>
      <span className="drawing-coordinate">THEOS / STUDY 001<br/>FORM · PROPORTION · LIGHT</span>
      <div className="architecture-sweep" aria-hidden="true"><span>{phase<2?'TRACING FORM':'RESOLVING COLOUR'}</span></div>
      <div className="drawing-status"><span>{['Everything begins with a line.','Proportion becomes presence.','Imagination finds its colour.'][phase]}</span><i><b/></i></div>
    </div>
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
  return <div ref={root} className="atelier-editorial" style={{'--motion':reduced?'0s':'1s'} as CSSProperties}><ChapterRail reduced={reduced}/><Gallery/><Timeline reduced={reduced}/><Architecture reduced={reduced}/><FocusPoints/><Stories reduced={reduced}/></div>
}

export function AtelierOutro({reduced,onBeginning}:{reduced:boolean;onBeginning:()=>void}) {
  const {ref,near}=useNear(),root=useRef<HTMLElement>(null)
  useLayoutEffect(()=>{if(reduced||!root.current)return;const ctx=gsap.context(()=>{
    gsap.from('.outro-title > span',{yPercent:70,opacity:0,stagger:.14,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:root.current,start:'top 70%'}})
    gsap.from('.outro-wordmark',{yPercent:35,opacity:.15,ease:'none',scrollTrigger:{trigger:root.current,start:'top bottom',end:'bottom bottom',scrub:true}})
    gsap.to('.outro-radial',{rotation:35,transformOrigin:'50% 50%',ease:'none',scrollTrigger:{trigger:root.current,start:'top bottom',end:'bottom top',scrub:true}})
  },root);return()=>ctx.revert()},[reduced])
  return <footer ref={root} id="atelier-contact" className="atelier-outro">
    <div className="outro-top"><span>THEOS / BEYOND THE ORDINARY</span><span>A new perspective starts here.</span></div>
    <div className="outro-main"><div className="outro-copy"><h2 className="outro-title"><span>Make room</span><span>for <em>what’s next.</em></span></h2><a href="mailto:care@theos.co.in" className="outro-contact">Start a conversation <ArrowUpRight size={24}/></a><p>Interiors. Furniture. Imagination.</p></div>
      <div ref={ref} className="outro-sculpture" aria-hidden="true"><svg className="outro-radial" viewBox="0 0 600 600" fill="none">{Array.from({length:48},(_,i)=><path key={i} d="M300 35V48" transform={`rotate(${i*7.5} 300 300)`}/>)}<circle cx="300" cy="300" r="268" strokeDasharray="1 12"/></svg><ArtBoundary fallback={<span className="outro-fallback">o</span>}><Suspense fallback={<span className="outro-fallback">o</span>}>{near&&<SignatureCanvas reduced={reduced}/>}</Suspense></ArtBoundary></div>
    </div>
    <div className="outro-bottom"><a href="mailto:care@theos.co.in">care@theos.co.in</a><span>Designed with purpose. Made personal.</span><button onClick={onBeginning}>Back to the beginning <ArrowUpRight size={15}/></button></div>
    <div className="outro-wordmark" aria-hidden="true">theos<span>.</span></div>
  </footer>
}
