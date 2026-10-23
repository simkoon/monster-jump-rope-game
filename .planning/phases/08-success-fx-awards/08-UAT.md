---
status: testing
phase: 08-success-fx-awards
source: [08-UI-SPEC.md, 08-CONTEXT.md D-24, 07-UAT.md]
started: 2026-10-23T18:56:27Z
updated: 2026-10-23T19:39:20Z
---

## Current Test

number: 1
name: ⭐1 · ⭐2 · ⭐3 성공이 신나고 등급 차이가 보이는가 (U1)
expected: |
  아이와 강사가 "⭐3이 제일 크다"를 바로 느낀다
awaiting: user response

## 실행 방법

- **실기기 3종:** iPhone Safari, iPad Safari, 노트북 Chrome.
- **배포본으로 보기:** `npm run build && npx vite preview --host`를 실행하고 같은 Wi-Fi의 기기에서 열거나, GitHub Pages 배포본을 연다.
- **5판 표 보기 (STAB-01 · STAB-03):** `npm run dev -- --host`를 실행하고 기기마다 `/monster-jump-rope-game/soak.html?games=5`를 연다. 자동으로 5판을 플레이한 뒤 화면 왼쪽 아래 표에 판마다 수치를 남긴다. `&seed=7`을 붙이면 5판 모두 같은 판을 되풀이한다. 처음 보이는 표정 같은 첫 사용 업로드를 빼고 비교할 때 쓴다.
- **캐릭터 확대:** `npm run dev -- --host`를 실행하고 `gallery.html`을 연다(격자 보기).
- D-24 묶음: ① iPhone Safari ② iPad Safari ③ 노트북 Chrome에서 성공·실패·시상식·효과음·5판 연속, ④ 성공 연출이 신나는가·2.5초 안에 끝나는가(U1 / U2 / U3 / U4 / U5), ⑤ 실패 반응이 다정한가(U7), ⑥ 꼴찌가 민망하지 않은가(U9), ⑦ iOS 무음 스위치·소리 토글(U12 / U13).

## Tests

### 1. U1 — ⭐1 · ⭐2 · ⭐3 성공이 신나고 등급 차이가 보이는가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③④
expected: 아이와 강사가 "⭐3이 제일 크다"를 바로 느낀다
result: [pending]

### 2. U2 — 2.5초 안에 끝나 답답하지 않은가, 별 비행 곡선과 속도가 자연스러운가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③④
expected: 기다림이 길다는 느낌이 없다
result: [pending]

### 3. U3 — 별이 정확히 그 참가자의 점수판 칸에 내려앉는가 (세로·가로, 회전 직후, iOS 주소창 변화)
device: iPhone Safari 세로·가로 · iPad Safari
covers: D-24 ①②④
expected: 어긋남이 아바타 반지름 이내다
result: [pending]

### 4. U4 — ⭐3 화면 흔들림이 어지럽지 않은가
device: iPad Safari · 노트북 Chrome
covers: D-24 ②③④
expected: 불편하다는 말이 없다
result: [pending]

### 5. U5 — 첫 성공에서 끊김(셰이더 컴파일)이 없는가
device: iPad Safari
covers: D-24 ②④ (아래 24번 = 07-UAT #7과 함께 본다)
expected: 눈에 띄는 멈춤이 없다
result: [pending]

### 6. U6 — 탭 건너뛰기: 강사가 알 수 있는가(설정 힌트로 충분한가), 연타해도 다음 차례로 넘어가지 않는가, 🔊 탭이 축하를 끊지 않는가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③
expected: 힌트 없이도 불편하지 않다. 불편하면 게임 화면에 힌트를 넣을지 정한다
result: [pending]

### 7. U7 — 실패 반응이 다정한가 (soft 배너 문구·색·소리)
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③⑤
expected: 아이가 위축되지 않는다
result: [pending]

### 8. U8 — 출발 보너스 반짝이, 이벤트 반짝이·퍼프가 짧고 귀여운가, 함정이 무섭지 않은가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③
expected: 짧고 귀엽다. 함정 칸도 무섭지 않다
result: [pending]

### 9. U9 — 시상식: 꼴찌가 민망하지 않은가, 배지가 이해되는가, 8명이 iPhone 세로에서 잘리지 않는가(패널 스크롤 허용), 팀전 이름
device: iPhone Safari 세로·가로 · iPad Safari
covers: D-24 ①②⑥
expected: 가로 스크롤과 잘림이 없다. 누가 꼴찌인지 눈에 띄지 않는다
result: [pending]

### 10. U10 — 시상식 등장 중에도 다시 하기·처음으로가 바로 눌리는가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③
expected: 한 번 탭하면 동작한다
result: [pending]

### 11. U11 — DOM 대체 시상대 모양 (3D를 꺼서 강제: dev에서 `window.__loseContext()`)
device: 노트북 Chrome (dev)
covers: D-24 ③
expected: 3D 시상대와 같은 정보를 보여 주고 어색하지 않다
result: [pending]

### 12. U12 — 🔊/🔇가 연출 중과 시상식에서 보이고 눌리는가, 설정 탭 스위치와 상태가 같은가
device: iPhone Safari · iPad Safari · 노트북 Chrome
covers: D-24 ①②③⑦
expected: 언제나 보이고 눌린다. 두 곳의 상태가 같다
result: [pending]

### 13. U13 — iOS 무음 스위치 켬/끔, 백그라운드에서 돌아온 뒤 소리, `playback` 세션이 필요한가
device: iPhone Safari · iPad Safari
covers: D-24 ①②⑦
expected: 강사가 판단해 `auto`를 유지하거나 옵션 추가를 정한다
result: [pending]

### 14. U14 — 음량이 교실 스피커에서 편안하고 찌그러지지 않는가
device: iPad Safari · 노트북 Chrome
covers: D-24 ②③
expected: 편안하고 찌그러지지 않는다
result: [pending]

### 15. U15 — 다크 테마에서 soft 배너, 우승 카드, 배지 칩이 읽히는가
device: 노트북 Chrome
covers: D-24 ③
expected: 모두 읽힌다
result: [pending]

### 16. U16 — 5판 연속(새로고침 없이) 느려짐·멈춤 없음 (STAB-01 · STAB-03 실기기)
device: iPhone Safari · iPad Safari · 노트북 Chrome — 기기마다 `soak.html?games=5` 표와 직접 5판 플레이 체감
covers: D-24 ①②③
expected: 판마다 수치가 늘지 않는다(geometries · textures · programs가 그대로이고, 드로우콜은 100 이하, `.fx-star`는 0, 오디오 노드는 2). 직접 5판을 해도 느려지거나 멈추지 않는다. 첫 판에서 처음 보이는 표정 때문에 geometries가 조금 늘 수 있다. `&seed=7`로 같은 판을 되풀이하면 2판부터 그대로여야 한다(아래 자동 기록 참고)
result: [pending]

### 17. (07-UAT #1 이월) 휴대폰에서 게임과 갤러리(`npm run dev -- --host` → gallery.html 격자 보기)를 열고 A안 견본과 비교
device: iPhone Safari
expected: 치비 동물들이 기본 도형 견본보다 확실히 귀엽다 (ROADMAP SC1, D-04)
result: [pending]

### 18. (07-UAT #2 이월) 아이에게 8종을 3초쯤 보여 주기 (좁아진 강아지 귀 확인)
device: iPad Safari 또는 iPhone Safari
expected: 곰·토끼·고양이·강아지·판다·여우·돼지·병아리를 귀·주둥이·꼬리·부리로 구분하고, 강아지 귀가 여전히 늘어진 귀로 보인다 (D-24 ②, D-02)
result: [pending]

### 19. (07-UAT #3 이월) 휴대폰에서 대기·내 차례·✅·❌·앞/뒤 이벤트·라운드 종료까지 플레이
device: iPhone Safari
expected: 표정 6종이 구분된다(기본/두근, 아쉬움/기본은 폰에서 가까울 수 있음) (SC2)
result: [pending]

### 20. (07-UAT #4 이월, Phase 8 길이로 갱신) ✅·❌ 판정 후 마지막 라운드까지 진행
device: iPhone Safari · iPad Safari · 노트북 Chrome
expected: 성공 점프·회전은 등급별 1.6 / 1.9 / 2.2초 성공 연출 안에서 신나고 길지 않다. 아쉬움은 0.7초, 우승 환호는 1.5초이고 그 뒤 시상식이 나온다. 지금 끝내기는 바로 시상식으로 간다. 우승 연출 중 차례 바는 🏁 게임 끝, 점수판 왕관 = 3D 왕관 (SC3, D-14a)
result: [pending]

### 21. (07-UAT #5 이월) 8명 게임 시작(세로·가로, 강아지를 3번째로도) + 이웃 칸 무리 3+2·4+4·1+7·2+6 (출발 직전 칸, 먼 모서리 앞 칸 포함)
device: iPhone Safari 세로·가로 · iPad Safari
expected: 모든 얼굴이 보이고 무리마다 자기 칸으로 읽힌다. 8명 출발 3줄 배치가 출발 블록 위로 보인다. 마당·바깥 가장자리로 퍼진 배치와 출발 직전 칸에서 가운데를 벗어난 지금 차례 위치가 어색하지 않다 (D-24 ⑤, D-17b)
result: [pending]

### 22. (07-UAT #6 이월) 퀘스트 칸들을 지나 이동, 사람 있는 칸 앞에 혼자 착지
device: iPhone Safari · iPad Safari
expected: 이동 경로의 별 줄이 사라졌다가 착지하면 들어 올려진 채 돌아온다. 뒤 칸에 사람이 있으면 앞 칸 별 줄이 숨는다. 버그처럼 깜빡이지 않는다
result: [pending]

### 23. (07-UAT #7 이월) 교실 태블릿에서 첫 성공·첫 ❌·첫 깜빡임
device: iPad Safari (교실 태블릿)
expected: 표정이 처음 바뀔 때 끊김이 없다 (위 5번 = U5와 함께 본다)
result: [pending]

### 24. (07-UAT #8 이월) Phase 6에서 넘어온 실기기 확인 (06-VERIFICATION human_verification 1~8: iPhone 세로 맞춤, 3초 읽기, 귀여움, 연출 순서, 색 일치, iOS 화면 꺼짐 복구, 비행기 모드, iPad 가로·노트북)
device: iPhone Safari · iPad Safari · 노트북 Chrome
expected: 06-VERIFICATION에 적힌 대로
result: [pending]

### 25. (결정) STAB-01 5판 기준 문구 변경 승인 — 08-VERIFICATION suggested_overrides
device: — (결정 항목, U5·#23 결과를 보고 판단)
covers: D-22 ②, STAB-01
expected: 다음 중 하나를 고른다. ① 승인 — 기준을 "같은 판 되풀이(`&seed=7`)에서 2판부터 geometries 증가 없음 + 무작위 판 증가는 얼굴 캐시 상한(1판 대비 +72) 이내"로 바꾼다(아래 자동 기록 B: 무작위 126→142, 되풀이 129 고정, textures·programs·드로우콜·heap·오디오 노드는 그대로). ② 거절 — 캔버스 시작 때 얼굴 72개를 GPU에 미리 올리고 soak.html을 다시 돌린다. U5·#23에서 첫 표정 끊김이 보이면 ②가 낫다.
result: [pending]

## Summary

total: 25
passed: 0
issues: 0
pending: 25
skipped: 0
blocked: 0

## Gaps

## 자동 점검 기록 (STAB-01, D-22)

기록일: 2026-10-24 (08-11 실행 중 자동 측정). 사람 확인이 아니라 기계 측정이다. 위 24개 항목의 결과에는 넣지 않는다.

### A. jsdom 5판 연속 (src/game/soak.test.tsx)

- 실제 App(StrictMode), 가짜 캔버스, FakeAudioContext, 2명 × 1라운드, 16칸, `noStar`. 보이는 버튼을 누르고(✅/❌ 번갈아), 가짜 시간을 비트 너머로 돌리며, 성공 비트 중 가끔 화면을 탭해 건너뛰었다.
- 시상식마다(등장 연출이 끝난 뒤) 1~5판 값이 모두 같았다: 대기 타이머 0, 큐 0 / current null, 구독 수(usePresentation 10 · useGameStore 5 · useSettings 3), document 리스너 차이 7, window 리스너 차이 0, body 자식 1, `.fx-star` 0, 오디오 노드 2(master + limiter), 캔버스 마운트 수와 DOM 노드가 처음 그대로(노드 1개)였다.
- 처음으로를 누른 뒤에는 구독과 리스너가 시작 화면 기준선(usePresentation 1 · useGameStore 4 · useSettings 4 · document 6 · window 0)으로 돌아왔다.
- 엔진만 돌린 5판(2~8명, directGame, watchdog 또는 skipAll로 비움)은 매 판 끝에 큐 0, current null, 타이머 0이었다.
- 결과: **통과**

### B. 헤드리스 Chrome 5판 (soak.html, dev 서버)

- 환경: 시스템 Chrome 155 headless(Playwright 1.64 npx 캐시, `channel: 'chrome'`, `--js-flags=--expose-gc`), 1024 × 768, 렌더러 `ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)`. `performance.memory`와 `window.gc` 모두 사용 가능해 **heap을 판정했다**.
- 실행 1(기본, 무작위): `soak.html?games=5&players=8&rounds=1&skip=0.3`

| game | geometries | textures | programs | idleCalls | heapMB | audioNodes | fxStars | maxFrameMs |
|------|-----------:|---------:|---------:|----------:|-------:|-----------:|--------:|-----------:|
| 1 | 126 | 3 | 15 | 81 | 84.4 | 2 | 0 | 166.7 |
| 2 | 136 | 3 | 15 | 81 | 84.9 | 2 | 0 | 16.8 |
| 3 | 138 | 3 | 15 | 81 | 85.3 | 2 | 0 | 16.8 |
| 4 | 139 | 3 | 15 | 83 | 85.7 | 2 | 0 | 16.8 |
| 5 | 142 | 3 | 15 | 80 | 85.9 | 2 | 0 | 16.8 |

- 실행 2(같은 판 되풀이): `soak.html?games=5&players=8&rounds=1&skip=0.3&seed=7`

| game | geometries | textures | programs | idleCalls | heapMB | audioNodes | fxStars | maxFrameMs |
|------|-----------:|---------:|---------:|----------:|-------:|-----------:|--------:|-----------:|
| 1 | 126 | 3 | 15 | 81 | 84.4 | 2 | 0 | 150.0 |
| 2 | 129 | 3 | 15 | 81 | 84.8 | 2 | 0 | 16.8 |
| 3 | 129 | 3 | 15 | 81 | 85.2 | 2 | 0 | 16.8 |
| 4 | 129 | 3 | 15 | 81 | 85.6 | 2 | 0 | 16.8 |
| 5 | 129 | 3 | 15 | 81 | 85.8 | 2 | 0 | 16.8 |

- 판정 기준(08-11 must_haves)과 결과:
  - textures · programs가 1판과 같다: **통과**(3 · 15 고정, 두 실행 모두)
  - 평상시 드로우콜 ≤ 100: **통과**(80~83)
  - 판마다 `.fx-star` 0, 오디오 노드 = master chain(2): **통과**
  - heap 5판 ≤ 1판 × 1.10: **통과**(실행 1: 84.4 → 85.9 MB, +1.8% / 실행 2: 84.4 → 85.8 MB, +1.7%)
  - geometries가 1판과 같다: **글자 그대로는 미충족**. 실행 1은 126 → 142(+16)다. 실행 2도 1판 126과 2판 이후 129가 3만큼 다르다. 2~5판은 129로 그대로다.
- geometries 분석(누수 아님으로 판단): 표정 geometry는 동물 8종 × 표정 9개 = 72개다. CPU에서는 미리 만들어 캐시에 두고 함께 쓰며 일부러 dispose하지 않는다(chibiFaces.ts). three는 어떤 geometry가 **처음 화면에 그려질 때만** GPU에 올리고 `info.memory.geometries`를 센다. 그래서 무작위 판에서는 처음 보이는 표정 조합이 나올 때마다 숫자가 오르고, 정해진 상한에서 멈춘다. 근거는 세 가지다.
  - 같은 판을 되풀이한 실행 2는 2~5판이 129로 그대로다. 판마다 새는 누수라면 매 판 늘어야 한다.
  - 무작위 12판 실행에서 증가 폭이 계속 줄었고(122, 132, 134, 137, 140, 140, 140, 144, 145, 146, 146, 148), 0만큼 는 판도 여러 번(6·7·11판) 있었다.
  - textures, programs, 드로우콜, heap이 모두 평평하다.
  - 실행 2의 1판 → 2판 +3은 첫 다시 하기 때 처음 그려지는 것이 GPU에 한 번 올라간 것이다. 그 뒤로는 늘지 않는다.
- maxFrameMs: 1판의 150~167 ms는 첫 판 시작 때 한 번 생기는 셰이더 컴파일·업로드다. 2판부터는 16.8 ms(60 fps)로 끊김이 없다. 실기기 체감은 위 5번(U5)과 23번(07-UAT #7)에서 본다.
- 페이지 오류: 없음. 콘솔에는 404 리소스 2건만 있었다(dev 페이지의 아이콘 요청, 게임과 무관).
- 결과: **누수 없음.** textures, programs, 드로우콜, `.fx-star`, 오디오 노드, heap은 기준을 통과했다. geometries는 엄격 동일 기준을 글자 그대로는 채우지 못했지만, 원인이 정해진 상한 안의 첫 사용 업로드임을 위처럼 확인했다. 실기기 확인(STAB-03)은 16번 U16에서 한다.
