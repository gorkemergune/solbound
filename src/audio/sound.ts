// Solbound sound: original music and effects synthesised live with the Web Audio API (no audio files, no
// third-party music). UI layer only; the game engine never touches it.
//
// Browsers only allow sound after a user gesture, so the AudioContext is created on the first click or key
// press. Everything fails silently: no Web Audio, blocked storage or a suspended context just means no sound.

export type TrackId = 'title' | 'moon' | 'mars' | 'home';
export type SfxId = 'launch' | 'depart' | 'land' | 'event' | 'alert' | 'success' | 'fail' | 'countdown';
export type SoundSettings = { muted: boolean; music: number; sfx: number };

const STORE_KEY = 'solbound.sound.v1';
const DEFAULTS: SoundSettings = { muted: false, music: 0.5, sfx: 0.7 };

// ---------------- settings (shared with React through a tiny store) ----------------

function loadSettings(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<SoundSettings>) : {};
    const num = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
    return { muted: s.muted === true, music: num(s.music, DEFAULTS.music), sfx: num(s.sfx, DEFAULTS.sfx) };
  } catch {
    return { ...DEFAULTS };
  }
}

let settings: SoundSettings = typeof window === 'undefined' ? { ...DEFAULTS } : loadSettings();
const listeners = new Set<() => void>();

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSoundSettings(patch: Partial<SoundSettings>) {
  settings = { ...settings, ...patch };
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  applyLevels();
  listeners.forEach((fn) => fn());
}

// ---------------- audio graph ----------------

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  duck: GainNode;
  sfx: GainNode;
  /** one reverb per bus, so the volume sliders and mute also cover the echo */
  verbMusic: ConvolverNode;
  verbSfx: ConvolverNode;
  noise: AudioBuffer;
};

let g: Graph | null = null;
let unlocked = false;

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  // brown-ish noise: a deep rocket rumble rather than hiss
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function ensureGraph(): Graph | null {
  if (g) return g;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    const music = ctx.createGain();
    const duck = ctx.createGain();
    music.connect(duck).connect(master);
    const sfx = ctx.createGain();
    sfx.connect(master);
    const impulse = makeImpulse(ctx, 3.2, 2.6);
    const verb = (bus: GainNode) => {
      const c = ctx.createConvolver();
      c.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.32;
      c.connect(wet).connect(bus);
      return c;
    };
    g = { ctx, master, music, duck, sfx, verbMusic: verb(music), verbSfx: verb(sfx), noise: makeNoise(ctx) };
    applyLevels();
    return g;
  } catch {
    return null;
  }
}

function applyLevels() {
  if (!g) return;
  const t = g.ctx.currentTime;
  const on = settings.muted ? 0 : 1;
  // music sits well under the effects; a slider at 50% is a quiet background
  g.music.gain.setTargetAtTime(on * settings.music * 1.5, t, 0.08);
  g.sfx.gain.setTargetAtTime(on * settings.sfx * 0.9, t, 0.05);
}

/** connect a voice to a bus and (partly) to the shared reverb */
function out(node: AudioNode, bus: AudioNode, send = 0.4) {
  node.connect(bus);
  if (g && send > 0) {
    const s = g.ctx.createGain();
    s.gain.value = send;
    node.connect(s).connect(bus === g.sfx ? g.verbSfx : g.verbMusic);
  }
}

function env(param: AudioParam, t: number, peak: number, attack: number, hold: number, release: number) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.setValueAtTime(peak, t + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

function osc(type: OscillatorType, freq: number, t: number, stop: number, detune = 0): OscillatorNode {
  const o = g!.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

// ---------------- instruments ----------------

function pad(bus: AudioNode, notes: number[], t: number, dur: number, vol: number, cutoff: number) {
  const ctx = g!.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  f.Q.value = 0.4;
  const a = ctx.createGain();
  env(a.gain, t, vol, Math.min(1.6, dur * 0.35), Math.max(0, dur - 1.6), 2.2);
  f.connect(a);
  out(a, bus, 0.55);
  for (const n of notes) for (const d of [-7, 7]) osc('sawtooth', midi(n), t, t + dur + 2.4, d).connect(f);
}

function organ(bus: AudioNode, note: number, t: number, dur: number, vol: number) {
  const ctx = g!.ctx;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.03, dur * 0.4, dur * 0.9 + 0.3);
  out(a, bus, 0.6);
  osc('sine', midi(note), t, t + dur * 1.5 + 0.4).connect(a);
  const h = ctx.createGain();
  h.gain.value = 0.35;
  osc('triangle', midi(note + 12), t, t + dur * 1.5 + 0.4).connect(h).connect(a);
}

function bell(bus: AudioNode, note: number, t: number, vol: number, length = 2.6) {
  const ctx = g!.ctx;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.005, 0, length);
  out(a, bus, 0.7);
  osc('sine', midi(note), t, t + length + 0.1).connect(a);
  const p = ctx.createGain();
  p.gain.value = 0.25;
  osc('sine', midi(note) * 2.76, t, t + length * 0.5).connect(p).connect(a);
}

function lead(bus: AudioNode, note: number, t: number, dur: number, vol: number) {
  const ctx = g!.ctx;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.12, dur * 0.7, 0.9);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2400;
  f.connect(a);
  out(a, bus, 0.65);
  const o = osc('triangle', midi(note), t, t + dur + 1.1);
  const lfo = osc('sine', 5.2, t, t + dur + 1.1);
  const depth = ctx.createGain();
  depth.gain.value = 6; // cents of vibrato
  lfo.connect(depth).connect(o.detune);
  o.connect(f);
}

function bass(bus: AudioNode, note: number, t: number, dur: number, vol: number) {
  const ctx = g!.ctx;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.02, dur * 0.5, dur * 0.6 + 0.1);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  f.connect(a);
  out(a, bus, 0.1);
  osc('triangle', midi(note), t, t + dur + 0.3).connect(f);
}

// ---------------- music (original compositions) ----------------

type Chord = { root: number; pad: number[] };
type TrackDef = {
  bpm: number;
  beatsPerChord: number;
  chords: Chord[];
  padVol: number;
  padCutoff: number;
  /** chord-tone indices for each eighth note of a chord (organ arpeggio) */
  arp?: { pattern: number[]; vol: number; octave: number };
  /** [beat within the loop, midi note, length in beats] */
  melody?: [number, number, number][];
  melodyVol?: number;
  /** random pentatonic bells over the pad (cold, sparse) */
  bells?: { scale: number[]; chance: number; vol: number };
  /** pulsing bass eighths on the chord root */
  pulse?: { vol: number };
};

// D minor theme: i – VI – III – VII. The "Solbound" motif rises like a launch and settles.
const THEME_CHORDS: Chord[] = [
  { root: 38, pad: [50, 57, 62, 65] }, // Dm
  { root: 34, pad: [46, 53, 58, 62] }, // Bb
  { root: 41, pad: [53, 57, 60, 65] }, // F
  { root: 36, pad: [48, 55, 60, 64] }, // C
];

const TRACKS: Record<TrackId, TrackDef> = {
  title: {
    bpm: 66,
    beatsPerChord: 4,
    chords: THEME_CHORDS,
    padVol: 0.05,
    padCutoff: 1100,
    arp: { pattern: [0, 1, 2, 3, 2, 1, 2, 3], vol: 0.06, octave: 12 },
    melody: [
      [0, 74, 1.5], [1.5, 77, 0.5], [2, 76, 2],
      [4, 74, 1.5], [5.5, 72, 0.5], [6, 69, 2],
      [8, 72, 1.5], [9.5, 74, 0.5], [10, 77, 1.5], [11.5, 79, 0.5],
      [12, 76, 4],
      [16, 81, 1.5], [17.5, 79, 0.5], [18, 77, 2],
      [20, 74, 1.5], [21.5, 77, 0.5], [22, 74, 2],
      [24, 72, 2], [26, 74, 1], [27, 76, 1],
      [28, 74, 4],
    ],
    melodyVol: 0.07,
  },
  moon: {
    bpm: 54,
    beatsPerChord: 8,
    chords: [
      { root: 40, pad: [52, 59, 64, 67] }, // Em
      { root: 36, pad: [48, 55, 59, 64] }, // Cmaj7-ish
      { root: 43, pad: [55, 59, 62, 67] }, // G
      { root: 38, pad: [50, 57, 62, 66] }, // D
    ],
    padVol: 0.045,
    padCutoff: 800,
    bells: { scale: [76, 79, 81, 83, 86, 88, 91], chance: 0.32, vol: 0.06 },
  },
  mars: {
    bpm: 72,
    beatsPerChord: 8,
    chords: [
      { root: 33, pad: [45, 52, 57, 60] }, // Am
      { root: 33, pad: [45, 52, 54, 60] }, // Am6 (dorian colour)
      { root: 31, pad: [43, 50, 55, 59] }, // G
      { root: 29, pad: [41, 48, 53, 57] }, // F
    ],
    padVol: 0.05,
    padCutoff: 950,
    pulse: { vol: 0.09 },
    arp: { pattern: [0, 2, 1, 3, 0, 2, 3, 2], vol: 0.035, octave: 12 },
  },
  home: {
    bpm: 70,
    beatsPerChord: 4,
    chords: [
      { root: 41, pad: [53, 57, 60, 65] }, // F
      { root: 43, pad: [55, 59, 62, 67] }, // G
      { root: 45, pad: [57, 60, 64, 69] }, // Am
      { root: 48, pad: [55, 60, 64, 67] }, // C
    ],
    padVol: 0.05,
    padCutoff: 1400,
    arp: { pattern: [0, 1, 2, 3, 2, 3, 1, 2], vol: 0.05, octave: 12 },
    melody: [
      [0, 77, 1.5], [1.5, 76, 0.5], [2, 72, 2],
      [4, 74, 1.5], [5.5, 76, 0.5], [6, 79, 2],
      [8, 81, 2], [10, 79, 1], [11, 76, 1],
      [12, 79, 4],
    ],
    melodyVol: 0.07,
  },
};

type Playing = { id: TrackId; gain: GainNode; beat: number; nextAt: number; timer: number; rand: number };

let playing: Playing | null = null;
let wanted: TrackId | null = null;

function rnd(p: Playing): number {
  // small LCG so the bells vary but cost nothing
  p.rand = (p.rand * 1664525 + 1013904223) >>> 0;
  return p.rand / 4294967296;
}

function scheduleBeat(p: Playing, def: TrackDef, t: number) {
  const beatLen = 60 / def.bpm;
  const loopBeats = def.beatsPerChord * def.chords.length;
  const inLoop = p.beat % loopBeats;
  const chord = def.chords[Math.floor(inLoop / def.beatsPerChord)];
  const bus = p.gain;
  if (inLoop % def.beatsPerChord === 0) pad(bus, chord.pad, t, def.beatsPerChord * beatLen, def.padVol, def.padCutoff);
  if (def.arp) {
    for (let e = 0; e < 2; e++) {
      const step = ((inLoop % def.beatsPerChord) * 2 + e) % def.arp.pattern.length;
      const note = chord.pad[def.arp.pattern[step] % chord.pad.length] + def.arp.octave;
      organ(bus, note, t + e * beatLen * 0.5, beatLen * 0.5, def.arp.vol);
    }
  }
  if (def.pulse) for (let e = 0; e < 2; e++) bass(bus, chord.root + 12, t + e * beatLen * 0.5, beatLen * 0.45, def.pulse.vol * (e ? 0.6 : 1));
  if (def.melody) {
    const melLoop = def.melody.reduce((m, [b, , l]) => Math.max(m, b + l), 0);
    const loopLen = Math.ceil(melLoop / loopBeats) * loopBeats;
    const pos = p.beat % loopLen;
    for (const [b, n, l] of def.melody) if (b >= pos && b < pos + 1) lead(bus, n, t + (b - pos) * beatLen, l * beatLen, def.melodyVol ?? 0.06);
  }
  if (def.bells && rnd(p) < def.bells.chance) {
    const n = def.bells.scale[Math.floor(rnd(p) * def.bells.scale.length)];
    bell(bus, n, t + (rnd(p) < 0.5 ? 0 : beatLen * 0.5), def.bells.vol * (0.6 + rnd(p) * 0.4), 3.4);
  }
}

function startTrack(id: TrackId) {
  if (!g) return;
  const ctx = g.ctx;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
  gain.connect(g.music);
  const p: Playing = { id, gain, beat: 0, nextAt: ctx.currentTime + 0.1, timer: 0, rand: 12345 };
  const def = TRACKS[id];
  const tick = () => {
    if (!g) return;
    while (p.nextAt < g.ctx.currentTime + 0.6) {
      scheduleBeat(p, def, p.nextAt);
      p.nextAt += 60 / def.bpm;
      p.beat++;
    }
  };
  tick();
  p.timer = window.setInterval(tick, 150);
  playing = p;
}

function stopTrack(fade = 1.6) {
  if (!g || !playing) return;
  const p = playing;
  playing = null;
  window.clearInterval(p.timer);
  const t = g.ctx.currentTime;
  p.gain.gain.cancelScheduledValues(t);
  p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
  p.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  window.setTimeout(() => p.gain.disconnect(), (fade + 4) * 1000);
}

/** which music should play; it starts as soon as sound is unlocked */
export function setTrack(id: TrackId | null) {
  wanted = id;
  if (!g || !unlocked) return;
  if (playing?.id === id) return;
  stopTrack();
  if (id) startTrack(id);
}

/** lower the music for a few seconds (launch, landing) */
function duck(seconds: number, level = 0.25) {
  if (!g) return;
  const t = g.ctx.currentTime;
  g.duck.gain.cancelScheduledValues(t);
  g.duck.gain.setTargetAtTime(level, t, 0.2);
  g.duck.gain.setTargetAtTime(1, t + seconds, 1.2);
}

// ---------------- sound effects ----------------

function noiseBurst(t: number, dur: number, from: number, to: number, vol: number, attack: number) {
  const ctx = g!.ctx;
  const src = ctx.createBufferSource();
  src.buffer = g!.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, from * 0.8), t + dur);
  const a = ctx.createGain();
  env(a.gain, t, vol, attack, dur * 0.3, dur * 0.7 - attack);
  src.connect(f).connect(a);
  out(a, g!.sfx, 0.25);
  src.start(t);
  src.stop(t + dur + 0.2);
}

/** trailer-style low brass hit with an opening filter */
function braam(t: number, vol: number, notes = [26, 33, 38, 41, 45]) {
  const ctx = g!.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(120, t);
  f.frequency.exponentialRampToValueAtTime(1900, t + 0.45);
  f.frequency.exponentialRampToValueAtTime(260, t + 3.6);
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.07, 0.6, 3.4);
  f.connect(a);
  out(a, g!.sfx, 0.5);
  for (const n of notes) for (const d of [-9, 0, 9]) osc('sawtooth', midi(n), t, t + 4.4, d).connect(f);
}

function beep(t: number, freq: number, dur: number, vol: number, type: OscillatorType = 'square') {
  const ctx = g!.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2600;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.005, dur, 0.06);
  f.connect(a);
  out(a, g!.sfx, 0.2);
  osc(type, freq, t, t + dur + 0.1).connect(f);
}

/** sub-bass drop: the "boom" under a trailer hit */
function boom(t: number, vol: number, from = 70, to = 28, len = 1.6) {
  const ctx = g!.ctx;
  const a = ctx.createGain();
  env(a.gain, t, vol, 0.01, 0.1, len);
  out(a, g!.sfx, 0.2);
  const o = osc('sine', from, t, t + len + 0.3);
  o.frequency.exponentialRampToValueAtTime(to, t + len * 0.8);
  o.connect(a);
}

/** rising tension: a pitch-climbing saw cluster and an opening noise sweep that cut off right at the hit */
function riser(t: number, len: number, vol: number) {
  const ctx = g!.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(4200, t + len);
  const a = ctx.createGain();
  a.gain.setValueAtTime(0.0001, t);
  a.gain.exponentialRampToValueAtTime(vol, t + len - 0.05);
  a.gain.linearRampToValueAtTime(0.0001, t + len + 0.04);
  f.connect(a);
  out(a, g!.sfx, 0.35);
  for (const [n, d] of [[50, -8], [57, 8], [62, 0]] as const) {
    const o = osc('sawtooth', midi(n), t, t + len + 0.1, d);
    o.frequency.exponentialRampToValueAtTime(midi(n + 12), t + len);
    o.connect(f);
  }
  const src = ctx.createBufferSource();
  src.buffer = g!.noise;
  src.loop = true;
  src.connect(f);
  src.start(t);
  src.stop(t + len + 0.1);
}

/** a bright brass swell that resolves the launch (D major) */
function swell(t: number, vol: number) {
  const ctx = g!.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(2600, t + 1.8);
  const a = ctx.createGain();
  env(a.gain, t, vol, 1.6, 0.8, 2.6);
  f.connect(a);
  out(a, g!.sfx, 0.7);
  for (const n of [50, 57, 62, 66, 69, 74]) for (const d of [-7, 7]) osc('sawtooth', midi(n), t, t + 5.2, d).connect(f);
}

const SFX: Record<SfxId, (t: number) => void> = {
  // a short movie-trailer launch: 3-2-1, a climbing riser, ignition (BRAAAM + boom + rumble),
  // a second BRAAAM a step higher, then a bright brass swell as the rocket clears the pad
  launch: (t) => {
    duck(10, 0.15);
    beep(t, 880, 0.09, 0.12);
    beep(t + 0.6, 880, 0.09, 0.12);
    beep(t + 1.2, 1320, 0.22, 0.14);
    riser(t + 0.3, 1.9, 0.09);
    const ign = t + 2.2;
    boom(ign, 0.5);
    braam(ign, 0.12);
    noiseBurst(ign, 8, 60, 700, 0.45, 1.2);
    boom(ign + 1.9, 0.38, 60, 26);
    braam(ign + 1.9, 0.1, [28, 35, 40, 43, 47]);
    swell(ign + 3.6, 0.05);
  },
  depart: (t) => {
    duck(6);
    noiseBurst(t, 5.5, 70, 480, 0.5, 1.6);
    braam(t + 0.3, 0.11, [29, 36, 41, 45, 48]);
  },
  land: (t) => {
    duck(3, 0.4);
    noiseBurst(t, 2.2, 600, 120, 0.5, 0.15);
    const ctx = g!.ctx;
    const a = ctx.createGain();
    env(a.gain, t + 1.3, 0.55, 0.01, 0.05, 0.7);
    out(a, g!.sfx, 0.3);
    const o = osc('sine', 95, t + 1.3, t + 2.3);
    o.frequency.exponentialRampToValueAtTime(38, t + 1.8);
    o.connect(a);
  },
  event: (t) => {
    bell(g!.sfx, 76, t, 0.12, 1.8);
    bell(g!.sfx, 83, t + 0.16, 0.1, 2.2);
  },
  alert: (t) => {
    for (let i = 0; i < 4; i++) beep(t + i * 0.32, i % 2 ? 660 : 880, 0.16, 0.07);
  },
  success: (t) => {
    [72, 76, 79, 84].forEach((n, i) => bell(g!.sfx, n, t + i * 0.09, 0.09, 1.6));
  },
  fail: (t) => {
    const ctx = g!.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const a = ctx.createGain();
    env(a.gain, t, 0.09, 0.03, 0.25, 1.2);
    f.connect(a);
    out(a, g!.sfx, 0.4);
    for (const n of [45, 48, 51]) osc('sawtooth', midi(n), t, t + 1.6, -6).connect(f);
  },
  countdown: (t) => {
    for (let i = 0; i < 3; i++) beep(t + i * 0.14, 1250, 0.05, 0.06, 'sine');
  },
};

export function playSfx(id: SfxId) {
  if (!g || !unlocked || settings.muted || settings.sfx <= 0) return;
  try {
    SFX[id](g.ctx.currentTime + 0.03);
  } catch {
    /* a failed effect must never break the game */
  }
}

// ---------------- unlock on the first gesture ----------------

export function installSoundUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const graph = ensureGraph();
    if (!graph) return;
    void graph.ctx.resume().catch(() => undefined);
    if (!unlocked) {
      unlocked = true;
      if (wanted) setTrack(wanted);
    }
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  // save battery and CPU when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!g || !unlocked) return;
    if (document.hidden) void g.ctx.suspend().catch(() => undefined);
    else void g.ctx.resume().catch(() => undefined);
  });
}
