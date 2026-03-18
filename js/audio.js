import { envMode, massMode } from './physics.js';

let audioCtx   = null;
let lastNoteAt = 0;
let _chargeNode = null;   // 차지 중 단일 오실레이터 (폴리포니 방지)

// ── 스케일 정의 (2옥타브, 10음) ──────────────────────────────────────────────
const SCALES = {
  PENTA:  [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00],  // C 장조 펜타토닉
  MINOR:  [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99, 932.33],  // C 단조 펜타토닉
  BLUES:  [261.63, 311.13, 349.23, 369.99, 392.00, 466.16, 523.25, 622.25, 739.99, 783.99],  // C 블루스
  CHROMA: [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00],  // C 크로매틱
};
const SCALE_NAMES = ['PENTA', 'BLUES', 'MUTE'];
let scaleMode = 'PENTA';

export function cycleScale() {
  scaleMode = SCALE_NAMES[(SCALE_NAMES.indexOf(scaleMode) + 1) % SCALE_NAMES.length];
  return scaleMode;
}

export function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// ── ENV + MASS 보정 피치 ──────────────────────────────────────────────────────
function getNotePitch(base) {
  let freq = base;
  if      (envMode === 'SPACE') freq *= Math.pow(2,  5 / 12); // +5 반음: ethereal
  else if (envMode === 'WATER') freq *= Math.pow(2, -5 / 12); // -5 반음: muffled
  if      (massMode === 'IRON')    freq *= 0.5;  // 1옥타브 아래: 무거운 울림
  else if (massMode === 'FEATHER') freq *= 2.0;  // 1옥타브 위: 가볍고 높은 음
  return Math.min(freq, 2200);  // 이상음 방지
}

// ── 차지 사운드 (hold 중 매 프레임 호출) ──────────────────────────────────────
export function soundCharge(level) {
  if (!audioCtx) return;
  // 이전 차지 노드 정리
  if (_chargeNode) {
    try { _chargeNode.stop(); } catch(e) {}
    _chargeNode = null;
  }
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(80 + level * 400, t);
  g.gain.setValueAtTime(0.04 + level * 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.10);
  _chargeNode = o;
}

// ── 차지 릴리즈 사운드 (해제 시 1회) ─────────────────────────────────────────
export function soundChargeRelease(level) {
  if (!audioCtx || level < 0.05) return;
  if (_chargeNode) {
    try { _chargeNode.stop(); } catch(e) {}
    _chargeNode = null;
  }
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300 + level * 600, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
  g.gain.setValueAtTime(0.25 * Math.min(level, 1.0), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.34);
}

// ── 탭 / 플릭 충격음 ─────────────────────────────────────────────────────────
export function soundTap(pitch) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.45, t + 0.2);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.26);
}

// ── 펜듈럼 선회 멜로디 ───────────────────────────────────────────────────────
// angle: a2 각도, vel: |a2v|, xNorm: bob x위치 (0~1, 스테레오 패닝)
export function soundNote(angle, vel = 1.0, xNorm = 0.5) {
  if (!audioCtx) return;
  if (scaleMode === 'MUTE') return;  // 진자 멜로디 음소거
  const now = audioCtx.currentTime;

  // SPACE는 에코 잔향 겹침 허용 위해 간격 단축
  const minInterval = envMode === 'SPACE' ? 0.14 : 0.18;
  if (now - lastNoteAt < minInterval) return;
  lastNoteAt = now;

  const scale = SCALES[scaleMode];
  const norm  = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const idx   = Math.floor(norm / (2 * Math.PI) * scale.length);
  const freq  = getNotePitch(scale[idx]);

  // 속도 → 게인
  const velNorm = Math.min(Math.abs(vel) / 4, 1.0);

  // ENV별 파라미터
  let peakGain, decaySec, freqEnd;
  if (envMode === 'SPACE') {
    peakGain = (0.04 + velNorm * 0.07) * 0.8;
    decaySec = 0.6;
    freqEnd  = freq * 0.96;
  } else if (envMode === 'WATER') {
    peakGain = (0.04 + velNorm * 0.07) * 1.35;
    decaySec = 0.16;
    freqEnd  = freq * 0.82;
  } else {
    peakGain = 0.04 + velNorm * 0.07;
    decaySec = 0.38;
    freqEnd  = freq * 0.92;
  }

  // 스테레오 패너 (x 위치 → 좌우)
  const panner = audioCtx.createStereoPanner
    ? audioCtx.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, (xNorm - 0.5) * 1.6));
    panner.connect(audioCtx.destination);
  }
  const outNode = panner || audioCtx.destination;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, now);
  o.frequency.exponentialRampToValueAtTime(freqEnd, now + decaySec);
  g.gain.setValueAtTime(peakGain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

  if (envMode === 'WATER') {
    o.detune.value = -25;
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 320;
    flt.Q.value = 2.2;
    o.connect(flt); flt.connect(g);
  } else {
    o.connect(g);
  }
  g.connect(outNode);
  o.start(now); o.stop(now + decaySec + 0.05);

  // 화음: 5도(완전5도) — 속도 높거나 CHAOS일 때
  if (velNorm > 0.55 || envMode === 'CHAOS') {
    const harmFreq = Math.min(freq * 1.498, 2200);
    const oh = audioCtx.createOscillator();
    const gh = audioCtx.createGain();
    oh.type = 'sine';
    oh.frequency.setValueAtTime(harmFreq, now);
    oh.frequency.exponentialRampToValueAtTime(harmFreq * (freqEnd / freq), now + decaySec);
    gh.gain.setValueAtTime(peakGain * 0.20, now);
    gh.gain.exponentialRampToValueAtTime(0.001, now + decaySec);
    oh.connect(gh); gh.connect(outNode);
    oh.start(now); oh.stop(now + decaySec + 0.05);
  }

  // SPACE 에코
  if (envMode === 'SPACE') {
    const oe = audioCtx.createOscillator();
    const ge = audioCtx.createGain();
    oe.type = 'sine';
    const es = now + 0.3;
    oe.frequency.setValueAtTime(freq * 0.98, es);
    oe.frequency.exponentialRampToValueAtTime(freq * 0.92, es + 0.5);
    ge.gain.setValueAtTime(peakGain * 0.28, es);
    ge.gain.exponentialRampToValueAtTime(0.001, es + 0.5);
    oe.connect(ge); ge.connect(outNode);
    oe.start(es); oe.stop(es + 0.55);
  }
}
