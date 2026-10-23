// src/game/scene/contextLoss.ts — watch a canvas for WebGL context loss (D-27, STAB-02).
// DOM only: no React, no runtime import of three / @react-three/* — the lazy 3D chunk and the
// main chunk can both use it, and jsdom tests can dispatch the events on a plain <canvas>.
// The lost handler calls preventDefault() (three does too; it is idempotent) so the browser
// may restore the context, then reports it so GameStage can show the "화면 다시 그리기" overlay.
export function watchContextLoss(
  el: HTMLCanvasElement,
  onLost: () => void,
  onRestored?: () => void,
): () => void {
  const lost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  const restored = () => onRestored?.();
  el.addEventListener('webglcontextlost', lost);
  el.addEventListener('webglcontextrestored', restored);
  return () => {
    el.removeEventListener('webglcontextlost', lost);
    el.removeEventListener('webglcontextrestored', restored);
  };
}
