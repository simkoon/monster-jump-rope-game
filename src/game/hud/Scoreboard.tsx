// src/game/hud/Scoreboard.tsx — temporary star scoreboard (D-26, ROUND-03). Phase 6 HUD-01 replaces it.
// Props-only: stars descending, ties share a rank (1,1,3), current turn pill marked is-current.
import type { AnimalId } from '../../engine/animals';
import { rankByStars } from '../../engine/scoring';
import { ANIMAL_EMOJI } from '../labels';

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
  return (
    <ol className="scoreboard" aria-label="별 순위">
      {rankByStars(entries).map(({ item, rank }) => (
        <li key={item.id} className={item.id === currentId ? 'is-current' : undefined}>
          <span className="rank">{rank}등</span>
          <span className="animal">{ANIMAL_EMOJI[item.animal]}</span>
          <span className="name">{item.name}</span>
          <span className="stars">⭐{item.stars}</span>
        </li>
      ))}
    </ol>
  );
}
