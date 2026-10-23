// src/game/hud/Scoreboard.tsx — star scoreboard v2 (HUD-01, D-22, UI-SPEC S4).
// Props-only: stars descending via rankByStars, ties share a rank (1,1,3), no horizontal scroll.
// Each cell = avatar circle in the participant color (palette ANIMAL_COLOR through the inline --pc
// variable — the same hex the 3D pawn uses) with the animal emoji and a rank badge (👑 for rank 1
// with ≥ 1 star), then ⭐n and the name. The cell body is keyed by the star count so the CSS pop
// replays when the count changes. Names render as JSX text only (T-06-08).
import type { CSSProperties } from 'react';
import type { AnimalId } from '../../engine/animals';
import { rankByStars } from '../../engine/scoring';
import { ANIMAL_EMOJI, scoreAria } from '../labels';
import { ANIMAL_COLOR } from '../palette';

export interface ScoreEntry {
  id: string;
  name: string;
  animal: AnimalId;
  stars: number;
}

interface ScoreboardProps {
  entries: readonly ScoreEntry[];
  currentId: string;
}

export default function Scoreboard({ entries, currentId }: ScoreboardProps) {
  const cols = Math.max(1, Math.min(entries.length, 4));
  return (
    <ol className="sb" aria-label="별 순위" style={{ '--sb-cols': String(cols) } as CSSProperties}>
      {rankByStars(entries).map(({ item, rank }) => {
        const crowned = rank === 1 && item.stars >= 1;
        const cls = ['sb-cell', crowned && 'is-leader', item.id === currentId && 'is-current'].filter(Boolean).join(' ');
        return (
          <li
            key={item.id}
            className={cls}
            style={{ '--pc': ANIMAL_COLOR[item.animal] } as CSSProperties}
            aria-label={scoreAria(rank, item.animal, item.name, item.stars, crowned)}
          >
            <span key={item.stars} className="sb-body">
              <span className="sb-avatar" aria-hidden="true">
                {ANIMAL_EMOJI[item.animal]}
                <span className="sb-rank">{crowned ? '👑' : rank}</span>
              </span>
              <span className="sb-text">
                <span className="sb-stars">{`⭐${item.stars}`}</span>
                <span className="sb-name">{item.name}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
