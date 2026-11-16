/* ==========================================================================
   Entry slideshow — full-screen WebGL with a slit-scan transition:
   the next shot breaks through from the centre in a widening band, edged by
   thin vertical slits (single pixel-columns of the incoming shot stretched
   top to bottom) while the outgoing shot burns into a posterised, solarised
   negative before it disappears.
   Sources can be <video>, <img> or <canvas>.
   ========================================================================== */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform vec2 uSA, uSB, uRes;
uniform vec2 uFA, uFB;   // where the DJ is in each shot (0..1, like object-position)
uniform float uZA, uZB;
uniform float uT, uTime, uCx, uSeed, uBeat;

float hash(float n){ return fract(sin(n * 12.9898 + 78.233) * 43758.5453123); }
// textures go up the way the files are stored (top row first), so the picture is flipped here, for free
vec4 tx(sampler2D t, vec2 c){ return texture2D(t, vec2(c.x, 1.0 - c.y)); }

// full-screen cover-fit that keeps the focus point (the DJ) in frame
vec2 cover(vec2 uv, vec2 tex, vec2 focus, float zoom){
  float rs = uRes.x / uRes.y, rt = tex.x / tex.y;
  vec2 s = rs > rt ? vec2(1.0, rt / rs) : vec2(rs / rt, 1.0);
  vec2 room = max(1.0 - s / zoom, 0.0);
  vec2 f = vec2(focus.x, 1.0 - focus.y);           // focus is measured from the top, uv from the bottom
  return clamp((uv - 0.5) * s / zoom + 0.5 + (f - 0.5) * room, 0.001, 0.999);
}

// Sabattier-style burn: only the highlights flip, then contrast + posterise + a hue nudge
vec3 solarize(vec3 c){
  vec3 s = mix(c, 1.0 - c, step(0.5, c));
  s = clamp((s - 0.08) * 2.3, 0.0, 1.0);
  s = floor(s * 5.0 + 0.5) / 5.0;
  return mix(s, s.gbr, 0.3);
}

void main(){
  vec2 uv = vUv;
  float t = uT;
  float pulse = sin(t * 3.14159265);               // 0 at rest, 1 mid-transition
  float step12 = floor(t * 14.0);                  // glitch pattern re-rolls as the wave travels

  // the reveal band widens out of uCx with a ragged, per-column edge
  float dx = abs(uv.x - uCx);
  float w = t * t * (3.0 - 2.0 * t) * 0.74;
  float colF = floor(uv.x * 260.0);
  float jit = (hash(colF + uSeed + step12) - 0.5) * 0.09 * pulse;
  float inB = step(dx, w + jit);

  vec3 a = tx(uA, cover(uv, uSA, uFA, uZA)).rgb;
  vec3 b = tx(uB, cover(uv, uSB, uFB, uZB)).rgb;

  // outgoing shot burns as the wave gets close
  float near = smoothstep(0.24, 0.0, dx - w) * smoothstep(0.0, 0.2, t);
  a = mix(a, solarize(a), near * 0.88);

  vec3 col = mix(a, b, inB);

  // slit-scan: sparse hairlines plus a few wider slices around the travelling edge,
  // each one a single column of pixels stretched top to bottom
  float band = smoothstep(0.22, 0.0, abs(dx - w)) * pulse;
  float nT = 240.0, nW = 46.0;
  float cT = floor(uv.x * nT), cW = floor(uv.x * nW);
  float barT = step(1.0 - band * 0.3, hash(cT * 1.37 + uSeed + step12 * 0.71));
  float barW = step(1.0 - band * 0.14, hash(cW * 3.11 + uSeed * 1.7 + floor(t * 7.0)));
  float colX = barT > 0.5 ? (cT + 0.5) / nT : (cW + 0.5) / nW;
  float pick = barT > 0.5 ? hash(cT + 9.1 + uSeed) : hash(cW + 2.3 + uSeed);
  vec2 colUv = vec2(colX, 0.5 + (uv.y - 0.5) * 0.12);
  vec3 slitB = tx(uB, cover(colUv, uSB, uFB, uZB)).rgb;
  vec3 slitA = solarize(tx(uA, cover(colUv, uSA, uFA, uZA)).rgb);
  vec3 slit = mix(slitB, slitA, step(0.7, pick));
  col = mix(col, slit, max(barT, barW));

  // hairline at the edge
  col += smoothstep(0.0025, 0.0, abs(dx - (w + jit))) * 0.35 * pulse;

  // gentle film grade + grain
  col *= 1.0 + uBeat * 0.08;
  vec2 vc = uv - 0.5; vc.x *= uRes.x / uRes.y * 0.6;
  col *= smoothstep(1.2, 0.35, length(vc));
  col += (hash(dot(uv * uRes, vec2(1.0, 57.0)) + fract(uTime) * 61.0) - 0.5) * 0.045;
  gl_FragColor = vec4(col, 1.0);
}`;

/** A photo, decoded in the background and ready for the GPU (null until it is). Handing WebGL a plain
    <img> makes the browser decode the whole JPEG in the middle of a frame, which freezes the page.
    The bitmap is made from the file's bytes (already in the browser's cache): made from the <img>
    itself, Chrome decodes it on the main thread anyway. */
const bitmaps = new WeakMap();
export function decoded(img) {
  if (!img.complete || !img.naturalWidth) return null;
  if (typeof createImageBitmap !== 'function') return img;
  if (!bitmaps.has(img)) {
    bitmaps.set(img, null);
    fetch(img.currentSrc || img.src, { cache: 'force-cache' })      // the copy the <img> already downloaded
      .then(r => (r.ok ? r.blob() : Promise.reject(r.status)))
      .then(b => createImageBitmap(b))
      .catch(() => createImageBitmap(img))
      .then(b => bitmaps.set(img, b), () => bitmaps.set(img, img));
  }
  return bitmaps.get(img);
}

export class Slides {
  /**
   * @param canvas  <canvas>
   * @param slides  [{ el, isVideo, poster, focus: [x, y] }]  focus = where the DJ is, 0..1
   * @param opts    { hold, dur, onChange(i), base: [r,g,b] start colour }
   */
  constructor(canvas, slides, { hold = 4.2, dur = 1.35, onChange = () => {}, base = [255, 255, 255] } = {}) {
    this.canvas = canvas;
    this.slides = slides;
    this.hold = hold;
    this.dur = dur;
    this.onChange = onChange;
    const gl = this.gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uA', 'uB', 'uSA', 'uSB', 'uRes', 'uFA', 'uFB', 'uZA', 'uZB', 'uT', 'uTime', 'uCx', 'uSeed', 'uBeat']
      .forEach(n => (this.u[n] = gl.getUniformLocation(p, n)));
    gl.uniform1i(this.u.uA, 0);
    gl.uniform1i(this.u.uB, 1);

    this.base = this.solid(base);
    this.tex = slides.map(s => this.makeTex(s));
    // start on the page colour and break through to the first shot
    this.cur = -1; this.next = 0; this.t = 0; this.held = 0;
    this.transitioning = false;
    this.cx = 0.5; this.seed = 1;
    this.beat = 0;
    this.resize();
  }

  solid([r, g, b]) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, 255]));
    this.params();
    t.src = null; t.live = true;
    return t;
  }

  params() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  makeTex(src) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    this.params();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 18, 16, 255]));
    t.src = src; t.live = false;
    if (!this.upload(t, src.el) && src.poster) this.upload(t, src.poster);
    return t;
  }

  upload(t, el) {
    const gl = this.gl;
    let data = el;
    if (el instanceof HTMLVideoElement) { if (el.readyState < 2) return false; }
    else if (el instanceof HTMLImageElement) { data = decoded(el); if (!data) return false; }
    gl.bindTexture(gl.TEXTURE_2D, t);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); } catch (e) { return false; }
    if (t.src && el === t.src.el) t.live = true;
    t.has = true;                 // something real is on this texture (the photo, or the film's still)
    return true;
  }

  /** the next shot, from i on, that has arrived (-1 if none other has yet) */
  nextReady(i) {
    const n = this.slides.length;
    for (let d = 0; d < n; d++) { const k = (i + d) % n; if (k !== this.cur && this.tex[k].has) return k; }
    return -1;
  }

  sizeOf(t) {
    if (!t.src) return [16, 9];
    const s = t.src, el = s.el;
    if (el instanceof HTMLVideoElement && el.videoWidth) return [el.videoWidth, el.videoHeight];
    if (el instanceof HTMLImageElement && el.naturalWidth) return [el.naturalWidth, el.naturalHeight];
    if (s.poster && s.poster.naturalWidth) return [s.poster.naturalWidth, s.poster.naturalHeight];
    return [el.width || 16, el.height || 9];
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (w === this.canvas.width && h === this.canvas.height) return;   // resizing a canvas wipes it: only when needed
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  go(i) {
    if (this.transitioning) return;
    this.next = ((i % this.slides.length) + this.slides.length) % this.slides.length;
    this.t = 0;
    this.transitioning = true;
    this.cx = 0.42 + Math.random() * 0.16;
    this.seed = Math.random() * 100;
    this.signalled = false;
  }

  start() { this.go(0); }

  update(dt) {
    if (this.transitioning) {
      this.t = Math.min(1, this.t + dt / this.dur);
      if (!this.signalled && this.t > 0.45) { this.signalled = true; this.onChange(this.next); }
      if (this.t >= 1) { this.cur = this.next; this.transitioning = false; this.held = 0; this.t = 0; }
    } else if (this.cur >= 0) {
      this.held += dt;
      // move on only to a shot that has arrived (on a slow connection the current one simply holds longer)
      if (this.held > this.hold) { const n = this.nextReady(this.cur + 1); if (n >= 0) this.go(n); }
    }
  }

  texOf(i) { return i < 0 ? this.base : this.tex[i]; }

  render(time) {
    const gl = this.gl, u = this.u;
    const ia = this.cur, ib = this.transitioning ? this.next : this.cur;
    // keep only the films on screen running
    const now = performance.now();
    this.tex.forEach((t, k) => {
      const s = t.src;
      const shown = k === ia || k === ib;
      // photos go up one at a time, at most one every 100 ms (each costs the page a few ms), the shot on screen first
      if (!s.isVideo) {
        if (!t.live && (shown ? !t.has : now - (this.lastUp || 0) > 100) && this.upload(t, s.el)) this.lastUp = now;
        return;
      }
      if (!t.live && !t.has && s.poster) this.upload(t, s.poster);     // the still, until the film has frames
      const on = this.active && shown;
      if (on) { if (s.el.paused) s.el.play().catch(() => {}); this.upload(t, s.el); }
      else if (!s.el.paused) s.el.pause();
    });
    const A = this.texOf(ia), B = this.texOf(ib);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B);
    gl.uniform2fv(u.uSA, this.sizeOf(A));
    gl.uniform2fv(u.uSB, this.sizeOf(B));
    const fo = i => (i >= 0 && this.slides[i].focus) || [0.5, 0.5];
    gl.uniform2fv(u.uFA, fo(ia));
    gl.uniform2fv(u.uFB, fo(ib));
    // slow push-in while a shot holds the screen
    const holdEnd = this.hold / (this.hold + this.dur);
    const holdK = Math.min(holdEnd, this.held / (this.hold + this.dur));
    gl.uniform1f(u.uZA, 1.02 + (this.transitioning ? holdEnd * 0.05 + this.t * 0.03 : holdK * 0.05));
    gl.uniform1f(u.uZB, 1.1 - this.t * 0.08);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uT, this.transitioning ? this.t : 0);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uCx, this.cx);
    gl.uniform1f(u.uSeed, this.seed);
    gl.uniform1f(u.uBeat, this.beat);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
