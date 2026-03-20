import { TRAIL_MAX, TRAIL_MAX_COMET, TRAIL_MAX_GLOW, TRAIL_MAX_RIBBON, TRAIL_MAX_SPARK,
         TRAIL_FADE_LINE, TRAIL_FADE_COMET, TRAIL_FADE_GLOW,
         TRAIL_FADE_RIBBON, TRAIL_FADE_SPARK } from './constants.js';

export let trail     = [];
export let rings     = [];
export let particles = [];

export let trailStyle = 'glow';   // 'glow' | 'line' | 'comet' | 'ribbon' | 'spark'
export let mirrorMode = false;

const TRAIL_MAX_MIRROR = 500;

// ── 모드 토글 ────────────────────────────────────────────────────────────────
export function cycleTrailStyle() {
  const styles = ['glow', 'line', 'comet', 'ribbon', 'spark'];
  trailStyle = styles[(styles.indexOf(trailStyle) + 1) % styles.length];
  return trailStyle;
}

export function toggleMirror() {
  mirrorMode = !mirrorMode;
  trail.length = 0;
  return mirrorMode;
}

// 프리셋용 직접 상태 설정
export function setTrailStyle(style) {
  if (['glow', 'line', 'comet', 'ribbon', 'spark'].includes(style)) trailStyle = style;
}

export function setMirrorState(on) {
  mirrorMode = on;
  trail.length = 0;
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
  // driftY/driftX: spark 렌더에서 사용 — push 시점에 초기화해 런타임 undefined 체크 제거
  const isSpark = trailStyle === 'spark';
  trail.push({ x, y, alpha: 1.0, r, g, b, w, fade,
               driftY: isSpark ? (Math.random() - 0.5) * 2.25 - 0.4 : 0,
               driftX: isSpark ? (Math.random() - 0.5) * 2.25 : (Math.random() - 0.5) * 0.12 });
  let max;
  if      (mirrorMode)               max = TRAIL_MAX_MIRROR;
  else if (trailStyle === 'glow')    max = TRAIL_MAX_GLOW;
  else if (trailStyle === 'comet')   max = TRAIL_MAX_COMET;
  else if (trailStyle === 'ribbon')  max = TRAIL_MAX_RIBBON;
  else if (trailStyle === 'spark')   max = TRAIL_MAX_SPARK;
  else                               max = TRAIL_MAX;
  // shift: 1요소씩 제거 — V8은 dense array에서 O(1) amortized로 최적화
  while (trail.length > max) trail.shift();
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
  if      (trailStyle === 'line')   renderLineTrail(p, pivotX, pivotY, trailScale);
  else if (trailStyle === 'comet')  renderCometTrail(p, pivotX, pivotY, trailScale);
  else if (trailStyle === 'ribbon') renderRibbonTrail(p, pivotX, pivotY, trailScale);
  else if (trailStyle === 'spark')  renderSparkTrail(p, pivotX, pivotY, trailScale);
  else                              renderGlowTrail(p, pivotX, pivotY, trailScale);
}

// 글로우: 연속 세그먼트 테이퍼 스트로크 — 머리(최신)는 굵고 밝고, 꼬리(오래됨)는 얇고 희미
function renderGlowTrail(p, pivotX, pivotY, trailScale) {
  // 페이드 + write-pointer 컴팩션 (O(n), splice 제거)
  let write = 0;
  for (let i = 0; i < trail.length; i++) {
    trail[i].alpha -= TRAIL_FADE_GLOW * trail[i].fade * trailScale;
    if (trail[i].alpha > 0.008) trail[write++] = trail[i];
  }
  trail.length = write;
  if (trail.length < 2) return;

  const n     = trail.length;
  const iters = mirrorMode ? 4 : 1;

  p.noFill();
  for (let m = 0; m < iters; m++) {
    for (let i = 1; i < n; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
      const _gdx = cur.x - prev.x, _gdy = cur.y - prev.y;
      if (_gdx * _gdx + _gdy * _gdy > 9000) continue;

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
  // Phase 1: 페이드 + write-pointer 컴팩션
  let write = 0;
  for (let i = 0; i < trail.length; i++) {
    trail[i].alpha -= TRAIL_FADE_COMET * trail[i].fade * trailScale;
    if (trail[i].alpha > 0.008) trail[write++] = trail[i];
  }
  trail.length = write;

  // Phase 2: 렌더
  p.noStroke();
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
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
  let write = 0;
  for (let i = 0; i < trail.length; i++) {
    trail[i].alpha -= TRAIL_FADE_LINE * trail[i].fade * trailScale;
    if (trail[i].alpha > 0) trail[write++] = trail[i];
  }
  trail.length = write;
  if (trail.length < 2) return;

  const n     = trail.length;
  const iters = mirrorMode ? 4 : 1;
  for (let m = 0; m < iters; m++) {
    for (let i = 1; i < n; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
      const _ldx = cur.x - prev.x, _ldy = cur.y - prev.y;
      if (_ldx * _ldx + _ldy * _ldy > 9000) continue;

      let x1 = prev.x, y1 = prev.y;
      let x2 = cur.x,  y2 = cur.y;
      if (m === 1 || m === 3) { x1 = 2*pivotX - x1; x2 = 2*pivotX - x2; }
      if (m === 2 || m === 3) { y1 = 2*pivotY - y1; y2 = 2*pivotY - y2; }

      const a    = Math.min(cur.alpha, prev.alpha);
      // 헤드에서 가까운 구간(최신 5%) → 미세 글로우
      const head = Math.max(0, (i / n - 0.90) / 0.10);  // 0→1 (90%~100%)
      p.noFill();
      if (head > 0) {
        p.stroke(cur.r, cur.g, cur.b, a * 22 * head);
        p.strokeWeight(cur.w * (1.8 + head * 1.2));  // 코어(0.45)의 약 2~3배
        p.line(x1, y1, x2, y2);
      }
      // 외곽 글로우 (레이저 확산)
      p.stroke(cur.r, cur.g, cur.b, a * 45);
      p.strokeWeight(cur.w * 2.8);
      p.line(x1, y1, x2, y2);
      // 코어 레이저 라인 (극세)
      p.stroke(cur.r, cur.g, cur.b, a * 255);
      p.strokeWeight(cur.w * 0.45);
      p.line(x1, y1, x2, y2);
    }
  }

  // 헤드 끝점 발광 원 (레이저 발사구 느낌)
  const tip = trail[n - 1];
  if (tip.alpha > 0.1) {
    const w = tip.w, a = tip.alpha;
    const tipPts = mirrorMode ? mirrorPts(tip.x, tip.y, pivotX, pivotY) : [[tip.x, tip.y]];
    p.noStroke();
    for (const [px, py] of tipPts) {
      p.fill(tip.r, tip.g, tip.b, a * 18);  p.circle(px, py, w * 14);
      p.fill(tip.r, tip.g, tip.b, a * 65);  p.circle(px, py, w * 3);
      p.fill(255, 255, 255,        a * 200); p.circle(px, py, w * 1.2);
    }
  }
}

// ── 파티클 렌더 ─────────────────────────────────────────────────────────────
export function renderParticles(p) {
  p.noStroke();
  let write = 0;
  for (let i = 0; i < particles.length; i++) {
    const pt = particles[i];
    pt.x += pt.vx; pt.y += pt.vy;
    pt.vx *= 0.88; pt.vy *= 0.88;
    pt.alpha -= 6;
    if (pt.alpha <= 0) continue;
    particles[write++] = pt;
    p.fill(pt.r, pt.g, pt.b, pt.alpha * 0.45);
    p.circle(pt.x, pt.y, pt.size * 2.8);
    p.fill(pt.r, pt.g, pt.b, pt.alpha);
    p.circle(pt.x, pt.y, pt.size);
  }
  particles.length = write;
}

// ── 파동 링 렌더 ─────────────────────────────────────────────────────────────
export function renderRings(p) {
  p.noFill();
  p.strokeWeight(1.4);
  let write = 0;
  for (let i = 0; i < rings.length; i++) {
    const rg = rings[i];
    rg.rad   += rg.speed;
    rg.alpha -= 4.5;
    if (rg.alpha <= 0) continue;
    rings[write++] = rg;
    p.stroke(rg.rc, rg.gc, rg.bc, rg.alpha);
    p.circle(rg.x, rg.y, rg.rad * 2);
  }
  rings.length = write;
}

// ── 리본 트레일: 수직 법선으로 폭 있는 리본 폴리곤 ──────────────────────────
function renderRibbonTrail(p, pivotX, pivotY, trailScale) {
  let write = 0;
  for (let i = 0; i < trail.length; i++) {
    trail[i].alpha -= TRAIL_FADE_RIBBON * trail[i].fade * trailScale;
    if (trail[i].alpha > 0.008) trail[write++] = trail[i];
  }
  trail.length = write;
  const n = trail.length;
  if (n < 3) return;

  // 각 포인트에서 법선과 하프-너비 계산 (모듈 레벨 버퍼 재사용)
  if (_lx.length < n) { _lx.length = n; _ly.length = n; _rx.length = n; _ry.length = n; }
  for (let i = 0; i < n; i++) {
    const pt   = trail[i];
    const prev = trail[Math.max(0, i - 1)];
    const next = trail[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    const nx = -dy, ny = dx;
    const hw = pt.w * (i / n) * 9;   // 꼬리→머리로 선형 두꺼짐
    _lx[i] = pt.x + nx * hw;  _ly[i] = pt.y + ny * hw;
    _rx[i] = pt.x - nx * hw;  _ry[i] = pt.y - ny * hw;
  }

  const iters = mirrorMode ? 4 : 1;
  for (let m = 0; m < iters; m++) {
    p.noStroke();
    for (let i = 1; i < n; i++) {
      const cur  = trail[i];
      const prev = trail[i - 1];
      const _rdx = cur.x - prev.x, _rdy = cur.y - prev.y;
      if (_rdx * _rdx + _rdy * _rdy > 9000) continue;
      const a = Math.min(cur.alpha, prev.alpha);
      if (a <= 0) continue;

      let l1x = _lx[i-1], l1y = _ly[i-1], l2x = _lx[i], l2y = _ly[i];
      let r1x = _rx[i-1], r1y = _ry[i-1], r2x = _rx[i], r2y = _ry[i];
      if (m === 1 || m === 3) { l1x = 2*pivotX-l1x; l2x = 2*pivotX-l2x; r1x = 2*pivotX-r1x; r2x = 2*pivotX-r2x; }
      if (m === 2 || m === 3) { l1y = 2*pivotY-l1y; l2y = 2*pivotY-l2y; r1y = 2*pivotY-r1y; r2y = 2*pivotY-r2y; }

      // 내부 채움
      p.fill(cur.r, cur.g, cur.b, a * 145);
      p.quad(l1x, l1y, l2x, l2y, r2x, r2y, r1x, r1y);
      // 엣지 하이라이트
      p.stroke(cur.r, cur.g, cur.b, a * 200);
      p.strokeWeight(0.6);
      p.noFill();
      p.line(l1x, l1y, l2x, l2y);
      p.line(r1x, r1y, r2x, r2y);
    }
  }

  // 헤드 글로우
  const tip = trail[n - 1];
  if (tip.alpha > 0.1) {
    const tipPts = mirrorMode ? mirrorPts(tip.x, tip.y, pivotX, pivotY) : [[tip.x, tip.y]];
    p.noStroke();
    for (const [px, py] of tipPts) {
      p.fill(tip.r, tip.g, tip.b, tip.alpha * 40);  p.circle(px, py, tip.w * 20);
      p.fill(tip.r, tip.g, tip.b, tip.alpha * 130); p.circle(px, py, tip.w * 7);
      p.fill(255, 255, 255,        tip.alpha * 210); p.circle(px, py, tip.w * 2);
    }
  }
}

// ── 스파크 트레일: 점들이 중력 방향으로 흘러내리는 불꽃 ──────────────────────
function renderSparkTrail(p, pivotX, pivotY, trailScale) {
  // Phase 1: 드리프트 업데이트 + 페이드 + write-pointer 컴팩션
  let write = 0;
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    pt.driftX *= 0.91;
    pt.driftY  = pt.driftY * 0.91 + 0.22 * Math.max(pt.alpha, 0.08);
    pt.y += pt.driftY;
    pt.x += pt.driftX;
    pt.alpha -= TRAIL_FADE_SPARK * pt.fade * trailScale;
    if (pt.alpha > 0.008) trail[write++] = pt;
  }
  trail.length = write;

  // Phase 2: 렌더
  p.noStroke();
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    const a = pt.alpha, w = pt.w;
    const pts = mirrorMode ? mirrorPts(pt.x, pt.y, pivotX, pivotY) : [[pt.x, pt.y]];
    for (const [px, py] of pts) {
      if (a > 0.30) { p.fill(pt.r, pt.g, pt.b, a * 60);  p.circle(px, py, w * 5.5); }
      p.fill(pt.r, pt.g, pt.b, a * 220); p.circle(px, py, w * 1.5);
      if (a > 0.55) { p.fill(255, 255, 200, a * 170);     p.circle(px, py, w * 0.7); }
    }
  }
}

// ── 리본 법선 버퍼 (매 프레임 재할당 방지) ──────────────────────────────────
let _lx = [], _ly = [], _rx = [], _ry = [];

// ── 배경 동적 효과 ────────────────────────────────────────────────────────────
let _stars      = null;
let _waterPhase = 0;

export function resetBg() { _stars = null; }

export function renderBg(p, env, energy, cx, cy) {
  if (env === 'SPACE') {
    // 별 필드 (한 번 생성 후 재사용)
    if (!_stars) {
      _stars = [];
      for (let i = 0; i < 130; i++) {
        _stars.push({
          x: Math.random() * p.width,
          y: Math.random() * p.height,
          r: Math.random() * 1.4 + 0.4,
          phase: Math.random() * Math.PI * 2,
          spd:   Math.random() * 0.025 + 0.008,
        });
      }
    }
    const t = Date.now() * 0.001;
    p.noStroke();
    for (const s of _stars) {
      const tw  = (Math.sin(t * s.spd * 5 + s.phase) + 1) / 2;
      const a   = (0.25 + tw * 0.55) * 200;
      p.fill(190, 215, 255, a);
      p.circle(s.x, s.y, s.r * (0.6 + tw * 0.8));
    }
    // 피벗 네뷸라 글로우
    p.fill(60, 100, 200, 8 + energy * 10);
    p.circle(cx, cy, 180 + energy * 90);

  } else if (env === 'WATER') {
    // 피벗에서 천천히 퍼지는 수면 파문
    _waterPhase = (_waterPhase + 0.0025) % 1.0;
    p.noFill();
    for (let i = 0; i < 4; i++) {
      const ph = (_waterPhase + i * 0.25) % 1.0;
      const r  = ph * 200 + 15;
      const a  = (1 - ph) * 16;
      p.stroke(25, 155, 195, a);
      p.strokeWeight(0.7);
      p.circle(cx, cy, r * 2);
    }

  } else if (env === 'CHAOS') {
    // 맥동하는 사인파 그리드 라인
    const t    = Date.now() * 0.00055;
    const gA   = 4 + energy * 8;
    const step = Math.max(48, Math.floor(Math.min(p.width, p.height) / 11));
    p.noFill();
    p.stroke(185, 70, 255, gA);
    p.strokeWeight(0.35);
    for (let y = 0; y < p.height; y += step) {
      p.beginShape();
      for (let x = 0; x <= p.width; x += 30) {
        const off = Math.sin(x * 0.04 + t + y * 0.01) * (5 + energy * 7);
        p.vertex(x, y + off);
      }
      p.endShape();
    }
  }
  // EARTH: 기본 검정 배경 그대로
}
