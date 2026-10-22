---
phase: 01-foundation-content-editor
plan: 02
subsystem: foundation-content-editor
status: complete
tags: [mission-editor, react-hook-form, zod-resolver, accessible-modal, focus-trap, category-cascade, d-02, d-03, d-04]
requires:
  - "src/store.ts: useStore (addMission/updateMission/deleteMission/addCategory/deleteCategory/renameCategory)"
  - "src/schema.ts: MissionSchema (name.min(1).max(40), desc.max(120), diff enum, cats[])"
  - "src/seed.ts: uid()"
  - "src/components/Toast.tsx: showToast()"
provides:
  - "src/components/Modal.tsx: accessible focus-trapped dialog shell (role=dialog, aria-modal, Esc, backdrop, focus restore)"
  - "src/components/ConfirmDialog.tsx: reusable confirm dialog on Modal (cancel-focused, exact caller copy)"
  - "src/components/SegmentedControl.tsx: generic semantic-color segmented button group"
  - "src/components/MissionModal.tsx: add/edit mission form (RHF + zodResolver)"
  - "src/components/CategoryPicker.tsx: multi-select chips + inline add / ✎ rename / ✕ confirmed cascade-delete (D-02)"
  - "src/components/FilterRow.tsx: difficulty(OR) + category(AND) filter chips"
  - "src/components/MissionTab.tsx: 미션 view — search + filters + grid + modal + delete confirm"
  - "src/components/MissionCard.tsx: extended with ✏️ edit / 🗑️ delete mini-buttons"
affects:
  - "01-03 (event editor + JSON backup) reuses Modal / ConfirmDialog / SegmentedControl and the import-overwrite confirm"
  - "App now delegates the 미션 tab to MissionTab"
tech-stack:
  added: []
  patterns:
    - "Accessible modal = one Modal shell (role=dialog, aria-modal, focus-trap, Esc, backdrop, focus restore) reused by ConfirmDialog + editors"
    - "Forms use react-hook-form + zodResolver; store writes happen only on a valid submit (T-01-04)"
    - "Derived visible list (search + difficulty OR + category AND) computed with useMemo, never stored"
    - "MissionTab reconciles active category filters against store.categories every render so a deleted category never strands the list (D-02)"
    - "Form schema derived from MissionSchema with .extend() to drop .default() so RHF/zodResolver input===output types stay consistent"
key-files:
  created:
    - src/components/Modal.tsx
    - src/components/ConfirmDialog.tsx
    - src/components/SegmentedControl.tsx
    - src/components/Modal.test.tsx
    - src/components/MissionModal.tsx
    - src/components/CategoryPicker.tsx
    - src/components/MissionModal.test.tsx
    - src/components/CategoryPicker.test.tsx
    - src/components/MissionTab.tsx
    - src/components/FilterRow.tsx
    - src/components/MissionTab.test.tsx
  modified:
    - src/components/MissionCard.tsx
    - src/App.tsx
    - src/styles/index.css
decisions:
  - "Ported the prototype's editor CSS (modal/form/segment/chip/catpicker/toolbar/filter/mini) into index.css — these classes were not carried over in 01-01, only the base layout was"
  - "Derived MissionModal's form schema via MissionSchema.omit({id}).extend({desc,cats}) to eliminate the Zod-default input/output type divergence that broke tsc"
  - "ConfirmDialog focuses the CANCEL button by default (safe default for destructive actions)"
  - "CategoryPicker composite chip = toggle label button + ✎ + ✕; rename commits on Enter/blur, Esc cancels, empty/unchanged is a no-op"
metrics:
  tasks_completed: 3
  files_created: 11
  files_modified: 3
  tests_added: 24
  tests_total: 53
  duration: "~1 session (single pass)"
  completed: 2026-07-25
---

# Phase 1 Plan 02: 미션 Editor — Accessible Modal + CRUD + Search/Filter + Category Management Summary

Delivered the complete 미션 editor as the first fully user-driven vertical slice: an accessible, focus-trapped add/edit modal (react-hook-form + `zodResolver(MissionSchema)`), inline multi-category management with ✎ rename and ✕ confirmed cascade-delete (D-02), destructive-action confirmation via a shared accessible `ConfirmDialog`, and a live name-search + difficulty(OR)/category(AND) filter toolbar — all faithfully ported from `01-PROTOTYPE.html` and covered by 24 new tests (53 total) with a green production build.

## What Was Built

- **Shared primitives (Task 1):** `Modal` (role=dialog, aria-modal, focus moved in on open + restored on close, focus-trap on Tab, Esc + backdrop close), `ConfirmDialog` (built on Modal, cancel-focused, exact caller copy — reused for delete and, in 01-03, import overwrite), and `SegmentedControl` (equal-flex semantic-color button group driving the `.seg button.sel[data-v=…]` styling). `Modal.test.tsx` asserts dialog semantics, Esc/backdrop close, focus-in, and confirm/cancel wiring.
- **Mission form + categories (Task 2, TDD):** `MissionModal` — an RHF form validated by `zodResolver` (form schema derived from `MissionSchema`), difficulty via `SegmentedControl` (쉬움/보통/어려움 only, D-01, default easy), name autofocus, and success/error toasts with the exact copy. `CategoryPicker` — existing categories as toggle chips (D-03 multi-select), an inline `새 카테고리 추가…` input that dedupes + auto-selects, plus per-chip ✎ rename (Enter/blur commit, Esc cancel, no-op on empty/unchanged) and ✕ delete that opens `ConfirmDialog` with cascade-warning copy and calls `store.deleteCategory` on confirm.
- **List + toolbar (Task 3):** `MissionTab` owns the 미션 view — a live 🔎 search, the `＋ 새 미션` CTA, a `FilterRow`, and the responsive grid. The visible list is a `useMemo` selector (name substring + difficulty OR + category AND); count pills stay on the full list (in `App`/`Tabs`). Distinct no-data vs no-match empty states. `MissionCard` gained the top-right ✏️/🗑️ actions; delete routes through `ConfirmDialog`. `MissionTab` reconciles its active category filter against `store.categories` on every render so a just-deleted category can never strand the list at zero matches (D-02).

## Requirements Delivered (MISSION-01..06)

- **MISSION-01/02:** add and edit missions (name, desc, difficulty, categories) — persisted via the store, prepend on add, in-place update on edit.
- **MISSION-03:** delete a mission behind an accessible, focus-trapped confirm dialog that names the mission.
- **MISSION-04 / D-04:** live name search combined with difficulty (OR within) and category (AND across) filters.
- **MISSION-05 / D-01:** difficulty is the fixed 3-level segmented control.
- **MISSION-06 / D-02/D-03:** multi-category tagging plus inline category creation, rename, and confirmed cascade-delete into the shared `store.categories`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Editor CSS classes were absent from `index.css`**
- **Found during:** Task 1/2 (components referenced `.overlay/.modal/.field/.seg/.catpick/.catadd/.chip/.foot/.btn-primary/.btn-cancel/.toolbar/.search/.add/.filters/.flabel/.acts/.mini/.row2` that did not exist).
- **Issue:** 01-01 ported only the base layout tokens/classes into `src/styles/index.css`; the prototype's modal/form/segment/chip/toolbar/filter styles were never carried over, so the new editor UI would render unstyled.
- **Fix:** Ported the missing style blocks verbatim from `01-PROTOTYPE.html` (normalized to the token system) plus a small composite `.catchip/.cat-mini/.cat-edit` set for the rename/delete chip controls, with `:focus-visible` rings added per the UI-SPEC accessibility rule. `index.css` was not in the plan's `files_modified`, but the components require these classes.
- **Files modified:** src/styles/index.css
- **Commits:** b3fab2b (modal/form/chip/toolbar), 8dddc22 (filter row + card mini-buttons)

**2. [Rule 3 - Blocking] Zod `.default()` broke the RHF + zodResolver types (tsc failure)**
- **Found during:** Task 2 (`npm run build`).
- **Issue:** `MissionSchema` uses `.default('')`/`.default([])` on `desc`/`cats`, so the schema's Zod input type (optional) diverged from its output type (required); `zodResolver` and `useForm<z.infer<…>>` then disagreed and `tsc -b` failed with a `ResolverOptions` incompatibility and a fallback-to-`FieldValues` on `handleSubmit`.
- **Fix:** Derived the form schema as `MissionSchema.omit({ id: true }).extend({ desc: z.string().max(120), cats: z.array(z.string()) })` — dropping the defaults so input === output while still tracing to `MissionSchema` and validating the same fields.
- **Files modified:** src/components/MissionModal.tsx
- **Commit:** b3fab2b

### Intentional churn (within-plan)

- Task 2 temporarily mounted `MissionModal` + a `＋ 새 미션` button directly in `App.tsx` (per the plan's "App only needs to render the modal container" note); Task 3 relocated that ownership into `MissionTab` and reduced `App` to delegating the 미션 tab to `<MissionTab/>`. Expected, plan-directed.

## Verification Results

- `npm run test` → 53 tests across 8 files, all passing (24 new: Modal 8, CategoryPicker 5, MissionModal 4, MissionTab 7).
- `npm run build` → exit 0 (`tsc -b` clean, `dist/` emitted).
- Acceptance greps: `zodResolver` present in `MissionModal.tsx`; `deleteCategory` and `renameCategory` present in `CategoryPicker.tsx`.
- TDD gate (Task 2): RED commit `8fb186c` (failing tests) precedes GREEN commit `b3fab2b` (implementation).

## Threat Mitigations Applied

- **T-01-03 (XSS / injection):** every user string (mission name/desc, category names, filter/tag labels) is rendered as JSX children (React auto-escapes); no `dangerouslySetInnerHTML`, no markup assembled from raw strings. The existing App XSS test (markup-in-name renders as literal text) still passes through the new `MissionCard`/`MissionTab` path.
- **T-01-04 (tampering):** `MissionModal` commits to the store only via `handleSubmit(onValid)` after `zodResolver(MissionSchema-derived)` validation; an empty name (or any invalid field) is blocked before `addMission`/`updateMission`, keeping the store shape valid for Phase 2.

## Notes for Next Plans

- **01-03** reuses `Modal`, `ConfirmDialog`, and `SegmentedControl` directly — the event modal mirrors `MissionModal` (effect + steps + weight + label; the `.row2` and step-visibility toggle CSS is already in place), and the import-overwrite flow should reuse `ConfirmDialog` with the copy `가져오면 지금 데이터를 이 파일 내용으로 바꿔요. 계속할까요?`.
- `Header.tsx` export/import buttons remain inert (`disabled`) — wire them in 01-03.
- When adding forms with Zod `.default()` fields, derive the form schema without defaults (or use `z.input`) to keep RHF + zodResolver types aligned (see Deviation 2).

## Self-Check: PASSED
