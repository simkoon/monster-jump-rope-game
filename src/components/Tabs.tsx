export type TabKey = 'mission' | 'event';

interface TabsProps {
  active: TabKey;
  missionCount: number;
  eventCount: number;
  onChange: (tab: TabKey) => void;
}

export default function Tabs({ active, missionCount, eventCount, onChange }: TabsProps) {
  return (
    <nav className="tabs" role="tablist" aria-label="콘텐츠 종류">
      <button
        className={'tab' + (active === 'mission' ? ' active' : '')}
        role="tab"
        type="button"
        aria-selected={active === 'mission'}
        onClick={() => onChange('mission')}
      >
        🎴 미션 <span className="cnt">{missionCount}</span>
      </button>
      <button
        className={'tab' + (active === 'event' ? ' active' : '')}
        role="tab"
        type="button"
        aria-selected={active === 'event'}
        onClick={() => onChange('event')}
      >
        🎲 이벤트 <span className="cnt">{eventCount}</span>
      </button>
    </nav>
  );
}
