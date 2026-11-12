/* ==========================================================================
   Sound engine.
   - If SITE.audio is set, plays that file (his own mix) through an analyser.
   - Otherwise plays a built-in deep-house groove synthesised live with
     WebAudio (kick, hats, clap, sub-bass, pad) so the site breathes in sync.
   Exposes `level` (0..1 smoothed low-end energy) and `kick` (0..1 envelope)
   for the visuals to react to.
   ========================================================================== */

export class Sound {
  constructor({ bpm = 122, src = null } = {}) {
    this.bpm = bpm;
    this.src = src;
    this.on = false;
    this.level = 0;
    this.kick = 0;
    this.bars = new Float32Array(4);
    this.listeners = new Set();
    this.kickTimes = [];
  }

  onChange(fn) { this.listeners.add(fn); }
  emit() { this.listeners.forEach(fn => fn(this.on)); }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    this.filter.Q.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(this.filter).connect(comp).connect(this.analyser).connect(ctx.destination);

    if (this.src) {
      this.el = new Audio(this.src);
      this.el.loop = true;
      this.el.crossOrigin = 'anonymous';
      ctx.createMediaElementSource(this.el).connect(this.master);
    } else {
      this.buildSynth();
    }
  }

  /* ---------------- built-in groove ---------------- */
  buildSynth() {
    const ctx = this.ctx;
    // shared noise buffer
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // reverb (generated impulse)
    this.verb = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.6, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3.2);
    }
    this.verb.buffer = ir;
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.32;
    this.verb.connect(verbGain).connect(this.master);

    // ping-pong-ish delay for stabs
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = (60 / this.bpm) * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.35;
    dlp.connect(dOut).connect(this.master);

    // music bus that ducks under the kick (sidechain feel)
    this.bus = ctx.createGain();
    this.bus.connect(this.master);

    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    // Am9 → Fmaj9 → Cmaj9 → Em9  (deep, warm, a little melancholic — "north" + "soul")
    this.chords = [
      [57, 60, 64, 67, 71],
      [53, 57, 60, 64, 67],
      [48, 55, 59, 62, 64],
      [52, 55, 59, 62, 66],
    ];
    this.bassRoots = [45, 41, 36, 40];
    this.bassPattern = [0, null, null, 0, null, null, 12, null, null, null, 0, null, 7, null, null, 10];
  }

  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  playKick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.5);
    // click
    const n = ctx.createBufferSource(); n.buffer = this.noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    n.connect(hp).connect(ng).connect(this.master);
    n.start(t); n.stop(t + 0.02);
    // duck the music bus
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(0.35, t);
    this.bus.gain.linearRampToValueAtTime(1, t + 0.22);
    this.kickTimes.push(t);
  }

  playHat(t, open, vel) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource(); n.buffer = this.noise;
    n.playbackRate.value = 1 + Math.random() * 0.05;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = open ? 7000 : 9000;
    const bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 10500; bp.gain.value = 6;
    const g = ctx.createGain();
    const dur = open ? 0.22 : 0.045;
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    let node = n.connect(hp).connect(bp).connect(g);
    if (pan) { pan.pan.value = open ? 0.15 : -0.2; node = node.connect(pan); }
    node.connect(this.bus);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.02);
  }

  playClap(t) {
    const ctx = this.ctx;
    const out = ctx.createGain(); out.gain.value = 0.28;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
    bp.connect(out); out.connect(this.bus); out.connect(this.verb);
    [0, 0.011, 0.023].forEach((off, i) => {
      const n = ctx.createBufferSource(); n.buffer = this.noise;
      const g = ctx.createGain();
      const d = i === 2 ? 0.16 : 0.02;
      g.gain.setValueAtTime(0.9, t + off); g.gain.exponentialRampToValueAtTime(0.0001, t + off + d);
      n.connect(g).connect(bp);
      n.start(t + off, Math.random()); n.stop(t + off + d + 0.02);
    });
  }

  playBass(t, midi, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 4;
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.value = this.mtof(midi); o2.frequency.value = this.mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
    o.connect(g); o2.connect(lp).connect(g);
    g.connect(this.bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  playPad(t, notes, dur) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    lp.connect(g); g.connect(this.bus); g.connect(this.verb);
    notes.forEach(m => {
      [-7, 7].forEach(det => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = this.mtof(m);
        o.detune.value = det;
        o.connect(lp);
        o.start(t); o.stop(t + dur + 0.5);
      });
    });
  }

  playStab(t, notes) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    lp.connect(g); g.connect(this.bus); g.connect(this.delay); g.connect(this.verb);
    notes.slice(1).forEach(m => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = this.mtof(m + 12);
      o.connect(lp); o.start(t); o.stop(t + 0.3);
    });
  }

  schedule() {
    const ctx = this.ctx;
    const s16 = 60 / this.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const t = this.nextTime, st = this.step % 16, bar = this.bar;
      const chordIdx = Math.floor(bar / 2) % 4;
      const intro = bar < 4;
      if (st % 4 === 0) this.playKick(t);
      if (!intro || bar >= 2) {
        if (st % 4 === 2) this.playHat(t, true, 0.16);
        else this.playHat(t, false, st % 2 ? 0.05 : 0.08);
      }
      if (!intro && (st === 4 || st === 12)) this.playClap(t);
      const b = this.bassPattern[st];
      if (b !== null && bar >= 2) this.playBass(t, this.bassRoots[chordIdx] + b, s16 * 1.6);
      if (st === 0 && bar % 2 === 0) this.playPad(t, this.chords[chordIdx], s16 * 32);
      if (!intro && (st === 3 || st === 11) && bar % 4 === 3) this.playStab(t, this.chords[chordIdx]);
      this.nextTime += s16 * (st % 2 ? 0.94 : 1.06); // a little swing
      this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }

  /* ---------------- transport ---------------- */
  async start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const t = this.ctx.currentTime;
    if (this.el) {
      this.el.play().catch(() => {});
    } else if (!this.timer) {
      this.nextTime = t + 0.06;
      // open the filter like a DJ bringing the track in
      this.filter.frequency.cancelScheduledValues(t);
      this.filter.frequency.setValueAtTime(380, t);
      this.filter.frequency.exponentialRampToValueAtTime(18000, t + (60 / this.bpm) * 16);
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
    }
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0.62, t + 0.8);
    this.on = true;
    this.emit();
  }

  stop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.6);
    this.on = false;
    this.emit();
    setTimeout(() => {
      if (this.on) return;
      if (this.el) this.el.pause();
      clearInterval(this.timer); this.timer = null;
      this.ctx.suspend();
    }, 700);
  }

  toggle() { return this.on ? this.stop() : this.start(); }

  /** call every frame */
  update() {
    if (!this.ctx || !this.on) {
      this.level *= 0.9; this.kick *= 0.85;
      for (let i = 0; i < 4; i++) this.bars[i] *= 0.85;
      return;
    }
    this.analyser.getByteFrequencyData(this.freq);
    const f = this.freq;
    const band = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += f[i]; return s / ((b - a) * 255); };
    const low = band(1, 6);
    this.level += (low - this.level) * 0.35;
    this.bars[0] = band(1, 5); this.bars[1] = band(6, 20); this.bars[2] = band(20, 60); this.bars[3] = band(60, 160);
    // kick envelope from scheduled kick times (tight, drift-free)
    const now = this.ctx.currentTime;
    while (this.kickTimes.length && this.kickTimes[0] < now - 0.5) this.kickTimes.shift();
    let k = 0;
    for (const kt of this.kickTimes) if (kt <= now) k = Math.max(k, Math.exp(-(now - kt) * 9));
    if (this.el) k = Math.max(0, (low - 0.55) * 2.2);
    this.kick = k;
  }
}
