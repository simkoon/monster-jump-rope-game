import type { Mission } from '../schema';

type Diff = Mission['diff'];

const DIFFS: { value: Diff; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'normal', label: '보통' },
  { value: 'hard', label: '어려움' },
];

interface FilterRowProps {
  categories: string[];
  activeDiff: Diff[];
  activeCats: string[];
  onToggleDiff: (d: Diff) => void;
  onToggleCat: (c: string) => void;
}

// Difficulty (OR within) + category (AND across) filter chips (D-04, UI-SPEC
// §Filter row). Multi-select; the active state is lifted to MissionTab which
// composes it with the name search.
export default function FilterRow({
  categories,
  activeDiff,
  activeCats,
  onToggleDiff,
  onToggleCat,
}: FilterRowProps) {
  return (
    <div className="filters">
      <span className="flabel">난이도</span>
      {DIFFS.map((d) => {
        const on = activeDiff.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            className={'chip diff-' + d.value + (on ? ' on' : '')}
            aria-pressed={on}
            onClick={() => onToggleDiff(d.value)}
          >
            {d.label}
          </button>
        );
      })}

      {categories.length > 0 && (
        <>
          <span className="flabel" style={{ marginLeft: 8 }}>
            카테고리
          </span>
          {categories.map((c) => {
            const on = activeCats.includes(c);
            return (
              <button
                key={c}
                type="button"
                className={'chip cat' + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => onToggleCat(c)}
              >
                {c}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
