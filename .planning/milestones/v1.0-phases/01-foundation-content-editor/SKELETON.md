# Walking Skeleton — 파워점핑 (신나는 줄넘기 미션)

**Phase:** 1
**Generated:** 2026-07-25

## Capability Proven End-to-End

> The smallest user-visible capability that exercises the full Phase 1 stack.

The instructor opens the app and sees the seed 미션(6)·이벤트(4) library rendered in a two-tab shell (🎴 미션 / 🎲 이벤트) with live count pills; they can switch tabs and toggle light/dark theme; and the library persists across a full page refresh (loaded back from localStorage through a Zod read-guard). This proves scaffold → Zod schema → Zustand persist store (autosave + read-guard) → render → production build, all working end to end with zero server.

The first user-driven content writes (add/edit/delete missions and events, and JSON backup) land in the immediately following wave-2/wave-3 plans (01-02, 01-03) on top of this skeleton.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| App type | Client-only SPA, no server, no network, no auth | PROJECT.md constraint: single classroom device, "설치 없이 즉시 실행"; all state is local |
| Framework | React 19.2.8 + TypeScript 5.9.3 (NOT TS 7.x) | CLAUDE.md stack; R3F v9 (Phase 3) needs React 19. TS pinned to 5.9.3 because typescript-eslint has no stable API on TS 7 yet (RESEARCH Pitfall 1) |
| Build/dev | Vite 8.1.5 (Rolldown) + @vitejs/plugin-react 6.0.4 | Instant HMR, static output for trivial hosting; Node ≥22.12 satisfied (host v22.23.1) |
| Styling | Tailwind 4.3.3 (`@tailwindcss/vite`) + prototype CSS-custom-property design tokens | UI-SPEC permits either; the approved prototype's `:root` token system (light+dark) is lifted verbatim into `src/styles/index.css` |
| Data model | One Zod 4.4.3 schema in `src/schema.ts` with `SCHEMA_VERSION = 1` | Single source of truth for form validation, import validation, AND the Phase 2 engine contract; TS types via `z.infer` |
| State + persistence | Zustand 5.0.14 single store with `persist` + `createJSONStorage(localStorage)` + `version`/`migrate`/`merge` | One choice covers autosave (DATA-01) + the read-guard; export = the persisted slice. localStorage key `powerjumping_content_v1` (matches the prototype for forward-compat) |
| Persistence guard | `merge` runs `ContentSchema.safeParse`; corrupt/wrong-version payload → fall back to seed | A hand-corrupted or older localStorage value is rejected exactly like a bad import; app never crashes |
| Forms | react-hook-form 7.83.0 + @hookform/resolvers 5.4.2 (`zodResolver`, Zod 4 supported) | Mission/event modals; focus management + minimal re-renders; validate before store write |
| Testing | vitest (3.x) + @testing-library/react + jsdom | Automated verification of the store/schema/normalize contract (Phase 2 depends on it) and component behavior. Dev-only, canonical packages |
| Directory layout | `src/schema.ts`, `src/seed.ts`, `src/store.ts`, `src/lib/{normalize,io}.ts`, `src/components/*`, `src/styles/index.css` | Pure logic (schema/seed/store/lib) separated from components; keeps the store React-free and reusable by the Phase 2 engine |
| Deferred to Phase 3 | three / @react-three/fiber / drei NOT installed | No 3D in Phase 1; they add ~1MB+ and peer surface for zero value here |

## Stack Touched in Phase 1 (skeleton = plan 01-01)

- [x] Project scaffold (Vite + React 19 + TS 5.9.3, Tailwind 4, vitest test runner, lint via tsc)
- [x] Routing — single page; tab switch is local state (no router by design)
- [x] Persistence — real localStorage write (Zustand `persist` autosave) AND real read (rehydrate through the Zod read-guard)
- [x] UI — interactive two-tab shell wired to the store (tab switch, theme toggle), rendering seed data
- [x] Run/build — `npm run dev` boots; `npm run build` emits a static bundle; `npm run test` runs the unit/RTL suites

## Out of Scope (Deferred to Later Slices)

> Explicit — prevents later phases from re-litigating Phase 1's minimalism.

- User-driven mission create/edit/delete, search, and difficulty/category filtering → **plan 01-02**
- User-driven event create/edit/delete, weight normalization editing, and effect/label authoring → **plan 01-03**
- JSON export and validate-before-commit import → **plan 01-03**
- Any 3D board, tokens, dice, or game loop → **Phase 2 (headless engine) / Phase 3 (3D)**
- Nintendo-style art escalation, expressive characters, original logo art → **Phase 4**
- Sound/BGM, in-game save/resume, per-category game modes, stats → **v2 (AUDIO/QOL)**

## Subsequent Slice Plan

Each later plan/phase adds one vertical slice on top of this skeleton without changing its architectural decisions:

- **Plan 01-02:** 미션 편집기 — add/edit/delete missions, name search + difficulty(OR)/category(AND) filters, multi-category management; introduces the shared accessible Modal/ConfirmDialog/SegmentedControl primitives.
- **Plan 01-03:** 이벤트 편집기 + JSON 백업 — full event CRUD with live weight→% normalization, plus export/import with strict validate-before-commit.
- **Phase 2:** headless game engine (turn FSM, weighted draw, dice, movement, event application, win check) consuming this exact `schema.ts` data contract, plus a plain-DOM harness — playable loop before any 3D.
- **Phase 3:** Three.js 3D board/token/dice visualization wrapping the verified loop; large child-friendly game UI (placeholder tokens).
- **Phase 4:** Nintendo-style visual system, expressive male/female jump-rope characters, original "파워점핑" logo.
