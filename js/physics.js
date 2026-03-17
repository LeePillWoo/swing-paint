import { G, M1, M2 } from './constants.js';

export let cx, cy, L1, L2;
export let a1, a2, a1v, a2v;

// ── 환경 시스템 ────────────────────────────────────────────────────────────
const ENV = {
  EARTH: { g: 350, damp: 0.02  },  // 공기 저항, 자연스럽게 서서히 감속
  SPACE: { g:   0, damp: 0.0   },  // 완전 무중력, 마찰 없음 — 낙하 없이 영원 회전
  WATER: { g: 100, damp: 0.30  },  // 부력+점성 — 선형 감쇠는 줄이고 속도²저항으로 보완
  CHAOS: { g:  10, damp: 0.0   },  // 준무중력 + 관절 노이즈 — 패턴 비반복
};

export let envMode  = 'CHAOS';
export let currentG    = ENV.CHAOS.g;
export let currentDamp = ENV.CHAOS.damp;

// 환경 타겟값 (HUD 정규화용)
export const ENV_G_MAX    = 350;
export const ENV_DAMP_MAX = 0.85;

export function cycleEnv() {
  const modes = ['CHAOS', 'EARTH', 'WATER', 'SPACE'];
  envMode = modes[(modes.indexOf(envMode) + 1) % modes.length];
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
  const modes = ['STANDARD', 'FEATHER', 'IRON'];
  massMode = modes[(modes.indexOf(massMode) + 1) % modes.length];
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
  // 선형 감쇠 (공기·수중 공통)
  const df = Math.max(0, 1 - currentDamp * dt);
  a1v *= df;
  a2v *= df;
  // 수중 저항: 고속=속도²저항, 저속=점착성 추가 감쇠
  if (envMode === 'WATER') {
    a1v -= a1v * Math.abs(a1v) * 0.004 * dt;
    a2v -= a2v * Math.abs(a2v) * 0.004 * dt;
    const STICK = 0.5;
    if (Math.abs(a1v) < STICK) a1v *= (1 - 0.055 * dt / 0.016);
    if (Math.abs(a2v) < STICK) a2v *= (1 - 0.055 * dt / 0.016);
  }
  // EARTH: 저속 점착 감쇠 — 속도가 낮을수록 강하게, 미세진동 단계적 소멸
  if (envMode === 'EARTH') {
    const STICK_V = 0.35;                  // 이 속도 이하에서 점착 감쇠 시작
    const stick   = 0.025 * (dt / 0.016);  // 최대 감쇠율 (v=0 기준)
    const f1 = Math.max(0, 1 - Math.abs(a1v) / STICK_V);
    const f2 = Math.max(0, 1 - Math.abs(a2v) / STICK_V);
    a1v *= (1 - f1 * stick);
    a2v *= (1 - f2 * stick);
    // 완전 정지 스냅 — 각도·속도 모두 미세할 때 수직으로 고정
    if (Math.abs(a1v) < 0.004 && Math.abs(a2v) < 0.004 &&
        Math.abs(a1)  < 0.12  && Math.abs(a2)  < 0.18) {
      a1 = 0; a2 = 0; a1v = 0; a2v = 0;
    }
  }
  // 카오스: 상부 관절은 거의 무중력(g=10), 하부 추는 약한 중력 복원력 추가
  // — a2=0이 수직 아래방향이므로 -sin(a2)가 아래로 당기는 복원 토크
  if (envMode === 'CHAOS') {
    const CHAOS_BOB_G = 75;
    a2v -= (CHAOS_BOB_G / L2) * Math.sin(a2) * dt;
  }
}

// 드래그 전용 — a1 강제 구동, a2만 물리 적분 (지구 중력·공기저항 고정)
// forcedA1a: 커서 각가속도 (원심력 항에 필요)
const DRAG_G    = 350;   // 드래그 중 항상 지구 중력
const DRAG_DAMP = 0.30;  // 홀드 시 감속

export function stepRK4_drag(dt, forcedA1, forcedA1v, forcedA1a) {
  function deriv(s2, s2v) {
    const diff = forcedA1 - s2;
    const a2a  = (
        L1 * forcedA1v * forcedA1v * Math.sin(diff)   // 원심력
      - L1 * forcedA1a * Math.cos(diff)               // 가속도 반작용
      - DRAG_G * Math.sin(s2)                          // 중력 복원력
    ) / L2;
    return [s2v, a2a];
  }
  const [k1c, k1d] = deriv(a2,            a2v);
  const [k2c, k2d] = deriv(a2+k1c*dt/2,  a2v+k1d*dt/2);
  const [k3c, k3d] = deriv(a2+k2c*dt/2,  a2v+k2d*dt/2);
  const [k4c, k4d] = deriv(a2+k3c*dt,    a2v+k3d*dt);
  a2  += (k1c+2*k2c+2*k3c+k4c)*dt/6;
  a2v += (k1d+2*k2d+2*k3d+k4d)*dt/6;
  a2v *= Math.max(0, 1 - DRAG_DAMP * dt);  // 공기 저항
  // a1 커서 위치에 강제 고정
  a1  = forcedA1;
  a1v = forcedA1v;
}

// 드래그/홀드 중 속도 감쇠 — 하부 추 안정화용
export function dampForDrag(a1Factor, a2Factor) {
  a1v *= a1Factor;
  a2v *= a2Factor;
}

// 드래그 전용: a1만 타겟 각도 방향으로 당김 (a2는 자유 물리)
// k = 스프링 강도, d = a1v 감쇠 비율
export function applyDragForce(targetAngle, k, d) {
  let da = targetAngle - a1;
  if (da >  Math.PI) da -= Math.PI * 2;
  if (da < -Math.PI) da += Math.PI * 2;
  a1v += da * k - a1v * d;
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

  if (envMode !== 'EARTH') {
    // 충격 방향에 수직인 소용돌이 성분 (게임적 회전감)
    const swirl = 0.12 * mul;
    a2v += (-ny * Math.cos(a2) - nx * Math.sin(a2)) * swirl;
    // 카오틱 시드
    a1v += p.random(-0.10, 0.10) * mul;
    a2v += p.random(-0.10, 0.10) * mul;
  }
}

// CHARGE 전용 — 세기는 chargeLevel에만 비례, 거리 무관 (방향만 사용)
export function applyChargeImpulse(mx, my, chargeLevel, p) {
  const { x2, y2 } = getPos();
  const dx = x2 - mx, dy = y2 - my;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  const nx = dx / dist, ny = dy / dist;

  const mag = 5 + chargeLevel * 20;           // 5(최소) → 25(풀차지 ≈ 6×탭)

  a2v += (nx * Math.cos(a2) - ny * Math.sin(a2)) * mag;
  a1v += (nx * Math.cos(a1) - ny * Math.sin(a1)) * mag * 0.65;

  if (envMode !== 'EARTH') {
    // 회전감 + 카오틱 시드 (게임적 요소)
    const swirl = chargeLevel * 4.5;
    const chaos = 0.12 + chargeLevel * 0.22;
    a2v += (-ny * Math.cos(a2) - nx * Math.sin(a2)) * swirl;
    a1v += p.random(-chaos, chaos) * mag * 0.10;
    a2v += p.random(-chaos, chaos) * mag * 0.10;
  }
}

// ── 카오스 관절 노이즈 ────────────────────────────────────────────────────────
// 저역통과 필터링된 작은 연속 드리프트만 사용 — 인위적 킥 없음
// 이중진자는 충분한 에너지에서 원래 카오틱 → 작은 노이즈가 초기조건을
// 서서히 바꾸면 지수적 발산이 자연스럽게 패턴을 달라지게 함
let _cv1 = 0, _cv2 = 0;

export function applyChaosNoise() {
  if (envMode !== 'CHAOS') return;

  // 상부: 시정수 ~20프레임 — 완만하고 느린 방향 드리프트
  _cv1 = _cv1 * 0.95 + (Math.random() - 0.5) * 0.10;
  // 하부: 시정수 ~7프레임 — 조금 더 빠른 미세 교란
  _cv2 = _cv2 * 0.86 + (Math.random() - 0.5) * 0.18;

  // 에너지가 낮을 때만 부드럽게 보조 — 급격한 게인 변화 없이 서서히
  const KE    = a1v * a1v + a2v * a2v;
  const boost = Math.max(0, 1.0 - KE / 4.0);  // KE≥4 → 0, KE=0 → 1

  a1v += _cv1 * (0.07 + boost * 0.05);
  a2v += _cv2 * (0.12 + boost * 0.10);

  // 극미세 에너지 상한 — 장시간 후 무한 가속 방지
  a1v *= 0.9998;
  a2v *= 0.9998;
}
