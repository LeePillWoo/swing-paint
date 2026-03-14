import { TRAIL_MAX, TRAIL_FADE } from './constants.js';

export let trail     = [];
export let rings     = [];
export let particles = [];

export let trailStyle = 'glow';   // 'glow' | 'line' | 'comet'
export let mirrorMode = false;

const TRAIL_MAX_MIRROR = 500;

// ── 모드 토글 ────────────────────────────────────────────────────────────────
export function cycleTrailStyle() {
  const styles = ['glow', 'line', 'comet'];
  trailStyle = styles[(styles.indexOf(trailStyle) + 1) % styles.length];
  return trailStyle;
}

export function toggleMirror() {
  mirrorMode = !mirrorMode;
  trail.length = 0; // 전환 시 잔상 초기화
  return mirrorMode;
}

// ── 이펙트 생성 ──────────────────────────────────────────────────────────────
export function addRings(x, y, rc, gc, bc, n, ba) {
  for (let i = 0; i < n; i++)
    rings.push({ x, y, rad: 5 + i * 14, alpha: ba - i * 38,
                 rc, gc, bc, speed: 5 + i * 2 });
}

export function spawnParticles(p, x, y, rc, gc, bc, n, spd) {
  for (let i = 0; i < n; i++) {
    const ang = p.random(p.TWO_PI);
    const s   = p.random(spd * 0.4, spd);
    particles.push({
      x, y,
      vx: Math.cos(ang)*s, vy: Math.sin(ang)*s,
      alpha: p.random(160, 235),
      size:  p.random(1.5, 3.5),
      r: rc, g: gc, b: bc
    });
  }
}

export function pushTrail(x, y, r, g, b, w) {
  trail.push({ x, y, alpha: 1.0, r, g, b, w });
  const max = mirrorMode ? TRAIL_MAX_MIRROR : TRAIL_MAX;
  if (trail.length > max) trail.splice(0, trail.length - max);
}

export function clearTrail() { trail = []; }

// ── 미러 좌표 계산 ───────────────────────────────────────────────────────────
// pivotX, pivotY 기준 4방향 대칭
function mirrorPts(x, y, px, py) {
  return [
    [x, y],
    [2 * px - x, y],
    [x, 2 * py - y],
    [2 * px - x, 2 * py - y],
  ];
}

// ── 트레일 렌더 ─────────────────────────────────────────────────────────────
export function renderTrail(p, pivotX, pivotY) {
  if      (trailStyle === 'line')  renderLineTrail(p, pivotX, pivotY);
  else if (trailStyle === 'comet') renderCometTrail(p, pivotX, pivotY);
  else                             renderGlowTrail(p, pivotX, pivotY);
}

function renderGlowTrail(p, pivotX, pivotY) {
  p.noStroke();
  for (let i = trail.length - 1; i >= 0; i--) {
    const pt = trail[i];
    pt.alpha -= TRAIL_FADE;
    if (pt.alpha <= 0) { trail.splice(i, 1); continue; }
    const a = pt.alpha, w = pt.w;
    const pts = mirrorMode ? mirrorPts(pt.x, pt.y, pivotX, pivotY) : [[pt.x, pt.y]];
    for (const [px, py] of pts) {
      p.fill(pt.r, pt.g, pt.b, a *  28); p.circle(px, py, w * 14);
      p.fill(pt.r, pt.g, pt.b, a *  80); p.circle(px, py, w * 5.5);
      p.fill(pt.r, pt.g, pt.b, a * 200); p.circle(px, py, w * 1.8);
    }
  }
}

function renderCometTrail(p, pivotX, pivotY) {
  p.noStroke();
  for (let i = trail.length - 1; i >= 0; i--) {
    const pt = trail[i];
    pt.alpha -= TRAIL_FADE;
    if (pt.alpha <= 0) { trail.splice(i, 1); continue; }
    const a = pt.alpha, w = pt.w;
    const pts = mirrorMode ? mirrorPts(pt.x, pt.y, pivotX, pivotY) : [[pt.x, pt.y]];
    for (const [px, py] of pts) {
      p.fill(pt.r, pt.g, pt.b, a * 100); p.circle(px, py, w * 7);
      p.fill(pt.r, pt.g, pt.b, a * 240); p.circle(px, py, w * 2.2);
    }
  }
}

function renderLineTrail(p, pivotX, pivotY) {
  // 먼저 알파 감소 & 제거
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].alpha -= TRAIL_FADE;
    if (trail[i].alpha <= 0) trail.splice(i, 1);
  }
  if (trail.length < 2) return;

  const iters = mirrorMode ? 4 : 1;
  for (let m = 0; m < iters; m++) {
    for (let i = 1; i < trail.length; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
      // 큰 점프(리셋 직후) 스킵
      if ((cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2 > 9000) continue;

      let x1 = prev.x, y1 = prev.y;
      let x2 = cur.x,  y2 = cur.y;
      if (m === 1 || m === 3) { x1 = 2*pivotX - x1; x2 = 2*pivotX - x2; }
      if (m === 2 || m === 3) { y1 = 2*pivotY - y1; y2 = 2*pivotY - y2; }

      const a = Math.min(cur.alpha, prev.alpha);
      p.noFill();
      p.stroke(cur.r, cur.g, cur.b, a * 35);
      p.strokeWeight(cur.w * 5.5);
      p.line(x1, y1, x2, y2);
      p.stroke(cur.r, cur.g, cur.b, a * 230);
      p.strokeWeight(cur.w * 1.3);
      p.line(x1, y1, x2, y2);
    }
  }
}

// ── 파티클 렌더 ─────────────────────────────────────────────────────────────
export function renderParticles(p) {
  p.noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vx *= 0.88; pt.vy *= 0.88;
    pt.alpha -= 6;
    if (pt.alpha <= 0) { particles.splice(i, 1); continue; }
    p.fill(pt.r, pt.g, pt.b, pt.alpha * 0.45);
    p.circle(pt.x, pt.y, pt.size * 2.8);
    p.fill(pt.r, pt.g, pt.b, pt.alpha);
    p.circle(pt.x, pt.y, pt.size);
  }
}

// ── 파동 링 렌더 ─────────────────────────────────────────────────────────────
export function renderRings(p) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const rg = rings[i];
    rg.rad   += rg.speed;
    rg.alpha -= 4.5;
    if (rg.alpha <= 0) { rings.splice(i, 1); continue; }
    p.noFill();
    p.stroke(rg.rc, rg.gc, rg.bc, rg.alpha);
    p.strokeWeight(1.4);
    p.circle(rg.x, rg.y, rg.rad * 2);
  }
}
