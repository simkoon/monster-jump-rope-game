---
phase: 01-foundation-content-editor
plan: 03
subsystem: foundation-content-editor
status: complete
tags: [event-editor, react-hook-form, zod-resolver, weight-normalization, json-export, validate-before-commit, event-01, data-02, data-03, data-04]
requires:
  - "src/store.ts: useStore (addEvent/updateEvent/deleteEvent/replaceAll)"
  - "src/schema.ts: EventSchema (eff/steps/weight/label + extra⇒steps 0 refine), ContentSchema (version literal 1), Effect/EventLabel enums"
  - "src/lib/normalize.ts: normalizedPercents(events)"
  - "src/components/{Modal,ConfirmDialog,SegmentedControl,Toast}.tsx (from 01-01/01-02)"
provides:
  - "src/components/EventModal.tsx: add/edit event form (RHF + zodResolver) — effect/steps/weight/label, extra hides 몇 칸? and stores steps 0"
  - "src/components/EventTab.tsx: 이벤트 view — name search + ＋ 새 이벤트 + probability hint banner + grid + modal + delete confirm"
  - "src/components/EventCard.tsx: extended with ✏️ edit / 🗑️ delete mini-buttons (live probability bar retained)"
  - "src/lib/io.ts: exportContent(content) + importContent(file, handlers) validate-before-commit guard"
  - "src/components/Header.tsx: 내보내기/가져오기 wired to io.ts with an accessible overwrite ConfirmDialog"
affects:
  - "Phase 1 content library is now feature-complete (missions + events, autosaved, portable via JSON file)"
  - "Phase 2 engine consumes the event {eff, steps, weight, label} shape as its event-effect + weighted-draw contract"
tech-stack:
  added: []
  patterns:
    - "RHF three-generic useForm<Input, Context, Output> to keep a Zod preprocess()-driven schema's input (unknown) and output (number) types consistent — the general fix for the input/output divergence 01-02 hit with .default()"
    - "Probability % is derived per-render via normalizedPercents over the FULL event list; weight edits re-derive every card with no rebalancing of others' stored weights (D-05)"
    - "Validate-before-commit import: size guard → JSON.parse → ContentSchema.safeParse → explicit confirm → replaceAll; replaceAll is reachable ONLY from the validated+confirmed branch (DATA-04)"
    - "Overwrite confirmation uses the shared accessible ConfirmDialog (focus-trapped), never native confirm()"
    - "io.ts signals the caller via onNeedConfirm(proceed) so the confirm UI stays in React while the guard logic stays framework-light"
key-files:
  created:
    - src/components/EventModal.tsx
    - src/components/EventModal.test.tsx
    - src/components/EventTab.tsx
    - src/components/EventTab.test.tsx
    - src/lib/io.ts
    - src/lib/io.test.ts
  modified:
    - src/components/EventCard.tsx
    - src/components/Header.tsx
    - src/App.tsx
decisions:
  - "EventModal form schema is a plain z.object mirroring EventSchema's fields (EventSchema is a ZodEffects from its .refine(), so it cannot be .omit()'d); the extra⇒steps 0 rule and the 1-20 / 0-999 clamps are applied in onValid, matching the prototype's eSave clamp semantics (clamp, not reject)"
  - "steps/weight use z.preprocess to fall back on NaN (empty number field); the resulting input/output type split is handled by RHF's three-generic useForm rather than by dropping the preprocess"
  - "importContent delegates only the overwrite-confirm UI to the caller (onNeedConfirm/proceed) and keeps size/parse/schema validation + replaceAll + toasts internal, so the DATA-04 cardinal rule lives in one place"
  - "Header reads the export slice via useStore.getState() at click time (no all-content subscription / re-renders)"
metrics:
  tasks_completed: 3
  files_created: 6
  files_modified: 3
  tests_added: 18
  tests_total: 71
  duration: "~1 session (single pass)"
  completed: 2026-07-25
---

# Phase 1 Plan 03: 이벤트 Editor + JSON Backup Summary

Completed the content library: a full 이벤트 editor (add/edit/delete with effect + steps + weight + display label and live weight→% normalization) plus whole-library JSON backup — export to file and a non-destructive validate-before-commit import that never overwrites good data on a bad file. Phase 1's instructor tool is now feature-complete: missions and events fully managed, autosaved, and portable across devices via a single JSON file. 18 new tests (71 total) pass and the production build is green.

## What Was Built

- **EventModal (Task 1, TDD):** an RHF + `zodResolver` add/edit form mirroring `MissionModal`. Effect via `SegmentedControl` (➡️ 앞으로 / ⬅️ 뒤로 / 🔁 한 번 더); choosing **extra** hides the 몇 칸? field and stores `steps 0` (D-08). Steps clamp 1-20, weight clamp 0-999, and a 표시 이름표 segmented control stores the literal `보너스` | `함정` | `''` (D-07) with the explainer hint. Add prepends with a fresh `uid()` + `이벤트를 추가했어요`; edit updates in place + `이벤트를 수정했어요`; empty name → error toast `이벤트 이름을 입력해요`, no store write.
- **EventTab + EventCard (Task 2):** `EventTab` owns the 이벤트 view — 🔎 live name search, `＋ 새 이벤트`, the probability hint banner, the responsive grid, the add/edit modal, and the delete `ConfirmDialog` (`"{이름}" 이벤트를 삭제할까요?` → `이벤트를 삭제했어요`). `EventCard` gained the ✏️/🗑️ mini-buttons. Probability % is derived each render via `normalizedPercents(events)` over the full list; editing one event's weight re-derives every card live with no rebalancing of others' stored weights (D-05). Distinct no-data vs no-match (`찾는 이벤트가 없어요`) empty states. `App` now delegates the event tab to `<EventTab/>`.
- **io.ts + Header (Task 3):** `exportContent` serializes `{version, categories, missions, events}` to a pretty JSON Blob, downloads `파워점핑-콘텐츠.json`, revokes the URL, and toasts `파일로 내보냈어요 📁`. `importContent` is the three-step guard: reject >5MB before reading → `JSON.parse` (try/catch) → `ContentSchema.safeParse` → explicit confirm → `store.replaceAll`. `Header` wires the (previously inert) 내보내기/가져오기 buttons to a hidden file input and an accessible overwrite `ConfirmDialog` (`가져오면 지금 데이터를 이 파일 내용으로 바꿔요. 계속할까요?`), clearing the input so re-selecting the same file re-triggers.

## Requirements Delivered (EVENT-01..05, DATA-02..04)

- **EVENT-01/02/03:** add, edit, and delete events (name, effect, steps, weight, label) — persisted via the store, prepend on add, in-place update on edit, confirmed delete.
- **EVENT-04 / D-05:** weight is an integer; the displayed % is auto-normalized live across all events and the sum need not be 100.
- **EVENT-05 / D-06/D-07/D-08:** effect is forward / backward / extra; the 보너스/함정 display label is stored literally; extra hides steps and stores 0.
- **DATA-02:** whole-library JSON export as a downloadable file.
- **DATA-03/04:** import validates JSON + schema + version-literal + size and overwrites only after explicit accessible confirmation; any failure leaves existing data untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `z.preprocess` on steps/weight caused an RHF + zodResolver input/output type divergence (tsc failure)**
- **Found during:** Task 1 (`npm run build`).
- **Issue:** steps/weight use `z.preprocess` to fall back to a default on a NaN (empty) number input, so the schema's Zod **input** type is `unknown` while its **output** type is `number`. `useForm<z.infer<…>>` + `zodResolver` then disagreed and `tsc -b` failed on both the resolver assignment and `handleSubmit` (fallback to `FieldValues`), the same class of failure 01-02 saw with `.default()`.
- **Fix:** Used RHF's three-generic form — `useForm<z.input<S>, unknown, z.output<S>>` — so the resolver's input type and `handleSubmit`'s output type are each declared explicitly; typed `onInvalid` as `FieldErrors<EventFormInput>` and `EMPTY` as the input type. No schema weakening; the preprocess (and its NaN safety) is kept.
- **Files modified:** src/components/EventModal.tsx
- **Commit:** 19c5ec6

### Intentional churn (within-plan)

- Task 1 temporarily mounted `EventModal` + a `＋ 새 이벤트` button directly in `App.tsx` (per the plan's "coordinate with Task 2" note); Task 2 relocated that ownership into `EventTab` and reduced `App`'s event branch to `<EventTab/>`. Expected, plan-directed — mirrors how 01-02 moved `MissionModal` from `App` into `MissionTab`.

## Verification Results

- `npm run test` → 71 tests across 11 files, all passing (18 new: EventModal 5, EventTab 7, io 6).
- `npm run build` → exit 0 (`tsc -b` clean, `dist/` emitted).
- Acceptance greps: `zodResolver` present in `EventModal.tsx`; `ContentSchema.safeParse` and `replaceAll` present in `io.ts`.
- TDD gate (Task 1): RED commit `dcecd8f` (failing EventModal tests) precedes GREEN commit `19c5ec6` (implementation).
- Round-trip test: `exportContent(seed)` → FileReader read of the exported Blob → `importContent` (confirmed) reproduces identical categories/missions/events.

## Threat Mitigations Applied

- **T-01-05 (Tampering/DoS on import):** `importContent` runs `JSON.parse` in try/catch then `ContentSchema.safeParse` (version `z.literal(1)` rejects `version: 2` and any foreign shape) before requesting an explicit `ConfirmDialog`; `store.replaceAll` is reachable ONLY inside the validated+confirmed callback. Unit-tested: bad JSON, wrong version, and a declined confirm all leave the store's baseline untouched (`replaceAll` not called).
- **T-01-06 (local DoS):** files larger than ~5MB are rejected before `readAsText` — a spy asserts `readAsText` is never called for an oversized file.
- **T-01-07 (XSS):** event name/label/effect text renders as JSX children (React auto-escapes) in `EventCard`/`EventModal`; no `dangerouslySetInnerHTML`, no markup built from imported/typed strings.

## Notes for Next Plans

- **Phase 2 engine:** the event `{ eff, steps, weight, label }` shape is now the fixed event-effect + weighted-draw contract. Draw uses raw `weight` (not the display %); `eff==='extra'` means "roll again" with `steps 0`; `label` is display-only (보너스=grape, 함정=coral) and carries no rule meaning.
- **Import UI reset:** `importContent` exposes an `onDone` hook for clearing search/filter UI after a confirmed import; `Header` does not currently pass one because tab-local search lives inside `MissionTab`/`EventTab` and stale category filters already self-reconcile against `store.categories`. Wire `onDone` if a future layout hoists search state.
- `Header`'s export/import buttons are now live (no longer `disabled`).

## Self-Check: PASSED
