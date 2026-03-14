import { DT, SUBSTEPS, PINK, MINT, GOLD, BG } from './constants.js';
import { ensureAudio, soundTap, soundChargeStart, soundChargeUpdate,
         soundChargeRelease, stopChargeOsc, soundNote } from './audio.js';
import { resetPendulum, getPos, stepRK4, applyImpulse, applySpring,
         a2v, a2, L1, L2, cx, cy } from './physics.js';
import { getPatternTargets, cyclePattern, stopPattern,
         isPatternActive, getPatternLabel } from './patterns.js';
import { pushTrail, clearTrail, renderTrail, renderParticles, renderRings,
         addRings, spawnParticles, cycleTrailStyle, toggleMirror } from './effects.js';
import { updateTargets, renderTargets, getScore, resetTargets } from './targets.js';
import { flashTap, updateChargeUI, updateEnergy, updateScore,
         setMirrorActive, setStyleLabel, setGameActive, flashSave,
         setPatternLabel,
         onMirrorClick, onStyleClick, onGameClick, onSaveClick,
         onPatternClick } from './ui.js';

new p5(function(p) {

  let colorPhase = 0;
  let mode        = 'idle';   // 'idle' | 'charging'
  let pressTime   = 0;
  let chargeLevel = 0;
  let timeScale   = 1.0;
  let cursorX     = 0;        // 마우스/터치 최신 위치
  let cursorY     = 0;

  // 에너지 시스템
  let energy = 1.0;           // 0.0 ~ 1.0

  // 게임 모드
  let gameMode = false;

  // 멜로디: a2v 부호 전환 감지용
  let prevA2vSign = 0;

  // ── UI 버튼 콜백 ─────────────────────────────────────────────────────────
  onMirrorClick(() => setMirrorActive(toggleMirror()));

  onStyleClick(() => {
    const label = cycleTrailStyle().toUpperCase();
    setStyleLabel(label);
  });

  onGameClick(() => {
    gameMode = !gameMode;
    setGameActive(gameMode);
    if (gameMode) resetTargets();
  });

  onSaveClick(() => {
    p.saveCanvas('swing-paint', 'png');
    flashSave();
  });

  onPatternClick(() => {
    cyclePattern();
    const on = isPatternActive();
    setPatternLabel(getPatternLabel(), on);
    if (!on) stopPattern(); // 완전히 끄기
  });

  // ── setup ────────────────────────────────────────────────────────────────
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.colorMode(p.RGB, 255, 255, 255, 255);
    resetPendulum(p);
  };

  // ── draw ─────────────────────────────────────────────────────────────────
  p.draw = function() {
    p.background(...BG, 255);
    colorPhase += 0.008;

    // 에너지 자연 회복 (초당 +15%)
    if (mode !== 'charging') energy = Math.min(1.0, energy + 0.15 / 60);

    // 타임스케일
    if (mode === 'charging') {
      chargeLevel = Math.min((p.millis() - pressTime) / 3000, 1.0);
      timeScale   = p.lerp(timeScale, 0.06, 0.07);
      soundChargeUpdate(chargeLevel);
    } else {
      const rate = timeScale > 1.0 ? 0.04 : 0.06;
      timeScale  = p.lerp(timeScale, 1.0, rate);
    }

    // 물리 적분
    for (let i = 0; i < SUBSTEPS; i++) stepRK4(DT * timeScale);

    // 패턴 모드: IK 스프링으로 진자를 패턴 위에 유도
    if (isPatternActive() && mode === 'idle') {
      const targets = getPatternTargets(cx, cy, L1, L2);
      if (targets) applySpring(targets[0], targets[1], 12.0, 0.28);
    }

    const pos = getPos();
    const ct  = (Math.sin(colorPhase) + 1) / 2;

    // ── 멜로디: a2v 부호 전환 시 음계 재생 ───────────────────────────────
    const curSign = Math.sign(a2v);
    if (prevA2vSign !== 0 && curSign !== prevA2vSign && mode === 'idle') {
      soundNote(a2);
    }
    prevA2vSign = curSign;

    // ── 트레일 색·폭 결정 ─────────────────────────────────────────────────
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

    // ── 렌더 ─────────────────────────────────────────────────────────────
    renderTrail(p, pos.cx, pos.cy);
    renderParticles(p);
    renderRings(p);

    // ── 게임 모드: 타겟 링 ────────────────────────────────────────────────
    if (gameMode) {
      const hit = updateTargets(p, pos.x2, pos.y2);
      if (hit) {
        const hr = p.lerp(PINK[0], MINT[0], ct);
        const hg = p.lerp(PINK[1], MINT[1], ct);
        const hb = p.lerp(PINK[2], MINT[2], ct);
        addRings(pos.x2, pos.y2, hr, hg, hb, 3, 200);
        spawnParticles(p, pos.x2, pos.y2, hr, hg, hb, 10, 4.5);
        soundTap(600 + Math.random() * 280);
      }
      renderTargets(p);
    }

    // ── 진자 팔 ───────────────────────────────────────────────────────────
    p.stroke(60, 80, 110, 180);
    p.strokeWeight(1.2);
    p.line(pos.cx,  pos.cy,  pos.x1, pos.y1);
    p.line(pos.x1, pos.y1,  pos.x2, pos.y2);

    // ── 조인트 ────────────────────────────────────────────────────────────
    p.noStroke();
    p.fill(120, 140, 160, 200); p.circle(pos.cx,  pos.cy,  10);
    p.fill(160, 180, 200, 200); p.circle(pos.x1, pos.y1,  10);

    // ── bob2 ──────────────────────────────────────────────────────────────
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

    // ── 조준 화살표 (충전 중) ─────────────────────────────────────────────
    if (mode === 'charging') drawAimArrow(p, pos.x2, pos.y2);

    // ── UI 업데이트 ───────────────────────────────────────────────────────
    updateChargeUI(mode, chargeLevel);
    updateEnergy(energy);
    updateScore(getScore(), gameMode);
  };

  // ── 조준 화살표 ──────────────────────────────────────────────────────────
  function drawAimArrow(p, bx, by) {
    const dx = bx - cursorX, dy = by - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;

    const nx = dx / dist, ny = dy / dist;
    const len = 55 + chargeLevel * 45;
    const ex = bx + nx * len, ey = by + ny * len;

    // 점선
    p.push();
    p.stroke(255, 255, 255, 55 + chargeLevel * 90);
    p.strokeWeight(1.2);
    p.drawingContext.setLineDash([6, 5]);
    p.line(cursorX, cursorY, ex, ey);
    p.drawingContext.setLineDash([]);
    p.pop();

    // 화살촉
    const hs    = 8 + chargeLevel * 6;
    const angle = Math.atan2(ny, nx);
    p.push();
    p.translate(ex, ey);
    p.rotate(angle);
    p.noStroke();
    p.fill(255, 255, 255, 120 + chargeLevel * 110);
    p.triangle(hs, 0, -hs * 0.6, hs * 0.55, -hs * 0.6, -hs * 0.55);
    p.pop();
  }

  // ── 인터랙션 공통 ────────────────────────────────────────────────────────
  function onPressStart() {
    ensureAudio();
    if (energy < 0.06) return; // 에너지 부족
    mode        = 'charging';
    pressTime   = p.millis();
    chargeLevel = 0;
    soundChargeStart();
  }

  function onPressEnd(mx, my) {
    if (mode !== 'charging') return;
    const held = p.millis() - pressTime;

    if (held < 260) {
      // TAP
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
      energy = Math.max(0, energy - 0.08);

    } else {
      // CHARGE RELEASE
      timeScale = 1.0 + chargeLevel * 1.5;
      const mul = 2.0 + chargeLevel * 7.0;
      applyImpulse(mx, my, mul, 0.0, p);
      soundChargeRelease();
      addRings(mx, my, GOLD[0], GOLD[1], GOLD[2], 6, 225);
      spawnParticles(p, mx, my, GOLD[0], GOLD[1], GOLD[2],
        Math.floor(12 + chargeLevel * 28), 4 + chargeLevel * 7);
      energy = Math.max(0, energy - chargeLevel * 0.28);
    }

    mode        = 'idle';
    chargeLevel = 0;
  }

  // ── 마우스 (데스크탑) ────────────────────────────────────────────────────
  p.mousePressed = function() {
    cursorX = p.mouseX; cursorY = p.mouseY;
    onPressStart();
  };
  p.mouseMoved = p.mouseDragged = function() {
    cursorX = p.mouseX; cursorY = p.mouseY;
  };
  p.mouseReleased = () => onPressEnd(p.mouseX, p.mouseY);

  // ── 터치 (모바일) ────────────────────────────────────────────────────────
  p.touchStarted = function() {
    if (p.touches.length > 0) {
      cursorX = p.touches[0].x;
      cursorY = p.touches[0].y;
    }
    onPressStart();
    return false;
  };

  p.touchMoved = function() {
    if (p.touches.length > 0) {
      cursorX = p.touches[0].x;
      cursorY = p.touches[0].y;
    }
    return false;
  };

  p.touchEnded = function() {
    onPressEnd(cursorX, cursorY);
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    clearTrail();
    resetPendulum(p);
  };

});
