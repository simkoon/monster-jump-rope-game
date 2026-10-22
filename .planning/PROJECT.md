# 파워점핑 — 신나는 줄넘기 미션

## What This Is

줄넘기 강습용 3D 웹 보드게임이다. 블루마블처럼 사각 순환판을 돌며, 주사위를 굴려 말을 움직이고 도착한 칸의 줄넘기 퀘스트(미션)를 아이들이 실제로 수행한다. 퀘스트를 성공하면 신나는 성공 애니메이션과 함께 별을 받고, 정해진 턴(또는 시간)이 끝났을 때 별을 가장 많이 모은 플레이어·팀이 승리한다. 강사가 미션과 이벤트 칸을 직접 추가·수정·삭제할 수 있어 수업 커리큘럼에 맞게 자유롭게 커스터마이징할 수 있다. 대상은 줄넘기 수업을 듣는 아동이며, 운영은 강사가 기기 1대로 진행한다.

## Core Value

주사위 → 이동 → 도착 칸 줄넘기 퀘스트 → 성공하면 성공 애니메이션과 별, 이 핵심 루프가 아이들에게 신나고 매끄럽게 돌아가는 것. 그리고 강사가 미션을 자유롭게 관리(추가/수정/삭제)할 수 있는 것.

## Current Milestone: v2.0 3D 블루마블 재구축

**Goal:** 아이들이 3D 사각 순환판을 돌며 도착한 칸의 줄넘기 퀘스트를 성공할 때마다 신나는 성공 애니메이션과 함께 별을 모으는 게임으로 다시 만든다.

**Target features:**
- 블루마블식 3D 사각 순환판 (출발 칸 + 퀘스트 칸 + 이벤트 칸)
- 새 턴 흐름: 주사위 → 이동 → 도착 칸 퀘스트 → 강사 판정 → 성공 시 별 획득
- 별 모으기 승리 규칙: 정해진 턴/시간 후 별 최다 승리, 동점은 공동 승리
- 코드로 만든 치비 동물 캐릭터 (곰·토끼 등, 표정 변화)
- 퀘스트 성공 연출: 점프·회전, 컨페티, 별 버스트, 충격파 링, 큰 별 → 점수판 +1, 배너
- 3D 게임 화면(보드·HUD·주사위) 새로 구축, 기존 2D 보드·HUD 교체

## Requirements

### Validated

- ✓ 미션 추가/수정/삭제·검색·난이도·카테고리 편집 — v1.0 (Phase 1)
- ✓ 이벤트 추가/수정/삭제·발생 확률(가중치) 편집 — v1.0 (Phase 1)
- ✓ localStorage 자동 저장, JSON 내보내기/가져오기(검증 포함) — v1.0 (Phase 1)
- ✓ 개인전/팀전 설정, 인원·이름 설정, 미션 목록 비면 시작 차단 — v1.0 (Phase 2)
- ✓ 크고 단순한 아동용 버튼 UI — v1.0 (Phase 3)

### Active

v2.0 요구사항은 `.planning/REQUIREMENTS.md` 참고. 요약:
- [ ] 3D 사각 순환판과 칸 종류(출발/퀘스트/이벤트)
- [ ] 주사위 → 이동 → 도착 칸 퀘스트 → 판정 → 별 턴 흐름 (엔진 재설계)
- [ ] 별 모으기 점수판과 턴/시간 종료 후 별 최다 승리
- [ ] 코드 생성 치비 동물 캐릭터와 표정
- [ ] 퀘스트 성공 애니메이션

### Out of Scope

- 온라인 멀티플레이어 / 여러 기기 실시간 동기화 — 강사 기기 1대 로컬 운영으로 충분, 클라우드 서버는 복잡도·비용 과다
- 계정/로그인/유저 인증 시스템 — 수업 현장 단일 기기 운영이라 불필요
- 실제 브랜드·저작권 캐릭터·상표 사용 — 오리지널 디자인만 사용
- 줄넘기 성공 자동 판정(센서/영상 인식) — 강사가 눈으로 보고 수동 판정하는 방식으로 대체
- 결제/수익화 기능 — 강습 도구, 수익 모델 없음
- 블루마블식 땅 구매·통행료·돈 — 아동 줄넘기 수업에 불필요한 복잡도, 보상은 별 하나로 단순화
- 외부 3D 캐릭터 모델(.glb) — 표정 변화가 불가능해 코드 생성 캐릭터로 대체 (2026-10-22 비교 데모 후 결정)

## Context

- **사용자**: 줄넘기 강사(운영자)와 아동 수강생(플레이어). 요청자는 실제 줄넘기 강사.
- **운영 환경**: 수업 현장에서 강사 기기 1대(노트북/태블릿/iPhone)로 화면을 띄워 진행. 아이들이 화면 앞에서 미션을 수행.
- **핵심 상호작용**: 게임 진행 판정(성공/실패)은 강사가 수동으로 내림. 게임은 주사위→이동→칸 퀘스트→판정→별의 보드게임 루프.
- **커스터마이징 중심**: 강사마다 수업 커리큘럼이 달라 미션·이벤트를 자유롭게 편집하는 것이 필수. 편집한 내용은 저장·백업·공유(파일)될 수 있어야 함.
- **3D 요구**: 사용자가 명시적으로 3D 게임을 원함. 웹 브라우저에서 설치 없이 실행되도록 함.
- **v1.0 이력**: Phase 3에서 R3F 3D 보드를 만들었다가 3D 캐릭터·표정 조달 불가로 Phase 3.1에서 2D(DOM+SVG+CSS)로 전환했다. v2.0은 코드 생성 캐릭터로 그 문제를 풀고 3D로 돌아간다. 기존 코드: 편집기(`src/components`, `src/store.ts`, `src/schema.ts`, `src/lib`), 헤드리스 엔진(`src/engine`), 2D 게임 화면(`src/game`), 엔진-스토어 브리지(`src/harness/useGameStore.ts`), ANIM_DONE 게이트(`src/game/usePresentation.ts`).

## Constraints

- **Tech stack**: 웹 브라우저 + Three.js(WebGL) 3D 렌더링, React 19 + R3F 9 + drei 10 — 사용자가 3D + 브라우저 실행을 원함, 설치 불필요
- **Platform**: 최신 브라우저(Chrome, iOS Safari) 지원 — 강사 기기 1대 운영
- **Data**: 서버 없이 localStorage + 파일(JSON) 내보내기/가져오기 — 단일 기기 로컬 운영, 백업·공유 필요
- **Audience**: 아동 대상 — UI는 크고 단순하게, 색상은 밝고 경쾌하게(닌텐도풍), 텍스트 최소화
- **IP**: 실제 브랜드/상표/저작권 자산 미사용 — 오리지널 아트·로고만

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 웹 브라우저 + Three.js로 3D 구현 | 사용자가 3D를 원하고 설치 없는 브라우저 실행 선호 | v1.0 Phase 3.1에서 2D로 전환 → v2.0에서 3D로 복귀 |
| 미션 성공 판정은 강사 수동(버튼) | 실제 줄넘기 수행을 자동 인식하는 것은 범위·복잡도 과다 | ✓ Good (v1.0) |
| 개인전 + 팀전 둘 다 지원, 시작 화면에서 선택 | 사용자가 "알아서 해달라" 요청, 두 모드 모두 수업에서 유용 | ✓ Good (v1.0) |
| 데이터는 localStorage + 파일 내보내기/가져오기 | 서버 없이 백업·공유 가능, 단일 기기 운영에 적합 | ✓ Good (v1.0) |
| 미션·이벤트를 데이터로 분리(편집기 CRUD) | 강사별 커리큘럼 커스터마이징이 핵심 가치 | ✓ Good (v1.0) |
| v2.0: 블루마블식 순환판 + 별 모으기 승리 | 사용자 요청 — 결승 레이스 대신 계속 도는 여행 게임, 퀘스트 성공이 보상으로 직결 | — Pending |
| v2.0: 턴 = 주사위 → 이동 → 도착 칸 퀘스트 | 블루마블식 흐름. 미션이 '칸에 도착해서 하는 퀘스트'가 됨 | — Pending |
| v2.0: 캐릭터는 코드 생성 치비 동물 | 외부 .glb(Kenney)와 비교 데모 결과, 표정 변화가 가능한 코드 생성(A안) 선택 | — Pending |
| v2.0: 편집기·저장은 유지, 게임 화면만 새로 | 검증된 강사 도구는 재사용, 게임 쪽만 교체 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-22 — milestone v2.0 3D 블루마블 재구축 started*
