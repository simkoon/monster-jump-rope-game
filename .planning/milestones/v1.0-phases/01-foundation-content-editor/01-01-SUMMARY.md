---
phase: 01-foundation-content-editor
plan: 01
subsystem: foundation-content-editor
status: complete
tags: [scaffold, walking-skeleton, zod-schema, zustand-persist, data-01, react19, vite8]
requires: []
provides:
  - "src/schema.ts: ContentSchema + Mission/Event/Content types + SCHEMA_VERSION (Phase 2 engine contract)"
  - "src/store.ts: useStore Zustand persist store (read-guard + CRUD + D-02 category cascade + replaceAll)"
  - "src/seed.ts: seedContent() + uid()"
  - "src/lib/normalize.ts: normalizedPercents(events)"
  - "src/components/Toast.tsx: Toast + showToast() trigger"
  - "src/components/{Header,Tabs,MissionCard,EventCard}.tsx"
  - "src/styles/index.css: light+dark design-token system"
affects:
  - "01-02 (mission editor) consumes useStore + schema + Toast"
  - "01-03 (event editor + JSON backup) consumes useStore.replaceAll + normalizedPercents + inert export/import buttons"
  - "Phase 2 headless engine consumes src/schema.ts data contract"
tech-stack:
  added:
    - "react@19.2.8 / react-dom@19.2.8"
    - "typescript@5.9.3 (pinned, NOT 7.x)"
    - "vite@8.1.5 + @vitejs/plugin-react@6.0.4"
    - "zustand@5.0.14 / zod@4.4.3"
    - "react-hook-form@7.83.0 + @hookform/resolvers@5.4.2"
    - "tailwindcss@4.3.3 + @tailwindcss/vite@4.3.3"
    - "vitest@3.2.4 + @testing-library/react@16.3.0 + @testing-library/dom@10.4.1 + @testing-library/jest-dom + jsdom"
  patterns:
    - "Zustand persist merge() runs ContentSchema.safeParse as a read-guard; corrupt/wrong-version payload falls back to seed"
    - "Store is React/DOM-free (Phase 2 contract); derived values (%, filters) computed, never stored"
    - "User text rendered as JSX children (React auto-escapes) — no manual esc(), no dangerouslySetInnerHTML"
    - "Split vite.config.ts / vitest.config.ts to avoid Vitest's bundled-Vite type clash"
key-files:
  created:
    - package.json
    - .npmrc
    - vite.config.ts
    - vitest.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - index.html
    - src/main.tsx
    - src/vite-env.d.ts
    - src/styles/index.css
    - src/test/setup.ts
    - src/schema.ts
    - src/seed.ts
    - src/store.ts
    - src/lib/normalize.ts
    - src/schema.test.ts
    - src/store.test.ts
    - src/lib/normalize.test.ts
    - src/App.tsx
    - src/App.test.tsx
    - src/components/Header.tsx
    - src/components/Tabs.tsx
    - src/components/Toast.tsx
    - src/components/MissionCard.tsx
    - src/components/EventCard.tsx
  modified:
    - .gitignore
decisions:
  - "Added .npmrc legacy-peer-deps=true to resolve @hookform/resolvers optional valibot peer conflict without changing pinned versions"
  - "Added @testing-library/dom@10.4.1 explicitly (peer of @testing-library/react not auto-installed under legacy-peer-deps)"
  - "Split Vitest config into vitest.config.ts (no plugins; esbuild handles JSX) to avoid Vite-8 vs Vitest-bundled-Vite type clash"
  - "Kept both Tailwind (@import) and prototype CSS custom properties per RESEARCH Open-Question 1 resolution"
metrics:
  tasks_completed: 3
  files_created: 26
  tests: 29
  duration: "~1 session (single pass, clean start)"
  completed: 2026-07-25
---

# Phase 1 Plan 01: Walking Skeleton — Scaffold + Data Contract + Two-Tab Viewer Summary

Stood up 파워점핑's content-editor Walking Skeleton: a Vite 8 + React 19 + TypeScript 5.9.3 SPA whose Zod `ContentSchema` (the frozen Phase 2 contract) backs a Zustand `persist` store with a `safeParse` read-guard, booting a two-tab (🎴 미션 / 🎲 이벤트) shell that renders the 6-mission / 4-event seed library read-only, toggles light/dark theme, and survives refresh via localStorage — all covered by 29 passing unit/RTL tests and a green production build.

## What Was Built

- **Scaffold (Task 1):** exact-pinned dependency set, split Vite/Vitest configs, `tsc -b` project refs, and `src/styles/index.css` carrying the prototype's full light+dark design-token system verbatim plus `@import "tailwindcss"`.
- **Data core (Task 2):** `schema.ts` (version-literal `ContentSchema`, `MissionSchema`, `EventSchema` with the D-08 `extra ⇒ steps 0` refinement), `seed.ts` (verbatim prototype library + `uid()`), `normalize.ts` (weight→% with no divide-by-zero), and `store.ts` — a React-free Zustand persist store with the `ContentSchema.safeParse` read-guard, full mission/event CRUD, `replaceAll`, and the D-02 category cascade (`deleteCategory`/`renameCategory` rewrite every mission's `cats[]`).
- **Shell (Task 3):** `App` wires `Header` (persisted theme toggle + inert export/import buttons deferred to 01-03), `Tabs` (live full-list counts), read-only `MissionCard`/`EventCard` (normalized % + weight bar), and a `Toast` exposing `showToast()` for later plans.

## DATA-01 Delivered

Every store mutation autosaves the `{version, categories, missions, events}` slice to localStorage key `powerjumping_content_v1`; on load, `merge()` validates the persisted payload with `ContentSchema.safeParse` and silently falls back to the in-memory seed on any corrupt/wrong-version/partial data — proven by store tests for both the fallback and the valid-adopt paths, plus the persistence-write assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@hookform/resolvers` optional valibot peer conflict blocked install**
- **Found during:** Task 1 (`npm install`)
- **Issue:** npm ERESOLVE — `@hookform/resolvers@5.4.2`'s optional `@typeschema/valibot` chain resolved valibot 0.39 against a `^1.0.0` peer, aborting install. We use zod, not valibot.
- **Fix:** Added `.npmrc` with `legacy-peer-deps=true`. No package or version substitution — the pinned, RESEARCH-verified versions are unchanged. This only relaxes optional-peer strictness.
- **Files modified:** .npmrc (new)
- **Commit:** 7b5a651

**2. [Rule 3 - Blocking] `test` key rejected by Vite's `defineConfig`; Vitest bundles its own Vite causing a plugin type clash**
- **Found during:** Task 1 (`npm run build`)
- **Issue:** `defineConfig` from `vite` rejects the `test` block; importing it from `vitest/config` instead surfaced a deep type incompatibility between root Vite 8's `react()` plugin and Vitest 3.2.4's bundled Vite copy.
- **Fix:** Split configs — `vite.config.ts` keeps the plugins (no `test` block); a new `vitest.config.ts` (from `vitest/config`, no plugins — Vitest's esbuild transforms JSX for React 19) owns the `test` block. Added `vitest.config.ts` to `tsconfig.node.json`.
- **Files modified:** vite.config.ts, vitest.config.ts (new), tsconfig.node.json
- **Commit:** 7b5a651

**3. [Rule 3 - Blocking] `@testing-library/dom` peer not auto-installed**
- **Found during:** Task 3 (`npm run build` — missing `screen`/`within`/`fireEvent` exports)
- **Issue:** `@testing-library/react@16` re-exports those from its `@testing-library/dom` peer, which legacy-peer-deps did not pull in.
- **Fix:** Added `@testing-library/dom@10.4.1` (canonical @testing-library org package) as a dev dep and reinstalled. Also switched App.test to the bundled `fireEvent` to avoid adding `@testing-library/user-event`.
- **Files modified:** package.json, package-lock.json, src/App.test.tsx
- **Commit:** 565bb8c

### Intentional file removal

- `src/smoke.test.ts` (a placeholder test added in Task 1 to satisfy the runner before real suites existed) was deleted in Task 3 once `App.test.tsx` and the schema/store/normalize suites provided real coverage. This is the only deletion in the plan and is expected.

## Verification Results

- `npm run build` → exit 0, `dist/` emitted (`tsc -b` reports no type errors).
- `npm run test` → 29 tests across 4 files, all passing (schema 8, store 13, normalize 4, App/RTL 4).
- Acceptance greps: TypeScript pinned `5.9.3`; `--sky` + `data-theme="dark"` present in CSS; `store.ts` contains `ContentSchema.safeParse` + `powerjumping_content_v1` + `deleteCategory` + `renameCategory`; `store.ts` has no React/DOM imports.

## Threat Mitigations Applied

- **T-01-01 (Tampering/DoS on rehydrate):** `merge()` read-guard via `ContentSchema.safeParse`; corrupt storage never crashes or overwrites seed (unit-tested).
- **XSS (user text):** all mission/event/category text rendered as JSX children (auto-escaped); positive RTL test asserts `<img …>` in a mission name renders as literal text with no injected element.
- **T-01-SC (supply chain):** only exact-pinned RESEARCH-approved versions installed; committed lockfile. The two added packages (`@testing-library/dom`, and the `.npmrc` toggle) are canonical @testing-library / npm-native and do not alter the pinned runtime set.

## Notes for Next Plans

- **01-02 / 01-03:** the export/import buttons in `Header.tsx` are rendered inert (`disabled`) — wire them in 01-03; do not delete them. Fire user feedback through `showToast(msg, 'ok'|'err')`.
- **Accessible Modal/ConfirmDialog** is NOT built here (deferred to 01-02 per RESEARCH Open-Question 2) — mission/event edit + delete-confirm + import-confirm all reuse it.
- **`.npmrc legacy-peer-deps=true`** is now in the repo; future installs inherit it. Keep it until `@hookform/resolvers` cleans up its optional valibot peer range.

## Self-Check: PASSED
