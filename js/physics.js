import { G, M1, M2 } from './constants.js';

export let cx, cy, L1, L2;
export let a1, a2, a1v, a2v;

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

// cx, cy 도 포함해 반환 (렌더링에서 사용)
export function getPos() {
  const x1 = cx + L1 * Math.sin(a1);
  const y1 = cy + L1 * Math.cos(a1);
  const x2 = x1 + L2 * Math.sin(a2);
  const y2 = y1 + L2 * Math.cos(a2);
  return { cx, cy, x1, y1, x2, y2 };
}

// 라그랑지안 4차 룽게-쿠타 (내부 전용)
function derivatives(s1, s1v, s2, s2v) {
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

  const BASE  = 180;
  const MIN_D = 35;
  const mag   = BASE * mul / Math.max(dist, MIN_D);

  a2v += (nx * Math.cos(a2) - ny * Math.sin(a2)) * mag;
  a1v += (nx * Math.cos(a1) - ny * Math.sin(a1)) * mag * 0.55;

  a1v += p.random(-0.15, 0.15) * mul;
  a2v += p.random(-0.15, 0.15) * mul;
}
