// Scene completion means at least one frame has reached the renderer.
export const readyScenes = new Set<string>()
export function sceneReady(name: string) { readyScenes.add(name) }
