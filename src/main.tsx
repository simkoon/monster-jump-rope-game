import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './game/styles/game.css';
import App from './App';
import { loadGameCanvas } from './game/scene/loadGameCanvas';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// STAB-04: fetch the lazy 3D chunk at idle while the app is still online, so an offline classroom
// can still open the board later. A failure here is harmless — GameStage retries on its own.
const preload = () => {
  loadGameCanvas().catch(() => {});
};
if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 3000 });
else setTimeout(preload, 1500);
