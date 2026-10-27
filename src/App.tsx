import { MainLayout } from '@/layouts/MainLayout'
import { Home } from '@/pages/Home'
import { useCallback, useLayoutEffect, useState } from 'react'
import { PageLoader } from '@/components/PageLoader'
import { setScrollLocked } from '@/hooks/useSmoothScroll'

function App() {
  const [loading, setLoading] = useState(true)
  const complete = useCallback(() => setLoading(false), [])
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-loading', loading)
    setScrollLocked(loading)
    return () => { document.documentElement.removeAttribute('data-loading'); setScrollLocked(false) }
  }, [loading])
  return (
    <><div inert={loading} aria-hidden={loading || undefined}><MainLayout>
      <Home />
    </MainLayout></div>{loading && <PageLoader onComplete={complete}/>}</>
  )
}

export default App
