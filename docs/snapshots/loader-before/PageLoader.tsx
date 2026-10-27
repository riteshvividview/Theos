import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { readyScenes } from '@/loading/readiness'
import '@/styles/pageLoader.css'

const images = Object.keys(import.meta.glob('/public/images/redesign/*.{jpg,png}')).map(path => path.replace('/public', ''))
function loadImage(url: string) {
  return new Promise<void>(resolve => {
    const image = new Image()
    image.onload = () => { image.decode().catch(() => {}).finally(resolve) }
    image.onerror = () => resolve() // A failed image must not trap the visitor.
    image.src = url
  })
}

export function PageLoader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(1)
  const [slow, setSlow] = useState(false)
  const [finish, setFinish] = useState(false)
  useEffect(() => {
    let alive = true, completed = 0, displayed = 1
    const tasks = [...images, '/theos-logo.avif'].map(loadImage)
    tasks.push(document.fonts.load('400 16px "Bodoni Moda"').then(() => {}), document.fonts.load('italic 400 16px "Bodoni Moda"').then(() => {}), document.fonts.load('400 16px Manrope').then(() => {}))
    tasks.push(import('@/three/scenes/CinematicHero').then(() => {}), import('@/three/scenes/AtelierObjects').then(() => {}))
    tasks.forEach(task => task.catch(() => {}).finally(() => { completed++ }))
    const total = tasks.length + 4
    const timer = window.setInterval(() => {
      if (!alive) return
      const target = Math.floor((completed + readyScenes.size) / total * 100)
      displayed = Math.min(100, Math.max(displayed, Math.min(target, displayed + 2)))
      setProgress(displayed)
      if (displayed === 100) { clearInterval(timer); setFinish(true) }
    }, 30)
    const timeout = window.setTimeout(() => setSlow(true), 18000)
    return () => { alive = false; clearInterval(timer); clearTimeout(timeout) }
  }, [])
  useEffect(() => {
    if (!finish || !root.current) return
    const tween = gsap.to(root.current, {
      opacity: 0, yPercent: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : -3,
      delay: .3, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? .05 : .65,
      ease: 'power2.inOut', onComplete: () => { onComplete(); requestAnimationFrame(() => ScrollTrigger.refresh()) },
    })
    return () => { tween.kill() }
  }, [finish, onComplete])
  return <div ref={root} className="page-loader" role="status" aria-label="Loading your experience" data-lenis-prevent>
    <div className="loader-top"><span>INTERIORS · FURNITURE · IMAGINATION</span><span>BEYOND THE ORDINARY</span></div>
    <div className="loader-center"><img src="/theos-logo.avif" alt="Theos" width="240"/><p>Loading your <em>experience.</em></p><span>A new perspective is taking shape.</span></div>
    <div className="loader-bottom"><div className="loader-meta"><span>{slow ? 'Preparing the finishing touches' : 'From imagination to a place.'}</span><span className="loader-number" aria-hidden="true">{String(progress).padStart(2, '0')}<small>%</small></span></div><div className="loader-track" role="progressbar" aria-label="Homepage preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{transform:`scaleX(${progress / 100})`}}/></div>{slow && <button onClick={() => setFinish(true)}>Continue to the experience →</button>}</div>
  </div>
}
