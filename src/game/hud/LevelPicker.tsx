// src/game/hud/LevelPicker.tsx — one child's mission level: 칸대로 (the tile's difficulty) or a fixed
// 쉬움 / 보통 / 어려움 deck. Stars follow the card's difficulty (쉬움 1 · 보통 2 · 어려움 3).
import { DIFF_ORDER } from '../../engine/board';
import type { Difficulty } from '../../schema';
import { DIFF_LABEL } from '../labels';

interface LevelPickerProps {
  groupLabel: string;
  value: Difficulty | undefined;
  onChange: (level: Difficulty | undefined) => void;
}

export default function LevelPicker({ groupLabel, value, onChange }: LevelPickerProps) {
  const options: { v: Difficulty | undefined; label: string }[] = [
    { v: undefined, label: '칸대로' },
    ...DIFF_ORDER.map((d) => ({ v: d, label: DIFF_LABEL[d] })),
  ];
  return (
    <div className="level-pick">
      <span className="level-pick-caption" aria-hidden="true">미션 난이도</span>
      <div className="seg seg--sm" role="group" aria-label={groupLabel}>
        {options.map((o) => {
          const sel = o.v === value;
          return (
            <button
              key={o.label}
              type="button"
              data-v={o.v ?? 'plain'}
              className={sel ? (o.v ? 'sel' : 'sel plain') : undefined}
              aria-pressed={sel}
              onClick={() => onChange(o.v)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
