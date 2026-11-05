// Scene completion means at least one frame has reached the renderer.
export const readyScenes = new Set<string>()
export function sceneReady(name: string) { readyScenes.add(name) }

// The loader calls reveal() as it starts to dissolve; anything that should play on first sight waits with onReveal().
let revealed = false
const waiting: (() => void)[] = []
export function reveal() { if (revealed) return; revealed = true; waiting.splice(0).forEach(fn => fn()) }
export function onReveal(fn: () => void) { if (revealed) fn(); else waiting.push(fn); return () => { const i = waiting.indexOf(fn); if (i >= 0) waiting.splice(i, 1) } }
