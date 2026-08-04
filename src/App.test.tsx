import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import App from './App';
import { useStore } from './store';
import { seedContent } from './seed';
import type { Mission } from './schema';

function resetToSeed() {
  localStorage.clear();
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}

// The two top-level mode-switch buttons live in the "화면 전환" nav. Scope queries there so
// they never collide with 게임/편집기 text elsewhere on the screen (e.g. SetupScreen copy).
function modeSwitch() {
  return within(screen.getByRole('navigation', { name: '화면 전환' }));
}

// D-10: the app now opens in 게임 mode by default, so editor-content tests must first switch
// to the 편집기 via the mode toggle before asserting Phase-1 mission/event content.
function enterEditor() {
  fireEvent.click(modeSwitch().getByRole('button', { name: '✏️ 편집기' }));
}

function clickEventTab() {
  fireEvent.click(screen.getByRole('tab', { name: /이벤트/ }));
}

describe('App shell — default 게임 entry (D-10)', () => {
  beforeEach(resetToSeed);

  it('opens in 게임 mode on first mount (the 🎮 게임 toggle is active, editor content absent)', () => {
    render(<App />);
    // The game-mode toggle carries the active state on first mount...
    expect(modeSwitch().getByRole('button', { name: '🎮 게임' }).className).toContain('active');
    expect(modeSwitch().getByRole('button', { name: '✏️ 편집기' }).className).not.toContain('active');
    // ...and no editor MissionTab content (a seed mission name) is rendered.
    expect(screen.queryByText('양발 모아뛰기')).toBeNull();
    // The reskinned game view (SetupView, GameApp with no active game) is what mounts:
    // the original Phase 4 파워점핑 logo + the --tap 시작 button.
    expect(screen.getAllByText('파워점핑').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('파워점핑 게임 카드 미션을 성공하고 결승까지 점프해요')).toBeInTheDocument();
    expect(document.querySelector('.app--game')).not.toBeNull();
    expect(document.querySelector('.panel--game-shell')).not.toBeNull();
    expect(screen.getByRole('button', { name: /시작/ })).toBeInTheDocument();
  });

  it('keeps the 편집기 reachable via the mode switch', () => {
    render(<App />);
    enterEditor();
    expect(modeSwitch().getByRole('button', { name: '✏️ 편집기' }).className).toContain('active');
    expect(document.querySelector('.app--editor')).not.toBeNull();
    expect(document.querySelector('.panel--editor-shell')).not.toBeNull();
    expect(screen.getByText('양발 모아뛰기')).toBeInTheDocument();
  });
});

describe('App shell (two-tab read-only viewer)', () => {
  beforeEach(resetToSeed);

  it('renders all 6 seed mission names and a count pill of 6', () => {
    render(<App />);
    enterEditor();
    for (const name of ['양발 모아뛰기', '번갈아뛰기', '엇걸어풀기 (X자)', '뒤로뛰기', '이중뛰기', '십자뛰기']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const missionTab = screen.getByRole('tab', { name: /미션/ });
    expect(within(missionTab).getByText('6')).toBeInTheDocument();
  });

  it('switches to the 이벤트 tab, showing the 4 seed events and a pill of 4', () => {
    render(<App />);
    enterEditor();
    clickEventTab();
    for (const name of ['슈퍼 점프!', '발이 꼬였어요', '한 번 더 도전!', '한 칸 전진']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const eventTab = screen.getByRole('tab', { name: /이벤트/ });
    expect(within(eventTab).getByText('4')).toBeInTheDocument();
  });

  it('shows a probability percent and weight on event cards', () => {
    render(<App />);
    enterEditor();
    clickEventTab();
    expect(screen.getAllByText(/가중치/).length).toBeGreaterThan(0);
    // 발생 확률 label present + at least one % rendered
    expect(screen.getAllByText('발생 확률').length).toBe(4);
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
  });
});

describe('XSS safety — user text renders escaped', () => {
  beforeEach(() => {
    localStorage.clear();
    const xss: Mission = {
      id: 'xss',
      name: '<img src=x onerror=alert(1)>',
      desc: '',
      diff: 'easy',
      cats: [],
    };
    useStore.setState({ version: 1, categories: [], missions: [xss], events: [] });
  });

  it('renders angle-bracket markup as literal text, not injected DOM', () => {
    const { container } = render(<App />);
    enterEditor();
    // The literal string appears as text content...
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    // ...and no real <img> element was injected.
    expect(container.querySelector('img')).toBeNull();
  });
});
