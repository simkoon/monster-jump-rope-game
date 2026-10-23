// src/game/hud/DomPodium.tsx — the DOM-only podium (Phase 8 D-11, UI-SPEC F7 "DOM 대체 시상대").
// Shown inside the ceremony's canvas cell instead of the recovery overlay whenever the 3D podium is
// not there (loading, lost context, failed chunk / WebGL, ready timeout). Children never see an
// error message: the winners' circles with a 👑 each stand over ONE gold block, everybody else
// stands below as same-shaped circles in their participant color (inline --pc), and a single
// 🔄 화면 다시 그리기 button runs the usual redraw (canvasKey + 1); when the 3D canvas is back, the
// 3D podium replaces this. The rest of the ceremony (panel, buttons, sound toggle) is unchanged.
// Names appear only in the accessible label and the circle titles, as attribute text (T-08-23).
import type { CSSProperties } from 'react';
import type { GameState } from '../../engine/state';
import { ANIMAL_EMOJI, REDRAW_LABEL, podiumAria } from '../labels';
import { ANIMAL_COLOR } from '../palette';

interface DomPodiumProps {
  game: GameState;
  onRedraw: () => void;
}

export default function DomPodium({ game, onRedraw }: DomPodiumProps) {
  const ps = game.config.participants;
  const winSet = new Set(game.winners);
  const winners = ps.filter((p) => winSet.has(p.id));
  const others = ps.filter((p) => !winSet.has(p.id));
  const color = (animal: keyof typeof ANIMAL_COLOR) => ({ '--pc': ANIMAL_COLOR[animal] }) as CSSProperties;

  return (
    <div className={winners.length > 4 ? 'dom-podium is-many' : 'dom-podium'}>
      <div className="dom-podium-figure" role="img" aria-label={podiumAria(winners.map((p) => p.name))}>
        <div className="dom-podium-tier">
          <div className="dom-podium-winners">
            {winners.map((p) => (
              <span key={p.id} className="dom-podium-winner" title={p.name}>
                <span className="dom-podium-crown">👑</span>
                <span className="dom-podium-champ" style={color(p.animal)}>
                  {ANIMAL_EMOJI[p.animal]}
                </span>
              </span>
            ))}
          </div>
          <div className="dom-podium-block" />
        </div>
        {others.length > 0 && (
          <div className="dom-podium-others">
            {others.map((p) => (
              <span key={p.id} className="dom-podium-dot" style={color(p.animal)} title={p.name}>
                {ANIMAL_EMOJI[p.animal]}
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="game-btn--sm dom-podium-redraw" data-skip-ignore onClick={onRedraw}>
        {REDRAW_LABEL}
      </button>
    </div>
  );
}
