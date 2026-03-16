// ── 버튼 ────────────────────────────────────────────────────────────────────
const btnMirror = document.getElementById('btn-mirror');
const btnStyle  = document.getElementById('btn-style');
const btnHud    = document.getElementById('btn-hud');
const btnEnv    = document.getElementById('btn-env');
const btnMass   = document.getElementById('btn-mass');

// ── 슬라이더 ────────────────────────────────────────────────────────────────
const speedSlider = document.getElementById('speed-slider');
const trailSlider = document.getElementById('trail-slider');

// ── 에너지 바 ────────────────────────────────────────────────────────────────
const energyWrap = document.getElementById('energy-wrap');
const energyFill = document.getElementById('energy-fill');

// ── 속도 배율 (로그 스케일: 0→×0.17, 50→×1.0, 100→×6.0) ───────────────────
export function getSpeedScale() {
  const v = parseFloat(speedSlider.value);
  return Math.pow(6, (v - 50) / 50);
}

// ── 잔상 길이 배율 (0=SHORT×6, 50=×1.0 default, 100=LONG×0.17) ────────────
export function getTrailScale() {
  const v = parseFloat(trailSlider.value);
  return Math.pow(6, (50 - v) / 50);
}

// ── 에너지 바 ────────────────────────────────────────────────────────────────
export function updateEnergy(energy) {
  energyFill.style.width = (energy * 100) + '%';
  energyWrap.classList.toggle('low', energy < 0.22);
}

// ── 버튼 상태 ────────────────────────────────────────────────────────────────
export function setMirrorActive(on) {
  btnMirror.classList.toggle('mode-on', on);
}

export function setHudActive(on) {
  btnHud.classList.toggle('mode-on', on);
}

// 사이클 버튼: 라벨 + CSS 클래스 동시 갱신
export function setStyleLabel(label) {
  btnStyle.textContent = label;
  btnStyle.className   = `mode-btn trail-btn ${label.toLowerCase()}`;
}

export function setEnvLabel(label) {
  btnEnv.textContent = label;
  btnEnv.className   = `mode-btn env-btn ${label.toLowerCase()}`;
}

export function setMassLabel(label) {
  btnMass.textContent = label;
  btnMass.className   = `mode-btn mass-btn ${label.toLowerCase()}`;
}

// ── 이벤트 바인딩 ────────────────────────────────────────────────────────────
export function onMirrorClick(cb) { btnMirror.addEventListener('click', cb); }
export function onStyleClick(cb)  { btnStyle.addEventListener('click', cb); }
export function onHudClick(cb)    { btnHud.addEventListener('click', cb); }
export function onEnvClick(cb)    { btnEnv.addEventListener('click', cb); }
export function onMassClick(cb)   { btnMass.addEventListener('click', cb); }
