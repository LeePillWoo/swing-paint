// ── 모드 버튼 ───────────────────────────────────────────────────────────────
const btnMirror = document.getElementById('btn-mirror');
const btnStyle  = document.getElementById('btn-style');
const btnHud    = document.getElementById('btn-hud');

// ── 속도 슬라이더 ──────────────────────────────────────────────────────────
const speedSlider = document.getElementById('speed-slider');

// ── 에너지 바 ───────────────────────────────────────────────────────────────
const energyWrap = document.getElementById('energy-wrap');
const energyFill = document.getElementById('energy-fill');

// ── 속도 배율 (로그 스케일: 0→×0.17, 50→×1.0, 100→×6.0) ──────────────────
export function getSpeedScale() {
  const v = parseInt(speedSlider.value);
  return Math.pow(6, (v - 50) / 50);
}

// ── 에너지 바 ───────────────────────────────────────────────────────────────
export function updateEnergy(energy) {
  energyFill.style.width = (energy * 100) + '%';
  energyWrap.classList.toggle('low', energy < 0.22);
}

// ── 모드 버튼 상태 ──────────────────────────────────────────────────────────
export function setMirrorActive(on) {
  btnMirror.classList.toggle('mode-on', on);
}

export function setStyleLabel(label) {
  btnStyle.textContent = label;
}

export function setHudActive(on) {
  btnHud.classList.toggle('mode-on', on);
}

// ── 이벤트 바인딩 ───────────────────────────────────────────────────────────
export function onMirrorClick(cb) { btnMirror.addEventListener('click', cb); }
export function onStyleClick(cb)  { btnStyle.addEventListener('click', cb); }
export function onHudClick(cb)    { btnHud.addEventListener('click', cb); }
