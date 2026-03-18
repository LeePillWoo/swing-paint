// ── Telemetry HUD ─────────────────────────────────────────────────────────────
import { currentG, currentDamp, envMode, ENV_G_MAX, ENV_DAMP_MAX } from './physics.js';

const AV_MAX  = 14;

const PANEL_W = 168;
const PANEL_H = 348;   // TURB 지표 추가로 높이 확장
const PAD     = 11;

const DC_X = PANEL_W / 2;
const DC_Y = 84;
const R1   = 44;
const R2   = 30;

const C1 = [30,  140, 255];
const C2 = [ 0,  210, 170];

const ENV_COL = {
  EARTH: [100, 200, 100],
  SPACE: [100, 180, 255],
  WATER: [ 40, 210, 200],
  CHAOS: [215, 100, 255],
};

// ── 히스토리 버퍼 ──────────────────────────────────────────────────────────────
const LISS_MAX   = 180;   // 위상 궤적 보존 프레임
const ENERGY_MAX = 200;   // 에너지 스파크라인 보존 프레임 (확장)
const lissHistory   = [];
const energyHistory = [];
let _scanOffset = 0;

// ── 가시성 토글 ───────────────────────────────────────────────────────────────
let hudVisible = false;
export function setHudVisible(on) { hudVisible = on; }

// ── 공개 API ──────────────────────────────────────────────────────────────────
export function renderHUD(p, a1, a2, a1v, a2v, L1, L2, m1 = 12, m2 = 6, massMode = 'STANDARD') {
  if (!hudVisible) return;

  // 위상 좌표 정규화 ([-π, π] 범위로 래핑 → 회전이 많아도 플롯이 유효)
  const pa1 = ((a1 % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI) - Math.PI;
  const pa2 = ((a2 % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI) - Math.PI;
  lissHistory.push({ a1: pa1, a2: pa2 });
  if (lissHistory.length > LISS_MAX) lissHistory.shift();

  const energy = _energy(a1, a2, a1v, a2v, L1, L2, m1, m2);
  energyHistory.push(energy);
  if (energyHistory.length > ENERGY_MAX) energyHistory.shift();

  _scanOffset = (_scanOffset + 0.008) % 1.0;

  const isMobile = p.width < 600;
  const scale = isMobile
    ? Math.max(0.6, Math.min(p.width / 480, 1.0))
    : Math.max(1.0, Math.min(p.width / 960, 2.0));
  const ox = p.width - PANEL_W * scale - 16;
  const oy = 16;
  const cx = DC_X;
  const cy = DC_Y;
  const EC = ENV_COL[envMode] || [180, 180, 180];

  p.push();
  p.translate(ox, oy);
  p.scale(scale);

  // ── 패널 배경 ──────────────────────────────────────────────────────────────
  p.noStroke();
  p.fill(0, 4, 14, 192);
  p.rect(0, 0, PANEL_W, PANEL_H, 4);

  // ── 스캔라인 (CRT 효과) ────────────────────────────────────────────────────
  const sy = _scanOffset * (PANEL_H + 24) - 12;
  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 7);
  p.rect(2, sy, PANEL_W - 4, 5);
  p.fill(C1[0], C1[1], C1[2], 3);
  p.rect(2, sy - 5, PANEL_W - 4, 4);

  // ── 헤더 ──────────────────────────────────────────────────────────────────
  p.textFont('Courier New');
  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 170);
  p.textSize(7.5); p.textAlign(p.LEFT, p.TOP);
  p.text('TELEMETRY', PAD, 8);

  p.fill(C1[0], C1[1], C1[2], 50);
  p.textSize(6.5); p.textAlign(p.RIGHT, p.TOP);
  p.text('SYS.LIVE', PANEL_W - PAD - 10, 9);

  // 점멸 REC 도트
  if (Math.floor(Date.now() / 900) % 2 === 0) {
    p.noStroke(); p.fill(255, 60, 60, 175);
    p.circle(PANEL_W - PAD - 2, 13, 4);
  }

  // 헤더 구분선
  p.stroke(C1[0], C1[1], C1[2], 26); p.strokeWeight(0.5);
  p.line(PAD, 21, PANEL_W - PAD, 21);

  // ── 다이얼 가이드 원 ───────────────────────────────────────────────────────
  p.noFill();
  p.stroke(C1[0], C1[1], C1[2], 11); p.strokeWeight(1.0);
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
    p.line(cx + Math.cos(ang)*r0, cy + Math.sin(ang)*r0,
           cx + Math.cos(ang)*r1, cy + Math.sin(ang)*r1);
  }

  // ── 위상 플롯 (내부 링 안 — a1 vs a2 어트랙터) ────────────────────────────
  const LR = R2 - 5;  // ≈ 25px 반경

  // 격자 십자선
  p.noFill();
  p.stroke(C2[0], C2[1], C2[2], 14); p.strokeWeight(0.4);
  p.line(cx - LR, cy, cx + LR, cy);
  p.line(cx, cy - LR, cx, cy + LR);

  // 궤적 점 (오래된 것 → 어둡고 작음, 새것 → 밝고 큼)
  p.noStroke();
  const hn = lissHistory.length;
  for (let i = 0; i < hn; i++) {
    const age = i / hn;
    const { a1: la1, a2: la2 } = lissHistory[i];
    const lx    = cx + (la1 / Math.PI) * LR;
    const ly    = cy + (la2 / Math.PI) * LR;
    const alpha = age * age * 210;
    const sz    = 0.8 + age * 1.5;
    const lr    = p.lerp(C2[0], EC[0], age);
    const lg    = p.lerp(C2[1], EC[1], age);
    const lb    = p.lerp(C2[2], EC[2], age);
    p.fill(lr, lg, lb, alpha);
    p.circle(lx, ly, sz);
  }
  // 최신점 하이라이트
  if (hn > 0) {
    const last = lissHistory[hn - 1];
    const lx = cx + (last.a1 / Math.PI) * LR;
    const ly = cy + (last.a2 / Math.PI) * LR;
    p.noStroke();
    p.fill(EC[0], EC[1], EC[2], 120); p.circle(lx, ly, 3.8);
    p.fill(255, 255, 255, 230);       p.circle(lx, ly, 2.0);
  }

  // PHASE 레이블 (내부 링 바로 아래)
  p.noStroke(); p.fill(C2[0], C2[1], C2[2], 38);
  p.textSize(5.5); p.textAlign(p.CENTER, p.TOP);
  p.text('PHASE', cx, cy + R2 + 2);

  // ── 속도 호 ────────────────────────────────────────────────────────────────
  _velArc(p, cx, cy, R1, a1v, C1, 2.0);
  _velArc(p, cx, cy, R2, a2v, C2, 1.6);

  // 중심 핍
  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 65); p.circle(cx, cy, 7);
  p.fill(255, 255, 255, 215);       p.circle(cx, cy, 2.8);

  // 다이얼 범례
  p.textFont('Courier New'); p.noStroke(); p.textSize(7);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.fill(C1[0], C1[1], C1[2], 100); p.text('\u03c91', cx, cy - R1 - 6);
  p.fill(C2[0], C2[1], C2[2], 100); p.text('\u03c92', cx, cy + R1 + 16);

  // ── 데이터 구분선 ──────────────────────────────────────────────────────────
  const dataY = DC_Y + R1 + 22;   // = 150
  p.stroke(C1[0], C1[1], C1[2], 22); p.strokeWeight(0.5);
  p.line(PAD, dataY, PANEL_W - PAD, dataY);

  // ── ω1 / ω2 각속도 수치 ────────────────────────────────────────────────────
  const LH   = 14;
  const rows = [
    ['\u03c91', a1v, 'r/s', C1],
    ['\u03c92', a2v, 'r/s', C2],
  ];
  p.textFont('Courier New');
  rows.forEach(([label, val, unit, col], i) => {
    const ry  = dataY + 7 + i * LH;
    const str = (val >= 0 ? '+' : '') + val.toFixed(3);
    p.noStroke();
    p.fill(col[0], col[1], col[2], 105);
    p.textSize(7.5); p.textAlign(p.LEFT, p.TOP);
    p.text(label, PAD, ry);
    p.fill(col[0], col[1], col[2], val < 0 ? 175 : 230);
    p.textSize(8); p.textAlign(p.RIGHT, p.TOP);
    p.text(str, PANEL_W - PAD - 19, ry);
    p.fill(col[0], col[1], col[2], 55);
    p.textSize(6.5); p.textAlign(p.RIGHT, p.TOP);
    p.text(unit, PANEL_W - PAD, ry + 1);
  });

  // ── 에너지 스파크라인 ──────────────────────────────────────────────────────
  // sparkY = 150 + 7 + 2*14 = 185
  const sparkY  = dataY + 7 + rows.length * LH;
  const EC_e    = [165, 178, 222];
  const spW     = PANEL_W - PAD * 2;
  const spH     = 9;
  const spBotY  = sparkY + spH + 10;   // = 204

  p.noStroke();
  p.fill(EC_e[0], EC_e[1], EC_e[2], 90);
  p.textSize(7.5); p.textAlign(p.LEFT, p.TOP);
  p.text('E\u209c', PAD, sparkY);

  p.fill(EC_e[0], EC_e[1], EC_e[2], 190);
  p.textSize(7); p.textAlign(p.RIGHT, p.TOP);
  p.text(energy.toFixed(2), PANEL_W - PAD - 16, sparkY);
  p.fill(EC_e[0], EC_e[1], EC_e[2], 55);
  p.textSize(6.5); p.textAlign(p.RIGHT, p.TOP);
  p.text('kU', PANEL_W - PAD, sparkY + 1);

  if (energyHistory.length > 1) {
    const eMin = Math.min(...energyHistory);
    const eMax = Math.max(...energyHistory);
    const eRng = Math.max(Math.abs(eMax - eMin), 0.001);
    const bw   = spW / ENERGY_MAX;
    p.noStroke();
    p.fill(EC_e[0], EC_e[1], EC_e[2], 12);
    p.rect(PAD, spBotY - spH, spW, spH, 1);
    energyHistory.forEach((e, i) => {
      const h   = ((e - eMin) / eRng) * spH;
      const age = i / energyHistory.length;
      p.fill(EC_e[0], EC_e[1], EC_e[2], 35 + age * 155);
      p.rect(PAD + i * bw, spBotY - h, bw - 0.4, h);
    });
  }

  // ── 질량 바 섹션 ───────────────────────────────────────────────────────────
  // massY = sparkY + 22 = 207
  const massY = sparkY + 22;

  p.stroke(C1[0], C1[1], C1[2], 22); p.strokeWeight(0.5);
  p.line(PAD, massY, PANEL_W - PAD, massY);

  const MASS_MAX = massMode === 'IRON' ? 26 : massMode === 'FEATHER' ? 4 : 14;
  p.noStroke();
  p.fill(180, 190, 210, 90);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('MASS', PAD, massY + 5);
  p.fill(180, 190, 210, 55);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(massMode, PANEL_W - PAD, massY + 5);

  const barW  = PANEL_W - PAD * 2;
  const barH  = 5;
  const barX  = PAD;
  const bar1Y = massY + 17;
  const bar2Y = bar1Y + 14;

  p.noStroke();
  p.fill(C1[0], C1[1], C1[2], 18);  p.rect(barX, bar1Y, barW, barH, 2);
  p.fill(C1[0], C1[1], C1[2], 140); p.rect(barX, bar1Y, barW * Math.min(m1/MASS_MAX, 1), barH, 2);
  p.fill(C1[0], C1[1], C1[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('M1', barX, bar1Y - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(m1.toFixed(0), barX + barW, bar1Y - 8);

  p.fill(C2[0], C2[1], C2[2], 18);  p.rect(barX, bar2Y, barW, barH, 2);
  p.fill(C2[0], C2[1], C2[2], 140); p.rect(barX, bar2Y, barW * Math.min(m2/MASS_MAX, 1), barH, 2);
  p.fill(C2[0], C2[1], C2[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('M2', barX, bar2Y - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(m2.toFixed(0), barX + barW, bar2Y - 8);

  // ── 환경·중력 섹션 ─────────────────────────────────────────────────────────
  // envY = bar2Y + barH + 14 = 238 + 5 + 14 = 257
  const envY = bar2Y + barH + 14;

  p.stroke(200, 180, 100, 22); p.strokeWeight(0.5);
  p.line(PAD, envY, PANEL_W - PAD, envY);

  p.noStroke();
  p.fill(180, 175, 120, 90);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('ENV', PAD, envY + 5);
  p.fill(EC[0], EC[1], EC[2], 200);
  p.textSize(7.5); p.textAlign(p.RIGHT, p.TOP);
  p.text(envMode, PANEL_W - PAD, envY + 4);

  const eBarW = PANEL_W - PAD * 2;
  const eBarX = PAD;
  const gBarY = envY + 18;
  const dBarY = gBarY + 15;
  const wBarY = dBarY + 15;

  const gFill = currentG / ENV_G_MAX;
  p.noStroke();
  p.fill(EC[0], EC[1], EC[2], 16);  p.rect(eBarX, gBarY, eBarW, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 150); p.rect(eBarX, gBarY, eBarW * gFill, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('G', eBarX, gBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(currentG.toFixed(1), eBarX + eBarW, gBarY - 8);

  const dFill = currentDamp / ENV_DAMP_MAX;
  p.fill(EC[0], EC[1], EC[2], 16);  p.rect(eBarX, dBarY, eBarW, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 110); p.rect(eBarX, dBarY, eBarW * dFill, barH, 2);
  p.fill(EC[0], EC[1], EC[2], 70);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('DAMP', eBarX, dBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text(currentDamp.toFixed(3), eBarX + eBarW, dBarY - 8);

  const chaos = Math.min((Math.abs(a1v) + Math.abs(a2v)) / (AV_MAX * 2), 1.0);
  const chR   = 40  + (255 -  40) * chaos;
  const chG   = 210 + ( 60 - 210) * chaos;
  const chB   = 170 + (  0 - 170) * chaos;
  p.fill(chR, chG, chB, 16);  p.rect(eBarX, wBarY, eBarW, barH, 2);
  p.fill(chR, chG, chB, 160); p.rect(eBarX, wBarY, eBarW * chaos, barH, 2);
  p.fill(chR, chG, chB, 85);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('CHAOS', eBarX, wBarY - 8);
  p.textAlign(p.RIGHT, p.TOP);
  p.text((chaos * 100).toFixed(0) + '%', eBarX + eBarW, wBarY - 8);

  // ── 난기류(TURB) — 에너지 변동계수 기반 카오스 측정 ───────────────────────
  // wBarY + barH + 15 = 305 + 5 + 10 = 320
  const turbY = wBarY + barH + 10;
  const turb  = _turbulence(energyHistory);
  const tR    = p.lerp( 50, 255, turb);
  const tG    = p.lerp(220, 80,  turb);
  const tB    = p.lerp(255, 50,  turb);
  p.stroke(tR, tG, tB, 20); p.strokeWeight(0.5);
  p.line(PAD, turbY, PANEL_W - PAD, turbY);

  p.noStroke();
  p.fill(tR, tG, tB, 80);
  p.textSize(6.5); p.textAlign(p.LEFT, p.TOP);
  p.text('TURB', eBarX, turbY + 5);
  p.fill(tR, tG, tB, 190);
  p.textSize(7); p.textAlign(p.RIGHT, p.TOP);
  p.text((turb * 100).toFixed(0) + '%', eBarX + eBarW, turbY + 4);

  const turbBarY = turbY + 18;
  p.fill(tR, tG, tB, 14);  p.rect(eBarX, turbBarY, eBarW, barH, 2);
  p.fill(tR, tG, tB, 160); p.rect(eBarX, turbBarY, eBarW * turb, barH, 2);

  // ── 코너 브래킷 테두리 ─────────────────────────────────────────────────────
  const BL = 13;
  p.noFill();
  // 글로우 레이어
  p.stroke(C1[0], C1[1], C1[2], 16); p.strokeWeight(3.5);
  _drawBrackets(p, PANEL_W, PANEL_H, BL);
  // 선명 레이어
  p.stroke(C1[0], C1[1], C1[2], 70); p.strokeWeight(0.9);
  _drawBrackets(p, PANEL_W, PANEL_H, BL);

  p.pop();
}

// ── 코너 브래킷 헬퍼 ──────────────────────────────────────────────────────────
function _drawBrackets(p, w, h, len) {
  p.line(0, len, 0, 0);       p.line(0, 0, len, 0);         // 좌상
  p.line(w-len, 0, w, 0);     p.line(w, 0, w, len);         // 우상
  p.line(0, h-len, 0, h);     p.line(0, h, len, h);         // 좌하
  p.line(w-len, h, w, h);     p.line(w, h, w, h-len);       // 우하
}

// ── 각속도 → 래디얼 호 ───────────────────────────────────────────────────────
function _velArc(p, cx, cy, r, vel, col, sw) {
  const norm  = Math.min(Math.abs(vel) / AV_MAX, 1.0);
  const sweep = norm * Math.PI * 1.5;
  if (sweep < 0.015) return;

  const base = -Math.PI / 2;
  const cw   = vel >= 0;
  const sa   = cw ? base         : base - sweep;
  const ea   = cw ? base + sweep : base;

  const alpha    = 55 + norm * 165;
  const [r0, g0, b0] = col;

  p.noFill();
  p.stroke(r0, g0, b0, alpha * 0.20); p.strokeWeight(sw + 4.5);
  p.arc(cx, cy, r * 2, r * 2, sa, ea, p.OPEN);
  p.stroke(r0, g0, b0, alpha);        p.strokeWeight(sw);
  p.arc(cx, cy, r * 2, r * 2, sa, ea, p.OPEN);

  const tipAng = cw ? ea : sa;
  p.noStroke();
  p.fill(r0, g0, b0, Math.min(alpha * 1.15, 255));
  p.circle(cx + Math.cos(tipAng)*r, cy + Math.sin(tipAng)*r, sw * 2.5);
}

// ── 난기류 지수: 에너지 변동계수 (σ/|μ|) → 0~1 정규화 ───────────────────────
function _turbulence(hist) {
  if (hist.length < 8) return 0;
  const n    = hist.length;
  const mean = hist.reduce((s, v) => s + v, 0) / n;
  if (Math.abs(mean) < 0.001) return 0;
  const variance = hist.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return Math.min(Math.sqrt(variance) / Math.abs(mean), 1.0);
}

// ── 전체 역학적 에너지 (kU 단위) ─────────────────────────────────────────────
function _energy(a1, a2, a1v, a2v, L1, L2, m1, m2) {
  const ke = 0.5 * m1 * L1 * L1 * a1v * a1v
           + 0.5 * m2 * (
               L1*L1*a1v*a1v + L2*L2*a2v*a2v
             + 2*L1*L2*a1v*a2v*Math.cos(a1-a2)
           );
  const pe = -(m1 + m2) * currentG * L1 * Math.cos(a1)
             - m2 * currentG * L2 * Math.cos(a2);
  return (ke + pe) / 1e6;
}
