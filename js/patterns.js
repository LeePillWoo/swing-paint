// ── 패턴 커브 정의 ────────────────────────────────────────────────────────────
// fn(t) → [nx, ny]  정규화 좌표 (±1 내외)
const PATTERNS = [
  {
    key:    'heart',
    label:  'HEART',
    speed:  0.022,
    period: Math.PI * 2,
    fn: (t) => {
      const x =  16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
      return [x / 17, y / 14];
    },
  },
  {
    key:    'butterfly',
    label:  'BUTTERFLY',
    speed:  0.030,
    period: Math.PI * 2,
    fn: (t) => {
      const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t);
      return [r * Math.cos(t) / 3.8, -r * Math.sin(t) / 3.8];
    },
  },
  {
    key:    'star',
    label:  'STAR',
    speed:  0.028,
    period: Math.PI * 4,   // 5/2-leaf rose: period = 4π
    fn: (t) => {
      const r = Math.cos(2.5 * t);
      return [r * Math.sin(t), -r * Math.cos(t)];
    },
  },
  {
    key:    'infinity',
    label:  'INFINITY',
    speed:  0.026,
    period: Math.PI * 2,
    fn: (t) => {
      const d = 1 + Math.sin(t) ** 2;
      return [1.5 * Math.cos(t) / d, 1.5 * Math.sin(t) * Math.cos(t) / d];
    },
  },
  {
    key:    'rose',
    label:  'ROSE',
    speed:  0.026,
    period: Math.PI * 2,
    fn: (t) => {
      const r = Math.cos(3 * t);
      return [r * Math.sin(t), -r * Math.cos(t)];
    },
  },
  {
    key:    'spiral',
    label:  'SPIRAL',
    speed:  0.016,
    period: Math.PI * 8,
    fn: (t) => {
      const r = 0.22 + (t / (Math.PI * 8)) * 0.78;
      return [r * Math.sin(t), -r * Math.cos(t)];
    },
  },
  {
    key:    'lissajous',
    label:  'LISSAJOUS',
    speed:  0.020,
    period: Math.PI * 2,
    fn: (t) => [Math.sin(3 * t + Math.PI / 4), Math.sin(2 * t)],
  },
];

let currentIdx   = 0;
let patternT     = 0;
let active       = false;

export function isPatternActive() { return active; }
export function getPatternLabel() {
  return active ? PATTERNS[currentIdx].label : 'PATTERN';
}
export function isPatternOn() { return active; }

// 클릭 시: 꺼져있으면 켜고, 켜져있으면 다음 패턴 → 마지막 다음이면 꺼짐
export function cyclePattern() {
  if (!active) {
    active     = true;
    currentIdx = 0;
    patternT   = 0;
  } else {
    currentIdx = (currentIdx + 1) % PATTERNS.length;
    patternT   = 0;
    if (currentIdx === 0) {
      active = false; // 한 바퀴 돌면 꺼짐
    }
  }
  return active;
}

export function stopPattern() {
  active = false;
}

// ── 역운동학 (IK) ─────────────────────────────────────────────────────────────
// 타겟 (tx, ty) 를 진자 끝점으로 만드는 [a1_target, a2_target] 반환
// 진자 규약: x = pivot.x + L*sin(a), y = pivot.y + L*cos(a)  (a=0 → 아래)
function solveIK(tx, ty, px, py, L1, L2) {
  const dx = tx - px;
  const dy = ty - py;
  const r  = Math.sqrt(dx * dx + dy * dy);

  // 도달 범위 클램프
  const minR = Math.abs(L1 - L2) + 1.0;
  const maxR = L1 + L2 - 1.0;
  const rc   = Math.max(minR, Math.min(maxR, r));

  // 클램프된 방향
  const dxc = r > 0.01 ? dx * rc / r : 0;
  const dyc = r > 0.01 ? dy * rc / r : rc;

  // arm1 이 타겟 방향과 이루는 각도 φ (코사인 법칙)
  const cosP = (L1 * L1 + rc * rc - L2 * L2) / (2 * L1 * rc);
  const phi  = Math.acos(Math.max(-1, Math.min(1, cosP)));

  // a1 (엘보 왼쪽 해)
  const theta = Math.atan2(dxc, dyc);   // 진자 기준: atan2(x_offset, y_offset)
  const ta1   = theta - phi;

  // a2: 첫 번째 arm 끝에서 타겟까지의 각도
  const x1  = px + L1 * Math.sin(ta1);
  const y1  = py + L1 * Math.cos(ta1);
  const ta2 = Math.atan2(px + dxc - x1, py + dyc - y1);

  return [ta1, ta2];
}

// ── 매 프레임 호출 ────────────────────────────────────────────────────────────
// 현재 패턴의 타겟 각도 반환 (비활성 시 null)
export function getPatternTargets(pivotX, pivotY, L1, L2) {
  if (!active) return null;

  const curve = PATTERNS[currentIdx];
  patternT += curve.speed;
  if (patternT > curve.period) patternT -= curve.period;

  const [nx, ny] = curve.fn(patternT);
  const scale = (L1 + L2) * 0.62;

  return solveIK(
    pivotX + nx * scale,
    pivotY + ny * scale,
    pivotX, pivotY, L1, L2
  );
}
