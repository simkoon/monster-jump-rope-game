# Phase 1: 기반 & 콘텐츠 편집기 - Research

**Researched:** 2026-07-25
**Domain:** Client-only React 19 + TypeScript SPA — data-editor CRUD, Zustand-persisted localStorage, Zod-validated JSON import/export
**Confidence:** HIGH (stack versions verified against npm this session; interaction logic grounded in the user-approved working prototype)

## Summary

Phase 1 builds a standalone instructor tool: a two-tab (미션 / 이벤트) content editor with CRUD, search/filter, localStorage autosave, and validated JSON export/import. There is **no 3D and no game loop** in this phase — those are Phases 3–4, so `three` / `@react-three/fiber` / `drei` **must NOT be installed now** (they add ~1MB+ and peer-dep surface for zero Phase-1 value; defer to Phase 3).

The single most valuable asset for this phase is `01-PROTOTYPE.html` — a **complete, user-approved, working vanilla-JS implementation** of the exact editor. Every data shape, interaction, copy string, seed record, weight-normalization formula, read-guard, and import-validation flow already exists there and is correct. The React build is a **faithful port**, not a design exercise. The planner should treat the prototype as the behavioral spec and the `01-UI-SPEC.md` as the visual/token spec.

**Primary recommendation:** Scaffold Vite 8 + React 19.2 + **TypeScript 5.9.3** (NOT 7.0 — see risk below) + Tailwind 4 (`@tailwindcss/vite`). One Zod v4 schema (with `schemaVersion`) is the shared contract for form validation, import validation, AND the Phase 2 engine data model. One Zustand v5 store with `persist` + `createJSONStorage(localStorage)` + `version`/`migrate`/`merge` covers autosave and the read-guard. react-hook-form 7 + `@hookform/resolvers` v5 `zodResolver` powers the modals. Port the prototype's normalization and import-guard logic verbatim.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 미션 난이도는 **고정 3단계 — 쉬움(easy) / 보통(normal) / 어려움(hard)**. 강사 자유 입력 아님. 드롭다운/세그먼트로 선택, 색상·아이콘으로 표시. (MISSION-05)
- **D-02:** 미션 카테고리는 **자유롭게 추가·수정·삭제 가능한 목록**. 기본 시드 제공하되 강사가 새 카테고리를 얼마든지 추가. (MISSION-06)
- **D-03:** 한 미션이 **여러 카테고리를 태그처럼** 가짐(다중). 편집 UI는 태그 추가/제거식, 필터는 "해당 태그를 가진 미션" 기준. (AND across categories)
- **D-04:** 미션 찾기 = **이름 텍스트 검색 + 카테고리/난이도 필터 조합**. (MISSION-04)
- **D-05:** 이벤트 발생 확률은 **가중치 숫자(weight)** 로 입력. 합이 100이 아니어도 되며 **자동 정규화**. %는 UI 보조 표시. 퍼센트 직접 입력 아님. (EVENT-04, EVENT-06 기초)
- **D-06:** 내부 효과 종류는 **3가지뿐 — forward(앞으로 N칸) / backward(뒤로 N칸) / extra(한 번 더)**. (EVENT-05)
- **D-07:** "보너스 / 함정"은 **표시용 라벨**일 뿐 별도 메커니즘 아님. 데이터: `effect ∈ {forward, backward, extra}` + 표시 라벨/색상. 보너스=grape, 함정=coral.
- **D-08:** "앞으로/뒤로 N칸"의 N은 **이벤트마다 고정 숫자**(범위 랜덤 아님). "한 번 더"는 steps=0.

### Claude's Discretion (researcher/planner confirms)
- **시드/예시 콘텐츠:** 첫 실행 시 예시 미션·이벤트 + 시드 카테고리(기초/응용/고난도)를 채워두는 방향 권장(리셋/삭제 가능). → **CONFIRMED**: 프로토타입의 `seed()` 데이터를 그대로 사용(6 missions, 4 events, 3 categories). 아래 Data Model 참조.
- **편집기 화면 구성:** 미션 편집기와 이벤트 편집기를 **탭/섹션 분리** 권장. → **CONFIRMED**: 프로토타입 그대로 2탭(미션/이벤트), 각 탭 목록+검색+모달 편집. react-hook-form + Zod.
- **JSON 가져오기 동작:** 검증 실패 시 **기존 데이터 절대 덮어쓰지 않고 오류 안내**는 고정. 통과 시 "덮어쓰기 vs 병합"은 계획에서 확정. → **CONFIRMED (recommend)**: 프로토타입 동작 = 검증 통과 후 **명시적 확인(confirm) → 전체 덮어쓰기**. 병합은 v1 범위 밖. UI-SPEC Copywriting과 일치.

### Deferred Ideas (OUT OF SCOPE)
None — 논의가 phase 범위 안에 머물렀다. (시드 콘텐츠·레이아웃·import 병합 여부는 위 Discretion에서 확정.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MISSION-01 | 새 미션(이름/설명/난이도/카테고리) 추가 | react-hook-form + zodResolver modal; `store.addMission`. Prototype `mSave` handler. |
| MISSION-02 | 기존 미션 수정 | Same modal in edit mode; `store.updateMission(id, patch)`. Prototype `openMission(m)`/`Object.assign`. |
| MISSION-03 | 미션 삭제 | Confirm dialog (accessible modal per UI-SPEC) → `store.deleteMission(id)`. |
| MISSION-04 | 이름/카테고리로 검색 | Derived filtered list: name substring (case-insensitive) + category AND-filter + difficulty OR-filter. Prototype `renderM` filter. |
| MISSION-05 | 난이도 변경 (쉬움/보통/어려움) | Fixed `z.enum(['easy','normal','hard'])`; segmented control. |
| MISSION-06 | 카테고리 변경 | Free category list in store (`categories: string[]`); category picker in modal adds to shared list. |
| EVENT-01 | 새 이벤트(이름/효과/값/확률) 추가 | Event modal; `store.addEvent`. |
| EVENT-02 | 이벤트 수정 | `store.updateEvent`. |
| EVENT-03 | 이벤트 삭제 | `store.deleteEvent`. |
| EVENT-04 | 발생 확률(가중치) 변경 | integer `weight`; live normalization display. |
| EVENT-05 | 효과 종류: 보너스/함정/앞N/뒤N/한번더 | 3 real effects `{forward,backward,extra}` + label `{보너스,함정,''}` (D-06/D-07). |
| DATA-01 | localStorage 자동 저장 + 새로고침 유지 | Zustand `persist` + `createJSONStorage(localStorage)` + read-guard (`version`/`merge`/`onRehydrateStorage`). |
| DATA-02 | JSON 내보내기 | Serialize store slice → Blob → anchor download. Prototype `btnExport`. |
| DATA-03 | JSON 가져오기(복원) | FileReader → JSON.parse → Zod safeParse → confirm → replace. Prototype `fileInput` change. |
| DATA-04 | 가져오기 검증, 잘못된 파일은 덮어쓰지 않음 | Zod `safeParse` + `schemaVersion` check; on any failure show error toast, state untouched. |

## Architectural Responsibility Map

Single-tier client-only SPA — but capabilities still map to distinct internal layers. Getting these boundaries right keeps the store pure and testable (important because the store shape becomes the Phase 2 engine contract).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data model + validation | Schema layer (`schema.ts`, Zod) | — | One source of truth; consumed by store, forms, import. No React/DOM here. |
| Persistence + autosave | State layer (Zustand `persist`) | Browser localStorage | Store owns writes; `persist` middleware serializes on every mutation. |
| CRUD business logic | State layer (store actions) | — | `addMission`/`updateEvent` etc. are pure state transitions — the Phase 2 engine will reuse this data. Keep out of components. |
| Search / filter / normalization | Derived/selector layer (pure functions) | State layer | Computed from state, not stored. Pure fns are unit-testable and reused in render. |
| Form capture + field validation | Component layer (react-hook-form) | Schema layer (zodResolver) | RHF owns ephemeral form state; commits to store only on valid submit. |
| Export / import I/O | Component/IO layer (Blob, FileReader) | Schema layer (validate) + State layer (replace) | Browser file APIs are side-effectful; isolate from store; validate before any `setState`. |
| Rendering + theming | Component layer (React 19 + Tailwind 4 tokens) | — | JSX auto-escapes (XSS-safe); tokens from UI-SPEC. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | **19.2.8** `[VERIFIED: npm registry]` | UI framework | Locked by CLAUDE.md; R3F v9 line (needed Phase 3) requires React 19. |
| typescript | **5.9.3** `[VERIFIED: npm registry]` (NOT 7.0 — see Risk) | Type safety | 5.9.3 is the last 5.x and is fully supported by typescript-eslint, Vite, and all type packages. |
| vite | **8.1.5** `[VERIFIED: npm registry]` | Dev server + bundler | Rolldown-powered; requires Node `^20.19 \|\| >=22.12` (host has v22.23.1 ✓). |
| @vitejs/plugin-react | **6.0.4** `[VERIFIED: npm registry]` | React Fast Refresh + JSX | Peer `vite ^8.0.0` confirmed. v6 optionally wires `babel-plugin-react-compiler` (opt-in; skip for Phase 1). |
| zustand | **5.0.14** `[VERIFIED: npm registry]` | Global store + persistence | Peer `react >=18` ✓. `persist` middleware = autosave + read-guard in one. Clean `OK` legitimacy verdict. |
| zod | **4.4.3** `[VERIFIED: npm registry]` | Schema: forms + import + type source | Clean `OK` legitimacy verdict. One schema → `z.infer` types + `safeParse` import guard. |
| react-hook-form | **7.83.0** `[VERIFIED: npm registry]` | Modal forms | Peer `react ^19` ✓. Uncontrolled, minimal re-renders. |
| @hookform/resolvers | **5.4.2** `[VERIFIED: npm registry]` | Bridge RHF ↔ Zod | Peer declares `zod ^3.25.0 \|\| ^4.0.0` — **Zod 4 explicitly supported** `[VERIFIED: npm registry]`. `zodResolver` import path unchanged. |
| tailwindcss | **4.3.3** `[VERIFIED: npm registry]` | Styling via `@theme` tokens | v4 uses first-party Vite plugin, no PostCSS config. |
| @tailwindcss/vite | **4.3.3** `[VERIFIED: npm registry]` | Tailwind Vite integration | Peer `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8` — Vite 8 supported ✓. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react / @types/react-dom | 19.2.17 / 19.2.3 `[VERIFIED: npm registry]` | React 19 types | Always (dev dep). |

### Explicitly Deferred (do NOT install in Phase 1)

| Package | Defer to | Reason |
|---------|----------|--------|
| three, @react-three/fiber, @react-three/drei | Phase 3 | No 3D in Phase 1. Adds bundle + peer surface for zero value. `[ASSUMED]` re: Phase 3 versions — re-research at Phase 3. |
| @react-three/rapier | (skip; optional Phase 3) | Physics dice explicitly out of scope. |
| howler.js | Phase 2+ (v2 AUDIO reqs) | No audio in Phase 1. |
| react-router | Not needed | Single-page, tab-switch is local state, not routing. |
| immer | Optional | Zustand v5 works without it; the flat arrays here update fine with spreads. Add only if update ergonomics demand it. |

**Installation (Phase 1 only):**
```bash
# Scaffold (choose the react-ts template, then adjust versions)
npm create vite@latest powerjumping -- --template react-ts

# Pin the runtime + tooling
npm install react@19.2.8 react-dom@19.2.8 zustand@5.0.14 zod@4.4.3 \
  react-hook-form@7.83.0 @hookform/resolvers@5.4.2
npm install -D typescript@5.9.3 vite@8.1.5 @vitejs/plugin-react@6.0.4 \
  @types/react@19.2.17 @types/react-dom@19.2.3 \
  tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
```

> The `create vite` template may pin TypeScript 7.x by the time this runs — **explicitly downgrade to 5.9.3** (see Risk R1).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand persist | Manual `localStorage.setItem` in effects | Prototype does this manually; Zustand `persist` removes the boilerplate and gives `version`/`migrate`/`merge` for free. Recommended. |
| react-hook-form | Plain controlled `useState` per field | Prototype uses raw DOM. RHF gives zodResolver integration + focus management; worth it for two modals. Plain useState is acceptable if the team prefers — forms are small. |
| Tailwind 4 | Plain CSS with the prototype's `:root` custom properties | UI-SPEC permits **either**. The prototype's CSS-var token system is already complete and correct; porting it as plain CSS is lower-risk than re-authoring in `@theme`. Recommend Tailwind only if the team wants utility classes; otherwise lift the prototype `<style>` verbatim into `index.css`. |
| TypeScript 5.9.3 | TypeScript 7.0.2 | 10x faster builds but typescript-eslint unsupported until 7.1 (Risk R1). Not worth it for a small codebase. |

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm ...` this session. Note: `too-new` fired on packages whose **latest version** published within the tool's recency window (July 2026). Every flagged package has an official repo and 40M–240M weekly downloads — these are canonical, not slopsquats. Verdicts recorded honestly below with the recency rationale.

| Package | Registry | Weekly Downloads | Source Repo | Verdict | Disposition |
|---------|----------|------------------|-------------|---------|-------------|
| react | npm | 161,945,140 | github.com/facebook/react | SUS (too-new) | Approved — recency false-positive, canonical |
| react-dom | npm | 152,937,758 | github.com/facebook/react | SUS (too-new) | Approved — recency false-positive |
| typescript | npm | 243,734,374 | github.com/microsoft/TypeScript | SUS (too-new) | Approved — but pin 5.9.3 (Risk R1) |
| vite | npm | 157,648,184 | github.com/vitejs/vite | SUS (too-new) | Approved — recency false-positive |
| @vitejs/plugin-react | npm | 75,787,873 | github.com/vitejs/vite-plugin-react | SUS (too-new) | Approved — recency false-positive |
| react-hook-form | npm | 57,303,075 | github.com/react-hook-form/react-hook-form | SUS (too-new) | Approved — recency false-positive |
| @hookform/resolvers | npm | 48,598,178 | github.com/react-hook-form/resolvers | SUS (too-new) | Approved — recency false-positive |
| tailwindcss | npm | 114,702,350 | github.com/tailwindlabs/tailwindcss | SUS (too-new) | Approved — recency false-positive |
| @tailwindcss/vite | npm | 41,734,450 | github.com/tailwindlabs/tailwindcss | SUS (too-new) | Approved — recency false-positive |
| zustand | npm | 46,935,520 | github.com/pmndrs/zustand | OK | Approved |
| zod | npm | 239,177,371 | github.com/colinhacks/zod | OK | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** all `too-new` recency false-positives on canonical high-download packages with verified official repos — **no `checkpoint:human-verify` required**. If the planner/executor wants belt-and-suspenders, pin exact versions (done in the install block above) so a compromised newer patch can't be pulled.

## Data Model + Schema (shared contract — Phase 2 depends on this)

This is the **canonical shape** taken verbatim from the approved prototype's `seed()` and save/load. It becomes the Phase 2 engine contract. Author it once in `src/schema.ts` with Zod v4; derive TS types with `z.infer`.

```typescript
// src/schema.ts  — Source: ports 01-PROTOTYPE.html seed() + UI-SPEC Data-Model Note
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const Difficulty = z.enum(['easy', 'normal', 'hard']);
export const Effect = z.enum(['forward', 'backward', 'extra']);
export const EventLabel = z.enum(['보너스', '함정', '']); // display label only (D-07)

export const MissionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  desc: z.string().max(120).default(''),
  diff: Difficulty,
  cats: z.array(z.string()).default([]),
});

export const EventSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  eff: Effect,
  steps: z.number().int().min(0).max(20), // 0 when eff === 'extra' (D-08)
  weight: z.number().int().min(0).max(999),
  label: EventLabel.default(''),
});

// Top-level persisted/exported shape. `version` gates import + persist migrate.
export const ContentSchema = z.object({
  version: z.literal(SCHEMA_VERSION),   // strict: rejects other versions on import
  categories: z.array(z.string()),
  missions: z.array(MissionSchema),
  events: z.array(EventSchema),
});

export type Mission = z.infer<typeof MissionSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Content = z.infer<typeof ContentSchema>;
```

**Notes for the planner:**
- The prototype uses key `version` (not `schemaVersion`) inside the JSON blob. Keep the JSON field named `version` for wire compatibility with any files the instructor already exported from the prototype; you may still call the constant `SCHEMA_VERSION` in code. `[VERIFIED: prototype]`
- `label` uses Korean literal values `'보너스' | '함정' | ''` exactly as the prototype/UI-SPEC store them. Do NOT translate to enums like `bonus`/`trap` — the display layer reads these strings directly. `[VERIFIED: prototype + UI-SPEC]`
- Consider a cross-field refinement so `eff==='extra'` forces `steps===0` (prototype enforces this at save time; a `.superRefine` or `.transform` makes import robust too). `[ASSUMED]` — see A1.
- **Store shape** for Zustand adds derived-nothing; persist exactly `{ version, categories, missions, events }` so export = the persisted slice.

### schemaVersion + migrate pattern (future-proofing)

```typescript
// Zustand persist options fragment
{
  name: 'powerjumping_content_v1',           // matches prototype KEY
  storage: createJSONStorage(() => localStorage),
  version: SCHEMA_VERSION,                    // Zustand's own persist version
  migrate: (persisted: unknown, from: number) => {
    // from < SCHEMA_VERSION → transform old shape forward.
    // v1 is the first version, so no migration branches yet — return as-is.
    // When you bump to v2, add: if (from === 1) { persisted = upgradeV1toV2(persisted); }
    return persisted as Content;
  },
}
```

## localStorage Autosave + Read-Guard (DATA-01)

The requirement: a corrupt/partial/older localStorage payload must **never** overwrite good in-memory seed defaults or crash the app. The prototype's `load()` already does this with a try/catch + shape check falling back to `seed()`. Reproduce that guarantee with Zustand's three hooks: `version`/`migrate`, `merge`, and `onRehydrateStorage`.

```typescript
// src/store.ts — Source: ports prototype load()/save() into zustand persist
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ContentSchema, SCHEMA_VERSION, type Content } from './schema';
import { seedContent } from './seed';

interface Store extends Content {
  addMission: (m: Mission) => void;
  updateMission: (id: string, patch: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  // …event actions, addCategory, replaceAll(content) for import…
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...seedContent(),          // in-memory default = seed (never lost)
      addMission: (m) => set((s) => ({ missions: [m, ...s.missions] })),
      // …
      replaceAll: (c: Content) => set({ ...c }),   // used by import after validation
    }),
    {
      name: 'powerjumping_content_v1',
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
      partialize: (s) => ({
        version: SCHEMA_VERSION,
        categories: s.categories,
        missions: s.missions,
        events: s.events,
      }),
      // READ-GUARD: validate persisted payload; on any failure keep current (seed) state.
      merge: (persisted, current) => {
        const parsed = ContentSchema.safeParse(persisted);
        if (!parsed.success) {
          // corrupt/old/partial → ignore persisted, keep seed defaults
          return current;
        }
        return { ...current, ...parsed.data };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          // JSON.parse threw or storage unreadable → seed defaults already in place
          console.warn('[powerjumping] storage rehydrate failed; using seed', error);
        }
      },
    },
  ),
);
```

**Why this is robust:** `merge` runs the same `ContentSchema.safeParse` used by import, so a hand-corrupted localStorage value is rejected exactly like a bad file — and because the store's initializer already contains `seedContent()`, rejection silently falls back to good defaults. `[ASSUMED]` API shape from training/zustand docs — see A2; behavior mirrors the prototype's verified `load()` guard.

## JSON Export / Import with Non-Destructive Validation (DATA-02..04)

The prototype implements the exact required flow; port it. **The cardinal rule (DATA-04): never call `replaceAll`/`setState` until validation passes.**

### Export (DATA-02)
```typescript
function exportContent(content: Content) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '파워점핑-콘텐츠.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  // toast: '파일로 내보냈어요 📁'
}
```

### Import (DATA-03 + DATA-04) — validate-before-commit
```typescript
function importContent(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    // 1) parse JSON — failure ≠ overwrite
    let raw: unknown;
    try { raw = JSON.parse(reader.result as string); }
    catch { return toast('파일을 읽을 수 없어요. 올바른 JSON이 아니에요.', 'err'); }

    // 2) schema + version validate (ContentSchema.version is z.literal(1))
    const parsed = ContentSchema.safeParse(raw);
    if (!parsed.success) {
      return toast('형식/버전이 맞지 않아요. 기존 데이터는 그대로 둘게요.', 'err');
    }

    // 3) explicit confirmation (default = overwrite per CONTEXT)
    //    Use an accessible confirm dialog, not native confirm() (UI-SPEC a11y).
    confirmDialog('가져오면 지금 데이터를 이 파일 내용으로 바꿔요. 계속할까요?', () => {
      useStore.getState().replaceAll(parsed.data);   // ONLY here does state change
      toast('가져오기 완료! 🎉', 'ok');
    });
  };
  reader.readAsText(file);
}
```

**Hardening beyond the prototype (recommended):**
- **Size guard:** reject files over e.g. 5MB before `readAsText` to avoid a DoS-ish freeze on a giant file (`if (file.size > 5_000_000) return toast(err)`). `[ASSUMED]` — see A3.
- Because `ContentSchema.version = z.literal(1)`, a file exported by a future v2 app is cleanly rejected with the "형식/버전" error (safe by construction) rather than half-imported.
- Reset filter/search UI state after a successful import (prototype clears `searchM/searchE/activeCats/activeDiff`).

## Event Weight → Probability Normalization (D-05)

Small, exact algorithm — ported verbatim from prototype `renderE`:

```typescript
// Normalized percent for display only; teacher edits integer weight.
function normalizedPercents(events: Event[]): Map<string, number> {
  const total = events.reduce((s, e) => s + (Number.isFinite(e.weight) ? e.weight : 0), 0);
  const pct = new Map<string, number>();
  for (const e of events) {
    pct.set(e.id, total > 0 ? Math.round((e.weight / total) * 100) : 0);
  }
  return pct;
}
```

**Edge cases (all handled):**
- **All-zero weights** (or empty list): `total === 0` → every event shows `0%` and an empty probability bar. No division-by-zero. This is the prototype's behavior and is acceptable — optionally show a hint "가중치가 모두 0이에요" but not required.
- **Single event** with weight > 0: shows `100%`.
- **Add/remove event:** percentages re-derive live from the current list on every render; **no rebalancing of other events' stored weights** (that is the entire point of D-05). Because normalization is computed, not stored, add/remove is automatically correct.
- **Rounding:** `Math.round` per-event means displayed percents may sum to 99% or 101% (e.g., three equal weights → 33/33/33 = 99). This is a **display-only** cosmetic artifact and is acceptable for a teacher tool; the actual Phase 2 draw uses raw integer weights, not the rounded percents. `[VERIFIED: prototype]` Do **not** attempt largest-remainder correction unless the client complains — it adds complexity for no gameplay benefit.

> Phase 2 note (not this phase): the actual weighted random pick uses raw `weight` values (cumulative-weight / `total` sampling), independent of the rounded display %. Keep display and draw logic separate.

## Editor UX Patterns

### react-hook-form + zodResolver modal
```typescript
// Source: react-hook-form 7 + @hookform/resolvers 5 (zod peer ^4 verified)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MissionSchema } from './schema';

const { register, handleSubmit, reset, setFocus, formState: { errors } } =
  useForm<Mission>({ resolver: zodResolver(MissionSchema) });

// open-for-edit: reset(existingMission); open-for-new: reset(emptyMission)
// autofocus name on open (prototype does setTimeout 30ms): useEffect(() => setFocus('name'), [open])
// onValid submit → store.addMission / store.updateMission → close modal + toast
```
- `zodResolver` import path is `@hookform/resolvers/zod` (unchanged in v5). Peer explicitly lists `zod ^4.0.0` — no shim needed. `[VERIFIED: npm registry]`
- Difficulty/effect/label are **not** free text — model them as segmented controls writing to RHF via `setValue`/controlled register, or a small `Controller`. Validate with the `z.enum` fields.

### Multi-category tag input (D-02/D-03)
- Two lists: `store.categories` (shared, growable) and the mission's selected `cats`.
- Modal shows all `categories` as toggle chips (selected = in `cats`) + an inline "새 카테고리 추가…" input. Enter or "추가" button appends to `store.categories` immediately (persists via `persist`) and auto-selects it. Verbatim prototype `mAddCat` behavior.
- Guard against duplicate category names (`if (!categories.includes(v)) addCategory(v)`).

### Search + filter composition (D-04)
Pure selector over `missions`, computed each render (not stored):
```typescript
const visible = missions.filter((m) => {
  if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
  if (diffOn.length && !diffOn.includes(m.diff)) return false;      // OR within difficulty
  if (catOn.length && !catOn.every((c) => m.cats.includes(c))) return false; // AND across categories
  return true;
});
```
Counts on tabs always reflect the **full** unfiltered list (`missions.length`), per UI-SPEC.

### React 19 specifics
- React 19 auto-batches and ships the new JSX transform (no `import React`); the `create vite react-ts` template configures this. `[ASSUMED]`
- **XSS:** the prototype hand-escapes with `esc()` because it builds `innerHTML` strings. In React you render `{m.name}` as JSX children — **React auto-escapes**, so drop the manual escaping. Never use `dangerouslySetInnerHTML` for user/mission/event/category text. `[VERIFIED: React rendering model]`
- React Compiler (`babel-plugin-react-compiler`, now v1) is available via plugin-react 6 but **opt-in**; leave it OFF for Phase 1 to keep the toolchain simple. `[VERIFIED: npm registry — plugin peer]`

## Architecture Patterns

### System Architecture (data flow)
```
                    ┌──────────────── seed.ts (default content) ─────────────┐
                    │                                                        v
  localStorage  <──persist(partialize)──  Zustand store  ──selectors──>  React components
     │  (autosave every mutation)              ^   │                     (미션/이벤트 tabs,
     │                                          │   │                      cards, filters)
     └──rehydrate──> merge(safeParse) ──valid?──┘   │                          │
        (READ-GUARD: invalid → keep seed)           │                          │ user edits
                                                     │                          v
   Export: JSON.stringify(slice) → Blob → download   │                react-hook-form modal
   Import: File → JSON.parse → ContentSchema.safeParse ─valid+confirm─> store.replaceAll
                    │                                                          ^
                    └── invalid → error toast, store UNCHANGED (DATA-04) ──────┘
                                                     ▲
                              schema.ts (Zod) validates: forms, import, read-guard  ── one source
```

### Recommended Project Structure
```
src/
├── schema.ts          # Zod schemas + z.infer types (the Phase 2 contract)
├── seed.ts            # seedContent(): default missions/events/categories (from prototype)
├── store.ts           # Zustand store + persist + read-guard + CRUD actions
├── lib/
│   ├── io.ts          # exportContent / importContent (Blob, FileReader, validate)
│   └── normalize.ts   # normalizedPercents (+ Phase-2-facing draw helper later)
├── components/
│   ├── MissionTab.tsx / MissionCard.tsx / MissionModal.tsx
│   ├── EventTab.tsx / EventCard.tsx / EventModal.tsx
│   ├── FilterRow.tsx / CategoryPicker.tsx / SegmentedControl.tsx
│   ├── Toast.tsx / ConfirmDialog.tsx / Modal.tsx (accessible shell)
│   └── Header.tsx / Tabs.tsx
├── styles/index.css   # Tailwind @theme tokens OR prototype :root custom props
├── App.tsx
└── main.tsx
```

### Pattern: derived-not-stored
Search results, active filters, and normalized percents are **computed each render** from store state, never persisted. This keeps the persisted slice minimal (= the export shape) and avoids stale-derived bugs.

### Anti-Patterns to Avoid
- **Storing normalized % in the event record.** It's derived; storing it invites drift on add/remove (violates D-05's "no rebalancing"). Compute it.
- **Committing to the store from inside the modal before validation.** Validate via zodResolver first; only `onValid` writes to the store.
- **`dangerouslySetInnerHTML` for any editor text.** Use JSX children (auto-escaped).
- **Overwriting state before import validation.** DATA-04 hard rule — parse+validate+confirm THEN replace.
- **Re-authoring the palette/type system.** UI-SPEC is locked to the approved prototype; lift its tokens, don't invent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage autosave + rehydrate + versioning | Manual `setItem`/`getItem` + effect wiring | Zustand `persist` (`version`/`migrate`/`merge`) | Free versioning, migration hook, and a single read-guard seam. |
| Import/form validation | Hand-written `typeof`/`Array.isArray` checks | One Zod schema (`safeParse`) | Same schema guards forms, import, AND rehydrate; typed via `z.infer`. |
| Form state + field errors | Per-field `useState` + manual error strings | react-hook-form + zodResolver | Focus mgmt, minimal re-renders, error wiring for free. |
| Deriving types from data shape | Duplicate hand-written interfaces | `z.infer<typeof Schema>` | Types can't drift from the validator. |
| Escaping user text | Manual `esc()` (prototype needed it for innerHTML) | JSX auto-escaping | React escapes children by default. |

**Key insight:** The prototype hand-rolled all of the above because it's dependency-free vanilla JS. In the React stack, **each hand-rolled piece is replaced by exactly one library feature** — that substitution *is* the port. Preserve the prototype's *behavior*, replace its *mechanism*.

## Runtime State Inventory

Greenfield — no existing runtime state to migrate. One forward-compatibility note:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage key `powerjumping_content_v1` used by the prototype (if the instructor tested the prototype in this browser) | Keep the SAME key + `version:1` shape so a real React build reads any prototype-saved data. The read-guard rejects it safely if shape differs. |
| Live service config | None — no external services. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — no server, no keys. | None. |
| Build artifacts | None yet (no source). Plan 01-01 creates them. | None. |

## Common Pitfalls

### Pitfall 1: Vite template pins TypeScript 7
**What goes wrong:** `npm create vite react-ts` may install `typescript@7.x`; typescript-eslint then fails to load (no stable programmatic API until TS 7.1).
**Why:** TS 7.0 GA'd 2026-07-08; tooling lag.
**How to avoid:** Explicitly `npm install -D typescript@5.9.3` after scaffolding; pin it in package.json.
**Warning signs:** ESLint crashes with "could not find TypeScript"; `@typescript-eslint/*` peer warnings.

### Pitfall 2: Overwriting good data on bad import
**What goes wrong:** State replaced before validation → instructor loses their library to a corrupt file.
**Why:** Naive `setState(JSON.parse(file))`.
**How to avoid:** The three-step validate-before-commit flow above; `replaceAll` runs ONLY inside the success branch. This is DATA-04's core.
**Warning signs:** Any code path where `JSON.parse` result reaches the store without a `safeParse` gate.

### Pitfall 3: Zod version field too loose
**What goes wrong:** `version: z.number()` accepts a v2 file into a v1 app → half-broken import.
**Why:** Non-strict version field.
**How to avoid:** `version: z.literal(SCHEMA_VERSION)` — future versions rejected cleanly with the "형식/버전" error.

### Pitfall 4: Difficulty/effect modeled as free string
**What goes wrong:** Typos / invalid values slip into records, break Phase 2 engine switch.
**How to avoid:** `z.enum([...])` for `diff` and `eff`; segmented controls, not text inputs.

### Pitfall 5: Native `confirm()`/`alert()` for delete & import
**What goes wrong:** Fails UI-SPEC a11y (focus trap, Esc, aria-modal) and looks unbranded.
**How to avoid:** Accessible `ConfirmDialog` component (role="dialog", aria-modal, focus-trapped, Esc-cancellable) with the exact UI-SPEC copy. Prototype uses native `confirm` only because it's a throwaway mockup.

## Code Examples

Consolidated above (schema.ts, store.ts read-guard, io.ts import/export, normalize.ts, RHF modal). All ported from the verified `01-PROTOTYPE.html` behavior; version/API claims verified against npm this session.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@hookform/resolvers` v3 (Zod 3 only) | v5.4.2 — peer `zod ^3.25 \|\| ^4.0` | 2026 | Zod 4 works directly with `zodResolver`, no downgrade. |
| Tailwind 3 + PostCSS config | Tailwind 4 + `@tailwindcss/vite`, `@theme`/`@import "tailwindcss"` | 2025 | No `tailwind.config.js`/PostCSS needed; tokens in CSS. |
| Vite 5/6 (esbuild/Rollup) | Vite 8.1.5 (Rolldown) | 2026 | Faster prod builds; Node ≥20.19/≥22.12 required. |
| TypeScript 5.x (JS compiler) | TS 7.0 (Go native, 10x) — but tooling lagging | 2026-07-08 GA | **Stay on 5.9.3** until typescript-eslint 7.1 support lands. |
| Zustand persist without validation | `merge` + Zod `safeParse` read-guard | pattern | Corrupt storage can't crash or overwrite defaults. |

**Deprecated/outdated:**
- Tailwind `tailwind.config.js` / `postcss.config.js` for this use case — replaced by the Vite plugin + `@theme`.
- Manual `React` import for JSX — not needed with React 19 + modern plugin-react.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `.superRefine` forcing `steps===0` when `eff==='extra'` is safe to add to EventSchema | Data Model | Low — prototype enforces at save; if Zod refine syntax differs in v4, use `.check()` or transform. Verify when coding. |
| A2 | Zustand v5 `persist` exposes `merge`, `onRehydrateStorage`, `partialize`, `version`, `migrate` with the shapes shown | Read-Guard | Medium — if an option name/signature differs, the read-guard still works via `merge` alone or a manual rehydrate check (prototype's try/catch load is the proven fallback). Confirm against zustand docs when coding. |
| A3 | A 5MB import size cap is an appropriate DoS guard | Import | Low — cosmetic threshold; adjust freely. |
| A4 | React 19 + `@vitejs/plugin-react` template needs no `import React` and auto-batches | React specifics | Low — standard React 19 behavior; template handles it. |
| A5 | Tailwind 4 `@theme` can express the prototype's exact tokens, OR plain CSS is used | Styling | Low — UI-SPEC explicitly permits plain CSS fallback (lift prototype `<style>`). |
| A6 | Zod v4 `zodResolver` needs no adapter with `@hookform/resolvers` v5 | Editor UX | Low — peer dep `zod ^4.0.0` verified this session; strongly supported. |

## Open Questions

1. **Tailwind 4 `@theme` vs. lift prototype CSS verbatim**
   - Known: UI-SPEC permits either; prototype CSS is complete and correct.
   - Unclear: team preference for utility classes vs. plain CSS.
   - Recommendation: lift the prototype `<style>` into `src/styles/index.css` as plain CSS custom properties (lowest risk, zero re-authoring). Add Tailwind only if the team wants utilities. Planner decides in 01-01.

2. **Accessible ConfirmDialog vs. reusing the edit Modal shell**
   - Known: UI-SPEC requires focus-trapped, Esc-cancellable, aria-modal dialogs for delete + import overwrite.
   - Recommendation: build one small `Modal`/`ConfirmDialog` shell and reuse it for edit modals, delete confirm, and import confirm. Planner defines in 01-02.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8 (`^20.19 \|\| >=22.12`) | ✓ | v22.23.1 | — |
| npm | install/scripts | ✓ | 10.9.8 | — |
| Modern browser (Chrome) | Runtime target | ✓ (assumed dev machine) | — | — |
| Internet (npm registry) | First install | assume ✓ | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — host Node satisfies Vite 8's minimum.

## Security Domain

`security_enforcement: true`, ASVS Level 1. This is a **client-only, no-auth, no-network, no-crypto, single-device** app. Most ASVS categories are N/A; the real attack surface is **untrusted JSON import** and **user-supplied text rendering**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts/login (explicitly out of scope). |
| V3 Session Management | no | No sessions/server. |
| V4 Access Control | no | Single local user (instructor). |
| V5 Input Validation | **yes** | Zod `ContentSchema.safeParse` on every import AND on rehydrate; reject-and-preserve on failure (DATA-04). File size cap. |
| V6 Cryptography | no | No secrets, no crypto. Do not invent any. |
| V7 Error Handling | yes (light) | Import/parse failures show a friendly toast, never crash; existing data preserved. |
| V14 Config | yes (light) | Pin exact package versions (done) to reduce supply-chain risk from a compromised newer patch. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/corrupt JSON import corrupts or wipes library | Tampering / DoS | Validate-before-commit: `JSON.parse` in try/catch → `ContentSchema.safeParse` → confirm → replace. State never mutated on failure (DATA-04). |
| XSS via mission/event/category names rendered in UI | Injection (XSS) | Render as JSX children (React auto-escapes). No `dangerouslySetInnerHTML`. Prototype's manual `esc()` becomes unnecessary. |
| Oversized import file freezes tab | DoS | Size guard (~5MB) before `readAsText`. |
| localStorage quota exceeded on save | DoS (local) | `persist` write wrapped safely; catch quota errors, toast, keep in-memory state (prototype's `save()` try/catch). |
| Supply-chain (compromised transitive/newer patch) | Tampering | Exact-version pins + lockfile; canonical packages only (see Legitimacy Audit). |

No server, no cookies, no tokens → no CSRF/SSRF/authz surface in Phase 1.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, this session, 2026-07-25) — exact latest versions + peer deps for react 19.2.8, react-dom 19.2.8, typescript 5.9.3/7.0.2, vite 8.1.5, @vitejs/plugin-react 6.0.4, zustand 5.0.14, zod 4.4.3, react-hook-form 7.83.0, @hookform/resolvers 5.4.2 (peer `zod ^3.25||^4.0`), tailwindcss 4.3.3, @tailwindcss/vite 4.3.3 (peer `vite ...||^8`).
- `01-PROTOTYPE.html` — user-approved working implementation: data model, seed, normalization, read-guard, import/export validation, all copy.
- `01-UI-SPEC.md` — approved visual/token/interaction/a11y contract; Data-Model Note.
- `gsd-tools query package-legitimacy check` (this session) — verdicts + download/repo signals.

### Secondary (MEDIUM confidence)
- WebSearch (2026-07-25): TypeScript 7.0 GA on 2026-07-08; typescript-eslint stable API not until TS 7.1; side-by-side/alias recommended. Sources: devblogs.microsoft.com/typescript (Announcing TypeScript 7.0), typescript-eslint GitHub issue #12518.

### Tertiary (LOW confidence)
- Training-knowledge API shapes for Zustand `persist` options and Zod v4 refinement syntax (Context7 MCP was unavailable this session) — logged in Assumptions Log (A1, A2, A6) for the planner/executor to confirm while coding.

## Metadata

**Confidence breakdown:**
- Standard stack (versions/compat): HIGH — every version + key peer dep pulled from npm this session.
- Data model / normalization / import-guard: HIGH — ported from user-approved working prototype.
- Zustand persist / Zod refine exact API surface: MEDIUM — training knowledge, Context7 unavailable; behavior anchored to prototype's verified logic (see A2/A1).
- TypeScript version strategy: HIGH — TS7 GA + eslint gap corroborated by multiple web sources.
- Architecture / pitfalls / security: HIGH — small, well-understood client-only surface.

**Research date:** 2026-07-25
**Valid until:** 2026-08-24 (30 days; fast-moving — re-verify vite/tailwind/typescript-eslint TS7.1 status before Phase 3 3D research)

Sources:
- [Announcing TypeScript 7.0 - TypeScript](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript 7.0.2 Support · Issue #12518 · typescript-eslint](https://github.com/typescript-eslint/typescript-eslint/issues/12518)
- [Speedier type checks in TypeScript 7.0 (The Register)](https://www.theregister.com/devops/2026/07/09/speedier-type-checks-in-typescript-70-as-first-stable-go-release-ships/)
