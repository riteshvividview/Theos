import { Component, Suspense, lazy, type ReactNode } from 'react'
import type { CinematicHeroProps } from './scenes/CinematicHero'

const CinematicHero = lazy(() => import('./scenes/CinematicHero').then(m => ({ default: m.CinematicHero })))

class CinematicBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export function CinematicCanvas(props: CinematicHeroProps) {
  return <CinematicBoundary onFailure={props.onFailure}><Suspense fallback={null}><CinematicHero {...props} /></Suspense></CinematicBoundary>
}
