import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { seedContent } from './seed';
import type { Content, Mission, Event } from './schema';

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

  it('seeds 6 missions, 4 events, and the 3 default categories', () => {
    const seed = seedContent();
    expect(seed.missions.length).toBe(6);
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
    const merged = opts.merge!(valid, current) as Content;
    expect(merged.categories).toEqual(['Z']);
  });
});
