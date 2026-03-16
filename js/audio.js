let audioCtx   = null;
let lastNoteAt = 0;

// C 펜타토닉 2옥타브
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00,
                    523.25, 587.33, 659.25, 783.99, 880.00];

export function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

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

// 각도 → 펜타토닉 음계 (진자 방향 전환 시 호출)
export function soundNote(angle) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  if (now - lastNoteAt < 0.18) return; // 너무 빠른 연타 방지
  lastNoteAt = now;

  const norm = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const idx  = Math.floor(norm / (2 * Math.PI) * PENTATONIC.length);
  const freq = PENTATONIC[idx];

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, now);
  o.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.3);
  g.gain.setValueAtTime(0.065, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(now); o.stop(now + 0.4);
}
