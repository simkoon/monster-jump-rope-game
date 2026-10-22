// src/dataPreservation.test.ts — v1 강사 데이터 보존 (D-05, DATA-05) + 콘텐츠 저장 계약 tripwire (D-04).
//
// 이 파일에서는 ./store · ./schema를 반드시 동적 import로만 쓴다 (RESEARCH Pitfall 1):
// 정적 import한 스토어는 모듈 로드 시점에 이미 수화가 끝나 있어서, 그 뒤에 넣은
// localStorage 픽스처를 전혀 검증하지 못한다. 각 테스트는 원문을 넣고
// vi.resetModules() 후 새로 import해 "앱 부팅 시점의 수화"를 그대로 재현한다.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CONTENT_KEY,
  V1_CONTENT,
  V1_LOCALSTORAGE_RAW,
  V1_LOCALSTORAGE_MINIMAL_RAW,
} from './test/fixtures/v1';

async function bootWith(raw: string | null) {
  localStorage.clear();
  if (raw !== null) localStorage.setItem(CONTENT_KEY, raw);
  vi.resetModules();
  const { useStore } = await import('./store');
  return useStore;
}

describe('v1 기기 저장분 부팅 (DATA-05)', () => {
  beforeEach(() => localStorage.clear());

  it('(a) v1 원문으로 부팅하면 미션·이벤트·카테고리가 원문과 같고 저장소를 다시 쓰지 않는다', async () => {
    const useStore = await bootWith(V1_LOCALSTORAGE_RAW);
    const s = useStore.getState();
    expect(s.missions).toEqual(V1_CONTENT.missions);
    expect(s.events).toEqual(V1_CONTENT.events);
    expect(s.categories).toEqual(V1_CONTENT.categories);
    // 같은 persist version → migrate·setItem 없음 → 원문 바이트 그대로.
    expect(localStorage.getItem(CONTENT_KEY)).toBe(V1_LOCALSTORAGE_RAW);
  });

  it('(b) 부팅 후 첫 편집도 v1 미션·이벤트를 하나도 지우지 않는다', async () => {
    const useStore = await bootWith(V1_LOCALSTORAGE_RAW);
    useStore.getState().addMission({ id: 'new-1', name: '새 미션', desc: '', diff: 'easy', cats: [] });

    const stored = JSON.parse(localStorage.getItem(CONTENT_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.state.version).toBe(1);
    expect(stored.state.missions.length).toBe(8);
    const ids = stored.state.missions.map((m: { id: string }) => m.id);
    for (let n = 1; n <= 7; n++) expect(ids).toContain(`v1-m-00${n}`);
    expect(stored.state.events).toEqual(V1_CONTENT.events);
    expect(Object.keys(stored.state).sort()).toEqual(['categories', 'events', 'missions', 'version']);
  });

  it('(c) 선택 필드가 빠진 옛 저장분은 기본값이 채워진 채로 부팅된다 (시드로 떨어지지 않음)', async () => {
    const useStore = await bootWith(V1_LOCALSTORAGE_MINIMAL_RAW);
    const s = useStore.getState();
    expect(s.missions).toEqual([{ id: 'old-1', name: '옛 미션', desc: '', diff: 'normal', cats: [] }]);
    expect(s.events).toHaveLength(1);
    expect(s.events[0].id).toBe('old-e');
    expect(s.events[0].label).toBe('');
    expect(s.categories).toEqual(['기초']);
  });

  it('(d) 손상된 원문은 메모리에서 시드로 부팅하고, 편집 전까지 저장 원문을 건드리지 않는다', async () => {
    const corrupt = '{"state":{"version":1,"missions":"broken"},"version":1}';
    const useStore = await bootWith(corrupt);
    const { seedContent } = await import('./seed');
    const seed = seedContent();
    const s = useStore.getState();
    expect(s.categories).toEqual(seed.categories);
    expect(s.missions.map((m) => m.name)).toEqual(seed.missions.map((m) => m.name));
    expect(s.events.map((e) => e.name)).toEqual(seed.events.map((e) => e.name));
    expect(localStorage.getItem(CONTENT_KEY)).toBe(corrupt);
  });
});

describe('콘텐츠 저장 계약 tripwire (D-04)', () => {
  // ⚠️ 이 테스트가 실패하면 콘텐츠 저장 형식이 바뀌었다는 뜻이다.
  // persist name/version 또는 Content/Mission/EventSchema 모양이 바뀌면 v1 저장분이
  // merge 단계에서 떨어져 시드로 부팅되고, 강사의 다음 편집이 원본을 덮어써 지운다
  // (RESEARCH Pattern 1 §5). 커밋 해시와 무관한 내용 단언이라 이후 모든 계획의
  // 전체 테스트 게이트에서 다시 돈다. 테스트를 고치지 말고 형식 변경을 되돌릴 것.
  it('(e) persist 키·버전·partialize 키·스키마 키 집합이 v1 그대로다', async () => {
    const useStore = await bootWith(null);
    const { SCHEMA_VERSION, ContentSchema, MissionSchema, EventSchema } = await import('./schema');

    const o = useStore.persist.getOptions();
    expect(o.name).toBe('powerjumping_content_v1');
    expect(o.version).toBe(1);
    const persistedSlice = o.partialize!(useStore.getState()) as Record<string, unknown>;
    expect(Object.keys(persistedSlice).sort()).toEqual([
      'categories',
      'events',
      'missions',
      'version',
    ]);

    expect(SCHEMA_VERSION).toBe(1);
    expect(Object.keys(ContentSchema.shape).sort()).toEqual(['categories', 'events', 'missions', 'version']);
    expect(Object.keys(MissionSchema.shape).sort()).toEqual(['cats', 'desc', 'diff', 'id', 'name']);
    expect(Object.keys(EventSchema.shape).sort()).toEqual(['eff', 'id', 'label', 'name', 'steps', 'weight']);

    const parsed = ContentSchema.safeParse(V1_CONTENT);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(V1_CONTENT);
  });
});

describe('설정 스토어 부팅 격리 (DATA-07)', () => {
  it('v1 콘텐츠 원문 옆에서 설정 스토어를 부팅·변경해도 콘텐츠 원문은 바이트 그대로다', async () => {
    localStorage.clear();
    localStorage.setItem(CONTENT_KEY, V1_LOCALSTORAGE_RAW);
    vi.resetModules();
    const { useSettings, SETTINGS_KEY } = await import('./settings');
    await import('./store');

    useSettings.getState().setBoardSize(24);

    expect(localStorage.getItem(CONTENT_KEY)).toBe(V1_LOCALSTORAGE_RAW);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).state.boardSize).toBe(24);
  });
});
