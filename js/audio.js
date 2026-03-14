let audioCtx   = null;
let chargeOsc  = null;
let chargeGain = null;

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

export function soundChargeStart() {
  if (!audioCtx) return;
  if (chargeOsc) { try { chargeOsc.stop(); } catch(e){} chargeOsc = null; }
  const t = audioCtx.currentTime;
  chargeOsc  = audioCtx.createOscillator();
  chargeGain = audioCtx.createGain();
  chargeOsc.type = 'sawtooth';
  chargeOsc.frequency.setValueAtTime(55, t);
  chargeGain.gain.setValueAtTime(0, t);
  chargeGain.gain.linearRampToValueAtTime(0.11, t + 0.25);
  chargeOsc.connect(chargeGain);
  chargeGain.connect(audioCtx.destination);
  chargeOsc.start(t);
}

export function soundChargeUpdate(lvl) {
  if (!chargeOsc) return;
  chargeOsc.frequency.setValueAtTime(55 + lvl * 240, audioCtx.currentTime);
}

export function soundChargeRelease() {
  if (chargeOsc) {
    const t = audioCtx.currentTime;
    chargeGain.gain.setValueAtTime(chargeGain.gain.value, t);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    try { chargeOsc.stop(t + 0.18); } catch(e){}
    chargeOsc = null; chargeGain = null;
  }
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(360, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.55);
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.6);
}

export function stopChargeOsc() {
  if (chargeOsc) { try { chargeOsc.stop(); } catch(e){} chargeOsc = null; }
}
