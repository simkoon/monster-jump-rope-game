import { useState } from 'react';
import { useStore } from './store';
import Header from './components/Header';
import Tabs, { type TabKey } from './components/Tabs';
import MissionTab from './components/MissionTab';
import EventTab from './components/EventTab';
import Toast from './components/Toast';

export default function App() {
  const [tab, setTab] = useState<TabKey>('mission');
  const missions = useStore((s) => s.missions);
  const events = useStore((s) => s.events);

  // Tab counts always reflect the full, unfiltered lists (UI-SPEC).
  const missionCount = missions.length;
  const eventCount = events.length;

  return (
    <div className="app">
      <Header />
      <Tabs
        active={tab}
        missionCount={missionCount}
        eventCount={eventCount}
        onChange={setTab}
      />
      <main>
        <section className="panel">
          {tab === 'mission' ? <MissionTab /> : <EventTab />}
        </section>
      </main>
      <footer className="note">
        저장은 이 브라우저에 자동으로 됩니다(새로고침해도 유지). 다른 기기로 옮기거나 백업하려면{' '}
        <b>내보내기</b>로 파일을 저장하고, <b>가져오기</b>로 불러오세요.
      </footer>
      <Toast />
    </div>
  );
}
