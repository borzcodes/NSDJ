/* ==========================================================================
   NORTHSOUL — main
   ========================================================================== */
import {
  SITE, SPLASH, SLIDES, HERO, INTRO, ARTIST, CHAPTERS, ARCHIVE, EVENTS, NEXT_EVENT,
  FRAMES, PRESS, TRUSTED, CONTACT, MENU_TILES, FOOTER_FILM,
} from './content.js';
import { placeholder, copyCanvas } from './placeholder.js';
import { Liquid } from './liquid.js';
import { Slides } from './slides.js';
import { Sound } from './audio.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const TAU = Math.PI * 2;
const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// an iPhone keeps every film at full volume (it cannot be faded) and lets only one play with sound at a time
const canFade = (() => { try { const a = document.createElement('audio'); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch { return false; } })();
// parallax: on a phone the page moves natively, ahead of the scripts, so pictures that drift with the scroll
// ease after it (they would tremble if they followed it a frame late); with the smooth wheel they follow exactly
const drift = touch ? 0.5 : true;
const mobile = () => innerWidth < 900;
const portrait = () => innerWidth < innerHeight;
const frame = () => new Promise(r => setTimeout(r, 0));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Split text into masked words of characters: .w > .c (with --i stagger index) */
function splitWords(target, text) {
  target.textContent = '';
  let i = 0;
  text.split(' ').forEach((word, wi, arr) => {
    const w = el('span', 'w');
    [...word].forEach(ch => { const c = el('span', 'c', ch); c.style.setProperty('--i', i++); w.append(c); });
    target.append(w);
    if (wi < arr.length - 1) i++;
  });
  target.setAttribute('aria-label', text);
}

/** quick glitch-scramble from the old text to the new one */
function scramble(node, text, ms = 520) {
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/—#';
  const t0 = performance.now();
  clearInterval(node._scr);
  node._scr = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    const keep = Math.floor(p * text.length);
    node.textContent = text.slice(0, keep) + [...text.slice(keep)].map(c => (c === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    if (p >= 1) { clearInterval(node._scr); node.textContent = text; }
  }, 40);
}

/* ---------- media ---------- */
// Real photos/videos from content.js win; otherwise a procedural placeholder canvas is used.
// use: 'big' (default), 'small' = a small tile (light copies only), 'grid' = a grid cell (the browser picks
// the light copy or the 1600 px one, by screen; give mediaNode `sizes`)
async function resolve(m = {}, w = 1280, h = 800, use = 'big') {
  const light = use !== 'big' && m.thumb;
  if (m.video) return { type: 'video', src: filmFor(m), poster: (light ? m.thumb : m.img) || null, w: m.w, h: m.h, fx: m.fx, fy: m.fy };
  if (m.img) {
    if (use === 'grid' && m.thumb) return { type: 'img', src: m.thumb, thumb: m.thumb, light: m.img, w: m.w, h: m.h, fx: m.fx, fy: m.fy };
    return { type: 'img', src: light ? m.thumb : m.img, full: light ? null : m.full, w: m.w, h: m.h, fx: m.fx, fy: m.fy };
  }
  return { type: 'canvas', canvas: placeholder(m.scene || 'club', m.seed ?? 1, w, h) };
}
/** width / height of a media item (from content.js), or a fallback */
const aspect = (m, fallback = 2 / 3) => (m && m.w && m.h ? m.w / m.h : fallback);
/** where the DJ is in a media item, [x, y] 0..1 — the crop keeps this point in view */
const focusOf = m => [m?.fx ?? 0.5, m?.fy ?? 0.5];

/**
 * @param sizes  only for images drawn large (portrait, interlude, lightbox): how wide they are drawn,
 *               so the browser can pick the 4K file when the screen needs it. Thumbnails leave it out
 *               and use the 1600 px copy — already several times sharper than they are shown, and it keeps
 *               the graphics memory low enough that every image actually paints.
 */
function mediaNode(r, { autoplay = false, controls = false, poster = false, sizes = null } = {}) {
  if (r.type === 'canvas') { const c = copyCanvas(r.canvas); c.className = 'ph'; return c; }
  if (r.type === 'video' && poster && r.poster) return mediaNode({ type: 'img', src: r.poster });
  if (r.type === 'video') {
    const v = document.createElement('video');
    v.src = r.src; v.loop = !controls; v.playsInline = true;
    v.muted = !controls;
    if (!controls) v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.preload = autoplay ? 'auto' : 'metadata';
    if (r.poster) v.poster = r.poster;
    if (autoplay) v.autoplay = true;
    if (controls) v.controls = true;
    if (r.fx != null) v.style.objectPosition = `${r.fx * 100}% ${r.fy * 100}%`;   // crops keep the DJ in frame
    return v;
  }
  const i = new Image();
  const widthAt = edge => Math.round(r.w * Math.min(1, edge / Math.max(r.w, r.h)));
  if (sizes && r.full && r.w && r.h) {
    const webW = widthAt(1600);
    if (r.w > webW) { i.sizes = sizes; i.srcset = `${r.src} ${webW}w, ${r.full} ${r.w}w`; }
  } else if (sizes && r.thumb && r.light && r.w && r.h) {
    i.sizes = sizes; i.srcset = `${r.thumb} ${widthAt(800)}w, ${r.light} ${widthAt(1600)}w`;
  }
  if (r.fx != null) i.style.objectPosition = `${r.fx * 100}% ${r.fy * 100}%`;
  i.src = r.src; i.alt = ''; i.decoding = 'async'; i.draggable = false;
  // decode it as soon as it has arrived, so it is ready before it comes on screen (no hitch the first time)
  i.addEventListener('load', () => i.decode?.().catch(() => {}), { once: true });
  return i;
}
/** CSS width a cover-fitted photo is really drawn at inside a box (for picking the 4K file) */
const coverSizes = (m, boxW, boxH) => `${Math.round(Math.max(boxW, boxH * aspect(m, 2 / 3)))}px`;
/** the film file for this screen: 1080p on desktop, 720p on phones */
const filmFor = m => (mobile() && m.video720) || m.video;
/** an image that starts loading now; nothing waits for it (the WebGL scenes pick it up once it has arrived) */
const img = (src, priority) => { const i = new Image(); i.decoding = 'async'; if (priority) i.fetchPriority = priority; i.src = src; return i; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const loaded = i => (!(i instanceof HTMLImageElement) || i.complete ? Promise.resolve(i) : new Promise(res => { i.addEventListener('load', () => res(i), { once: true }); i.addEventListener('error', () => res(i), { once: true }); }));

/* ==========================================================================
   STATE
   ========================================================================== */
const sound = new Sound({ bpm: SITE.bpm, src: SITE.audio });
let lenis;
const S = {
  mouse: { x: innerWidth / 2, y: innerHeight / 2, nx: 0.5, ny: 0.5 },
  hero: { active: true, slides: null },
  intro: { phrases: [], count: 0 },
  sound: { active: false, liquid: null, target: 0, g: 0, cur: -1 },
  archive: { cards: [], target: 0, cur: 0, front: -1, active: false },
  next: { videos: [], date: null },
  footer: { active: false, letters: [] },
  menu: { open: false, spin: 0, speed: 0, tiles: [] },
  splash: { done: false, want: false, goto: null },
  ready: false,
};

/* ==========================================================================
   FILM SOUND — the Past Events films and the film on screen in The Sound are
   heard. Browsers only let a page make sound once the visitor has clicked,
   tapped or pressed a key (scrolling does not count); until then the films
   play silently, and from that first touch on they are heard.
   ========================================================================== */
const voices = new Set();      // every film with a soundtrack
let heard = false;             // for browsers that cannot say whether the visitor has clicked yet
const audible = () => (navigator.userActivation ? navigator.userActivation.hasBeenActive : heard);
function addVoice(v) {
  voices.add(v);
  v.want = 0;
  // Safari stops a film it will not let be heard (no tap yet, or another film already has the sound).
  // It then stays silent until the next tap, instead of being started and stopped over and over.
  v.addEventListener('pause', () => { if (!v.muted) { v.denied = true; v.muted = true; } });
}
function hearFilms() {
  if (!navigator.userActivation) heard = true;
  if (!audible()) return;      // a swipe to scroll is not a tap: wait for a real one
  if (navigator.userActivation && !navigator.userActivation.isActive) return;
  // Inside a tap Safari lifts its rules for a film: it may then be unmuted later (as you scroll) and, on an
  // iPhone in Low Power Mode, play at all. Films with sound, and films not playing yet, get that now.
  $$('video').forEach(v => {
    v.denied = false;
    if (v.controls || !v.muted || (!v.paused && !voices.has(v))) return;
    v.muted = false; v.muted = true;
  });
  // the films that should be on screen right now start inside the tap (Low Power Mode refuses them otherwise)
  const hv = S.hero.film;
  if (hv && S.hero.active && hv.paused) hv.play().catch(() => {});
  if (S.next.playing) S.next.videos.forEach(v => v.paused && v.play().catch(() => {}));
}
['pointerdown', 'pointerup', 'keydown', 'touchend'].forEach(t => addEventListener(t, hearFilms, { capture: true, passive: true }));
// a hidden tab goes quiet
document.addEventListener('visibilitychange', () => { if (document.hidden) voices.forEach(v => { v.muted = true; }); });

/**
 * Each frame every film with sound says how loud it wants to be (v.want, 0..1); this decides who is heard.
 * Where the volume can be faded, each plays at its own level (the crossfades). On an iPhone the volume is
 * fixed and a second film with sound makes Safari stop the first, so the loudest one alone is heard.
 */
let lead = null;
function mixVoices() {
  if (canFade) {
    voices.forEach(v => {
      const w = v.paused || v.denied ? 0 : v.want, mute = w < 0.01;
      if (v.muted !== mute) v.muted = mute;
      if (!mute && Math.abs(v.volume - w) > 0.01) v.volume = Math.min(1, w);
    });
  } else {
    const live = v => v && !v.paused && !v.denied && v.want > 0.3;
    let best = null;
    voices.forEach(v => { if (live(v) && (!best || v.want > best.want)) best = v; });
    // the film being heard keeps the sound until another is clearly louder (no flicking back and forth)
    if (best && live(lead) && best.want - lead.want < 0.25) best = lead;
    lead = best;
    voices.forEach(v => { if (v !== lead && !v.muted) v.muted = true; });   // the others go quiet first
    if (lead && lead.muted) lead.muted = false;
  }
  voices.forEach(v => { v.want = 0; });
}

/**
 * Phones and tablets scroll natively. Lenis listens to every touch with a blocking listener, so the phone
 * had to wait for the page's scripts before it could move the page: on an iPhone, while the films and the
 * WebGL scenes were busy, scrolling jumped and froze. This stands in for Lenis there, with the few calls
 * the site uses, and never holds up a touch.
 */
class NativeScroll {
  constructor() {
    this.scroll = scrollY; this.velocity = 0; this.direction = 0; this.handlers = [];
    document.documentElement.classList.add('lenis');
    addEventListener('scroll', () => {
      const y = scrollY, d = y - this.scroll;
      if (d) this.direction = d > 0 ? 1 : -1;
      this.velocity = d; this.scroll = y;
      this.handlers.forEach(h => h(this));
    }, { passive: true });
  }
  on(type, h) { if (type === 'scroll') this.handlers.push(h); }
  raf() { this.velocity *= 0.85; }
  stop() { document.documentElement.classList.add('lenis-stopped'); }
  start() { document.documentElement.classList.remove('lenis-stopped'); }
  scrollTo(target) {
    const node = typeof target === 'string' ? document.querySelector(target) : null;
    const y = node ? node.getBoundingClientRect().top + scrollY : (typeof target === 'number' ? target : 0);
    scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
}

/* ==========================================================================
   SPLASH — two doors, "North" | "Soul". One scroll (or key / tap) opens them
   and the hero's own intro plays in the gap.
   ========================================================================== */
function buildSplash() {
  $('#splashA').textContent = SPLASH.words[0];
  $('#splashB').textContent = SPLASH.words[1];
}

/** move the seam between the doors so the two words, together, sit dead centre */
function centerSplash() {
  const sp = $('#splash');
  if (!sp || S.splash.done) return;
  sp.style.setProperty('--split', '50%');
  const a = $('.splash__door--l .splash__word').getBoundingClientRect();
  const b = $('.splash__door--r .splash__word').getBoundingClientRect();
  const off = innerWidth / 2 - (a.left + b.right) / 2;
  sp.style.setProperty('--split', `${50 + (off / innerWidth) * 100}%`);
}

/** the words rise out of their masks */
function splashIntro() {
  const sp = $('#splash');
  if (!sp || S.splash.done) return;
  centerSplash();
  addEventListener('resize', centerSplash);
  sp.classList.remove('is-pre');
  if (reduced) return;
  S.splash.intro = gsap.timeline({ delay: 0.1 })
    .from(['#splashA', '#splashB'], { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: 0.09 }, 0)
    .from('#splashEnter', { opacity: 0, duration: 1, ease: 'power2.out' }, 0.9);
}

function splashInput() {
  const go = () => enterSite();
  const onWheel = e => { if (e.deltaY > 2) go(); };
  const onKey = e => { if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) go(); };
  let ty = null;
  const onTouchStart = e => { ty = e.touches[0].clientY; };
  // the swipe opens the doors and nothing else: the page behind must not start scrolling under them
  const onTouchMove = e => { if (e.cancelable) e.preventDefault(); if (ty !== null && ty - e.touches[0].clientY > 24) go(); };
  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('keydown', onKey);
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  $('#splash').addEventListener('click', go);
  S.splash.off = () => {
    removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey);
    removeEventListener('touchstart', onTouchStart); removeEventListener('touchmove', onTouchMove);
  };
}

/** the doors swing apart; the hero's intro (film break-through, wordmark, header) runs behind them, unchanged */
function enterSite() {
  const sp = $('#splash');
  if (S.splash.done) return;
  if (!S.ready) {               // still building: remember the request and open as soon as we can
    S.splash.want = true;
    sp.classList.add('is-waiting');
    return;
  }
  S.splash.done = true;
  S.splash.off?.();
  S.splash.intro?.progress(1);
  sp.style.pointerEvents = 'none';
  const doors = ['#doorL', '#doorR'];
  gsap.timeline({ onComplete: () => { sp.classList.add('is-gone'); lenis.start(); } })
    .add(reveal, 0)
    .to('#splashEnter', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
    .to(doors, { '--edge': 1, duration: 0.5, ease: 'power2.out' }, 0)
    .to('#doorL', { xPercent: -101, duration: 1.55, ease: 'expo.inOut' }, 0.05)
    .to('#doorR', { xPercent: 101, duration: 1.55, ease: 'expo.inOut' }, 0.05)
    // the words drift a touch slower than their doors, so the opening reads as depth
    .to('.splash__word', { xPercent: i => (i ? -14 : 14), duration: 1.55, ease: 'expo.inOut' }, 0.05);
}

/* ==========================================================================
   ENTRY
   ========================================================================== */
async function buildHero() {
  const inner = $('#heroInner');
  // nothing here waits for the network: the photos arrive while the first shot plays
  // (the slideshow only moves on to a shot once it has arrived)
  const sources = SLIDES.map((s, i) => {
    const m = s.media;
    if (m.video) {
      const v = mediaNode({ type: 'video', src: filmFor(m) });    // hidden under the canvas: the canvas shows the still
      v.preload = 'none';
      v.classList.add('hero__src');      // stays under the canvas so the browser keeps decoding it
      inner.prepend(v);
      return { el: v, isVideo: true, poster: m.img ? img(m.img, i === 0 ? 'high' : 'low') : null, focus: focusOf(m) };
    }
    // the 1600 px copies: the slideshow canvas is drawn at no more than 1.5× the screen, so they hold up,
    // and swapping in the 4K files froze common laptops for most of a second per photo
    if (m.img) { const p = new Image(); p.decoding = 'async'; return { el: p, later: m.img, focus: focusOf(m) }; }
    return { el: placeholder(m.scene || 'club', m.seed ?? 1, 1600, 1000), focus: focusOf(m) };
  });
  // the doors open as soon as the first shot can be shown: its light still gets the connection to itself
  const first = sources[0];
  await Promise.race([loaded(first.poster || first.el), wait(2500)]);
  // then the first film, then the other photos (the slideshow only needs them a few seconds later)
  if (first.isVideo) { S.hero.film = first.el; first.el.preload = 'auto'; first.el.play().catch(() => {}); }
  sources.forEach(s => { if (s.later) s.el.src = s.later; });
  try {
    S.hero.slides = new Slides($('#slidesGl'), sources, { hold: 3.4, dur: 1.45, onChange: setSlideLabel });
    S.hero.slides.active = true;
  } catch (e) {
    console.warn('WebGL unavailable, showing a still', e);
    $('#slidesGl').replaceWith(mediaNode({ type: 'img', src: SLIDES.find(s => s.media.img)?.media.img }));
  }
  $('#entryRole').textContent = `${SITE.role} — ${SITE.base}`;
  $('#entryScroll').firstChild.textContent = 'Loading ';

  // entry clock — his local time
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: SITE.timezone || undefined });
  const tick = () => { $('#entryTime').textContent = `${fmt.format(new Date())} — ${SITE.city}`; };
  tick(); setInterval(tick, 1000);

  const word = $('#heroWord');
  word.textContent = '';
  [...SITE.artist].forEach(ch => { const o = el('span', 'ch'); const i = el('span', 'ci', ch); i.style.display = 'inline-block'; o.append(i); word.append(o); });

  const mf = $('#manifesto');
  // on phones each line breaks in two (at the word nearest its middle), so the sentence can be set large
  const halves = s => {
    const w = s.split(' ');
    let best = 1;
    for (let i = 2; i < w.length; i++) if (Math.abs(w.slice(0, i).join(' ').length - s.length / 2) < Math.abs(w.slice(0, best).join(' ').length - s.length / 2)) best = i;
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  };
  (mobile() ? HERO.manifesto.flatMap(halves) : HERO.manifesto).forEach(line => {
    const L = el('span', 'mf-line');
    L.style.position = 'relative';
    const inn = el('span');
    const parts = line.split('▮');
    inn.append(document.createTextNode(parts[0].trimEnd()));
    if (parts.length > 1) {
      const slot = el('span', 'mf-slot'); slot.id = 'mfSlot';
      inn.append(slot, document.createTextNode(parts[1].trimStart()));
    }
    L.append(inn); mf.append(L);
  });
  $('#kicker').textContent = HERO.kicker;
}

function setSlideLabel(i) {
  const s = SLIDES[i];
  scramble($('#slideKind'), s.kind.toUpperCase(), 360);
  scramble($('#slideTitle'), s.title, 560);
}

/* ==========================================================================
   BUILDERS
   ========================================================================== */
/* ---------- INTRO: just the words — the sentence, one phrase per line of the page ---------- */
function buildIntro() {
  const story = $('#story');
  INTRO.lines.forEach((text, i) => {
    const p = el('span', 'story__phrase', i < INTRO.lines.length - 1 ? text + ' ' : text);
    p.style.gridRow = i + 1;          // each phrase on its own line of the page, alternating sides
    story.append(p);
    S.intro.phrases.push(p);
  });
  const link = $('#introLink');
  link.href = INTRO.link.href;
  link.textContent = INTRO.link.label;
}

async function buildArtist() {
  const r = await resolve(ARTIST.portrait, 900, 1200);
  const pic = mediaNode(r, { sizes: mobile() ? coverSizes(ARTIST.portrait, innerWidth, innerHeight * 0.78) : coverSizes(ARTIST.portrait, innerWidth / 2, innerHeight) });
  pic.alt = `${SITE.artist} portrait`;
  pic.loading = 'lazy';      // arrives as the section comes near, not while the opening plays
  $('#artistImg').append(pic);
  const t = $('#artistTitle');
  t.append(document.createTextNode(ARTIST.title[0]), el('em', null, ARTIST.title[1]));
  t.classList.add('split');
  const bio = $('#artistBio');
  ARTIST.bio.forEach(p => bio.append(el('p', null, p)));
  const facts = $('#artistFacts');
  ARTIST.facts.forEach(f => { const d = el('div'); d.append(el('dt', 'mono', f.k), el('dd', null, f.v)); facts.append(d); });
}

async function buildSound() {
  const fb = $('#soundFallback');
  const wide = !portrait();
  // nothing downloads yet: the films start loading one screen before the section (see soundScene),
  // and each chapter shows its still until its film has frames
  const source = async (m, main) => {
    if (!m) return null;
    if (m.video) {
      const v = mediaNode({ type: 'video', src: main ? filmFor(m) : m.video, poster: m.img });
      v.preload = 'none';
      if (main) v.classList.add('fb-main');
      fb.append(v);   // kept in the DOM (under the canvas) so the browser keeps decoding it
      // the still only shows for the moment before the film has frames (under the melt), so the light 640 px
      // copy does: fifteen full-size stills going onto the GPU made the page stutter as the section came near
      return { el: v, isVideo: true, poster: (main || wide) && (m.thumb || m.img) ? img(m.thumb || m.img) : null, focus: focusOf(m) };
    }
    const r = await resolve(m, 1440, 900);
    const node = r.type === 'canvas' ? r.canvas : img(r.src);
    const shown = r.type === 'canvas' ? copyCanvas(r.canvas) : node.cloneNode();
    if (main) shown.classList.add('fb-main');
    fb.append(shown);
    return { el: node, focus: focusOf(m) };
  };
  const chapters = [];
  for (const ch of CHAPTERS) {
    const [l, r] = ch.sides || [];
    chapters.push({ cols: [await source(l, false), await source(ch.media, true), await source(r, false)] });
  }
  const labels = $('#soundLabels');
  CHAPTERS.forEach(ch => {
    const L = el('div', 'snd-label');
    const meta = el('div', 'snd-label__meta');
    meta.append(el('span', 'snd-label__sub', ch.sub), el('p', 'snd-label__note', ch.note));
    const big = el('div', 'snd-label__big');
    splitWords(big, ch.label);
    L.append(meta, big);
    labels.append(L);
  });
  const bar = $('#soundBar');
  CHAPTERS.forEach(() => { const s = el('div', 'seg'); s.append(el('b')); bar.insertBefore(s, $('#soundHead')); });
  try {
    S.sound.liquid = new Liquid($('#soundGl'), chapters);
    // draw it once now, behind the opening screen: the graphics driver finishes preparing the effect on its
    // first draw, which otherwise froze the page for a moment as you scrolled into the section
    S.sound.liquid.render(0);
  } catch (e) {
    console.warn('WebGL fallback', e);
    document.documentElement.classList.add('no-webgl');
  }
}

/* ---------- PAST EVENTS: the nights as cards on a curved ring ---------- */
async function buildArchive() {
  const A = S.archive, ring = $('#flowRing');
  $('#flowTitle').textContent = ARCHIVE.title;
  $('#flowSub').textContent = ARCHIVE.sub;
  for (const [i, ev] of EVENTS.entries()) {
    const r = await resolve(ev.media, 900, 1600);
    const tag = [ev.tag, ev.date].filter(Boolean).join(' · ');
    const card = el('article', 'fcard');
    const media = el('div', 'fcard__media');
    const node = mediaNode(r);
    if (node.tagName === 'VIDEO') node.preload = 'none';   // the cards near the front start loading as the section comes near
    media.append(node);
    const foot = el('div', 'fcard__foot');
    foot.append(el('h3', 'fcard__title', ev.title));
    card.append(media, el('span', 'fcard__tag mono', tag), foot, el('i', 'fcard__shade'));
    card.setAttribute('aria-label', `${ev.title}${tag ? ', ' + tag : ''}`);
    ring.append(card);
    A.cards.push({ el: card, video: node.tagName === 'VIDEO' ? node : null, media: ev.media, title: ev.title, tag });
  }
  $('#archive').style.setProperty('--n', EVENTS.length);
}

async function buildNextEvent() {
  const E = NEXT_EVENT;
  const d = new Date(E.date);
  S.next.date = d;
  const part = (opt) => new Intl.DateTimeFormat('en-GB', { ...opt, timeZone: SITE.timezone || undefined }).format(d);

  // the record: a sleeve with a photo, a picture disc that plays the film
  $('#sleevePhoto').append(mediaNode(await resolve(E.sleeve, 900, 900)));
  $('#sleeveTitle').textContent = E.title;
  const film = mediaNode(await resolve(E.film, 900, 1600));
  film.preload = 'none';
  $('#discFilm').append(film);
  S.next.videos.push(film);
  $('#discDay').textContent = part({ day: '2-digit' });
  const label = `${E.title} · ${E.city.split(',')[0]} · ${part({ day: '2-digit' })}.${part({ month: '2-digit' })}.${part({ year: 'numeric' })} · `;
  const tp = $('#labelText');
  tp.textContent = label;
  tp.setAttribute('textLength', '455'); tp.setAttribute('lengthAdjust', 'spacing');
  $('#disc').addEventListener('click', () => openLightbox(E.film, `<b>${E.title}</b> · ${E.venue}`));
  const date = $('#nextDate');
  date.append(el('span', 'next__day', part({ day: '2-digit' })));
  const mon = el('span', 'next__mon mono');
  mon.append(el('span', null, `${part({ month: 'short' })} ${part({ year: 'numeric' })}`), el('span', null, part({ weekday: 'long' })));
  date.append(mon);
  $('#nextTitle').textContent = E.title;
  $('#nextVenue').textContent = E.venue;
  $('#nextDoors').textContent = E.doors;
  $('#nextCity').textContent = E.city;
  $('#nextTickets').href = E.tickets;
}

let frameCols = 0;
async function buildFrames() {
  const cols = mobile() ? 2 : 5;
  if (cols === frameCols) return;
  frameCols = cols;
  const grid = $('#framesGrid');
  grid.textContent = '';
  grid.style.setProperty('--cols', cols);
  const colEls = Array.from({ length: cols }, () => { const c = el('div', 'fr-col'); grid.append(c); return c; });
  const ratios = ['4 / 5', '1 / 1', '3 / 4', '4 / 5', '5 / 6'];
  for (const [i, f] of FRAMES.entries()) {
    const r = await resolve(f.media, 600, 750, 'grid');
    const fig = el('figure', 'fr-item');
    const m = el('div', 'fr-item__media');
    m.style.aspectRatio = ratios[i % ratios.length];
    const node = mediaNode(r, { sizes: `${Math.ceil(innerWidth / cols)}px` });   // light copy unless the screen needs more
    if (node.tagName === 'IMG') node.loading = 'lazy';
    m.append(node);
    const cap = el('figcaption', 'mono');
    cap.append(el('span', null, f.caption));
    fig.append(m, cap);
    fig.addEventListener('click', () => openLightbox(f.media, `<b>${f.caption}</b>`));
    colEls[i % cols].append(fig);
  }
}

/* ---------- PRESS KIT: just the download (photos + bio in one zip) ----------
   The zip is not stored on the site: on click it is put together in the browser from the original
   photos and the bio, exactly as they are (stored, not recompressed), so the visitor gets the same
   files at the same quality. */
function buildPress() {
  const P = PRESS;
  $('#pressTitle').append(document.createTextNode(P.title[0] + ' '), el('em', null, P.title[1]));
  $('#pressText').textContent = P.intro;
  const btn = $('#pressZip'), meta = $('#pressZipMeta');
  $('#pressZipLabel').textContent = P.zip.label;
  meta.textContent = P.zip.meta;
  const files = [
    { url: P.bio, name: `${P.zip.name}/${P.bio.split('/').pop()}` },
    ...P.photos.map(p => ({ url: p.file, name: `${P.zip.name}/photos/${p.file.split('/').pop()}` })),
  ];
  let ready = null, busy = false;
  const save = url => {
    const a = document.createElement('a');
    a.href = url; a.download = `${P.zip.name}.zip`;
    document.body.append(a); a.click(); a.remove();
  };
  btn.addEventListener('click', async e => {
    e.preventDefault();
    if (ready) return save(ready);
    if (busy) return;
    busy = true; btn.classList.add('is-busy');
    try {
      const zip = await zipFiles(files, done => { meta.textContent = `Preparing the zip · ${Math.round(done * 100)}%`; });
      ready = URL.createObjectURL(zip);
      meta.textContent = P.zip.meta;
      save(ready);
    } catch (err) {
      console.warn('press kit', err);
      meta.textContent = 'The download was interrupted, try again';
    }
    busy = false; btn.classList.remove('is-busy');
  });
}

/** A zip of the given files, stored as they are (no recompression): fetched one by one, so only
    one photo is ever held in memory while its checksum is taken. onProgress gets 0..1. */
async function zipFiles(files, onProgress) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (let i = 0; i < files.length; i++) {
    const res = await fetch(files[i].url);
    if (!res.ok) throw new Error(`${files[i].url}: ${res.status}`);
    const blob = await res.blob();
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const name = enc.encode(files[i].name), size = blob.size;
    const local = new DataView(new ArrayBuffer(30 + name.length));
    // local header: signature, version 2.0, UTF-8 names, stored, time, date, crc, sizes, name length
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4],
      [18, size, 4], [22, size, 4], [26, name.length, 2], [28, 0, 2]].forEach(([o, v, w]) => (w === 4 ? local.setUint32(o, v, true) : local.setUint16(o, v, true)));
    new Uint8Array(local.buffer).set(name, 30);
    const dir = new DataView(new ArrayBuffer(46 + name.length));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4],
      [20, size, 4], [24, size, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
      .forEach(([o, v, w]) => (w === 4 ? dir.setUint32(o, v, true) : dir.setUint16(o, v, true)));
    new Uint8Array(dir.buffer).set(name, 46);
    parts.push(local.buffer, blob);
    central.push(dir.buffer);
    offset += local.byteLength + size;
    onProgress((i + 1) / files.length);
  }
  const dirSize = central.reduce((s, b) => s + b.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, dirSize, 4], [16, offset, 4], [20, 0, 2]]
    .forEach(([o, v, w]) => (w === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

/* ---------- TRUSTED BY: venue marks in ink, balanced so none shouts louder than another ---------- */
function buildTrusted() {
  $('#trustedTitle').textContent = TRUSTED.title;
  const grid = $('#trustedGrid');
  const marks = [];
  TRUSTED.venues.forEach(v => {
    const cell = el('li', 'trusted__cell');
    const sign = el('div', 'trusted__sign');
    if (v.logo) {
      const img = new Image();
      img.className = 'trusted__mark'; img.alt = v.name; img.decoding = 'async'; img.draggable = false;
      img.src = v.logo;
      img.addEventListener('load', () => size(img));
      sign.append(img);
      marks.push(img);
    } else {
      const t = el('span', 'trusted__type');
      t.setAttribute('aria-label', v.name);
      (v.type || [v.name]).forEach(line => t.append(el('span', null, line)));
      sign.append(t);
    }
    cell.append(sign);
    grid.append(cell);
  });
  // optical balance: every mark gets about the same area, within the cell's width and height
  const size = img => {
    const cell = img.closest('.trusted__cell');
    if (!cell || !img.naturalWidth) return;
    const cs = getComputedStyle(cell);
    const w = cell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ar = img.naturalWidth / img.naturalHeight;
    const h = Math.min(w * 0.6 / Math.sqrt(ar), cell.clientHeight * 0.6, w / ar);
    img.style.setProperty('--h', `${Math.round(h)}px`);
  };
  addEventListener('resize', () => marks.forEach(size));
}

/** the signs come on one by one, in a loose order, each with a short flicker */
function trustedScene() {
  const cells = $$('.trusted__cell');
  const order = cells.map((c, i) => [c, (i * 3) % cells.length]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  ScrollTrigger.create({
    trigger: '#trusted', start: 'top 72%', once: true,
    onEnter: () => order.forEach((c, i) => setTimeout(() => c.classList.add('is-on'), reduced ? 0 : i * 140)),
  });
}

/* ---------- BOOKING: three direct lines — mail, WhatsApp, call ---------- */
function buildContact() {
  const C = CONTACT;
  $('#bookTitle').append(document.createTextNode(C.headline[0] + ' '), el('em', null, C.headline[1] + '.'));
  $('#bookIntro').textContent = C.intro;
  const digits = C.phone.replace(/\D/g, '');
  const rows = [
    ['Email', C.email, 'Write', `mailto:${C.email}?subject=${encodeURIComponent(C.emailSubject)}&body=${encodeURIComponent(C.emailBody)}`, false],
    ['WhatsApp', C.phoneLabel, 'Message', `https://wa.me/${digits}?text=${encodeURIComponent(C.whatsappText)}`, true],
    ['Call', C.phoneLabel, 'Call', `tel:${C.phone}`, false],
  ];
  const list = $('#contactLines');
  rows.forEach(([word, value, action, href, external], i) => {
    const a = el('a', 'line');
    a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    const d = el('span', 'line__d');
    d.append(el('span', 'line__v', value), el('span', 'line__a mono', `${action} ↗`));
    a.append(el('span', 'line__w', word), d);
    const li = el('li'); li.append(a); list.append(li);
  });
  const m = $('#contactMgmt');       // the local number, for calls from inside Morocco
  m.textContent = `${C.local.label} — ${C.local.value}`; m.href = C.local.href;
  const so = $('#socials');
  C.socials.forEach(s => { const a = el('a', null, s.label); a.href = s.href; a.target = '_blank'; a.rel = 'noopener'; so.append(a); });
  // his local time, so nobody calls Tangier at 4 a.m.
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SITE.timezone || undefined });
  const tick = () => { $('#contactTime').textContent = `${fmt.format(new Date())} in ${SITE.city}`; };
  tick(); setInterval(tick, 20000);
}

async function buildMenu() {
  const nav = $('#menuNav');
  const items = [['01', 'The Artist', '#artist'], ['02', 'The Sound', '#sound'], ['03', 'Past Events', '#archive'],
    ['04', 'Next Event', '#next'], ['05', 'Frames', '#frames'], ['06', 'Press Kit', '#press'], ['07', 'Booking', '#booking']];
  items.forEach(([n, t, href]) => {
    const a = el('a'); a.href = href;
    a.append(el('span', 't', t));
    nav.append(a);
  });
  const mail = CONTACT.channels[0];
  $('#menuMail').textContent = mail.value; $('#menuMail').href = mail.href;
  CONTACT.socials.slice(0, 4).forEach(s => { const a = el('a', null, s.label); a.href = s.href; a.target = '_blank'; a.rel = 'noopener'; $('#menuSocials').append(a); });

  const ring = $('#ring');
  for (const m of MENU_TILES) {
    const r = await resolve(m, 480, 300, 'small');
    const t = el('div', 'ring-tile');
    const a = mediaNode(r), b = mediaNode(r);
    a.loading = b.loading = 'lazy';
    t.append(a, b);
    ring.append(t);
    S.menu.tiles.push(t);
  }
  layoutRing();
}

function layoutRing() {
  const N = S.menu.tiles.length;
  if (!N) return;
  const tw = clamp(innerWidth * 0.15, 120, 240);
  const R = (tw * N) / TAU * 1.06;
  $('#ring').style.setProperty('--tw', tw + 'px');
  S.menu.tiles.forEach((t, i) => { t.style.transform = `rotateY(${(i / N) * 360}deg) translateZ(${R}px)`; });
}

function buildFooter() {
  if (FOOTER_FILM) {
    const v = mediaNode({ type: 'video', src: filmFor(FOOTER_FILM), poster: FOOTER_FILM.img });
    v.preload = 'none';
    $('#ftrReel').prepend(v);
    S.footer.video = v;
  }
  const word = $('#ftrWord');
  [...SITE.artist].forEach(c => { const s = el('span', null, c); word.append(s); S.footer.letters.push(s); });
  $('#year').textContent = new Date().getFullYear();
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SITE.timezone || undefined });
  const tick = () => { $('#localTime').textContent = `${SITE.city} — ${fmt.format(new Date())}`; };
  tick(); setInterval(tick, 20000);
}

/* ==========================================================================
   SCROLL SCENES
   ========================================================================== */
function heroScene() {
  const sticky = $('.hero__sticky'), frameEl = $('#heroFrame'), inner = $('#heroInner');
  const st = { k: 0 };
  let W = innerWidth, H = innerHeight, slot = { x: 0, y: 0, w: 100, h: 40 };
  const measure = () => {
    W = sticky.clientWidth; H = sticky.clientHeight;
    inner.style.width = W + 'px'; inner.style.height = H + 'px';
    inner.style.marginLeft = -W / 2 + 'px'; inner.style.marginTop = -H / 2 + 'px';
    const s = $('#mfSlot');
    if (s) {
      // layout offsets ignore transforms, so this stays right while the sentence is animating
      const line = s.closest('.mf-line');
      slot = { x: line.offsetLeft + s.offsetLeft, y: line.offsetTop + s.offsetTop, w: s.offsetWidth, h: s.offsetHeight };
      $('#manifesto').style.transformOrigin = `${slot.x + slot.w / 2}px ${slot.y + slot.h / 2}px`;
    }
    S.hero.slides?.resize();
    apply();
  };
  const apply = () => {
    const k = st.k;
    const x = lerp(0, slot.x, k), y = lerp(0, slot.y, k), w = lerp(W, slot.w, k), h = lerp(H, slot.h, k);
    frameEl.style.left = x + 'px'; frameEl.style.top = y + 'px';
    frameEl.style.width = w + 'px'; frameEl.style.height = h + 'px';
    inner.style.transform = `scale(${Math.max(w / W, h / H)})`;
    const dark = k < 0.12 && S.hero.active;   // white header only while the film fills the top edge
    if (dark !== S.hero.dark) { S.hero.dark = dark; setDarkZone('hero', dark); }
  };
  ScrollTrigger.addEventListener('refreshInit', measure);
  measure();

  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.9 },
  })
    .to('#heroWord .ch', { yPercent: -112, stagger: 0.012, duration: 0.2, ease: 'power2.in' }, 0)
    .to('#entry', { opacity: 0, duration: 0.12 }, 0)
    .to(st, { k: 1, duration: 0.5, ease: 'power3.inOut', onUpdate: apply }, 0.08)
    .from('.mf-line > span', { yPercent: 115, stagger: 0.05, duration: 0.24, ease: 'power3.out' }, 0.3)
    .from('#kicker', { opacity: 0, y: 24, duration: 0.14 }, 0.6)
    // the sentence holds a moment with the film inside it, then the page simply scrolls on to the artist
    .to({}, { duration: 0.18 });

  ScrollTrigger.create({
    trigger: '.hero', start: 'top bottom', end: 'bottom top',
    onToggle: s => {
      S.hero.active = s.isActive;
      if (S.hero.slides) S.hero.slides.active = s.isActive;
      // the slideshow stops drawing once the hero is off screen, so its film is paused here (it played on, unseen, all page long)
      if (!s.isActive) S.hero.film?.pause();
      apply();
    },
  });
}

/**
 * INTRO — the page holds still while the sentence assembles on it, one phrase per stretch of scroll.
 * The first phrase is there as you arrive; the whole sentence holds for a moment at the end.
 * Scrolling back takes the phrases away again.
 */
function introScene() {
  const I = S.intro, N = I.phrases.length, link = $('#introLink');
  const show = count => {
    if (count === I.count) return;
    I.count = count;
    I.phrases.forEach((p, i) => p.classList.toggle('is-on', i < count));
    link.classList.toggle('is-on', count === N);
  };
  show(1);
  ScrollTrigger.create({
    trigger: '#intro', start: 'top top', end: 'bottom bottom',
    onUpdate: st => show(Math.min(N, 1 + Math.floor(st.progress * (N + 1)))),
  });
}

function artistScene() {
  gsap.fromTo('#artistImg > *', { scale: 1.16, yPercent: -3 }, {
    scale: 1, yPercent: 3, ease: 'none',
    scrollTrigger: { trigger: '#artist', start: 'top bottom', end: 'bottom top', scrub: drift },
  });
  gsap.from('#artistImg', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: '#artist', start: 'top 75%' } });
  // signature: reading — each word comes up to full ink as your eye (the scroll) reaches it
  const words = SplitText.create('.artist__bio p', { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.13 }, { opacity: 1, stagger: 0.04, ease: 'none', scrollTrigger: { trigger: '#artistBio', start: 'top 78%', end: 'bottom 52%', scrub: true } });
  gsap.fromTo('.facts > div', { opacity: 0.13 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '#artistFacts', start: 'top 88%', end: 'bottom 72%', scrub: true } });
}

/**
 * The films play normally while you read a chapter. Scrolling into the next chapter's stretch
 * triggers the liquid melt as a timed animation (it is not tied to the scrollbar), once the
 * next films have frames ready.
 */
function soundScene() {
  const n = CHAPTERS.length, s = S.sound;
  s.target = 0; s.g = 0;
  let tween = null, want = 0;
  const go = async k => {
    want = k;
    if (s.liquid) await s.liquid.prepare(k);       // the next films get going before the melt starts
    if (want !== k) return;                         // the user has already moved on
    tween?.kill();
    const dist = Math.abs(k - s.g);
    tween = gsap.to(s, {
      g: k, ease: 'power2.inOut',
      duration: reduced ? 0 : Math.min(2.2, 1.25 + 0.4 * Math.max(0, dist - 1)),
      onComplete: () => s.liquid?.prime(k),
    });
  };
  ScrollTrigger.create({
    trigger: '#sound', start: 'top top', end: 'bottom bottom',
    onUpdate: st => {
      const k = Math.min(n - 1, Math.floor(st.progress * n));
      if (k !== s.target) { s.target = k; go(k); }
      $$('#soundBar .seg').forEach((seg, i) => seg.style.setProperty('--p', clamp(st.progress * n - i, 0, 1)));
      $('#soundHead').style.left = `calc(${st.progress * 100}% - 1px)`;
    },
  });
  // one screen before the section arrives, the first chapter's films start loading
  ScrollTrigger.create({
    trigger: '#sound', start: 'top bottom+=100%', once: true,
    onEnter: () => {
      if (s.liquid) { s.liquid.prepare(0); s.stillsDue = true; }   // and its stills go up, one per frame (see loop)
      else { const v = $('#soundFallback > video.fb-main'); if (v) v.preload = 'auto'; }
    },
  });
  // the film on screen in each chapter is the one that is heard (the side cameras stay silent)
  s.mains = $$('#soundFallback > .fb-main').map(m => (m.tagName === 'VIDEO' ? m : null));
  s.mains.forEach(v => v && addVoice(v));
  ScrollTrigger.create({
    trigger: '#sound', start: 'top bottom', end: 'bottom top',
    onToggle: st => {
      S.sound.active = st.isActive;
      if (S.sound.liquid) S.sound.liquid.active = st.isActive;
      if (st.isActive && !s.primed) { s.primed = true; s.liquid?.prime(0); }   // then the second chapter's, behind it
      if (!st.isActive) $$('#soundFallback video').forEach(v => { v.muted = true; v.pause(); });   // out of view: silent and still
    },
  });
  setSoundLabel(0);
}

/**
 * The Sound is heard with its picture: the film on screen plays with sound, during a melt its
 * sound crossfades into the next chapter's, and it fades in and out as the section scrolls in and out.
 */
function soundVoices() {
  const s = S.sound;
  if (!s.mains) return;
  let gain = 0;
  if (audible() && !document.hidden) {
    const r = $('#sound').getBoundingClientRect();
    gain = clamp((Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight, 0, 1);
  }
  const a = Math.floor(s.g + 1e-4), p = clamp(s.g - a, 0, 1);
  s.mains.forEach((v, k) => { if (v) v.want = gain * (k === a ? 1 - p : k === a + 1 ? p : 0); });   // heard in mixVoices
}

function setSoundLabel(i) {
  if (i === S.sound.cur) return;
  S.sound.cur = i;
  $$('.snd-label').forEach((L, k) => { L.classList.toggle('is-active', k === i); L.classList.toggle('is-past', k < i); });
  $$('#soundFallback > .fb-main').forEach((m, k) => {
    m.classList.toggle('is-active', k === i);
    if (!S.sound.liquid && m.tagName === 'VIDEO') (k === i ? m.play().catch(() => {}) : m.pause());
  });
}

function updateSound(time) {
  const s = S.sound;
  const L = s.liquid;
  if (L) {
    L.set(s.g);
    L.state.beat = sound.kick;
    L.state.vel = lenis ? clamp(lenis.velocity / 40, -1, 1) : 0;
    L.state.mouse = [S.mouse.nx, S.mouse.ny];
    L.render(time);
    setSoundLabel(L.state.index + (L.state.p > 0.5 ? 1 : 0));
  } else {
    setSoundLabel(Math.round(s.g));
  }
  soundVoices();
}

/**
 * PAST EVENTS — the ring. It turns sideways only (swipe, drag, Shift + wheel, arrow keys or the
 * arrow buttons), so scrolling down the page simply carries on past it. The front card faces you;
 * the others turn in towards it, step back and fade into the page. The films play on their own.
 */
function archiveScene() {
  const A = S.archive, N = A.cards.length, ring = $('#flowRing'), sec = $('#archive');
  if (!N) return;
  A.target = 0; A.cur = 0; A.front = -1; A.sec = sec;
  ScrollTrigger.create({
    trigger: sec, start: 'top bottom', end: 'bottom top',
    onToggle: s => {
      A.active = s.isActive;
      if (!s.isActive) { A.cards.forEach(c => { if (c.video) { c.video.pause(); c.video.muted = true; c.vol = 0; } }); A.front = -1; }
    },
  });
  // one screen before the section arrives, the films at the front start loading, so they play as soon as you're here
  ScrollTrigger.create({
    trigger: sec, start: 'top bottom+=100%', once: true,
    onEnter: () => A.cards.slice(0, 3).forEach((c, i) => setTimeout(() => { if (c.video) c.video.preload = 'auto'; }, i * 200)),
  });

  const go = i => { A.target = clamp(i, 0, N - 1); };
  const step = d => go(Math.round(A.target) + d);
  // where a gesture lands: a short flick moves exactly one night, a long one the nearest night
  const land = start => {
    const d = A.target - start;
    if (Math.abs(d) < 0.12) go(Math.round(start));
    else if (Math.abs(d) < 1) go(Math.round(start) + Math.sign(d));
    else go(Math.round(A.target));
  };
  $('#flowPrev').addEventListener('click', () => step(-1));
  $('#flowNext').addEventListener('click', () => step(1));
  // arrow keys, while the section fills most of the screen
  addEventListener('keydown', e => {
    const r = sec.getBoundingClientRect();
    if (r.top > innerHeight * 0.4 || r.bottom < innerHeight * 0.6) return;
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });
  // sideways wheel / trackpad swipe turns the ring; a vertical wheel is left to the page
  let wheelFrom = null, wheelT;
  ring.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelFrom === null) wheelFrom = A.target;
    A.target = clamp(A.target + e.deltaX / (A.cw * 1.3), 0, N - 1);
    clearTimeout(wheelT);
    wheelT = setTimeout(() => { land(wheelFrom); wheelFrom = null; }, 140);   // the gesture has ended
  }, { passive: false });
  // size: big — the front card fills most of the ring's screen (on phones, most of the width)
  const measure = () => {
    const h = ring.clientHeight, cw = Math.min(h * 0.9 * 0.5625, innerWidth * (mobile() ? 0.72 : 0.3));
    ring.style.setProperty('--cw', `${Math.round(cw)}px`);
    A.cw = cw;
  };
  ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('resize', measure);
  measure();

  // drag or swipe to turn the ring by hand; on release it lands on the next night in that direction
  let down = false, lastX = 0, moved = 0, from = 0;
  ring.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; moved = 0; from = A.target; ring.classList.add('is-dragging'); });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    A.target = clamp(A.target - dx / (A.cw * 1.15), 0, N - 1);
  });
  const release = () => {
    if (!down) return;
    down = false; ring.classList.remove('is-dragging');
    if (moved <= 6) return;
    land(from);
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  // the films play on their own (see updateArchive); the one in front is heard
  A.cards.forEach(c => { if (c.video) { addVoice(c.video); c.vol = 0; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) A.cards.forEach(c => c.video?.pause()); });
}

/** one frame of the ring */
function updateArchive(dt) {
  const A = S.archive, N = A.cards.length, cw = A.cw || 260;
  A.cur += (A.target - A.cur) * (1 - Math.exp(-dt * 6));   // a soft glide to wherever the ring was sent
  const shown = A.cur;
  A.cards.forEach((c, i) => {
    const d = i - shown, ad = Math.abs(d);
    if (ad > 4.2) { c.el.style.visibility = 'hidden'; return; }
    c.el.style.visibility = 'visible';
    // the inside of a ring: spacing tightens with distance, cards turn in towards the front one
    const x = Math.sign(d) * (Math.min(ad, 1) * 1.16 + Math.max(0, ad - 1) * 0.86) * cw;
    const ry = clamp(-d * 32, -64, 64);
    const z = -Math.min(ad, 3.5) * 0.34 * cw;
    const sc = 1 - Math.min(ad, 3) * 0.035;
    c.el.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    c.el.style.opacity = clamp(1.7 - ad * 0.38, 0, 1).toFixed(3);
    c.el.style.zIndex = String(100 - Math.round(ad * 10));
    c.el.style.setProperty('--c', clamp(1 - ad * 1.4, 0, 1).toFixed(3));
  });
  const front = clamp(Math.round(shown), 0, N - 1);
  if (front !== A.front) {
    A.front = front;
    // the cards near the front buffer ahead, one after another (a film's first load costs the page a moment)
    A.cards.filter((c, i) => c.video && c.video.preload !== 'auto' && Math.abs(i - front) <= 2)
      .forEach((c, i) => setTimeout(() => { c.video.preload = 'auto'; }, i * 200));
  }

  // The films play on their own while you're here: the one in front, and on wide screens its two neighbours
  // (big and in sight). Starts are spaced out, front first. The front film is heard (once the visitor has
  // clicked anywhere: a browser rule), fading with the section and crossfading as the ring turns.
  const now = performance.now(), wide = !mobile(), frontV = A.cards[front].video;
  let gain = 0;
  if (audible() && !document.hidden) {
    const r = A.sec.getBoundingClientRect();
    gain = clamp((Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight, 0, 1);
  }
  const k = 1 - Math.exp(-dt * 6);
  A.cards.forEach((c, i) => {
    const v = c.video;
    if (!v) return;
    const want = i === front || (wide && Math.abs(i - front) === 1);
    if (want) {
      const turn = i === front || !frontV || !frontV.paused;
      if (v.paused && turn && now - (A.lastStart || 0) > 150) { A.lastStart = now; v.play().catch(() => {}); }
    } else if (!v.paused) v.pause();
    c.vol += ((i === front ? gain : 0) - c.vol) * k;
    v.want = c.vol;                // heard in mixVoices
  });
}

function nextScene() {
  const sec = $('#next');
  let inView = false, playing = false;
  const setPlaying = on => {
    on = on && inView;
    if (on === playing) return;
    playing = on; S.next.playing = on;
    sec.classList.toggle('is-playing', on);
    $('#nextNow').textContent = on ? 'Now playing — Side A' : 'Cueing up';
    S.next.videos.forEach(v => (on ? v.play().catch(() => {}) : v.pause()));
  };
  ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: s => { inView = s.isActive; if (!inView) setPlaying(false); } });

  // the record comes out of its sleeve, spinning; then the arm swings over and drops onto it
  const travel = () => $('#deck').offsetHeight * (mobile() ? 0.6 : 0.78);   // on phones the record comes 60% out, so it can be bigger
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: s => setPlaying(s.progress > (mobile() ? 0.5 : 0.62)),
    },
  })
    .fromTo('#sleeve', { xPercent: -24, rotate: -5, opacity: 0 }, { xPercent: 0, rotate: 0, opacity: 1, duration: 0.14, ease: 'power3.out' }, 0)
    .fromTo('#disc', { x: 0, rotate: -360 }, { x: travel, rotate: 0, duration: 0.4, ease: 'power2.inOut' }, 0.12)   // rolls out, lands upright
    .fromTo('.disc__sheen', { rotate: 360 }, { rotate: 0, duration: 0.4, ease: 'power2.inOut' }, 0.12)             // the light stays put
    .fromTo('#arm', { rotate: -8 }, { rotate: 20, duration: 0.12, ease: 'power2.inOut' }, 0.5)
    .to({}, { duration: 0.38 });
  if (reduced) tl.progress(1);

  // the date flaps down into place like a departures board
  gsap.timeline({ scrollTrigger: { trigger: '#next', start: 'top 55%' } })
    .fromTo('.next__top, .next__info, .next__cta', { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.08, ease: 'power2.out' }, 0)
    .fromTo('.next__day, .next__mon', { rotateX: -96, opacity: 0, transformOrigin: '50% 0%' }, { rotateX: 0, opacity: 1, duration: 0.9, stagger: 0.07, ease: 'back.out(1.5)' }, 0.1);
}

function framesScene() {
  const run = () => {
    $$('.fr-col').forEach((c, i) => {
      const dir = i % 2 ? -1 : 1;
      gsap.fromTo(c, { y: dir * 90 }, { y: -dir * 90, ease: 'none', scrollTrigger: { trigger: '#frames', start: 'top bottom', end: 'bottom top', scrub: drift } });
    });
    // signature: the darkroom — each print starts blown-out white and develops into the image
    ScrollTrigger.batch('.fr-item', {
      start: 'top 90%', once: true,
      onEnter: els => els.forEach((e, i) => setTimeout(() => {
        e.classList.add('is-dev');
        setTimeout(() => e.classList.add('is-done'), 2800);
      }, i * 140)),
    });
  };
  // the heading pulls into focus like a lens
  gsap.fromTo('#framesTitle', { filter: 'blur(18px)', opacity: 0, scale: 1.05 }, { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 1.9, ease: 'power2.out', scrollTrigger: { trigger: '#frames', start: 'top 72%' } });
  run();
  let t;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const before = frameCols;
      await buildFrames();
      if (before !== frameCols) {
        ScrollTrigger.getAll().filter(s => s.trigger && (s.trigger.id === 'frames' || s.trigger.id === 'framesGrid')).forEach(s => s.kill());
        run(); ScrollTrigger.refresh();
      }
    }, 250);
  });
}

function footerScene() {
  ScrollTrigger.create({
    trigger: '#ftr', start: 'top bottom', end: 'bottom top',
    onToggle: s => {
      S.footer.active = s.isActive;
      const v = S.footer.video;
      if (v) (s.isActive ? v.play().catch(() => {}) : v.pause());
    },
  });
  // signature: an equaliser — the letters spring up from the baseline like level meters
  gsap.fromTo('#ftrWord span', { '--in': 0 }, { '--in': 1, duration: 1.6, ease: 'elastic.out(1, 0.42)', stagger: { each: 0.06, from: 'random' }, scrollTrigger: { trigger: '#ftrWord', start: 'top 95%' } });
}

/** press kit: the download bar is printed onto the page, left to right, like a sheet coming out of the press */
function pressScene() {
  gsap.timeline({ scrollTrigger: { trigger: '.press__top', start: 'top 75%' } })
    .fromTo('.press__zip', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0)
    .fromTo('.press__zip-i', { rotate: -90, opacity: 0 }, { rotate: 0, opacity: 1, duration: 0.9, ease: 'back.out(1.8)' }, 0.8);
}

/** booking: each word pulls its letters in from wide tracking, like type being set */
function contactScene() {
  $$('.line__w').forEach(w => gsap.fromTo(w, { letterSpacing: '0.34em', opacity: 0 }, {
    letterSpacing: '-0.06em', opacity: 1, duration: 1.7, ease: 'expo.out',
    scrollTrigger: { trigger: w, start: 'top 92%' },
  }));
  gsap.fromTo('.lines li', { '--rule': 0 }, { '--rule': 1, duration: 1.2, stagger: 0.12, ease: 'expo.inOut', scrollTrigger: { trigger: '#contactLines', start: 'top 85%' } });
}

function updateFooter(time) {
  const on = sound.on;
  S.footer.letters.forEach((s, i) => {
    const k = on ? 1 + sound.bars[i % 4] * 0.28 + sound.kick * 0.06 : 1 + Math.sin(time * 1.6 + i * 0.6) * 0.025;
    s.style.setProperty('--k', k.toFixed(3));
  });
}

function splitReveals() {
  $$('.split').forEach(node => {
    SplitText.create(node, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: node, start: 'top 88%' } }),
    });
  });
}

/* ==========================================================================
   MENU, LIGHTBOX, CURSOR, HEADER
   ========================================================================== */
function menuSetup() {
  const menu = $('#menu'), btn = $('#menuBtn');
  const open = () => {
    S.menu.open = true; S.menu.speed = 60;
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open'); btn.setAttribute('aria-expanded', 'true');
    setDarkZone('menu', false);
    lenis.stop();
    gsap.fromTo('#menuNav .t', { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.05, delay: 0.25 });
    gsap.fromTo('#menuNav .n', { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.5 });
    gsap.fromTo('#ring', { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out', delay: 0.1 });
  };
  const close = () => {
    S.menu.open = false;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false');
    setDarkZone('menu', false);
    lenis.start();
  };
  btn.addEventListener('click', () => (S.menu.open ? close() : open()));
  $$('#menuNav a').forEach(a => {
    a.addEventListener('mouseenter', () => (S.menu.speed = 40));
    a.addEventListener('click', e => {
      e.preventDefault();
      close();
      setTimeout(() => lenis.scrollTo(a.getAttribute('href'), { duration: 1.8 }), 350);
    });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && S.menu.open) close(); });
}

function updateMenu(dt) {
  const M = S.menu;
  M.speed += (7 - M.speed) * 0.03;
  M.spin = (M.spin + M.speed * dt) % 360;
  const tiltX = -16 + (S.mouse.ny - 0.5) * -8, tiltZ = -12 + (S.mouse.nx - 0.5) * 6;
  $('#ring').style.transform = `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg) rotateY(${M.spin}deg)`;
}

let lbVideo = null;
async function openLightbox(media, caption) {
  const lb = $('#lightbox'), box = $('#lbMedia');
  box.textContent = '';
  const r = await resolve(media, 1600, 1000);
  const node = mediaNode(r, { autoplay: r.type === 'video', controls: r.type === 'video', sizes: '90vw' });
  // the frame takes the media's own proportions: the whole shot, no bars, no crop
  box.style.setProperty('--ar', aspect(media, 16 / 9));
  box.append(node);
  if (r.type === 'video') { lbVideo = node; node.play().catch(() => {}); if (sound.on) { lbVideo.resumeSound = true; sound.stop(); } }
  $('#lbCap').innerHTML = caption;
  lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
  lenis.stop();
}
function closeLightbox() {
  const lb = $('#lightbox');
  if (!lb.classList.contains('is-open')) return;
  lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
  if (lbVideo) { lbVideo.pause(); if (lbVideo.resumeSound) sound.start(); lbVideo = null; }
  if (!S.menu.open) lenis.start();
}
function lightboxSetup() {
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
}

/* header turns white while it sits over film and black over the white page */
const darkZones = {};
function setDarkZone(name, on) {
  darkZones[name] = on;
  const dark = !document.body.classList.contains('menu-open') && Object.values(darkZones).some(Boolean);
  $('#hdr').classList.toggle('is-dark', dark);
}

function headerSetup() {
  const hdr = $('#hdr');
  ScrollTrigger.create({ trigger: '#sound', start: 'top top+=40', end: 'bottom top+=40', onToggle: s => setDarkZone('sound', s.isActive) });
  let lastY = 0;
  lenis.on('scroll', ({ scroll, direction }) => {
    hdr.style.setProperty('--hdr-shade', scroll > innerHeight * 0.5 ? 1 : 0);
    if (S.menu.open) return;
    if (scroll > innerHeight && direction === 1 && scroll - lastY > 4) hdr.classList.add('is-hidden');
    else if (direction === -1) hdr.classList.remove('is-hidden');
    lastY = scroll;
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('#menuNav')) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    lenis.scrollTo(id === '#top' ? 0 : id, { duration: 1.8 });
  });
}

/** Size the giant wordmarks so they span the full width exactly. */
function fitWords() {
  const avail = innerWidth - 2 * parseFloat(getComputedStyle($('.hero__word')).paddingLeft);
  [['#heroWord', '.ch'], ['#ftrWord', 'span']].forEach(([sel, child]) => {
    const node = $(sel);
    const kids = $$(child, node).filter(k => k.parentElement === node);
    if (!kids.length) return;
    node.style.fontSize = '100px';
    const w = kids.reduce((s, k) => s + k.getBoundingClientRect().width, 0);
    // footer wordmark spans the page; the entry wordmark stays compact (wider on phones)
    const ratio = sel === '#ftrWord' ? 0.92 : (mobile() ? 0.86 : 0.6);
    node.style.fontSize = (100 * avail) / w * ratio + 'px';
  });
  $('.hero__sticky').style.setProperty('--word-h', $('#heroWord').offsetHeight + 'px');

  const mf = $('#manifesto');
  mf.style.fontSize = '';
  const base = parseFloat(getComputedStyle(mf).fontSize);
  const widest = Math.max(...$$('.mf-line > span', mf).map(s => s.offsetWidth));
  if (widest > avail) mf.style.fontSize = (base * avail) / widest * 0.97 + 'px';
}

function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const d = g.createImageData(160, 160);
  // black specks, as opaque as the noise is dark: drawn normally this equals multiplying by the noise
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = 0; d.data[i + 3] = 255 - Math.random() * 255; }
  g.putImageData(d, 0, 0);
  $('.grain').style.setProperty('--grain', `url(${c.toDataURL()})`);
}

/* ==========================================================================
   MAIN LOOP
   ========================================================================== */
function loop() {
  const t0 = performance.now();
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const time = (now - t0) / 1000;
    sound.update();

    const sl = S.hero.slides;
    if (sl && S.hero.active) { sl.beat = sound.kick; sl.update(dt); sl.render(time); }
    if (S.archive.active) updateArchive(dt);
    if (S.sound.active) updateSound(time);
    else if (S.sound.stillsDue) S.sound.stillsDue = !S.sound.liquid.uploadStills();   // approaching: stills go up one per frame
    if (S.footer.active) updateFooter(time);
    if (S.menu.open) updateMenu(dt);
    mixVoices();
  });
}

/* ==========================================================================
   BOOT — the entry plays straight away; the rest of the site builds behind it
   ========================================================================== */
async function boot() {
  makeGrain();
  addEventListener('pointermove', e => {
    S.mouse.x = e.clientX; S.mouse.y = e.clientY;
    S.mouse.nx = e.clientX / innerWidth; S.mouse.ny = e.clientY / innerHeight;
  }, { passive: true });

  // splash first — it is the first thing anyone sees
  buildSplash();
  splashInput();
  Promise.race([document.fonts.load('400 100px "Instrument Serif"'), new Promise(r => setTimeout(r, 2200))])
    .then(() => setTimeout(splashIntro, 30));

  const fonts = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
  await buildHero();
  await fonts;
  fitWords();

  lenis = touch ? new NativeScroll() : new Lenis({ lerp: reduced ? 1 : 0.09, smoothWheel: !reduced });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  heroScene();
  loop();
  // the hero's own intro (slideshow break-through, wordmark, header) now plays when the splash leaves

  for (const step of [buildIntro, buildArtist, buildSound, buildArchive, buildNextEvent, buildFrames, buildMenu]) {
    await step();
    await frame();
  }
  buildPress();
  buildTrusted();
  buildContact();
  buildFooter();
  fitWords();

  introScene(); artistScene(); soundScene(); archiveScene(); nextScene();
  framesScene(); pressScene(); trustedScene(); contactScene(); footerScene(); splitReveals();
  menuSetup(); lightboxSetup(); headerSetup();
  ScrollTrigger.refresh();

  // Phones fire 'resize' every time their browser bar slides in or out while scrolling; re-measuring the
  // page then made scrolling stutter. Only a real change of size counts (on phones: a change of width).
  let lastW = innerWidth, lastH = innerHeight, rt;
  addEventListener('resize', () => {
    if (innerWidth === lastW && (touch || innerHeight === lastH)) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      lastW = innerWidth; lastH = innerHeight;
      S.sound.liquid?.resize();
      S.hero.slides?.resize();
      layoutRing();
      fitWords();
    }, 120);
  });

  // late web fonts change line lengths: measure again once they are in
  document.fonts?.ready.then(() => { fitWords(); ScrollTrigger.refresh(); });

  // ready: the site is built behind the splash
  document.body.classList.remove('is-loading');
  const sc = $('#entryScroll');
  sc.firstChild.textContent = 'Scroll to discover ';
  $('#entry').classList.add('is-ready');
  S.ready = true;
  $('#splash').classList.remove('is-waiting');
  if (S.splash.done) lenis.start();
  else if (S.splash.want) enterSite();
}

function reveal() {
  S.hero.slides?.start();
  gsap.timeline()
    .from('#heroWord .ci', { yPercent: 110, duration: 1.6, ease: 'expo.out', stagger: 0.05 }, 0.55)
    // cleared afterwards: a position left on the header overrode the class that slides it away while you scroll down
    .from('#hdr', { opacity: 0, y: -16, duration: 1.2, ease: 'expo.out', clearProps: 'transform,translate,opacity' }, 0.8)
    .from('#entry > *', { opacity: 0, y: 14, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.9);
}

boot();
