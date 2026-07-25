# Phase 03 — Deferred Items

Out-of-scope discoveries logged during execution (not fixed here).

| Item | Discovered | Detail | Suggested owner |
|------|-----------|--------|-----------------|
| vitest <3.2.6 critical advisory (GHSA-5xrq-8626-4rwp) | 03-01 Task 1 | Pre-existing dev-dependency advisory (Vitest UI server arbitrary file read/exec). NOT introduced by the R3F install. `npm audit fix --force` would install vitest@3.2.7, outside the project's stated range and risks re-triggering the Vitest/Vite 8 bundled-Vite type clash the project deliberately worked around (split vitest.config.ts). The Vitest UI server is not used by this project (`vitest run` only). | A dedicated dependency-maintenance task; verify the Vite 8 type clash before bumping. |
