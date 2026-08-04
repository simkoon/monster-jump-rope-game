// src/game/hud/hud.test.tsx — child play HUD (03-02, ART-04/D-07). jsdom/RTL, no WebGL:
// the <Canvas> is mocked so PlayView mounts headlessly. Asserts the phase→visible-controls
// mapping, busy-gating (D-07), difficulty/event copy, aria-live regions, and that PRIMARY
// buttons carry the --tap sizing class (game-btn).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';

// Mock the R3F Canvas root — PlayView renders the DOM HUD; the 3D scene is not under test.
vi.mock('../scene/BoardScene', () => ({ default: () => null }));

import PlayView from '../PlayView';
import { useGameStore } from '../../harness/useGameStore';
import { usePresentation } from '../usePresentation';
import TurnHud from './TurnHud';
import MissionOverlay from './MissionOverlay';
import ControlsBar from './ControlsBar';
import DiceResultPanel from './DiceResultPanel';
import type {
  GameState,
  GameConfig,
  Participant,
  DrawnCard,
  LandingResult,
} from '../../engine/types';
import type { Mission, Difficulty } from '../../schema';

const participant = (
  id: string,
  name: string,
  position = 0,
  memberNames: string[] = [name],
  memberTurnIndex = 0,
): Participant => ({ id, name, character: 'boy', position, memberNames, memberTurnIndex });

const baseConfig = (over: Partial<GameConfig> = {}): GameConfig => ({
  mode: 'solo',
  participants: [participant('p1', '가'), participant('p2', '나')],
  boardLength: 20,
  timeLimitMs: null,
  ...over,
});

const baseState = (over: Partial<GameState> = {}): GameState => ({
  phase: 'awaitingDraw',
  config: baseConfig(),
  boardEvents: [],
  currentIndex: 0,
  card: null,
  lastRoll: null,
  lastLanding: null,
  winners: [],
  endReason: null,
  ...over,
});

const mission = (diff: Difficulty = 'hard'): Mission => ({
  id: 'm1',
  name: '양발 모아뛰기',
  desc: '제자리에서 열 번 뛰기',
  diff,
  cats: [],
});

const card = (diff: Difficulty = 'hard'): DrawnCard => ({ mission: mission(diff) });

const landing = (over: Partial<LandingResult> = {}): LandingResult => ({
  eventId: null,
  eff: null,
  label: '',
  from: 3,
  to: 6,
  extraTurn: false,
  ...over,
});

function setGame(state: GameState, remainingMs: number | null = null) {
  useGameStore.setState({ game: state, remainingMs, startBlockedReason: null });
}

beforeEach(() => {
  useGameStore.setState({ game: null, remainingMs: null, startBlockedReason: null });
  usePresentation.setState({ busy: false });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PlayView HUD — phase → visible controls (FSM, ART-04/D-07)', () => {
  it('awaitingDraw shows 🎴 카드 뽑기', () => {
    setGame(baseState({ phase: 'awaitingDraw' }));
    render(<PlayView />);
    expect(screen.getByRole('button', { name: /카드 뽑기/ })).toBeInTheDocument();
  });

  it('awaitingJudgement shows the mission card + 성공/실패', () => {
    setGame(baseState({ phase: 'awaitingJudgement', card: card() }));
    render(<PlayView />);
    expect(screen.getByText('양발 모아뛰기')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /성공/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /실패/ })).toBeInTheDocument();
  });

  it('awaitingRoll shows 🎲 주사위 굴리기', () => {
    setGame(baseState({ phase: 'awaitingRoll', card: card() }));
    render(<PlayView />);
    expect(screen.getByRole('button', { name: /주사위 굴리기/ })).toBeInTheDocument();
  });

  it('turnResolved shows the dice result + 다음', () => {
    setGame(
      baseState({
        phase: 'turnResolved',
        lastRoll: 3,
        lastLanding: landing({ from: 3, to: 6 }),
      }),
    );
    render(<PlayView />);
    expect(screen.getByText(/🎲/)).toHaveTextContent('3');
    expect(screen.getByText(/3칸/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument();
  });

  it('hides the phase controls while busy is true (ANIM_DONE gating, D-07)', () => {
    setGame(baseState({ phase: 'awaitingRoll', card: card() }));
    usePresentation.setState({ busy: true });
    render(<PlayView />);
    expect(screen.queryByRole('button', { name: /주사위 굴리기/ })).toBeNull();
  });

  it('hides the mission overlay while busy is true', () => {
    setGame(baseState({ phase: 'awaitingJudgement', card: card() }));
    usePresentation.setState({ busy: true });
    render(<PlayView />);
    expect(screen.queryByRole('button', { name: /성공/ })).toBeNull();
  });

  it('mission success shows a short presentation reaction before awaitingRoll', () => {
    vi.useFakeTimers();
    setGame(baseState({ phase: 'awaitingJudgement', card: card() }));
    render(<PlayView />);
    fireEvent.click(screen.getByRole('button', { name: /성공/ }));
    expect(usePresentation.getState().busy).toBe(true);
    expect(useGameStore.getState().game?.phase).toBe('awaitingJudgement');
    act(() => vi.advanceTimersByTime(650));
    expect(usePresentation.getState().busy).toBe(false);
    expect(useGameStore.getState().game?.phase).toBe('awaitingRoll');
  });

  it('mission failure shows a short presentation reaction before advancing turn', () => {
    vi.useFakeTimers();
    setGame(baseState({ phase: 'awaitingJudgement', card: card() }));
    render(<PlayView />);
    fireEvent.click(screen.getByRole('button', { name: /실패/ }));
    expect(usePresentation.getState().busy).toBe(true);
    expect(useGameStore.getState().game?.currentIndex).toBe(0);
    act(() => vi.advanceTimersByTime(650));
    expect(usePresentation.getState().busy).toBe(false);
    expect(useGameStore.getState().game?.phase).toBe('awaitingDraw');
    expect(useGameStore.getState().game?.currentIndex).toBe(1);
  });

  it('the turn HUD exposes an aria-live region announcing the current turn', () => {
    setGame(baseState({ phase: 'awaitingDraw' }));
    const { container } = render(<PlayView />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(within(live as HTMLElement).getByText('가')).toBeInTheDocument();
  });
});

describe('ControlsBar — big-button sizing + phase mapping', () => {
  it('primary buttons carry the --tap sizing class (game-btn), not the --sm class (ART-04)', () => {
    const noop = () => {};
    render(
      <ControlsBar phase="awaitingDraw" busy={false} onDraw={noop} onRoll={noop} onNext={noop} />,
    );
    const btn = screen.getByRole('button', { name: /카드 뽑기/ });
    expect(btn.className).toContain('game-btn');
    expect(btn.className).not.toContain('game-btn--sm');
  });

  it('renders nothing while busy', () => {
    const noop = () => {};
    const { container } = render(
      <ControlsBar phase="awaitingRoll" busy={true} onDraw={noop} onRoll={noop} onNext={noop} />,
    );
    expect(container.querySelector('button')).toBeNull();
  });
});

describe('MissionOverlay — difficulty badge mapping + judge', () => {
  it.each([
    ['easy', '쉬움'],
    ['normal', '보통'],
    ['hard', '어려움'],
  ] as const)('%s → %s badge label', (diff, label) => {
    const onJudge = vi.fn();
    const { container } = render(<MissionOverlay mission={mission(diff)} onJudge={onJudge} />);
    const badge = container.querySelector('.game-diff-badge');
    expect(badge).toHaveTextContent(label);
    expect(badge?.className).toContain(diff);
  });

  it('성공/실패 call onJudge with the verdict; both are --tap primary buttons', () => {
    const onJudge = vi.fn();
    render(<MissionOverlay mission={mission()} onJudge={onJudge} />);
    const ok = screen.getByRole('button', { name: /성공/ });
    const no = screen.getByRole('button', { name: /실패/ });
    expect(ok.className).toContain('game-btn');
    expect(no.className).toContain('game-btn');
    fireEvent.click(ok);
    expect(onJudge).toHaveBeenCalledWith(true);
    fireEvent.click(no);
    expect(onJudge).toHaveBeenCalledWith(false);
  });
});

describe('DiceResultPanel — event-banner copy per effect (LOOP-07/08)', () => {
  it('forward → ➡️ N칸 앞으로! with the event delta', () => {
    render(<DiceResultPanel lastRoll={3} lastLanding={landing({ eff: 'forward', from: 3, to: 8 })} />);
    // from 3 + roll 3 = 6; event → 8 ⇒ delta 2.
    expect(screen.getByText(/앞으로!/)).toHaveTextContent('2칸 앞으로!');
  });

  it('backward → ⬅️ N칸 뒤로!', () => {
    render(<DiceResultPanel lastRoll={4} lastLanding={landing({ eff: 'backward', from: 5, to: 3 })} />);
    // from 5 + roll 4 = 9; event → 3 ⇒ delta -6.
    expect(screen.getByText(/뒤로!/)).toHaveTextContent('6칸 뒤로!');
  });

  it('extra → 🔁 한 번 더!', () => {
    render(
      <DiceResultPanel
        lastRoll={2}
        lastLanding={landing({ eff: 'extra', from: 4, to: 6, extraTurn: true })}
      />,
    );
    expect(screen.getByText(/한 번 더!/)).toBeInTheDocument();
  });

  it('renders a 🎁 보너스 chip when the landing carries the label', () => {
    render(
      <DiceResultPanel lastRoll={2} lastLanding={landing({ eff: 'forward', label: '보너스', from: 2, to: 6 })} />,
    );
    expect(screen.getByText(/보너스/)).toBeInTheDocument();
  });
});

describe('TurnHud — manual end gated by ConfirmDialog (threat T-03-04)', () => {
  it('shows the timer only when a limit is set and routes 마치기 through the confirm dialog', () => {
    const onManualEnd = vi.fn();
    render(
      <TurnHud
        currentName="가"
        isTeam={false}
        activeMember="가"
        timeLimitMs={60000}
        remainingMs={45000}
        onManualEnd={onManualEnd}
      />,
    );
    expect(screen.getByLabelText('남은 시간')).toHaveTextContent('00:45');
    // A stray tap opens the confirm dialog — it does NOT end the game yet.
    fireEvent.click(screen.getByRole('button', { name: /지금 순위로 마치기/ }));
    expect(onManualEnd).not.toHaveBeenCalled();
    // Confirming ends the game.
    fireEvent.click(screen.getByRole('button', { name: '마치기' }));
    expect(onManualEnd).toHaveBeenCalledTimes(1);
  });

  it('team mode announces the active member sub-line', () => {
    render(
      <TurnHud
        currentName="파랑팀"
        isTeam={true}
        activeMember="영희"
        timeLimitMs={null}
        remainingMs={null}
        onManualEnd={() => {}}
      />,
    );
    expect(screen.getByText(/영희/)).toBeInTheDocument();
    expect(screen.queryByLabelText('남은 시간')).toBeNull();
  });
});
