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
| Entry film (`SLIDES`) | `assets/video/` | The hero film, full screen: it breaks through with a slit-scan and then plays on a loop. It has a small label (`kind`, `title`) and its crop follows the DJ (`FOCUS`). Adding more shots to the list turns it back into a slideshow with slit-scan cuts |
| Intro (`INTRO.lines`) | — | Words only, no images: his sentence split into phrases. On a blank page they appear one by one as you scroll, alternating left and right down the page, until the whole sentence stands. Change, add or remove phrases freely |
| Next event (`NEXT_EVENT`) | `assets/img/` + `assets/video/` | Title, venue, city, ISO date (drives the countdown), ticket link. The section is a record on the white page: `sleeve` is the photo on the sleeve, `film` plays on the picture disc once the arm drops |
| The Sound chapters (`CHAPTERS[].media` + `sides`) | `assets/video/` | Vertical clips, 8–12 s. `media` is the main film (the only one on phones); `sides: [left, right]` turn the chapter into a 3-camera wall on wide screens |
| Footer wordmark (`FOOTER_FILM`) | `assets/video/` | Any clip; it plays inside the giant NORTHSOUL letters |
| Past events (`EVENTS[].media`) | `assets/img/` or `assets/video/` | Any orientation, at least 1200 px. A curved carousel of big cards on the white page, under the `ARCHIVE` headline. It turns sideways only (swipe, drag, Shift + wheel, arrow keys, the ← → buttons), so scrolling down the page passes straight through. While the section is in view the films play on their own: the front one (with its sound, once the visitor has clicked anywhere) and, on wide screens, its two neighbours. Films are shown whole |
| Press kit (`PRESS`) | `assets/press/` | `photos/` holds the original camera files at full resolution (camera metadata removed, image data untouched). The page shows only the download button; on click the browser bundles the photos with `NORTHSOUL-bio.txt` into `NORTHSOUL-press-kit.zip` (stored as they are, no recompression). No zip is kept in the repo, since GitHub refuses files over 100 MB. If you add photos, add them to `PRESS.photos` and update `PRESS.zip.meta` |
| Trusted by (`TRUSTED`) | `assets/img/venues/` | Venue logos as black marks on a transparent background (PNG, or SVG if the venue has one). A venue without a usable logo can be set as text with `type` |
| Booking (`CONTACT`) | — | No form: `email`, `phone` (+ `phoneLabel`) drive the Email, WhatsApp and Call lines. The email opens with a ready-made enquiry template |
| Artist portrait (`ARTIST.portrait`) | `assets/img/` | One tall photo, at least 1200 px tall |
| Frames gallery (`FRAMES[].media`) | `assets/img/` | Any orientation, at least 1000 px. Shown in black and white, colour on hover |
| His mix (`SITE.audio`) | `assets/audio/` | MP3 at 192–320 kbps. Replaces the built-in synth groove |

### Quality and full framing

- **Photos** exist three times: `assets/img/full/` (3840 px, JPEG q92) for the artist portrait and the full-screen viewer on screens that can show it, `assets/img/` (1600 px, q90) for the slideshow and most places, and `assets/img/thumb/` (800 px) for small tiles (menu ring, frames grid). A browser keeps every image in memory at its full size, so small tiles get small files; that keeps phones from running out of memory.
- **Clips** are H.264 at native frame rate in two sizes (`clip()` in `js/content.js` picks between them):
  `assets/video/` 1080p (CRF 20, at most 8 Mb/s) for the big films on desktop, and
  `assets/video/720/` (CRF 22, at most 3 Mb/s) for phones and The Sound's side cameras (these exist only in 720p).
  Posters have 640 px copies in `assets/video/posters/thumb/`, used as The Sound's stills while its films start.
- **Loading and smoothness:** nothing waits for the network. The entry opens as soon as the first still has arrived; each section's films start downloading one screen before you reach it, play only while visible, and never start several at the same instant (a film's first start costs the browser a moment).
- **Full screen, framed on the DJ.** Photos and clips fill their frames; the crop follows the DJ using `FOCUS` at the top of `js/content.js` (his position in each file, 0–1 from the top-left). Past Events is the exception: the open night shows its whole video. When you add a file, add its size to `DIMS` and the DJ's position to `FOCUS`.
- **Encoding a new clip** (keep the sound with `-c:a aac -b:a 192k`, or drop it with `-an`):
  `ffmpeg -i in.mov -c:v libx264 -preset medium -crf 20 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k name.mp4`
  `ffmpeg -i in.mov -vf "scale=-2:1280" -c:v libx264 -preset medium -crf 22 -maxrate 3M -bufsize 6M -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k 720/name.mp4`
  (for a landscape clip use `scale=1280:-2`)
- **Hosting:** `vercel.json` lets browsers keep photos and films for a day, so a second visit loads instantly.

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
