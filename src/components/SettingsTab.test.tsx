import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsTab from './SettingsTab';
import Header from './Header';
import { useSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../settings';
import { useGameStore } from '../harness/useGameStore';
import { useStore } from '../store';
import { seedContent } from '../seed';
import { useToastStore } from './Toast';

function resetAll() {
  localStorage.clear();
  useSettings.setState(DEFAULT_SETTINGS);
  useGameStore.setState({ game: null });
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
  localStorage.clear();
}

const FAIL_HINTS = {
  retrySame: '같은 미션에 한 번 더 도전해요. 또 실패하면 별 없이 다음 차례예요. (기본)',
  retryNew: '같은 난이도의 다른 미션으로 한 번 더 도전해요. 또 실패하면 별 없이 다음 차례예요.',
  noStar: '바로 다음 차례로 넘어가요. 모은 별은 줄지 않아요.',
};

const SOUND_HINTS = [
  '바로 적용돼요. 게임 화면 오른쪽 위 🔊 버튼으로도 켜고 끌 수 있어요.',
  '아이폰·아이패드는 무음 모드를 켜면 소리가 나지 않아요.',
  '성공 축하는 화면을 한 번 톡 치면 바로 넘어가요.',
];

describe('SettingsTab (S1, D-23, CFG-01~04)', () => {
  beforeEach(resetAll);

  it('제목·부제·그룹 라벨(순서)·하단 안내를 보여준다', () => {
    const { container } = render(<SettingsTab />);
    expect(screen.getByRole('heading', { name: '⚙️ 게임 설정' })).toBeInTheDocument();
    expect(screen.getByText('여기서 정한 규칙은 다음 게임부터 적용돼요.')).toBeInTheDocument();

    const labels = Array.from(container.querySelectorAll('.settings-group > label')).map((l) => l.textContent);
    expect(labels).toEqual(['미션에 실패하면', '기본 라운드 수', '출발 칸 보너스', '보드 크기', '효과음']);

    expect(
      screen.getByText('바꾸면 바로 저장돼요. 설정은 이 기기에만 저장되고, 내보내기 파일에는 들어가지 않아요.'),
    ).toBeInTheDocument();
  });

  it('실패 규칙 3택 + 선택값에 따라 힌트가 바뀌고, 즉시 별도 키에 저장된다 (CFG-01)', () => {
    render(<SettingsTab />);
    const group = screen.getByRole('group', { name: '실패 규칙' });
    const buttons = Array.from(group.querySelectorAll('button')).map((b) => b.textContent);
    expect(buttons).toEqual(['같은 미션 한 번 더', '다른 미션으로 한 번 더', '별 없이 다음 차례']);
    expect(screen.getByText(FAIL_HINTS.retrySame)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다른 미션으로 한 번 더' }));
    expect(useSettings.getState().failRule).toBe('retryNew');
    expect(localStorage.getItem(SETTINGS_KEY)).toContain('retryNew');
    expect(screen.getByText(FAIL_HINTS.retryNew)).toBeInTheDocument();
    expect(screen.queryByText(FAIL_HINTS.retrySame)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '별 없이 다음 차례' }));
    expect(useSettings.getState().failRule).toBe('noStar');
    expect(screen.getByText(FAIL_HINTS.noStar)).toBeInTheDocument();
  });

  it('라운드 스텝퍼: 5→6, 끝값에서 버튼 비활성, 단위·힌트 (CFG-02)', () => {
    render(<SettingsTab />);
    const dec = screen.getByRole('button', { name: '라운드 줄이기' });
    const inc = screen.getByRole('button', { name: '라운드 늘리기' });
    const out = screen.getByLabelText('기본 라운드 수', { selector: 'output' });
    expect(out.tagName).toBe('OUTPUT');
    expect(out).toHaveTextContent('5');
    expect(screen.getByText('라운드')).toBeInTheDocument();
    expect(screen.getByText('1~20라운드. 시작 화면에서 판마다 바꿀 수 있어요. (기본 5)')).toBeInTheDocument();

    fireEvent.click(inc);
    expect(useSettings.getState().defaultRounds).toBe(6);
    expect(out).toHaveTextContent('6');

    act(() => useSettings.getState().setDefaultRounds(20));
    expect(inc).toBeDisabled();
    expect(dec).not.toBeDisabled();

    act(() => useSettings.getState().setDefaultRounds(1));
    expect(dec).toBeDisabled();
    expect(inc).not.toBeDisabled();
  });

  it('출발 칸 보너스 끔/⭐ +1/⭐ +2 → 0/1/2 (CFG-03)', () => {
    render(<SettingsTab />);
    const group = screen.getByRole('group', { name: '출발 칸 보너스' });
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['끔', '⭐ +1', '⭐ +2']);
    expect(screen.getByText('출발 칸을 앞으로 지나가거나 멈추면 받는 별이에요. (기본 +1)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '끔' }));
    expect(useSettings.getState().startBonus).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '⭐ +2' }));
    expect(useSettings.getState().startBonus).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: '⭐ +1' }));
    expect(useSettings.getState().startBonus).toBe(1);
  });

  it('보드 크기 16칸/20칸/24칸 → 16/20/24 (CFG-04)', () => {
    render(<SettingsTab />);
    const group = screen.getByRole('group', { name: '보드 크기' });
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['16칸', '20칸', '24칸']);
    expect(screen.getByText('칸이 많을수록 한 바퀴가 길어요. (기본 20칸)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '24칸' }));
    expect(useSettings.getState().boardSize).toBe(24);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).state.boardSize).toBe(24);
    fireEvent.click(screen.getByRole('button', { name: '16칸' }));
    expect(useSettings.getState().boardSize).toBe(16);
  });

  it('효과음 🔊 켜기/🔇 끄기 + 힌트 3줄, 누르면 바로 저장된다 (AUDIO-02, D-20)', () => {
    render(<SettingsTab />);
    const group = screen.getByRole('group', { name: '효과음' });
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['🔊 켜기', '🔇 끄기']);
    expect(screen.getByRole('button', { name: '🔊 켜기' })).toHaveAttribute('aria-pressed', 'true');
    for (const h of SOUND_HINTS) expect(screen.getByText(h)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '🔇 끄기' }));
    expect(useSettings.getState().soundOn).toBe(false);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).state.soundOn).toBe(false);
    expect(screen.getByRole('button', { name: '🔇 끄기' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '🔊 켜기' }));
    expect(useSettings.getState().soundOn).toBe(true);
  });

  it('진행 중 게임이 있어도 효과음은 바로 바뀐다 (다음 판 스냅샷 없음, Pitfall 9)', () => {
    act(() => useGameStore.setState({ game: {} as never }));
    render(<SettingsTab />);
    expect(screen.getByText('지금 하고 있는 게임에는 적용되지 않아요. 다음 판부터 바뀌어요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🔇 끄기' }));
    expect(useSettings.getState().soundOn).toBe(false);
    expect(screen.getByText(SOUND_HINTS[0])).toBeInTheDocument();
  });

  it('진행 중 게임이 있을 때만 안내 배너를 보여준다', () => {
    const banner = '지금 하고 있는 게임에는 적용되지 않아요. 다음 판부터 바뀌어요.';
    render(<SettingsTab />);
    expect(screen.queryByText(banner)).toBeNull();

    act(() => useGameStore.setState({ game: {} as never }));
    expect(screen.getByText(banner)).toBeInTheDocument();

    act(() => useGameStore.setState({ game: null }));
    expect(screen.queryByText(banner)).toBeNull();
  });

  it('토스트와 "기본값으로 되돌리기" 버튼이 없다', () => {
    render(<SettingsTab />);
    expect(screen.queryByRole('button', { name: /기본값/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /저장/ })).toBeNull();
    const seqBefore = useToastStore.getState().seq;
    fireEvent.click(screen.getByRole('button', { name: '24칸' }));
    fireEvent.click(screen.getByRole('button', { name: '라운드 늘리기' }));
    fireEvent.click(screen.getByRole('button', { name: '별 없이 다음 차례' }));
    expect(useToastStore.getState().seq).toBe(seqBefore);
  });
});

describe('내보내기 파일에 설정이 들어가지 않는다 (DATA-07)', () => {
  let lastBlob: Blob | null = null;

  beforeEach(() => {
    resetAll();
    lastBlob = null;
    globalThis.URL.createObjectURL = vi.fn((b: Blob) => {
      lastBlob = b;
      return 'blob:mock';
    }) as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('설정을 바꾼 뒤 ⬇️ 내보내기 → JSON 키는 정확히 categories/events/missions/version', async () => {
    const s = useSettings.getState();
    s.setFailRule('noStar');
    s.setDefaultRounds(12);
    s.setStartBonus(2);
    s.setBoardSize(16);
    s.setSoundOn(false);

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: '⬇️ 내보내기' }));
    expect(lastBlob).not.toBeNull();

    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(lastBlob!);
    });
    const parsed = JSON.parse(text);
    expect(Object.keys(parsed).sort()).toEqual(['categories', 'events', 'missions', 'version']);
    for (const k of ['failRule', 'defaultRounds', 'startBonus', 'boardSize', 'soundOn']) {
      expect(text).not.toContain(k);
    }
  });
});
