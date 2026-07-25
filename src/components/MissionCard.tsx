import type { Mission } from '../schema';

const DIFFS: Record<Mission['diff'], { label: string; cls: string }> = {
  easy: { label: '쉬움', cls: 'easy' },
  normal: { label: '보통', cls: 'normal' },
  hard: { label: '어려움', cls: 'hard' },
};

interface MissionCardProps {
  mission: Mission;
  // When provided, the card shows the top-right ✏️ edit / 🗑️ delete mini-buttons.
  onEdit?: (mission: Mission) => void;
  onDelete?: (mission: Mission) => void;
}

// Mission card. All user text (name, desc, category) is rendered as JSX children
// so React auto-escapes it — never build markup from raw strings (T-01-03).
export default function MissionCard({ mission, onEdit, onDelete }: MissionCardProps) {
  const d = DIFFS[mission.diff] ?? DIFFS.easy;
  return (
    <div className="card">
      {(onEdit || onDelete) && (
        <div className="acts">
          {onEdit && (
            <button
              className="mini"
              type="button"
              title="수정"
              aria-label={`${mission.name} 수정`}
              onClick={() => onEdit(mission)}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              className="mini del"
              type="button"
              title="삭제"
              aria-label={`${mission.name} 삭제`}
              onClick={() => onDelete(mission)}
            >
              🗑️
            </button>
          )}
        </div>
      )}
      <div className="title">{mission.name}</div>
      <div className="desc">{mission.desc || ''}</div>
      <div className="row">
        <span className={'badge ' + d.cls}>{d.label}</span>
        {mission.cats.map((c) => (
          <span className="tag" key={c}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
