// src/game/hud/StarFlight.tsx — the big star that flies from the judged character's head to its
// scoreboard cell (Phase 8 FX-02, D-03, D-05, D-07, D-08, D-23, UI-SPEC F3).
// D-05: a DOM layer, never a 3D object. It is portaled to document.body with a fixed, full-screen,
// pointer-transparent, aria-hidden layer (z-index 40, under dialogs and toasts): inside the stage the
// canvas cell clips (`overflow: hidden`) and every stage child is forced `position: relative`
// (RESEARCH Pitfall 5), so the star could never reach the scoreboard from there.
// Coordinates are measured ONCE when the flight starts (flyFromMs of successPlan):
//   - start = the head-top anchor (headAnchor, the same inputs SceneContents uses) projected with the
//     fixed camera recomputed exactly like CameraRig (fitCamera over the `.stage-canvas` aspect) by
//     the three-free projectNdc → ndcToClient over the `.stage-canvas` rect. When the canvas is not
//     ready / failed, or the point is behind the camera / off the canvas, the star starts at the
//     canvas cell center and the game keeps going.
//   - end = the center of the `.sb-avatar` of the scoreboard cell whose dataset.pid equals the beat
//     pid (values compared, never a selector built from the id — T-08-13). No cell → no star.
// One star with a "+N" pill (never N stars) pops for POP_MS, flies an upward arc until flyToMs,
// fades and is REMOVED at flyToMs + FADE_MS; useStarHit flashes the avatar at flyToMs. The number
// itself still rises only at the beat end (Phase 6 D-01).
// Reduced motion (D-08): no flight / rotation / scaling — a still 40 px star fades in on the avatar
// at flyToMs (600 ms) and stays until the beat ends.
// D-07 / D-23: the star is keyed by the beat id, so a beat that ends or is skipped removes it in the
// same render; timers are cleared on beat change / unmount, so nothing is left in the DOM.
// Security (T-08-12): the style carries only computed numbers (px / ms). Names and ids never reach a
// CSS variable or markup. This component never ends a beat (Banner timer + store watchdog do).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Tile } from '../../engine/board';
import { successPlan } from '../director/successPlan';
import { fitCamera } from '../layout/fitCamera';
import { headAnchor } from '../layout/headAnchor';
import { ndcOnScreen, ndcToClient, projectNdc } from '../layout/project';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';

export interface StarFlightProps {
  tiles: readonly Tile[];
  order: readonly string[];
  currentId: string | null;
  canvasOk: boolean; // the 3D canvas is ready and not failed
}

export const POP_MS = 160; // entry pop (UI-SPEC F3)
export const FADE_MS = 80; // arrival fade, then removal
const MIN_APEX_PX = 64; // the arc peaks at least this far above the higher end point

interface Point {
  x: number;
  y: number;
}

interface Flight {
  id: number;
  still: boolean;
  n: number;
  vars: Record<string, string>;
}

const num = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
const px = (v: number) => `${num(v)}px`;
const hasSize = (r: DOMRect | undefined): r is DOMRect => !!r && r.width > 0 && r.height > 0;
const centerOf = (r: DOMRect): Point => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// The scoreboard avatar center of pid, or null when its cell is not rendered.
function avatarCenter(pid: string): Point | null {
  for (const el of document.querySelectorAll<HTMLElement>('.sb-cell[data-pid]')) {
    if (el.dataset.pid !== pid) continue;
    const avatar = el.querySelector('.sb-avatar');
    return avatar ? centerOf(avatar.getBoundingClientRect()) : null;
  }
  return null;
}

// The flight start: projected head anchor, else the canvas cell center.
function startPoint(pid: string, p: StarFlightProps): Point {
  const canvas = document.querySelector<HTMLElement>('.stage-canvas');
  const rect = canvas?.getBoundingClientRect();
  if (p.canvasOk && hasSize(rect) && p.tiles.length > 0) {
    const aspect = rect.width / rect.height;
    const fit = fitCamera(aspect, boardExtents(ringLayout(p.tiles.length)));
    const positions = usePresentation.getState().displayed.positions;
    const anchor = headAnchor(p.tiles, p.order, positions, p.currentId, pid);
    const ndc = projectNdc(anchor, { position: fit.position, target: fit.target, fovDeg: fit.fov, aspect });
    if (ndc.inFront && ndcOnScreen(ndc)) return ndcToClient(ndc, rect);
  }
  const cellRect = canvas?.closest('.stage-canvas-cell')?.getBoundingClientRect();
  if (hasSize(cellRect)) return centerOf(cellRect);
  if (hasSize(rect)) return centerOf(rect);
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export default function StarFlight(props: StarFlightProps) {
  const beat = usePresentation((s) => (s.current?.kind === 'stars' ? s.current : null));
  const reduced = useMemo(prefersReducedMotion, []);
  const [flight, setFlight] = useState<Flight | null>(null);
  // The latest props for the timer callbacks, without re-arming the timers on every render.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    if (!beat) return;
    const { id, pid, stars } = beat;
    const plan = successPlan(stars, beat.ms, reduced);
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      timers.push(
        setTimeout(() => {
          const end = avatarCenter(pid);
          if (end) setFlight({ id, still: true, n: stars, vars: { '--x0': px(end.x), '--y0': px(end.y) } });
        }, plan.flyToMs),
      );
    } else {
      timers.push(
        setTimeout(() => {
          const end = avatarCenter(pid);
          if (!end) return;
          const start = startPoint(pid, latest.current);
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const apex = Math.min(0, dy) - Math.max(MIN_APEX_PX, 0.25 * Math.abs(dy));
          const flyMs = Math.max(0, plan.flyToMs - plan.flyFromMs - POP_MS);
          setFlight({
            id,
            still: false,
            n: stars,
            vars: {
              '--x0': px(start.x),
              '--y0': px(start.y),
              '--dx': px(dx),
              '--dy': px(dy),
              '--apex': px(apex),
              '--fly-ms': `${Math.round(flyMs)}ms`,
              '--pop-ms': `${POP_MS}ms`,
            },
          });
        }, plan.flyFromMs),
        setTimeout(() => setFlight(null), plan.flyToMs + FADE_MS),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [beat, reduced]);

  if (!beat || !flight || flight.id !== beat.id) return null;
  const n = Math.max(0, Math.floor(flight.n));

  return createPortal(
    <div className="fx-layer" aria-hidden="true">
      <div className={flight.still ? 'fx-star fx-star--still' : 'fx-star'} style={flight.vars as CSSProperties}>
        <div className="fx-star-y">
          <svg className="fx-star-svg" viewBox="0 0 64 64" focusable="false" aria-hidden="true">
            <path
              className="fx-star-body"
              d="M32 8 L39.3 24.9 L57.7 26.7 L43.9 38.9 L47.9 56.8 L32 47.5 L16.1 56.8 L20.1 38.9 L6.3 26.7 L24.7 24.9 Z"
            />
            <ellipse className="fx-star-shine" cx="24" cy="25" rx="5" ry="3" transform="rotate(-30 24 25)" />
            <ellipse className="fx-star-eye" cx="26" cy="35" rx="3" ry="4.5" />
            <ellipse className="fx-star-eye" cx="38" cy="35" rx="3" ry="4.5" />
          </svg>
          <span className="fx-star-pill">{`+${n}`}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
