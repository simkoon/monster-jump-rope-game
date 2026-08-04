# 03.1 VERIFICATION

## Automated verification

### Build
Command:

```bash
npm run build
```

Result: passed.

Latest observed output included:

```text
✓ built in 202ms
```

### Test
Command:

```bash
npm test
```

Result: passed.

Latest observed output included:

```text
Test Files  23 passed (23)
Tests       178 passed (178)
```

## Browser smoke verification

URL:

```text
http://127.0.0.1:5177/monster-jump-rope-game/
```

Checked:

- Game starts from setup screen.
- 2D board renders with START/FINISH, separated tiles, square numbers, arrows, finish landmark, and character tokens.
- Bottom HUD no longer visibly occludes the finish tile after CSS adjustment.
- Card draw → success → dice roll flow works.
- After one observed roll, Player 1 advanced from `0칸` to `1칸`; ranking/remaining distance updated.

## Manual / human-only checkpoints

No human approval was claimed. Visual smoke was performed by Hermes only.

## 03.1-02 Kenney asset verification

### Source/license checks

Verified by downloading and inspecting:

- `https://kenney.nl/media/pages/assets/toon-characters/4e8a6e4e53-1774770819/kenney_toon-characters.zip`
- `https://kenney.nl/media/pages/assets/board-game-icons/19cae04050-1721645690/kenney_board-game-icons.zip`

Both included `License.txt` stating Creative Commons Zero (CC0) 1.0.

### Automated verification

Commands:

```bash
npm run build
npm test
```

Result: passed.

Observed latest test result:

```text
Test Files  23 passed (23)
Tests       178 passed (178)
```

### Browser smoke

URL:

```text
http://127.0.0.1:5177/monster-jump-rope-game/
```

Checked:

- Game starts and board renders.
- Kenney token images load successfully: 96×128 natural size.
- Kenney finish flag loads successfully: 64×64 natural size.
- After card draw → success → dice roll, Kenney dice face icon loads successfully: 64×64 natural size.
- No broken images after fixing paths to use `import.meta.env.BASE_URL`.
