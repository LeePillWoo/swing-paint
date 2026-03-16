import { DT, SUBSTEPS, PINK, MINT, CYAN, VIOLET, ORANGE, LIME, RED, AZURE, BG } from './constants.js';
import { ensureAudio, soundTap, soundNote } from './audio.js';
import { resetPendulum, getPos, stepRK4, overrideA1, applyImpulse,
         a1, a1v, a2, a2v, L1, L2,
         cycleEnv, updatePhysicsEnv, envMode,
         cycleMass, massMode, currentM1, currentM2 } from './physics.js';
import { renderHUD, setHudVisible } from './hud.js';
import { pushTrail, clearTrail, renderTrail, renderParticles, renderRings,
         addRings, spawnParticles, cycleTrailStyle, toggleMirror,
         trailStyle } from './effects.js';
import { updateEnergy, getSpeedScale, getTrailScale,
         setMirrorActive, setStyleLabel, setHudActive, setEnvLabel, setMassLabel,
         onMirrorClick, onStyleClick, onHudClick, onEnvClick, onMassClick } from './ui.js';

new p5(function(p) {

  let colorPhase    = 0;
  let mode          = 'idle';   // 'idle' | 'pending' | 'dragging'
  let timeScale     = 1.0;
  let cursorX       = 0;
  let cursorY       = 0;
  let pressX        = 0;   // 눌린 시작 좌표 (탭 vs 드래그 판별용)
  let pressY        = 0;
  let prevDragAngle = 0;
  let dragVelSmooth = 0;

  const DRAG_THRESHOLD = 18;  // px — 이 이상 움직이면 드래그로 확정

  // 에너지 시스템
  let energy = 1.0;           // 0.0 ~ 1.0

  // 멜로디: a2v 부호 전환 감지용
  let prevA2vSign = 0;

  // ── UI 버튼 콜백 ─────────────────────────────────────────────────────────
  onMirrorClick(() => setMirrorActive(toggleMirror()));

  onStyleClick(() => {
    const label = cycleTrailStyle().toUpperCase();
    setStyleLabel(label);
  });

  onHudClick(() => {
    const next = !_hudOn;
    _hudOn = next;
    setHudVisible(next);
    setHudActive(next);
  });

  onEnvClick(()  => setEnvLabel(cycleEnv()));
  onMassClick(() => setMassLabel(cycleMass()));

  let _hudOn = false;

  // ── setup ────────────────────────────────────────────────────────────────
  p.setup = function() {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.colorMode(p.RGB, 255, 255, 255, 255);
    resetPendulum(p);
  };

  // ── draw ─────────────────────────────────────────────────────────────────
  p.draw = function() {
    updatePhysicsEnv();
    p.background(...BG, 255);
    colorPhase += 0.008;

    // 에너지 자연 회복 (초당 +15%)
    energy = Math.min(1.0, energy + 0.15 / 60);

    // 타임스케일 버스트 감쇠 (플릭 릴리즈 후 복귀)
    const rate = timeScale > 1.0 ? 0.04 : 0.06;
    timeScale  = p.lerp(timeScale, 1.0, rate);

    // ── 트레일 색·폭 (서브스텝 루프 전 확정) ─────────────────────────────
    // 8색 사이버 사이클
    let tr, tg, tb, tw;
    const PALETTE = [CYAN, VIOLET, PINK, MINT, ORANGE, LIME, RED, AZURE];
    const cycleT  = (colorPhase % (Math.PI * 2)) / (Math.PI * 2);
    const seg     = Math.floor(cycleT * 8) % 8;
    const st      = (cycleT * 8) % 1;
    const c0 = PALETTE[seg], c1 = PALETTE[(seg + 1) % 8];
    tr = p.lerp(c0[0], c1[0], st);
    tg = p.lerp(c0[1], c1[1], st);
    tb = p.lerp(c0[2], c1[2], st);
    if      (massMode === 'IRON')    { tw = 2.2; }
    else if (massMode === 'FEATHER') { tw = 0.8; }
    else                             { tw = 1.5; }

    // 질량 모드별 잔상 페이드 배율 (슬라이더는 렌더 시 실시간 적용)
    const massFade = massMode === 'IRON' ? 0.5 : massMode === 'FEATHER' ? 2.2 : 1.0;

    // ── 드래그: 커서 각도 추적 + 각속도 계산 ─────────────────────────────
    // pending(눌림) 상태부터 추적 시작 — dragging 확정 전에도 velocity 축적
    let targetDragAngle = 0;
    if (mode === 'dragging' || mode === 'pending') {
      const pos0 = getPos();
      targetDragAngle = Math.atan2(cursorX - pos0.cx, cursorY - pos0.cy);
      let da = targetDragAngle - prevDragAngle;
      if (da >  Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      // 60fps 기준 각속도 (rad/s) → 스무딩
      dragVelSmooth = dragVelSmooth * 0.72 + da * 60 * 0.28;
      prevDragAngle = targetDragAngle;
    }

    // ── 물리 적분 + 서브스텝마다 궤적 누적 ───────────────────────────────
    // DT×SUBSTEPS = 0.008×4 = 0.032 → 기존 0.016×2 와 동일한 시뮬속도 유지
    const spd     = getSpeedScale();
    const isComet = trailStyle === 'comet';
    const fillPx  = isComet ? 20 : 5;  // 코맷은 도트 간격 더 넓게
    let lp = getPos();
    let cometTick = 0;

    for (let i = 0; i < SUBSTEPS; i++) {
      // 드래그 중: a1을 커서 각도로 강제 고정 (사전·사후 둘다 적용)
      if (mode === 'dragging') overrideA1(targetDragAngle, dragVelSmooth);
      const totalDt = DT * timeScale * spd;
      const MAX_DT  = 0.018;
      const subN    = Math.ceil(totalDt / MAX_DT);
      const subDt   = totalDt / subN;
      for (let s = 0; s < subN; s++) stepRK4(subDt);
      // NaN 가드 — 수치 발산 시 리셋
      if (!isFinite(a1v) || !isFinite(a2v)) resetPendulum(p);
      if (mode === 'dragging') overrideA1(targetDragAngle, dragVelSmooth);
      const sp = getPos();

      // 코맷: 서브스텝 4회 중 1회만 push → 기존 대비 2배 간격
      if (isComet && (++cometTick % 4 !== 0)) { lp = sp; continue; }

      // 이동거리 초과 시 선형 보간으로 빈틈 채움
      const ddx = sp.x2 - lp.x2, ddy = sp.y2 - lp.y2;
      const gap = Math.sqrt(ddx * ddx + ddy * ddy);
      if (gap > fillPx) {
        const n = Math.min(Math.ceil(gap / fillPx) - 1, 12);
        for (let j = 1; j <= n; j++) {
          const t = j / (n + 1);
          pushTrail(lp.x2 + ddx * t, lp.y2 + ddy * t, tr, tg, tb, tw, massFade);
        }
      }
      pushTrail(sp.x2, sp.y2, tr, tg, tb, tw, massFade);
      lp = sp;
    }

    const pos = getPos();  // 서브스텝 종료 후 최종 위치

    // ── 멜로디: a2v 부호 전환 시 음계 재생 ───────────────────────────────
    const curSign = Math.sign(a2v);
    if (prevA2vSign !== 0 && curSign !== prevA2vSign && mode === 'idle') {
      soundNote(a2);
    }
    prevA2vSign = curSign;

    // ── 렌더 ─────────────────────────────────────────────────────────────
    renderTrail(p, pos.cx, pos.cy, getTrailScale());
    renderParticles(p);
    renderRings(p);

    // ── 진자 팔 + 조인트 (환경 모드별) ──────────────────────────────────
    drawStructure(p, pos);

    // ── bob2 (질량 모드별) ────────────────────────────────────────────────
    drawBob2(p, pos);

    // ── Telemetry HUD ─────────────────────────────────────────────────────
    renderHUD(p, a1, a2, a1v, a2v, L1, L2, currentM1, currentM2, massMode);

    // ── UI 업데이트 ───────────────────────────────────────────────────────
    updateEnergy(energy);
  };

  // ── bob2 — 질량 모드별 시각 ──────────────────────────────────────────────
  function drawBob2(p, pos) {
    const { x2, y2 } = pos;
    p.noStroke();

    if (massMode === 'IRON') {
      // 무거운 철추 — 크고 묵직한 금속 구체 + 그림자
      const bs = 7 + currentM2 * 0.62;         // M2=22 → bs≈20.6
      // 바닥 그림자 (중력감)
      p.fill(  0,   0,   0,  55); p.ellipse(x2 + bs*0.18, y2 + bs*0.22, bs * 2.0, bs * 0.55);
      // 구체 레이어
      p.fill( 40,  50,  65,  38); p.circle(x2, y2, bs * 4.2); // 넓은 어두운 헤일로
      p.fill( 70,  85, 105, 100); p.circle(x2, y2, bs * 2.4); // 어두운 금속 몸체
      p.fill(115, 135, 158, 215); p.circle(x2, y2, bs);        // 금속 표면
      p.fill(175, 200, 222, 200); p.circle(x2, y2, bs * 0.50); // 밝은 캡
      p.fill(220, 232, 248, 180); p.circle(x2 - bs*0.15, y2 - bs*0.15, bs * 0.22); // 반사광

    } else if (massMode === 'FEATHER') {
      // 가벼운 깃털 — 작고 빛나는 별 (8방향 스파크)
      const bs = 3.5 + currentM2 * 2.2;        // M2=1 → bs≈5.7
      p.fill(255, 255, 200,  28); p.circle(x2, y2, bs * 8);   // 넓고 부드러운 글로우
      p.fill(255, 255, 185,  75); p.circle(x2, y2, bs * 4);   // 중간 글로우
      // 8방향 스파크 (별빛) — 4개 긴 + 4개 짧은
      p.noFill();
      for (let i = 0; i < 8; i++) {
        const a    = i * Math.PI / 4;
        const long = (i % 2 === 0);
        const len  = long ? bs * 5.5 : bs * 3.2;
        const alpha = long ? 110 : 65;
        p.stroke(255, 255, 220, alpha); p.strokeWeight(long ? 0.9 : 0.6);
        p.line(x2, y2, x2 + Math.cos(a)*len, y2 + Math.sin(a)*len);
      }
      p.noStroke();
      p.fill(255, 255, 230, 175); p.circle(x2, y2, bs * 2.2);
      p.fill(255, 255, 255, 250); p.circle(x2, y2, bs * 0.9); // 밝은 핵

    } else {
      // STANDARD — 기존 색상 사이클 구체
      const ct = (Math.sin(colorPhase) + 1) / 2;
      const br = p.lerp(PINK[0], MINT[0], ct);
      const bg = p.lerp(PINK[1], MINT[1], ct);
      const bb = p.lerp(PINK[2], MINT[2], ct);
      p.fill(br, bg, bb,  50); p.circle(x2, y2, 38);
      p.fill(br, bg, bb, 120); p.circle(x2, y2, 18);
      p.fill(255, 255, 255, 220); p.circle(x2, y2,  5);
    }
  }

  // ── 환경 모드별 팔 + 피벗 렌더 (질량 스케일 반영) ────────────────────────
  function drawStructure(p, pos) {
    const { cx, cy, x1, y1, x2, y2 } = pos;
    // 조인트1 크기: 상부 질량에 비례 (FEATHER→6, STANDARD→9.5, IRON→12)
    const j1s = 4.5 + currentM1 * 0.38;

    if (envMode === 'SPACE') {
      p.stroke(140, 190, 255, 140); p.strokeWeight(0.9);
      p.line(cx, cy, x1, y1); p.line(x1, y1, x2, y2);

      // 메인 피벗: 8방향 별
      p.stroke(190, 225, 255, 210); p.strokeWeight(0.9);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4;
        p.line(cx + Math.cos(a) * 2.5, cy + Math.sin(a) * 2.5,
               cx + Math.cos(a) * 9,   cy + Math.sin(a) * 9);
      }
      p.noFill(); p.stroke(180, 220, 255, 60); p.strokeWeight(0.7);
      p.circle(cx, cy, 20);
      p.noStroke(); p.fill(210, 235, 255, 230); p.circle(cx, cy, 3.5);

      // 미드 조인트: 질량 비례 십자
      const cr = j1s * 0.5;
      p.stroke(170, 215, 255, 190); p.strokeWeight(0.8);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        p.line(x1 + Math.cos(a)*cr*0.4, y1 + Math.sin(a)*cr*0.4,
               x1 + Math.cos(a)*cr,      y1 + Math.sin(a)*cr);
      }
      p.noStroke(); p.fill(200, 230, 255, 210); p.circle(x1, y1, cr * 0.55);

    } else if (envMode === 'WATER') {
      p.stroke(30, 155, 175, 190); p.strokeWeight(2.0);
      p.line(cx, cy, x1, y1); p.line(x1, y1, x2, y2);

      // 메인 피벗: 버블
      p.noFill();
      p.stroke(45, 195, 210, 130); p.strokeWeight(1.4); p.circle(cx, cy, 22);
      p.stroke(45, 195, 210,  70); p.strokeWeight(0.8); p.circle(cx, cy, 34);
      p.noStroke(); p.fill(65, 210, 220, 180); p.circle(cx, cy, 8);
      p.fill(200, 245, 255, 120); p.circle(cx - 2, cy - 2, 3);

      // 미드 조인트: 질량 비례 버블
      p.noFill();
      p.stroke(45, 195, 210, 110); p.strokeWeight(1.1); p.circle(x1, y1, j1s * 1.6);
      p.noStroke(); p.fill(65, 210, 220, 170); p.circle(x1, y1, j1s * 0.65);
      p.fill(200, 245, 255, 110); p.circle(x1 - 1.5, y1 - 1.5, 2.5);

    } else {
      // EARTH
      p.stroke(60, 80, 110, 180); p.strokeWeight(1.2);
      p.line(cx, cy, x1, y1); p.line(x1, y1, x2, y2);
      p.noStroke();
      p.fill(120, 140, 160, 200); p.circle(cx, cy, 10);
      p.fill(160, 180, 200, 200); p.circle(x1, y1, j1s);
    }
  }

  // ── 인터랙션 공통 ────────────────────────────────────────────────────────
  function _palette() {
    const PALETTE = [CYAN, VIOLET, PINK, MINT, ORANGE, LIME, RED, AZURE];
    const cycleT  = (colorPhase % (Math.PI * 2)) / (Math.PI * 2);
    return PALETTE[Math.floor(cycleT * 8) % 8];
  }

  function onPressStart() {
    ensureAudio();
    mode  = 'pending';   // 아직 탭/드래그 미결정
    pressX = cursorX;
    pressY = cursorY;
    const pos0 = getPos();
    prevDragAngle = Math.atan2(cursorX - pos0.cx, cursorY - pos0.cy);
    dragVelSmooth = 0;
  }

  // 커서 이동 시 이동거리로 탭→드래그 전환 판별
  function _checkDragThreshold() {
    if (mode !== 'pending') return;
    const dx = cursorX - pressX, dy = cursorY - pressY;
    if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      mode = 'dragging';
    }
  }

  function onPressEnd() {
    if (mode === 'pending') {
      // ── TAP: 짧은 클릭 → 임펄스 충격 ────────────────────────────────
      applyImpulse(cursorX, cursorY, 1.0, 0.45, p);
      const col = _palette();
      soundTap(880 + p.random(-200, 200));
      addRings(cursorX, cursorY, col[0], col[1], col[2], 2, 205);
      spawnParticles(p, cursorX, cursorY, col[0], col[1], col[2], 12, 5);
      energy = Math.max(0, energy - 0.08);

    } else if (mode === 'dragging') {
      // ── FLICK: 드래그 후 릴리즈 → 각속도 주입 ────────────────────────
      overrideA1(a1, dragVelSmooth);
      const flickMag = Math.abs(dragVelSmooth);
      if (flickMag > 0.5) {
        timeScale = 1.0 + Math.min(flickMag * 0.12, 3.0);
        const col = _palette();
        const pos = getPos();
        soundTap(660 + p.random(-150, 150));
        addRings(pos.x2, pos.y2, col[0], col[1], col[2],
          Math.ceil(2 + flickMag * 0.25), 185);
        spawnParticles(p, pos.x2, pos.y2, col[0], col[1], col[2],
          Math.floor(6 + flickMag * 1.8), 2 + flickMag * 0.4);
        energy = Math.max(0, energy - Math.min(flickMag * 0.018, 0.22));
      }
    }

    mode = 'idle';
  }

  // ── 마우스 (데스크탑) ────────────────────────────────────────────────────
  p.mousePressed = function(event) {
    if (isUITouch(event)) return;   // UI 클릭은 캔버스 인터랙션과 완전 분리
    cursorX = p.mouseX; cursorY = p.mouseY;
    onPressStart();
  };
  p.mouseMoved = p.mouseDragged = function() {
    cursorX = p.mouseX; cursorY = p.mouseY;
    _checkDragThreshold();
  };
  p.mouseReleased = (event) => {
    if (isUITouch(event) && mode === 'idle') return;
    onPressEnd();
  };

  // ── 터치 (모바일) ────────────────────────────────────────────────────────
  function isUITouch(event) {
    const el = event && event.target;
    return el && (el.tagName === 'BUTTON' || el.tagName === 'INPUT' ||
                  el.closest('#env-panel, #style-panel, #slider-panel, #ui-bar, #hud-toggle'));
  }

  p.touchStarted = function(event) {
    if (isUITouch(event)) return true;
    if (p.touches.length > 0) {
      cursorX = p.touches[0].x;
      cursorY = p.touches[0].y;
    }
    onPressStart();
    return false;
  };

  p.touchMoved = function(event) {
    if (isUITouch(event)) return true;
    if (p.touches.length > 0) {
      cursorX = p.touches[0].x;
      cursorY = p.touches[0].y;
    }
    _checkDragThreshold();
    return false;
  };

  p.touchEnded = function(event) {
    if (isUITouch(event)) return true;
    onPressEnd();
    return false;
  };

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    clearTrail();
    resetPendulum(p);
  };

});
