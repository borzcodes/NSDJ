/* ==========================================================================
   Procedural "light-show" placeholders.
   Renders club / festival / aurora / sunset / studio / laser / booth / portrait
   scenes onto a canvas so the site looks finished before the real photos and
   videos arrive. As soon as a media item gets an `img` or `video` in content.js
   these are no longer used.
   ========================================================================== */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}

/* ---------- shared primitives ---------- */
function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.35, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function beam(ctx, x, y, angle, len, spread, color, alpha) {
  const ex = x + Math.sin(angle) * len, ey = y + Math.cos(angle) * len;
  const px = Math.cos(angle) * spread, py = -Math.sin(angle) * spread;
  const g = ctx.createLinearGradient(x, y, ex, ey);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.5, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - py * 0.02, y);
  ctx.lineTo(ex + px, ey + py);
  ctx.lineTo(ex - px, ey - py);
  ctx.closePath();
  ctx.fill();
}

function laserLine(ctx, x, y, angle, len, color, width) {
  const ex = x + Math.sin(angle) * len, ey = y + Math.cos(angle) * len;
  ctx.strokeStyle = rgba(color, 0.18); ctx.lineWidth = width * 6;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
}

function haze(ctx, W, H, r, color, count, alpha, yMin = 0, yMax = 1) {
  for (let i = 0; i < count; i++) {
    glow(ctx, r() * W, lerp(yMin, yMax, r()) * H, lerp(0.15, 0.45, r()) * W, color, alpha * lerp(0.4, 1, r()));
  }
}

let grainTile = null;
function grain(ctx, W, H, amount = 0.07) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 192;
    const g = grainTile.getContext('2d');
    const d = g.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function vignette(ctx, W, H, strength = 0.75) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- people ---------- */
function personShape(ctx, p) {
  const { x, y, s, arm } = p;
  ctx.beginPath();
  // torso / shoulders
  ctx.moveTo(x - s * 1.3, y + s * 5);
  ctx.lineTo(x - s * 1.3, y + s * 1.9);
  ctx.quadraticCurveTo(x - s * 1.25, y + s * 1.05, x - s * 0.35, y + s * 0.95);
  ctx.lineTo(x + s * 0.35, y + s * 0.95);
  ctx.quadraticCurveTo(x + s * 1.25, y + s * 1.05, x + s * 1.3, y + s * 1.9);
  ctx.lineTo(x + s * 1.3, y + s * 5);
  ctx.closePath();
  ctx.fill();
  // neck + head
  ctx.fillRect(x - s * 0.26, y + s * 0.3, s * 0.52, s * 0.8);
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.5, s * 0.62, p.tilt, 0, TAU); ctx.fill();
  if (arm) {
    const { side, ang, len } = arm;
    const sx = x + side * s * 1.0, sy = y + s * 1.35;
    const mx = sx + Math.sin(ang) * len * 0.45 + side * s * 0.5, my = sy - Math.cos(ang) * len * 0.5;
    const ex = sx + Math.sin(ang) * len, ey = sy - Math.cos(ang) * len;
    ctx.lineWidth = s * 0.44; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex, ey - s * 0.12, s * 0.27, s * 0.36, ang, 0, TAU); ctx.fill();
  }
}

function crowd(ctx, W, H, r, o) {
  const { top = 0.64, rows = 6, haze: hz = '#ffffff', arms = 0.22, rim = null, near = 0.075, far = 0.016 } = o;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const s = lerp(far, near, t * t) * H;
    const yb = lerp(top, 0.97, Math.pow(t, 1.15)) * H;
    const col = mix(hz, '#000000', lerp(0.72, 1, t));
    const step = s * 1.85;
    const n = Math.ceil(W / step) + 3;
    for (let i = 0; i < n; i++) {
      const p = {
        x: (i - 1 + (r() - 0.5) * 0.7) * step,
        y: yb + (r() - 0.5) * s * 0.9,
        s: s * lerp(0.85, 1.15, r()),
        tilt: (r() - 0.5) * 0.3,
        arm: r() < arms * lerp(0.6, 1, t) ? { side: r() < 0.5 ? -1 : 1, ang: (r() < 0.5 ? -1 : 1) * lerp(0.05, 0.5, r()), len: s * lerp(2.6, 3.6, r()) } : null,
      };
      if (rim && t > 0.35) {
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle = rgba(rim, 0.55 * t);
        ctx.translate(-s * 0.06, -s * 0.07);
        personShape(ctx, p);
        ctx.restore();
      }
      ctx.fillStyle = ctx.strokeStyle = col;
      personShape(ctx, p);
    }
  }
}

function djFigure(ctx, x, y, s, color, r) {
  ctx.fillStyle = ctx.strokeStyle = color;
  // body
  ctx.beginPath();
  ctx.moveTo(x - s * 1.5, y + s * 5);
  ctx.lineTo(x - s * 1.45, y + s * 1.9);
  ctx.quadraticCurveTo(x - s * 1.3, y + s * 1.0, x - s * 0.35, y + s * 0.95);
  ctx.lineTo(x + s * 0.35, y + s * 0.95);
  ctx.quadraticCurveTo(x + s * 1.3, y + s * 1.0, x + s * 1.45, y + s * 1.9);
  ctx.lineTo(x + s * 1.5, y + s * 5);
  ctx.fill();
  ctx.fillRect(x - s * 0.28, y + s * 0.3, s * 0.56, s * 0.8);
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.66, 0, 0, TAU); ctx.fill();
  // headphones
  ctx.lineWidth = s * 0.16;
  ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.68, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - s * 0.62, y + s * 0.05, s * 0.2, s * 0.3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * 0.62, y + s * 0.05, s * 0.2, s * 0.3, 0, 0, TAU); ctx.fill();
  // raised arm
  const side = r() < 0.5 ? -1 : 1;
  ctx.lineWidth = s * 0.5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + side * s * 1.1, y + s * 1.4);
  ctx.quadraticCurveTo(x + side * s * 2.1, y - s * 0.3, x + side * s * 1.7, y - s * 2.2);
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + side * s * 1.7, y - s * 2.45, s * 0.3, s * 0.4, side * 0.2, 0, TAU); ctx.fill();
}

/* ---------- scenes ---------- */
const SCENES = {
  club(ctx, W, H, r) {
    const L = ['#ff2a5f', '#ff5b14', '#c21cff', '#ff2a5f'];
    bg(ctx, W, H, '#14030c', '#020002');
    haze(ctx, W, H, r, '#ff2a5f', 10, 0.12, 0.1, 0.7);
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(10px)';
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = lerp(0.05, 0.95, r()) * W, c = L[Math.floor(r() * L.length)];
      beam(ctx, x, -H * 0.05, (r() - 0.5) * 1.3, H * 1.2, W * lerp(0.03, 0.08, r()), c, lerp(0.25, 0.5, r()));
    }
    ctx.filter = 'blur(40px)';
    glow(ctx, W * lerp(0.3, 0.7, r()), H * 0.15, W * 0.3, '#ff5b14', 0.5);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    crowd(ctx, W, H, r, { top: 0.58, rows: 5, haze: '#ff2a5f', arms: 0.3, rim: '#ff7a5c', near: 0.1, far: 0.03 });
  },

  festival(ctx, W, H, r) {
    bg(ctx, W, H, '#050a1c', '#010206');
    haze(ctx, W, H, r, '#4a6bff', 8, 0.1, 0.1, 0.6);
    // LED screen
    const sw = W * 0.34, sh = H * 0.22, sx = W / 2 - sw / 2, sy = H * 0.26;
    const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    sg.addColorStop(0, '#2b4bff'); sg.addColorStop(0.5, '#9fdcff'); sg.addColorStop(1, '#5a2bff');
    ctx.fillStyle = sg; ctx.globalAlpha = 0.85; ctx.fillRect(sx, sy, sw, sh); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < sw; i += 6) ctx.fillRect(sx + i, sy, 1.5, sh);
    // truss
    ctx.strokeStyle = 'rgba(160,190,255,0.18)'; ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.12, H * 0.12, W * 0.76, H * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(8px)';
    const L = ['#ffffff', '#9fdcff', '#6d8bff'];
    for (let i = 0; i < 14; i++) {
      const x = lerp(0.14, 0.86, i / 13) * W;
      beam(ctx, x, H * 0.12, (i / 13 - 0.5) * 1.6 + (r() - 0.5) * 0.3, H * 1.1, W * 0.025, L[i % 3], 0.32);
    }
    ctx.filter = 'blur(50px)';
    glow(ctx, W / 2, sy + sh / 2, W * 0.35, '#7fb0ff', 0.5);
    ctx.filter = 'none';
    // confetti sparkle
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? '#ffffff' : '#9fdcff', lerp(0.2, 0.9, r()));
      ctx.fillRect(r() * W, r() * H * 0.7, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    crowd(ctx, W, H, r, { top: 0.6, rows: 9, haze: '#5d7bff', arms: 0.35, rim: '#bcd4ff', near: 0.075, far: 0.012 });
  },

  laser(ctx, W, H, r) {
    bg(ctx, W, H, '#03100c', '#000201');
    haze(ctx, W, H, r, '#1fd18a', 8, 0.08, 0.2, 0.8);
    ctx.globalCompositeOperation = 'lighter';
    const L = ['#3dff9a', '#2bd9ff', '#b6ff3d'];
    const sources = 1 + Math.floor(r() * 2);
    for (let s = 0; s < sources; s++) {
      const x = W * (sources === 1 ? 0.5 : (s ? 0.72 : 0.28)), y = H * lerp(0.12, 0.3, r());
      const c = L[Math.floor(r() * L.length)];
      const n = 16 + Math.floor(r() * 16);
      for (let i = 0; i < n; i++) laserLine(ctx, x, y, lerp(-1.4, 1.4, i / (n - 1)) + (r() - 0.5) * 0.05, H * 1.6, c, 1.4);
      ctx.filter = 'blur(30px)';
      glow(ctx, x, y, W * 0.12, c, 0.8);
      ctx.filter = 'none';
    }
    ctx.globalCompositeOperation = 'source-over';
    crowd(ctx, W, H, r, { top: 0.6, rows: 7, haze: '#1fd18a', arms: 0.3, rim: '#7dffc4', near: 0.08, far: 0.016 });
  },

  booth(ctx, W, H, r) {
    bg(ctx, W, H, '#100512', '#020103');
    // LED wall
    const cols = 26, rows = 12, cw = W / cols, ch = (H * 0.62) / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const d = Math.hypot(x - cols / 2, (y - rows * 0.55) * 1.6) / cols;
      const v = Math.max(0, 1 - d * 1.6) * lerp(0.5, 1, r());
      ctx.fillStyle = rgba(v > 0.55 ? '#ffd27a' : '#ff5b14', v * 0.65);
      ctx.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(60px)';
    glow(ctx, W / 2, H * 0.4, W * 0.4, '#ff5b14', 0.7);
    ctx.filter = 'blur(10px)';
    for (let i = 0; i < 6; i++) beam(ctx, W * lerp(0.1, 0.9, i / 5), 0, (i / 5 - 0.5) * 0.9, H, W * 0.04, '#ff2a5f', 0.25);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    // DJ + booth
    djFigure(ctx, W / 2, H * 0.44, H * 0.07, '#050205', r);
    ctx.fillStyle = '#030103';
    ctx.fillRect(W * 0.22, H * 0.66, W * 0.56, H * 0.4);
    ctx.fillStyle = 'rgba(255,140,80,0.5)';
    ctx.fillRect(W * 0.22, H * 0.66, W * 0.56, 2);
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = rgba(['#3dff9a', '#ff5b14', '#2bd9ff'][i % 3], 0.9);
      ctx.fillRect(W * lerp(0.26, 0.74, r()), H * 0.675 + r() * H * 0.01, 3, 3);
    }
    crowd(ctx, W, H, r, { top: 0.8, rows: 3, haze: '#ff5b14', arms: 0.35, rim: '#ff9a6c', near: 0.1, far: 0.06 });
  },

  aurora(ctx, W, H, r) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#01020a'); sky.addColorStop(0.55, '#041427'); sky.addColorStop(0.75, '#0b2a36'); sky.addColorStop(1, '#010305');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${lerp(0.1, 0.8, r() * r())})`;
      const s = r() < 0.92 ? 1 : 2;
      ctx.fillRect(r() * W, r() * H * 0.6, s, s);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(3px)';
    const ribbons = 3;
    for (let k = 0; k < ribbons; k++) {
      const base = lerp(0.24, 0.46, k / (ribbons - 1) + (r() - 0.5) * 0.2) * H;
      const f1 = lerp(1.2, 2.6, r()) / W * TAU, f2 = lerp(3, 6, r()) / W * TAU;
      const p1 = r() * TAU, p2 = r() * TAU, A = H * lerp(0.05, 0.12, r());
      for (let x = 0; x < W; x += 2) {
        const y = base + Math.sin(x * f1 + p1) * A + Math.sin(x * f2 + p2) * A * 0.3;
        const h = H * lerp(0.08, 0.3, 0.5 + 0.5 * Math.sin(x * f2 * 0.7 + p1));
        const g = ctx.createLinearGradient(0, y, 0, y - h);
        const inten = 0.12 + 0.12 * Math.sin(x * 0.03 + p2) ** 2;
        g.addColorStop(0, `rgba(80,255,170,${inten * 1.6})`);
        g.addColorStop(0.4, `rgba(60,220,200,${inten})`);
        g.addColorStop(1, 'rgba(140,90,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y - h, 2, h);
      }
    }
    ctx.filter = 'blur(60px)';
    glow(ctx, W * 0.5, H * 0.38, W * 0.5, '#3dffb0', 0.18);
    ctx.filter = 'blur(10px)';
    for (let i = 0; i < 5; i++) beam(ctx, W * lerp(0.3, 0.7, i / 4), H * 0.72, Math.PI + (i / 4 - 0.5) * 0.7, H * 0.8, W * 0.02, '#9ff0ff', 0.12);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    // mountains
    ctx.fillStyle = '#02070b';
    ctx.beginPath(); ctx.moveTo(0, H);
    let y = H * 0.66;
    for (let x = 0; x <= W; x += W / 24) { y = H * lerp(0.6, 0.7, r()); ctx.lineTo(x, y); }
    ctx.lineTo(W, H); ctx.fill();
    crowd(ctx, W, H, r, { top: 0.72, rows: 6, haze: '#0e3a44', arms: 0.25, rim: '#7dffd0', near: 0.07, far: 0.015 });
  },

  sunset(ctx, W, H, r) {
    const hz = H * 0.62;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#170d2e'); sky.addColorStop(0.45, '#5a2457'); sky.addColorStop(0.8, '#ff6a3d'); sky.addColorStop(1, '#ffc27a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = '#1a0b10'; ctx.fillRect(0, hz, W, H - hz);
    const sx = W * lerp(0.35, 0.65, r());
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(30px)';
    glow(ctx, sx, hz, W * 0.45, '#ff8a3d', 0.6);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffe2b0';
    ctx.beginPath(); ctx.arc(sx, hz, H * 0.085, Math.PI, 0); ctx.fill();
    // thin clouds
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(255,170,140,${lerp(0.05, 0.16, r())})`;
      ctx.beginPath(); ctx.ellipse(r() * W, lerp(0.15, 0.5, r()) * H, W * lerp(0.1, 0.3, r()), H * 0.008, 0, 0, TAU); ctx.fill();
    }
    // flags
    ctx.strokeStyle = ctx.fillStyle = '#0a0406'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const fx = r() * W, top = hz - H * lerp(0.12, 0.3, r());
      ctx.beginPath(); ctx.moveTo(fx, hz); ctx.lineTo(fx, top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx, top); ctx.quadraticCurveTo(fx + 18, top + 4, fx + 30, top + 2); ctx.lineTo(fx + 28, top + 22); ctx.quadraticCurveTo(fx + 16, top + 22, fx, top + 20); ctx.fill();
    }
    crowd(ctx, W, H, r, { top: 0.6, rows: 7, haze: '#ff7a4d', arms: 0.4, rim: '#ffb27a', near: 0.08, far: 0.014 });
  },

  studio(ctx, W, H, r) {
    bg(ctx, W, H, '#140d08', '#020101');
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(50px)';
    glow(ctx, W * 0.15, H * 0.1, W * 0.5, '#ffb347', 0.4);
    ctx.filter = 'blur(6px)';
    const B = ['#ffb347', '#ff5b14', '#2bd9ff', '#ff2a5f'];
    for (let i = 0; i < 38; i++) {
      const rad = lerp(8, 60, r() * r());
      ctx.fillStyle = rgba(B[Math.floor(r() * B.length)], lerp(0.08, 0.35, r()));
      ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.55, rad, 0, TAU); ctx.fill();
    }
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    // speakers
    for (const sx of [0.08, 0.8]) {
      ctx.fillStyle = '#070504'; ctx.fillRect(W * sx, H * 0.18, W * 0.12, H * 0.38);
      ctx.strokeStyle = 'rgba(255,180,90,0.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W * (sx + 0.06), H * 0.42, W * 0.04, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * (sx + 0.06), H * 0.26, W * 0.015, 0, TAU); ctx.stroke();
    }
    // desk
    const top = H * 0.58;
    ctx.fillStyle = '#0b0705';
    ctx.beginPath(); ctx.moveTo(W * 0.1, top); ctx.lineTo(W * 0.9, top); ctx.lineTo(W * 1.1, H); ctx.lineTo(-W * 0.1, H); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,90,0.4)'; ctx.fillRect(W * 0.1, top, W * 0.8, 2);
    for (let row = 0; row < 5; row++) {
      const t = row / 4, y = lerp(top + H * 0.05, H * 0.95, t), kr = lerp(6, 16, t) * (W / 1200);
      const span = lerp(0.78, 1.05, t), n = 12;
      for (let i = 0; i < n; i++) {
        const x = W * (0.5 + (i / (n - 1) - 0.5) * span);
        ctx.fillStyle = '#16100b'; ctx.beginPath(); ctx.arc(x, y, kr, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,190,120,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, kr, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
        if (r() < 0.25) {
          ctx.fillStyle = rgba(B[Math.floor(r() * 3)], 0.95);
          ctx.beginPath(); ctx.arc(x + kr * 1.6, y - kr, Math.max(1.5, kr * 0.18), 0, TAU); ctx.fill();
          glow(ctx, x + kr * 1.6, y - kr, kr * 2, '#ffb347', 0.25);
        }
      }
    }
  },

  portrait(ctx, W, H, r) {
    bg(ctx, W, H, '#262626', '#050505');
    const cx = W * lerp(0.42, 0.58, r()), cy = H * 0.44, s = Math.min(W, H) * 0.13;
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(40px)';
    glow(ctx, cx + s * 1.2, cy - s * 0.6, s * 5, '#ffffff', 0.35);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    haze(ctx, W, H, r, '#ffffff', 5, 0.05);
    ctx.save();
    ctx.filter = 'blur(3px)';
    djFigureRim(ctx, cx + s * 0.06, cy - s * 0.04, s, 'rgba(255,255,255,0.75)');
    ctx.restore();
    djFigureRim(ctx, cx, cy, s, '#060606');
  },
};

function djFigureRim(ctx, x, y, s, color) {
  ctx.fillStyle = ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 2.6, y + s * 6);
  ctx.quadraticCurveTo(x - s * 2.5, y + s * 1.6, x - s * 0.5, y + s * 1.25);
  ctx.lineTo(x + s * 0.5, y + s * 1.25);
  ctx.quadraticCurveTo(x + s * 2.5, y + s * 1.6, x + s * 2.6, y + s * 6);
  ctx.fill();
  ctx.fillRect(x - s * 0.36, y + s * 0.4, s * 0.72, s * 1.1);
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.72, s * 0.9, 0.06, 0, TAU); ctx.fill();
  ctx.lineWidth = s * 0.2;
  ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.9, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - s * 0.82, y + s * 0.1, s * 0.26, s * 0.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * 0.82, y + s * 0.1, s * 0.26, s * 0.4, 0, 0, TAU); ctx.fill();
}

function bg(ctx, W, H, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ---------- public API ---------- */
export function renderScene(scene, seed = 1, W = 1280, H = 800) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(seed);
  (SCENES[scene] || SCENES.club)(ctx, W, H, r);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  vignette(ctx, W, H, 0.7);
  grain(ctx, W, H, 0.09);
  return c;
}

/** Transparent foreground (horizon + crowd silhouettes) laid over the live aurora. */
export function renderCrowdLayer(W, H, seed = 7) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#01060a';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + W / 30; x += W / 30) ctx.lineTo(x, H * lerp(0.69, 0.75, r()));
  ctx.lineTo(W, H); ctx.fill();
  crowd(ctx, W, H, r, { top: 0.76, rows: 7, haze: '#0d3d46', arms: 0.3, rim: '#8affd8', near: 0.062, far: 0.012 });
  const g = ctx.createLinearGradient(0, H * 0.85, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.85, W, H * 0.15);
  return c;
}

const cache = new Map();
/** Returns a cached placeholder canvas for scene/seed/size. Use copyCanvas() to place it in the DOM. */
export function placeholder(scene, seed, W, H) {
  const key = `${scene}:${seed}:${W}x${H}`;
  if (!cache.has(key)) cache.set(key, renderScene(scene, seed, W, H));
  return cache.get(key);
}

/** Cheap GPU copy of a canvas so the same placeholder can appear in several places. */
export function copyCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
