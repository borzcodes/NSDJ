# NORTHSOUL — DJ & Producer site

A cinematic one-page showcase. Static files only: no build step, no framework.

## Run it locally

```bash
node server.js
```

Then open http://localhost:4321. Any static host also works (Netlify, Vercel, GitHub Pages, cPanel). Upload the whole folder; `server.js` is only for local preview.

## Change text and media: `js/content.js`

Every word and every file path on the site lives in **`js/content.js`**. Lines marked `// PLACEHOLDER` are draft copy waiting for the real text.

Each media slot accepts:

```js
media: { video: 'assets/video/club-night.mp4', img: 'assets/img/club-night.jpg' }
```

- `video` is a muted, looping clip. `img` is a photo (also used as the video poster).
- While both are empty, the site draws a procedural light-show placeholder (`scene: 'club' | 'festival' | 'aurora' | ...`), so nothing ever looks broken.

## Where the assets go

| Slot | Folder | Recommended |
|---|---|---|
| Splash (`SPLASH`) | — | The first screen: two words on two doors and "Scroll to discover". The first scroll opens the doors onto the slideshow |
| Entry slideshow (`SLIDES`) | `assets/img/` or `assets/video/` | Any mix of photos and clips. Each slide has a small label (`kind`, `title`) and an optional `focus` (0 = keep the top of a tall photo, 1 = keep the bottom) |
| Next event (`NEXT_EVENT`) | `assets/img/` + `assets/video/` | Title, venue, city, ISO date (drives the countdown), ticket link. The section is a record: `sleeve` is the photo on the sleeve, `film` plays on the picture disc once the arm drops |
| The Sound chapters (`CHAPTERS[].media` + `sides`) | `assets/video/` | Vertical clips, 8–12 s. `media` is the main film (the only one on phones); `sides: [left, right]` turn the chapter into a 3-camera wall on wide screens |
| Footer wordmark (`FOOTER_FILM`) | `assets/video/` | Any clip; it plays inside the giant NORTHSOUL letters |
| Past events (`EVENTS[].media`) | `assets/img/` or `assets/video/` | Any orientation, at least 1200 px. A curved carousel on a dark stage under the `ARCHIVE` headline. It turns sideways only (swipe, drag, Shift + wheel, arrow keys, the ← → buttons), so scrolling down the page passes straight through. The front card plays; clicking it opens the film full screen. Films are shown whole |
| Press kit (`PRESS`) | `assets/press/` | `photos/` holds the original camera files at full resolution (camera metadata removed, image data untouched). The page shows only the download button; on click the browser bundles the photos with `NORTHSOUL-bio.txt` into `NORTHSOUL-press-kit.zip` (stored as they are, no recompression). No zip is kept in the repo, since GitHub refuses files over 100 MB. If you add photos, add them to `PRESS.photos` and update `PRESS.zip.meta` |
| Trusted by (`TRUSTED`) | `assets/img/venues/` | Venue logos as black marks on a transparent background (PNG, or SVG if the venue has one). A venue without a usable logo can be set as text with `type` |
| Booking (`CONTACT`) | — | No form: `email`, `phone` (+ `phoneLabel`) drive the Email, WhatsApp and Call lines. The email opens with a ready-made enquiry template |
| Artist portrait (`ARTIST.portrait`) | `assets/img/` | One tall photo, at least 1200 px tall |
| Frames gallery (`FRAMES[].media`) | `assets/img/` | Any orientation, at least 1000 px. Shown in black and white, colour on hover |
| His mix (`SITE.audio`) | `assets/audio/` | MP3 at 192–320 kbps. Replaces the built-in synth groove |

### Quality and full framing

- **Photos** exist twice: `assets/img/full/` (3840 px, JPEG q92) for anything drawn large (the slideshow, the artist portrait, the interlude, the full-screen viewer) and `assets/img/` (1600 px, q90) for thumbnails. The site picks the 4K file automatically when the screen can show it.
- **Clips** are H.264 at CRF 18 (visually lossless), native frame rate, 1080 × 1920 (or the source size when smaller). The hero also exists as `hero-4k.mp4` (3840 × 2160) and plays on large high-density screens.
- **Full screen, framed on the DJ.** Photos and clips fill their frames; the crop follows the DJ using `FOCUS` at the top of `js/content.js` (his position in each file, 0–1 from the top-left). Past Events is the exception: the open night shows its whole video. When you add a file, add its size to `DIMS` and the DJ's position to `FOCUS`.
- **Re-encoding:** `ffmpeg -i in.mov -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart out.mp4`

## Sound

The header sound button has been removed, so the site is silent. The sound engine (`js/audio.js`, a groove synthesised at `SITE.bpm`, or his own mix via `SITE.audio`) is still in the code if a play button is wanted again later.

## Booking

Three direct lines, no form: Email (opens the mail app with a booking template), WhatsApp (opens a chat with a first message ready) and Call. Set the real address and number in `CONTACT` inside `js/content.js`. The phone number goes in international format (`+212…`), which WhatsApp needs.

## Files

```
index.html          page structure
css/style.css       all styling (colour tokens at the top)
js/content.js       ← all texts + asset paths
js/main.js          entry, scroll scenes, menu, lightbox, cursor
js/slides.js        WebGL slit-scan slideshow for the entry
js/liquid.js        WebGL liquid transitions for "The Sound"
js/audio.js         sound engine (built-in groove or his mix)
js/placeholder.js   procedural placeholder imagery
vendor/             GSAP 3.13 + ScrollTrigger + SplitText, Lenis 1.3
```
