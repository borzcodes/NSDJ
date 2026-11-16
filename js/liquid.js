/* ==========================================================================
   Liquid chapters — full-screen WebGL renderer that melts one chapter into
   the next (fbm-noise displacement + organic mask + RGB split), driven by
   scroll.

   Each chapter is either
     • three films side by side (wide screens) — a multi-cam wall of footage
     • one film (phones, or chapters with a single clip): full-bleed cover, or
       a sharp vertical panel over its own blurred glow when the clip is
       vertical and the screen is wide.
   Sources can be <video>, <img> or <canvas>.
   ========================================================================== */
import { decoded } from './slides.js';

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA0, uA1, uA2, uB0, uB1, uB2;
uniform vec2 uSA0, uSA1, uSA2, uSB0, uSB1, uSB2;
uniform vec2 uFA0, uFA1, uFA2, uFB0, uFB1, uFB2;   // where the DJ is in each film (0..1, like object-position)
uniform vec2 uRes, uMouse;
uniform float uP, uTime, uBeat, uVel, uZoomA, uZoomB, uPanelX, uColsA, uColsB, uGutter;

vec2 mirror(vec2 c){ return 1.0 - abs(1.0 - mod(c, 2.0)); }
// textures go up the way the files are stored (top row first), so the picture is flipped here, for free
vec4 tx(sampler2D t, vec2 c){ return texture2D(t, vec2(c.x, 1.0 - c.y)); }
// cover-fit a texture into a box (uv is 0..1 inside the box), keeping the focus point (the DJ) in frame
vec2 coverIn(vec2 uv, vec2 tex, vec2 box, float zoom, vec2 focus){
  float rb = box.x / box.y, rt = tex.x / tex.y;
  vec2 s = rb > rt ? vec2(1.0, rt / rb) : vec2(rb / rt, 1.0);
  vec2 room = max(1.0 - s / zoom, 0.0);
  vec2 f = vec2(focus.x, 1.0 - focus.y);
  return mirror((uv - 0.5) * s / zoom + 0.5 + (f - 0.5) * room);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec3 rgbSample(sampler2D t, vec2 uv, vec2 shift){
  return vec3(tx(t, uv + shift).r, tx(t, uv).g, tx(t, uv - shift).b);
}
vec3 ringBlur(sampler2D t, vec2 c){
  vec3 acc = tx(t, c).rgb * 2.0;
  for(int i = 0; i < 12; i++){
    float a = float(i) * 0.5236;
    acc += tx(t, mirror(c + vec2(cos(a), sin(a)) * 0.04)).rgb;
    acc += tx(t, mirror(c + vec2(cos(a + 0.26), sin(a + 0.26)) * 0.018)).rgb;
  }
  return acc / 26.0;
}

// one film: cover, or a vertical panel over its own blurred glow on wide screens
vec3 single(sampler2D t, vec2 tex, vec2 fo, vec2 uv, float zoom, vec2 shift){
  float rs = uRes.x / uRes.y, rt = tex.x / tex.y;
  float pm = smoothstep(1.15, 1.6, rs / rt);
  if (pm < 0.001) return rgbSample(t, coverIn(uv, tex, uRes, zoom, fo), shift);
  float ph = 0.86;
  float pw = ph * rt / rs;
  vec2 q = (uv - vec2(uPanelX, 0.5)) / vec2(pw, ph) + 0.5;
  vec2 px = 1.5 / (uRes * vec2(pw, ph));
  float inside = smoothstep(0.0, px.x, q.x) * smoothstep(0.0, px.x, 1.0 - q.x)
               * smoothstep(0.0, px.y, q.y) * smoothstep(0.0, px.y, 1.0 - q.y);
  vec3 fg = rgbSample(t, (q - 0.5) / zoom + 0.5, shift);
  vec3 bg = ringBlur(t, coverIn(uv, tex, uRes, zoom * 1.25, fo)) * 0.4;
  vec2 dq = max(abs(q - 0.5) - 0.5, 0.0) * vec2(pw * rs, ph);
  bg *= 1.0 - (1.0 - smoothstep(0.0, 0.08, length(dq))) * 0.55;
  vec3 panel = mix(bg, fg, inside);
  if (pm > 0.999) return panel;
  return mix(rgbSample(t, coverIn(uv, tex, uRes, zoom, fo), shift), panel, pm);
}

// three films side by side — a multi-cam wall
vec3 tri(sampler2D t0, sampler2D t1, sampler2D t2, vec2 s0, vec2 s1, vec2 s2, vec2 f0, vec2 f1, vec2 f2, vec2 uv, float zoom, vec2 shift){
  vec2 m = mirror(uv);
  float x = m.x * 3.0;
  float c = floor(min(x, 2.9999));
  vec2 luv = vec2(x - c, m.y);
  luv.y += sin(uTime * 0.23 + c * 2.1) * 0.006;           // each camera drifts on its own
  vec2 box = vec2(uRes.x / 3.0, uRes.y);
  float z = zoom * (1.0 + abs(c - 1.0) * 0.035);
  if (c < 0.5) return rgbSample(t0, coverIn(luv, s0, box, z, f0), shift);
  if (c < 1.5) return rgbSample(t1, coverIn(luv, s1, box, z, f1), shift);
  return rgbSample(t2, coverIn(luv, s2, box, z, f2), shift);
}

vec3 setA(vec2 uv, vec2 shift){
  if (uColsA > 1.5) return tri(uA0, uA1, uA2, uSA0, uSA1, uSA2, uFA0, uFA1, uFA2, uv, uZoomA, shift);
  return single(uA1, uSA1, uFA1, uv, uZoomA, shift);
}
vec3 setB(vec2 uv, vec2 shift){
  if (uColsB > 1.5) return tri(uB0, uB1, uB2, uSB0, uSB1, uSB2, uFB0, uFB1, uFB2, uv, uZoomB, shift);
  return single(uB1, uSB1, uFB1, uv, uZoomB, shift);
}

void main(){
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  bool moving = uP > 0.0005;
  bool triMode = uColsA > 1.5 || (moving && uColsB > 1.5);

  vec2 m = uv - uMouse; m.x *= aspect;
  float md = length(m);
  vec2 ripple = normalize(m + 1e-4) * sin(md * 28.0 - uTime * 3.0) * 0.003 * smoothstep(0.35, 0.0, md);

  vec3 colr;
  if (!moving) {
    // between transitions: just the films, playing — none of the melt maths
    colr = setA(uv + ripple, vec2(0.0012 + abs(uVel) * 0.0008, 0.0));
  } else {
    vec2 q = vec2(uv.x * aspect, uv.y) * 2.0;
    float n  = fbm(q * 1.2 + vec2(uTime * 0.03, -uTime * 0.02));
    float n2 = fbm(q * 2.1 - vec2(uTime * 0.025, uTime * 0.04) + 7.3);
    vec2 flow = vec2(n - 0.5, n2 - 0.5);

    // in multi-cam mode the melt sweeps across the columns, left to right
    float col = triMode ? floor(min(uv.x * 3.0, 2.9999)) : 1.0;
    float p = triMode ? clamp(uP * 1.4 - col * 0.2, 0.0, 1.0) : uP;
    float peak = sin(p * 3.14159265);
    float smear = peak * 0.55 + abs(uVel) * 0.04;

    vec2 dA = flow * smear * 1.1 + vec2(0.0, -p * peak * 0.35 * (n * 1.4));
    vec2 dB = -flow * (1.0 - p) * peak * 1.1 + vec2(0.0, (1.0 - p) * peak * 0.25 * n2);

    vec2 rgb = flow * 0.06 * peak + vec2(0.0012 + abs(uVel) * 0.0008, 0.0);
    vec3 a = setA(uv + dA + ripple, rgb);
    vec3 b = setB(uv + dB + ripple, -rgb);

    float field = mix(n, 1.0 - uv.y, 0.35) + (n2 - 0.5) * 0.4;
    float mask = smoothstep(field - 0.12, field + 0.12, p * 1.5 - 0.25);
    colr = mix(a, b, mask);

    float edge = smoothstep(0.5, 0.0, abs(mask - 0.5)) * peak;
    colr += vec3(1.0, 0.3, 0.07) * edge * 0.2;
  }

  // hairline gutters between the three cameras
  if (triMode) {
    float d = min(abs(uv.x - 1.0 / 3.0), abs(uv.x - 2.0 / 3.0)) * uRes.x;
    colr *= smoothstep(uGutter * 0.5, uGutter, d);
  }

  colr *= 1.0 + uBeat * 0.12;
  vec2 vc = uv - 0.5; vc.x *= aspect * 0.7;
  colr *= smoothstep(1.15, 0.3, length(vc));
  colr += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * 0.05;
  gl_FragColor = vec4(colr, 1.0);
}`;

const UNIFORMS = ['uA0', 'uA1', 'uA2', 'uB0', 'uB1', 'uB2', 'uSA0', 'uSA1', 'uSA2', 'uSB0', 'uSB1', 'uSB2', 'uFA0', 'uFA1', 'uFA2', 'uFB0', 'uFB1', 'uFB2',
  'uRes', 'uMouse', 'uP', 'uTime', 'uBeat', 'uVel', 'uZoomA', 'uZoomB', 'uPanelX', 'uColsA', 'uColsB', 'uGutter'];

export class Liquid {
  /** chapters: [{ cols: [left|null, center, right|null] }], each source { el, isVideo, poster } */
  constructor(canvas, chapters) {
    this.canvas = canvas;
    this.chapters = chapters;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.prog = this.program(VERT, FRAG);
    gl.useProgram(this.prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    UNIFORMS.forEach(n => (this.u[n] = gl.getUniformLocation(this.prog, n)));
    ['uA0', 'uA1', 'uA2', 'uB0', 'uB1', 'uB2'].forEach((n, i) => gl.uniform1i(this.u[n], i));

    this.tex = chapters.map(ch => ch.cols.map(s => (s ? this.makeTex(s) : null)));
    this.state = { index: 0, p: 0, beat: 0, vel: 0, mouse: [0.5, 0.5], local: 0 };
    this.mouse = [0.5, 0.5];
    this.resize();
  }

  program(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  makeTex(src) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    // NPOT textures in WebGL1 must clamp (repeat/mirror would render black)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 9, 8, 255]));
    t.src = src;
    t.live = false;
    // poster first, the film takes over once it has frames
    if (!this.upload(t, src.el) && src.poster) this.upload(t, src.poster);
    return t;
  }

  upload(t, el) {
    const gl = this.gl;
    let data = el;
    if (el instanceof HTMLVideoElement) { if (el.readyState < 2) return false; }
    else if (el instanceof HTMLImageElement) { data = decoded(el); if (!data) return false; }   // decoded in the background
    gl.bindTexture(gl.TEXTURE_2D, t);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); } catch (e) { return false; }
    if (el === t.src.el) t.live = true;
    t.has = true;                 // something real is on this texture (the film, or its still)
    return true;
  }

  sizeOf(t) {
    if (!t) return [9, 16];
    const s = t.src, el = s.el;
    if (el instanceof HTMLVideoElement && el.videoWidth) return [el.videoWidth, el.videoHeight];
    if (s.poster && s.poster.naturalWidth) return [s.poster.naturalWidth, s.poster.naturalHeight];
    if (el instanceof HTMLImageElement && el.naturalWidth) return [el.naturalWidth, el.naturalHeight];
    return [el.width || 9, el.height || 16];
  }

  /** three cameras on wide screens, one on phones / portrait */
  get multi() { return this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight) > 1.15; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    this.dpr = dpr;
    if (w === this.canvas.width && h === this.canvas.height) return;   // resizing a canvas wipes it: only when needed
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  /** position in [0, n-1]: integer = a chapter on screen, fraction = melting into the next one.
      The caller animates it in time (see soundScene), so the films hold still between transitions. */
  set(progress) {
    const n = this.chapters.length;
    const g = Math.max(0, Math.min(n - 1, progress));
    let i = Math.floor(g + 1e-4);
    let local = Math.max(0, g - i);
    if (i >= n - 1) { i = n - 1; local = 0; }
    this.state.index = i;
    this.state.local = local;
    this.state.p = local;
  }

  /** the films a chapter shows on this screen */
  filmsOf(k) {
    const cols = this.colsOf(k);
    return this.chapters[k].cols.filter((s, j) => s && s.isVideo && (cols === 3 || j === 1)).map(s => s.el);
  }

  /** start the next chapter's films ahead of the melt; resolves once they have frames (or after a short wait).
      A film's first load costs the page a moment, so they start one after another, not all at once. */
  prepare(k) {
    this.warm = k;
    const vids = this.filmsOf(k);
    vids.forEach((v, i) => setTimeout(() => { v.preload = 'auto'; }, i * 110));   // render() starts them playing, one at a time
    return Promise.race([
      Promise.all(vids.map(v => (v.readyState >= 3 ? 0 : new Promise(r => v.addEventListener('canplay', r, { once: true }))))),
      new Promise(r => setTimeout(r, 450)),
    ]);
  }

  /** Put the chapters' stills on the GPU, one per call (call it once a frame while the section approaches).
      All fifteen in one frame froze the page for a quarter of a second. Returns true when all are up. */
  uploadStills() {
    let pending = false;
    for (const row of this.tex) for (const t of row) {
      if (!t || t.live || t.has || !t.src.poster) continue;
      if (this.upload(t, t.src.poster)) return false;      // one done: the next one next frame
      pending = true;                                      // still downloading or decoding (that has now begun)
    }
    return !pending;
  }

  /** buffer the neighbours of the chapter on screen, so the next scroll melts straight into moving footage */
  prime(k) {
    const vids = [k + 1, k - 1].filter(j => j >= 0 && j < this.chapters.length).flatMap(j => this.filmsOf(j));
    vids.forEach((v, i) => setTimeout(() => { if (v.preload !== 'auto') v.preload = 'auto'; }, 300 + i * 250));
  }

  /** true when a film has moved on to a new frame since its last upload (≈ its own frame rate, not the screen's) */
  fresh(t) {
    const ct = t.src.el.currentTime;
    if (t.lastT == null || ct < t.lastT || ct - t.lastT >= 0.03) { t.lastT = ct; return true; }
    return false;
  }

  /** chapter k uses three columns only if both side films exist and the screen is wide */
  colsOf(k) {
    const c = this.chapters[k].cols;
    return this.multi && c[0] && c[2] ? 3 : 1;
  }

  render(time) {
    const gl = this.gl, s = this.state, u = this.u;
    const a = s.index, b = Math.min(this.chapters.length - 1, s.index + 1);
    const colsA = this.colsOf(a), colsB = this.colsOf(b);
    const moving = s.p > 0.0005;
    // only the chapter on screen plays and uploads; the next one only while the melt is running
    const needed = (k, j) => (k === a && (colsA === 3 || j === 1)) || (moving && k === b && (colsB === 3 || j === 1));
    const warm = (k, j) => k === this.warm && (this.colsOf(k) === 3 || j === 1);
    const now = performance.now();
    let stills = 1;    // at most one still goes up per frame (plus those on screen right now)

    this.tex.forEach((row, k) => row.forEach((t, j) => {
      if (!t) return;
      const src = t.src;
      if (!src.isVideo) { if (!t.live) this.upload(t, src.el); return; }
      // the still, until the film has frames
      if (!t.live && !t.has && src.poster && (needed(k, j) || stills-- > 0)) this.upload(t, src.poster);
      const on = this.active && needed(k, j);
      if (on || (this.active && warm(k, j))) {
        // films that need to start do so one every 100 ms: starting three at once was a visible stutter
        if (src.el.paused && now - (this.lastStart || 0) > 100) { this.lastStart = now; src.el.play().catch(() => {}); }
      } else if (!src.el.paused) src.el.pause();
      if (on && (!t.live || this.fresh(t))) this.upload(t, src.el);
    }));

    this.mouse[0] += (s.mouse[0] - this.mouse[0]) * 0.06;
    this.mouse[1] += (s.mouse[1] - this.mouse[1]) * 0.06;

    const bind = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };
    const rowA = this.tex[a], rowB = this.tex[b];
    const pick = (row, j) => row[j] || row[1];
    bind(0, pick(rowA, 0)); bind(1, rowA[1]); bind(2, pick(rowA, 2));
    bind(3, pick(rowB, 0)); bind(4, rowB[1]); bind(5, pick(rowB, 2));
    gl.uniform2fv(u.uSA0, this.sizeOf(pick(rowA, 0))); gl.uniform2fv(u.uSA1, this.sizeOf(rowA[1])); gl.uniform2fv(u.uSA2, this.sizeOf(pick(rowA, 2)));
    gl.uniform2fv(u.uSB0, this.sizeOf(pick(rowB, 0))); gl.uniform2fv(u.uSB1, this.sizeOf(rowB[1])); gl.uniform2fv(u.uSB2, this.sizeOf(pick(rowB, 2)));
    const fo = t => (t && t.src.focus) || [0.5, 0.5];
    gl.uniform2fv(u.uFA0, fo(pick(rowA, 0))); gl.uniform2fv(u.uFA1, fo(rowA[1])); gl.uniform2fv(u.uFA2, fo(pick(rowA, 2)));
    gl.uniform2fv(u.uFB0, fo(pick(rowB, 0))); gl.uniform2fv(u.uFB1, fo(rowB[1])); gl.uniform2fv(u.uFB2, fo(pick(rowB, 2)));
    gl.uniform1f(u.uColsA, colsA);
    gl.uniform1f(u.uColsB, colsB);
    gl.uniform1f(u.uGutter, 3 * this.dpr);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uMouse, this.mouse[0], 1 - this.mouse[1]);
    gl.uniform1f(u.uP, s.p);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uBeat, s.beat);
    gl.uniform1f(u.uVel, s.vel);
    gl.uniform1f(u.uPanelX, this.canvas.clientWidth > 900 ? 0.66 : 0.5);
    gl.uniform1f(u.uZoomA, 1.03 + Math.min(1, s.local) * 0.05);
    gl.uniform1f(u.uZoomB, 1.1 - s.p * 0.07);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
