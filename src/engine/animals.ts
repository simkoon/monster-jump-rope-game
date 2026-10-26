// src/engine/animals.ts — animal species ids and automatic distinct assignment (SETUP-07, D-24).
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE and free of randomness, and
//   - pure: inputs are never mutated.
// The engine knows ids only; emoji and display names live in the UI module.

export const ANIMALS = ['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick'] as const;
export type AnimalId = (typeof ANIMALS)[number];

export function isAnimalId(x: unknown): x is AnimalId {
  return typeof x === 'string' && (ANIMALS as readonly string[]).includes(x);
}

// Upper bound of one game (= MAX_PARTICIPANTS in setup.ts, kept here to avoid an import cycle).
export const MAX_ANIMAL_SLOTS = 20;

// How many participants may share one species: 1 up to 8 participants, then evenly spread
// (9–16 → 2, 17–20 → 3), so the 8 species repeat only once everyone else is taken.
export function perAnimalLimit(count: number): number {
  return Math.max(1, Math.ceil(count / ANIMALS.length));
}

// Two passes so species stay as distinct as possible (fully distinct up to 8 participants):
//   1) keep each valid pick unless earlier participants already used it perAnimalLimit times;
//   2) fill every remaining slot with the least-used species (ANIMALS order breaks ties).
export function assignAnimals(count: number, picks: ReadonlyArray<AnimalId | undefined>): AnimalId[] {
  const n = Number.isFinite(count) ? Math.min(MAX_ANIMAL_SLOTS, Math.max(0, Math.floor(count))) : 0;
  const limit = perAnimalLimit(n);
  const out: (AnimalId | undefined)[] = new Array(n).fill(undefined);
  const used = new Map<AnimalId, number>();
  const uses = (a: AnimalId) => used.get(a) ?? 0;
  for (let i = 0; i < n; i++) {
    const p = picks[i];
    if (isAnimalId(p) && uses(p) < limit) {
      out[i] = p;
      used.set(p, uses(p) + 1);
    }
  }
  for (let i = 0; i < n; i++) {
    if (out[i] !== undefined) continue;
    const free = leastUsedAnimal(used);
    out[i] = free;
    used.set(free, uses(free) + 1);
  }
  return out as AnimalId[];
}

// The species with the fewest uses so far (first in ANIMALS order on a tie).
export function leastUsedAnimal(used: ReadonlyMap<AnimalId, number>): AnimalId {
  let best: AnimalId = ANIMALS[0];
  for (const a of ANIMALS) if ((used.get(a) ?? 0) < (used.get(best) ?? 0)) best = a;
  return best;
}
