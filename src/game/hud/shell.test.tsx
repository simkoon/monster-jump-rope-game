// src/game/hud/shell.test.tsx — the Phase 5 start screen (S2: animals, rounds, estimate, rules
// summary, missing-content notices, start guard). Inputs come from useStore / useSettings.
// (The temporary result screen's tests moved to the Phase 8 ceremony tests — see the end of file.)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SetupView from './SetupView';
import { useStore } from '../../store';
import { useSettings, DEFAULT_SETTINGS } from '../../settings';
import { useGameStore } from '../../harness/useGameStore';
import { useSetupDraft } from '../useSetupDraft';
import { mission, event } from '../../engine/testkit';
import type { Event, Mission } from '../../schema';

const ALL_DIFFS: Mission[] = [mission('e', 'easy'), mission('n', 'normal'), mission('h', 'hard')];
const SOME_EVENTS: Event[] = [event('f', 'forward', 2, 1)];

function setContent(missions: Mission[], events: Event[] = SOME_EVENTS) {
  useStore.setState({ version: 1, categories: [], missions, events });
}

function resetAll() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useSetupDraft.getState().reset();
  useSetupDraft.getState().patch({ targetJumps: 3 }); // the start-screen draft lives outside the component (WR-03)
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

// WR-02: a <label> wrapping buttons forwards a caption tap to its first button (− / 개인전).
describe('SetupView — field captions are inert (WR-02)', () => {
  beforeEach(resetAll);

  it('tapping the 인원 수 / 팀 수 caption does not change the count', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByText('인원 수'));
    expect(screen.getByLabelText('인원 수')).toHaveValue(2);
    expect(screen.getByLabelText('플레이어 2 이름')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    fireEvent.click(screen.getByText('팀 수'));
    expect(screen.getByLabelText('팀 수')).toHaveValue(2);
  });

  it('tapping the 모드 caption does not switch the mode', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    fireEvent.click(screen.getByText('모드'));
    expect(screen.getByRole('button', { name: '팀전' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('팀 1 이름')).toBeInTheDocument();
  });

  it('the captions are not <label> elements', () => {
    const { container } = render(<SetupView />);
    expect(container.querySelector('label.game-setup-field')).toBeNull();
    expect(container.querySelectorAll('div.game-setup-field')).toHaveLength(3); // 진행 방식, 모드, 인원 수
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

describe('SetupView — teacher nomination', () => {
  beforeEach(resetAll);
  it('explains nomination without automatic rounds or time estimates', () => {
    render(<SetupView />);
    expect(screen.getByRole('heading', {name:'선생님 지목 방식'})).toBeInTheDocument();
    expect(screen.queryByLabelText('라운드 수')).toBeNull();
    expect(screen.queryByText(/라운드 기준/)).toBeNull();
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

  it('starts locked with the picked animals and typed names', () => {
    render(<SetupView />);
    fireEvent.change(screen.getByLabelText('플레이어 1 이름'), { target: { value: '하늘' } });
    fireEvent.change(screen.getByLabelText('플레이어 2 이름'), { target: { value: '바다' } });
    fireEvent.click(within(group('플레이어 2 동물')).getByRole('button', { name: '판다' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    const g = useGameStore.getState().game!;
    expect(g).not.toBeNull();
    expect(g.config.participants.map((p) => [p.name, p.animal])).toEqual([
      ['하늘', 'bear'],
      ['바다', 'panda'],
    ]);
    expect(g.config.rules.nomination).toBe(true);
    expect(g.phase).toBe('awaitingNomination');
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

// The temporary result screen (S4) became the Phase 8 ceremony: its tests moved to
// hud/ceremony.test.tsx (parts) and stage.test.tsx (routing, same canvas) — 08-10, RESEARCH Pitfall 1.


describe('SetupView — selectable play order', () => {
  beforeEach(resetAll);
  it('defaults to teacher nomination and only exposes round controls for sequential play', () => {
    render(<SetupView />);
    expect(screen.getByRole('button', {name:'선생님 지목'})).toHaveAttribute('aria-pressed','true');
    expect(screen.queryByLabelText('라운드 수')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    expect(screen.getByLabelText('라운드 수')).toHaveTextContent('5');
    expect(screen.getByText('2명 × 5라운드 기준')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    const game = useGameStore.getState().game!;
    expect(game.config.rules.nomination).toBe(false);
    expect(game.config.rules.rounds).toBe(5);
    expect(game.phase).toBe('awaitingRoll');
    expect(game.currentIndex).toBe(0);
  });
  it('preserves names, selected rounds and play order across mode switches and remounts', () => {
    const view = render(<SetupView />);
    fireEvent.change(screen.getByLabelText('플레이어 1 이름'),{target:{value:'하늘'}});
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    fireEvent.click(screen.getByRole('button', {name:'라운드 늘리기'}));
    fireEvent.click(screen.getByRole('button', {name:'선생님 지목'}));
    expect(screen.queryByLabelText('라운드 수')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    expect(screen.getByLabelText('라운드 수')).toHaveTextContent('6');
    view.unmount();
    render(<SetupView />);
    expect(screen.getByRole('button', {name:'한 명씩 차례대로'})).toHaveAttribute('aria-pressed','true');
    expect(screen.getByLabelText('라운드 수')).toHaveTextContent('6');
    expect(screen.getByLabelText('플레이어 1 이름')).toHaveValue('하늘');
  });
  it('clamps sequential rounds to 1 through 20 and does not persist them to settings', () => {
    useSettings.setState({defaultRounds:1});
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    expect(screen.getByRole('button', {name:'라운드 줄이기'})).toBeDisabled();
    for (let i=0;i<25;i++) fireEvent.click(screen.getByRole('button', {name:'라운드 늘리기'}));
    expect(screen.getByLabelText('라운드 수')).toHaveTextContent('20');
    expect(screen.getByRole('button', {name:'라운드 늘리기'})).toBeDisabled();
    expect(useSettings.getState().defaultRounds).toBe(1);
  });
  it('switching back to nomination keeps the game locked regardless of chosen rounds', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    fireEvent.click(screen.getByRole('button', {name:'라운드 늘리기'}));
    fireEvent.click(screen.getByRole('button', {name:'선생님 지목'}));
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    expect(useGameStore.getState().game!.phase).toBe('awaitingNomination');
    expect(useGameStore.getState().game!.config.rules.nomination).toBe(true);
  });
});


describe('SetupView — one fixed jump count before the game', () => {
  beforeEach(() => { resetAll(); useSetupDraft.getState().patch({ targetJumps: null }); });
  it('blocks game start until the target roll has completed', () => {
    render(<SetupView />);
    expect(screen.getByRole('button', {name:'게임 시작'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    expect(useGameStore.getState().game).toBeNull();
    expect(screen.getByRole('button', {name:'오늘의 횟수 주사위 굴리기'})).toBeEnabled();
  });
  it('keeps the decided count across play-order changes and editor remounts', () => {
    useSetupDraft.getState().patch({targetJumps:5});
    const view = render(<SetupView />);
    fireEvent.click(screen.getByRole('button', {name:'한 명씩 차례대로'}));
    expect(screen.getByText('오늘은 5번 넘기!')).toBeInTheDocument();
    view.unmount(); render(<SetupView />);
    expect(screen.getByRole('button', {name:'이 게임의 횟수 확정'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name:'게임 시작'}));
    expect(useGameStore.getState().game!.config.rules.targetJumps).toBe(5);
    expect(useSetupDraft.getState().targetJumps).toBeNull();
  });
});
