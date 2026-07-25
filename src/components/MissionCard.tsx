import type { Mission } from '../schema';

const DIFFS: Record<Mission['diff'], { label: string; cls: string }> = {
  easy: { label: '쉬움', cls: 'easy' },
  normal: { label: '보통', cls: 'normal' },
  hard: { label: '어려움', cls: 'hard' },
};

interface MissionCardProps {
  mission: Mission;
}

// Read-only mission card. All user text (name, desc, category) is rendered as
// JSX children so React auto-escapes it — never build markup from raw strings.
export default function MissionCard({ mission }: MissionCardProps) {
  const d = DIFFS[mission.diff] ?? DIFFS.easy;
  return (
    <div className="card">
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
