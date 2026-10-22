# Project Research Summary

**Project:** 파워점핑 — 신나는 줄넘기 미션 (Milestone v2.0 3D 블루마블 재구축)
**Domain:** 아동 줄넘기 수업용 블루마블식 순환판 3D 웹 보드게임 (강사 1명·기기 1대, React 19 + R3F, 서버 없음)
**Researched:** 2026-10-22
**Confidence:** HIGH (스택 버전·통합 지점·persist 동작은 레지스트리·코드·로컬 설치로 확인) / MEDIUM (iOS Safari 동작, 아동 페이싱 수치)

> 이 요약은 synthesizer 에이전트가 두 번 연속 파일을 쓰지 못해 오케스트레이터가 네 문서를 직접 읽고 작성했다.

## Executive Summary

v2.0은 v1의 "카드 → 판정 → 주사위 → 결승 레이스" 게임을 "주사위 → 이동 → 도착 칸 퀘스트 → 판정 → 별" 순환판 게임으로 바꾸고, 2D 화면을 R3F 3D로 되돌리는 작업이다. 장르 관행(Monopoly Junior, Mario Party, 부루마불)을 보면 아동용 순환판 게임의 핵심은 **칸 결과를 도착 전에 읽을 수 있는 판**, **늘기만 하는 보상**, **턴 수로 정하는 게임 길이**, **동점 공동 승리**다. 이 마일스톤의 사용자 결정(별 최다 승리, 라운드 수 종료, 난이도별 ⭐1/2/3)은 이 관행과 맞는다.

권장 접근은 v1에서 효과를 본 순서를 그대로 따르는 것이다. **헤드리스 엔진과 데이터를 먼저 새 규칙으로 고정**하고(3D 없이 끝까지 플레이 가능), 그 위에 3D 골격과 연출 디렉터, 치비 캐릭터, 성공 연출을 차례로 얹는다. 엔진은 새로 쓰지 않고 진화시킨다. 순수·시계 없음·RNG 주입·불변 전이 계약과 `useGameStore` 단일 seam은 그대로 두고, 규칙 내부(순환 위치, 별, 라운드, 실패 규칙)만 다시 쓴다. 엔진은 전이마다 도메인 이벤트 로그를 남기고, 화면은 그 로그를 연출 비트 큐로 재생한다(엔진은 즉시 확정, 화면은 `displayed` 상태로 따라감).

가장 큰 위험은 3D가 아니라 **저장 데이터**다. 지금 `store.ts`의 persist `migrate`는 아무것도 변환하지 않으므로, 설정 필드를 넣으며 `SCHEMA_VERSION`만 올리면 강사가 만든 미션이 경고 없이 시드로 덮어써진다. 그다음 위험은 iOS Safari WebGL 컨텍스트 손실·메모리, 연출 비트가 늘며 생기는 busy 고착, 순환 수학 오프바이원, 그리고 성공 연출이 길어 수업이 정체되는 것이다.

## Key Findings

### Recommended Stack

3D 패키지 5개만 다시 넣는다. 모두 exact pin하고, 기존 lockfile 위에서 설치한다(lockfile 없이 설치하면 `@hookform/resolvers` optional peer로 ERESOLVE). 후처리·tween 라이브러리·3D 텍스트는 넣지 않는다. 상세: [STACK.md](STACK.md)

**Core technologies:**
- `three@0.186.1` + `@types/three@0.186.0`: 렌더링, `MeshToonMaterial`, `InstancedMesh`, `three/addons` `RoundedBoxGeometry` — 프로토타입(r170) API가 그대로 있고 lockstep 고정
- `@react-three/fiber@9.8.2`: React 19.2 라인(peer `>=19 <19.4`) — 씬과 DOM HUD가 같은 Zustand 스토어를 공유
- `@react-three/drei@10.7.9`: `<Outlines>`(툰 외곽선) 등 필요한 것만 named import
- `@react-three/test-renderer@9.1.1` (dev): WebGL 없이 씬 렌더 + `advanceFrames(n, delta)`로 연출 시퀀스를 결정적으로 테스트 (로컬 Vitest 검증됨)
- 자체 `useFrame(delta)` 타임라인(순수 `timeline.ts`): 끝나는 시점이 정확히 한 번 → ANIM_DONE 게이트와 맞물림. react-spring/GSAP은 별도 rAF 시계라 탈락
- (선택, 마지막) `howler@2.2.4`: 사운드를 넣을 때만. iOS 무음 스위치 대응(`navigator.audioSession.type='playback'`) 필요

**쓰지 않는 것:** `@react-three/postprocessing`(iOS 메모리, three `<0.187` 상한), drei `<Text>`(한글 폰트를 CDN에서 받음 → 오프라인 교실에서 깨짐), drei `StatsGl`(three 사본을 하나 더 끌어옴), 외부 `.glb`, 물리 주사위.

### Expected Features

상세: [FEATURES.md](FEATURES.md)

**Must have (table stakes):**
- 사각 순환판 + 출발 랜드마크 + 진행 방향 화살표 + 칸 간격·번호 (v1 반려 사유 "어디로 가는지 모르겠다" 재발 방지)
- 칸 종류를 도착 전에 읽을 수 있게: 퀘스트 칸 = 난이도 색 + 별 개수, 이벤트 칸 = 모양·아이콘 (글자 없이)
- 퀘스트 칸은 난이도만 가지고, 도착 시 그 난이도 미션 풀에서 뽑는다(섞은 덱으로 연속 반복 방지)
- 새 턴 FSM: 주사위 → 이동 → 칸 처리 → (퀘스트) 판정 → 별 → 다음
- 난이도별 별(⭐1/2/3), 별은 줄지 않음
- 성공 연출(점프·회전, 컨페티, 별 버스트, 충격파 링, 큰 별 → 점수판, 배너) — **컨트롤 복귀까지 2~2.5초, 탭으로 건너뛰기**
- 짧고 다정한 실패 반응(1초 이내 아쉬운 표정, 빨간 X·버저·별 차감 금지)
- 강사 설정: 실패 규칙, 기본 라운드 수, 출발 보너스(끔/+1/+2), 보드 크기(16/20/24)
- 라운드 수 설정 + 예상 시간 표시(참가자 × 라운드 × 약 45초) — 타이머 없이 수업 시간을 맞추는 수단
- 라운드 카운터(●●●○○), "마지막 라운드!" 배너, 차례 표시 + 다음 차례 미리보기(팀이면 팀원 이름)
- 별 점수판(별 순 정렬, 동점 같은 등수, 순위가 주 수단 — 보드 위치는 순위가 아님)
- 종료 시상식(공동 우승, 꼴찌 강조 없음) + 다시 하기/처음으로
- 강사 메뉴: 지금 끝내기, 판정 되돌리기(직전 상태 스냅샷)

**Should have (differentiators):**
- 난이도별 연출 강도 차이(⭐3이 더 크게)
- 상황을 따라가는 표정(기본·두근·기쁨·슬픔·놀람·우승), 기다리는 캐릭터의 응원 리액션
- 칭찬 배지 시상(도전왕·끈기왕 등, 승패와 무관)
- 효과음 + 음소거 (사실상 다음 1순위)

**Defer (v2.x+):** 진행 중 라운드 변경, 마지막 라운드 별 2배, 팀 "다 함께" 미션 칸, 난이도 비율 직접 설정, 게임 이어하기.

**Anti-features:** 돈·땅·통행료, 별 잃기·뺏기, 탈락/파산, 5초 이상 못 넘기는 연출, 게임 전체 타이머, 주사위 2개, 글 많은 이벤트 카드, 칸별 보드 에디터, 꼴찌 표시, 아이 자가 판정.

### Architecture Approach

엔진은 진화시키고(`rng.ts` 유지, `engine.ts`·`types.ts`·`placement.ts` 내부 재작성, 새 순수 모듈 `ring.ts`·`scoring.ts`), FSM은 `awaitingRoll → awaitingJudgement → turnResolved → gameOver`로 줄인다(`awaitingDraw` 삭제, 칸 해결·미션 뽑기는 `rollDice` 한 전이에서). 엔진 전이는 `log: { seq, events[] }`를 남기고, Director(`buildTimeline(events) → Beat[]`)가 비트 큐를 만들어 `usePresentation`(확장: queue·current·busy·displayed·비트별 watchdog·id 멱등 완료)이 재생한다. HUD는 Canvas 형제 DOM 오버레이로 두고 한글 텍스트는 전부 DOM에서 처리한다. Canvas는 게임 동안 하나만 유지하고 결과 화면도 오버레이로 띄운다. 상세: [ARCHITECTURE.md](ARCHITECTURE.md)

**Major components:**
1. `src/engine/*` — 순환판 FSM(별·라운드·실패 규칙·출발 보너스), `ring.ts`(wrap·경로·출발 통과), `scoring.ts`(starsFor·winnersByStars), `buildBoard`
2. 데이터 계층 — 강사 설정 저장 + v1 데이터 보존 마이그레이션 + JSON 가져오기 호환 + 편집기 설정 탭
3. `src/harness/useGameStore.ts` — 시작 시 미션·이벤트·규칙 **스냅샷**(게임 중 편집으로 고아 eventId 방지)
4. `src/game/director/*` + `usePresentation` v2 — 이벤트 로그 → 비트 큐, 표시용 위치·별
5. `src/game/scene/*` — GameCanvas(lazy), Board/Tile/StartGate/PathHighlight, Pawn, ChibiAnimal(종 테이블 + 표정 테이블), Dice(v1 `d7b9b73` 복원), CameraRig(`fitCamera` 순수 함수, OrbitControls 없음), CelebrationFX(InstancedMesh 컨페티 풀)
6. `src/game/hud/*` — Scoreboard, QuestCard, ControlsBar, Banners, FlyingStarLayer(3D 앵커 → DOM 점수판, WAAPI), ResultOverlay

### Critical Pitfalls

상세: [PITFALLS.md](PITFALLS.md)

1. **스키마 버전 상향 → 강사 콘텐츠가 시드로 덮어써짐** — identity `migrate` + literal 검증 + migrated 시 즉시 `setItem` 연쇄. 설정을 별도 persist 키에 두어 `ContentSchema`를 v1로 유지하는 것을 우선 검토하고, 올린다면 실제 v1→v2 migrate·백업 키·persist `name` 불변·v1 픽스처 테스트를 **엔진 작업보다 먼저** 깐다.
2. **순환 수학 오프바이원·음수 모듈로·출발 보너스 이중 지급·결승 잔재** — `moveOnLoop` 순수 함수 하나로 모으고(`((x%N)+N)%N`), 전 칸 × 주사위 × 이벤트 전수 테스트, `EndReason`에서 `'reached-finish'`를 빼 컴파일러로 잔재를 찾는다.
3. **라운드/턴 카운팅** — 라운드 = 모든 말(팀 단위)이 정규 턴 1회. "한 번 더"는 라운드에 안 세고 턴당 1회 상한. 턴 종료 진입점 하나(`endTurn`), 종료 판정은 라운드 경계에서만. 시나리오 테이블 테스트.
4. **연출-엔진 어긋남·busy 고착** — 별은 엔진이 확정하고 화면은 `displayed`로 따라감. 타임라인을 데이터로 두어 watchdog 예산을 계산(v1의 `PREVIEW_S` 누락 버그 재발 방지). 완료 신호는 비트 id로 멱등.
5. **iOS Safari WebGL** — `webglcontextlost` 처리 + "화면 다시 그리기" 버튼 + `<Canvas key>` 리마운트(상태는 Zustand에 있어 유지), 숨김 시 frameloop 정지, DPR 상한, 후처리·섀도맵 없음. Chrome 에뮬레이션은 인정하지 않고 실기기 UAT 필수.
6. **GPU 누수(판 반복)** — Canvas 단일 유지, 컨페티·별·링 고정 용량 풀, 표정 파츠는 미리 마운트하고 `visible` 토글, 공유 geometry/material 모듈. Playwright로 5판 연속 `gl.info` 평탄성 자동 확인.
7. **세로 폰 카메라 프레이밍·가독성·연출 길이** — `fitCamera`(가로/세로 FOV 중 빡빡한 쪽 + HUD inset), 5개 해상도 코너 투영 테스트, "3초 테스트"(방향·출발·별 1등·현재 차례), 성공 연출 ≤2.5초 + 탭 건너뛰기 + 입력 무시 구간.

## Implications for Roadmap

v1이 Phase 4.1까지 썼으므로 v2.0은 **Phase 5부터** 시작한다. 연구 네 문서의 빌드 순서 제안(아키텍처 A~D, 함정 ①~⑥)을 config의 `granularity: coarse`에 맞춰 4단계로 묶는다.

### Phase 5: 새 규칙 엔진 & 강사 설정 (헤드리스)
**Rationale:** FSM 재설계가 모든 기능의 뿌리이고, 가장 위험한 통합 지점(스키마/persist)이 여기 있다. 엔진 타입이 바뀌면 2D 보드는 어차피 컴파일되지 않으므로, 3D 이전에 규칙을 고정하고 임시 DOM 화면으로 끝까지 플레이되는 상태를 유지한다.
**Delivers:** 설정 저장(v1 데이터 보존 마이그레이션 + 픽스처 테스트) + 편집기 설정 탭(실패 규칙·기본 라운드·출발 보너스·보드 크기) + `ring.ts`/`scoring.ts`/`buildBoard`/새 FSM + 이벤트 로그 + harness 스냅샷 + SetupView(동물 선택·라운드·예상 시간) + 임시 DOM 루프 화면, 2D 보드·결승 잔재 삭제.
**Addresses:** 턴 FSM, 별(⭐1/2/3), 라운드 종료·공동 승리, 출발 보너스, 실패 규칙, 칸 배치(난이도 퀘스트 + 가중치 이벤트), 미션 풀 비었을 때 가드.
**Avoids:** Pitfall 1, 2, 3, 14, 15, 20.

### Phase 6: 3D 순환판 골격 & 연출 디렉터
**Rationale:** 연출 계약(Director)은 캐릭터·이펙트보다 먼저 굳어야 한다. iOS 컨텍스트 손실·DPR·단일 Canvas·카메라 맞춤·테스트 4층은 첫 화면이 뜨기 전에 넣어야 한다.
**Delivers:** R3F 스택 설치(exact pin), 단일 영구 Canvas 셸(lazy), 사각 순환판(출발 랜드마크·방향 화살표·칸 난이도 색/별·이벤트 아이콘), `fitCamera`, v1 Dice 복원, `timeline.ts` + `usePresentation` v2 + `useDirector`, 플레이스홀더 말 hop, DOM HUD(점수판·퀘스트 카드·컨트롤·라운드 카운터·차례 표시·배너), 컨텍스트 손실 복구.
**Uses:** three/fiber/drei/test-renderer, 자체 타임라인.
**Implements:** Director 패턴, DOM 오버레이 HUD, CameraRig.
**Avoids:** Pitfall 4, 5, 6, 7, 8, 9, 16, 17, 18.

### Phase 7: 치비 동물 캐릭터 & 표정
**Rationale:** 디자인 반복 위험이 가장 큰 단계("견본보다 확실히 더 귀엽게"). Director 계약 위에 비트 소비자를 추가하는 작업이라 Phase 6 이후. 비교 데모(A안)의 파라미터를 출발점으로 쓴다.
**Delivers:** `animals.ts`(종 테이블)·`expressions.ts`(표정 테이블)·`ChibiAnimal` 조립, 표정(기본·두근·기쁨·슬픔·놀람·우승)과 동작(idle·hop·jumpSpin·sad·cheer), 공유 geometry/material, 점수판용 SVG `AnimalIcon`, 같은 칸 다중 말 슬롯, Kenney 2D 캐릭터 자산 삭제.
**Avoids:** Pitfall 11, 12.

### Phase 8: 퀘스트 성공 연출 & 시상식 마감
**Rationale:** 마일스톤의 대표 경험. 캐릭터 jumpSpin과 점수판 위치가 모두 있어야 완성된다.
**Delivers:** CelebrationFX(컨페티 풀·별 버스트·충격파 링·큰 별) + AnchorProjector + FlyingStarLayer(큰 별 → 점수판 +1) + 배너, 탭 건너뛰기·입력 무시 구간, 실패 반응, 출발 보너스·마지막 라운드 연출, ResultOverlay + 시상대(공동 우승), reduced-motion, 연속 5판 누수 자동 점검, 실기기 iPhone/iPad UAT, 남은 CSS·자산 정리.
**Avoids:** Pitfall 10, 13 (+4·6 재확인).

### Phase Ordering Rationale

- 규칙과 데이터가 먼저다: 엔진 타입 변경이 HUD·씬·하네스 전부에 퍼지므로 헤드리스로 먼저 고정하면 이후 단계가 안정된 계약 위에서 움직인다(v1 Phase 2 → 3 성공 경험).
- 3D 골격과 Director는 캐릭터·이펙트의 공통 기반이다. 비트 큐 계약이 먼저 있어야 Phase 7·8이 서로 덜 엉킨다. Phase 8의 FX 일부는 플레이스홀더 말로 Phase 7과 병행 개발이 가능하다.
- 저장 데이터 손실(복구 비용 HIGH)과 순환 수학(전수 테스트로 싸게 막음)은 가장 앞 단계에 두어 배포 전 차단한다.

### Research Flags

더 깊은 조사가 필요한 단계:
- **Phase 6:** iOS Safari 컨텍스트 손실 복구(`<Canvas key>` 리마운트와 R3F v9 내부 동작) — 공식 문서 없음, 실기기 스파이크. 세로 화면 카메라 맞춤도 실기기 확인.
- **Phase 7:** 절차 생성 캐릭터의 "귀여움" — 디자인 스파이크/스케치 권장. 8인 드로우콜 예산(약 150)은 추정이라 실측.
- **Phase 8:** 3D → DOM 별 비행 좌표 정합(리사이즈·safe-area) 짧은 스파이크.

표준 패턴(추가 리서치 불필요):
- **Phase 5:** 순수 엔진·Zod·persist 마이그레이션 — 코드와 zustand 소스로 확인됨. 다만 아래 사용자 결정 사항은 discuss-phase에서 확정.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm 레지스트리 조회 + 레포 lockfile 위 로컬 설치 + Vitest 실행으로 확인. iOS 후처리 판단만 MEDIUM(추론) |
| Features | MEDIUM | 장르 관행은 공개 규칙·위키 교차 확인. 아동 연출 타이밍·수업 대기시간·페이싱 수치는 실무 자료와 추정 |
| Architecture | HIGH | 실제 코드와 zustand 5.0.14 persist 소스로 통합 지점 확인. Director 시퀀싱은 v1 패턴 확장 설계(MEDIUM) |
| Pitfalls | HIGH / MEDIUM | 코드·v1 이력 기반 항목은 HIGH. iOS Safari 메모리 상한·드로우콜 예산 수치는 LOW(실측 필요) |

**Overall confidence:** HIGH (구현 방향) / MEDIUM (iOS 실기기 성능·아동 페이싱)

### Gaps to Address

연구 문서끼리 의견이 갈리거나 사용자 결정이 필요한 항목:

- **강사 설정 저장 위치:** ARCHITECTURE는 `ContentSchema` v2의 `settings`(JSON 내보내기에 함께 포함, 실제 migrate 필수)를 권장하고, PITFALLS·FEATURES는 별도 persist 키(콘텐츠 스키마 v1 유지, 위험 최소)를 권장한다. → 요구사항 단계에서 사용자에게 "설정을 백업 파일에 같이 넣을지" 확인. 어느 쪽이든 v1 픽스처 테스트는 필수.
- **실패 규칙 선택지와 기본값:** 후보는 별 없이 넘김(noStar) / 같은 미션 1회 재도전(retryOnce) / 새 미션 1회(redrawOnce). FEATURES는 기본값 retryOnce, ARCHITECTURE·PITFALLS는 noStar(v1과 같은 동작)를 권장. 별 차감·뒤로 가기 규칙은 아동 대상이라 제외로 일치. → 사용자 확인.
- **시간 제한:** 사용자 결정은 "라운드 수만". ARCHITECTURE의 `timeLimitMs`/`requestEnd('timeout')`/`timeLimitMin` 설정은 **채택하지 않는다**. v1 타이머·카운트다운은 삭제하고 `EndReason = 'rounds-complete' | 'manual'`.
- **이벤트 연쇄:** 이벤트로 이동해 도착한 칸이 퀘스트면 퀘스트 수행, 이벤트·출발 칸이면 더 해결하지 않음(연쇄 1단계) — 세 문서 일치. discuss-phase에서 확인.
- **출발 보너스 정책:** 정확히 도착 = 통과 1회, 뒤로 넘기 = 없음, 이벤트 전진으로 넘기 = 지급(턴당 최대 1회), `lapsCredited`로 같은 바퀴 이중 지급 방지 — PITFALLS 권장. 기본값 +1.
- **"한 번 더"와 마지막 라운드:** 턴당 1회 상한, 라운드에 안 셈. 마지막 라운드 마지막 플레이어의 추가 턴 허용 여부는 정책으로 문서화 필요.
- **캐릭터 선택 모델:** v1 `character: 'boy'|'girl'` → 동물 종(`animal`)으로 교체. 종 수(예: 곰·토끼·고양이·강아지·판다·여우·돼지·병아리 8종)는 Phase 7에서 확정.
- **판정 되돌리기 범위:** 직전 1회 스냅샷으로 충분한지 Phase 5에서 확정.
- **iOS 실기기 접근:** 실기기 UAT가 완료 조건에 들어가므로 강사(사용자) 기기 확인 일정이 필요.

## Sources

### Primary (HIGH confidence)
- npm registry `npm view` (2026-10-22): three 0.186.1, @types/three 0.186.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, @react-three/test-renderer 9.1.1, postprocessing 6.39.5 peer 범위, howler 2.2.4
- 레포 lockfile 위 로컬 설치 + Vitest 3.2.4 실행: peer 충돌 없음, `advanceFrames` 결정성, jsdom `<Canvas>` + ResizeObserver stub 동작
- 코드 직접 확인: `src/store.ts`(identity migrate), `src/lib/io.ts`, `src/engine/*`, `src/harness/useGameStore.ts`, `src/game/{usePresentation,GameApp,PlayView,animation}.ts(x)`, `src/main.tsx`(StrictMode)
- zustand 5.0.14 persist 소스: 버전 불일치 시 migrate → merge → migrated면 즉시 setItem
- v1 이력: `.planning/milestones/v1.0-research/*`, v1 phase 03/03.1/04.1 SUMMARY, quick 260726-lbq(`PREVIEW_S` watchdog 누락), git `d7b9b73`(v1 3D 소스)
- R3F Pitfalls 문서, test-renderer API 문서

### Secondary (MEDIUM confidence)
- iOS Safari WebGL 컨텍스트 손실: WebKit Bug 261331·289601, three.js 포럼(iOS 17/18.2), Apple Developer Forums
- Monopoly Junior(위키·공식 설명서), Mario Party 칸·보너스 별·턴 수(Super Mario Wiki)
- troika-three-text README(폰트 CDN 의존), InstancedMesh 컬링·instanceColor 이슈, MeshToonMaterial NearestFilter

### Tertiary (LOW confidence)
- 체육 수업 대기시간(45분 중 약 17분 활동), 아동 연출 타이밍 실무 자료, 부루마불 40칸 구성
- iOS 탭 메모리 상한 수치, 8인 치비 드로우콜 예산(약 150), 저전력 모드 30fps(2016–2021 자료)

---
*Research completed: 2026-10-22*
*Ready for roadmap: yes*
