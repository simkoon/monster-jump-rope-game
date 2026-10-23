import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSettings,
  SettingsSchema,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  ROUNDS_MIN,
  ROUNDS_MAX,
  DEFAULT_ROUNDS,
} from './settings';
import { importContent } from './lib/io';
import { seedContent } from './seed';
import { CONTENT_KEY } from './test/fixtures/v1';

function resetSettings() {
  localStorage.clear();
  useSettings.setState(DEFAULT_SETTINGS);
  localStorage.clear(); // setState above persists defaults — start each test from an empty storage
}

function readStoredSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw === null ? null : JSON.parse(raw);
}

function pickSettings() {
  const { failRule, defaultRounds, startBonus, boardSize, soundOn } = useSettings.getState();
  return { failRule, defaultRounds, startBonus, boardSize, soundOn };
}

describe('SettingsSchema (필드별 복구, D-06/D-19)', () => {
  it('빈 객체 → 기본값 retrySame / 5 / 1 / 20 / 효과음 켜짐', () => {
    expect(SettingsSchema.parse({})).toEqual({
      failRule: 'retrySame',
      defaultRounds: 5,
      startBonus: 1,
      boardSize: 20,
      soundOn: true,
    });
    expect(DEFAULT_SETTINGS).toEqual({
      failRule: 'retrySame',
      defaultRounds: 5,
      startBonus: 1,
      boardSize: 20,
      soundOn: true,
    });
    expect([ROUNDS_MIN, ROUNDS_MAX, DEFAULT_ROUNDS]).toEqual([1, 20, 5]);
  });

  it('잘못된 필드만 기본값으로 복구하고, 정상 필드는 유지하며, 모르는 키는 버린다', () => {
    expect(
      SettingsSchema.parse({ failRule: 'bogus', defaultRounds: 99, startBonus: 2, boardSize: 18, extra: 1 }),
    ).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 2, boardSize: 20, soundOn: true });
  });

  // D-20: soundOn — missing or corrupted → on; a real false stays false.
  it.each([
    [undefined, true],
    ['yes', true],
    [0, true],
    [null, true],
    [true, true],
    [false, false],
  ])('soundOn %p → %p', (v, expected) => {
    expect(SettingsSchema.parse({ soundOn: v }).soundOn).toBe(expected);
  });

  it.each([0, 21, 2.5, '5'])('defaultRounds %p → 5로 복구', (v) => {
    expect(SettingsSchema.parse({ defaultRounds: v }).defaultRounds).toBe(5);
  });

  it.each([1, 20])('defaultRounds %p 는 유지', (v) => {
    expect(SettingsSchema.parse({ defaultRounds: v }).defaultRounds).toBe(v);
  });

  it.each([null, 'x', []])('비객체 %p → safeParse 실패 (merge가 기본값 유지)', (v) => {
    expect(SettingsSchema.safeParse(v).success).toBe(false);
  });
});

describe('useSettings 액션', () => {
  beforeEach(resetSettings);

  it('setDefaultRounds는 1~20으로 클램프하고 반올림한다', () => {
    const { setDefaultRounds } = useSettings.getState();
    setDefaultRounds(0);
    expect(useSettings.getState().defaultRounds).toBe(1);
    setDefaultRounds(25);
    expect(useSettings.getState().defaultRounds).toBe(20);
    setDefaultRounds(3.6);
    expect(useSettings.getState().defaultRounds).toBe(4);
    setDefaultRounds(Number.NaN);
    expect(useSettings.getState().defaultRounds).toBe(DEFAULT_ROUNDS);
  });

  it('setFailRule / setStartBonus / setBoardSize가 값을 바꾼다', () => {
    const s = useSettings.getState();
    s.setFailRule('noStar');
    s.setStartBonus(0);
    s.setBoardSize(16);
    expect(pickSettings()).toEqual({ failRule: 'noStar', defaultRounds: 5, startBonus: 0, boardSize: 16, soundOn: true });
  });

  it('setSoundOn이 효과음을 끄고 켠다 (D-20)', () => {
    useSettings.getState().setSoundOn(false);
    expect(useSettings.getState().soundOn).toBe(false);
    useSettings.getState().setSoundOn(true);
    expect(useSettings.getState().soundOn).toBe(true);
  });
});

describe('설정 저장·복구 (DATA-07)', () => {
  beforeEach(resetSettings);

  it('액션 후 별도 키에 5개 필드만 version 1 래퍼로 저장된다 (액션 함수 미저장)', () => {
    useSettings.getState().setFailRule('retryNew');
    const stored = readStoredSettings();
    expect(stored.version).toBe(1);
    expect(stored.state).toEqual({ failRule: 'retryNew', defaultRounds: 5, startBonus: 1, boardSize: 20, soundOn: true });
    expect(Object.keys(stored.state).sort()).toEqual(['boardSize', 'defaultRounds', 'failRule', 'soundOn', 'startBonus']);
  });

  it('setSoundOn(false)는 같은 키·version 1에 5개 필드로 저장되고 콘텐츠 키는 쓰지 않는다 (D-20)', () => {
    useSettings.getState().setSoundOn(false);
    const stored = readStoredSettings();
    expect(stored.version).toBe(1);
    expect(stored.state).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 1, boardSize: 20, soundOn: false });
    expect(Object.keys(stored.state)).toHaveLength(5);
    expect(localStorage.getItem(CONTENT_KEY)).toBeNull();
  });

  it('soundOn이 없는 예전 저장분은 효과음 켜짐으로 복구되고 나머지 필드는 유지된다 (버전 그대로)', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      '{"state":{"failRule":"noStar","defaultRounds":8,"startBonus":0,"boardSize":16},"version":1}',
    );
    useSettings.setState({ soundOn: false }); // the rehydrated value must come from the schema, not memory
    await useSettings.persist.rehydrate();
    expect(pickSettings()).toEqual({ failRule: 'noStar', defaultRounds: 8, startBonus: 0, boardSize: 16, soundOn: true });
  });

  it('저장된 soundOn false는 새로고침 뒤에도 유지되고, 손상된 soundOn은 켜짐이 된다', async () => {
    localStorage.setItem(SETTINGS_KEY, '{"state":{"soundOn":false},"version":1}');
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().soundOn).toBe(false);

    localStorage.setItem(SETTINGS_KEY, '{"state":{"soundOn":"yes"},"version":1}');
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().soundOn).toBe(true);
  });

  it('손상된 원문을 rehydrate하면 손상 필드만 기본값으로 복구된다', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      '{"state":{"failRule":"x","defaultRounds":"many","startBonus":2,"boardSize":24},"version":1}',
    );
    await useSettings.persist.rehydrate();
    expect(pickSettings()).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 2, boardSize: 24, soundOn: true });
  });

  it('state가 객체가 아니면 전부 기본값 (merge가 throw 없이 부팅 기본값을 유지)', async () => {
    // 부팅 시점 in-memory 상태 = DEFAULT_SETTINGS (resetSettings가 재현). merge는 실패 시 current를 돌려준다.
    localStorage.setItem(SETTINGS_KEY, '{"state":null,"version":1}');
    await useSettings.persist.rehydrate();
    expect(pickSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('설정 액션은 콘텐츠 키를 절대 쓰지 않는다', () => {
    const s = useSettings.getState();
    s.setFailRule('retryNew');
    s.setDefaultRounds(7);
    s.setStartBonus(2);
    s.setBoardSize(24);
    s.setSoundOn(false);
    expect(localStorage.getItem(CONTENT_KEY)).toBeNull();
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
  });

  it('확인된 백업 가져오기는 설정을 바꾸지 않는다', async () => {
    const s = useSettings.getState();
    s.setFailRule('retryNew');
    s.setDefaultRounds(9);
    s.setStartBonus(2);
    s.setBoardSize(24);
    s.setSoundOn(false);
    const before = pickSettings();

    const file = new File([JSON.stringify(seedContent())], 'content.json', { type: 'application/json' });
    const proceeded = await new Promise<boolean>((resolve) => {
      importContent(file, {
        onNeedConfirm: (proceed) => {
          proceed();
          resolve(true);
        },
      });
      setTimeout(() => resolve(false), 200);
    });

    expect(proceeded).toBe(true);
    expect(pickSettings()).toEqual(before);
    expect(before).toEqual({ failRule: 'retryNew', defaultRounds: 9, startBonus: 2, boardSize: 24, soundOn: false });
  });
});
