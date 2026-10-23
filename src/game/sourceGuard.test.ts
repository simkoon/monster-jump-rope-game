// src/game/sourceGuard.test.ts — repository source guard for the 3D screen (D-02, D-03, D-04, STAB-04, T-06-11).
// Reads every non-test source under src as raw text (Vite import.meta.glob) and enforces:
//   (a) no CDN-backed or forbidden drei module is imported (fonts, HDRI, decoders, DOM labels,
//       auto-framing, orbit controls),
//   (b) no remote URL in src/game (the game must open offline),
//   (c) no text rendering in the 3D scene (kinds read by color, shape and icon only),
//   (d) three / @react-three stay out of every main-chunk module (only src/game/scene, minus the
//       two DOM-only scene helpers, may import them as values),
//   (e) no physics or post-processing package,
//   (f) no shadow maps (no cast/receive props in the scene, no `shadows` on the Canvas),
//   (g) the dev-only character gallery stays out of the app (D-23, T-07-14): only the gallery entry
//       src/gallery.tsx imports it, and the app entry / root never mention it.
import { describe, it, expect } from 'vitest';

const SOURCES = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(SOURCES);

// Every module specifier imported or re-exported by a file, with the clause before `from`.
interface ImportRef {
  clause: string; // text between `import`/`export` and `from` ('' for bare/dynamic imports)
  spec: string;
}
function importsOf(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  const stmt = /(?:^|[\s;])(import|export)\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(stmt)) out.push({ clause: `${m[1]} ${m[2]}`, spec: m[3] });
  const bare = /(?:^|[\s;])import\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(bare)) out.push({ clause: 'import', spec: m[1] });
  const dynamic = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of src.matchAll(dynamic)) out.push({ clause: 'import()', spec: m[1] });
  return out;
}

const isTypeOnly = (clause: string) => /^(import|export)\s+type\b/.test(clause);
const is3dPackage = (spec: string) => spec === 'three' || spec.startsWith('three/') || spec.startsWith('@react-three/');

const FORBIDDEN_DREI = [
  'Text',
  'Text3D',
  'Html',
  'Environment',
  'Stage',
  'Cloud',
  'useGLTF',
  'Gltf',
  'Ktx2',
  'MatcapTexture',
  'NormalTexture',
  'StatsGl',
  'Bounds',
  'OrbitControls',
];

describe('source guard (D-02, D-03, D-04, STAB-04)', () => {
  it('scans the real sources', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(Object.keys(SOURCES)).toContain('/src/game/scene/Board.tsx');
    expect(Object.keys(SOURCES)).toContain('/src/game/scene/Character.tsx');
    expect(Object.keys(SOURCES)).toContain('/src/game/scene/CharacterGallery.tsx');
    expect(Object.keys(SOURCES).some((f) => f.includes('.test.'))).toBe(false);
  });

  it('(a) imports no CDN-backed or forbidden drei module', () => {
    const bad: string[] = [];
    for (const [file, src] of files) {
      for (const { clause, spec } of importsOf(src)) {
        if (spec !== '@react-three/drei' && !spec.startsWith('@react-three/drei/')) continue;
        if (/\*\s+as\b/.test(clause)) bad.push(`${file}: namespace import of drei`);
        const sub = spec.split('/').pop() ?? '';
        if (FORBIDDEN_DREI.some((n) => sub === n || sub.startsWith(`${n}.`))) bad.push(`${file}: ${spec}`);
        const named = clause.match(/\{([^}]*)\}/)?.[1] ?? '';
        for (const part of named.split(',')) {
          const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (FORBIDDEN_DREI.includes(name)) bad.push(`${file}: ${name}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('(b) has no remote URL in src/game', () => {
    const bad = files.filter(([f, src]) => f.startsWith('/src/game/') && /https?:\/\//.test(src)).map(([f]) => f);
    expect(bad).toEqual([]);
  });

  it('(c) renders no text in the 3D scene', () => {
    const banned = /\b(fillText|CanvasTexture|TextGeometry|FontLoader)\b/;
    const bad = files.filter(([f, src]) => f.startsWith('/src/game/scene/') && banned.test(src)).map(([f]) => f);
    expect(bad).toEqual([]);
  });

  it('(d) keeps three and @react-three out of every main-chunk module', () => {
    const domOnlyScene = ['/src/game/scene/contextLoss.ts', '/src/game/scene/loadGameCanvas.ts'];
    const bad: string[] = [];
    for (const [file, src] of files) {
      const inScene = file.startsWith('/src/game/scene/') && !domOnlyScene.includes(file);
      if (inScene) continue;
      for (const { clause, spec } of importsOf(src)) {
        if (is3dPackage(spec) && !isTypeOnly(clause)) bad.push(`${file}: ${spec}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('(d) loads the canvas only through a dynamic import', () => {
    const loader = SOURCES['/src/game/scene/loadGameCanvas.ts'];
    expect(loader).toBeDefined();
    expect(loader).toMatch(/import\(\s*['"]\.\/GameCanvas['"]\s*\)/);
    expect(loader).not.toMatch(/^\s*import\s/m);
    // Nothing outside the scene imports GameCanvas statically.
    const bad: string[] = [];
    for (const [file, src] of files) {
      if (file.startsWith('/src/game/scene/')) continue;
      for (const { clause, spec } of importsOf(src)) {
        // Basename match: './scene/loadGameCanvas' (the sanctioned loader) must not count.
        if (/(^|\/)GameCanvas$/.test(spec) && clause !== 'import()' && !isTypeOnly(clause)) bad.push(file);
      }
    }
    expect(bad).toEqual([]);
  });

  it('(e) uses no physics or post-processing package', () => {
    const banned = (spec: string) =>
      spec === '@react-three/rapier' ||
      spec.startsWith('cannon') ||
      spec === '@react-three/postprocessing' ||
      spec === 'postprocessing';
    const bad: string[] = [];
    for (const [file, src] of files) {
      for (const { spec } of importsOf(src)) if (banned(spec)) bad.push(`${file}: ${spec}`);
    }
    expect(bad).toEqual([]);
  });

  it('(f) uses no shadow maps', () => {
    const bad: string[] = [];
    for (const [file, src] of files) {
      if (!file.startsWith('/src/game/scene/')) continue;
      if (/\b(castShadow|receiveShadow)\b/.test(src)) bad.push(`${file}: shadow prop`);
      // The <Canvas ...> opening tag (arrow functions `=>` inside it do not end the tag).
      for (const m of src.matchAll(/<Canvas\b((?:=>|[^>])*)>/g)) {
        if (/\bshadows\b/.test(m[1])) bad.push(`${file}: <Canvas shadows>`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('(g) keeps the dev gallery out of the app', () => {
    const bad: string[] = [];
    for (const [file, src] of files) {
      if (file === '/src/gallery.tsx') continue;
      for (const { spec } of importsOf(src)) {
        // Basename match, as in (d): any path ending in CharacterGallery counts.
        if (/(^|\/)CharacterGallery(\.tsx?)?$/.test(spec)) bad.push(`${file}: ${spec}`);
      }
    }
    expect(bad).toEqual([]);
    expect(SOURCES['/src/gallery.tsx']).toMatch(/from\s*['"]\.\/game\/scene\/CharacterGallery['"]/);
    for (const entry of ['/src/main.tsx', '/src/App.tsx']) {
      expect(SOURCES[entry], entry).toBeDefined();
      expect(SOURCES[entry], entry).not.toMatch(/gallery/i);
    }
  });

  it('the Canvas-tag rule sees through arrow functions', () => {
    const tag = /<Canvas\b((?:=>|[^>])*)>/;
    expect(tag.exec('<Canvas onCreated={(s) => go(s)} shadows>')?.[1]).toMatch(/\bshadows\b/);
    expect(tag.exec('<Canvas flat dpr={[1, 2]}><ContactShadows /></Canvas>')?.[1]).not.toMatch(/\bshadows\b/);
  });
});
