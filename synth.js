// Drum voices synthesised with the Web Audio API — no sample files needed.

let ctx;
let master;

export function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createDynamicsCompressor();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noiseBuffer(context) {
  const length = context.sampleRate;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

let cachedNoise;
function noise(context) {
  cachedNoise ??= noiseBuffer(context);
  const source = context.createBufferSource();
  source.buffer = cachedNoise;
  return source;
}

function envelope(context, peak, decay, time) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
  return gain;
}

function tone(context, { type = "sine", from, to, decay, peak = 1 }, time) {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, time);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, time + decay);
  const gain = envelope(context, peak, decay, time);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + decay + 0.05);
}

function filteredNoise(context, { filter, frequency, decay, peak = 1, q = 1 }, time) {
  const source = noise(context);
  const biquad = context.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = frequency;
  biquad.Q.value = q;
  const gain = envelope(context, peak, decay, time);
  source.connect(biquad).connect(gain).connect(master);
  source.start(time);
  source.stop(time + decay + 0.05);
}

export const VOICES = {
  kick: (c, t) => tone(c, { from: 150, to: 40, decay: 0.45, peak: 1.2 }, t),
  snare: (c, t) => {
    filteredNoise(c, { filter: "highpass", frequency: 1200, decay: 0.2, peak: 0.8 }, t);
    tone(c, { type: "triangle", from: 220, to: 120, decay: 0.12, peak: 0.6 }, t);
  },
  hihat: (c, t) => filteredNoise(c, { filter: "highpass", frequency: 7000, decay: 0.06, peak: 0.5 }, t),
  openhat: (c, t) => filteredNoise(c, { filter: "highpass", frequency: 6500, decay: 0.35, peak: 0.4 }, t),
  clap: (c, t) => {
    for (const offset of [0, 0.012, 0.024]) {
      filteredNoise(c, { filter: "bandpass", frequency: 1500, decay: 0.08, peak: 0.7, q: 0.8 }, t + offset);
    }
  },
  tom: (c, t) => tone(c, { from: 220, to: 90, decay: 0.35, peak: 0.9 }, t),
  rim: (c, t) => tone(c, { type: "square", from: 1700, decay: 0.03, peak: 0.35 }, t),
  cowbell: (c, t) => {
    tone(c, { type: "square", from: 540, decay: 0.3, peak: 0.18 }, t);
    tone(c, { type: "square", from: 800, decay: 0.3, peak: 0.18 }, t);
  },
};

export function play(voice, time) {
  const context = audio();
  VOICES[voice](context, time ?? context.currentTime);
}
