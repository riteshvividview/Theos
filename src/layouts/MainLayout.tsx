import type { ReactNode } from 'react'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'

export function MainLayout({ children }: { children: ReactNode }) {
  useSmoothScroll()

  return <div className="relative min-h-screen bg-ink text-paper">{children}</div>
}
