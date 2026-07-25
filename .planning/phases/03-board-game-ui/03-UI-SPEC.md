---
phase: 3
slug: 3d-board-game-ui
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-25
extends: .planning/phases/01-foundation-content-editor/01-UI-SPEC.md
source_of_truth: src/styles/index.css (Phase 1 approved tokens) + this contract
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for the **real child-facing game screen** — an R3F 3D board/token/dice/card scene wrapped in a big, simple, minimal-text DOM HUD (ART-04) that drives the Phase 2 headless engine start→play→result. This REPLACES the throwaway Phase 2 plain-DOM harness (`src/harness/*`).
>
> **EXTENDS Phase 1.** Do NOT invent a new palette, radius set, or weight system. Every color, radius, shadow, and font token is inherited verbatim from `src/styles/index.css` (the approved Phase 1 prototype). This phase adds only: (1) a **game-screen type scale** sized for a child at arm's length on a tablet, (2) **larger tap-target spacing tokens**, (3) **3D scene framing + motion timings**, and (4) **game-screen components**. Placeholder tokens/board are simple shapes/colors; expressive characters, art unification, and the original logo are **Phase 4** — this contract must not block that escalation (it only frames where art drops in).
>
> **Engine is the input contract.** The screen renders `GameState` (`src/engine/types.ts`) and its `Phase` FSM (`awaitingDraw / awaitingJudgement / awaitingRoll / turnResolved / gameOver`). The engine is pure and unchanged; the 3D layer signals **ANIM_DONE** back to unlock the next transition (D-07). The wall clock stays UI-owned (D-04).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — bespoke CSS-custom-property token system inherited from Phase 1 (`src/styles/index.css`). shadcn NOT used; the approved Phase 1 direction is a hand-built token system, and forking it mid-project would break the "통일감" mandate (D-09). Registry safety therefore not applicable. |
| Preset | not applicable |
| Component library | none for DOM (hand-built accessible React 19 components, reuse Phase 1 `Modal`/`ConfirmDialog`/`SegmentedControl`). **3D:** React Three Fiber v9 + three r185 + @react-three/drei v10 (D-01/D-02). No physics lib — dice is a canned tween (D-05). |
| Icon library | none — emoji glyphs, consistent with Phase 1 (🎴 🎲 🏆 ⏱️ ➡️ ⬅️ 🔁 🎁 🕳️ ✅ ❌ 🔁 🏁). Do not add an SVG icon dependency. |
| Font | Inherit Phase 1 `--font`: `"Apple SD Gothic Neo","Pretendard","Malgun Gothic",system-ui,-apple-system,"Segoe UI",sans-serif` |
| Themes | BOTH light + dark via inherited tokens (`prefers-color-scheme` + `:root[data-theme]`). The R3F scene clear color and lights MUST follow the active theme (light: sky-tinted; dark: deep-navy) so the canvas never clashes with the DOM HUD. |
| Styling mechanism | Tailwind CSS 4 `@theme` and/or plain CSS using the exact inherited custom properties. All new values below are authored as named tokens — never hard-coded ad hoc. |

---

## Spacing Scale

Inherits Phase 1's base-4 scale verbatim; **adds larger tokens for kid/tablet tap targets.** No off-grid spacing (radius exceptions are the only non-4 values, inherited unchanged).

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps, badge inset |
| sm | 8px | Compact gaps (HUD chip gaps) |
| md | 12px | Control inner padding |
| base | 16px | Default element spacing, HUD row gap |
| lg | 20px | Overlay/panel padding, HUD side gutters |
| xl | 24px | Section breaks, gap between stacked big buttons |
| 2xl | 32px | Mission-card overlay padding, result panel padding |
| 3xl | 48px | Result-screen vertical rhythm |
| 4xl | 64px | Screen-edge safe padding |

**New game tap-target tokens (child + tablet — additive, all multiples of 4):**

| Token | Value | Usage |
|-------|-------|-------|
| `--tap` | 72px | Min height of every PRIMARY game action button (카드 뽑기 / 성공 / 실패 / 주사위 굴리기 / 다음 / 다시 시작). Min width 200px or full-width of its column. |
| `--tap-sm` | 56px | Min height of SECONDARY controls (지금 순위로 마치기, 시작 화면으로, mode switch, setup steppers). |
| `--hud-h` | 88px | Fixed height of the top turn-HUD bar. |

**Inherited radius tokens (unchanged, do NOT alter):** `--radius:20px`, `--radius-sm:14px`; contextual: overlay card `24px`, big button `20px`, HUD bar `20px`, badge/pill `999px`.

**Layout:** the play screen is a **full-viewport stage** (not the 1080px editor container). R3F `<Canvas>` fills the viewport; the DOM HUD is an absolute overlay with `--tap`-sized controls anchored bottom, turn info anchored top, using `env(safe-area-inset-*)` padding for tablet.

---

## Typography

Inherits Phase 1's **3-weight system** (500 / 800 / 900 — the prototype-locked Nintendo-ish deviation; do NOT "correct" it). Declares a **game-screen type scale of exactly 4 sizes**, scaled up for a child reading a tablet at arm's length.

> **Scope note (≤4-size discipline):** this 4-size scale governs the game screen ONLY. The editor keeps its own approved 4-size scale (22/18/15/12). The two surfaces never render together, so neither screen exceeds 4 sizes. Do NOT mix the two scales on one screen.

**Game-screen scale — exactly 4 sizes** (40 / 26 / 20 / 15, each ≥5px apart — clear hierarchy, no near-duplicates). Every game role maps to one of these four; no other font sizes permitted on the game screen.

| Token | Size | Weight | Line Height | Applies to |
|-------|------|--------|-------------|------------|
| Display | 40px | 900 | 1.1 | Turn banner name ("○○ 차례"), dice result number, result title ("게임 끝!"), winner name |
| Heading | 26px | 900 | 1.2 | Mission card name, event effect banner headline, result reason |
| Body | 20px | 900 (primary buttons) / 800 (default) | 1.35 | All big-button labels, team member sub-line, mission description, secondary buttons, position readout names |
| Caption | 15px | 800 (500 only for "(선택)") | 1.4 | Difficulty badge, timer clock, "칸" suffixes, hints, setup field labels |

**Numeric display:** timer, dice value, "N칸" positions use `font-variant-numeric: tabular-nums`.
**Minimal-text rule:** all game copy stays short (child audience). Prefer a single verb or emoji+verb per button.

---

## Color

**Inherits every Phase 1 token verbatim** (`src/styles/index.css`). No new hues. 60/30/10 split re-expressed for the game screen:

| Role | Token | Value (light) | Usage on game screen |
|------|-------|---------------|----------------------|
| Dominant (60%) | `--bg` | `#EAF3FC` | DOM stage background AND the R3F scene clear color / ground plane tint (harmonized sky gradient). The 3D board sits in this sky field. |
| Secondary (30%) | `--panel` / `--panel-2` | `#FFFFFF` / `#F4F8FD` | HUD bar surface, mission card overlay, dice-result panel, result panel, setup card |
| Accent (10%) | `--sky` (`#1E9BFF`), deep `--sky-deep` (`#0F6FD1`) | | **Reserved list below** |
| Destructive/negative | `--coral` (`#FF5A5A`) | | 실패 button, backward event, hard difficulty badge |

**Accent (`--sky`) reserved ONLY for:** the PRIMARY progression buttons (카드 뽑기, 주사위 굴리기, 다시 시작 — sky→sky-deep gradient like Phase 1 `.add`/`.btn-primary`), the **active-turn highlight** (ring/glow on the current player's token + HUD name pill), and input/control focus. Never make every button sky — 성공/실패 are semantic (green/coral), 다음 is neutral, secondary buttons are `--panel-2`.

**Semantic colors (encode meaning — NOT counted in the 10% budget; inherited):**

| Token | Value | Encodes on game screen |
|-------|-------|------------------------|
| `--grass` `#26C97E` | | 성공 button; `forward` event (➡️ N칸); easy difficulty badge |
| `--coral` `#FF5A5A` | | 실패 button; `backward` event (⬅️ N칸); hard difficulty badge; error |
| `--grape` `#8B5CF6` | | `extra`/한 번 더 event (🔁); 보너스 label |
| `--sun` `#FFC22E` / `--normal` `#FFA92E` | | normal difficulty badge; finish-line highlight; 보너스 wash |

**Placeholder token (player/team piece) colors — fixed assignment order** (reuse brand hues so Phase 4 art can inherit the same identity color): 1 `--sky`, 2 `--coral`, 3 `--grass`, 4 `--sun`, 5 `--grape`, 6 `--normal`. Assign by participant index; up to `MAX_PARTICIPANTS`. Each token also carries a **DOM name label** (drei `<Html>`), so identity is never color-only (see Accessibility). A team is ONE token (D-04 / engine `Participant`).

**Board & dice (placeholder, D-03/D-05):** path squares in `--panel`/`--panel-2` low-poly tiles with `--line` edges; **finish square** highlighted with `--sun` glow + 🏁. Dice mesh: white body, dark `--ink` pips (theme-agnostic, high contrast). These are stylized primitives, not art — Phase 4 swaps meshes without touching this contract.

**Contrast rule (inherited):** all colored buttons/badges use `#fff` text; verify every text/surface pair meets WCAG AA in both themes (Accessibility).

---

## Component Inventory

All reuse the inherited token system + the button press affordance (bottom-shadow collapse + `translateY(2px)` on `:active`, `~0.08s`), scaled up to `--tap`.

| Component | Spec |
|-----------|------|
| **Board canvas** | R3F `<Canvas>` filling the viewport. **Camera:** fixed, slightly-tilted isometric (Claude's-discretion resolved — no free orbit; child ease-of-use). Frame the whole path with drei `<Bounds>`/`fit` on mount and on board-length change. **dpr capped `[1, 2]`** (D-08). Theme-driven clear color + hemisphere/directional light. Low-poly path of `boardLength+1` squares (D-03); finish square emphasized. |
| **Placeholder token** | Simple colored low-poly piece per participant (color order above) with a drei `<Html>` name label floating above. Active player's token wears a `--sky` highlight ring/glow. Team = one token. |
| **Dice (3D)** | White cube, `--ink` pips. On 주사위 굴리기: quick eased spin (~0.8s) then **snap to the engine's pre-rolled 1–6 face** (D-05, deterministic). Emits ANIM_DONE on settle. |
| **Card draw** | On 카드 뽑기: card flip/spin tween (~0.5s), then the **Mission card overlay** reveals. 3D card or DOM overlay allowed (D-06); DOM overlay recommended for a11y + big text. |
| **Turn HUD (top bar)** | Fixed `--hud-h` bar, `--panel` surface, `--radius`. Left: current player name pill (Display 40 or a scaled pill) with active `--sky` tint; team sub-line "이번엔 ○○ 님이 도전!" (Body). Right: ⏱️ timer clock (Caption, tabular-nums, only if `timeLimitMs != null`) + 지금 순위로 마치기 secondary button (`--tap-sm`). `aria-live="polite"` announces turn changes. |
| **Mission card overlay** | Centered `--panel` card, radius `24px`, `2xl` padding, max-width ~560px. Mission name (Heading 26/900), description (Body 20/800, `--ink-soft`), difficulty badge (Caption pill, easy/normal/hard color). Below: the 성공/실패 button pair. Appears at `awaitingJudgement`. |
| **성공 / 실패 buttons** | Two `--tap` buttons side by side. 성공 = `--grass` fill / `#fff` (✅ 성공). 실패 = `--coral` fill / `#fff` (❌ 실패). Both carry a TEXT label (color independence). Shown only at `awaitingJudgement`. |
| **Dice control** | Single `--tap` primary sky button "🎲 주사위 굴리기" at `awaitingRoll`. Pressing it hides the button, plays the dice tween; on ANIM_DONE the token-move animation runs, then the resolved panel shows. |
| **Dice result + move panel** | At `turnResolved` (after token-move ANIM_DONE): dice value (Display 40, "🎲 N"), move readout "from칸 → **to칸**" (Body, tabular-nums), event banner (if any), then the 다음 button (`--tap`, neutral `--panel-2`, "다음 ➡️"). |
| **Event effect banner** | Inline banner in the resolved panel when `lastLanding.eff`. Color-coded by inherited semantics: forward = `--grass` "➡️ N칸 앞으로!", backward = `--coral` "⬅️ N칸 뒤로!", extra = `--grape` "🔁 한 번 더!". Optional label chip (보너스=grape 🎁 / 함정=coral 🕳️). Text + emoji + color (never color-only). The corresponding token-move animation plays before the banner settles. |
| **Position readout** | Compact list/row of every token's `name — N칸` (Body/Caption, tabular-nums), current player marked. Reuses engine `participants[].position`. May live as a slim strip or be folded into the HUD. |
| **Result screen** | Full-screen `--panel` result panel over the board. Title "게임 끝!" (Display 40). Reason line (Heading, `REASON_COPY` reused). Winner "🏆 승리: **이름**" (Display). **Tie (co-winners, D-05):** "공동 승리!" + accessible radio group "최종 승자를 선택하세요" (reuse the harness logic, styled as `--tap-sm` selectable options), then "🏆 최종 승리". Final standings list. Actions: 다시 시작 (`--tap` primary sky) + 시작 화면으로 (`--tap-sm` secondary). |
| **Setup screen (re-skin)** | Reuse ALL Phase 2 `SetupScreen` logic (mode, count, names, characters, members, board preset, time limit, empty-library guard). Re-skin child-friendly: placeholder text logo "파워점핑" (real logo = Phase 4 / ART-05), `--tap`/`--tap-sm` controls, reuse `SegmentedControl`. 시작 button = `--tap` primary; disabled with guard copy when the mission library is empty (MISSION-07). |
| **Mode switch (게임 / 편집기)** | Keep/refine the existing App-level view switch (D-10). Two `--tap-sm` toggle buttons; **게임 is the default entry.** Editor (Phase 1) untouched. Not part of the immersive play stage — render it as a small top-corner control, never overlapping the big game buttons. |
| **Big game button (shared)** | The reusable primary: `--tap` min-height, radius `20px`, weight 900, `#fff` on gradient (sky) or semantic fill, inherited press affordance scaled up, `--shadow-sm` rest → collapse on `:active`. Focus-visible ring (3px sky). |

---

## Copywriting Contract

Korean, warm, **minimal** (child + non-technical instructor). Friendly "-어요/-해요" tone. Reuse the Phase 2 harness strings verbatim where they already exist.

| Element | Copy |
|---------|------|
| Turn banner | `○○ 차례` (player/team name) |
| Team member sub-line | `이번엔 ○○ 님이 도전!` |
| Draw CTA (awaitingDraw) | `🎴 카드 뽑기` |
| Judgement buttons (awaitingJudgement) | `✅ 성공` · `❌ 실패` |
| Roll CTA (awaitingRoll) | `🎲 주사위 굴리기` |
| Dice result | `🎲 N` |
| Move readout | `○칸 → ○칸` |
| Event — forward | `➡️ N칸 앞으로!` |
| Event — backward | `⬅️ N칸 뒤로!` |
| Event — extra turn | `🔁 한 번 더!` (repeats same player/member) |
| Event labels (display-only) | `🎁 보너스` · `🕳️ 함정` |
| Next (turnResolved) | `다음 ➡️` |
| Timer | `⏱️ MM:SS` |
| Manual end (secondary) | `지금 순위로 마치기` |
| Result title | `게임 끝!` |
| Result reason — finish | `결승선에 먼저 도착했어요!` |
| Result reason — timeout | `시간이 다 됐어요! 가장 앞선 친구가 승리!` |
| Result reason — manual | `게임을 마쳤어요! 가장 앞선 친구가 승리!` |
| Winner | `🏆 승리: ○○` |
| Co-winner tie | `공동 승리! 최고 칸에 함께 도착했어요.` / legend `최종 승자를 선택하세요` / `🏆 최종 승리: ○○` |
| Restart (same config) | `🔁 다시 시작` |
| Back to setup | `시작 화면으로` |
| Setup logo (placeholder) | `파워점핑` (subtitle `신나는 줄넘기 미션 — 게임을 설정하고 시작하세요.`) |
| Setup start CTA | `시작` |
| Empty-library guard | reuse engine `canStart` reason string (blocks 시작 with guidance) |
| Mode switch | `🎮 게임` · `✏️ 편집기` |

### Destructive / disruptive actions (confirmation required)

| Action | Confirmation copy | Behavior |
|--------|-------------------|----------|
| 지금 순위로 마치기 (manual end mid-game) | `지금 순위로 게임을 마칠까요?` | Confirm (reuse accessible `ConfirmDialog`, focus-trapped, Esc-cancel) → `end('manual')`. Prevents a stray tap from ending a live game. |
| 시작 화면으로 (from result) | none (game already over) — direct | `reset()` → setup |

No content is deleted on the game screen; the only disruptive action is ending a live session, gated above.

---

## Interaction & Motion (ANIM_DONE gating from the UI perspective)

The screen is a strict state machine layered over the engine FSM. **The 3D animation layer owns a UI-side "busy/animating" flag; while busy, ALL action buttons are hidden or disabled, and only ANIM_DONE unlocks the next engine transition** (D-07, Success Criterion 2). The engine stays pure — the UI calls the engine action, then plays the resulting animation, then re-enables controls.

### FSM phase → visible controls

| Engine phase | UI shows | On action → animation → ANIM_DONE |
|--------------|----------|-----------------------------------|
| `awaitingDraw` | Turn HUD + 🎴 카드 뽑기 (primary) | press → `draw()` → **card flip ~0.5s** → reveal Mission overlay (enter `awaitingJudgement`) |
| `awaitingJudgement` | Mission card overlay + ✅ 성공 / ❌ 실패 | 실패 → `judge(false)` → brief token idle, advance; 성공 → `judge(true)` → show dice control (`awaitingRoll`) |
| `awaitingRoll` | 🎲 주사위 굴리기 (primary) | press → `roll()` → **dice spin ~0.8s + snap** → **token hop/move** → resolved panel (`turnResolved`) |
| `turnResolved` | Dice result + move + event banner + 다음 ➡️ | press → `next()` → (extra-turn repeats same player) → next turn or `gameOver` |
| `gameOver` | Result screen | 다시 시작 → `startGame(config)`; 시작 화면으로 → `reset()` |

### Motion timings (fast + snappy = "신나는")

| Animation | Timing | Notes |
|-----------|--------|-------|
| Card flip/spin | ~0.5s ease | Then Mission overlay fades/scales in (0.2s) |
| Dice spin | ~0.8s ease-out, snap to pre-rolled face | Deterministic (D-05); face reads the engine value, never physics |
| Token move | per-square hop ~0.18s (Claude's-discretion: hop preferred over slide for playful pop), chained across `to − from` squares | Backward events animate in reverse; extra-turn shows no move |
| Active-turn highlight | 0.15s ring/glow transition on turn change | |
| Button press | inherited ~0.08s bottom-shadow collapse + 2px translate | |
| Overlay/banner enter-exit | transform/opacity 0.2–0.25s | No essential info conveyed by motion alone |

### Contracts

| Behavior | Contract |
|----------|----------|
| ANIM_DONE gating | Controls for the NEXT phase mount/enable ONLY after the current animation fires ANIM_DONE. No double-tap can skip the engine forward (idempotent per phase). |
| Countdown clock | UI-owned (D-04). Reuse the harness pattern: `setInterval` computing `remainingMs` from `Date.now()`, stops at `gameOver`, **clears on unmount (no leak)**. At 0 → `end('timeout')`. Engine never reads time. |
| 3D resource hygiene | Reuse geometry/materials (`useMemo`/cache), dispose on unmount, dpr cap `[1,2]` — no GPU-memory growth across consecutive games (D-08, Success Criterion 4). drei `<Bounds>` for framing. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)`: **skip/shorten** all tweens — snap card, dice, and token to their final state, and **fire ANIM_DONE immediately** so gating still advances. The game must be fully playable with motion off. |

---

## Accessibility

| Dimension | Contract |
|-----------|----------|
| Tap targets | Every PRIMARY game button ≥ `--tap` (72px) height and ≥200px (or full-column) width; SECONDARY ≥ `--tap-sm` (56px). Generous spacing (`xl` gap) between adjacent big buttons so a child can't mis-tap 성공/실패. |
| Contrast | All text meets WCAG AA in BOTH themes. Colored buttons/badges use `#fff`; dice pips `--ink` on white. Verify token-color name labels against their background; darken a hue rather than ship failing contrast. |
| Color independence | 성공/실패, difficulty, and event effects encode via **color AND text AND emoji**. Player/team token identity uses a **name label (drei `<Html>`)**, never color alone. |
| Focus visible | Reuse the inherited 3px `--sky` focus ring on every interactive control (buttons, radio options, mode switch, setup fields). |
| Keyboard | All DOM controls are real `<button>`/`<input>` and keyboard operable (primary audience is touch, but keep parity). Result tie radio group and confirm dialog are focus-trapped, Esc-cancellable. |
| Live regions | Turn changes and the dice result announced via `aria-live="polite"`; the timeout end via `assertive`. Do not rely on the 3D scene to convey state to assistive tech — the DOM HUD is the source of truth. |
| Canvas semantics | The R3F `<Canvas>` is decorative-with-DOM-mirror: all actionable state (whose turn, mission, dice, position, result) is also present as DOM text/controls in the HUD/overlays, so nothing is 3D-only. |
| Theme | Respect `prefers-color-scheme`; the scene lights/clear color follow the active theme token set. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — shadcn not initialized (bespoke Phase 1 token system) |
| third-party | none | not applicable |

No component registry is used. DOM components are hand-built from the inherited token contract; 3D components are authored on R3F/drei (npm packages per CLAUDE.md version matrix, not a UI registry). No registry vetting gate required.

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

## Handoff Notes (planner / executor)

- **Reuse, don't re-derive:** `useGameStore` bridge (draw/judge/roll/next/end/reset/startGame), `SetupScreen` logic, `Modal`/`ConfirmDialog`/`SegmentedControl`, and all `src/styles/index.css` tokens. The harness `PlayHarness.tsx`/`ResultScreen.tsx` are the **flow reference** to re-skin, then delete.
- **Phase 4 seam:** placeholder token meshes + the board are the ONLY things Phase 4 replaces (real characters, art unification, original logo). Keep the color-identity assignment and the `<Html>` label seam so art drops in without touching this contract.
- **Two new type sizes vs Phase 1:** the game scale (40/26/20/15) is intentional and scoped to the game screen; the editor retains 22/18/15/12. Do not merge the scales or apply the game scale to the editor.
