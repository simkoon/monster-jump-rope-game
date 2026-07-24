/* =========================================================
   점프 아일랜드: 황금줄을 찾아라!  —  플레이형 보드게임
   기획안(design-plan.html)을 인터랙티브 웹게임으로 구현
   ========================================================= */

'use strict';

/* ---------- 상수 / 데이터 ---------- */
const FINISH_INDEX = 25;   // 신전(26번 칸) = 배열 인덱스 25
const WAVE_INDEX   = 19;   // 20번 칸 통과 시 '마지막 파도' 발동
const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const EMOJIS = ['🐰', '🦊', '🐻', '🦜', '🐸', '🐯'];
const COLORS = ['#2f80ed', '#eb5757', '#27ae60', '#9b51e0', '#f2994a', '#0ea5b7'];
const SOLO_NAMES = ['점피', '루피', '파워곰', '코치링', '새싹', '번개'];

// 말판(기획안 4번) : 26칸
const BOARD = [
  { type: 'start',     ico: '🏝', cap: '출발섬' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '초급' },
  { type: 'luck',      ico: '🍀', cap: '행운칸' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '초급' },
  { type: 'bonus',     ico: '⭐', cap: '보너스칸' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '중급' },
  { type: 'trap',      ico: '🕳', cap: '함정칸' },
  { type: 'coop',      ico: '🤝', cap: '협동미션' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '초급' },
  { type: 'challenge', ico: '🔥', cap: '챌린지' },
  { type: 'luck',      ico: '🍀', cap: '행운칸' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '중급' },
  { type: 'trap',      ico: '🕳', cap: '함정칸' },
  { type: 'bonus',     ico: '⭐', cap: '보너스칸' },
  { type: 'coop',      ico: '🤝', cap: '협동미션' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '고급' },
  { type: 'luck',      ico: '🍀', cap: '행운칸' },
  { type: 'challenge', ico: '🔥', cap: '챌린지' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '중급' },
  { type: 'trap',      ico: '🕳', cap: '함정칸' },
  { type: 'coop',      ico: '🤝', cap: '협동미션' },
  { type: 'bonus',     ico: '⭐', cap: '보너스칸' },
  { type: 'normal',    ico: '🎯', cap: '미션', level: '고급' },
  { type: 'luck',      ico: '🍀', cap: '행운칸' },
  { type: 'challenge', ico: '🏆', cap: '최종챌린지' },
  { type: 'finish',    ico: '🏛', cap: '황금줄 신전' },
];
const BONUS_TILES = BOARD.map((t, i) => (t.type === 'bonus' ? i : -1)).filter(i => i >= 0);

// 미션 카드 36장 (기획안 13번)
const MISSIONS = [
  { title: '기본 점프 스타트', level: '초급', desc: '양발 모아 뛰기 15회', reward: 1 },
  { title: '리듬 지키기', level: '초급', desc: '같은 속도로 20회 연속 뛰기', reward: 1 },
  { title: '멈춤 없는 점프', level: '초급', desc: '줄에 걸리지 않고 25회', reward: 2 },
  { title: '앞뒤 이동', level: '초급', desc: '앞 2회·뒤 2회를 3세트', reward: 1 },
  { title: '좌우 섬 건너기', level: '초급', desc: '좌우 이동 점프 10회', reward: 1 },
  { title: '한 발 맛보기', level: '초급', desc: '오른발 5회, 왼발 5회', reward: 1 },
  { title: '무소음 점프', level: '초급', desc: '발소리를 작게 하며 15회', reward: 1 },
  { title: '정확한 손목', level: '초급', desc: '팔꿈치를 붙이고 20회', reward: 1 },
  { title: '타이머 점프', level: '초급', desc: '15초 동안 멈추지 않기', reward: 1 },
  { title: '숫자 맞히기', level: '초급', desc: '지도자가 정한 숫자만큼 정확히 뛰기', reward: 2 },
  { title: '번갈아 뛰기', level: '초급', desc: '발을 번갈아 20회', reward: 1 },
  { title: '점프 포즈', level: '초급', desc: '10회 후 지정 포즈로 멈추기', reward: 1 },
  { title: '스키 점프', level: '중급', desc: '좌우 스키 점프 20회', reward: 2 },
  { title: '복서 스텝', level: '중급', desc: '복서 스텝 20회', reward: 2 },
  { title: '앞뒤 콤보', level: '중급', desc: '앞뒤 점프 4회씩 3세트', reward: 2 },
  { title: '십자 이동', level: '중급', desc: '앞·뒤·좌·우 각 3회', reward: 2 },
  { title: '무릎 높이', level: '중급', desc: '무릎을 평소보다 높게 15회', reward: 2 },
  { title: '속도 업', level: '중급', desc: '10초 동안 최대 횟수 25회 이상', reward: 2 },
  { title: '리듬 전환', level: '중급', desc: '느리게 5회, 빠르게 10회, 느리게 5회', reward: 2 },
  { title: '눈맞춤 점프', level: '중급', desc: '정면을 보며 20회 연속', reward: 2 },
  { title: '파트너 싱크', level: '중급', desc: '2명이 같은 리듬으로 15회', reward: 2 },
  { title: '박수 점프', level: '중급', desc: '5회마다 박수, 총 20회', reward: 2 },
  { title: '교차 준비', level: '중급', desc: '팔 교차 동작만 10회 연습 후 5회 성공', reward: 2 },
  { title: '턴 점프', level: '중급', desc: '4회마다 90도 회전, 한 바퀴', reward: 2 },
  { title: '크로스 점프', level: '고급', desc: '팔 교차 뛰기 5회 성공', reward: 3 },
  { title: '이중뛰기 입문', level: '고급', desc: '이중뛰기 1회 성공', reward: 3 },
  { title: '이중뛰기 연속', level: '고급', desc: '이중뛰기 5회 연속', reward: 4 },
  { title: '트리플 콤보', level: '고급', desc: '기본 10회+스키 10회+크로스 3회', reward: 3 },
  { title: '백워드 도전', level: '고급', desc: '뒤로 줄 돌리기 10회', reward: 3 },
  { title: '한 발 마스터', level: '고급', desc: '한 발씩 10회 연속', reward: 3 },
  { title: '30초 챔피언', level: '고급', desc: '30초 동안 60회 이상', reward: 4 },
  { title: '교차 연속', level: '고급', desc: '크로스 10회 연속', reward: 4 },
  { title: '이중+기본 콤보', level: '고급', desc: '이중 1회·기본 3회를 3세트', reward: 4 },
  { title: '무실수 50', level: '고급', desc: '기본 뛰기 50회 무실수', reward: 3 },
  { title: '창작 콤보', level: '고급', desc: '서로 다른 동작 3개를 연결', reward: 3 },
  { title: '보스 미션', level: '고급', desc: '지도자가 지정한 3단계 조합 완수', reward: 5, failPenalty: -1 },
];

// 협동미션 추천 12개 (기획안 15번)
const COOPS = [
  { title: '동시 점프 20', how: '2명이 같은 박자로 20회', rewardText: '열쇠 조각 각 1개', apply: { piece: 1, both: true } },
  { title: '팀 합계 100', how: '팀원이 나누어 총 100회', rewardText: '팀 +2칸', apply: { move: 2 } },
  { title: '릴레이 4종', how: '각자 다른 동작 10회씩', rewardText: '열쇠 1개', apply: { key: 1 } },
  { title: '긴 줄 입장', how: '2명이 긴 줄에 차례로 들어가 5회', rewardText: '팀 +3칸', apply: { move: 3 } },
  { title: '박자 맞추기', how: '구호에 맞춰 전원 10회', rewardText: '보호막 1개', apply: { shield: 1 } },
  { title: '응원 패스', how: '미션 중 팀원 이름을 한 번씩 부르기', rewardText: '전원 열쇠 조각 1개', apply: { piece: 1, both: true } },
  { title: '약속 점프', how: '서로 정한 목표 횟수 모두 달성', rewardText: '팀 +2칸', apply: { move: 2 } },
  { title: '눈빛 신호', how: '말 없이 시작·정지를 맞추기', rewardText: '팀 +2칸', apply: { move: 2 } },
  { title: '구출 점프', how: '가장 뒤 참가자와 함께 15회', rewardText: '둘 다 +2칸', apply: { move: 2, both: true } },
  { title: '3단 콤보', how: '팀원 3명이 서로 다른 동작 성공', rewardText: '열쇠 1개', apply: { key: 1 } },
  { title: '전원 무실수', how: '팀원 모두 기본 10회 무실수', rewardText: '팀 +3칸', apply: { move: 3 } },
  { title: '라이벌 연합', how: '다른 팀과 합계 150회', rewardText: '양 팀 +2칸', apply: { move: 2, both: true } },
];

/* ---------- 게임 상태 ---------- */
const G = {
  mode: 'solo', age: 11,
  players: [], seq: [], current: null,
  lastWave: false, finished: false, busy: false,
};

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const setup = $('setup'), game = $('game');
const board = $('board'), legend = $('legend'), playersEl = $('players'), logEl = $('log');
const dice = $('dice'), rollBtn = $('rollBtn'), reversalBtn = $('reversalBtn'), diceHint = $('diceHint');
const turnName = $('turnName'), turnAvatar = $('turnAvatar'), waveFlag = $('waveFlag');
const modalBack = $('modalBack'), modal = $('modal'), toastEl = $('toast'), refBody = $('refBody');

/* ---------- 유틸 ---------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ageLabel = () => ({ 8: '8~10세', 11: '11~12세', 13: '13~14세' }[G.age]);
const diffClass = (lv) => ({ '초급': 'd1', '중급': 'd2', '고급': 'd3' }[lv] || '');
const randLevel = () => pick(['초급', '중급', '고급']);
const drawMission = (level) => pick(MISSIONS.filter(m => m.level === level));
const atLeast = (lv, min) => (['초급', '중급', '고급'].indexOf(lv) >= ['초급', '중급', '고급'].indexOf(min) ? lv : min);

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 1600);
}
function log(msg) {
  const li = document.createElement('li');
  li.innerHTML = msg;
  logEl.prepend(li);
  while (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
}

/* ---------- 순위 / 위치 헬퍼 ---------- */
const maxPos = () => Math.max(...G.players.map(p => p.pos));
const minPos = () => Math.min(...G.players.map(p => p.pos));
const isLeader = (p) => p.pos === maxPos();
const isLast = (p) => p.pos === minPos();
function lastPlayerExcept(p) {
  const others = G.players.filter(q => q !== p);
  if (!others.length) return null;
  return others.reduce((a, b) => (b.pos < a.pos ? b : a));
}
function nearestBonus(pos) {
  return BONUS_TILES.reduce((best, i) =>
    (Math.abs(i - pos) < Math.abs(best - pos) ? i : best), BONUS_TILES[0]);
}

/* ---------- 모달 시스템 ---------- */
function showModalHtml(html) { modal.innerHTML = html; modalBack.hidden = false; }
function hideModal() { modalBack.hidden = true; }

// actions: [{label, cls, value}]  ->  선택한 value 로 resolve
function modalChoice({ chip, chipClass, title, sub, cardHtml, cardClass, actions }) {
  return new Promise(resolve => {
    const acts = actions.map((a, i) =>
      `<button class="m-btn ${a.cls || ''}" data-i="${i}">${a.label}</button>`).join('');
    showModalHtml(`
      ${chip ? `<div class="m-top"><span class="m-chip ${chipClass || ''}">${chip}</span></div>` : ''}
      <h2>${title}</h2>
      ${sub ? `<p class="m-sub">${sub}</p>` : ''}
      ${cardHtml ? `<div class="m-card ${cardClass || ''}">${cardHtml}</div>` : ''}
      <div class="m-actions ${actions.length === 2 ? 'two' : ''}">${acts}</div>
    `);
    modal.querySelectorAll('.m-btn').forEach(b => {
      b.addEventListener('click', () => { hideModal(); resolve(actions[+b.dataset.i].value); });
    });
  });
}
const announce = (title, html, actions) => modalChoice({
  chip: '🍀 이벤트 카드', chipClass: 'chip-luck', title,
  cardClass: 'm-event', cardHtml: `<div class="m-desc">${html}</div>`,
  actions: actions || [{ label: '확인', value: 1 }],
});
function pickPlayerModal(title, sub, exclude) {
  const opts = G.players.filter(p => p !== exclude)
    .map(p => ({ label: `${p.emoji} ${p.name} (${p.pos}칸)`, value: p.id, cls: 'ghost' }));
  opts.push({ label: '취소 / 해당 없음', value: null, cls: 'alt' });
  return modalChoice({ chip: '🎯 선택', chipClass: 'chip-normal', title, sub, actions: opts })
    .then(id => (id == null ? null : G.players.find(p => p.id === id)));
}

/* ---------- 렌더링 ---------- */
function buildLegend() {
  legend.innerHTML = [
    ['t-normal', '🎯 미션'], ['t-luck', '🍀 행운칸'], ['t-trap', '🕳 함정칸'],
    ['t-bonus', '⭐ 보너스칸'], ['t-challenge', '🔥 챌린지'], ['t-coop', '🤝 협동미션'],
    ['t-finish', '🏛 신전(열쇠 2개)'],
  ].map(([c, t]) => `<span class="${c}">${t}</span>`).join('');
}
function renderBoard() {
  board.innerHTML = BOARD.map((t, i) => {
    const tokens = G.players.filter(p => p.pos === i)
      .map(p => `<span class="pawn" style="background:${p.color}">${p.emoji}</span>`).join('');
    return `<div class="tile t-${t.type}" data-i="${i}">
      <span class="num">${i === 0 ? 'START' : i === FINISH_INDEX ? 'GOAL' : i}</span>
      <span class="ico">${t.ico}</span>
      <span class="cap">${t.cap}</span>
      ${t.level ? `<span class="lv">${t.level}</span>` : ''}
      <span class="tokens">${tokens}</span>
    </div>`;
  }).join('');
}
function renderPlayers() {
  playersEl.innerHTML = G.players.map(p => {
    const tokens = [
      p.keys ? `🔑${p.keys}` : '', p.pieces ? `🧩${p.pieces}` : '',
      p.shields ? `🛡${p.shields}` : '', p.retry ? `🔁${p.retry}` : '',
      p.reversal ? `🌀${p.reversal}` : '',
    ].filter(Boolean).join('  ') || '—';
    return `<div class="pcard ${p === G.current ? 'turn' : ''}" style="border-left-color:${p.color}">
      <span class="pav">${p.emoji}</span>
      <span class="pinfo">
        <span class="pname" style="color:${p.color}">${escapeHtml(p.name)}</span>
        <span class="ptokens">${tokens}</span>
      </span>
      <span class="ppos">${p.pos}<small>/ ${FINISH_INDEX}칸</small></span>
    </div>`;
  }).join('');
  renderReferee();
}
function renderReferee() {
  refBody.innerHTML = G.players.map(p => `
    <div class="ref-row" data-id="${p.id}">
      <span class="rn" style="color:${p.color}">${p.emoji} ${escapeHtml(p.name)}</span>
      <span class="tag">칸</span><button data-act="pos-1">−</button><button data-act="pos+1">+</button>
      <span class="tag">🔑</span><button data-act="key-1">−</button><button data-act="key+1">+</button>
      <span class="tag">🛡</span><button data-act="sh-1">−</button><button data-act="sh+1">+</button>
    </div>`).join('');
}
function highlight(idx) {
  const el = board.querySelector(`.tile[data-i="${idx}"]`);
  if (!el) return;
  el.classList.add('hot');
  setTimeout(() => el.classList.remove('hot'), 400);
}

/* ---------- 이동 / 보상 ---------- */
function maybeWave() {
  if (!G.lastWave && G.players.some(p => p.pos >= WAVE_INDEX)) triggerWave();
}
function triggerWave() {
  if (G.lastWave) return;
  G.lastWave = true;
  waveFlag.hidden = false;
  toast('🌊 마지막 파도 발동! 성공 보상 +1칸');
  log('🌊 <b>마지막 파도</b> 발동! 이후 모든 미션 성공 보상 +1칸');
}
async function movePlayer(p, delta) {
  if (!delta) return;
  let target = p.pos + delta;
  if (target < 0) target = 0;
  if (target >= FINISH_INDEX) {
    target = p.keys >= 2 ? FINISH_INDEX : Math.min(target, FINISH_INDEX - 1);
  }
  if (target === p.pos) {
    if (delta > 0 && p.keys < 2 && p.pos >= FINISH_INDEX - 1) {
      toast('🔑 신전에 들어가려면 황금 열쇠 2개가 필요해요!');
    }
    return;
  }
  const step = target > p.pos ? 1 : -1;
  while (p.pos !== target) {
    p.pos += step;
    if (step > 0) maybeWave();
    renderBoard(); renderPlayers(); highlight(p.pos);
    await sleep(130);
  }
}
async function moveToTile(p, idx) {
  const target = Math.max(0, Math.min(idx, FINISH_INDEX - 1));
  if (target === p.pos) return;
  const step = target > p.pos ? 1 : -1;
  while (p.pos !== target) {
    p.pos += step;
    if (step > 0) maybeWave();
    renderBoard(); renderPlayers(); highlight(p.pos);
    await sleep(120);
  }
}
async function applyRetreat(p, n) {
  if (p.shields > 0) {
    p.shields -= 1;
    renderPlayers();
    toast('🛡 보호막으로 후퇴를 막았어요!');
    log(`🛡 ${p.name} 보호막으로 후퇴 방어`);
    return;
  }
  await movePlayer(p, -n);
}
function grantPiece(p, n) {
  p.pieces += n;
  while (p.pieces >= 2) { p.pieces -= 2; p.keys += 1; toast(`🔑 ${p.name} 황금 열쇠 완성! (${p.keys}개)`); }
  renderPlayers();
}
function grantKey(p, n) { p.keys += n; renderPlayers(); }

/* ---------- 승리 판정 ---------- */
function checkWin(p) {
  if (G.finished) return false;
  if (p.pos >= FINISH_INDEX && p.keys >= 2) { finalizeWin(p); return true; }
  return false;
}
function rankPlayers() {
  return [...G.players].sort((a, b) => b.pos - a.pos || b.keys - a.keys || b.successes - a.successes);
}
function showRanking(title, sub) {
  const r = rankPlayers();
  const list = r.map((p, i) =>
    `<li class="${i === 0 ? 'first' : ''}"><span class="rk">${i + 1}</span>
      <span>${p.emoji} ${escapeHtml(p.name)}</span>
      <span class="wpos">${p.pos}칸 · 🔑${p.keys} · ✅${p.successes}</span></li>`).join('');
  modalChoice({
    chip: '🎉 결과', chipClass: 'chip-finish', title, sub,
    cardHtml: `<ul class="win-list">${list}</ul>`,
    actions: [{ label: '🔄 새 게임 시작', value: 1 }],
  }).then(() => location.reload());
}
function finalizeWin(winner) {
  G.finished = true;
  rollBtn.disabled = true; reversalBtn.hidden = true;
  log(`🏆 <b>${escapeHtml(winner.name)}</b> 승리! 황금줄 신전 도착!`);
  showRanking(`🏆 ${winner.emoji} ${escapeHtml(winner.name)} 승리!`, '황금 열쇠 2개로 신전에 입장했어요!');
}
function finishNow() {
  if (G.finished) return;
  G.finished = true;
  rollBtn.disabled = true; reversalBtn.hidden = true;
  const r = rankPlayers();
  log('🏁 시간 종료! 현재 순위로 결정');
  showRanking(`🏁 ${r[0].emoji} ${escapeHtml(r[0].name)} 1위!`, '신전에 가장 가까운 순서 → 열쇠 수 → 성공 미션 수로 순위를 정했어요.');
}

/* ---------- 난이도(연령) 반영 ---------- */
function scaleReps(desc) {
  const f = G.age === 8 ? 0.8 : G.age === 13 ? 1.25 : 1;
  if (f === 1) return desc;
  return desc.replace(/(\d+)(회|초)/g, (m, n, u) => `${Math.max(1, Math.round(parseInt(n, 10) * f))}${u}`);
}
function predictExtra(p) {
  const parts = [];
  if (G.lastWave) parts.push('마지막 파도 +1');
  if (p.flags.nextBonus) parts.push(`집중 보너스 +${p.flags.nextBonus}`);
  if (p.flags.nextDouble) parts.push('보상 2배');
  return parts.join(' · ');
}

/* ---------- 미션 모달 ---------- */
async function missionModal(p, card, kind) {
  const map = {
    mission: ['🎯 미션 카드', 'chip-normal', 'm-mission'],
    challenge: ['🔥 챌린지', 'chip-challenge', 'm-mission'],
    coop: ['🤝 협동미션', 'chip-coop', 'm-coop'],
  };
  const [chip, chipClass, cardClass] = map[kind] || map.mission;
  const rewardLine = card.rewardText
    ? `성공 보상: ${card.rewardText}`
    : `성공 +${card.reward}칸${card.failPenalty ? ` / 실패 ${card.failPenalty}칸` : ''}`;
  const extra = predictExtra(p);
  const actions = [
    { label: '✅ 성공', value: 'success', cls: 'ok' },
    { label: '❌ 실패', value: 'fail', cls: 'no' },
  ];
  if (p.retry > 0) actions.push({ label: `🔁 재도전권 사용 (${p.retry})`, value: 'retry', cls: 'alt' });

  const html = `
    ${diffClass(card.level) ? `<span class="difficulty ${diffClass(card.level)}">${card.level}</span>` : ''}
    <div class="m-desc">${card.desc ? scaleReps(card.desc) : ''}</div>
    <div class="m-move">${rewardLine}</div>
    ${extra ? `<div class="m-note">✨ ${extra}</div>` : ''}
    <div class="m-note">${ageLabel()} · 연령대 권장 횟수 반영 (지도자 판정)</div>`;

  const r = await modalChoice({
    chip, chipClass, title: `${escapeHtml(p.name)} · ${card.title || '미션'}`,
    cardClass, cardHtml: html, actions,
  });
  if (r === 'retry') { p.retry -= 1; renderPlayers(); toast('🔁 재도전!'); return missionModal(p, card, kind); }
  return r;
}
async function applyMissionResult(p, card, res) {
  if (res === 'success') {
    p.successes += 1;
    let reward = card.reward || 0;
    if (p.flags.nextDouble) { reward *= 2; delete p.flags.nextDouble; }
    if (p.flags.nextBonus) { reward += p.flags.nextBonus; delete p.flags.nextBonus; }
    if (G.lastWave) reward += 1;
    log(`✅ ${escapeHtml(p.name)} "${card.title}" 성공 → +${reward}칸`);
    toast(`성공! +${reward}칸`);
    await movePlayer(p, reward);
    checkWin(p);
  } else if (res !== 'retry') {
    if (card.failPenalty) {
      log(`❌ ${escapeHtml(p.name)} "${card.title}" 실패 → ${card.failPenalty}칸`);
      toast(`실패… ${card.failPenalty}칸`);
      await applyRetreat(p, Math.abs(card.failPenalty));
    } else {
      log(`❌ ${escapeHtml(p.name)} "${card.title}" 실패 → 제자리`);
      toast('실패… 제자리');
    }
  }
}

/* ---------- 칸별 해결 ---------- */
async function resolveTile(p) {
  const tile = BOARD[p.pos];
  switch (tile.type) {
    case 'start': break;
    case 'normal': await doMission(p, tile.level); break;
    case 'challenge': await doChallenge(p); break;
    case 'coop': await doCoop(p); break;
    case 'luck': await doEvent(p); break;
    case 'trap': await doTrap(p); break;
    case 'bonus': await doBonus(p); break;
    case 'finish': break; // 도달 시 checkWin 에서 이미 처리
  }
}
async function doMission(p, level) {
  let lvl = level;
  if (p.flags.minLevel) { lvl = atLeast(lvl, p.flags.minLevel); delete p.flags.minLevel; }
  const card = drawMission(lvl);
  const res = await missionModal(p, card, 'mission');
  await applyMissionResult(p, card, res);
}
async function doChallenge(p) {
  const leader = isLeader(p);
  const card = drawMission('고급');
  const res = await missionModal(p, card, 'challenge');
  if (res === 'success') {
    p.successes += 1;
    let reward = card.reward + (leader ? 1 : 0);   // 선두 부담: 성공 시 큰 보상
    if (p.flags.nextDouble) { reward *= 2; delete p.flags.nextDouble; }
    if (p.flags.nextBonus) { reward += p.flags.nextBonus; delete p.flags.nextBonus; }
    if (G.lastWave) reward += 1;
    log(`🔥 ${escapeHtml(p.name)} 챌린지 성공 → +${reward}칸`);
    toast(`챌린지 성공! +${reward}칸`);
    await movePlayer(p, reward);
    checkWin(p);
  } else if (res !== 'retry') {
    const back = leader ? 2 : 1;                    // 선두 부담: 실패 시 -2칸
    log(`💥 ${escapeHtml(p.name)} 챌린지 실패 → -${back}칸`);
    toast(`챌린지 실패… -${back}칸`);
    await applyRetreat(p, back);
  }
}
async function doCoop(p) {
  const coop = pick(COOPS);
  const partner = G.mode === 'solo' ? lastPlayerExcept(p) : null;
  const sub = partner
    ? `${escapeHtml(p.name)} + ${escapeHtml(partner.name)}(가장 뒤 친구)와 2인 1조!`
    : '팀원과 함께 도전하세요!';
  const res = await missionModal(p,
    { title: coop.title, desc: coop.how, rewardText: coop.rewardText, level: '협동' }, 'coop');
  if (res === 'success') {
    const targets = coop.apply.both && partner ? [p, partner] : [p];
    for (const t of targets) {
      if (coop.apply.piece) grantPiece(t, coop.apply.piece);
      if (coop.apply.key) grantKey(t, coop.apply.key);
      if (coop.apply.shield) { t.shields += coop.apply.shield; }
      if (coop.apply.move) await movePlayer(t, coop.apply.move);
    }
    renderPlayers();
    log(`🤝 ${escapeHtml(p.name)} 협동미션 "${coop.title}" 성공 → ${coop.rewardText}`);
    toast(`협동 성공! ${coop.rewardText}`);
    targets.forEach(checkWin);
  } else if (res !== 'retry') {
    log(`🤝 ${escapeHtml(p.name)} 협동미션 실패`);
    toast('협동미션 실패…');
  }
  void sub;
}
async function doTrap(p) {
  if (p.flags.skipTrap) {
    delete p.flags.skipTrap;
    await modalChoice({ chip: '🕳 함정칸', chipClass: 'chip-trap', title: '무지개 다리로 통과!', cardHtml: '함정을 안전하게 건넜어요.', actions: [{ label: '확인', value: 1 }] });
    return;
  }
  await modalChoice({
    chip: '🕳 함정칸', chipClass: 'chip-trap', title: '함정에 빠졌어요!',
    cardHtml: p.shields > 0 ? '🛡 보호막이 있어 후퇴를 막을 수 있어요.' : '조심! 1칸 뒤로 물러납니다.',
    actions: [{ label: '확인', value: 1 }],
  });
  await applyRetreat(p, 1);
}
async function doBonus(p) {
  p.shields += 1;
  renderPlayers();
  log(`⭐ ${escapeHtml(p.name)} 보너스칸 → 🛡 보호막 +1`);
  await modalChoice({
    chip: '⭐ 보너스칸', chipClass: 'chip-bonus', title: '보호막 획득!',
    cardHtml: '🛡 보호막 토큰 1개를 받았어요. 함정·실패 후퇴를 1회 막을 수 있어요.',
    actions: [{ label: '좋아요!', value: 1 }],
  });
}

/* ---------- 이벤트 카드 36장 (기획안 14번) ---------- */
const EVENTS = [
  { t: '순풍이 분다', run: async (p) => { await announce('순풍이 분다', '앞으로 <b>2칸</b> 이동!'); await movePlayer(p, 2); checkWin(p); } },
  { t: '황금 깃털', run: async (p) => { p.shields += 1; renderPlayers(); await announce('황금 깃털', '🛡 보호막 토큰 1개 획득!'); } },
  { t: '비밀 지름길', run: async (p) => { const t = nearestBonus(p.pos); await announce('비밀 지름길', `가장 가까운 보너스칸(${t}번)으로 이동!`); await moveToTile(p, t); p.shields += 1; renderPlayers(); toast('🛡 보너스칸 도착! 보호막 +1'); } },
  { t: '점피의 응원', run: async (p) => { p.retry += 1; renderPlayers(); await announce('점피의 응원', '🔁 미션 재도전권 1장 획득!'); } },
  { t: '행운의 숫자', run: async (p) => { await announce('행운의 숫자', '주사위를 한 번 더 굴려요!'); const r = await animateDice(); const m = Math.min(r, 4); toast(`+${m}칸!`); await movePlayer(p, m); checkWin(p); } },
  { t: '보물 상자', run: async (p) => { grantPiece(p, 1); await announce('보물 상자', '🧩 황금 열쇠 조각 1개 획득!'); checkWin(p); } },
  { t: '팀워크 보너스', run: async (p) => { const ok = await announce('팀워크 보너스', '팀원 전원이 응원 구호를 외쳤나요? 성공하면 +1칸!', [{ label: '외쳤어요! +1칸', value: 1, cls: 'ok' }, { label: '아니요', value: 0, cls: 'ghost' }]); if (ok) { await movePlayer(p, 1); checkWin(p); } } },
  { t: '친구 구출', run: async (p) => { const back = lastPlayerExcept(p); await announce('친구 구출', `가장 뒤 친구${back ? `(${escapeHtml(back.name)})` : ''}와 함께 +1칸!`); await movePlayer(p, 1); if (back) await movePlayer(back, 1); checkWin(p); if (back) checkWin(back); } },
  { t: '집중의 별', run: async (p) => { p.flags.nextBonus = (p.flags.nextBonus || 0) + 1; await announce('집중의 별', '다음 미션 성공 보상 +1칸!'); } },
  { t: '교환 찬스', run: async (p) => { const tt = await pickPlayerModal('교환 찬스', '자리를 바꿀 상대를 고르세요 (상대 동의 필요)', p); if (tt) { const tmp = p.pos; p.pos = tt.pos; tt.pos = tmp; renderBoard(); renderPlayers(); await announce('교환 찬스', `${escapeHtml(p.name)} ↔ ${escapeHtml(tt.name)} 자리 교환!`); checkWin(p); checkWin(tt); } } },
  { t: '무지개 다리', run: async (p) => { p.flags.skipTrap = true; await announce('무지개 다리', '다음 함정칸 하나를 건너뛸 수 있어요!'); } },
  { t: '코치링의 선물', run: async (p) => { await announce('코치링의 선물', '원하는 난이도의 미션에 도전하세요!'); const lvl = await chooseLevelModal(); const card = drawMission(lvl); const res = await missionModal(p, card, 'mission'); await applyMissionResult(p, card, res); } },
  { t: '폭풍 경보', run: async (p) => { await announce('폭풍 경보', '1칸 뒤로 이동…'); await applyRetreat(p, 1); } },
  { t: '끊어진 다리', run: async (p) => { p.flags.rollPenalty = (p.flags.rollPenalty || 0) + 1; await announce('끊어진 다리', '다음 차례 주사위 이동 -1'); } },
  { t: '늪지대', run: async (p) => { await announce('늪지대', '이번 차례 추가 이동 없음. 다음을 노려요!'); void p; } },
  { t: '장난꾸러기 원숭이', run: async (p) => { if (p.shields > 0) { await announce('장난꾸러기 원숭이', '🛡 보호막 덕분에 안전!'); } else { await announce('장난꾸러기 원숭이', '보호막이 없어 1칸 후퇴…'); await movePlayer(p, -1); } } },
  { t: '안개 섬', run: async (p) => { await announce('안개 섬', '다음 미션 카드를 보지 않고 뽑아요!'); const card = drawMission(randLevel()); const res = await missionModal(p, card, 'mission'); await applyMissionResult(p, card, res); } },
  { t: '줄이 꼬였다', run: async (p) => { const ok = await announce('줄이 꼬였다', '10초 안에 줄을 정리했나요?', [{ label: '정리 성공', value: 1, cls: 'ok' }, { label: '실패 (-1칸)', value: 0, cls: 'no' }]); if (!ok) await applyRetreat(p, 1); } },
  { t: '조용한 동굴', run: async (p) => { await announce('조용한 동굴', '응원 없이 집중! 다음 미션 성공 보상 +1칸'); p.flags.nextBonus = (p.flags.nextBonus || 0) + 1; } },
  { t: '파도에 밀렸다', run: async (p) => { const n = isLeader(p) ? 2 : 1; await announce('파도에 밀렸다', `${isLeader(p) ? '선두라서 ' : ''}${n}칸 뒤로…`); await applyRetreat(p, n); } },
  { t: '용기의 시험', run: async (p) => { const go = await announce('용기의 시험', '고급 도전! 성공 +3칸, 포기하면 제자리', [{ label: '도전!', value: 1, cls: 'ok' }, { label: '포기', value: 0, cls: 'ghost' }]); if (go) { const card = drawMission('고급'); const res = await missionModal(p, card, 'challenge'); if (res === 'success') { let r = 3; if (G.lastWave) r += 1; toast(`성공! +${r}칸`); await movePlayer(p, r); checkWin(p); } else if (res !== 'retry') { toast('아쉽게 실패…'); } } } },
  { t: '선택의 갈림길', run: async (p) => { const lvl = await announce('선택의 갈림길', '어떤 미션에 도전할까요?', [{ label: '초급 (성공 +1)', value: '초급', cls: 'ghost' }, { label: '중급 (성공 +2)', value: '중급', cls: 'alt' }]); const card = drawMission(lvl); const res = await missionModal(p, card, 'mission'); await applyMissionResult(p, card, res); } },
  { t: '더블 점프 찬스', run: async (p) => { p.flags.nextDouble = true; await announce('더블 점프 찬스', '다음 미션 성공 시 보상 2배!'); } },
  { t: '역전의 나침반', run: async (p) => { if (isLast(p)) { await announce('역전의 나침반', '현재 꼴찌! +3칸 전진!'); await movePlayer(p, 3); checkWin(p); } else { await announce('역전의 나침반', '꼴찌가 아니라 효과가 없어요.'); } } },
  { t: '선두의 무게', run: async (p) => { if (isLeader(p)) { await announce('선두의 무게', '선두는 중급 이상 미션을 수행!'); const card = drawMission(pick(['중급', '고급'])); const res = await missionModal(p, card, 'mission'); await applyMissionResult(p, card, res); } else { await announce('선두의 무게', '선두가 아니라 그냥 통과!'); } } },
  { t: '모두 함께', run: async (p) => { const ok = await announce('모두 함께', '전원이 기본 뛰기 10회 성공하면 모두 +1칸!', [{ label: '전원 성공! 모두 +1', value: 1, cls: 'ok' }, { label: '아니요', value: 0, cls: 'ghost' }]); if (ok) { for (const q of G.players) await movePlayer(q, 1); G.players.forEach(checkWin); } void p; } },
  { t: '협동 구조대', run: async (p) => { const tt = await pickPlayerModal('협동 구조대', '함께 협동미션을 성공한 상대를 고르세요', p); if (tt) { const ok = await announce('협동 구조대', '협동미션을 성공했나요? 양 팀 +2칸!', [{ label: '성공! 둘 다 +2', value: 1, cls: 'ok' }, { label: '실패', value: 0, cls: 'ghost' }]); if (ok) { await movePlayer(p, 2); await movePlayer(tt, 2); checkWin(p); checkWin(tt); } } } },
  { t: '응원 에너지', run: async () => { const tt = await pickPlayerModal('응원 에너지', '가장 크게 응원한 참가자에게 보호막 1개!', null); if (tt) { tt.shields += 1; renderPlayers(); await announce('응원 에너지', `${escapeHtml(tt.name)} 🛡 보호막 +1!`); } } },
  { t: '시간 정지', run: async (p) => { const tt = await pickPlayerModal('시간 정지', '다음 차례 이동을 줄일 상대를 고르세요', p); if (tt) { tt.flags.rollPenalty = (tt.flags.rollPenalty || 0) + 2; await announce('시간 정지', `${escapeHtml(tt.name)}의 다음 차례 이동이 줄어들어요!`); } } },
  { t: '바람 방향 변경', run: async () => { G.seq.reverse(); await announce('바람 방향 변경', '진행 순서가 반대로 바뀌었어요!'); } },
  { t: '황금 열쇠 도둑', run: async () => { const rich = G.players.filter(q => q.keys >= 2); rich.forEach(q => { q.keys -= 1; }); renderPlayers(); await announce('황금 열쇠 도둑', rich.length ? `${rich.map(q => escapeHtml(q.name)).join(', ')}가 열쇠 1개를 공동 창고에 반납!` : '열쇠 2개 이상인 참가자가 없어요.'); } },
  { t: '공동 창고', run: async () => { for (const q of G.players) grantPiece(q, 1); await announce('공동 창고', '모든 참가자가 🧩 열쇠 조각 1개씩 획득!'); G.players.forEach(checkWin); } },
  { t: '마지막 파도', run: async () => { triggerWave(); await announce('마지막 파도', '🌊 이후 모든 미션 성공 보상 +1칸!'); } },
  { t: '운명의 주사위', run: async (p) => { const r = await animateDice(); if (r % 2 === 1) { await announce('운명의 주사위', `홀수(${r})! +2칸`); await movePlayer(p, 2); } else { await announce('운명의 주사위', `짝수(${r})! -1칸`); await applyRetreat(p, 1); } checkWin(p); } },
  { t: '챔피언의 선택', run: async (p) => { const tt = await pickPlayerModal('챔피언의 선택', '미션을 추천할 상대를 고르세요', p); if (tt) { const card = drawMission(randLevel()); const res = await missionModal(tt, card, 'mission'); if (res === 'success') { await movePlayer(p, 1); await movePlayer(tt, 1); toast('둘 다 +1칸!'); checkWin(p); checkWin(tt); } else if (res !== 'retry') { toast('아쉽게 실패…'); } } } },
  { t: '황금줄의 축복', run: async (p) => { grantKey(p, 1); p.flags.minLevel = '중급'; await announce('황금줄의 축복', '🔑 즉시 열쇠 1개 획득! 단, 다음 미션은 중급 이상.'); checkWin(p); } },
];
async function doEvent(p) {
  const ev = pick(EVENTS);
  log(`🍀 ${escapeHtml(p.name)} 이벤트: <b>${ev.t}</b>`);
  await ev.run(p);
  renderPlayers();
}
function chooseLevelModal() {
  return modalChoice({
    chip: '🎁 난이도 선택', chipClass: 'chip-luck', title: '난이도를 선택하세요',
    actions: [
      { label: '초급 (쉬움 · +1칸)', value: '초급', cls: 'ok' },
      { label: '중급 (보통 · +2칸)', value: '중급', cls: 'alt' },
      { label: '고급 (도전 · +3칸~)', value: '고급', cls: 'no' },
    ],
  });
}

/* ---------- 주사위 / 턴 진행 ---------- */
async function animateDice() {
  dice.classList.add('rolling');
  const v = rollDie();
  await sleep(500);
  dice.classList.remove('rolling');
  dice.textContent = DIE_FACES[v];
  return v;
}
function nextTurn() {
  const i = G.seq.indexOf(G.current);
  G.current = G.seq[(i + 1) % G.seq.length];
}
function autoReversal() {
  // 밸런스 규칙: 선두-꼴찌 8칸 이상 차이 시 꼴찌에게 역전 토큰 지급
  if (maxPos() - minPos() >= 8) {
    const last = G.players.reduce((a, b) => (b.pos < a.pos ? b : a));
    if (last.reversal < 1) {
      last.reversal = 1;
      renderPlayers();
      log(`🌀 ${escapeHtml(last.name)}에게 역전 토큰 지급 (선두와 8칸 이상 차이)`);
    }
  }
}
function beginTurn() {
  if (G.finished) return;
  renderBoard(); renderPlayers();
  const p = G.current;
  turnName.textContent = p.name;
  turnAvatar.textContent = p.emoji;
  rollBtn.disabled = false;
  reversalBtn.hidden = !(p.reversal > 0);
  diceHint.textContent = `${p.name} 차례! 주사위를 굴리세요.`;
}
function endTurn() {
  G.busy = false;
  autoReversal();
  nextTurn();
  beginTurn();
}
async function doRoll(useReversal) {
  if (G.busy || G.finished) return;
  G.busy = true;
  rollBtn.disabled = true;
  reversalBtn.hidden = true;
  const p = G.current;

  let roll;
  if (useReversal && p.reversal > 0) {
    p.reversal -= 1;
    renderPlayers();
    const a = await animateDice();
    const b = await animateDice();
    roll = await modalChoice({
      chip: '🌀 역전 토큰', chipClass: 'chip-challenge', title: '두 결과 중 선택!',
      cardHtml: `두 번 굴렸어요. 원하는 값을 고르세요.`,
      actions: [
        { label: `첫 번째: ${a} (${DIE_FACES[a]})`, value: a, cls: 'ghost' },
        { label: `두 번째: ${b} (${DIE_FACES[b]})`, value: b, cls: 'ghost' },
      ],
    });
    log(`🌀 ${escapeHtml(p.name)} 역전 토큰 사용 → ${a}/${b} 중 ${roll} 선택`);
  } else {
    roll = await animateDice();
  }

  let move = Math.min(roll, 4);                 // 5·6 은 최대 4칸
  if (p.flags.rollPenalty) {
    move = Math.max(0, move - p.flags.rollPenalty);
    delete p.flags.rollPenalty;
  }
  log(`🎲 ${escapeHtml(p.name)} 주사위 ${roll} → ${move}칸 이동`);
  await movePlayer(p, move);

  if (!checkWin(p)) {
    await resolveTile(p);
  }
  if (!G.finished) endTurn();
}

/* ---------- 규칙 모달 ---------- */
function showRules() {
  modalChoice({
    chip: '📖 규칙', chipClass: 'chip-normal', title: '점프 아일랜드 규칙',
    cardHtml: `
      <div style="text-align:left;font-size:14px;line-height:1.7">
        • 주사위를 굴려 이동 (5·6은 최대 4칸)<br/>
        • 도착한 칸의 <b>미션/이벤트</b>를 수행 — 성공 시 전진!<br/>
        • 🕳 함정 -1칸 · 🛡 보호막으로 방어<br/>
        • 🤝 협동미션·이벤트로 <b>열쇠 조각(🧩)</b> 획득 → 2개면 🔑 열쇠 1개<br/>
        • 🏛 신전에 들어가려면 <b>황금 열쇠 2개</b> 필요<br/>
        • 20번 칸 통과 시 <b>마지막 파도</b> — 성공 보상 +1칸<br/>
        • 뒤처지면 🌀 <b>역전 토큰</b>으로 두 번 굴려 선택!
      </div>`,
    actions: [{ label: '닫기', value: 1 }],
  });
}

/* ---------- 게임 시작 ---------- */
function startGame() {
  setup.hidden = true;
  game.hidden = false;
  buildLegend();
  G.finished = false;
  G.lastWave = false;
  waveFlag.hidden = true;
  G.seq = [...G.players];
  G.current = G.seq[0];
  log('🏝 모험 시작! 출발섬에서 황금줄 신전까지 함께 가요.');
  beginTurn();
}

/* ---------- 설정 화면 ---------- */
const ui = { mode: 'solo', age: 11, count: 3, names: [] };
const bounds = () => (ui.mode === 'team' ? [2, 4] : [2, 6]);
const defaultName = (i) => (ui.mode === 'team' ? `${i + 1}팀` : (SOLO_NAMES[i] || `용사${i + 1}`));

function renderNames() {
  const [mn, mx] = bounds();
  ui.count = Math.max(mn, Math.min(mx, ui.count));
  $('countValue').textContent = ui.count;
  const wrap = $('nameInputs');
  wrap.innerHTML = '';
  for (let i = 0; i < ui.count; i++) {
    const val = (ui.names[i] != null && ui.names[i] !== '') ? ui.names[i] : defaultName(i);
    ui.names[i] = val;
    const row = document.createElement('div');
    row.className = 'name-row';
    row.innerHTML = `<span class="av">${EMOJIS[i]}</span><input data-i="${i}" value="${escapeHtml(val)}" maxlength="10" />`;
    wrap.appendChild(row);
  }
  wrap.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => { ui.names[+inp.dataset.i] = inp.value; });
  });
}
function setupWiring() {
  $('modeChooser').querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => {
      $('modeChooser').querySelectorAll('.choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ui.mode = btn.dataset.mode;
      const label = ui.mode === 'team' ? '팀' : '참가자';
      $('countLabel').textContent = label;
      $('nameLabel').textContent = label;
      ui.names = [];
      renderNames();
    });
  });
  $('ageChooser').querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => {
      $('ageChooser').querySelectorAll('.choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ui.age = +btn.dataset.age;
    });
  });
  $('countMinus').addEventListener('click', () => { ui.count -= 1; renderNames(); });
  $('countPlus').addEventListener('click', () => { ui.count += 1; renderNames(); });
  $('startBtn').addEventListener('click', () => {
    G.mode = ui.mode; G.age = ui.age;
    G.players = [];
    for (let i = 0; i < ui.count; i++) {
      const name = (ui.names[i] || '').trim() || defaultName(i);
      G.players.push({
        id: i, name, emoji: EMOJIS[i], color: COLORS[i],
        pos: 0, keys: 0, pieces: 0, shields: 0,
        retry: ui.age === 8 ? 1 : 0, reversal: 0, successes: 0, flags: {},
      });
    }
    startGame();
  });
  renderNames();
}

/* ---------- 이벤트 바인딩 ---------- */
rollBtn.addEventListener('click', () => doRoll(false));
reversalBtn.addEventListener('click', () => doRoll(true));
$('rulesBtn').addEventListener('click', showRules);
$('restartBtn').addEventListener('click', () => location.reload());
$('waveBtn').addEventListener('click', () => { triggerWave(); });
$('finishBtn').addEventListener('click', finishNow);
refBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const row = btn.closest('.ref-row');
  const p = G.players.find(q => q.id === +row.dataset.id);
  if (!p) return;
  const act = btn.dataset.act;
  if (act === 'pos-1') p.pos = Math.max(0, p.pos - 1);
  else if (act === 'pos+1') p.pos = Math.min(FINISH_INDEX, p.pos + 1);
  else if (act === 'key-1') p.keys = Math.max(0, p.keys - 1);
  else if (act === 'key+1') p.keys += 1;
  else if (act === 'sh-1') p.shields = Math.max(0, p.shields - 1);
  else if (act === 'sh+1') p.shields += 1;
  renderBoard(); renderPlayers();
  checkWin(p);
});

setupWiring();
