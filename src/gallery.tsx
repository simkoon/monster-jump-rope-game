// src/gallery.tsx — dev-only entry of the character gallery (D-23, UI-SPEC C8, RESEARCH Pitfall 11).
// Served by the Vite dev server from the root gallery.html only: `vite build` bundles index.html
// alone, vite.config.ts lists no extra input, and no app module imports this file or the gallery
// (source guard (g)). Imports no three / @react-three itself (source guard (d)) — the scene module
// does — and skips the app's lazy-canvas preload.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import CharacterGallery from './game/scene/CharacterGallery';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterGallery />
  </StrictMode>,
);
