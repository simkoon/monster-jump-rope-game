// src/engine/rng.ts — the isolated, injectable RNG (D-07, D-09).
// PHASE 2/3 CONTRACT: no React/DOM imports. Every random draw in the engine goes
// through an injected Rng — never a module-global Math.random — so tests are
// deterministic (seeded mulberry32) and dice/placement fairness is provable.

export interface Rng {
  next(): number; // returns a float in [0, 1)
}

// mulberry32: public-domain seeded PRNG used for deterministic tests.
// [CITED: gist.github.com/tommyettinger/46a874533244883189143505d203312c]
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

// Runtime RNG: prefer crypto.getRandomValues, fall back to Math.random.
// This is the ONLY non-deterministic path and is used at runtime only (never in tests).
export function systemRng(): Rng {
  return {
    next() {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const u = new Uint32Array(1);
        crypto.getRandomValues(u);
        return u[0] / 4294967296;
      }
      return Math.random();
    },
  };
}

// Fair six-sided die (LOOP-05): integer in 1..6.
export function rollDie(rng: Rng): number {
  return 1 + Math.floor(rng.next() * 6);
}

// Weighted draw (event placement, EVENT-06). Negative/NaN weights clamp to 0.
// Returns null when the list is empty OR total weight <= 0 (all-zero → empty square).
// The final-item return is a float-safety fallback (T-02-04: no infinite loop / NaN).
export function weightedPick<T>(items: T[], weightOf: (t: T) => number, rng: Rng): T | null {
  if (items.length === 0) return null;
  const weights = items.map((it) => Math.max(0, weightOf(it) || 0));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1]; // float-safety fallback
}

// Equal-probability draw (mission card draw, LOOP-01 — missions carry no weight).
// Returns null on an empty list.
export function uniformPick<T>(items: T[], rng: Rng): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng.next() * items.length)];
}
