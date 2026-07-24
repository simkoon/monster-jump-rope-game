const monsters = [
  { week:'1주차', name:'개구리 몬스터', emoji:'🐸', hp:300, coin:10, color:'#22b65b' },
  { week:'2주차', name:'늑대 몬스터', emoji:'🐺', hp:500, coin:15, color:'#2578d4' },
  { week:'3주차', name:'드래곤 몬스터', emoji:'🐲', hp:800, coin:20, color:'#d74422' },
  { week:'4주차', name:'마왕 몬스터', emoji:'🧙‍♂️', hp:1500, coin:30, color:'#6e36c9' },
  { week:'최종 보스전', name:'마왕 헤르칸', emoji:'👹', hp:3000, coin:50, color:'#9b0e0e' },
];

let stage = 0;
let hp = monsters[0].hp;
let attack = 0;
let coins = 0;

const $ = (id) => document.getElementById(id);
const stageName = $('stageName'), attackPower = $('attackPower'), coinsEl = $('coins');
const weekBadge = $('weekBadge'), monsterName = $('monsterName'), monsterEmoji = $('monsterEmoji');
const hpText = $('hpText'), hpFill = $('hpFill'), tickRow = $('tickRow'), card = $('monsterCard');
const attackBtn = $('attackBtn'), hint = $('hint'), toast = $('toast'), winPanel = $('winPanel');

function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(()=>toast.classList.remove('show'), 1500);
}

function renderRewards(){
  $('rewardList').innerHTML = monsters.map(m => `<li>${m.emoji} ${m.name} — 코인 ${m.coin}개</li>`).join('');
}

function renderTicks(maxHp, currentHp){
  const parts = 5;
  const filled = Math.ceil((currentHp / maxHp) * parts);
  tickRow.innerHTML = '';
  for(let i=0;i<parts;i++){
    const dot = document.createElement('i');
    dot.style.opacity = i < filled ? '1' : '.17';
    tickRow.appendChild(dot);
  }
}

function render(){
  const m = monsters[stage];
  stageName.textContent = m.name;
  attackPower.textContent = attack;
  coinsEl.textContent = coins;
  weekBadge.textContent = m.week;
  weekBadge.style.background = m.color;
  monsterName.textContent = m.name;
  monsterName.style.color = m.color;
  monsterEmoji.textContent = m.emoji;
  hpText.textContent = `${Math.max(0, hp)} / ${m.hp}`;
  hpFill.style.width = `${Math.max(0, hp / m.hp * 100)}%`;
  renderTicks(m.hp, hp);
  attackBtn.disabled = attack <= 0;
}

function clearStage(){
  const m = monsters[stage];
  coins += m.coin;
  showToast(`${m.name} 처치! 코인 ${m.coin}개 획득!`);
  stage += 1;
  attack = 0;
  if(stage >= monsters.length){
    stage = monsters.length - 1;
    winPanel.hidden = false;
    document.querySelector('.game-board').style.display = 'none';
    document.querySelector('.rules-rewards').style.display = 'none';
    stageName.textContent = '클리어!';
    attackPower.textContent = 'MAX';
    coinsEl.textContent = coins;
    window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'});
    return;
  }
  hp = monsters[stage].hp;
  render();
}

document.querySelectorAll('.action').forEach(btn => {
  btn.addEventListener('click', () => {
    const power = Number(btn.dataset.power || 0);
    const heal = Number(btn.dataset.heal || 0);
    if(power){
      attack += power;
      hint.textContent = `공격력 ${power} 획득! 이제 공격하기 버튼을 눌러요.`;
      showToast(`공격력 +${power}`);
    }
    if(heal){
      hp = Math.min(monsters[stage].hp, hp + heal);
      hint.textContent = `친구 도움으로 몬스터 HP가 ${heal} 회복됐어요. 실제 포스터 규칙을 게임에 반영했어요!`;
      showToast(`몬스터 HP +${heal}`);
    }
    render();
  });
});

attackBtn.addEventListener('click', () => {
  if(attack <= 0) return;
  hp -= attack;
  card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit');
  showToast(`⚔️ ${attack} 데미지!`);
  attack = 0;
  hint.textContent = '좋아요! 다시 줄넘기로 공격력을 모아주세요.';
  if(hp <= 0){
    setTimeout(clearStage, 360);
  } else {
    render();
  }
});

$('restartBtn').addEventListener('click', () => {
  stage = 0; hp = monsters[0].hp; attack = 0; coins = 0;
  winPanel.hidden = true;
  document.querySelector('.game-board').style.display = '';
  document.querySelector('.rules-rewards').style.display = '';
  hint.textContent = '먼저 줄넘기 버튼으로 공격력을 모아주세요.';
  render();
  window.scrollTo({top:0, behavior:'smooth'});
});

renderRewards();
render();
