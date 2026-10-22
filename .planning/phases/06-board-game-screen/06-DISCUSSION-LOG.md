# Phase 6: 3D 순환판 & 게임 화면 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 06-3D 순환판 & 게임 화면
**Mode:** `--auto` (사용자: "ㄱㄱ 다음으로 해" — 직전 단계에서 "싹다 추천으로" 지시)
**Areas discussed:** 판 모양·카메라, 칸 표현, 말·이동, 주사위, 화면 정보, 화면 꺼짐 복구·성능

---

[--auto] Selected all gray areas: 판 모양·카메라, 칸 표현, 말·이동, 주사위, 화면 정보, 화면 꺼짐 복구·성능

## 판 모양·카메라
- [auto] 출발 칸 위치/방향 → Selected: "아래-오른쪽 모서리, 시계 방향" (대안: 아래-왼쪽·반시계)
- [auto] 카메라 → Selected: "고정 쿼터뷰 + fitCamera 자동 맞춤" (대안: 말 추적 카메라, 사용자 회전/줌)

## 칸 표현
- [auto] 칸 구분 방식 → Selected: "간격 + 난이도 색 + 3D 별 개수 / 이벤트는 다른 발판 모양 + 3D 화살표 아이콘" (대안: 3D 텍스트 라벨 — 금지 원칙으로 탈락)
- [auto] 칸 번호 → Selected: "표시 안 함, 대신 목적지 미리보기" (대안: DOM 라벨 번호)

## 말·이동
- [auto] 임시 말 → Selected: "참가자 색 장난감 캡슐 말" (대안: 단순 원기둥)
- [auto] 연출 타이밍 → Selected: "주사위 ~1.0s, 미리보기 ~0.5s, 칸당 ~0.25s 홉"

## 주사위
- [auto] → Selected: "v1 d7b9b73 Dice 복원·개량, 결과는 엔진 값으로 스냅, 아래 큰 🎲 버튼" (대안: 주사위 직접 탭)

## 화면 정보
- [auto] 세로 배치 → Selected: "위 차례·라운드, 가운데 판, 아래 버튼·점수판 / 가로는 점수판 오른쪽 패널"
- [auto] 마지막 라운드 알림 → Selected: "가운데 큰 DOM 배너 ~1.5s"
- [auto] 연출 중 버튼 → Selected: "숨김(비활성 아님)"

## 화면 꺼짐 복구·성능
- [auto] → Selected: "contextlost 시 '화면 다시 그리기' 버튼 + Canvas key 리마운트, 탭 숨김 시 frameloop 정지, DPR 상한 2"

## Claude's Discretion
- 색 값·조명·치수, Director 구조 세부, lazy 경계, InstancedMesh/frameloop 최종 선택

## Deferred Ideas
- 치비 동물·표정·다중 말(Phase 7), 성공 연출·건너뛰기·효과음·시상식·실기기 UAT(Phase 8), 칸 번호(보류)
