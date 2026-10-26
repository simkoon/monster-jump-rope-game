import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import { INPUT_LOCK_MS } from './game/useInputLock';
import { useStore } from './store';
import { useGameStore } from './harness/useGameStore';
import { useSettings, DEFAULT_SETTINGS } from './settings';
import { useSetupDraft } from './game/useSetupDraft';
import { seedContent } from './seed';
import type { Mission } from './schema';
import { usePresentation } from './game/usePresentation';
import { EMPTY_DISPLAYED } from './game/director/displayed';
import { fakeCanvas, settle, waitForCanvas } from './test/fakeGameCanvas';

// The 3D chunk is swapped for the fake canvas (jsdom has no WebGL — 06-06, RESEARCH Pitfall 2/3).
vi.mock('./game/scene/GameCanvas', () => import('./test/fakeGameCanvas'));

function resetToSeed() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS }); // settings changed by one test never leak into another
  useSetupDraft.getState().reset();
  useSetupDraft.getState().patch({ targetJumps: 3 }); // the start-screen draft lives outside the component (WR-03)
  usePresentation.getState().reset(EMPTY_DISPLAYED, null); // no beats leak between tests
  fakeCanvas.reset();
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
    expect(screen.queryByText(seedContent().missions[0].name)).toBeNull();
    // The reskinned game view (SetupView, GameApp with no active game) is what mounts:
    // the original Phase 4 파워점핑 보드 대모험 logo + the --tap 게임 시작 button. The header logo's
    // aria-label is composed as '파워점핑 보드 대모험 {context} {subtitle}' (PowerJumpingLogo).
    expect(screen.getAllByText((_, el) => el?.classList.contains('pj-logo__word') === true && el.textContent?.replace(/\s+/g, ' ').trim() === '파워점핑 보드 대모험').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('파워점핑 보드 대모험 게임 주사위를 굴리고 줄넘기 미션으로 별을 모아요')).toBeInTheDocument();
    expect(document.querySelector('.app--game')).not.toBeNull();
    expect(document.querySelector('.panel--game-shell')).not.toBeNull();
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeInTheDocument();
  });

  it('adds a fullscreen playing shell class after the game starts on iPhone-sized layouts', async () => {
    const { container } = render(<App />);
    expect(container.querySelector('.app--playing')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    await waitFor(() => expect(container.querySelector('.app')?.className).toContain('app--playing'));
    expect(container.querySelector('.game-stage')).not.toBeNull();
  });

  it('opens one nominated opportunity, returns to teacher selection and ends manually', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    await waitForCanvas();
    expect(screen.queryByRole('button', {name:'🎲 주사위 굴리기'})).toBeNull();
    expect(container.querySelector('.game-round')).toBeNull();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', {name:'플레이어 2 지목하기'}));
    act(() => { vi.advanceTimersByTime(INPUT_LOCK_MS); });
    expect(useGameStore.getState().game!.currentIndex).toBe(1);
    expect(screen.queryByRole('button', {name:'플레이어 1 지목하기'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'🎲 주사위 굴리기'}));
    settle();
    if (screen.queryByRole('button', {name:'✅ 성공'})) {
      act(() => { vi.advanceTimersByTime(INPUT_LOCK_MS); });
      fireEvent.click(screen.getByRole('button', {name:'✅ 성공'}));
      settle();
    }
    expect(screen.queryByRole('button', {name:'🎲 주사위 굴리기'})).toBeNull();
    expect(screen.getByRole('button', {name:'플레이어 2 지목하기'})).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(INPUT_LOCK_MS); });
    fireEvent.click(screen.getByRole('button', {name:'플레이어 2 지목하기'}));
    expect(useGameStore.getState().game!.currentIndex).toBe(1);
    fireEvent.click(screen.getByRole('button', {name:'지금 끝내기'}));
    fireEvent.click(screen.getByRole('button', {name:'게임 끝내기'}));
    expect(screen.getByText('게임 끝!')).toBeInTheDocument();
    expect(screen.getByText('모은 별로 우승을 정했어요!')).toBeInTheDocument();
    expect(fakeCanvas.mounts).toBe(1);
    act(() => { vi.advanceTimersByTime(INPUT_LOCK_MS); });
    fireEvent.click(screen.getByRole('button', {name:'🔁 다시 하기'}));
    expect(screen.getByText('선생님 지목 대기')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'🎲 주사위 굴리기'})).toBeNull();
    expect(fakeCanvas.mounts).toBe(1);
    vi.useRealTimers();
  });

  it('runs sequential play through all participants and ends at the selected round', async () => {
    useSettings.setState({defaultRounds:1, failRule:'noStar'});
    const {container} = render(<App />);
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    await waitForCanvas();
    expect(screen.queryByRole('button', {name:'플레이어 1 지목하기'})).toBeNull();
    expect(container.querySelector('.game-round')).toHaveTextContent('1/1');
    const participants = new Set<string>();
    const labels = ['🎲 주사위 굴리기', '✅ 성공', '🔁 한 번 더 하기', '다음 ➡️', '🏆 결과 보기'];
    vi.useFakeTimers();
    for (let i=0;i<40 && useGameStore.getState().game!.phase !== 'gameOver';i++) {
      settle();
      const game = useGameStore.getState().game!;
      if (game.phase === 'awaitingRoll') participants.add(game.config.participants[game.currentIndex].id);
      act(() => {vi.advanceTimersByTime(INPUT_LOCK_MS);});
      const button = labels.map(name=>screen.queryByRole('button',{name})).find(Boolean);
      expect(button).toBeTruthy();
      fireEvent.click(button!);
    }
    settle();
    expect(participants.size).toBe(2);
    expect(useGameStore.getState().game!.endReason).toBe('rounds-complete');
    expect(screen.getByText('1라운드를 모두 마쳤어요!')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('keeps the 편집기 reachable via the mode switch', () => {
    render(<App />);
    enterEditor();
    expect(modeSwitch().getByRole('button', { name: '✏️ 편집기' }).className).toContain('active');
    expect(document.querySelector('.app--editor')).not.toBeNull();
    expect(document.querySelector('.panel--editor-shell')).not.toBeNull();
    expect(screen.getByText(seedContent().missions[0].name)).toBeInTheDocument();
  });
});

// WR-03: the start screen tells the instructor to change rules in the 편집기 (RULES_HINT). Switching
// views unmounts the start screen, so the typed setup must live outside it to survive the trip.
describe('App shell — the start-screen draft survives the 편집기 (WR-03)', () => {
  beforeEach(resetToSeed);

  function enterGame() {
    fireEvent.click(modeSwitch().getByRole('button', { name: '🎮 게임' }));
  }

  it('keeps mode, count, names, members and animal picks across 편집기 → 게임', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    fireEvent.click(screen.getByRole('button', { name: '늘리기' }));
    fireEvent.change(screen.getByLabelText('팀 1 이름'), { target: { value: '하늘' } });
    fireEvent.change(screen.getByLabelText('팀 1 멤버 이름'), { target: { value: '민수, 지아' } });
    fireEvent.change(screen.getByLabelText('팀 3 이름'), { target: { value: '숲' } });
    fireEvent.click(within(screen.getByRole('group', { name: '팀 2 동물' })).getByRole('button', { name: '판다' }));

    enterEditor();
    expect(screen.queryByRole('button', { name: '게임 시작' })).toBeNull();
    enterGame();

    expect(screen.getByRole('button', { name: '팀전' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('팀 수')).toHaveValue(3);
    expect(screen.getByLabelText('팀 1 이름')).toHaveValue('하늘');
    expect(screen.getByLabelText('팀 1 멤버 이름')).toHaveValue('민수, 지아');
    expect(screen.getByLabelText('팀 3 이름')).toHaveValue('숲');
    expect(within(screen.getByRole('group', { name: '팀 2 동물' })).getByRole('button', { name: '판다' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByLabelText('라운드 수')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    const g = useGameStore.getState().game!;
    expect(g.config.mode).toBe('team');
    expect(g.config.rules.nomination).toBe(true);
    expect(g.config.participants.map((p) => [p.name, p.animal])).toEqual([
      ['하늘', 'bear'],
      ['팀 2', 'panda'],
      ['숲', 'cat'],
    ]);
    expect(g.config.participants[0].memberNames).toEqual(['민수', '지아']);
  });

  it('keeps teacher selection even after changing legacy round defaults in settings', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('플레이어 1 이름'), {target:{value:'하늘'}});
    enterEditor();
    fireEvent.click(screen.getByRole('tab', {name:'⚙️ 설정'}));
    fireEvent.click(screen.getByRole('button', {name:'라운드 늘리기'}));
    enterGame();
    expect(screen.getByLabelText('플레이어 1 이름')).toHaveValue('하늘');
    expect(screen.queryByLabelText('라운드 수')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    expect(useGameStore.getState().game!.phase).toBe('awaitingNomination');
  });

  it('starting a game consumes the draft: 처음으로 opens a fresh start screen', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('플레이어 1 이름'), { target: { value: '하늘' } });
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    act(() => {
      useGameStore.getState().reset(); // 처음으로
    });
    expect(screen.getByLabelText('플레이어 1 이름')).toHaveValue('');
  });
});

describe('App shell (two-tab read-only viewer)', () => {
  beforeEach(resetToSeed);

  it('renders every current seed mission and its count pill', () => {
    render(<App />);
    enterEditor();
    for (const name of seedContent().missions.map((mission) => mission.name)) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const missionTab = screen.getByRole('tab', { name: /미션/ });
    expect(within(missionTab).getByText(String(seedContent().missions.length))).toBeInTheDocument();
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

describe('편집기 ⚙️ 설정 탭 (D-23)', () => {
  beforeEach(resetToSeed);

  it('⚙️ 설정 탭을 누르면 게임 설정 화면이 보이고 미션 목록은 사라진다', () => {
    render(<App />);
    enterEditor();
    expect(screen.getByText(seedContent().missions[0].name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '⚙️ 설정' }));
    expect(screen.getByRole('heading', { name: '⚙️ 게임 설정' })).toBeVisible();
    expect(screen.queryByText(seedContent().missions[0].name)).toBeNull();
  });
});


describe('opening target die and game rules', () => {
  beforeEach(resetToSeed);
  it('requires the opening roll and locks its result into the running game', () => {
    useSetupDraft.getState().patch({targetJumps:null});
    render(<App />);
    vi.useFakeTimers();
    try {
      expect(screen.getByRole('button', {name:'게임 시작'})).toBeDisabled();
      fireEvent.click(screen.getByRole('button', {name:'오늘의 횟수 주사위 굴리기'}));
      act(() => {vi.advanceTimersByTime(1000);});
      const target = useSetupDraft.getState().targetJumps!;
      expect(target).toBeGreaterThanOrEqual(5);
      expect(target).toBeLessThanOrEqual(12);
      expect(screen.getByRole('button', {name:'이 게임의 횟수 확정'})).toBeDisabled();
      fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
      expect(useGameStore.getState().game!.config.rules.targetJumps).toBe(target);
      expect(screen.getByLabelText('이 게임의 넘기 횟수')).toHaveTextContent('오늘은 '+target+'번 넘기!');
      expect(screen.queryByRole('button', {name:'오늘의 횟수 주사위 굴리기'})).toBeNull();
      expect(screen.queryByRole('button', {name:'소리 확인'})).toBeNull();
    } finally {vi.useRealTimers();}
  });
});
