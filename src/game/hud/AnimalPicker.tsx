// src/game/hud/AnimalPicker.tsx — one participant's 8-animal picker (D-24, SETUP-07).
// Props-only: emoji is the visible text, the Korean name is the accessible name.
import { ANIMALS, type AnimalId } from '../../engine/animals';
import { ANIMAL_EMOJI, ANIMAL_NAME } from '../labels';

interface AnimalPickerProps {
  groupLabel: string;
  value: AnimalId;
  taken: readonly AnimalId[];
  onChange: (id: AnimalId) => void;
}

export default function AnimalPicker({ groupLabel, value, taken, onChange }: AnimalPickerProps) {
  return (
    <div className="animal-pick" role="group" aria-label={groupLabel}>
      {ANIMALS.map((a) => {
        const isTaken = a !== value && taken.includes(a);
        return (
          <button
            key={a}
            type="button"
            aria-pressed={a === value}
            aria-label={isTaken ? `${ANIMAL_NAME[a]} — 다른 친구가 골랐어요` : ANIMAL_NAME[a]}
            disabled={isTaken}
            onClick={() => onChange(a)}
          >
            {ANIMAL_EMOJI[a]}
          </button>
        );
      })}
    </div>
  );
}
