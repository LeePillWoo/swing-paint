import { TRAIL_MAX, TRAIL_FADE } from './constants.js';

export let trail     = [];
export let rings     = [];
export let particles = [];

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
  if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
}

export function clearTrail() {
  trail = [];
}

export function renderTrail(p) {
  p.noStroke();
  for (let i = trail.length - 1; i >= 0; i--) {
    const pt = trail[i];
    pt.alpha -= TRAIL_FADE;
    if (pt.alpha <= 0) { trail.splice(i, 1); continue; }
    const a = pt.alpha, w = pt.w;
    p.fill(pt.r, pt.g, pt.b, a *  28); p.circle(pt.x, pt.y, w * 14);
    p.fill(pt.r, pt.g, pt.b, a *  80); p.circle(pt.x, pt.y, w * 5.5);
    p.fill(pt.r, pt.g, pt.b, a * 200); p.circle(pt.x, pt.y, w * 1.8);
  }
}

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
