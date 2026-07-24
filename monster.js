const stages = [
  { week:'1주차', name:'개구리 친구', emoji:'🐸', goal:20, coin:10, color:'#20b156' },
  { week:'2주차', name:'늑대 친구', emoji:'🐺', goal:22, coin:15, color:'#1d67be' },
  { week:'3주차', name:'드래곤 친구', emoji:'🐲', goal:24, coin:20, color:'#c93b29' },
  { week:'4주차', name:'마법사 친구', emoji:'🧙‍♂️', goal:26, coin:30, color:'#7a3fb9' },
  { week:'최종 보스전', name:'헤르칸 친구', emoji:'🦁', goal:30, coin:50, color:'#d18618' },
];

let stage = 0;
let pos = 0;
let coins = 0;
const history = [];

const $ = (id) => document.getElementById(id);
const stageName = $('stageName'), posText = $('positionText'), goalText = $('goalText'), coinsEl = $('coins');
const weekBadge = $('weekBadge'), monsterName = $('monsterName'), monsterEmoji = $('monsterEmoji');
const board = $('board'), hint = $('hint'), toast = $('toast'), winPanel = $('winPanel'), progressCopy = $('progressCopy');
const stageLine = $('stageLine');

const labels = ['출발','응원','도전','성공','칭찬','규칙','박수','점프','친절','집중','웃음','협동','용기','친구','약속','멋짐','한번더','최고','거의 다','도착'];

function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(()=>toast.classList.remove('show'), 1500);
}

function renderRewards(){
  $('rewardList').innerHTML = stages.map(s => `<li>${s.emoji} ${s.name} <b>코인 ${s.coin}개</b></li>`).join('');
}

function renderStageLine(){
  stageLine.innerHTML = '';
  stages.forEach((s, index) => {
    const card = document.createElement('div');
    card.className = `stage-card ${index === stage ? 'active' : ''}`;
    card.style.color = s.color;
    card.innerHTML = `<b style="background:${s.color}">${s.week}</b><span>${s.emoji}</span><small>${s.name}</small>`;
    stageLine.appendChild(card);
  });
}

function boardLabel(i, goal){
  if(i === 0) return '출발';
  if(i === goal) return '도착!';
  return labels[i % labels.length];
}

function renderBoard(){
  const s = stages[stage];
  board.innerHTML = '';
  for(let i=0; i<=s.goal; i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    if(i === 0) cell.classList.add('start');
    if(i === s.goal) cell.classList.add('goal');
    if(i < pos) cell.classList.add('done');
    if(i === pos) cell.classList.add('current');
    cell.innerHTML = `<span class="num">${i}</span><span class="label">${boardLabel(i, s.goal)}</span>`;
    if(i === pos){
      const token = document.createElement('span');
      token.className = 'token';
      token.textContent = '🏃';
      cell.appendChild(token);
    }
    board.appendChild(cell);
  }
}

function render(){
  const s = stages[stage];
  stageName.textContent = s.name;
  posText.textContent = pos;
  goalText.textContent = s.goal;
  coinsEl.textContent = coins;
  weekBadge.textContent = s.week;
  weekBadge.style.background = s.color;
  weekBadge.style.borderColor = s.color;
  monsterName.textContent = s.name;
  monsterName.style.color = s.color;
  monsterEmoji.textContent = s.emoji;
  const left = s.goal - pos;
  progressCopy.textContent = left > 0
    ? `현재 ${pos}칸! ${left}칸만 더 가면 ${s.name}를 제압하고 친구가 돼요.`
    : `${s.name}와 친구가 됐어요!`;
  renderStageLine();
  renderBoard();
}

function clearStage(){
  const s = stages[stage];
  coins += s.coin;
  showToast(`${s.name} 제압 성공! 이제 우리 편 친구예요 🥳`);
  stage += 1;
  pos = 0;
  history.length = 0;
  if(stage >= stages.length){
    stage = stages.length - 1;
    winPanel.hidden = false;
    document.querySelector('.poster-grid').style.display = 'none';
    document.querySelector('.info-scrolls').style.display = 'none';
    stageName.textContent = '오늘의 모험 성공!';
    posText.textContent = stages[stage].goal;
    goalText.textContent = stages[stage].goal;
    coinsEl.textContent = coins;
    window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'});
    return;
  }
  render();
}

function moveForward(reason){
  const s = stages[stage];
  if(pos >= s.goal) return;
  history.push(pos);
  pos += 1;
  hint.textContent = `${reason}! 말이 한 칸 전진했어요.`;
  if(pos >= s.goal){
    render();
    setTimeout(clearStage, 500);
  } else {
    showToast('한 칸 전진!');
    render();
  }
}

document.querySelectorAll('.action').forEach(btn => {
  btn.addEventListener('click', () => moveForward(btn.querySelector('b').textContent));
});

$('undoBtn').addEventListener('click', () => {
  if(!history.length){
    showToast('취소할 전진이 없어요');
    return;
  }
  pos = history.pop();
  hint.textContent = '방금 전진을 취소했어요.';
  render();
});

$('restartBtn').addEventListener('click', () => {
  stage = 0; pos = 0; coins = 0; history.length = 0;
  winPanel.hidden = true;
  document.querySelector('.poster-grid').style.display = '';
  document.querySelector('.info-scrolls').style.display = '';
  hint.textContent = '잘한 일을 누르면 말이 한 칸 앞으로 이동해요.';
  render();
  window.scrollTo({top:0, behavior:'smooth'});
});

renderRewards();
render();
