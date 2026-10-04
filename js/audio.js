import { env } from './env.js';

const SCALE = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];
const LEAD = [0, 2, 4, 2, 3, 4, 7, 4, 3, 2, 1, 0, 5, 3, 2, 0];
const BASS = [0, 0, 5, 5, 3, 3, 4, 4];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.bgm = null;
    this.volumes = { master: 0.85, sfx: 0.8, bgm: 0.38 };
    this.bossMode = false;
    this.step = 0;
    this.nextNote = 0;
    this.beat = 0.33;
    this._grazeAt = 0;
    this._tickAt = 0;
    this._shootAt = 0;
    this.drone = null;
  }

  setVolumes(v) {
    this.volumes.master = clamp01(v.master);
    this.volumes.sfx = clamp01(v.sfx);
    this.volumes.bgm = clamp01(v.bgm);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
    this.bgm.gain.setTargetAtTime(this.volumes.bgm, t, 0.03);
  }

  unlock() {
    const AC = env.AudioContext || env.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.sfx = ctx.createGain();
      this.bgm = ctx.createGain();
      this.master.connect(ctx.destination);
      this.sfx.connect(this.master);
      this.bgm.connect(this.master);
      this.applyVolumes();
      this.drone = ctx.createOscillator();
      this.droneGain = ctx.createGain();
      this.drone.type = 'sine';
      this.drone.frequency.value = 55;
      this.droneGain.gain.value = 0.045;
      this.drone.connect(this.droneGain);
      this.droneGain.connect(this.bgm);
      this.drone.start();
      this.nextNote = ctx.currentTime + 0.05;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setBossMode(on) {
    this.bossMode = on;
    if (!this.ctx || !this.drone) return;
    const t = this.ctx.currentTime;
    this.drone.frequency.linearRampToValueAtTime(on ? 73.42 : 55, t + 0.35);
    this.droneGain.gain.linearRampToValueAtTime(on ? 0.06 : 0.04, t + 0.35);
  }

  update() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.nextNote < t - 0.25) this.nextNote = t + 0.02;
    let guard = 0;
    while (this.nextNote < t + 0.28 && guard++ < 6) {
      this.schedule(this.nextNote);
      this.nextNote += this.beat;
      this.step += 1;
    }
  }

  schedule(when) {
    const i = this.step % LEAD.length;
    const freq = SCALE[LEAD[i]];
    this.musicNote(freq, when, this.beat * 0.88, 'triangle', this.bossMode ? 0.05 : 0.038);
    if (this.step % 2 === 0) {
      const b = SCALE[BASS[(this.step >> 1) % BASS.length]] / 2;
      this.musicNote(b, when, this.beat * 1.7, 'sine', 0.05);
    }
    if (this.bossMode && this.step % 4 === 0) {
      this.musicNote(freq * 2, when, this.beat * 0.4, 'square', 0.012);
    }
    if (this.step % 2 === 0) this.hat(when);
  }

  musicNote(freq, when, dur, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(this.bossMode ? 1700 : 980, when);
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.bgm);
    o.start(when);
    o.stop(when + dur + 0.03);
  }

  hat(when) {
    const dur = 0.03;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.012, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(g);
    g.connect(this.bgm);
    src.start(when);
  }

  tone(freq, dur, type, gain, when, slideTo) {
    if (!this.ctx) return;
    const t = when ?? this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, gain, hp = 700) {
    if (!this.ctx) return;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t);
  }

  shoot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t < this._shootAt) return;
    this._shootAt = t + 0.06;
    this.tone(760, 0.045, 'triangle', 0.02, t, 280);
  }

  graze() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t < this._grazeAt) return;
    this._grazeAt = t + 0.05;
    this.tone(1460, 0.04, 'sine', 0.03, t);
  }

  tick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (t < this._tickAt) return;
    this._tickAt = t + 0.045;
    this.tone(340, 0.03, 'square', 0.012, t);
  }

  playerHit() {
    this.noise(0.24, 0.22, 400);
    this.tone(190, 0.28, 'sawtooth', 0.05, null, 55);
  }

  explode(big = false) {
    this.noise(big ? 0.4 : 0.16, big ? 0.18 : 0.08, big ? 250 : 600);
    if (big) this.tone(90, 0.35, 'square', 0.04, null, 40);
  }

  pickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(680, 0.05, 'square', 0.028, t);
    this.tone(980, 0.07, 'square', 0.02, t + 0.05);
  }

  bomb() {
    this.noise(0.48, 0.2, 180);
    this.tone(80, 0.55, 'sawtooth', 0.06, null, 640);
    if (this.ctx) this.tone(160, 0.4, 'triangle', 0.04, this.ctx.currentTime + 0.05);
  }

  phase() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [196, 247, 311, 392].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.05, t + i * 0.06));
  }

  ui() {
    this.tone(640, 0.045, 'square', 0.03);
  }

  deny() {
    this.tone(120, 0.09, 'square', 0.04);
  }

  ready() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(880, 0.07, 'sine', 0.04, t);
    this.tone(1320, 0.1, 'sine', 0.03, t + 0.08);
  }

  combo() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(520, 0.06, 'triangle', 0.03, t);
    this.tone(780, 0.08, 'triangle', 0.025, t + 0.05);
  }

  warning() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.tone(150, 0.14, 'sawtooth', 0.045, t + i * 0.18, 70);
  }

  sting(win) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = win ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66, 220];
    notes.forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.05, t + i * 0.11));
  }
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
