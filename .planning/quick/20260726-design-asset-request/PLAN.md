---
task: design-asset-request
created: 2026-07-26
type: docs
---

# Quick Task: 디자인 에셋 요구사항 문서 작성

## 문제

Phase 3까지 게임 루프·3D 보드·아동용 HUD가 완성되었지만, 리포에 **바이너리 디자인 에셋이 하나도 없다**:

- `public/` 디렉터리 자체가 없음
- 3D는 전부 절차적 지오메트리 (`capsuleGeometry`, `RoundedBoxGeometry`, `sphereGeometry`)
- 아이콘/일러스트는 이모지(`🏁`)와 CSS 그라디언트로 대체
- 사운드 없음 (howler 미설치)

Phase 4(ART-01/02/03/05)를 진행하려면 외부 디자인 에이전트가 제작할 에셋의
규격을 코드 실측치로 고정한 요구사항 문서가 필요하다.

## 산출물

`.planning/ASSET-REQUEST.md` — 디자인 에이전트에게 그대로 전달 가능한 에셋 스펙:

- 코드에서 추출한 실측 규격(보드 타일 0.94, GAP 1.15, 토큰 총높이 ~0.94, 주사위 0.9, 카메라 [8,11,12] fov 40)
- `src/styles/index.css` 팔레트 hex 전량(단일 소스)
- 에셋별 ID/우선순위(P0~P2)/포맷/치수/적용 코드 위치/수용 기준
- 표정 텍스처 스왑 계약(2×2 아틀라스 UV offset)
- 성능 예산(폴리곤/텍스처/총 용량)과 IP 금지 조항

## 작업

1. 코드 실측치 수집 (Token/Dice/BoardTiles/boardLayout/BoardScene/index.css) — 완료
2. `.planning/ASSET-REQUEST.md` 작성
3. SUMMARY.md + STATE.md Quick Tasks 표 갱신
4. 원자적 커밋

## 범위 밖

- 실제 에셋 제작·구현 (Phase 4)
- `public/` 디렉터리 생성이나 로더 코드 추가
- ROADMAP.md Phase 4 재계획
