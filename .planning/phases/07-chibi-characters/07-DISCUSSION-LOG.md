# Phase 7: 치비 동물 캐릭터 & 표정 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 07-chibi-characters
**Areas discussed:** (none individually — user delegated all)

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| 캐릭터 생김새와 색 | 몸 색 = 동물 본래 색 vs 참가자 색, 참가자 색 표시 위치, 비율·종별 특징 | |
| 귀여움 확인 방법 | 게임 통합 전 8종 미리보기 승인 vs 통합 후 확인 | |
| 표정·동작이 나오는 때 | 남의 차례 반응, 우승 환호 위치, 동작 길이 | |
| 한 칸에 여럿 모일 때 | 축소 원형 배치, 지금 차례 앞·크게, 칸 밖 허용 | |

**User's choice:** "다 알아서" — all areas decided by Claude with recommended defaults (marked [auto] in CONTEXT.md).

## Claude's Discretion (all areas)

- 몸 주 색 = ANIMAL_COLOR(점수판과 동일), 종 구분은 실루엣 — 점수판 대응 유지가 가장 단순하고 안전.
- 귀여움: 개발용 갤러리 + Claude 헤드리스 자체 점검, 최종 승인은 단계 끝 사람 확인(사용자가 사람 확인을 나중에 몰아서 하길 원함).
- 표정·동작: 차례가 아닌 캐릭터는 아주 약한 숨쉬기·깜빡임(시선 집중 원칙과 CHAR-03 절충), 실패 반응 비트 ~700ms, 성공 비트 ≤900ms, 우승 비트 1500ms(라운드 종료 시만, 지금 끝내기는 즉시 결과).
- 같은 칸: 지금 차례 앞줄 가운데 원래 크기, 나머지 뒤쪽 계단식, 얼굴 가림 30% 이하를 순수 투영 계산으로 테스트.

## Deferred Ideas

- 3D 얼굴 아이콘을 DOM 점수판에 사용, 줄넘기 줄 소품, 남의 성공에 박수 반응, 캐릭터 커스터마이즈
