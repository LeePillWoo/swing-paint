// ── Telemetry HUD ─────────────────────────────────────────────────────────────
// 우측 상단 고정. 래디얼 다이얼(ω1/ω2) + 실시간 물리 수치 텍스트.
import { M1, M2, G } from './constants.js';

const AV_MAX  = 14;        // rad/s 정규화 상한

// 패널 치수
const PANEL_W = 168;
const PANEL_H = 220;
const PAD     = 11;

// 다이얼 중심 (패널 내 상대 좌표)
const DC_X    = PANEL_W / 2;
const DC_Y    = 84;        // 타이틀(22px) + 여백 + R1(44px)

// 호 반지름
const R1 = 44;   // 외호 — ω1
const R2 = 30;   // 내호 — ω2

// 색상
const C1 = [30,  140, 255];   // electric blue  (ω1)
const C2 = [ 0,  210, 170];   // cyber mint     (ω2)

// ── 가시성 토글 ───────────────────────────────────────────────────────────────
let hudVisible = false;
export function setHudVisible(on) { hudVisible = on; }

// ── 공개 API ──────────────────────────────────────────────────────────────────
export function renderHUD(p, a1, a2, a1v, a2v, L1, L2) {
  if (!hudVisible) return;
  const ox = p.width  - PANEL_W - 16;
  const oy = 16;
  const cx = ox + DC_X;
  const cy = oy + DC_Y;

  p.push();

  // ── 패널 배경 ──────────────────────────────────────────────────────────────
  p.noStroke();
  p.fill(0, 4, 14, 192);
  p.rect(ox, oy, PANEL_W, PANEL_H, 5);

  // ── 헤더 ──────────────────────────────────────────────────────────────────
  p.textFont('Courier New');
  p.noStroke();

  p.fill(C1[0], C1[1], C1[2], 170);
  p.textSize(7.5);
  p.textAlign(p.LEFT, p.TOP);
  p.text('TELEMETRY', ox + PAD, oy + 8);

  p.fill(C1[0], C1[1], C1[2], 50);
  p.textSize(6.5);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('SYS.LIVE', ox + PANEL_W - PAD, oy + 9);

  // 헤더 구분선
  p.stroke(C1[0], C1[1], C1[2], 26);
  p.strokeWeight(0.5);
  p.line(ox + PAD, oy + 21, ox + PANEL_W - PAD, oy + 21);

  // ── 다이얼 가이드 원 ───────────────────────────────────────────────────────
  p.noFill();
  p.stroke(C1[0], C1[1], C1[2], 11);
  p.strokeWeight(1.0);
  p.circle(cx, cy, R1 * 2);
  p.stroke(C2[0], C2[1], C2[2], 9);
  p.circle(cx, cy, R2 * 2);

  // 외호 눈금 (12개, 3개마다 major)
  for (let i = 0; i < 12; i++) {
    const ang   = (i / 12) * p.TWO_PI - p.HALF_PI;
    const major = (i % 3 === 0);
    const r0    = R1 + 4;
    const r1    = R1 + (major ? 9 : 6);
    p.stroke(C1[0], C1[1], C1[2], major ? 40 : 18);
    p.strokeWeight(major ? 0.9 : 0.5);
    p.line(
      cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0,
      cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1
    );
  }

  // ── 속도 호 ────────────────────────────────────────────────────────────────
  _velArc(p, cx, cy, R1, a1v, C1, 2.0);
  _velArc(p, cx, cy, R2, a2v, C2, 1.6);

  // 중심 핍
  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 65);
  p.circle(cx, cy, 7);
  p.fill(255, 255, 255, 215);
  p.circle(cx, cy, 2.8);

  // ── 다이얼 범례 레이블 ─────────────────────────────────────────────────────
  p.textFont('Courier New');
  p.noStroke();
  p.textSize(7);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.fill(C1[0], C1[1], C1[2], 100);
  p.text('\u03c91', cx, cy - R1 - 6);   // ω1 위쪽
  p.fill(C2[0], C2[1], C2[2], 100);
  p.text('\u03c92', cx, cy + R1 + 16);  // ω2 아래쪽

  // ── 데이터 구분선 ──────────────────────────────────────────────────────────
  const dataY = oy + DC_Y + R1 + 22;
  p.stroke(C1[0], C1[1], C1[2], 22);
  p.strokeWeight(0.5);
  p.line(ox + PAD, dataY, ox + PANEL_W - PAD, dataY);

  // ── 텔레메트리 수치 ────────────────────────────────────────────────────────
  const LH = 14;
  const energy = _energy(a1, a2, a1v, a2v, L1, L2);
  const rows = [
    ['\u03b81', a1,     'rad', C1],            // θ1
    ['\u03b82', a2,     'rad', C2],            // θ2
    ['\u03c91', a1v,    'r/s', C1],            // ω1
    ['\u03c92', a2v,    'r/s', C2],            // ω2
    ['E\u209c',  energy, ' kU', [165, 178, 222]], // E_t
  ];

  p.textFont('Courier New');
  rows.forEach(([label, val, unit, col], i) => {
    const ry  = dataY + 7 + i * LH;
    const str = (val >= 0 ? '+' : '') + val.toFixed(3);

    // 레이블
    p.noStroke();
    p.fill(col[0], col[1], col[2], 105);
    p.textSize(7.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(label, ox + PAD, ry);

    // 수치 (음수는 약간 어둡게)
    p.fill(col[0], col[1], col[2], val < 0 ? 175 : 230);
    p.textSize(8);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(str, ox + PANEL_W - PAD - 19, ry);

    // 단위
    p.fill(col[0], col[1], col[2], 55);
    p.textSize(6.5);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(unit, ox + PANEL_W - PAD, ry + 1);
  });

  // ── 외곽 테두리 글로우 ─────────────────────────────────────────────────────
  p.noFill();
  p.stroke(C1[0], C1[1], C1[2], 36);
  p.strokeWeight(0.8);
  p.rect(ox, oy, PANEL_W, PANEL_H, 5);

  p.stroke(C1[0], C1[1], C1[2], 11);
  p.strokeWeight(2.5);
  p.rect(ox - 1, oy - 1, PANEL_W + 2, PANEL_H + 2, 6);

  p.pop();
}

// ── 각속도 → 래디얼 호 ───────────────────────────────────────────────────────
function _velArc(p, cx, cy, r, vel, col, sw) {
  const norm  = Math.min(Math.abs(vel) / AV_MAX, 1.0);
  const sweep = norm * Math.PI * 1.5;   // 최대 270°
  if (sweep < 0.015) return;

  // 항상 12시(−π/2)에서 출발, 부호에 따라 CW/CCW
  const base = -Math.PI / 2;
  const cw   = vel >= 0;
  const sa   = cw ? base         : base - sweep;
  const ea   = cw ? base + sweep : base;

  const alpha   = 55 + norm * 165;
  const [r0, g0, b0] = col;

  p.noFill();

  // 글로우 레이어
  p.stroke(r0, g0, b0, alpha * 0.20);
  p.strokeWeight(sw + 4.5);
  p.arc(cx, cy, r * 2, r * 2, sa, ea, p.OPEN);

  // 메인 호
  p.stroke(r0, g0, b0, alpha);
  p.strokeWeight(sw);
  p.arc(cx, cy, r * 2, r * 2, sa, ea, p.OPEN);

  // 끝단 핍 (속도 방향의 "현재 위치" 표시)
  const tipAng = cw ? ea : sa;
  p.noStroke();
  p.fill(r0, g0, b0, Math.min(alpha * 1.15, 255));
  p.circle(
    cx + Math.cos(tipAng) * r,
    cy + Math.sin(tipAng) * r,
    sw * 2.5
  );
}

// ── 전체 역학적 에너지 (스케일 1/1e6 → kU 단위) ──────────────────────────────
function _energy(a1, a2, a1v, a2v, L1, L2) {
  const ke = 0.5 * M1 * L1 * L1 * a1v * a1v
           + 0.5 * M2 * (
               L1 * L1 * a1v * a1v
             + L2 * L2 * a2v * a2v
             + 2 * L1 * L2 * a1v * a2v * Math.cos(a1 - a2)
           );
  const pe = -(M1 + M2) * G * L1 * Math.cos(a1)
             - M2 * G * L2 * Math.cos(a2);
  return (ke + pe) / 1e6;
}
