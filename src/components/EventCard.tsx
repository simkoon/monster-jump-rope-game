import type { Event } from '../schema';

const EFFS: Record<Event['eff'], { label: string; ico: string; cls: string }> = {
  forward: { label: '앞으로', ico: '➡️', cls: 'forward' },
  backward: { label: '뒤로', ico: '⬅️', cls: 'backward' },
  extra: { label: '한 번 더!', ico: '🔁', cls: 'extra' },
};

interface EventCardProps {
  event: Event;
  pct: number; // normalized display percent (computed over the full event list)
  // When provided, the card shows the top-right ✏️ edit / 🗑️ delete mini-buttons.
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

// Event card. effText per D-06/D-07; extra shows no N칸. Probability block shows
// the normalized % + raw weight and a sun→coral bar at the % width. All user text
// (name, label) is rendered as JSX children so React auto-escapes it (T-01-07).
export default function EventCard({ event, pct, onEdit, onDelete }: EventCardProps) {
  const ef = EFFS[event.eff] ?? EFFS.forward;
  const effText =
    event.eff === 'extra' ? `${ef.ico} ${ef.label}` : `${ef.ico} ${ef.label} ${event.steps}칸`;

  const labelChip =
    event.label !== '' ? (
      <span
        className="tag"
        style={{
          borderColor: 'transparent',
          color: '#fff',
          background: event.label === '함정' ? 'var(--coral)' : 'var(--grape)',
        }}
      >
        {event.label}
      </span>
    ) : null;

  return (
    <div className="card">
      {(onEdit || onDelete) && (
        <div className="acts">
          {onEdit && (
            <button
              className="mini"
              type="button"
              title="수정"
              aria-label={`${event.name} 수정`}
              onClick={() => onEdit(event)}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              className="mini del"
              type="button"
              title="삭제"
              aria-label={`${event.name} 삭제`}
              onClick={() => onDelete(event)}
            >
              🗑️
            </button>
          )}
        </div>
      )}
      <div className="title">{event.name}</div>
      <div className="row">
        <span className={'eff ' + ef.cls}>{effText}</span>
        {labelChip}
      </div>
      <div className="prob">
        <div className="lbl">
          <span>발생 확률</span>
          <b>
            {pct}% · 가중치 {event.weight}
          </b>
        </div>
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
