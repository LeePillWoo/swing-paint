import { G, M1, M2 } from './constants.js';

export let cx, cy, L1, L2;
export let a1, a2, a1v, a2v;

// ── 환경 시스템 ────────────────────────────────────────────────────────────
const ENV = {
  EARTH: { g: 350, damp: 0.02  },  // 공기 저항, 자연스럽게 서서히 감속
  SPACE: { g:   8, damp: 0.0   },  // 무중력, 마찰 없음 — 영원히 회전
  WATER: { g: 120, damp: 0.85  },  // 부력+점성 — 묵직하게 감속
};

export let envMode  = 'EARTH';
let currentG    = ENV.EARTH.g;
let currentDamp = ENV.EARTH.damp;

export function cycleEnv() {
  const modes = ['EARTH', 'SPACE', 'WATER'];
  envMode = modes[(modes.indexOf(envMode) + 1) % 3];
  return envMode;
}

// 매 프레임 1회 호출 — 현재값 → 목표값으로 부드럽게 러프
export function updatePhysicsEnv() {
  const tgt = ENV[envMode];
  currentG    += (tgt.g    - currentG)    * 0.04;
  currentDamp += (tgt.damp - currentDamp) * 0.04;
}

// ── 질량 시스템 ────────────────────────────────────────────────────────────
// m1: 상부 팔(안정 축)  m2: 하부 팔(카오스 소스)
// 질량비 m2/m1 이 클수록 하부가 더 크게 흔들리며 혼돈 증가
const MASS = {
  IRON:     { m1: 26, m2: 22  },  // 둘다 무거움 — 느리고 위엄있는 진동
  STANDARD: { m1: 12, m2:  6  },  // 기본 균형 (m2/m1=0.5)
  FEATHER:  { m1:  3, m2:  1  },  // 둘다 가벼움 — 빠르고 혼돈적
};

export let massMode  = 'STANDARD';
export let currentM1 = MASS.STANDARD.m1;
export let currentM2 = MASS.STANDARD.m2;

export function cycleMass() {
  const modes = ['STANDARD', 'IRON', 'FEATHER'];
  massMode = modes[(modes.indexOf(massMode) + 1) % 3];
  currentM1 = MASS[massMode].m1;
  currentM2 = MASS[massMode].m2;
  return massMode;
}

export function resetPendulum(p) {
  cx = p.width  / 2;
  cy = p.height / 2 - p.height * 0.05;
  const arm = Math.min(p.width, p.height) * 0.22;
  L1 = arm; L2 = arm * 0.88;

  a1  = p.random(p.PI * 0.5, p.PI * 0.9);
  a2  = p.random(p.PI * 0.4, p.PI * 1.1);
  a1v = p.random(-0.8, 0.8);
  a2v = p.random(-0.8, 0.8);
}

// 드래그 모드: a1·a1v 를 외부에서 강제 지정 (커서 각도 추적용)
export function overrideA1(angle, vel) {
  a1  = angle;
  a1v = vel;
}

// cx, cy 도 포함해 반환 (렌더링에서 사용)
export function getPos() {
  const x1 = cx + L1 * Math.sin(a1);
  const y1 = cy + L1 * Math.cos(a1);
  const x2 = x1 + L2 * Math.sin(a2);
  const y2 = y1 + L2 * Math.cos(a2);
  return { cx, cy, x1, y1, x2, y2 };
}

// 라그랑지안 4차 룽게-쿠타 (내부 전용) — currentG, currentM1/M2 사용
function derivatives(s1, s1v, s2, s2v) {
  const m1 = currentM1, m2 = currentM2;
  const sd  = Math.sin(s1 - s2);
  const cd  = Math.cos(s1 - s2);
  const den = 2*m1 + m2 - m2 * Math.cos(2*(s1-s2));
  const a1a = (
    -currentG*(2*m1+m2)*Math.sin(s1)
    - m2*currentG*Math.sin(s1-2*s2)
    - 2*sd*m2*(s2v*s2v*L2 + s1v*s1v*L1*cd)
  ) / (L1*den);
  const a2a = (
    2*sd*(s1v*s1v*L1*(m1+m2) + currentG*(m1+m2)*Math.cos(s1) + s2v*s2v*L2*m2*cd)
  ) / (L2*den);
  return [s1v, a1a, s2v, a2a];
}

export function stepRK4(dt) {
  const [k1a, k1b, k1c, k1d] = derivatives(a1, a1v, a2, a2v);
  const [k2a, k2b, k2c, k2d] = derivatives(
    a1+k1a*dt/2, a1v+k1b*dt/2, a2+k1c*dt/2, a2v+k1d*dt/2);
  const [k3a, k3b, k3c, k3d] = derivatives(
    a1+k2a*dt/2, a1v+k2b*dt/2, a2+k2c*dt/2, a2v+k2d*dt/2);
  const [k4a, k4b, k4c, k4d] = derivatives(
    a1+k3a*dt, a1v+k3b*dt, a2+k3c*dt, a2v+k3d*dt);
  a1  += (k1a+2*k2a+2*k3a+k4a)*dt/6;
  a1v += (k1b+2*k2b+2*k3b+k4b)*dt/6;
  a2  += (k1c+2*k2c+2*k3c+k4c)*dt/6;
  a2v += (k1d+2*k2d+2*k3d+k4d)*dt/6;
  // 환경 점성 감쇠
  const df = Math.max(0, 1 - currentDamp * dt);
  a1v *= df;
  a2v *= df;
}

// 패턴 모드: 타겟 각도로 스프링-댐퍼 힘 적용
export function applySpring(ta1, ta2, k, d) {
  a1v += (ta1 - a1) * k - a1v * d;
  a2v += (ta2 - a2) * k - a2v * d;
}

// TAP: dampRatio=0.70 / CHARGE: dampRatio=0.0
export function applyImpulse(mx, my, mul, dampRatio, p) {
  a1v *= (1 - dampRatio);
  a2v *= (1 - dampRatio);

  const { x2, y2 } = getPos();
  const dx   = x2 - mx;
  const dy   = y2 - my;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 1) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // 거리 기반 충격량 — 가까울수록 강하지만 0 나눗셈 방지
  const BASE  = 205;
  const MIN_D = 28;
  const mag   = BASE * mul / Math.max(dist, MIN_D);

  // 각 진자 팔의 접선 방향(법선 벡터)에 투영 → 물리적으로 유효한 토크만 전달
  a2v += (nx * Math.cos(a2) - ny * Math.sin(a2)) * mag;
  a1v += (nx * Math.cos(a1) - ny * Math.sin(a1)) * mag * 0.65;

  // 충격 방향에 수직인 작은 소용돌이 성분 → 자연스러운 회전감
  const swirl = 0.12 * mul;
  a2v += (-ny * Math.cos(a2) - nx * Math.sin(a2)) * swirl;

  // 카오틱 시드 (충전 세기에 비례)
  a1v += p.random(-0.10, 0.10) * mul;
  a2v += p.random(-0.10, 0.10) * mul;
}

// CHARGE 전용 — 세기는 chargeLevel에만 비례, 거리 무관 (방향만 사용)
export function applyChargeImpulse(mx, my, chargeLevel, p) {
  const { x2, y2 } = getPos();
  const dx = x2 - mx, dy = y2 - my;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  const nx = dx / dist, ny = dy / dist;

  const mag   = 5 + chargeLevel * 20;         // 5(최소) → 25(풀차지 ≈ 6×탭)
  const swirl = chargeLevel * 4.5;             // 회전감, 차지에 비례
  const chaos = 0.12 + chargeLevel * 0.22;     // 카오틱 시드

  a2v += (nx * Math.cos(a2) - ny * Math.sin(a2)) * mag;
  a1v += (nx * Math.cos(a1) - ny * Math.sin(a1)) * mag * 0.65;
  a2v += (-ny * Math.cos(a2) - nx * Math.sin(a2)) * swirl;
  a1v += p.random(-chaos, chaos) * mag * 0.10;
  a2v += p.random(-chaos, chaos) * mag * 0.10;
}
