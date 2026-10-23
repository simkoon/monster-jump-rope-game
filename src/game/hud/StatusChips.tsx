// src/game/hud/StatusChips.tsx — per-turn status chips over the canvas (D-23, UI-SPEC S6a).
// Props-only. A chip joins the row each time its beat ends (chipItems holds back pending kinds);
// the screen passes move = null at the start of the next turn to clear the row.
// Chip text never contains user strings (event names live in the banner); rendered as JSX text.
import type { BeatKind } from '../director/timeline';
import type { MoveResult } from '../../engine/state';
import { chipItems } from '../labels';

interface StatusChipsProps {
  move: MoveResult | null;
  pending: readonly BeatKind[];
}

export default function StatusChips({ move, pending }: StatusChipsProps) {
  const items = chipItems(move, pending);
  return (
    <div className="status-chips" aria-live="polite">
      {items.map((c) => (
        <span
          key={c.key}
          className={`status-chip status-chip--${c.tone}${c.key === 'dice' ? ' status-chip--dice' : ''}`}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
