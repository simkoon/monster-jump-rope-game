// src/game/scene/loadGameCanvas.ts — the one entry point to the lazy 3D chunk (D-06, RESEARCH Pitfall 6).
// GameStage's React.lazy and the idle preload both call this, so they share one chunk and one
// module instance. Keep it a dynamic import only: a static import here would pull three into the
// main chunk.
export const loadGameCanvas = () => import('./GameCanvas');
