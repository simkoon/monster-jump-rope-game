import { useState } from 'react';
import { useStore } from './store';
import Header from './components/Header';
import Tabs, { type TabKey } from './components/Tabs';
import MissionTab from './components/MissionTab';
import EventTab from './components/EventTab';
import Toast from './components/Toast';
import GameApp from './game/GameApp';

// Top-level view: the content 편집기 (Phase 1 mission/event tabs) or the 게임 (3D board).
type View = 'editor' | 'game';

export default function App() {
  // D-10: the app opens in 게임 mode by default; the 편집기 stays reachable via the switch.
  const [view, setView] = useState<View>('game');
  const [tab, setTab] = useState<TabKey>('mission');
  const missions = useStore((s) => s.missions);
  const events = useStore((s) => s.events);

  // Tab counts always reflect the full, unfiltered lists (UI-SPEC).
  const missionCount = missions.length;
  const eventCount = events.length;

  return (
    <div className={`app app--${view}`}>
      <Header
        context={view === 'game' ? '게임' : '콘텐츠 편집기'}
        subtitle={view === 'game' ? '카드 미션을 성공하고 결승까지 점프해요' : '줄넘기 미션과 이벤트 칸을 자유롭게 만들어요'}
      />
      {/* Additive top-level switch — the 미션/이벤트 editor stays exactly as-is. */}
      <nav className="view-switch" aria-label="화면 전환">
        <button
          type="button"
          className={'tab' + (view === 'editor' ? ' active' : '')}
          onClick={() => setView('editor')}
        >
          ✏️ 편집기
        </button>
        <button
          type="button"
          className={'tab' + (view === 'game' ? ' active' : '')}
          onClick={() => setView('game')}
        >
          🎮 게임
        </button>
      </nav>

      {view === 'editor' ? (
        <>
          <Tabs
            active={tab}
            missionCount={missionCount}
            eventCount={eventCount}
            onChange={setTab}
          />
          <main className="editor-main">
            <section className="panel panel--editor-shell">
              {tab === 'mission' ? <MissionTab /> : <EventTab />}
            </section>
          </main>
          <footer className="note">
            저장은 이 브라우저에 자동으로 됩니다(새로고침해도 유지). 다른 기기로 옮기거나 백업하려면{' '}
            <b>내보내기</b>로 파일을 저장하고, <b>가져오기</b>로 불러오세요.
          </footer>
        </>
      ) : (
        <main className="game-main">
          <section className="panel panel--game-shell">
            <GameApp />
          </section>
        </main>
      )}
      <Toast />
    </div>
  );
}
