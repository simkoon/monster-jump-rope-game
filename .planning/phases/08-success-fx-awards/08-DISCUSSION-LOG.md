# Phase 8: 퀘스트 성공 연출 & 시상식 & 마감 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 08-success-fx-awards
**Mode:** auto — user said "ㄱㄱ" with `_auto_chain_active: true`, same full delegation as Phase 7.
**Areas discussed:** all auto-selected

---

[auto] Selected all gray areas: 성공 연출 길이·구성, 별 비행 방식, 건너뛰기, 실패·보너스 연출, 시상대 구성, 칭찬 배지, 효과음 출처, 소리 토글 위치, 5판 연속 점검 방식.

| Area | Options considered | Selected (recommended) |
|---|---|---|
| 성공 비트 길이 | 고정 900ms 유지 / 등급별 1600·1900·2200ms / 별도 FX 비트 추가 | 등급별 stars 비트 (≤2500 예산 테스트) |
| 별 비행 | 3D 별 + 점수판 3D 위치 / DOM 별 + 화면 투영 | DOM 별 + 투영 (점수판 정합) |
| 컨페티 | DOM/CSS 파티클 / 3D InstancedMesh 풀 | 3D InstancedMesh 풀 |
| 건너뛰기 범위 | 모든 비트 / 성공·우승·시상식만 | 성공·우승·시상식 + 250ms 탭 새기 방지 |
| 실패 반응 | 무문구 유지 / 부드러운 응원 문구 | 응원 문구 + 부드러운 2음 |
| 시상대 | DOM 전용 / 3D 시상대 + DOM 오버레이 | 3D + DOM 오버레이 (DOM 대체 경로) |
| 2·3등 단 | 1·2·3단 / 우승자만 단상, 나머지 앞줄 환호 | 우승자만 단상 (꼴찌 비강조) |
| 순위 숫자 | 전원 N등 / 우승자만 🏆 | 우승자만 |
| 배지 | 우승 관련 / 통계 기반 6종 + 대체 배지 | 통계 기반 + 응원왕 대체 (전원 ≥1) |
| 통계 위치 | 스토어에서 로그 누적 / 엔진 GameStateCore | 엔진 (undo 안전) |
| 효과음 | Kenney CC0 파일 / howler + 파일 / Web Audio 합성 | Web Audio 합성 (파일·의존성 0, 인터페이스로 교체 가능) |
| 소리 토글 | 게임 화면만 / 설정만 / 둘 다 | 둘 다, settings 스토어(백업 제외), 기본 켜짐 |
| 5판 점검 | 수동 / jsdom + dev soak 진입점 | jsdom + `?soak` 실제 브라우저 측정 |

## Claude's Discretion
타이밍·이징·파티클 수식·효과음 파형·시상대 치수·배지 문구·soak 지표 세부.

## Deferred Ideas
BGM, 줄넘기 줄 소품, 남의 성공 박수, Kenney 오디오 교체, 3D 얼굴 아이콘.
