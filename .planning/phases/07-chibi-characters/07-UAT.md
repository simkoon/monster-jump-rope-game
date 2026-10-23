---
status: testing
phase: 07-chibi-characters
source: [07-VERIFICATION.md]
started: 2026-10-23T14:21:17Z
updated: 2026-10-23T14:21:17Z
---

## Current Test

number: 1
name: 휴대폰에서 게임과 갤러리(격자 보기)를 열고 A안 견본과 비교
expected: |
  치비 동물들이 "기본 도형만 쌓은 견본"보다 확실히 귀엽다
awaiting: user response

## Tests

### 1. 휴대폰에서 게임과 갤러리(`npm run dev -- --host` → gallery.html 격자 보기)를 열고 A안 견본과 비교
expected: 치비 동물들이 기본 도형 견본보다 확실히 귀엽다 (ROADMAP SC1, D-04)
result: [pending]

### 2. 아이에게 8종을 3초쯤 보여 주기 (좁아진 강아지 귀 확인)
expected: 곰·토끼·고양이·강아지·판다·여우·돼지·병아리를 귀·주둥이·꼬리·부리로 구분하고, 강아지 귀가 여전히 늘어진 귀로 보인다 (D-24 ②, D-02)
result: [pending]

### 3. 휴대폰에서 대기·내 차례·✅·❌·앞/뒤 이벤트·라운드 종료까지 플레이
expected: 표정 6종이 구분된다(기본/두근, 아쉬움/기본이 폰에서 가까울 수 있음) (SC2)
result: [pending]

### 4. ✅·❌ 판정 후 마지막 라운드까지 진행
expected: 성공 점프·회전(0.9초), 아쉬움(0.7초), 우승 환호(1.5초)가 신나고 길지 않다. 지금 끝내기는 바로 결과로 간다. 우승 연출 중 차례 바는 🏁 게임 끝, 점수판 왕관 = 3D 왕관 (SC3, D-14a)
result: [pending]

### 5. 8명 게임 시작(세로·가로, 강아지를 3번째로도) + 이웃 칸 무리 3+2·4+4·1+7·2+6 (출발 직전 칸, 먼 모서리 앞 칸 포함)
expected: 모든 얼굴이 보이고 무리마다 자기 칸으로 읽힌다. 8명 출발 3줄 배치가 출발 블록 위로 보인다. 마당·바깥 가장자리로 퍼진 배치와 출발 직전 칸에서 가운데를 벗어난 지금 차례 위치가 어색하지 않다 (D-24 ⑤, D-17b)
result: [pending]

### 6. 퀘스트 칸들을 지나 이동, 사람 있는 칸 앞에 혼자 착지
expected: 이동 경로의 별 줄이 사라졌다가 착지하면 들어 올려진 채 돌아온다. 뒤 칸에 사람이 있으면 앞 칸 별 줄이 숨는다. 버그처럼 깜빡이지 않는다
result: [pending]

### 7. 교실 태블릿에서 첫 성공·첫 ❌·첫 깜빡임
expected: 표정이 처음 바뀔 때 끊김이 없다
result: [pending]

### 8. Phase 6에서 넘어온 실기기 확인 (06-VERIFICATION human_verification 6~13: iPhone 세로 맞춤, 3초 읽기, iOS 화면 꺼짐 복구, 비행기 모드, iPad 가로 등)
expected: 06-VERIFICATION에 적힌 대로
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
