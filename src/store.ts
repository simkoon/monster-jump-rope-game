// src/store.ts — Zustand persist store: autosave (DATA-01) + Zod read-guard.
// PHASE 2 CONTRACT: this file MUST stay free of any React/DOM imports.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ContentSchema, SCHEMA_VERSION, type Content, type Mission, type Event } from './schema';
import { seedContent, uid, HARD_ADDITIONS } from './seed';

// The 6 prototype seed missions (before the 2026-10-25 curriculum). A device whose saved missions
// are still exactly these never edited them, so it gets the new seed missions on load.
const OLD_SEED_MISSIONS = ['양발 모아뛰기', '번갈아뛰기', '엇걸어풀기 (X자)', '뒤로뛰기', '이중뛰기', '십자뛰기'];

export function isOldSeedMissions(missions: readonly Mission[]): boolean {
  const names = missions.map((m) => m.name).sort();
  const old = [...OLD_SEED_MISSIONS].sort();
  return names.length === old.length && names.every((n, i) => n === old[i]);
}

// One-time top-up of the 2026-10-26 hard missions for devices that already saved content. Runs once
// per device (flag key below), so a mission the instructor deletes later never comes back. Names
// already in the list (case-insensitive) are skipped.
export const HARD_ADDITIONS_KEY = 'powerjumping_hard_additions';
export const HARD_ADDITIONS_ID = '2026-10-26-hard5';

export function withHardAdditions(content: Content): Content {
  const have = new Set(content.missions.map((m) => m.name.trim().toUpperCase()));
  const missing = HARD_ADDITIONS.filter((n) => !have.has(n.toUpperCase()));
  if (missing.length === 0) return content;
  const cat = '고난도';
  return {
    ...content,
    categories: content.categories.includes(cat) ? content.categories : [...content.categories, cat],
    missions: [...content.missions, ...missing.map((name) => ({ id: uid(), name, desc: '', diff: 'hard' as const, cats: [cat] }))],
  };
}

function hardAdditionsOnce(content: Content): Content {
  try {
    if (localStorage.getItem(HARD_ADDITIONS_KEY) === HARD_ADDITIONS_ID) return content;
    localStorage.setItem(HARD_ADDITIONS_KEY, HARD_ADDITIONS_ID);
  } catch {
    return content; // storage blocked — nothing was saved to top up
  }
  const next = withHardAdditions(content);
  // merge() only changes memory; write the topped-up list once hydration is done, or the next
  // boot (flag already set) would load the old list again.
  if (next !== content) queueMicrotask(() => useStore.setState({}));
  return next;
}

export interface Store extends Content {
  addMission: (m: Mission) => void;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  addEvent: (e: Event) => void;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  replaceAll: (c: Content) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...seedContent(), // in-memory default = seed (never lost even if storage is corrupt)

      addMission: (m) => set((s) => ({ missions: [m, ...s.missions] })),
      updateMission: (id, patch) =>
        set((s) => ({
          missions: s.missions.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteMission: (id) => set((s) => ({ missions: s.missions.filter((m) => m.id !== id) })),

      addEvent: (e) => set((s) => ({ events: [e, ...s.events] })),
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      // D-02: categories are a freely add·edit·delete-able list.
      addCategory: (name) =>
        set((s) => (s.categories.includes(name) ? s : { categories: [...s.categories, name] })),

      // deleteCategory cascades: drop the name from the list AND strip it from every mission's cats.
      deleteCategory: (name) =>
        set((s) => ({
          categories: s.categories.filter((c) => c !== name),
          missions: s.missions.map((m) => ({ ...m, cats: m.cats.filter((c) => c !== name) })),
        })),

      // renameCategory cascades: swap old→new in the list AND in every mission's cats (de-duped).
      // No-op when newName is empty (trimmed) or unchanged.
      renameCategory: (oldName, newName) =>
        set((s) => {
          const next = newName.trim();
          if (!next || next === oldName) return s;
          const categories = Array.from(
            new Set(s.categories.map((c) => (c === oldName ? next : c))),
          );
          const missions = s.missions.map((m) => ({
            ...m,
            cats: Array.from(new Set(m.cats.map((c) => (c === oldName ? next : c)))),
          }));
          return { categories, missions };
        }),

      // Used by JSON import after validation — swaps the whole slice.
      replaceAll: (c) =>
        set({
          version: SCHEMA_VERSION,
          categories: c.categories,
          missions: c.missions,
          events: c.events,
        }),
    }),
    {
      name: 'powerjumping_content_v1', // matches the prototype KEY for forward-compat
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
      partialize: (s) => ({
        version: SCHEMA_VERSION,
        categories: s.categories,
        missions: s.missions,
        events: s.events,
      }),
      migrate: (persisted, _from) => persisted as Content,
      // READ-GUARD (T-01-01): validate persisted payload; on any failure keep seed defaults.
      merge: (persisted, current) => {
        const parsed = ContentSchema.safeParse(persisted);
        if (!parsed.success) return current; // corrupt / wrong-version / partial → seed stays
        const data = isOldSeedMissions(parsed.data.missions)
          ? { ...parsed.data, missions: seedContent().missions } // untouched old seed → new curriculum
          : parsed.data;
        return { ...current, ...hardAdditionsOnce(data) };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[powerjumping] storage rehydrate failed; using seed', error);
        }
      },
    },
  ),
);
