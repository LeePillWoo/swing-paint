import { envMode, massMode } from './physics.js';

let audioCtx   = null;
let lastNoteAt = 0;

// C 펜타토닉 2옥타브
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00,
                    523.25, 587.33, 659.25, 783.99, 880.00];

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
// angle: a2 각도, vel: |a2v| (속도 → 게인 표현력)
export function soundNote(angle, vel = 1.0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // SPACE는 에코 잔향 겹침 허용 위해 간격 단축
  const minInterval = envMode === 'SPACE' ? 0.14 : 0.18;
  if (now - lastNoteAt < minInterval) return;
  lastNoteAt = now;

  const norm = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const idx  = Math.floor(norm / (2 * Math.PI) * PENTATONIC.length);
  const freq = getNotePitch(PENTATONIC[idx]);

  // 속도 → 게인 (조용히 흔들릴 때는 속삭이듯, 빠를 때는 또렷하게)
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
  } else {  // EARTH
    peakGain = 0.04 + velNorm * 0.07;
    decaySec = 0.38;
    freqEnd  = freq * 0.92;
  }

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, now);
  o.frequency.exponentialRampToValueAtTime(freqEnd, now + decaySec);
  g.gain.setValueAtTime(peakGain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

  if (envMode === 'WATER') {
    // 저역통과 필터 — 수중 먹먹함 (낮은 컷오프 + 공명으로 수압감)
    o.detune.value = -25;  // 약간 플랫 — 수중 음속 차이감
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 320;
    flt.Q.value = 2.2;
    o.connect(flt); flt.connect(g);
  } else {
    o.connect(g);
  }
  g.connect(audioCtx.destination);
  o.start(now); o.stop(now + decaySec + 0.05);

  // SPACE 단일 에코 — 0.3초 후 잔향
  if (envMode === 'SPACE') {
    const oe = audioCtx.createOscillator();
    const ge = audioCtx.createGain();
    oe.type = 'sine';
    const es = now + 0.3;
    oe.frequency.setValueAtTime(freq * 0.98, es);
    oe.frequency.exponentialRampToValueAtTime(freq * 0.92, es + 0.5);
    ge.gain.setValueAtTime(peakGain * 0.28, es);
    ge.gain.exponentialRampToValueAtTime(0.001, es + 0.5);
    oe.connect(ge); ge.connect(audioCtx.destination);
    oe.start(es); oe.stop(es + 0.55);
  }
}
