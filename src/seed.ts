// src/seed.ts — default content library, ported verbatim from 01-PROTOTYPE.html seed().
// 3 categories, 6 missions, 4 events. Each record gets a fresh id via uid().
import { SCHEMA_VERSION, type Content } from './schema';

export function uid(): string {
  return 'id' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function seedContent(): Content {
  return {
    version: SCHEMA_VERSION,
    categories: ['기초', '응용', '고난도'],
    missions: [
      { id: uid(), name: '양발 모아뛰기', desc: '두 발을 모아 가볍게 콩콩!', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '번갈아뛰기', desc: '뛰기 발을 좌우로 번갈아요.', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '엇걸어풀기 (X자)', desc: '팔을 X자로 걸었다 풀어요.', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '뒤로뛰기', desc: '줄을 뒤로 돌리며 뛰어요.', diff: 'normal', cats: ['기초', '응용'] },
      { id: uid(), name: '이중뛰기', desc: '한 번 뛸 때 줄을 두 번!', diff: 'hard', cats: ['고난도'] },
      { id: uid(), name: '십자뛰기', desc: '앞뒤좌우 십자로 이동하며 뛰어요.', diff: 'hard', cats: ['고난도', '응용'] },
    ],
    events: [
      { id: uid(), name: '슈퍼 점프!', eff: 'forward', steps: 3, weight: 3, label: '보너스' },
      { id: uid(), name: '발이 꼬였어요', eff: 'backward', steps: 2, weight: 2, label: '함정' },
      { id: uid(), name: '한 번 더 도전!', eff: 'extra', steps: 0, weight: 1, label: '보너스' },
      { id: uid(), name: '한 칸 전진', eff: 'forward', steps: 1, weight: 4, label: '' },
    ],
  };
}
