// src/resetStorage.ts — one-time full reset of this app's saved data (2026-10-26, new mission curriculum).
// Imported FIRST in main.tsx so it runs before any zustand persist store rehydrates.
// Each device wipes every `powerjumping*` key once, then records RESET_ID so it never wipes again.
// To force another reset later, change RESET_ID.
export const RESET_ID = '2026-10-26-curriculum';
export const RESET_KEY = 'powerjumping_reset_id';

export function resetStorageOnce(storage: Storage = localStorage): boolean {
  try {
    if (storage.getItem(RESET_KEY) === RESET_ID) return false;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith('powerjumping')) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
    storage.setItem(RESET_KEY, RESET_ID);
    return true;
  } catch {
    return false; // storage blocked (private mode etc.) — nothing saved to reset
  }
}

resetStorageOnce();
