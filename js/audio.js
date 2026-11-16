// Tiny WebAudio synth — every sound is tied to a visible event.

let ctx = null;
let master = null;
let enabled = true;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setSound(on) { enabled = on; }
export function soundOn() { return enabled; }

function tone(freq, dur, type = "sine", vol = 1, slideTo = null, when = 0) {
  if (!enabled) return;
  const c = ensure();
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.6) {
  if (!enabled) return;
  const c = ensure();
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  const f = c.createBiquadFilter();
  f.type = "highpass"; f.frequency.value = 1200;
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
}

export const sfx = {
  pop()     { tone(540, 0.07, "sine", 0.5, 760); },
  toggle()  { tone(340, 0.06, "triangle", 0.4, 480); },
  shutter() { noise(0.09, 0.7); tone(1400, 0.05, "square", 0.2, 700, 0.02); },
  beep()    { tone(660, 0.12, "sine", 0.6); },
  go()      { tone(990, 0.22, "sine", 0.7); },
  recStart(){ tone(440, 0.1, "sine", 0.6, 660); tone(660, 0.14, "sine", 0.5, 880, 0.1); },
  recStop() { tone(880, 0.1, "sine", 0.6, 440); tone(440, 0.16, "sine", 0.5, 330, 0.1); },
  sparkle() { tone(1200, 0.08, "sine", 0.35, 1800); tone(1600, 0.1, "sine", 0.25, 2400, 0.05); },
  dice()    { tone(300, 0.05, "square", 0.25, 500); tone(500, 0.05, "square", 0.25, 800, 0.06); tone(800, 0.08, "square", 0.25, 1200, 0.12); },
  error()   { tone(220, 0.18, "sawtooth", 0.3, 160); },
};