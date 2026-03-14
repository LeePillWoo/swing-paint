// ── 기존 패널 ───────────────────────────────────────────────────────────────
const pillTap    = document.getElementById('pill-tap');
const pillCharge = document.getElementById('pill-charge');
const chargeWrap = document.getElementById('charge-wrap');
const chargeFill = document.getElementById('charge-fill');

// ── 모드 버튼 ───────────────────────────────────────────────────────────────
const btnMirror = document.getElementById('btn-mirror');
const btnStyle  = document.getElementById('btn-style');
const btnGame   = document.getElementById('btn-game');
const btnSave   = document.getElementById('btn-save');

// ── 에너지 & 스코어 ─────────────────────────────────────────────────────────
const energyWrap  = document.getElementById('energy-wrap');
const energyFill  = document.getElementById('energy-fill');
const scoreEl     = document.getElementById('score-display');

// ── 기존 TAP / CHARGE ───────────────────────────────────────────────────────
export function flashTap() {
  pillTap.classList.add('flash-tap');
  setTimeout(() => pillTap.classList.remove('flash-tap'), 350);
}

export function updateChargeUI(mode, chargeLevel) {
  if (mode === 'charging') {
    pillCharge.classList.add('active-charge');
    chargeWrap.style.opacity = '1';
    chargeFill.style.width   = (chargeLevel * 100) + '%';
  } else {
    pillCharge.classList.remove('active-charge');
    chargeWrap.style.opacity = '0';
  }
}

// ── 에너지 바 ───────────────────────────────────────────────────────────────
export function updateEnergy(energy) {
  energyFill.style.width = (energy * 100) + '%';
  energyWrap.classList.toggle('low', energy < 0.22);
}

// ── 스코어 ──────────────────────────────────────────────────────────────────
let lastScore = -1;
export function updateScore(score, gameMode) {
  scoreEl.classList.toggle('visible', gameMode);
  if (!gameMode) return;
  if (score !== lastScore) {
    lastScore = score;
    scoreEl.textContent = `${score} PTS`;
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth; // reflow
    scoreEl.classList.add('score-pop');
  }
}

// ── 모드 버튼 상태 ──────────────────────────────────────────────────────────
export function setMirrorActive(on) {
  btnMirror.classList.toggle('mode-on', on);
}

export function setStyleLabel(label) {
  btnStyle.textContent = label;
}

export function setGameActive(on) {
  btnGame.classList.toggle('mode-on', on);
  if (!on) { lastScore = -1; }
}

export function flashSave() {
  btnSave.classList.add('save-flash');
  setTimeout(() => btnSave.classList.remove('save-flash'), 600);
}

// ── 이벤트 바인딩 ───────────────────────────────────────────────────────────
export function onMirrorClick(cb) { btnMirror.addEventListener('click', cb); }
export function onStyleClick(cb)  { btnStyle.addEventListener('click', cb); }
export function onGameClick(cb)   { btnGame.addEventListener('click', cb); }
export function onSaveClick(cb)   { btnSave.addEventListener('click', cb); }
