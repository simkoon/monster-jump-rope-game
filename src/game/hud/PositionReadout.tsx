// src/game/hud/PositionReadout.tsx — compact strip of every token's name — N칸
// (UI-SPEC Position readout), the current player marked. Reuses the engine
// participants[].position directly; a DOM mirror of the 3D board (Canvas semantics).
import type { Participant } from '../../engine/types';

interface PositionReadoutProps {
  participants: Participant[];
  currentIndex: number;
}

export default function PositionReadout({ participants, currentIndex }: PositionReadoutProps) {
  return (
    <ol className="game-positions" aria-label="현재 순위">
      {participants.map((p, i) => (
        <li key={p.id} className={i === currentIndex ? 'is-current' : undefined}>
          {p.name} — {p.position}칸
        </li>
      ))}
    </ol>
  );
}
