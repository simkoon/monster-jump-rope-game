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
