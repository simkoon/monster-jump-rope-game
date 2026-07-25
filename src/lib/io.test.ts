import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportContent, importContent } from './io';
import { useStore } from '../store';
import { seedContent } from '../seed';
import type { Content } from '../schema';

// A distinct baseline so any accidental overwrite is obvious.
const BASE: Content = {
  version: 1,
  categories: ['기준'],
  missions: [{ id: 'base-m', name: '기준 미션', desc: '', diff: 'easy', cats: ['기준'] }],
  events: [{ id: 'base-e', name: '기준 이벤트', eff: 'forward', steps: 1, weight: 1, label: '' }],
};

function resetStore() {
  localStorage.clear();
  useStore.setState({
    version: BASE.version,
    categories: [...BASE.categories],
    missions: BASE.missions.map((m) => ({ ...m })),
    events: BASE.events.map((e) => ({ ...e })),
  });
}

function jsonFile(text: string): File {
  return new File([text], 'content.json', { type: 'application/json' });
}

// Drives importContent to settlement. When confirm=true it invokes proceed()
// inside onNeedConfirm (simulating the user confirming the overwrite dialog).
function runImport(file: File, confirm: boolean): Promise<{ askedToConfirm: boolean }> {
  return new Promise((resolve) => {
    let askedToConfirm = false;
    importContent(file, {
      onNeedConfirm: (proceed) => {
        askedToConfirm = true;
        if (confirm) proceed();
        resolve({ askedToConfirm });
      },
    });
    // Error / no-confirm paths never call onNeedConfirm — settle after the
    // FileReader onload microtask has run.
    setTimeout(() => resolve({ askedToConfirm }), 80);
  });
}

describe('importContent (validate-before-commit guard, DATA-03/04)', () => {
  beforeEach(resetStore);

  it('overwrites the store with a valid file only AFTER confirmation', async () => {
    const incoming = seedContent();
    await runImport(jsonFile(JSON.stringify(incoming)), true);

    const s = useStore.getState();
    expect(s.missions.map((m) => m.name)).toEqual(incoming.missions.map((m) => m.name));
    expect(s.events.map((e) => e.name)).toEqual(incoming.events.map((e) => e.name));
    // The baseline is gone — replaceAll ran.
    expect(s.missions.find((m) => m.id === 'base-m')).toBeUndefined();
  });

  it('leaves the store untouched on malformed JSON (replaceAll NOT called)', async () => {
    const res = await runImport(jsonFile('{ this is not json '), true);
    expect(res.askedToConfirm).toBe(false);
    expect(useStore.getState().missions[0].id).toBe('base-m');
    expect(useStore.getState().events[0].id).toBe('base-e');
  });

  it('leaves the store untouched for a wrong version (version: 2)', async () => {
    const bad = { version: 2, categories: [], missions: [], events: [] };
    const res = await runImport(jsonFile(JSON.stringify(bad)), true);
    expect(res.askedToConfirm).toBe(false);
    expect(useStore.getState().categories).toEqual(['기준']);
    expect(useStore.getState().missions[0].id).toBe('base-m');
  });

  it('leaves the store untouched when the user declines the confirmation', async () => {
    const incoming = seedContent();
    const res = await runImport(jsonFile(JSON.stringify(incoming)), false);
    expect(res.askedToConfirm).toBe(true); // validation passed, dialog was requested
    // …but proceed() was never called, so nothing changed.
    expect(useStore.getState().missions[0].id).toBe('base-m');
  });

  it('rejects an oversized file WITHOUT reading it', async () => {
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsText');
    const file = jsonFile('{}');
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    importContent(file, { onNeedConfirm: () => {} });

    expect(readSpy).not.toHaveBeenCalled();
    expect(useStore.getState().missions[0].id).toBe('base-m');
    readSpy.mockRestore();
  });
});

describe('exportContent → importContent round-trip (DATA-02)', () => {
  let lastBlob: Blob | null = null;

  beforeEach(() => {
    resetStore();
    lastBlob = null;
    globalThis.URL.createObjectURL = vi.fn((b: Blob) => {
      lastBlob = b;
      return 'blob:mock';
    }) as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('exports the library and re-imports it to reproduce the same content', async () => {
    const content = seedContent();
    exportContent(content);

    expect(lastBlob).not.toBeNull();
    // jsdom's Blob has no .text(); read it through FileReader (same path the
    // import guard uses) for a genuine round-trip.
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(lastBlob!);
    });
    // Sanity: it is pretty-printed JSON of the same shape.
    expect(JSON.parse(text)).toEqual(content);

    // Feed the exported bytes back through the import guard.
    await runImport(jsonFile(text), true);

    const s = useStore.getState();
    expect(s.categories).toEqual(content.categories);
    expect(s.missions).toEqual(content.missions);
    expect(s.events).toEqual(content.events);
  });
});
