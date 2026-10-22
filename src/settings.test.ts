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
  const { failRule, defaultRounds, startBonus, boardSize } = useSettings.getState();
  return { failRule, defaultRounds, startBonus, boardSize };
}

describe('SettingsSchema (필드별 복구, D-06/D-19)', () => {
  it('빈 객체 → 기본값 retrySame / 5 / 1 / 20', () => {
    expect(SettingsSchema.parse({})).toEqual({
      failRule: 'retrySame',
      defaultRounds: 5,
      startBonus: 1,
      boardSize: 20,
    });
    expect(DEFAULT_SETTINGS).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 1, boardSize: 20 });
    expect([ROUNDS_MIN, ROUNDS_MAX, DEFAULT_ROUNDS]).toEqual([1, 20, 5]);
  });

  it('잘못된 필드만 기본값으로 복구하고, 정상 필드는 유지하며, 모르는 키는 버린다', () => {
    expect(
      SettingsSchema.parse({ failRule: 'bogus', defaultRounds: 99, startBonus: 2, boardSize: 18, extra: 1 }),
    ).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 2, boardSize: 20 });
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
    expect(pickSettings()).toEqual({ failRule: 'noStar', defaultRounds: 5, startBonus: 0, boardSize: 16 });
  });
});

describe('설정 저장·복구 (DATA-07)', () => {
  beforeEach(resetSettings);

  it('액션 후 별도 키에 4개 필드만 version 1 래퍼로 저장된다 (액션 함수 미저장)', () => {
    useSettings.getState().setFailRule('retryNew');
    const stored = readStoredSettings();
    expect(stored.version).toBe(1);
    expect(stored.state).toEqual({ failRule: 'retryNew', defaultRounds: 5, startBonus: 1, boardSize: 20 });
    expect(Object.keys(stored.state).sort()).toEqual(['boardSize', 'defaultRounds', 'failRule', 'startBonus']);
  });

  it('손상된 원문을 rehydrate하면 손상 필드만 기본값으로 복구된다', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      '{"state":{"failRule":"x","defaultRounds":"many","startBonus":2,"boardSize":24},"version":1}',
    );
    await useSettings.persist.rehydrate();
    expect(pickSettings()).toEqual({ failRule: 'retrySame', defaultRounds: 5, startBonus: 2, boardSize: 24 });
  });

  it('state가 객체가 아니면 전부 기본값', async () => {
    useSettings.setState({ failRule: 'noStar', defaultRounds: 9, startBonus: 0, boardSize: 16 });
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
    expect(localStorage.getItem(CONTENT_KEY)).toBeNull();
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
  });

  it('확인된 백업 가져오기는 설정을 바꾸지 않는다', async () => {
    const s = useSettings.getState();
    s.setFailRule('retryNew');
    s.setDefaultRounds(9);
    s.setStartBonus(2);
    s.setBoardSize(24);
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
    expect(before).toEqual({ failRule: 'retryNew', defaultRounds: 9, startBonus: 2, boardSize: 24 });
  });
});
