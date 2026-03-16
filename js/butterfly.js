// ── 나비 효과 시뮬레이터 (Shadow Pendulums) ─────────────────────────────────
// 메인 진자와 극히 미세한 초기값 차이를 가진 그림자 진자 3개를 독립 적분.
// 처음엔 겹쳐 움직이다 카오스 발산으로 화려하게 갈라진다.

import { G, M1, M2, SUBSTEPS } from './constants.js';

// 색상: 시안, 마젠타, 옐로우
const COLORS = [
  [  0, 255, 255],  // Cyan
  [255,   0, 255],  // Magenta
  [255, 215,   0],  // Yellow
];

// 미세 초기 오차 (라디안 단위 — 약 0.001 rad ≈ 0.057°)
// 세 그림자가 서로 다른 방식으로 발산하도록 서로 다른 축에 오차 부여
const PERTURB = [
  { da1: +0.001,  da2:  0       },  // a1 에만 +편차
  { da1: -0.001,  da2:  0       },  // a1 에만 −편차 (1번과 반대)
  { da1:  0,      da2: +0.001   },  // a2 에만 편차 (다른 발산 패턴)
];

const TRAIL_MAX  = 480;
const TRAIL_FADE = 0.0026;

let shadows  = [];
let active   = false;

// ── 외부 API ─────────────────────────────────────────────────────────────────
export function isButterflyActive() { return active; }

export function enableButterfly(a1, a2, a1v, a2v, L1, L2) {
  active  = true;
  shadows = COLORS.map(([r, g, b], i) => ({
    a1:  a1  + PERTURB[i].da1,
    a2:  a2  + PERTURB[i].da2,
    a1v, a2v,
    L1, L2,
    trail: [],
    r, g, b,
    gAlpha: 0.0,   // 페이드인용 전역 알파 (0→1)
  }));
}

export function disableButterfly() {
  active = false;
  // trail 은 자연 소멸 (renderButterfly 에서 TRAIL_FADE 로 처리)
}

// 창 리사이즈 시 즉시 전부 제거
export function clearButterfly() {
  shadows = [];
  active  = false;
}

// ── 매 프레임 물리 업데이트 ──────────────────────────────────────────────────
export function updateButterfly(dt, cx, cy) {
  if (shadows.length === 0) return;

  for (const s of shadows) {
    if (active) {
      // 메인 진자와 동일한 SUBSTEPS 로 RK4 적분
      for (let i = 0; i < SUBSTEPS; i++) _stepRK4(s, dt);

      // 페이드인 진행 (~40 프레임)
      s.gAlpha = Math.min(1.0, s.gAlpha + 0.025);

      // bob2 위치 계산 후 trail 추가
      const x2 = _getX2(s, cx, cy);
      const y2 = _getY2(s, cx, cy);
      s.trail.push({ x: x2, y: y2, alpha: 0.78 });
      if (s.trail.length > TRAIL_MAX) s.trail.splice(0, s.trail.length - TRAIL_MAX);
    }
  }

  // 비활성 상태 + 모든 trail 소멸 → 배열 정리
  if (!active) {
    const allEmpty = shadows.every(s => s.trail.length === 0);
    if (allEmpty) shadows = [];
  }
}

// ── 매 프레임 렌더링 ─────────────────────────────────────────────────────────
export function renderButterfly(p, cx, cy) {
  if (shadows.length === 0) return;
  p.noStroke();

  for (const s of shadows) {
    const { r, g, b, gAlpha } = s;
    const ga = active ? gAlpha : 1.0; // 비활성 시 남은 trail 은 원래 밝기로 소멸

    // ── trail 렌더 ────────────────────────────────────────────────────────
    for (let i = s.trail.length - 1; i >= 0; i--) {
      const pt = s.trail[i];
      pt.alpha -= TRAIL_FADE;
      if (pt.alpha <= 0) { s.trail.splice(i, 1); continue; }

      const a = pt.alpha * ga;
      p.fill(r, g, b, a *  22); p.circle(pt.x, pt.y, 16);
      p.fill(r, g, b, a *  65); p.circle(pt.x, pt.y,  6.5);
      p.fill(r, g, b, a * 190); p.circle(pt.x, pt.y,  2);
    }

    // ── 현재 bob2 렌더 (활성 중만) ───────────────────────────────────────
    if (active && gAlpha > 0) {
      const x2 = _getX2(s, cx, cy);
      const y2 = _getY2(s, cx, cy);
      p.fill(r, g, b,  38 * gAlpha); p.circle(x2, y2, 30);
      p.fill(r, g, b, 115 * gAlpha); p.circle(x2, y2, 13);
      p.fill(255, 255, 255, 195 * gAlpha); p.circle(x2, y2, 4);
    }
  }
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────
function _getX2(s, cx, cy) {
  return cx + s.L1 * Math.sin(s.a1) + s.L2 * Math.sin(s.a2);
}
function _getY2(s, cx, cy) {
  return cy + s.L1 * Math.cos(s.a1) + s.L2 * Math.cos(s.a2);
}

function _stepRK4(s, dt) {
  const [k1a, k1b, k1c, k1d] = _deriv(s.a1, s.a1v, s.a2, s.a2v, s.L1, s.L2);
  const [k2a, k2b, k2c, k2d] = _deriv(
    s.a1+k1a*dt/2, s.a1v+k1b*dt/2, s.a2+k1c*dt/2, s.a2v+k1d*dt/2, s.L1, s.L2);
  const [k3a, k3b, k3c, k3d] = _deriv(
    s.a1+k2a*dt/2, s.a1v+k2b*dt/2, s.a2+k2c*dt/2, s.a2v+k2d*dt/2, s.L1, s.L2);
  const [k4a, k4b, k4c, k4d] = _deriv(
    s.a1+k3a*dt, s.a1v+k3b*dt, s.a2+k3c*dt, s.a2v+k3d*dt, s.L1, s.L2);

  s.a1  += (k1a+2*k2a+2*k3a+k4a)*dt/6;
  s.a1v += (k1b+2*k2b+2*k3b+k4b)*dt/6;
  s.a2  += (k1c+2*k2c+2*k3c+k4c)*dt/6;
  s.a2v += (k1d+2*k2d+2*k3d+k4d)*dt/6;
}

function _deriv(s1, s1v, s2, s2v, L1, L2) {
  const sd  = Math.sin(s1 - s2);
  const cd  = Math.cos(s1 - s2);
  const den = 2*M1 + M2 - M2 * Math.cos(2*(s1-s2));
  const a1a = (
    -G*(2*M1+M2)*Math.sin(s1)
    - M2*G*Math.sin(s1-2*s2)
    - 2*sd*M2*(s2v*s2v*L2 + s1v*s1v*L1*cd)
  ) / (L1*den);
  const a2a = (
    2*sd*(s1v*s1v*L1*(M1+M2) + G*(M1+M2)*Math.cos(s1) + s2v*s2v*L2*M2*cd)
  ) / (L2*den);
  return [s1v, a1a, s2v, a2a];
}
