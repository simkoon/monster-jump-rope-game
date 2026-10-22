// src/test/fixtures/v1.ts — v1 강사 데이터 원문 픽스처 (D-05, DATA-05/06).
// v1 앱이 실제로 쓰던 바이트 그대로를 재현한다. id는 시드(seed.ts의 uid())와
// 겹치지 않으므로, 실수로 시드로 떨어지면 테스트에서 바로 드러난다.
import type { Content } from '../../schema';

// zustand persist 키 (src/store.ts의 name과 같아야 함 — 바꾸면 v1 데이터가 사라진다).
export const CONTENT_KEY = 'powerjumping_content_v1';

// 강사가 만든 것 같은 v1 라이브러리: 한글·이모지·빈 desc·다중 cats·세 난이도,
// 마크업처럼 보이는 이름, forward/backward/extra, weight 0, steps 20 경계값.
export const V1_CONTENT: Content = {
  version: 1,
  categories: ['기초', '응용', '고난도', '우리반'],
  missions: [
    { id: 'v1-m-001', name: '🐰 토끼뛰기 10회', desc: '양발 모아 앞으로 콩콩', diff: 'easy', cats: ['기초', '우리반'] },
    { id: 'v1-m-002', name: '앞뒤 흔들기', desc: '', diff: 'easy', cats: [] },
    { id: 'v1-m-003', name: '엇걸어 뛰기', desc: '팔을 엇갈려 5회', diff: 'normal', cats: ['응용'] },
    { id: 'v1-m-004', name: '한 발 뛰기 (왼발)', desc: '왼발로만 8회', diff: 'normal', cats: ['응용', '우리반'] },
    { id: 'v1-m-005', name: '2단 뛰기 ⚡', desc: '줄을 두 번 돌려 1회 성공', diff: 'hard', cats: ['고난도'] },
    { id: 'v1-m-006', name: '이중 엇걸어 뛰기', desc: '', diff: 'hard', cats: ['고난도', '응용'] },
    {
      id: 'v1-m-007',
      name: '<b>꼬마</b> 미션 & "따옴표"',
      desc: 'HTML처럼 보이는 글자도 그대로',
      diff: 'easy',
      cats: ['우리반'],
    },
  ],
  events: [
    { id: 'v1-e-001', name: '로켓 점프', eff: 'forward', steps: 3, weight: 5, label: '보너스' },
    { id: 'v1-e-002', name: '미끄럼틀', eff: 'backward', steps: 2, weight: 3, label: '함정' },
    { id: 'v1-e-003', name: '한 번 더!', eff: 'extra', steps: 0, weight: 2, label: '' },
    { id: 'v1-e-004', name: '쉬어가기', eff: 'forward', steps: 1, weight: 0, label: '' },
    { id: 'v1-e-005', name: '큰 점프', eff: 'forward', steps: 20, weight: 1, label: '보너스' },
  ],
};

// v1 기기 localStorage 원문 — zustand persist 래퍼 {"state":<partialize 결과>,"version":1}.
export const V1_LOCALSTORAGE_RAW = JSON.stringify({ state: V1_CONTENT, version: 1 });

// 옛 저장분: desc·cats·label이 빠진 레코드 (Zod default로 채워져야 하며 시드로 떨어지면 안 됨).
export const V1_LOCALSTORAGE_MINIMAL_RAW = JSON.stringify({
  state: {
    version: 1,
    categories: ['기초'],
    missions: [{ id: 'old-1', name: '옛 미션', diff: 'normal' }],
    events: [{ id: 'old-e', name: '옛 이벤트', eff: 'backward', steps: 1, weight: 2 }],
  },
  version: 1,
});

// v1 Header.onExport → exportContent가 쓴 파일 원문 (JSON.stringify(content, null, 2)).
export const V1_BACKUP_FILE_TEXT = JSON.stringify(V1_CONTENT, null, 2);

// 손으로 고친/옛 백업 파일: 선택 필드 누락.
export const V1_BACKUP_MINIMAL_TEXT =
  '{"version":1,"categories":[],"missions":[{"id":"a","name":"줄넘기","diff":"easy"}],"events":[{"id":"e","name":"점프","eff":"forward","steps":2,"weight":1}]}';
