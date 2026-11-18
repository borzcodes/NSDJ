/* ==========================================================================
   NORTHSOUL — CONTENT
   --------------------------------------------------------------------------
   Every text and every media file on the site lives in this one file.

   MEDIA: each item accepts
     img:    'assets/img/photo.jpg'          photo (also used as video poster)
     video:  'assets/video/clip.mp4'         loop (H.264 mp4, 1080p)
   Every film also exists in lighter sizes (see clip() below): the site plays the smallest one
   that still looks sharp where it is shown, so it stays fast on any connection.
   Crops keep the DJ in view: his position in every file is listed in FOCUS below.

   Anything marked  // PLACEHOLDER  still waits for the real text or data.
   ========================================================================== */

const V = 'assets/video/';
const P = 'assets/video/posters/';
const I = 'assets/img/';

/* Real size (width × height) of every file. Each frame on the site takes these proportions,
   so nothing is ever cropped. Add a line here when you add a photo or a clip.
   Photos: the 4K file in assets/img/full/ (a lighter 1600 px copy sits in assets/img/). */
const DIMS = {
  'live-bold-wide': [3840, 2098], 'live-bold-red': [2560, 3840], 'live-booth-overhead': [2560, 3840], 'live-bold-stage': [2560, 3840],
  'live-gold-1': [2560, 3840], 'live-gold-2': [2560, 3840], 'live-gold-3': [2560, 3840], 'live-flag-1': [2560, 3840],
  'live-flag-2': [2560, 3840], 'live-blue': [2560, 3840], 'live-red-decks': [2880, 3840], 'rooftop-decks': [2560, 3840],
  'rooftop-mono': [2880, 3840], 'rooftop-minaret-1': [2880, 3840], 'rooftop-minaret-2': [2880, 3840], 'rooftop-minaret-3': [2560, 3840],
  'rooftop-drink': [2560, 3840], 'rooftop-profile-1': [2560, 3840], 'rooftop-profile-2': [2560, 3840],
  ...Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`studio-${String(i + 1).padStart(2, '0')}`, [2560, 3840]])),
  'studio-17': [1024, 1536],
  // clips (Full HD; the side cameras of The Sound are 720p)
  'hero': [1920, 1080],
  'ev-flag': [1080, 1920], 'ev-rooftop': [1440, 1920], 'ev-unamaas': [1080, 1920], 'ev-redroom': [1080, 1920], 'ev-b2b': [1080, 1920],
  'ev-golden': [1440, 1920], 'ev-prism': [1080, 1920], 'ev-live': [1080, 1920], 'ev-beach': [1080, 1920], 'ev-haze': [1080, 1920],
  'ch-stage': [1080, 1920], 'ch-club': [1080, 1920], 'ch-rooftop': [1440, 1920], 'ch-intimate': [1440, 1920], 'ch-bigroom': [1080, 1920],
  'ch-stage-l': [1080, 1920], 'ch-stage-r': [1080, 1920], 'ch-club-l': [1080, 1920], 'ch-club-r': [720, 1280],
  'ch-rooftop-l': [1440, 1920], 'ch-rooftop-r': [1440, 1920], 'ch-intimate-l': [1440, 1920], 'ch-intimate-r': [1440, 1920],
  'ch-bigroom-l': [1080, 1920], 'ch-bigroom-r': [1080, 1920],
};
/* Where the DJ is in each photo / clip: [x, y] from 0 to 1 (0,0 = top-left).
   Every full-screen or cropped frame keeps this point in view. Not listed = centre. */
const FOCUS = {
  'live-blue': [0.58, 0.45], 'live-bold-red': [0.5, 0.45], 'live-bold-stage': [0.5, 0.48], 'live-bold-wide': [0.5, 0.55],
  'live-booth-overhead': [0.6, 0.55], 'live-flag-1': [0.35, 0.6], 'live-flag-2': [0.4, 0.62], 'live-gold-1': [0.58, 0.45],
  'live-gold-2': [0.58, 0.45], 'live-gold-3': [0.62, 0.48], 'live-red-decks': [0.55, 0.38], 'rooftop-decks': [0.55, 0.48],
  'rooftop-drink': [0.55, 0.5], 'rooftop-minaret-1': [0.6, 0.6], 'rooftop-minaret-2': [0.5, 0.56], 'rooftop-minaret-3': [0.52, 0.6],
  'rooftop-mono': [0.58, 0.5], 'rooftop-profile-1': [0.58, 0.42], 'rooftop-profile-2': [0.55, 0.42], 'studio-08': [0.5, 0.3],
  'hero': [0.5, 0.5],
  'ev-b2b': [0.62, 0.45], 'ev-beach': [0.48, 0.56], 'ev-flag': [0.5, 0.45], 'ev-golden': [0.55, 0.62], 'ev-haze': [0.5, 0.6],
  'ev-live': [0.5, 0.55], 'ev-prism': [0.5, 0.62], 'ev-redroom': [0.6, 0.65], 'ev-rooftop': [0.55, 0.6], 'ev-unamaas': [0.6, 0.62],
  'ch-stage': [0.55, 0.55], 'ch-stage-l': [0.5, 0.5], 'ch-stage-r': [0.58, 0.5], 'ch-club': [0.6, 0.58], 'ch-club-l': [0.5, 0.65],
  'ch-club-r': [0.5, 0.6], 'ch-rooftop': [0.45, 0.5], 'ch-rooftop-l': [0.42, 0.42], 'ch-rooftop-r': [0.48, 0.55],
  'ch-intimate': [0.66, 0.58], 'ch-intimate-l': [0.5, 0.5], 'ch-intimate-r': [0.68, 0.58], 'ch-bigroom': [0.6, 0.65],
  'ch-bigroom-l': [0.5, 0.65], 'ch-bigroom-r': [0.5, 0.6],
};
const meta = n => ({ ...(DIMS[n] ? { w: DIMS[n][0], h: DIMS[n][1] } : {}), ...(FOCUS[n] ? { fx: FOCUS[n][0], fy: FOCUS[n][1] } : {}) });
/* Film sizes:
     video     <name>.mp4        1080p   the big films on desktop
     video720  720/<name>.mp4    720p    phones, and the side cameras of The Sound
   Stills: img = posters/<name>.jpg (full size), thumb = posters/thumb/<name>.jpg (640 px, for small tiles) */
const clip = (name, extra = {}) => ({
  video: V + name + '.mp4', video720: V + '720/' + name + '.mp4',
  img: P + name + '.jpg', thumb: P + 'thumb/' + name + '.jpg', ...meta(name), ...extra,
});
// the side cameras fill a third of the screen at most, so they only exist in 720p
const sideClip = name => clip(name, { video: V + '720/' + name + '.mp4' });
/* Photo sizes: full = the 4K file (assets/img/full/), img = 1600 px copy, thumb = 800 px copy (assets/img/thumb/)
   for the small places (collage, menu, frames grid): a browser holds every image in memory at its full size,
   so small tiles need small files or phones run out of memory. */
const photo = (name, extra = {}) => ({ img: I + name + '.jpg', full: I + 'full/' + name + '.jpg', thumb: I + 'thumb/' + name + '.jpg', ...meta(name), ...extra });

export const SITE = {
  artist: 'NORTHSOUL',
  role: 'DJ & Artist',
  base: 'Tangier, Morocco',
  city: 'Tangier',
  timezone: 'Africa/Casablanca',          // live local time in the entry + footer
  bpm: 122,                               // built-in groove tempo
  mixTitle: 'NORTHSOUL — Live',           // shown in the "now playing" chip
  audio: null,                            // e.g. 'assets/audio/northsoul-mix.mp3' — replaces the built-in synth groove
  genres: ['Afro House', 'Afro Tech', 'House', 'Open Format'],
  community: ['Tangier', 'Casablanca', 'Marrakech'],
  venues: ['Istar Madrid', 'Los Amantes Madrid', 'M Beach Cabo Negro', 'Kabana Marrakech', 'La Nuit Paris', 'Noah Casablanca'],
};

/* ---------- SPLASH: the very first screen, before the slideshow ----------
   Two doors, one word on each. The first scroll opens them onto the hero. */
export const SPLASH = {
  words: ['North', 'Soul'],
};

/* ---------- ENTRY: the hero film, full screen; it breaks through with a slit-scan and then just plays (looping).
   kind + title = the small label on the left. The crop follows the DJ (see FOCUS).
   More shots can be added to the list: with two or more it becomes a slideshow with slit-scan cuts. */
export const SLIDES = [
  { kind: 'Live', title: 'Main Stage', media: clip('hero') },
];

/* ---------- MANIFESTO: the entry film collapses into this sentence ---------- */
export const HERO = {
  // The ▮ marks where the film lands inside the sentence.
  manifesto: ['NORTHSOUL doesn’t simply play music.', 'He creates ▮ an atmosphere.'],
  kicker: 'Afro House · Afro Tech · House · Open Format',
};

/* ---------- INTRO: just the words. The sentence, in the phrases it assembles from as you scroll
   (each appears in its own place, alternating left and right). ---------- */
export const INTRO = {
  lines: [
    'Born and raised in Tangier, Morocco —',
    'a DJ known for his distinctive sound,',
    'infectious energy',
    'and the ability to turn any venue into an unforgettable experience.',
  ],
  link: { label: 'Meet the artist', href: '#artist' },
};
/* ---------- THE ARTIST (one portrait + bio) ---------- */
export const ARTIST = {
  portrait: photo('studio-08'),
  title: ['The man', 'behind the sound'],
  bio: [
    'With performances at renowned venues including Istar Madrid, Los Amantes Madrid, M Beach Cabo Negro, Kabana Marrakech, La Nuit Paris and Noah Casablanca, NORTHSOUL continues to establish his presence across Morocco and internationally.',
    'Blending Afro House, Afro Tech, House and Open Format, he brings a unique musical identity to every performance — reading the crowd effortlessly and creating an atmosphere that keeps the energy alive from beginning to end.',
    'What truly sets him apart is his strong and loyal community across Morocco. With a dedicated following in Tangier, Casablanca, Marrakech and beyond, his performances are more than just DJ sets — they’re experiences that bring people together.',
  ],
  facts: [
    { k: 'Born',      v: 'Tangier, Morocco' },
    { k: 'Sound',     v: 'Afro House · Afro Tech · House · Open Format' },
    { k: 'Played',    v: 'Madrid · Cabo Negro · Marrakech · Paris · Casablanca' },
    { k: 'Community', v: 'Tangier · Casablanca · Marrakech' },
  ],
};

/* ---------- THE SOUND: full-screen chapters with liquid transitions ----------
   media = the main film (phones show only this one)
   sides = [left, right] films — on wide screens the chapter becomes a 3-camera wall */
const chapter = (main, left, right) => ({ media: clip(main), sides: [sideClip(left), sideClip(right)] });
export const CHAPTERS = [
  { label: 'Afro House',    sub: 'Warm, rolling, hypnotic',      note: 'Percussion that pulls the whole floor into one groove.',                    ...chapter('ch-stage',    'ch-stage-l',    'ch-stage-r') },
  { label: 'Afro Tech',     sub: 'Darker, driving, relentless',  note: 'Tension built bar by bar until the room has nowhere to go but up.',          ...chapter('ch-club',     'ch-club-l',     'ch-club-r') },
  { label: 'House',         sub: 'The heartbeat',                note: 'The classic four-to-the-floor that keeps the energy alive till close.',     ...chapter('ch-rooftop',  'ch-rooftop-l',  'ch-rooftop-r') },
  { label: 'Open Format',   sub: 'Reading the crowd',            note: 'Whatever the room needs next — he hears it before they do.',                ...chapter('ch-intimate', 'ch-intimate-l', 'ch-intimate-r') },
  { label: 'The Community', sub: 'Tangier · Casablanca · Marrakech', note: 'More than DJ sets — experiences that bring people together.',             ...chapter('ch-bigroom',  'ch-bigroom-l',  'ch-bigroom-r') },
];

/* ---------- PAST EVENTS: a curved carousel of the nights; scrolling turns it one night at a time.
   Films are always shown whole. ---------- */
export const ARCHIVE = {
  title: 'Past events',
  sub: 'Nights that stayed',
};
export const EVENTS = [   // PLACEHOLDER titles — Kabana and M Beach were matched from what is visible in the footage, please confirm
  { title: 'Dare to be BOLD',     tag: 'BOLD Party',          media: clip('ev-flag') },
  { title: 'Kabana',              tag: 'Marrakech',           media: clip('ev-rooftop') },
  { title: 'Una Maas',            tag: 'Club night',          media: clip('ev-unamaas') },
  { title: 'Red Room',            tag: 'Club night',          media: clip('ev-redroom') },
  { title: 'Back to Back',        tag: 'B2B set',             media: clip('ev-b2b') },
  { title: 'Golden Hour',         tag: 'Kabana · Marrakech',  media: clip('ev-golden') },
  { title: 'Prism',               tag: 'Club night',          media: clip('ev-prism') },
  { title: 'Live from the Booth', tag: 'Live set',            media: clip('ev-live') },
  { title: 'M Beach',             tag: 'Cabo Negro',          media: clip('ev-beach') },
  { title: 'Into the Haze',       tag: 'Club night',          media: clip('ev-haze') },
];

/* ---------- NEXT EVENT ---------- */
export const NEXT_EVENT = {   // PLACEHOLDER — real event, date, venue and ticket link to come
  title: 'Northsoul Live',
  venue: 'Venue to be announced',
  city: 'Tangier, Morocco',
  date: '2026-12-19T23:00:00+01:00',     // ISO date with timezone — drives the countdown
  doors: '23:00 — late',
  tickets: '#',                          // ticket / RSVP link
  // the section is a record: the sleeve shows a photo, the disc plays a film
  sleeve: photo('live-gold-2'),
  film: clip('ch-stage'),
};

/* ---------- FRAMES (black & white gallery, colour on hover) ---------- */
export const FRAMES = [
  { caption: 'Main stage',            media: photo('live-gold-1') },
  { caption: 'Under the minaret',     media: photo('rooftop-minaret-1') },
  { caption: 'Flag up',               media: photo('live-flag-1') },
  { caption: 'The booth',             media: photo('live-booth-overhead') },
  { caption: 'Hands up',              media: photo('rooftop-mono') },
  { caption: 'Blue hour',             media: photo('live-blue') },
  { caption: 'Rooftop session',       media: photo('rooftop-decks') },
  { caption: 'NORTHSOUL on the screen', media: photo('live-bold-stage') },
  { caption: 'Red room',              media: photo('live-red-decks') },
  { caption: 'Golden hour',           media: photo('rooftop-minaret-3') },
  { caption: 'Peak time',             media: photo('live-gold-3') },
  { caption: 'Between tracks',        media: photo('rooftop-drink') },
  { caption: 'At the decks',          media: photo('rooftop-profile-1') },
  { caption: 'Flag night',            media: photo('live-flag-2') },
  { caption: 'Red light',             media: photo('live-bold-red') },
];

/* ---------- TRUSTED BY: venues he has played ----------
   logo = the venue's mark in ink on a transparent background (assets/img/venues/).
   type = set the name as text instead (used where the original logo is too small to cut out cleanly). */
const VL = 'assets/img/venues/';
export const TRUSTED = {
  title: 'Trusted by',
  venues: [
    { name: 'B-Tree, Tamuda Bay',     logo: VL + 'b-tree.png' },
    { name: 'Toy Room Club, Madrid',  logo: VL + 'toy-room.png' },
    { name: 'Istar',                  logo: VL + 'istar.png' },
    { name: 'Sky Bar, Casablanca',    logo: VL + 'sky-bar.png' },
    { name: 'Random',                 logo: VL + 'random.png' },
    { name: 'La Casa Blancaise',      type: ['La Casa', 'Blancaise'] },   // send the vector logo to replace this
    { name: 'Kabana',                 logo: VL + 'kabana.png' },
  ],
};

/* ---------- PRESS KIT: print-ready studio portraits for promoters ---------- */
const PK = 'assets/press/';
export const PRESS = {
  title: ['Press', 'kit'],
  intro: 'For promoters and venues. Studio portraits in print resolution for posters, line-ups and event promotion — plus the official bio.',
  // the zip is put together in the visitor's browser from the photos and the bio below (see buildPress),
  // so the site never stores the same 200 MB twice and no file goes over GitHub's 100 MB limit
  zip: { name: 'NORTHSOUL-press-kit', label: 'Download the press kit', meta: '17 photos · original camera files · bio · ZIP · 201 MB' },
  bio: PK + 'NORTHSOUL-bio.txt',
  // preview = the light copy shown on the page, file = the untouched original from the camera (full resolution)
  photos: [[3676, 5514], [3765, 5648], [4000, 6000], [3783, 5675], [3728, 5592], [3843, 5765], [3791, 5686], [4000, 6000],
    [3761, 5641], [3797, 5695], [4000, 6000], [3740, 5610], [3722, 5583], [3854, 5781], [3887, 5830], [4000, 6000], [1024, 1536]]
    .map(([w, h], i) => {
      const n = String(i + 1).padStart(2, '0');
      return { preview: I + `studio-${n}.jpg`, file: PK + `photos/NORTHSOUL-press-${n}.jpg`, size: `${w} × ${h}` };
    }),
};

/* ---------- BOOKING / CONTACT: no form — straight to mail, WhatsApp or a call ---------- */
export const CONTACT = {
  headline: ['Book', 'the night'],
  intro: 'Clubs, festivals, private events and brand experiences — across Morocco and internationally.',
  email: 'northsoul22@outlook.com',
  emailSubject: 'Booking enquiry — NORTHSOUL',
  emailBody: 'Hi NORTHSOUL team,\n\nEvent / venue:\nCity:\nDate:\nExpected capacity:\n\n',
  phone: '+212671047207',                         // international format (used by WhatsApp and the call button)
  phoneLabel: '+212 6 71 04 72 07',               // how the number is shown
  whatsappText: 'Hi NORTHSOUL, I would like to book you for an event.',
  local: { label: 'From Morocco', value: '0671-047207', href: 'tel:0671047207' },
  socials: [    // PLACEHOLDER — real profile links
    { label: 'Instagram',         href: '#' },
    { label: 'SoundCloud',        href: '#' },
    { label: 'Spotify',           href: '#' },
    { label: 'YouTube',           href: '#' },
    { label: 'TikTok',            href: '#' },
  ],
};
CONTACT.channels = [   // built from the fields above — used by the menu
  { label: 'Bookings', value: CONTACT.email, href: 'mailto:' + CONTACT.email },
];

/* ---------- MENU ring tiles ---------- */
export const MENU_TILES = [
  'live-gold-1', 'rooftop-minaret-1', 'live-flag-1', 'live-gold-2', 'live-bold-stage', 'rooftop-decks', 'live-blue',
  'live-booth-overhead', 'rooftop-minaret-3', 'rooftop-minaret-2', 'live-red-decks', 'live-gold-3', 'rooftop-mono', 'live-flag-2',
].map(n => photo(n));

/* ---------- FOOTER: the giant wordmark is filled with this film ---------- */
export const FOOTER_FILM = clip('hero');

/* ---------- PLACES PLAYED — section removed for now, data kept for the redesign ---------- */
export const VENUES = SITE.venues;
