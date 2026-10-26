// src/seed.ts — default content library: the instructor's jump-rope curriculum (2026-10-25).
// 3 categories, 26 missions (9 easy / 8 normal / 9 hard, names only — no desc), 4 events. Each record gets a fresh id via uid().
import { SCHEMA_VERSION, type Content } from './schema';

export function uid(): string {
  return 'id' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// Hard missions added 2026-10-26. Devices that already saved content get them once (store.ts).
export const HARD_ADDITIONS = ['OOCO', 'OOCC', 'COCC', 'OO OOO', 'OO SO SC'] as const;

export function seedContent(): Content {
  return {
    version: SCHEMA_VERSION,
    categories: ['기초', '응용', '고난도'],
    missions: [
      { id: uid(), name: '양발모아뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '번갈아뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '좌우벌려뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '번갈아2박자', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '앞흔들어뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '옆흔들어뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '좌우앞뒤뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '뒤들어모아뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '앞들어모아뛰기', desc: '', diff: 'easy', cats: ['기초'] },
      { id: uid(), name: '2박자 엇걸어풀어뛰기', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '연속 엇걸어풀어뛰기', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '2박자 엇걸어뛰기', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '연속 엇걸어뛰기', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '2박자 스윙오픈', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '연속 스윙오픈', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '2박자 스윙크로스', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: '연속 스윙크로스', desc: '', diff: 'normal', cats: ['응용'] },
      { id: uid(), name: 'OO', desc: '', diff: 'hard', cats: ['고난도'] },
      { id: uid(), name: 'SO', desc: '', diff: 'hard', cats: ['고난도'] },
      { id: uid(), name: 'CO', desc: '', diff: 'hard', cats: ['고난도'] },
      { id: uid(), name: 'CC', desc: '', diff: 'hard', cats: ['고난도'] },
      ...HARD_ADDITIONS.map((name) => ({ id: uid(), name, desc: '', diff: 'hard' as const, cats: ['고난도'] })),
    ],
    events: [
      { id: uid(), name: '슈퍼 점프!', eff: 'forward', steps: 3, weight: 3, label: '보너스' },
      { id: uid(), name: '발이 꼬였어요', eff: 'backward', steps: 2, weight: 2, label: '함정' },
      { id: uid(), name: '한 번 더 도전!', eff: 'extra', steps: 0, weight: 1, label: '보너스' },
      { id: uid(), name: '한 칸 전진', eff: 'forward', steps: 1, weight: 4, label: '' },
    ],
  };
}
