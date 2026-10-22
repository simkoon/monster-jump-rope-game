# Architecture Research

**Domain:** Turn-based 3D web board game (Three.js, single-device, serverless) — 줄넘기 강습용 "파워점핑"
**Researched:** 2026-07-25
**Confidence:** HIGH

## Standard Architecture

The dominant, well-established pattern for a turn-based 3D web board game is a **four-layer split** with a **headless game engine as the single source of truth**, connected to the visual layers through an **event bus**. The Three.js scene and the DOM UI are both *views* that subscribe to engine events and dispatch intents back — neither owns game state.

This is the consensus across Three.js game guides (keep WebGL rendering separate from DOM UI, manage game state independently) and turn-based engine writeups (finite state machine for turn phases, event-driven decoupling, command/intent pattern, `boardgame.io`-style pure state-transition functions).

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VIEW LAYER (two peers)                    │
├──────────────────────────────┬──────────────────────────────┤
│   DOM / HTML UI               │   3D SCENE (Three.js)         │
│  ┌────────┐ ┌────────┐        │  ┌────────┐ ┌────────┐       │
│  │ Start/ │ │ Mission│        │  │ Board  │ │ Tokens │       │
│  │ Setup  │ │ Card + │        │  │ Meshes │ │ (말)   │       │
│  │ Screen │ │ 성공/실패│        │  └────────┘ └────────┘       │
│  └────────┘ └────────┘        │  ┌────────┐ ┌────────┐       │
│  ┌────────┐ ┌────────┐        │  │  Dice  │ │ Camera │       │
│  │ Editor │ │ Result │        │  │  Mesh  │ │ Lights │       │
│  │ (CRUD) │ │ Screen │        │  └────────┘ └ Anim ──┘       │
│  └────────┘ └────────┘        │  (owns requestAnimationFrame) │
└───────┬──────────────┬────────┴──────────┬───────────────────┘
        │ dispatch      │ subscribe          │ subscribe / ack
        │ (intents)     ▼ (events)           ▼ (events + anim-done)
├───────┴───────────────────────────────────────────────────────┤
│                  EVENT BUS / STATE STORE                        │
│         intents in  →  [engine]  →  events out                  │
├────────────────────────────────────────────────────────────────┤
│               GAME ENGINE  (headless, pure logic)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Turn FSM │ │  Dice /  │ │  Card    │ │  Event   │          │
│  │ + players│ │ Movement │ │  Draw    │ │  Tile    │          │
│  │ /teams   │ │ + win    │ │ (weighted│ │ (weighted│          │
│  │ /positions│ │  check   │ │  by 난이도)│ │  by 확률) │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│         NO Three.js, NO DOM — testable in isolation             │
├────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                               │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐    │
│  │ Content Repo   │ │  Persistence   │ │  Import/Export   │    │
│  │ missions/events│ │ (localStorage) │ │  (JSON file)     │    │
│  │ CRUD + schema  │ │  auto-save     │ │  backup/share    │    │
│  └────────────────┘ └────────────────┘ └──────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility (owns) | Must NOT do | Typical Implementation |
|-----------|----------------------|-------------|------------------------|
| **Data Layer / Content Repo** | Mission & event records, categories, difficulty, probabilities; a versioned schema; CRUD API | Know anything about rendering or turn flow | Plain JS module wrapping a typed store; localStorage read/write; JSON serialize/deserialize |
| **Game Engine (headless)** | Source of truth for players/teams, token positions, turn order, current phase, dice value, drawn card, win state; weighted draw & weighted event resolution; win check | Touch the DOM or Three.js; run on `requestAnimationFrame` | Pure state + reducer-style transitions + a finite state machine (turn phases) |
| **Event Bus / Store** | Deliver engine events to views; deliver view intents to engine; hold the current snapshot | Contain game rules | Tiny `EventEmitter` / pub-sub + immutable snapshot object |
| **3D Scene (Three.js)** | Board/token/dice meshes, camera, lights, animations; the render loop; reporting `animation-complete` | Decide game outcomes; store authoritative positions | Three.js `Scene`, tween/animation lib, one `requestAnimationFrame` loop |
| **DOM UI** | Start/setup screen, mission-card display, 성공/실패 buttons, editor screens, import/export, result screen | Store game state; compute rules | HTML/CSS overlay on the canvas; event handlers dispatch intents |

## Recommended Project Structure

```
src/
├── data/                    # DATA LAYER — no game rules, no rendering
│   ├── schema.ts            # Mission/Event/Settings types + version tag
│   ├── contentRepo.ts       # CRUD over missions & events
│   ├── storage.ts           # localStorage auto-save/load
│   └── transfer.ts          # JSON import/export (validate on import)
├── engine/                  # GAME ENGINE — headless, unit-testable
│   ├── state.ts             # GameState snapshot type + initial state
│   ├── turnMachine.ts       # finite state machine (turn phases)
│   ├── draw.ts              # weighted card draw (by 난이도/카테고리)
│   ├── dice.ts              # dice roll + movement math
│   ├── events.ts            # probability-weighted tile-event resolution
│   ├── winCheck.ts          # finish-line / victory detection
│   └── engine.ts            # intent → transition → emit events
├── bus/
│   └── eventBus.ts          # pub-sub + current snapshot accessor
├── scene/                   # 3D VIEW — Three.js only
│   ├── SceneRoot.ts         # renderer, camera, lights, RAF loop
│   ├── board.ts             # board mesh + per-cell coordinates
│   ├── token.ts             # player 말 meshes + hop animation
│   ├── dice3d.ts            # dice mesh + roll animation
│   ├── cardFx.ts            # card-flip/draw animation
│   └── animQueue.ts         # sequences animations, fires anim-done
├── ui/                      # DOM VIEW — HTML/CSS overlay
│   ├── StartScreen.ts       # title/logo, 개인전/팀전, player setup
│   ├── MissionCard.ts       # drawn mission + 성공/실패 buttons
│   ├── Editor.ts            # mission & event CRUD, search
│   ├── Transfer.ts          # import/export buttons
│   └── ResultScreen.ts      # winner display
├── app.ts                   # wires layers: repo → engine → bus → views
└── main.ts                  # bootstrap
```

### Structure Rationale

- **`engine/` is Three.js-free and DOM-free on purpose.** The core game loop (draw → judge → dice → move → event → win) is where correctness matters most and where bugs are cheapest to catch. Keeping it headless makes it unit-testable without a browser or a rendered scene, and lets you validate the whole loop with plain HTML buttons *before* any 3D exists.
- **`data/` sits below `engine/`.** Content (missions/events) is authored and persisted independently of a running game. The engine reads from the repo; the editor writes to it. A **versioned `schema.ts`** is deliberate: instructors will export/import JSON across sessions and app updates, so the format must survive edits.
- **`scene/` and `ui/` are siblings, not nested.** They are two independent projections of the same engine state. The 3D scene never reaches into the DOM and vice versa; both talk only to the bus. This is the single most important boundary for this domain.

## Architectural Patterns

### Pattern 1: Headless engine as single source of truth (intent → transition → event)

**What:** All game rules live in `engine/`. Views send *intents* ("start turn", "judge success", "roll dice"); the engine mutates its snapshot and *emits events* describing what happened. Views react to events; they never mutate game state.
**When to use:** Any turn-based game where the same state drives multiple views (here: a 3D scene + a DOM overlay).
**Trade-offs:** One indirection layer (bus) to set up; in exchange you get testability, no desync between views, and trivial replay/debugging. Strongly worth it here.

**Example:**
```typescript
// engine/engine.ts (headless)
function dispatch(state: GameState, intent: Intent): [GameState, GameEvent[]] {
  switch (intent.type) {
    case 'JUDGE_SUCCESS':
      return [{ ...state, phase: 'AWAIT_ROLL' }, [{ type: 'DICE_READY' }]];
    case 'ROLL_DICE': {
      const roll = rollDie(state.rng);          // pure, seedable
      const pos = advance(state.current, roll);
      return [{ ...state, current: pos, phase: 'MOVING' },
              [{ type: 'DICE_ROLLED', roll }, { type: 'TOKEN_MOVE', to: pos }]];
    }
    // ...
  }
}
```

### Pattern 2: Finite state machine for turn phases

**What:** The turn is an explicit FSM: `IDLE → DRAW_CARD → AWAIT_JUDGE → AWAIT_ROLL → MOVING → RESOLVE_EVENT → WIN_CHECK → (next player | VICTORY)`. Only legal transitions are allowed.
**When to use:** Turn-based flow with distinct phases and manual (human) gates — exactly this game, where the instructor's 성공/실패 press is one transition.
**Trade-offs:** A little upfront modelling; eliminates the "nested if / illegal action" class of bugs (e.g. rolling the dice before judging, double-advancing). Essential for a kids' game run live where mis-taps happen.

**Example:**
```typescript
const legal = {
  DRAW_CARD:     ['AWAIT_JUDGE'],
  AWAIT_JUDGE:   ['AWAIT_ROLL', 'DRAW_CARD'],   // success → roll, fail → next
  AWAIT_ROLL:    ['MOVING'],
  MOVING:        ['RESOLVE_EVENT'],
  RESOLVE_EVENT: ['WIN_CHECK'],
  WIN_CHECK:     ['DRAW_CARD', 'VICTORY'],
};
```

### Pattern 3: Animation queue that gates turn advancement (anti-desync)

**What:** The engine mutates *logical* state immediately, but the *next* intent is not accepted until the 3D scene reports its animation finished. The scene owns an `animQueue`; when a hop/roll/flip completes it emits `ANIM_DONE`, which lets the engine proceed to the next phase.
**When to use:** Whenever visuals are animated but state is instant — every 3D board game. Prevents the classic race where a token is logically 3 cells ahead while still mid-hop on screen.
**Trade-offs:** Requires an explicit acknowledgement channel back from the view. Simpler than trying to make the engine "wait" with timers (which desync). Do NOT use `setTimeout` chains as the coordination mechanism.

**Example:**
```typescript
// scene/animQueue.ts
bus.on('TOKEN_MOVE', async (e) => {
  await token.hopTo(e.to);      // tween, resolves when the last cell lands
  bus.dispatch({ type: 'ANIM_DONE', phase: 'MOVING' });
});
// engine advances RESOLVE_EVENT only after ANIM_DONE for MOVING
```

## Data Flow

### One full turn (the core loop)

```
[Instructor taps "턴 시작"]  (DOM UI intent)
        ↓ dispatch START_TURN
[Engine] weighted draw by 난이도/카테고리 → phase AWAIT_JUDGE
        ↓ emit CARD_DRAWN(mission)
[DOM UI] show mission card + 성공/실패  |  [3D] card-flip animation
        ↓ (child performs jump-rope; instructor judges)
[Instructor taps 성공]  (DOM UI intent)
        ↓ dispatch JUDGE_SUCCESS
[Engine] phase AWAIT_ROLL → emit DICE_READY
        ↓
[Instructor/child rolls]  → dispatch ROLL_DICE
[Engine] roll die, compute new position → emit DICE_ROLLED, TOKEN_MOVE
        ↓
[3D] dice-roll anim, then token hops cell-by-cell → emit ANIM_DONE
        ↓
[Engine] resolve landing tile: probability-weighted event
         (보너스 / 함정 / +3 / -2 / 한 번 더) → emit EVENT_TRIGGERED
        ↓
[3D + DOM] show event effect; engine applies position delta (may re-move)
        ↓
[Engine] win check → emit NEXT_PLAYER  or  VICTORY
        ↓
[DOM] next player's turn  |  Result screen on VICTORY
```

Note the two directions clearly: **intents flow up** (DOM/3D → engine), **events flow down** (engine → DOM/3D), and a single **ACK (`ANIM_DONE`) flows back up** to gate progression. "성공/실패" on a fail (`JUDGE_FAIL`) short-circuits straight to `NEXT_PLAYER` — no dice, no move.

### State management

```
        localStorage  ⇄  Content Repo (missions/events/settings)
                              │ read at game start
                              ▼
   intents →  ┌──────────────────────────┐  → events → 3D scene
  (DOM/3D)    │  Engine (GameState + FSM) │  → events → DOM UI
   ANIM_DONE →│  single source of truth   │
              └──────────────────────────┘
```

The **Content Repo** and the **runtime GameState** are two different stores. Editor changes go to the repo (and localStorage); a running game snapshots the missions it needs at start. Runtime game progress is intentionally *not* persisted (a class game is one sitting) — only content and settings persist.

## Scaling Considerations

This game has no users-at-scale axis (single device, no server). "Scale" here means **content volume, player count, and tablet performance**.

| Axis | Small (typical) | Larger | Adjustment |
|------|-----------------|--------|------------|
| Mission/event count | tens | hundreds | Keep repo an in-memory array; add search/filter index in editor only. localStorage handles this easily (well under the ~5MB limit). |
| Players / teams | 2–4 | up to ~8 | Reuse a pooled token mesh + material; drive per-player via instances, not N separate scene graphs. |
| Board cells / props | ~30 cells | large board | Merge static board geometry into one mesh; keep only tokens/dice dynamic. Cap devicePixelRatio on tablets. |

### Performance priorities (tablet is the target device)

1. **First bottleneck: too many draw calls / heavy materials.** Merge the static board into a single geometry, share materials, and keep animated objects (tokens, dice) few. Target 60fps on a mid-range tablet.
2. **Second bottleneck: asset weight / load time.** Compress textures, keep the Nintendo-style art low-poly with flat/vertex colors, lazy-load nothing on the critical path (single-device, no network at runtime).

## Anti-Patterns

### Anti-Pattern 1: Game logic inside the render loop or animation callbacks

**What people do:** Compute whose turn it is, resolve events, or check the win condition inside `requestAnimationFrame` or a tween's `onComplete`.
**Why it's wrong:** Couples rules to framerate, makes the loop untestable, and scatters state across callbacks → race conditions and duplicated moves.
**Do this instead:** All rules in the headless `engine/`. The render loop only interpolates and draws; `onComplete` only emits `ANIM_DONE`.

### Anti-Pattern 2: Authoritative state living in the DOM or in mesh positions

**What people do:** Read the current cell from `token.position`, or store the score/turn in a DOM data-attribute.
**Why it's wrong:** Two sources of truth that drift; a mid-animation mesh position is not the logical position → desync, wrong win calls.
**Do this instead:** `engine.state` is the only truth. Meshes and DOM are projections that catch up via events.

### Anti-Pattern 3: Coordinating turns with `setTimeout` chains instead of animation acks

**What people do:** `setTimeout(rollDice, 800); setTimeout(moveToken, 1600)` to "wait for" animations.
**Why it's wrong:** Timers guess durations; a slow tablet frame desyncs logic from visuals and lets the next tap fire mid-sequence.
**Do this instead:** Gate progression on the `ANIM_DONE` event from the animation's actual completion (Pattern 3).

### Anti-Pattern 4: Editor writing runtime-shaped data with no schema version

**What people do:** Serialize whatever object the editor holds directly to JSON export.
**Why it's wrong:** Instructors export/import across app versions; an unversioned format breaks restore silently.
**Do this instead:** A versioned `schema.ts`; validate on import; migrate old versions. Content format is a contract, not an implementation detail.

### Anti-Pattern 5: Reaching for React/Redux/ECS "because games"

**What people do:** Pull in a heavy framework or full ECS for a single-device kids' board game.
**Why it's wrong:** Overkill; adds build/complexity cost with no payoff at this scale.
**Do this instead:** Vanilla TypeScript + a tiny event bus + a small FSM + reducer-style transitions. That is the right altitude here. (React-Three-Fiber is a valid *alternative* if the team already lives in React, but it is not required.)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| (none — serverless) | n/a | No accounts, no network at runtime by design. |
| Filesystem (user) | Browser download / file-input | JSON export = Blob download; import = `<input type=file>` → validate → repo. |
| Browser storage | localStorage | Auto-save content + settings; wrap in `storage.ts` with try/catch (quota, private mode). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| DOM UI ↔ Engine | intents up / events down (bus) | UI never mutates GameState directly. |
| 3D Scene ↔ Engine | events down / `ANIM_DONE` up (bus) | Scene is a pure projection + ack channel. |
| DOM UI ↔ 3D Scene | **none direct** | They must not reference each other; only the bus. |
| Engine ↔ Data Repo | function calls (read at game start) | Engine snapshots content; editor writes content. |
| Editor ↔ Data Repo | CRUD calls + localStorage save | Editor is the only writer of content. |

## Suggested Build Order (COARSE — dependency-driven)

The dependency chain dictates the order: **you cannot draw a mission until content exists, and you should not add 3D until the abstract loop is proven.**

1. **Phase A — Data model + persistence + editor.**
   *Build:* `schema.ts`, `contentRepo`, `storage` (localStorage auto-save), `transfer` (JSON import/export), and the instructor editor UI (mission/event CRUD, search, difficulty/category, event probability).
   *Why first:* The game loop literally cannot draw missions without content. This is the project's core value (강사 커스터마이징) and is independently usable/testable with zero 3D.

2. **Phase B — Headless engine + plain-DOM harness (no Three.js).**
   *Build:* `engine/` (turn FSM, weighted draw, dice, movement, weighted event resolution, win check) + a throwaway HTML harness with buttons and text.
   *Why second:* Proves the entire core loop (draw → judge → dice → move → event → win) is correct and fun *before* spending effort on rendering. De-risks the hardest logic cheaply and unit-testably. Depends on Phase A's content.

3. **Phase C — 3D scene layer wired to the engine.**
   *Build:* `scene/` — board, tokens, dice, camera, lights, RAF loop, `animQueue`; subscribe to engine events; hop/roll/card-flip animations with `ANIM_DONE` gating.
   *Why third:* Now the proven loop becomes visual. Depends on Phase B's events; swaps the DOM harness for the real 3D view.

4. **Phase D — Full game flow, modes & screens.**
   *Build:* start/setup screen (개인전/팀전, player/team names & characters), turn HUD, mission-card overlay with 성공/실패, result screen; integrate the Phase-A editor into the app shell; import/export from the menu.
   *Why fourth:* Wraps the working core in the real product flow and both game modes. Depends on C for the in-game view and A for content.

5. **Phase E — Art & polish.**
   *Build:* Nintendo-style bright art, boy/girl 줄넘기 characters with success/fail/move expressions, original "파워점핑" logo, animation juice, tablet performance pass.
   *Why last:* Pure enhancement over a fully working game; safe to defer and iterate. Depends on D.

**Merge guidance for 3–5 phases:** A and B can be distinct or, if a coarser split is wanted, A+B ("content + core engine, no 3D") then C+D ("3D + full flow") then E — yielding a clean 3-phase shape. Keep the **"headless loop proven before 3D"** seam intact regardless of how phases are grouped; it is the key risk reducer.

## Sources

- [Building a Game with Three.js, React and WebGL — SitePoint](https://www.sitepoint.com/building-a-game-reactjs-and-webgl/) — separation of scene rendering from game logic; reducer pattern for game loop (MEDIUM)
- [Three.js Games: Complete Guide 2026 — Seele AI](https://www.seeles.ai/resources/blogs/three-js-games-ultimate-guide) — Three.js provides rendering only; state, UI overlays, tooling come from the npm ecosystem (MEDIUM)
- [The Turn-Based Game Architecture That Finally Made My Code Stop Fighting Me — Outscal](https://outscal.com/blog/turn-based-game-architecture) — FSM for turn phases, event bus decoupling, command/intent pattern (MEDIUM)
- [Architecting a turn-based game engine with Redux — trash moon](https://trashmoon.com/blog/2019/architecting-a-turn-based-game-engine-with-redux/) — pure state transitions separated from rendering (MEDIUM)
- [boardgame.io](https://github.com/thgh/boardgame.io) — reference model: pure move functions describe state changes, rendering is separate (HIGH — established engine)
- [Finite State Machines in Game Development — Jesse Warden](https://jessewarden.com/2012/07/finite-state-machines-in-game-development.html) — FSM enter/exit + change events (MEDIUM)

---
*Architecture research for: turn-based 3D web board game (Three.js, single-device, serverless)*
*Researched: 2026-07-25*
