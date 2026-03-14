import { DT, SUBSTEPS, PINK, MINT, GOLD, BG } from './constants.js';
import { ensureAudio, soundTap, soundChargeStart, soundChargeUpdate,
         soundChargeRelease, stopChargeOsc } from './audio.js';
import { resetPendulum, getPos, stepRK4, applyImpulse } from './physics.js';
import { pushTrail, clearTrail,
         renderTrail, renderParticles, renderRings,
         addRings, spawnParticles } from './effects.js';
import { flashTap, updateUI } from './ui.js';

new p5(function(p) {

  let colorPhase = 0;
  let mode        = 'idle';   // 'idle' | 'charging'
  let pressTime   = 0;
  let chargeLevel = 0;
  let timeScale   = 1.0;
  let lastTouchX  = 0;
  let lastTouchY  = 0;

  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.colorMode(p.RGB, 255, 255, 255, 255);
    resetPendulum(p);
  };

  p.draw = function() {
    p.background(...BG, 255);
    colorPhase += 0.008;

    // 충전 중: 슬로우다운 / 릴리즈 후: 자연 복귀
    if (mode === 'charging') {
      chargeLevel = Math.min((p.millis() - pressTime) / 3000, 1.0);
      timeScale   = p.lerp(timeScale, 0.06, 0.07);
      soundChargeUpdate(chargeLevel);
    } else {
      const target = 1.0;
      const rate   = timeScale > 1.0 ? 0.04 : 0.06;
      timeScale    = p.lerp(timeScale, target, rate);
    }

    // 물리 적분 (RK4 × SUBSTEPS)
    for (let i = 0; i < SUBSTEPS; i++) stepRK4(DT * timeScale);

    const pos = getPos();
    const ct  = (Math.sin(colorPhase) + 1) / 2;

    // 트레일 색·폭 결정
    let tr, tg, tb, tw;
    if (mode === 'charging') {
      tr = p.lerp(GOLD[0], 255, chargeLevel);
      tg = p.lerp(GOLD[1],  40, chargeLevel);
      tb = p.lerp(GOLD[2],   0, chargeLevel);
      tw = p.lerp(1.4, 6.5, chargeLevel);
    } else {
      tr = p.lerp(PINK[0], MINT[0], ct);
      tg = p.lerp(PINK[1], MINT[1], ct);
      tb = p.lerp(PINK[2], MINT[2], ct);
      tw = 1.5;
    }
    pushTrail(pos.x2, pos.y2, tr, tg, tb, tw);

    renderTrail(p);
    renderParticles(p);
    renderRings(p);

    // 진자 팔
    p.stroke(60, 80, 110, 180);
    p.strokeWeight(1.2);
    p.line(pos.cx,  pos.cy,  pos.x1, pos.y1);
    p.line(pos.x1, pos.y1,  pos.x2, pos.y2);

    // 조인트
    p.noStroke();
    p.fill(120, 140, 160, 200); p.circle(pos.cx,  pos.cy,  10);
    p.fill(160, 180, 200, 200); p.circle(pos.x1, pos.y1,  10);

    // bob2
    if (mode === 'charging') {
      const gs = 14 + chargeLevel * 44;
      p.fill(255, 170,   0, chargeLevel *  55); p.circle(pos.x2, pos.y2, gs * 3.2);
      p.fill(255, 210,  60, chargeLevel * 110); p.circle(pos.x2, pos.y2, gs * 1.5);
      p.fill(255, 255, 200, 215);               p.circle(pos.x2, pos.y2, gs * 0.5);
    } else {
      const br = p.lerp(PINK[0], MINT[0], ct);
      const bg = p.lerp(PINK[1], MINT[1], ct);
      const bb = p.lerp(PINK[2], MINT[2], ct);
      p.fill(br, bg, bb,  50); p.circle(pos.x2, pos.y2, 38);
      p.fill(br, bg, bb, 120); p.circle(pos.x2, pos.y2, 18);
      p.fill(255, 255, 255, 220); p.circle(pos.x2, pos.y2,  5);
    }

    updateUI(mode, chargeLevel);
  };

  function onPressStart() {
    ensureAudio();
    mode        = 'charging';
    pressTime   = p.millis();
    chargeLevel = 0;
    soundChargeStart();
  }

  function onPressEnd(mx, my) {
    if (mode !== 'charging') return;

    const held = p.millis() - pressTime;

    if (held < 260) {
      // TAP: 속도 70% 감쇠 + 방향 전환
      applyImpulse(mx, my, 1.0, 0.70, p);

      const ct = (Math.sin(colorPhase) + 1) / 2;
      const ir = p.lerp(PINK[0], MINT[0], ct);
      const ig = p.lerp(PINK[1], MINT[1], ct);
      const ib = p.lerp(PINK[2], MINT[2], ct);

      soundTap(880 + p.random(-200, 200));
      addRings(mx, my, ir, ig, ib, 2, 205);
      spawnParticles(p, mx, my, ir, ig, ib, 12, 5);
      stopChargeOsc();
      flashTap();

    } else {
      // CHARGE RELEASE: 충전량 기반 폭발 발사
      timeScale = 1.0 + chargeLevel * 1.5;
      const mul = 2.0 + chargeLevel * 7.0;
      applyImpulse(mx, my, mul, 0.0, p);

      soundChargeRelease();
      addRings(mx, my, GOLD[0], GOLD[1], GOLD[2], 6, 225);
      spawnParticles(p, mx, my, GOLD[0], GOLD[1], GOLD[2],
        Math.floor(12 + chargeLevel * 28), 4 + chargeLevel * 7);
    }

    mode        = 'idle';
    chargeLevel = 0;
  }

  // 마우스 (데스크탑)
  p.mousePressed  = () => onPressStart();
  p.mouseReleased = () => onPressEnd(p.mouseX, p.mouseY);

  // 터치 (모바일) — return false 로 스크롤·줌 방지
  p.touchStarted = function() {
    if (p.touches.length > 0) {
      lastTouchX = p.touches[0].x;
      lastTouchY = p.touches[0].y;
    }
    onPressStart();
    return false;
  };

  p.touchMoved = function() {
    if (p.touches.length > 0) {
      lastTouchX = p.touches[0].x;
      lastTouchY = p.touches[0].y;
    }
    return false;
  };

  p.touchEnded = function() {
    onPressEnd(lastTouchX, lastTouchY);
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    clearTrail();
    resetPendulum(p);
  };

});
