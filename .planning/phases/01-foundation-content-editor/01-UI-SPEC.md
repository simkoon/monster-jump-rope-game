---
phase: 1
slug: foundation-content-editor
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-25
source_of_truth: .planning/phases/01-foundation-content-editor/01-PROTOTYPE.html
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for the 강사(instructor) content editor (미션 / 이벤트 CRUD, search/filter, localStorage autosave, JSON export/import). No 3D, no game loop — those are Phases 3–4.
>
> **Source of truth:** the user (a real jump-rope instructor) reviewed and APPROVED `01-PROTOTYPE.html`. Every token below is extracted and formalized from that prototype. Do NOT invent a new palette, layout, or type system — implement THIS contract. The "extra cute" Nintendo art escalation (expressive characters, bouncy animation) is a Phase 4 concern; Phase 1 stays clean, functional, and on-brand bright.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (bespoke CSS-custom-property token system from approved prototype) |
| Preset | not applicable — shadcn NOT used this phase |
| Component library | none (hand-built React 19 components; no Radix/Base-UI). Keep components accessible per the a11y section below |
| Styling mechanism | Tailwind CSS 4 (`@theme` tokens) recommended per CLAUDE.md, OR plain CSS with the exact custom properties from the prototype. Either way, **all values below must be authored as design tokens, never hard-coded ad hoc** |
| Icon library | none — emoji glyphs as used in prototype (🤸 🎴 🎲 🔎 ✏️ 🗑️ ➡️ ⬅️ 🔁 🎁 🕳️ ⬇️ ⬆️ 🌙/☀️). No SVG icon dependency in Phase 1 |
| Font | System rounded Korean-friendly stack: `"Apple SD Gothic Neo","Pretendard","Malgun Gothic",system-ui,-apple-system,"Segoe UI",sans-serif` |
| Themes | BOTH light and dark, driven by tokens. Auto via `prefers-color-scheme`, overridable via `:root[data-theme="light"|"dark"]`. Theme toggle button persists choice |

---

## Color

### 60 / 30 / 10 split (light theme)

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `--bg` | `#EAF3FC` | App background (sky-biased neutral; carries two soft radial gradients — sky top-right, sun bottom-left) |
| Secondary (30%) | `--panel` | `#FFFFFF` | Main panel, modal surface |
| Secondary (30%) | `--panel-2` | `#F4F8FD` | Cards, inputs, chips, segmented buttons (inset surfaces) |
| Accent (10%) | `--sky` | `#1E9BFF` | Reserved list below |
| Accent deep | `--sky-deep` | `#0F6FD1` | Primary-button gradient end, shadow tint |
| Destructive | `--coral` | `#FF5A5A` | Reserved list below |

**Accent (`--sky`) reserved ONLY for:** primary CTA buttons (＋ 새 미션 / ＋ 새 이벤트 / 저장), active-tab count pill, selected filter/category chip (`.chip.on.cat`), selected segmented option fallback (`.plain`), input focus border, card mini-button hover. Never apply sky as a blanket "all interactive" color.

**Destructive (`--coral`) reserved ONLY for:** delete mini-button hover (`.mini.del:hover`), error toast (`.toast.err`), "함정" label chip, `backward` effect text/segment, `hard` difficulty badge/chip. Destructive actions require confirmation (see Copywriting).

### Semantic / functional colors (encode meaning — not counted in the 10% accent budget)

| Token | Value | Encodes |
|-------|-------|---------|
| `--easy` / `--grass` | `#26C97E` | 난이도 쉬움 badge & chip; `forward` effect (앞으로) |
| `--normal` | `#FFA92E` | 난이도 보통 badge & chip |
| `--hard` | `#FF5A5A` (= coral) | 난이도 어려움 badge & chip |
| `--sun` | `#FFC22E` | Logo mark gradient, probability-bar gradient start, "추가" category button, gradient wash |
| `--grape` | `#8B5CF6` | `extra` effect (한 번 더); "보너스" label chip |
| `--coral` | `#FF5A5A` | `backward` effect (뒤로); "함정" label chip |

### Text / line neutrals

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--ink` | `#16324A` | `#EAF3FC` | Primary text, headings, titles |
| `--ink-soft` | `#5B7A93` | `#9DB6CC` | Secondary text, descriptions, labels, hints, placeholders |
| `--line` | `#D6E4F0` | `#284A6B` | Borders, dividers, unselected chip/segment, probability track |

### Dark theme surface overrides

| Token | Value |
|-------|-------|
| `--bg` | `#0E1B2A` |
| `--panel` | `#16283C` |
| `--panel-2` | `#1C324A` |

> Brand hues (`--sky`, `--sun`, `--coral`, `--grass`, `--grape`, difficulty colors) stay identical across themes; only surfaces and neutrals swap. **Contrast rule:** all colored badges/chips/CTAs use `#fff` text; "추가" button uses dark `#5a3a00` on `--sun` for AA contrast. Verify every text/surface pair meets WCAG AA (see Accessibility).

---

## Spacing Scale

Base-4 scale. The prototype uses a few off-grid values (6, 7, 10, 14, 15) for optical fit; **normalize to the nearest token below when implementing** unless a 1px optical nudge is clearly needed.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps, chip row gaps, mini-button gaps |
| sm | 8px | Compact element spacing, filter chip gaps, segmented-button gaps |
| md | 12px | Input padding, field-to-field rhythm inside modal |
| base | 16px | Default element spacing, card gap, toolbar gap, card inner padding |
| lg | 20px | Panel padding, modal side gutters |
| xl | 24px | Section breaks |
| 2xl | 32px | Major layout gaps |
| 3xl | 48px | Empty-state vertical padding |
| 4xl | 64px | Page bottom padding |

**Container:** content max-width `1080px`, centered, `20px` horizontal gutters.
**Exceptions (radius, not spacing — intentional off-4):** border-radius tokens `--radius: 20px`, `--radius-sm: 14px`, plus contextual radii — modal `24px`, card `18px`, tab/add-button `16px`, input/segment/field `12px`, pill/chip/badge `999px`. These are a deliberate rounded-chunky "Nintendo-ish" set; keep them as named tokens.

---

## Typography

Child-friendly, minimal-text, chunky-heavy. **Intentional deviation from the 2-weight default:** the approved Nintendo-ish direction depends on heavy weights (800–900) for the playful, tappable feel, so this contract declares a 3-weight system. This deviation is locked by the approved prototype — do not "correct" it to fewer weights.

**Weights:** `500` (Medium — only for parenthetical/optional micro-text like "(선택)"), `800` (Extrabold — default UI text, labels, tags, chips, secondary buttons, tab labels), `900` (Black — headings, card titles, primary CTAs, effect text). Body/description copy uses `700`→ consolidate to `800` tier for consistency; treat `700` in the prototype as the `800` token.

| Role | Size | Weight | Line Height | Applies to |
|------|------|--------|-------------|------------|
| Display | 22px | 900 | 1.1 | App logo title (h1) |
| Heading | 20px | 900 | 1.2 | Modal titles (h2); empty-state heading uses 18px/900/1.2 |
| Card Title | 17px | 900 | 1.25 | Mission/event card names |
| Tab / CTA | 16px | 900 (CTA) / 800 (tab) | 1.2 | Tab labels, primary buttons |
| Body | 15px | 800 | 1.5 | Search & form inputs, textarea |
| Body-sm | 13px | 800 | 1.45 | Card description, field labels, tags |
| Badge / Chip | 12–13.5px | 800 | 1.2 | Difficulty badges, category chips, filter chips |
| Caption / Hint | 12px | 500–800 | 1.4 | Hints, footer note, filter section labels (uppercase, letter-spacing .06em, `--ink-soft`) |

**Numeric display:** counts, weights, and probability % use `font-variant-numeric: tabular-nums`.
**Placeholders:** `--ink-soft`, same size as input. Keep all copy short (child-audience minimal-text rule).

---

## Component Inventory

Formalize each from the prototype. All use the token system above.

| Component | Spec |
|-----------|------|
| **Header** | Logo (rotated-6° gradient sun→coral mark `46px`, `--radius-sm`, emoji 🤸 + h1 + subtitle) · flex spacer · icon buttons (⬇️ 내보내기, ⬆️ 가져오기, 🌙/☀️ ghost theme toggle). Wraps on narrow width |
| **Tabs** | Two tabs (🎴 미션 / 🎲 이벤트), each with a live count pill. Active tab: `--panel` background, top-rounded `16px 16px 0 0`, soft top shadow; active count pill flips to `--sky`/white. Inactive: transparent, `--ink-soft` |
| **Panel** | `--panel` surface, radius `0 22px 22px 22px` (flush under active tab), main `--shadow`, `20px` padding, `20px` side margin |
| **Toolbar** | Search field (grow, `--panel-2`, `2px --line` border, `14px` radius, 🔎 prefix, focus → `--sky` border) + primary "＋ 새 …" add button (right, sky gradient). Wraps on narrow width |
| **Filter row** (mission only) | Uppercase section label "난이도" + 3 difficulty chips (color-coded when `.on`) then "카테고리" label + dynamic category chips (`--sky` when `.on`). Multi-select; combine as AND across categories, OR within difficulty, plus name search |
| **Event hint banner** | Inline `--ink-soft` hint above event grid explaining weight-based probability + auto-normalized %. Keep verbatim intent |
| **Card grid** | `repeat(auto-fill, minmax(250px, 1fr))`, `14px`(→base token) gap, responsive |
| **Mission card** | `--panel-2`, `2px --line`, radius `18px`. Title (right-padded for actions) → description (`--ink-soft`) → row of difficulty badge + category tags. Absolute top-right actions: ✏️ edit + 🗑️ delete mini-buttons |
| **Event card** | Same shell. Title → effect text row (`forward`=grass ➡️ N칸 / `backward`=coral ⬅️ N칸 / `extra`=grape 🔁 한 번 더) + optional label chip (보너스=grape / 함정=coral) → probability block |
| **Difficulty badge** | Pill, `#fff` text on `--easy`/`--normal`/`--hard`. Fixed 3 levels only (쉬움/보통/어려움) |
| **Category tag** | Pill, `--panel` bg, `1.5px --line`, `--ink-soft`. On cards = display; in modal = addable/removable |
| **Effect display** | Bold color-coded inline text with emoji; steps suffix "N칸" except EXTRA_TURN (no N) |
| **Probability bar** | Label row ("발생 확률" left · "NN% · 가중치 W" right, tabular-nums) over a `10px` `--line` track filled with sun→coral gradient at normalized %. Read-only on card; the number the teacher edits is the weight |
| **Mini action button** | `30px` square, `9px` radius, `--panel` + `1.5px --line`. Edit hover → sky fill/white; delete hover → coral fill/white |
| **Modal** | Centered over `rgba(10,25,40,.55)` + `blur(3px)` overlay. `--panel`, radius `24px`, max-width `480px`, max-height `92vh` scroll, `22px` padding. Title h2 → fields → footer (취소 secondary + 저장 primary). Two variants: 미션, 이벤트 |
| **Form field** | Label (`13px`/800/`--ink-soft`) over input/textarea/number (`--panel-2`, `2px --line`, `12px` radius, focus → `--sky`). Optional fields marked "(선택)" in weight-500 |
| **Segmented control** | Equal-flex buttons; selected fills with the option's semantic color (easy/normal/hard, forward/backward/extra) or `--sky` for plain labels. Used for 난이도, 효과, 표시 이름표. Selecting EXTRA_TURN hides the "몇 칸?" field |
| **Category picker (modal)** | Selectable chips of existing categories (toggle `.on`=sky) + inline "새 카테고리 추가…" input with "추가" button (sun). Enter key adds. New category persists to shared list immediately. Empty → hint "아직 카테고리가 없어요. 아래에서 추가하세요." |
| **Empty state** | Centered `44px` emoji + heading + guidance body. Distinct copy for "no data yet" vs "no results for filter/search" (see Copywriting) |
| **Toast** | Bottom-center, slides up + fades. Neutral (`--ink`), `.ok` (grass), `.err` (coral). Auto-dismiss ~2.6s, `pointer-events:none` |
| **Footer note** | Persistent `--ink-soft` explanation of autosave + export/import backup |
| **Buttons (global affordance)** | Chunky bottom-shadow "press" affordance: rest has `--shadow-sm`; `:active` translateY(2px) + shadow removed (physical press). `:hover` translateY(-1px) on icon buttons |

---

## Copywriting Contract

All UI copy is **Korean, warm, and minimal** (child + non-technical-instructor audience). Friendly "-어요/-해요" tone. Preserve the prototype's exact strings below unless a planner deliberately revises.

| Element | Copy |
|---------|------|
| Primary CTA (mission) | `＋ 새 미션` |
| Primary CTA (event) | `＋ 새 이벤트` |
| Modal save / cancel | `저장` / `취소` |
| Header actions | `⬇️ 내보내기` · `⬆️ 가져오기` · theme toggle 🌙/☀️ (title "테마 전환") |
| Tabs | `🎴 미션` · `🎲 이벤트` (each with count pill) |
| Mission empty (no data) | Heading `아직 미션이 없어요` / Body `'＋ 새 미션'으로 첫 미션을 만들어요!` |
| Mission empty (no match) | Heading `조건에 맞는 미션이 없어요` / Body `검색·필터를 바꿔보세요.` |
| Event empty (no data) | Heading `아직 이벤트가 없어요` / Body `'＋ 새 이벤트'로 첫 이벤트를 만들어요!` |
| Event empty (no match) | Heading `찾는 이벤트가 없어요` |
| Event probability hint | `💡 발생 확률은 가중치(숫자)로 정해요. 합이 100이 아니어도 괜찮아요 — 아래 %는 자동으로 계산됩니다.` |
| Label explainer hint | `'보너스·함정'은 게임 규칙이 아니라 아이들에게 보여줄 이름·색상 표시예요.` |
| Validation error (empty name) | `미션 이름을 입력해요` / `이벤트 이름을 입력해요` (error toast) |
| Import error (bad JSON) | `파일을 읽을 수 없어요. 올바른 JSON이 아니에요.` (error toast; existing data untouched) |
| Import error (bad format/version) | `형식/버전이 맞지 않아요. 기존 데이터는 그대로 둘게요.` (error toast; existing data untouched) |
| Success toasts | `미션을 추가했어요` · `미션을 수정했어요` · `미션을 삭제했어요` · `이벤트를 추가했어요/수정했어요/삭제했어요` · `파일로 내보냈어요 📁` · `가져오기 완료! 🎉` |
| Footer note | `저장은 이 브라우저에 자동으로 됩니다(새로고침해도 유지). 다른 기기로 옮기거나 백업하려면 내보내기로 파일을 저장하고, 가져오기로 불러오세요.` |

### Destructive actions (confirmation required — non-destructive by default)

| Action | Confirmation copy | Behavior |
|--------|-------------------|----------|
| Delete mission | `"{미션 이름}" 미션을 삭제할까요?` | Confirm → remove + success toast. (Prototype uses native `confirm`; React impl should use an accessible modal dialog with the same copy, focus-trapped, Esc-cancellable.) |
| Delete event | `"{이벤트 이름}" 이벤트를 삭제할까요?` | Same pattern |
| Import (overwrite) | `가져오면 지금 데이터를 이 파일 내용으로 바꿔요. 계속할까요?` | Only after JSON parse + schema/version validation passes. On cancel or any validation failure, existing data is **never** overwritten (DATA-04). Planner decides overwrite-vs-merge; default per CONTEXT = explicit-confirm overwrite |

---

## Interaction & Motion

| Behavior | Contract |
|----------|----------|
| Persistence | localStorage autosave on every mutation (zustand `persist`). Read-guard on load: corrupt/mismatched-version storage falls back to seed, never crashes |
| Seed content | First run pre-populates example missions/events + starter categories (기초/응용/고난도) so the teacher isn't faced with a blank app; fully editable/deletable |
| Tab switch | Instant show/hide; counts always reflect full (unfiltered) list |
| Search & filter | Live on input; mission filter combines name-search AND difficulty(OR within) AND every selected category (AND across) |
| Modal open/close | Open centers modal, autofocuses the name input (~30ms). Close via 취소, backdrop click, or Esc. Save validates name-required before persisting |
| Weight normalization | Editing any event weight re-derives every event's displayed % live; sum need not equal 100; adding/removing events never requires re-balancing others |
| Button press | Physical "press" via bottom-shadow collapse + 2px translate on `:active` (~0.08s transition) |
| Toast lifetime | ~2.6s auto-dismiss, slide-up/fade, non-blocking |
| Motion transitions | Keep subtle (transform/opacity 0.06–0.25s). No essential info conveyed by motion alone |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all transitions/animations globally (already in prototype) — honor it |

---

## Accessibility

| Dimension | Contract |
|-----------|----------|
| Contrast | All text meets WCAG AA. Colored pills/CTAs use `#fff`; "추가" uses `#5a3a00` on `--sun`. Verify difficulty/effect colors against their text in both themes; darken a hue rather than ship failing contrast |
| Focus visible | Every interactive element (buttons, chips, inputs, tabs, mini-actions) shows a visible focus ring. Inputs already shift border to `--sky` on focus; add a non-color focus indicator (outline/ring) so focus isn't color-only |
| Keyboard | Full keyboard operability: Tab order logical; Enter adds a category / submits; Esc closes modals & cancels; delete/overwrite dialogs are focus-trapped and Esc-cancellable |
| Semantics | Use real `<button>`, `<label for>`, `<input>`, `<nav>`/`role="tablist"` with `aria-selected`, and `role="dialog"`/`aria-modal` for modals. Toasts announced via `aria-live="polite"` (errors `assertive`). Do not rely on emoji alone for meaning — pair with text (difficulty/effect already have text labels) |
| Color independence | Difficulty and effect encode via color AND text label AND emoji; never color-only |
| Targets | Large tap targets for the child/tablet context: primary CTAs and tabs are generously padded; ensure interactive controls are ≥44px in at least one dimension where practical (mini-buttons are 30px — acceptable as secondary desktop actions, but keep hit area comfortable) |
| Theme | Respect `prefers-color-scheme`; explicit toggle overrides and its label/icon updates (🌙 in light → ☀️ in dark) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — shadcn not initialized this phase |
| third-party | none | not applicable |

No component registry is used in Phase 1. All components are hand-built from the token contract above. No registry vetting gate required.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Data-Model Note (contract handed to Phase 2)

The editor's records ARE the Phase 2 engine contract (from CONTEXT.md / prototype seed). Formalize with Zod (schema + `schemaVersion`, shared by form validation and import validation):

- **Mission:** `{ id, name, desc?, diff: 'easy'|'normal'|'hard', cats: string[] }`
- **Event:** `{ id, name, eff: 'forward'|'backward'|'extra', steps: number (0 for extra), weight: number, label: '보너스'|'함정'|'' }`
- **Root:** `{ version, categories: string[], missions: Mission[], events: Event[] }`

Effect kinds are fixed at 3 (FORWARD / BACKWARD / EXTRA_TURN); 보너스/함정 are display labels only, not mechanics. This is a data-shape note for the planner, not a UI directive.
