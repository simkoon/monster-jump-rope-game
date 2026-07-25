// src/store.ts — Zustand persist store: autosave (DATA-01) + Zod read-guard.
// PHASE 2 CONTRACT: this file MUST stay free of any React/DOM imports.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ContentSchema, SCHEMA_VERSION, type Content, type Mission, type Event } from './schema';
import { seedContent } from './seed';

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
        return { ...current, ...parsed.data };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[powerjumping] storage rehydrate failed; using seed', error);
        }
      },
    },
  ),
);
