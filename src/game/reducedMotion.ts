// src/game/reducedMotion.ts — the OS "reduce motion" preference (UI-SPEC Motion Contract).
// Guarded so it is safe outside a browser and in jsdom (which has no matchMedia): false there.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
