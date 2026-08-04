// src/game/hud/PositionReadout.tsx — progress comparison strip (LOOP-12).
import type { Participant } from '../../engine/types';

interface PositionReadoutProps {
  participants: Participant[];
  currentIndex: number;
  boardLength?: number;
}

export default function PositionReadout({ participants, currentIndex, boardLength }: PositionReadoutProps) {
  const finish = boardLength ?? Math.max(...participants.map((p) => p.position), 0);
  const ranked = participants
    .map((p, i) => ({ participant: p, index: i, remaining: Math.max(0, finish - p.position) }))
    .sort((a, b) => b.participant.position - a.participant.position);

  return (
    <ol className="game-positions" aria-label="현재 순위와 결승까지 남은 거리">
      {ranked.map(({ participant: p, index, remaining }, rank) => (
        <li key={p.id} className={index === currentIndex ? 'is-current' : undefined}>
          <span className="rank">{rank + 1}위</span> {p.name} — {p.position}칸
          <span className="remain">결승까지 {remaining}칸</span>
        </li>
      ))}
    </ol>
  );
}
