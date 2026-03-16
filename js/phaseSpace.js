// ── 위상 공간 궤적 (Phase Space Portrait) HUD ────────────────────────────────
// X축: a1 (진자 각도), Y축: a1v (각속도)
// 점들이 프레임마다 누적되어 카오스 끌개(Strange Attractor) 패턴을 형성

const GW    = 190;   // 그래프 내부 폭
const GH    = 170;   // 그래프 내부 높이
const PAD   = 13;    // 그래프 내부 여백
const TITLE = 28;    // 타이틀 바 높이

// 축 범위
const A1_MAX  = Math.PI;   // 각도 ±π
const AV_MAX  = 14;        // 각속도 ±14 rad/s (초과 시 클램프)

let gfx   = null;   // 누적 드로우용 오프스크린 버퍼
let curA1  = 0;
let curA1v = 0;

// ── 초기화 ──────────────────────────────────────────────────────────────────
export function initPhaseSpace(p) {
  if (gfx) gfx.remove();
  gfx = p.createGraphics(GW, GH);
  _drawGrid();
}

// 윈도우 리사이즈 또는 리셋 시 호출
export function clearPhaseSpace() {
  if (!gfx) return;
  gfx.clear();
  _drawGrid();
}

// ── 그리드 초기화 ────────────────────────────────────────────────────────────
function _drawGrid() {
  gfx.background(0, 2, 8);

  // 5×4 격자
  gfx.strokeWeight(0.4);
  for (let i = 0; i <= 4; i++) {
    const isCenter = (i === 2);
    gfx.stroke(0, 220, 220, isCenter ? 28 : 10);
    const x = PAD + (i / 4) * (GW - 2 * PAD);
    gfx.line(x, PAD, x, GH - PAD);
  }
  for (let j = 0; j <= 4; j++) {
    const isCenter = (j === 2);
    gfx.stroke(0, 220, 220, isCenter ? 28 : 10);
    const y = PAD + (j / 4) * (GH - 2 * PAD);
    gfx.line(PAD, y, GW - PAD, y);
  }

  // 중심축 강조
  gfx.stroke(0, 255, 255, 40);
  gfx.strokeWeight(0.6);
  const mx = PAD + (GW - 2 * PAD) / 2;
  const my = PAD + (GH - 2 * PAD) / 2;
  gfx.line(mx, PAD, mx, GH - PAD);
  gfx.line(PAD, my, GW - PAD, my);
}

// ── 매 프레임: 새 점 누적 ────────────────────────────────────────────────────
export function updatePhaseSpace(a1, a1v) {
  curA1  = a1;
  curA1v = a1v;
  if (!gfx) return;

  const px = _pmap(a1,   -A1_MAX,  A1_MAX,  PAD, GW - PAD);
  const py = _pmap(a1v,   AV_MAX, -AV_MAX,  PAD, GH - PAD); // y 반전

  // 범위 초과 클램프 (그래프 안에만 표시)
  if (px < PAD - 2 || px > GW - PAD + 2 ||
      py < PAD - 2 || py > GH - PAD + 2) return;

  const speed = Math.min(Math.abs(a1v) / AV_MAX, 1.0);
  const alpha = 45 + speed * 175;

  // 저속 → 시안(#00ffff), 고속 → 흰색/연보라 블렌드
  const r = Math.floor(speed * 160);
  const g = Math.floor(215 + speed * 40);
  const b = 255;

  gfx.noStroke();
  // 외부 글로우
  gfx.fill(r, g, b, alpha * 0.15);
  gfx.circle(px, py, 5.5);
  // 중간 할로
  gfx.fill(r, g, b, alpha * 0.45);
  gfx.circle(px, py, 2.8);
  // 중심 점
  gfx.fill(r, g, b, Math.min(alpha * 1.2, 255));
  gfx.circle(px, py, 1.4);
}

// ── 매 프레임: 메인 캔버스에 HUD 렌더 ───────────────────────────────────────
export function renderPhaseSpace(p) {
  if (!gfx) return;

  const panelW = GW + 2;
  const panelH = GH + TITLE + 2;

  // 우측 하단 고정 (mode-panel 위)
  const ox = p.width  - panelW - 16;
  const oy = p.height - panelH - 130;

  p.push();

  // ── 패널 배경 ──────────────────────────────────────────────────────────
  p.noStroke();
  p.fill(0, 3, 10, 218);
  p.rect(ox, oy, panelW, panelH, 5);

  // ── 누적 그래프 이미지 ─────────────────────────────────────────────────
  p.image(gfx, ox + 1, oy + TITLE);

  // ── 타이틀 구분선 ─────────────────────────────────────────────────────
  p.stroke(0, 200, 200, 30);
  p.strokeWeight(0.6);
  p.line(ox + 6, oy + TITLE - 1, ox + panelW - 6, oy + TITLE - 1);

  // ── 현재 위치 커서 (누적되지 않고 매 프레임 갱신) ──────────────────────
  const cpx = ox + 1 + _pmap(curA1,  -A1_MAX,  A1_MAX,  PAD, GW - PAD);
  const cpy = oy + TITLE + _pmap(curA1v, AV_MAX, -AV_MAX, PAD, GH - PAD);
  const inBounds =
    cpx >= ox + 1 + PAD - 5 && cpx <= ox + 1 + GW - PAD + 5 &&
    cpy >= oy + TITLE + PAD - 5 && cpy <= oy + TITLE + GH - PAD + 5;
  if (inBounds) {
    p.noStroke();
    p.fill(255, 255, 255, 35);  p.circle(cpx, cpy, 9);
    p.fill(0, 255, 255, 200);   p.circle(cpx, cpy, 4);
    p.fill(255, 255, 255, 255); p.circle(cpx, cpy, 1.6);
  }

  // ── 타이틀 텍스트 ─────────────────────────────────────────────────────
  p.noStroke();
  p.textFont('Courier New');
  p.textAlign(p.LEFT, p.TOP);

  p.fill(0, 230, 230, 210);
  p.textSize(8.5);
  p.text('CHAOS ATTRACTOR', ox + 8, oy + 6);

  p.fill(0, 160, 160, 150);
  p.textSize(7);
  p.text('Phase Space  \u03b1\u2081 \u00d7 \u03c9\u2081', ox + 8, oy + 17);

  // ── 축 레이블 ─────────────────────────────────────────────────────────
  p.textSize(6.5);
  p.fill(0, 170, 170, 110);

  // X축 (각도): 좌우 끝
  p.textAlign(p.LEFT,   p.CENTER);
  p.text('\u2212\u03c0', ox + 2,          oy + TITLE + GH / 2);
  p.textAlign(p.RIGHT,  p.CENTER);
  p.text('+\u03c0',     ox + panelW - 2,  oy + TITLE + GH / 2);

  // Y축 (각속도): 상하 끝
  p.textAlign(p.CENTER, p.TOP);
  p.text('+\u03c9', ox + panelW / 2, oy + TITLE + 2);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.text('\u2212\u03c9', ox + panelW / 2, oy + TITLE + GH - 2);

  // ── 외곽 테두리 글로우 ────────────────────────────────────────────────
  p.noFill();
  p.stroke(0, 200, 200, 50);
  p.strokeWeight(1);
  p.rect(ox, oy, panelW, panelH, 5);

  // 극히 미세한 외부 글로우 레이어
  p.stroke(0, 150, 150, 18);
  p.strokeWeight(2.5);
  p.rect(ox - 1, oy - 1, panelW + 2, panelH + 2, 6);

  p.pop();
}

// ── 내부 유틸 ────────────────────────────────────────────────────────────────
function _pmap(v, inMin, inMax, outMin, outMax) {
  return outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin);
}
