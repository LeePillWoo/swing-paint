import { TRAIL_MAX, TRAIL_MAX_COMET, TRAIL_MAX_GLOW,
         TRAIL_FADE_LINE, TRAIL_FADE_COMET, TRAIL_FADE_GLOW } from './constants.js';

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
  trail.length = 0;
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

// ── 플릭 폭발 이펙트 — 마지막 터치 지점에서 팡 ──────────────────────────────
export function flickBurst(p, x, y, rc, gc, bc, mag) {
  const m = Math.min(Math.max(mag, 1), 8);
  // 빠른 대형 링 (중심 → 바깥으로 빠르게)
  for (let i = 0; i < 6; i++)
    rings.push({ x, y, rad: 2 + i * 8, alpha: 230 - i * 28,
                 rc, gc, bc, speed: 8 + i * 3 + m * 1.2 });
  // 화이트 플래시 링 (즉발)
  rings.push({ x, y, rad: 4,  alpha: 255, rc: 255, gc: 255, bc: 255, speed: 14 });
  rings.push({ x, y, rad: 12, alpha: 180, rc: 255, gc: 255, bc: 255, speed: 18 });
  // 방사형 파티클 (밀집 + 고속)
  const n = Math.floor(30 + m * 5);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + p.random(-0.15, 0.15);
    const s   = p.random(4 + m * 0.6, 10 + m * 1.2);
    particles.push({ x, y, vx: Math.cos(ang)*s, vy: Math.sin(ang)*s,
      alpha: p.random(200, 255), size: p.random(2, 5),
      r: p.lerp(255, rc, 0.5), g: p.lerp(255, gc, 0.5), b: p.lerp(255, bc, 0.5) });
  }
  // 내부 섬광 파티클 (작고 빠름)
  for (let i = 0; i < 14; i++) {
    const ang = p.random(p.TWO_PI);
    const s   = p.random(1, 3 + m * 0.4);
    particles.push({ x, y, vx: Math.cos(ang)*s, vy: Math.sin(ang)*s,
      alpha: 255, size: p.random(0.8, 2), r: 255, g: 255, b: 240 });
  }
}

// ── 자동 교란 방향성 이펙트 — 피벗에서 힘 방향으로 쏘아올림 ─────────────────
export function nudgeSweep(p, x, y, rc, gc, bc, dirAng) {
  // 피벗 기준 대형 파동 링 (느리고 크게)
  for (let i = 0; i < 4; i++)
    rings.push({ x, y, rad: 10 + i * 22, alpha: 190 - i * 40,
                 rc, gc, bc, speed: 3 + i * 1.5 });
  // 방향성 파티클 — dirAng 기준 ±50도 콘
  for (let i = 0; i < 40; i++) {
    const spread = (Math.random() - 0.5) * (Math.PI * 5 / 9); // ±50도
    const ang = dirAng + spread;
    const s   = p.random(3, 12);
    particles.push({ x, y, vx: Math.cos(ang)*s, vy: Math.sin(ang)*s,
      alpha: p.random(180, 255), size: p.random(1.5, 4.5),
      r: rc, g: gc, b: bc });
  }
  // 역방향 소형 파티클 (반동감)
  for (let i = 0; i < 12; i++) {
    const ang = dirAng + Math.PI + (Math.random() - 0.5) * 1.0;
    const s   = p.random(1.5, 5);
    particles.push({ x, y, vx: Math.cos(ang)*s, vy: Math.sin(ang)*s,
      alpha: p.random(100, 170), size: p.random(1, 2.5),
      r: p.lerp(rc, 255, 0.4), g: p.lerp(gc, 255, 0.4), b: p.lerp(bc, 255, 0.4) });
  }
}

// 모드별 최대 버퍼 크기로 제한
export function pushTrail(x, y, r, g, b, w, fade = 1.0) {
  trail.push({ x, y, alpha: 1.0, r, g, b, w, fade });
  let max;
  if      (mirrorMode)          max = TRAIL_MAX_MIRROR;
  else if (trailStyle === 'glow')  max = TRAIL_MAX_GLOW;
  else if (trailStyle === 'comet') max = TRAIL_MAX_COMET;
  else                             max = TRAIL_MAX;
  if (trail.length > max) trail.splice(0, trail.length - max);
}

export function clearTrail() { trail = []; }

// ── 미러 좌표 계산 ───────────────────────────────────────────────────────────
function mirrorPts(x, y, px, py) {
  return [
    [x, y],
    [2 * px - x, y],
    [x, 2 * py - y],
    [2 * px - x, 2 * py - y],
  ];
}

// ── 트레일 렌더 ─────────────────────────────────────────────────────────────
export function renderTrail(p, pivotX, pivotY, trailScale = 1.0) {
  if      (trailStyle === 'line')  renderLineTrail(p, pivotX, pivotY, trailScale);
  else if (trailStyle === 'comet') renderCometTrail(p, pivotX, pivotY, trailScale);
  else                             renderGlowTrail(p, pivotX, pivotY, trailScale);
}

// 글로우: 연속 세그먼트 테이퍼 스트로크 — 머리(최신)는 굵고 밝고, 꼬리(오래됨)는 얇고 희미
function renderGlowTrail(p, pivotX, pivotY, trailScale) {
  // 페이드 업데이트
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].alpha -= TRAIL_FADE_GLOW * trail[i].fade * trailScale;
    if (trail[i].alpha <= 0.008) { trail.splice(i, 1); }
  }
  if (trail.length < 2) return;

  const n     = trail.length;
  const iters = mirrorMode ? 4 : 1;

  p.noFill();
  for (let m = 0; m < iters; m++) {
    for (let i = 1; i < n; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
      if ((cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2 > 9000) continue;

      const a     = Math.min(cur.alpha, prev.alpha);
      const taper = i / n;   // 0 = oldest/thin → 1 = newest/thick
      const w     = cur.w;

      let x1 = prev.x, y1 = prev.y, x2 = cur.x, y2 = cur.y;
      if (m === 1 || m === 3) { x1 = 2 * pivotX - x1; x2 = 2 * pivotX - x2; }
      if (m === 2 || m === 3) { y1 = 2 * pivotY - y1; y2 = 2 * pivotY - y2; }

      // 외부 확산 헤일로 (앞쪽 50% 구간만)
      if (taper > 0.5) {
        p.stroke(cur.r, cur.g, cur.b, a * 8 * taper);
        p.strokeWeight(w * taper * 22);
        p.line(x1, y1, x2, y2);
      }
      // 중간 글로우
      p.stroke(cur.r, cur.g, cur.b, a * 40 * taper + 8);
      p.strokeWeight(w * (1.0 + taper * 8));
      p.line(x1, y1, x2, y2);
      // 코어 라인
      p.stroke(cur.r, cur.g, cur.b, a * 200);
      p.strokeWeight(w * (0.5 + taper * 2.5));
      p.line(x1, y1, x2, y2);
    }
  }

  // 헤드 글로우 — 현재 끝점 발광
  p.noStroke();
  const tip = trail[n - 1];
  if (tip.alpha > 0.08) {
    const w = tip.w, a = tip.alpha;
    const tipPts = mirrorMode ? mirrorPts(tip.x, tip.y, pivotX, pivotY) : [[tip.x, tip.y]];
    for (const [px, py] of tipPts) {
      p.fill(tip.r, tip.g, tip.b, a * 30);  p.circle(px, py, w * 20);
      p.fill(tip.r, tip.g, tip.b, a * 110); p.circle(px, py, w * 7);
      p.fill(255, 255, 255,       a * 185); p.circle(px, py, w * 2.5);
    }
  }
}

// 코맷: 2레이어 원, 중간 페이드
// 외부 헤일로는 alpha > 0.25 일 때만
function renderCometTrail(p, pivotX, pivotY, trailScale) {
  p.noStroke();
  for (let i = trail.length - 1; i >= 0; i--) {
    const pt = trail[i];
    pt.alpha -= TRAIL_FADE_COMET * pt.fade * trailScale;
    if (pt.alpha <= 0.008) { trail.splice(i, 1); continue; }
    const a = pt.alpha, w = pt.w;
    const pts = mirrorMode ? mirrorPts(pt.x, pt.y, pivotX, pivotY) : [[pt.x, pt.y]];
    for (const [px, py] of pts) {
      if (a > 0.25) {
        p.fill(pt.r, pt.g, pt.b, a * 100); p.circle(px, py, w * 7);
      }
      p.fill(pt.r, pt.g, pt.b, a * 240); p.circle(px, py, w * 2.2);
    }
  }
}

// 라인: 현재 유지 (가장 긴 잔상)
function renderLineTrail(p, pivotX, pivotY, trailScale) {
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].alpha -= TRAIL_FADE_LINE * trail[i].fade * trailScale;
    if (trail[i].alpha <= 0) trail.splice(i, 1);
  }
  if (trail.length < 2) return;

  const iters = mirrorMode ? 4 : 1;
  for (let m = 0; m < iters; m++) {
    for (let i = 1; i < trail.length; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
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
