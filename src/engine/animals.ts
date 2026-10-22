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

// Two passes so every participant gets a distinct species (max 8 participants = 8 species):
//   1) keep each valid pick unless an earlier participant already reserved it;
//   2) fill every remaining slot with the first species in ANIMALS order not yet used.
export function assignAnimals(count: number, picks: ReadonlyArray<AnimalId | undefined>): AnimalId[] {
  const n = Number.isFinite(count) ? Math.min(ANIMALS.length, Math.max(0, Math.floor(count))) : 0;
  const out: (AnimalId | undefined)[] = new Array(n).fill(undefined);
  const used = new Set<AnimalId>();
  for (let i = 0; i < n; i++) {
    const p = picks[i];
    if (isAnimalId(p) && !used.has(p)) {
      out[i] = p;
      used.add(p);
    }
  }
  for (let i = 0; i < n; i++) {
    if (out[i] !== undefined) continue;
    const free = ANIMALS.find((a) => !used.has(a)) as AnimalId; // n ≤ ANIMALS.length → always found
    out[i] = free;
    used.add(free);
  }
  return out as AnimalId[];
}
