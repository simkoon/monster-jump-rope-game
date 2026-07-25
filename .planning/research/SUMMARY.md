# Project Research Summary

**Project:** 파워점핑 (PowerJumping)
**Domain:** Browser-based 3D turn-based board game (WebGL, no-install) with instructor-editable mission/event content, run on a single classroom device
**Researched:** 2026-07-25
**Confidence:** HIGH (stack + architecture + pitfalls verified; features MEDIUM-HIGH)

## Executive Summary

파워점핑 is a **data-driven web app that happens to render a 3D board**, not a 3D game with UI bolted on. Roughly 90% of the effort is a React/TypeScript-class application (start/setup screens, an instructor CRUD editor for jump-rope missions and weighted event tiles, localStorage persistence, JSON export/import, and the turn loop), and ~10% is a stylized low-poly 3D scene (board, tokens, dice roll, card flip). The defining and original mechanic is the **physical-action bridge**: a drawn card is a real jump-rope skill the child performs, and the instructor manually judges success/fail — which is why online play, accounts, and auto-detection are explicitly out of scope.

The consensus architecture is a **four-layer split with a headless game engine as the single source of truth**, connected to two peer views (a 3D scene and a DOM UI) through an event bus: intents flow up, events flow down, and a single `ANIM_DONE` acknowledgement gates turn progression. This makes the core loop (draw -> judge -> dice -> move -> event -> win) unit-testable with plain HTML buttons *before any 3D exists* — the single most important risk reducer in the project. The recommended stack is React 19 + TypeScript + Three.js via React Three Fiber (v9) + Zustand (with `persist`) + Vite, with Zod validating both form input and JSON imports. **Note a genuine cross-research tension:** STACK recommends R3F (because the heavy DOM editor makes vanilla Three.js a net loss), while ARCHITECTURE argues vanilla TypeScript + a tiny bus is sufficient. Both agree the headless-engine seam is non-negotiable; the R3F-vs-vanilla choice is a phase-0 decision (recommendation: R3F, since the editor dominates the workload).

The dominant risks are all well-understood and preventable: **Three.js GPU-memory leaks** (crashes the tablet mid-class if meshes aren't reused/disposed), **coupling game logic to the render loop** (frame-rate-dependent bugs, untestable rules), **losing instructor-edited content** (localStorage is a cache, not durable storage — JSON export is the real save), **unversioned/unvalidated JSON** (breaks file sharing between instructors), **probability/weighted-draw bugs** (invisible without distribution tests), and **over-scoping 3D character art** (an open-ended rabbit hole that must never gate the playable loop). Mitigation is structural: establish the state/render split and mesh-reuse discipline in the foundation, isolate all randomness in one unit-tested module, ship placeholder tokens first and time-box art last, and verify on the *actual classroom tablet* — not just the dev laptop.

## Key Findings

### Recommended Stack

Build as a React app that renders 3D, unifying the DOM editor and the 3D board in one component tree sharing one store. Do not over-engineer: this is turn-based with no physics, no netcode, no open world — the dice roll should be a **canned/tweened animation**, not a physics sim. Character expressions should use **texture/sticker swaps** (or morph targets at most), never ARKit-style facial rigs. Ship `.glb` + Draco from CC0 sources (Quaternius/Kenney) authored/adjusted in Blender.

**Core technologies:**
- **React 19 + TypeScript** — UI framework for the form-heavy CRUD editor + typed Mission/Event/Player records that round-trip as JSON.
- **Three.js (r185) + React Three Fiber v9 + drei v10** — declarative 3D board/tokens/dice sharing state with the DOM UI; drei removes model-loading/animation boilerplate.
- **Zustand 5 (with `persist`)** — single store for game + editor state, giving localStorage save/export/import for free with versioning/migration.
- **Vite 8** — instant HMR, static-hostable output, the default for R3F apps.
- **Zod 4 + react-hook-form 7** — one schema validates both editor forms and (critically) JSON imports; fast uncontrolled forms for large lists.
- **Howler.js 2.2** — cross-browser SFX/BGM with autoplay-unlock on first tap.

### Expected Features

Because instructor-editable content IS the stated core value, the "editable content" differentiators are effectively table stakes and cannot be deferred.

**Must have (table stakes):**
- Player/team setup + mode select (individual vs team) — can't start without a roster.
- Mission Library CRUD + search + difficulty/category (ship a seeded default deck).
- Card draw -> mission reveal (spin/flip animation, ideally no immediate repeat).
- Manual success/fail judgement (big buttons; success unlocks dice, fail ends turn).
- Dice roll on success + step-by-step token movement on the 3D board.
- Event Library CRUD + probability editing; event-tile resolution (bonus/trap/+3/-2/roll again).
- Win detection + results screen (decide exact-landing vs pass rule up front).
- localStorage persistence + JSON export/import; big, high-contrast, kid-facing UI.

**Should have (competitive):**
- Expressive m/f jump-rope characters with success/fail/move reactions (differentiator, not a gate).
- Original "파워점핑" logo/branding (IP-safe original art).
- Sound/music, undo-last-judgement (misclick recovery), deck filtering by difficulty at draw time.

**Defer (v2+):**
- Preset/shareable curriculum mission packs, per-player stats/history, accessibility toggles.
- Anti-features to reject: online multiplayer, accounts/login, camera/ML auto-detection, licensed characters, monetization, deep strategy layers.

### Architecture Approach

A four-layer split with a **headless, Three.js-free and DOM-free game engine** as the single source of truth. Views (3D scene + DOM UI) are two independent projections that talk only to an event bus — never to each other. The turn is an explicit finite state machine (`DRAW_CARD -> AWAIT_JUDGE -> AWAIT_ROLL -> MOVING -> RESOLVE_EVENT -> WIN_CHECK -> next|VICTORY`); logical state mutates instantly while an **animation queue gates the next intent on `ANIM_DONE`** to prevent visual/logic desync. Content (missions/events) lives in a separate versioned repo persisted to localStorage; runtime game progress is intentionally *not* persisted (one class = one sitting).

**Major components:**
1. **Data Layer / Content Repo** — mission/event records, versioned `schema.ts`, CRUD, localStorage auto-save, JSON import/export (validate on import).
2. **Game Engine (headless)** — players/positions/turn FSM, weighted draw, dice/movement, weighted event resolution, win check; pure and unit-testable.
3. **Event Bus / Store** — delivers intents up and events down; holds the current snapshot; contains no rules.
4. **3D Scene (Three.js)** — meshes, camera, lights, RAF loop, animation queue; reports `ANIM_DONE`; stores no authoritative state.
5. **DOM UI** — start/setup, mission card + 성공/실패 buttons, editor, import/export, results; dispatches intents only.

### Critical Pitfalls

1. **GPU memory leak (undisposed Three.js resources)** — reuse ONE dice/card mesh and one token per player; route all meshes through a factory + teardown that calls `.dispose()`; never recreate the renderer. Verify `renderer.info.memory` stays flat across multiple full games without reload.
2. **Game logic coupled to the render loop** — keep a pure state module that knows nothing about Three.js; drive animation by delta-time (`Clock`), never frame counts. Establish this split at the very start (retrofitting = rewrite).
3. **Losing instructor content (localStorage fragility)** — treat localStorage as a cache; make JSON export the real "save" and nudge backups; wrap every read/write in try/catch with schema fallback and a last-known-good copy.
4. **JSON with no schema version / validation** — add `schemaVersion` from the first export; validate version/fields/ranges on import; define replace-vs-merge semantics explicitly.
5. **Probability / weighted-draw bugs** — isolate `drawCard`/`rollDice`/`pickWeightedEvent` in one unit-tested module; normalize instructor-entered weights; assert distributions with 10k-run tests; implement no-repeat deliberately.
6. **Over-scoping 3D art + dev-machine-only testing** — placeholder tokens first, expressive art in a later time-boxed phase; cap pixel ratio and draw calls and verify on the actual classroom tablet.

## Implications for Roadmap

Research converges strongly on a dependency-driven order: **content must exist before a mission can be drawn, and the abstract loop must be proven before 3D is added.** Keep the "headless loop proven before 3D" seam intact regardless of how phases are grouped.

### Phase 1: Foundation + Data Model + Editor
**Rationale:** The game loop literally cannot draw missions without content, and instructor CRUD is the project's core value — independently usable/testable with zero 3D. Also the right place to set project-wide discipline.
**Delivers:** Scaffold (Vite/React/TS), versioned `schema.ts`, content repo, localStorage auto-save with read-guards, JSON export/import with `schemaVersion` + Zod validation, and the mission/event editor UI (CRUD, search, difficulty/category, event probability). Establishes render-architecture ground rules (mesh-reuse factory contract, pixel-ratio cap, performance budget) even before meshes exist.
**Addresses:** Mission Library CRUD, Event Library CRUD + probability, localStorage persistence, JSON export/import, child-UX standard for the editor.
**Avoids:** Pitfalls 3, 4 (data loss, unversioned JSON), and seeds the fix for 1 & 7.

### Phase 2: Headless Engine + Plain-DOM Harness (no Three.js)
**Rationale:** Prove the entire core loop is correct and fun before spending effort on rendering. De-risks the hardest logic cheaply and unit-testably.
**Delivers:** `engine/` (turn FSM, weighted draw, dice, movement, weighted event resolution, win check) + a throwaway HTML button/text harness. The isolated, unit-tested randomness module lives here.
**Uses:** Zustand store; pure reducer-style transitions.
**Implements:** Game Engine + Event Bus components.
**Avoids:** Pitfalls 2 (render coupling) and 5 (probability bugs) — both cheapest to prevent here.

### Phase 3: 3D Scene Wired to the Engine
**Rationale:** Now the proven loop becomes visual; depends on Phase 2's events.
**Delivers:** `scene/` — board, placeholder tokens, dice, camera, lights, RAF loop, animation queue; hop/roll/card-flip animations with `ANIM_DONE` gating and skippable, delta-time-driven, tab-background-safe animations.
**Uses:** Three.js/R3F + drei.
**Avoids:** Pitfalls 1 (disposal), 2 (frame timing), 9 (blocking/stuck animations); first target-device verification checkpoint.

### Phase 4: Full Game Flow, Modes & Screens
**Rationale:** Wraps the working core in the real product flow and both game modes; depends on 3 and 1.
**Delivers:** Start/setup (개인전/팀전, names, characters), turn HUD, mission-card overlay with 성공/실패, results screen, editor integrated into the app shell, import/export from the menu. Enforces the kid-UX standard everywhere.
**Addresses:** Player/team setup, turn management, individual+team mode, win/results.
**Avoids:** Pitfall 8 (child UX).

### Phase 5: Art & Polish
**Rationale:** Pure enhancement over a fully working game; safe to defer and time-box.
**Delivers:** Nintendo-style art, boy/girl jump-rope characters with success/fail/move expressions (texture-swap first), original logo, animation juice, tablet performance pass, optional sound.
**Avoids:** Pitfall 6 (art rabbit hole) — hard time-box; loop must already be playable.

### Phase Ordering Rationale
- Strict dependency chain: Mission Library -> Card Draw -> Judge -> Dice -> Movement -> Event -> Win; content and engine precede rendering.
- Architecture's "headless loop proven before 3D" seam is the key risk reducer and dictates Phases 1-3.
- Front-loading data/persistence discipline (versioning, read-guards, isolated RNG) prevents the highest-cost-to-retrofit pitfalls (2, 3, 4).
- Art is deliberately last and time-boxed so it can never block the playable loop.
- Merge option for a coarser 3-phase shape: (1+2) content+engine -> (3+4) 3D+flow -> (5) art.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (probability model):** How instructors enter/normalize event weights (weights-that-sum vs per-tile %) needs a concrete, understandable UX model — flag for `--research-phase`.
- **Phase 3 (R3F vs vanilla decision + disposal patterns):** Resolve the STACK-vs-ARCHITECTURE tension and pin down mesh-reuse/disposal and `ANIM_DONE` gating patterns for the chosen approach.
- **Phase 5 (character/facial-expression pipeline):** MEDIUM-confidence asset pipeline (texture-swap vs morph targets, Mixamo retarget) is design-dependent.

Phases with standard patterns (skip research-phase):
- **Phase 2 (headless engine/FSM):** Well-documented (boardgame.io-style pure transitions); established patterns.
- **Phase 4 (setup/HUD/results screens):** Standard form/UI work once the engine exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core rendering/build/state/audio verified against npm; asset-pipeline + facial-expression specifics MEDIUM (design-dependent). |
| Features | MEDIUM-HIGH | Board-game mechanics universal/HIGH; classroom-tool framing MEDIUM; single web-search grounding but corroborated by PROJECT.md. |
| Architecture | HIGH | Strong cross-source consensus (Three.js guides, turn-based FSM writeups, boardgame.io) on headless-engine + event-bus split. |
| Pitfalls | HIGH | Three.js disposal/perf and data pitfalls are well-established engineering practice; child-UX/probability HIGH-MEDIUM. |

**Overall confidence:** HIGH

### Gaps to Address
- **R3F vs vanilla Three.js:** STACK and ARCHITECTURE disagree. Decide in Phase 1/early Phase 3. Recommendation: R3F, because the heavy DOM editor dominates the workload — but keep the headless engine framework-agnostic so the choice only affects the view layer.
- **Event-probability UX model:** No single verified pattern for how instructors express/normalize weights. Prototype a simple model (normalize-on-save) in Phase 1 and validate with the client.
- **Win-condition rules:** Exact-arrival vs overshoot-pass and simultaneous-arrival ties are undecided — must be pinned down in Phase 2 engine design.
- **Target device:** The actual classroom tablet spec is unknown; obtain or approximate it early to set the performance budget (Pitfall 7).
- **Facial-expression fidelity:** Texture-swap assumed sufficient; confirm it reads well before committing to any morph-target work.

## Sources

### Primary (HIGH confidence)
- npm `three` (r185), pmndrs/react-three-fiber (v9 <-> React 19), drei v10, Vite 8 releases, Zustand `persist` docs, howlerjs.com — stack versions/compatibility.
- boardgame.io — reference model for pure move functions / rendering separation.
- Three.js official docs (`Material.dispose`, "how to dispose") + three.js forum disposal threads — GPU resource lifecycle.

### Secondary (MEDIUM confidence)
- SitePoint / Seele AI Three.js game guides, Outscal + trash moon turn-based architecture writeups — FSM + event-bus decoupling.
- "100 Three.js Tips" + mobile-optimization articles — draw calls, pixel-ratio cap, `renderer.info`.
- Blooket/Gimkit/Kahoot comparisons + board-game design articles — classroom-tool + roll-and-move feature baseline.

### Tertiary (LOW confidence)
- Quaternius/Kenney/Poly Pizza/Mixamo/Blender glTF pipeline — CC0 low-poly asset sourcing (design-dependent, needs validation in Phase 5).

---
*Research completed: 2026-07-25*
*Ready for roadmap: yes*
