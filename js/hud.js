// ── Telemetry HUD ─────────────────────────────────────────────────────────────
// 우측 상단 고정. 래디얼 다이얼(ω1/ω2) + 실시간 물리 수치 텍스트.
import { G } from './constants.js';
import { currentG, currentDamp, envMode, ENV_G_MAX, ENV_DAMP_MAX } from './physics.js';

const AV_MAX  = 14;        // rad/s 정규화 상한

// 패널 치수
const PANEL_W = 168;
const PANEL_H = 345;
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
export function renderHUD(p, a1, a2, a1v, a2v, L1, L2, m1 = 12, m2 = 6, massMode = 'STANDARD') {
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
  const energy = _energy(a1, a2, a1v, a2v, L1, L2, m1, m2);
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

  // ── 질량 바 섹션 ───────────────────────────────────────────────────────────
  const massY = dataY + 7 + rows.length * LH + 6;

  // 구분선
  p.stroke(C1[0], C1[1], C1[2], 22);
  p.strokeWeight(0.5);
  p.line(ox + PAD, massY, ox + PANEL_W - PAD, massY);

  // 섹션 레이블
  const MASS_MAX = massMode === 'IRON' ? 26 : massMode === 'FEATHER' ? 4 : 14;
  p.noStroke();
  p.fill(180, 190, 210, 90);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('MASS', ox + PAD, massY + 5);
  p.fill(180, 190, 210, 55);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(massMode, ox + PANEL_W - PAD, massY + 5);

  const barW   = PANEL_W - PAD * 2;
  const barH   = 5;
  const barX   = ox + PAD;
  const bar1Y  = massY + 17;
  const bar2Y  = bar1Y + 14;
  const r1Fill = Math.min(m1 / MASS_MAX, 1.0);
  const r2Fill = Math.min(m2 / MASS_MAX, 1.0);

  // M1 바 (전체 팔 — 파란계열)
  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 18); p.rect(barX, bar1Y, barW, barH, 2);
  p.fill(C1[0], C1[1], C1[2], 140); p.rect(barX, bar1Y, barW * r1Fill, barH, 2);
  p.fill(C1[0], C1[1], C1[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('M1', barX, bar1Y - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(m1.toFixed(0), barX + barW, bar1Y - 8);

  // M2 바 (하부 추 — 민트계열)
  p.fill(C2[0], C2[1], C2[2], 18); p.rect(barX, bar2Y, barW, barH, 2);
  p.fill(C2[0], C2[1], C2[2], 140); p.rect(barX, bar2Y, barW * r2Fill, barH, 2);
  p.fill(C2[0], C2[1], C2[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('M2', barX, bar2Y - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(m2.toFixed(0), barX + barW, bar2Y - 8);

  // ── 환경·중력 섹션 ─────────────────────────────────────────────────────────
  const envY = bar2Y + barH + 14;

  // 구분선
  p.stroke(200, 180, 100, 22);
  p.strokeWeight(0.5);
  p.line(ox + PAD, envY, ox + PANEL_W - PAD, envY);

  // ENV 헤더 — 모드 이름 (EARTH / SPACE / WATER)
  const envColMap = {
    EARTH: [100, 200, 100],
    SPACE: [100, 180, 255],
    WATER: [ 40, 210, 200],
  };
  const EC = envColMap[envMode] || [180, 180, 180];

  p.noStroke();
  p.fill(180, 175, 120, 90);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('ENV', ox + PAD, envY + 5);
  p.fill(EC[0], EC[1], EC[2], 200);
  p.textSize(7.5);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(envMode, ox + PANEL_W - PAD, envY + 4);

  const eBarW  = PANEL_W - PAD * 2;
  const eBarX  = ox + PAD;
  const gBarY  = envY + 18;
  const dBarY  = gBarY + 15;
  const wBarY  = dBarY + 15;

  // G 바 — 현재 중력 (0 ~ ENV_G_MAX=350)
  const gFill  = currentG / ENV_G_MAX;
  p.noStroke();
  p.fill(EC[0], EC[1], EC[2], 16); p.rect(eBarX, gBarY, eBarW, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 150); p.rect(eBarX, gBarY, eBarW * gFill, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('G', eBarX, gBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(currentG.toFixed(1), eBarX + eBarW, gBarY - 8);

  // DAMP 바 — 현재 점성감쇠 (0 ~ ENV_DAMP_MAX=0.85)
  const dFill  = currentDamp / ENV_DAMP_MAX;
  p.fill(EC[0], EC[1], EC[2], 16); p.rect(eBarX, dBarY, eBarW, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 110); p.rect(eBarX, dBarY, eBarW * dFill, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 70);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('DAMP', eBarX, dBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(currentDamp.toFixed(3), eBarX + eBarW, dBarY - 8);

  // ω CHAOS 바 — 두 각속도 합산 크기 (시스템 전체 운동 에너지 간접 지표)
  const chaos  = Math.min((Math.abs(a1v) + Math.abs(a2v)) / (AV_MAX * 2), 1.0);
  const chR    = 40  + (255 -  40) * chaos;
  const chG    = 210 + ( 60 - 210) * chaos;
  const chB    = 170 + (  0 - 170) * chaos;
  p.fill(chR, chG, chB, 16); p.rect(eBarX, wBarY, eBarW, barH, 2);
  p.fill(chR, chG, chB, 160); p.rect(eBarX, wBarY, eBarW * chaos, barH, 2);
  p.fill(chR, chG, chB, 85);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('CHAOS', eBarX, wBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text((chaos * 100).toFixed(0) + '%', eBarX + eBarW, wBarY - 8);

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
function _energy(a1, a2, a1v, a2v, L1, L2, m1, m2) {
  const ke = 0.5 * m1 * L1 * L1 * a1v * a1v
           + 0.5 * m2 * (
               L1 * L1 * a1v * a1v
             + L2 * L2 * a2v * a2v
             + 2 * L1 * L2 * a1v * a2v * Math.cos(a1 - a2)
           );
  const pe = -(m1 + m2) * G * L1 * Math.cos(a1)
             - m2 * G * L2 * Math.cos(a2);
  return (ke + pe) / 1e6;
}
