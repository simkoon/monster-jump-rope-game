// src/game/hud/shell.test.tsx — the Phase 5 start screen (S2: animals, rounds, estimate, rules
// summary, missing-content notices, start guard) and the temporary result screen (S4: reason,
// single/co-winners, star standings, restart paths). Inputs come from useStore / useSettings;
// result states are built with the testkit + engine transitions.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SetupView from './SetupView';
import ResultView from './ResultView';
import GameApp from '../GameApp';
import { useStore } from '../../store';
import { useSettings, DEFAULT_SETTINGS } from '../../settings';
import { useGameStore } from '../../harness/useGameStore';
import { endGame, advanceTurn } from '../../engine/game';
import { makeGame, mission, event, player, patchParticipant } from '../../engine/testkit';
import type { Event, Mission } from '../../schema';
import type { GameState } from '../../engine/state';

const ALL_DIFFS: Mission[] = [mission('e', 'easy'), mission('n', 'normal'), mission('h', 'hard')];
const SOME_EVENTS: Event[] = [event('f', 'forward', 2, 1)];

function setContent(missions: Mission[], events: Event[] = SOME_EVENTS) {
  useStore.setState({ version: 1, categories: [], missions, events });
}

function resetAll() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  setContent(ALL_DIFFS);
}

const group = (name: string) => screen.getByRole('group', { name });

describe('SetupView — removed v1 controls + start button (D-25)', () => {
  beforeEach(resetAll);

  it('has no 남/여, 보드 길이 or time-limit controls; the start button reads 게임 시작', () => {
    const { container } = render(<SetupView />);
    expect(screen.queryByText('남')).toBeNull();
    expect(screen.queryByText('여')).toBeNull();
    expect(screen.queryByText('보드 길이')).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.getByRole('button', { name: '게임 시작' })).toHaveClass('game-btn', 'game-setup-start');
  });
});

describe('SetupView — animals (D-24, SETUP-07)', () => {
  beforeEach(resetAll);

  it('auto-assigns 🐻 and 🐰 to the default two rows and locks taken animals', () => {
    render(<SetupView />);
    const row1 = group('플레이어 1 동물');
    const row2 = group('플레이어 2 동물');
    expect(within(row1).getByRole('button', { name: '곰' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row2).getByRole('button', { name: '토끼' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row2).getByRole('button', { name: '곰 — 다른 친구가 골랐어요' })).toBeDisabled();
    expect(within(row1).getByRole('button', { name: '토끼 — 다른 친구가 골랐어요' })).toBeDisabled();
  });

  it('picking 🐱 in row 1 frees 곰 for row 2 (row 2 keeps 🐰)', () => {
    render(<SetupView />);
    fireEvent.click(within(group('플레이어 1 동물')).getByRole('button', { name: '고양이' }));
    const row2 = group('플레이어 2 동물');
    expect(within(row2).getByRole('button', { name: '곰' })).toBeEnabled();
    expect(within(row2).getByRole('button', { name: '토끼' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row2).getByRole('button', { name: '고양이 — 다른 친구가 골랐어요' })).toBeDisabled();
  });

  it('a new row gets the first unused animal; a dropped row’s pick is not resurrected', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: '늘리기' }));
    const row3 = group('플레이어 3 동물');
    expect(within(row3).getByRole('button', { name: '고양이' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(row3).getByRole('button', { name: '돼지' }));
    fireEvent.click(screen.getByRole('button', { name: '줄이기' }));
    expect(screen.queryByRole('group', { name: '플레이어 3 동물' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '늘리기' }));
    expect(within(group('플레이어 3 동물')).getByRole('button', { name: '고양이' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('each participant card shows the avatar emoji and the name input', () => {
    const { container } = render(<SetupView />);
    const cards = container.querySelectorAll('li.setup-participant');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.animal-avatar')!.textContent).toBe('🐻');
    expect(cards[1].querySelector('.animal-avatar')!.textContent).toBe('🐰');
    expect(screen.getByLabelText('플레이어 1 이름')).toBeInTheDocument();
    fireEvent.click(within(group('플레이어 1 동물')).getByRole('button', { name: '여우' }));
    expect(cards[0].querySelector('.animal-avatar')!.textContent).toBe('🦊');
  });

  it('team mode labels the cards 팀 N', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    expect(group('팀 1 동물')).toBeInTheDocument();
    expect(screen.getByLabelText('팀 2 이름')).toBeInTheDocument();
  });
});

describe('SetupView — rounds + estimate (D-19, D-20, SETUP-08)', () => {
  beforeEach(resetAll);

  it('the stepper starts at the settings default and later settings changes do not move it', () => {
    useSettings.setState({ defaultRounds: 7 });
    render(<SetupView />);
    const out = screen.getByLabelText('라운드 수');
    expect(out.textContent).toBe('7');
    useSettings.setState({ defaultRounds: 3 });
    expect(screen.getByLabelText('라운드 수').textContent).toBe('7');
  });

  it('clamps to 1..20 with the end buttons disabled', () => {
    useSettings.setState({ defaultRounds: 1 });
    const { unmount } = render(<SetupView />);
    expect(screen.getByRole('button', { name: '라운드 줄이기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '라운드 늘리기' }));
    expect(screen.getByLabelText('라운드 수').textContent).toBe('2');
    unmount();
    useSettings.setState({ defaultRounds: 20 });
    render(<SetupView />);
    expect(screen.getByRole('button', { name: '라운드 늘리기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '라운드 줄이기' })).toBeEnabled();
  });

  it('estimate: 2×5 → 8분, 3 players → 12분; team basis uses 팀', () => {
    render(<SetupView />);
    expect(screen.getByText('⏱️ 약 8분')).toHaveClass('setup-estimate');
    expect(screen.getByText('2명 × 5라운드 기준')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '늘리기' }));
    expect(screen.getByText('⏱️ 약 12분')).toBeInTheDocument();
    expect(screen.getByText('3명 × 5라운드 기준')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    expect(screen.getByText('3팀 × 5라운드 기준')).toBeInTheDocument();
  });
});

describe('SetupView — rules summary + notices + guard (D-13, D-25, SETUP-09)', () => {
  beforeEach(resetAll);

  it('shows the read-only rules summary and the settings hint', () => {
    render(<SetupView />);
    expect(screen.getByText('20칸 보드 · 출발 보너스 ⭐+1 · 실패하면 같은 미션 한 번 더')).toBeInTheDocument();
    expect(screen.getByText('규칙은 편집기 › ⚙️ 설정에서 바꿀 수 있어요.')).toBeInTheDocument();
  });

  it('follows live settings in the summary', () => {
    useSettings.setState({ boardSize: 16, startBonus: 2, failRule: 'retryNew' });
    render(<SetupView />);
    expect(screen.getByText('16칸 보드 · 출발 보너스 ⭐+2 · 실패하면 다른 미션으로 한 번 더')).toBeInTheDocument();
  });

  it('easy-only missions → difficulty notice, start still enabled', () => {
    setContent([mission('e', 'easy')]);
    render(<SetupView />);
    expect(screen.getByText('💡 보통·어려움 미션이 없어서 보통·어려움 칸 없이 판을 만들어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
  });

  it('all events weight 0 → event notice, start still enabled', () => {
    setContent(ALL_DIFFS, [event('z', 'forward', 2, 0)]);
    render(<SetupView />);
    expect(screen.getByText('💡 놓을 수 있는 이벤트가 없어서 이벤트 칸 없이 판을 만들어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
  });

  it('no missions → guard text, start disabled, no difficulty notice', () => {
    setContent([]);
    render(<SetupView />);
    expect(screen.getByText('미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.')).toHaveClass('game-setup-guard');
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.queryByText(/💡 .*미션이 없어서/)).toBeNull();
  });

  it('complete content → no notice box', () => {
    const { container } = render(<SetupView />);
    expect(container.querySelector('.setup-notice')).toBeNull();
  });
});

describe('SetupView — start (SETUP-07/08)', () => {
  beforeEach(resetAll);

  it('starts a game with the picked animals, typed names and the stepper rounds', () => {
    render(<SetupView />);
    fireEvent.change(screen.getByLabelText('플레이어 1 이름'), { target: { value: '하늘' } });
    fireEvent.change(screen.getByLabelText('플레이어 2 이름'), { target: { value: '바다' } });
    fireEvent.click(within(group('플레이어 2 동물')).getByRole('button', { name: '판다' }));
    fireEvent.click(screen.getByRole('button', { name: '라운드 줄이기' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    const g = useGameStore.getState().game!;
    expect(g).not.toBeNull();
    expect(g.config.participants.map((p) => [p.name, p.animal])).toEqual([
      ['하늘', 'bear'],
      ['바다', 'panda'],
    ]);
    expect(g.config.rules.rounds).toBe(4);
  });

  it('team mode parses the comma member list; empty names fall back to the placeholder', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    fireEvent.change(screen.getByLabelText('팀 1 멤버 이름'), { target: { value: '민수, 지아 ,, 하준' } });
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    const g = useGameStore.getState().game!;
    expect(g.config.mode).toBe('team');
    expect(g.config.participants[0].memberNames).toEqual(['민수', '지아', '하준']);
    expect(g.config.participants[1].name).toBe('팀 2');
    expect(g.config.participants[1].memberNames).toEqual(['팀 2']);
  });
});

// ---------- ResultView (S4) ----------

function over(g: GameState): GameState {
  return endGame(g, 'manual');
}

function setGame(g: GameState) {
  useGameStore.setState({ game: g, startBlockedReason: null });
}

const three = () => [player('p1', '하늘', 'bear'), player('p2', '바다', 'cat'), player('p3', '숲', 'fox')];

function withStars(g: GameState, stars: number[]): GameState {
  return stars.reduce((s, n, i) => patchParticipant(s, i, { stars: n }), g);
}

describe('ResultView (D-27, ROUND-03)', () => {
  beforeEach(resetAll);

  it('manual end, single winner, ranked standings, no radios', () => {
    setGame(over(withStars(makeGame({ participants: three() }), [2, 5, 1])));
    const { container } = render(<ResultView />);
    expect(screen.getByRole('heading', { name: '게임 끝!' })).toBeInTheDocument();
    expect(screen.getByText('게임을 일찍 마쳤어요!')).toBeInTheDocument();
    expect(screen.getByText('🏆 우승! 🐱 바다')).toHaveClass('game-result-winner');
    const rows = Array.from(container.querySelectorAll('ol.game-result-standings li'));
    expect(rows.map((r) => r.textContent)).toEqual(['1등 🐱 바다 ⭐5', '2등 🐻 하늘 ⭐2', '3등 🦊 숲 ⭐1']);
    expect(rows[0]).toHaveClass('is-winner');
    expect(rows[1]).not.toHaveClass('is-winner');
    expect(container.querySelector('input[type="radio"]')).toBeNull();
  });

  it('co-winners share rank 1 and the next rank is 3', () => {
    setGame(over(withStars(makeGame({ participants: three() }), [4, 4, 1])));
    const { container } = render(<ResultView />);
    expect(screen.getByText('🏆 공동 우승! 🐻 하늘, 🐱 바다')).toBeInTheDocument();
    const rows = Array.from(container.querySelectorAll('ol.game-result-standings li'));
    expect(rows.map((r) => r.textContent)).toEqual(['1등 🐻 하늘 ⭐4', '1등 🐱 바다 ⭐4', '3등 🦊 숲 ⭐1']);
    expect(rows.filter((r) => r.classList.contains('is-winner'))).toHaveLength(2);
  });

  it('rounds-complete reason names the round count', () => {
    let g = makeGame({ rules: { rounds: 1 }, patch: (s) => ({ ...s, phase: 'turnResolved' }) });
    g = advanceTurn(g); // P1 → P2
    g = { ...g, phase: 'turnResolved' };
    g = advanceTurn(g); // last turn of the last round → rounds-complete
    expect(g.endReason).toBe('rounds-complete');
    setGame(g);
    render(<ResultView />);
    expect(screen.getByText('1라운드를 모두 마쳤어요!')).toHaveClass('game-result-reason');
  });

  it('🔁 다시 하기 restarts with the same participants, animals and rounds', () => {
    setGame(over(withStars(makeGame({ participants: three(), rules: { rounds: 4 } }), [2, 5, 1])));
    render(<ResultView />);
    fireEvent.click(screen.getByRole('button', { name: '🔁 다시 하기' }));
    const g = useGameStore.getState().game!;
    expect(g.phase).toBe('awaitingRoll');
    expect(g.config.rules.rounds).toBe(4);
    expect(g.config.participants.map((p) => [p.id, p.animal])).toEqual([
      ['p1', 'bear'],
      ['p2', 'cat'],
      ['p3', 'fox'],
    ]);
    expect(g.config.participants.every((p) => p.stars === 0)).toBe(true);
  });

  it('처음으로 returns to the start screen', () => {
    setGame(over(makeGame()));
    render(<GameApp />);
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(useGameStore.getState().game).toBeNull();
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeInTheDocument();
  });
});
