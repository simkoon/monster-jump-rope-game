import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { seedContent } from './seed';
import { SCHEMA_VERSION, type Content, type Mission, type Event } from './schema';

function resetToSeed() {
  localStorage.clear();
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}

const mission = (id: string, cats: string[]): Mission => ({
  id, name: `미션-${id}`, desc: '', diff: 'easy', cats,
});
const event = (id: string, weight: number): Event => ({
  id, name: `이벤트-${id}`, eff: 'forward', steps: 1, weight, label: '',
});

describe('store seed defaults', () => {
  beforeEach(resetToSeed);

  it('seeds 26 missions (9 easy / 8 normal / 9 hard), 4 events, and the 3 default categories', () => {
    const seed = seedContent();
    expect(seed.missions.length).toBe(26);
    expect(seed.missions.filter((m) => m.diff === 'easy')).toHaveLength(9);
    expect(seed.missions.filter((m) => m.diff === 'normal')).toHaveLength(8);
    expect(seed.missions.filter((m) => m.diff === 'hard')).toHaveLength(9);
    expect(seed.missions.every((m) => m.desc === '')).toBe(true);
    expect(seed.events.length).toBe(4);
    expect(seed.categories).toEqual(['기초', '응용', '고난도']);
  });
});

describe('mission CRUD', () => {
  beforeEach(resetToSeed);

  it('addMission prepends', () => {
    const before = useStore.getState().missions.length;
    useStore.getState().addMission(mission('x', []));
    expect(useStore.getState().missions[0].id).toBe('x');
    expect(useStore.getState().missions.length).toBe(before + 1);
  });

  it('updateMission patches by id', () => {
    const id = useStore.getState().missions[0].id;
    useStore.getState().updateMission(id, { name: '바뀐 이름' });
    expect(useStore.getState().missions.find((m) => m.id === id)?.name).toBe('바뀐 이름');
  });

  it('deleteMission removes by id', () => {
    const id = useStore.getState().missions[0].id;
    useStore.getState().deleteMission(id);
    expect(useStore.getState().missions.find((m) => m.id === id)).toBeUndefined();
  });
});

describe('event CRUD', () => {
  beforeEach(resetToSeed);

  it('addEvent prepends; deleteEvent removes', () => {
    useStore.getState().addEvent(event('ev', 5));
    expect(useStore.getState().events[0].id).toBe('ev');
    useStore.getState().deleteEvent('ev');
    expect(useStore.getState().events.find((e) => e.id === 'ev')).toBeUndefined();
  });
});

describe('replaceAll (import)', () => {
  beforeEach(resetToSeed);

  it('swaps the whole slice from a validated Content', () => {
    const fresh: Content = { version: 1, categories: ['A'], missions: [mission('only', ['A'])], events: [] };
    useStore.getState().replaceAll(fresh);
    expect(useStore.getState().categories).toEqual(['A']);
    expect(useStore.getState().missions).toHaveLength(1);
    expect(useStore.getState().events).toHaveLength(0);
  });
});

describe('category cascade (D-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      version: 1,
      categories: ['기초', '응용'],
      missions: [mission('m1', ['기초']), mission('m2', ['기초', '응용']), mission('m3', ['응용'])],
      events: [],
    });
  });

  it('addCategory dedupes', () => {
    useStore.getState().addCategory('기초');
    expect(useStore.getState().categories.filter((c) => c === '기초')).toHaveLength(1);
    useStore.getState().addCategory('신규');
    expect(useStore.getState().categories).toContain('신규');
  });

  it('deleteCategory removes the name from the list AND from every mission cats', () => {
    useStore.getState().deleteCategory('기초');
    expect(useStore.getState().categories).not.toContain('기초');
    const ms = useStore.getState().missions;
    expect(ms.find((m) => m.id === 'm1')?.cats).toEqual([]); // was only 기초
    expect(ms.find((m) => m.id === 'm2')?.cats).toEqual(['응용']);
    expect(ms.find((m) => m.id === 'm3')?.cats).toEqual(['응용']);
  });

  it('renameCategory replaces in the list AND in every affected mission, de-duping', () => {
    useStore.getState().renameCategory('기초', '응용'); // collapses into existing 응용
    const cats = useStore.getState().categories;
    expect(cats.filter((c) => c === '응용')).toHaveLength(1);
    expect(cats).not.toContain('기초');
    const m2 = useStore.getState().missions.find((m) => m.id === 'm2');
    expect(m2?.cats).toEqual(['응용']); // 기초+응용 de-duped to 응용
  });

  it('renameCategory is a no-op for empty or unchanged new name', () => {
    const before = useStore.getState().categories.slice();
    useStore.getState().renameCategory('기초', '   ');
    expect(useStore.getState().categories).toEqual(before);
    useStore.getState().renameCategory('기초', '기초');
    expect(useStore.getState().categories).toEqual(before);
  });
});

describe('persistence + read-guard (DATA-01, T-01-01)', () => {
  beforeEach(resetToSeed);

  it('writes a versioned JSON payload to localStorage after a mutation', () => {
    useStore.getState().addMission(mission('persisted', []));
    const raw = localStorage.getItem('powerjumping_content_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    // zustand persist wraps state under `state` with a top-level `version`.
    expect(parsed.state.version).toBe(1);
  });

  it('merge read-guard falls back to current/seed on a wrong-version payload', () => {
    const opts = useStore.persist.getOptions();
    const current = useStore.getState();
    const merged = opts.merge!({ version: 99, categories: [], missions: [], events: [] }, current) as Content;
    // corrupt payload rejected → current (seed) missions preserved
    expect(merged.missions).toBe(current.missions);
  });

  it('merge read-guard adopts a valid payload', () => {
    const opts = useStore.persist.getOptions();
    const current = useStore.getState();
    const valid: Content = { version: 1, categories: ['Z'], missions: [], events: [] };
    localStorage.setItem('powerjumping_hard_additions', '2026-10-26-hard5'); // top-up already done
    const merged = opts.merge!(valid, current) as Content;
    expect(merged.categories).toEqual(['Z']);
  });
});

describe('old seed upgrade on load', () => {
  it('replaces untouched prototype seed missions with the new curriculum, keeps edited lists', async () => {
    const { isOldSeedMissions } = await import('./store');
    const old = ['양발 모아뛰기', '번갈아뛰기', '엇걸어풀기 (X자)', '뒤로뛰기', '이중뛰기', '십자뛰기']
      .map((name, i) => ({ id: 'o' + i, name, desc: '', diff: 'easy' as const, cats: [] }));
    expect(isOldSeedMissions(old)).toBe(true);
    expect(isOldSeedMissions(old.slice(1))).toBe(false);
    expect(isOldSeedMissions([...old, { ...old[0], id: 'x', name: '내 미션' }])).toBe(false);
    expect(isOldSeedMissions(seedContent().missions)).toBe(false);

    localStorage.setItem('powerjumping_content_v1', JSON.stringify({
      state: { version: SCHEMA_VERSION, categories: ['기초', '응용', '고난도'], missions: old, events: seedContent().events },
      version: SCHEMA_VERSION,
    }));
    await useStore.persist.rehydrate();
    expect(useStore.getState().missions.map((m) => m.name)).toEqual(seedContent().missions.map((m) => m.name));
    localStorage.clear();
  });
});

describe('2026-10-26 hard mission top-up', () => {
  it('adds the 5 new hard missions once to a saved list, never again after deletion', async () => {
    const { HARD_ADDITIONS_KEY } = await import('./store');
    const { HARD_ADDITIONS } = await import('./seed');
    const saved = seedContent().missions.filter((m) => !(HARD_ADDITIONS as readonly string[]).includes(m.name));
    const write = (missions: Mission[]) => localStorage.setItem('powerjumping_content_v1', JSON.stringify({
      state: { version: SCHEMA_VERSION, categories: ['기초', '응용'], missions, events: seedContent().events },
      version: SCHEMA_VERSION,
    }));
    localStorage.clear();
    write([...saved, { id: 'dup', name: 'ooco', desc: '', diff: 'hard', cats: [] }]);
    await useStore.persist.rehydrate();
    const names = useStore.getState().missions.map((m) => m.name);
    expect(names.filter((n) => n.toUpperCase() === 'OOCO')).toHaveLength(1);
    for (const n of HARD_ADDITIONS.slice(1)) expect(names).toContain(n);
    expect(useStore.getState().categories).toContain('고난도');
    expect(localStorage.getItem(HARD_ADDITIONS_KEY)).not.toBeNull();
    await Promise.resolve(); // the top-up is written right after hydration
    const stored = JSON.parse(localStorage.getItem('powerjumping_content_v1')!).state.missions.map((m: Mission) => m.name);
    expect(stored).toContain('OO SO SC');

    write(saved); // the instructor deleted them later
    await useStore.persist.rehydrate();
    expect(useStore.getState().missions.map((m) => m.name)).not.toContain('OOCC');
    localStorage.clear();
  });

  it('the default library has 9 hard missions', () => {
    expect(seedContent().missions.filter((m) => m.diff === 'hard').map((m) => m.name))
      .toEqual(['OO', 'SO', 'CO', 'CC', 'OOCO', 'OOCC', 'COCC', 'OO OOO', 'OO SO SC']);
  });
});
