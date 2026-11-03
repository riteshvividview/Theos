// Dev-only: renders the pavilion stage alone for screenshots. ?room=<id> holds one room in its hovered state.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PavilionCanvas, type PavilionRoomId } from '@/three/scenes/Pavilion'
import '@/styles/atelierSections.css'

const hold = (new URLSearchParams(location.search).get('room') ?? undefined) as PavilionRoomId | undefined
// StrictMode and the section's stage markup as in the app, so the preview shows what the page shows.
createRoot(document.getElementById('root')!).render(<StrictMode>
  <div className="pavilion-stage" style={{ margin: 0 }}><span className="pavilion-word" aria-hidden="true">Interior</span><PavilionCanvas running reduced={false} hold={hold} onRoom={() => {}} /></div>
</StrictMode>)
