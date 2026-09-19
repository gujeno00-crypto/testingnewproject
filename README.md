# pawn7 — scattered folders, per-folder backgrounds, guestbook

Full restructure. No more name/tagline header — the home screen is a
"desktop": three folders scattered at different spots (not a row), a
photo slot in the middle, and the about text off to the side. On phones
this collapses to a simple stacked column instead (there's not enough
room to scatter things and keep it usable).

Opening a folder takes over the whole page — its own background, not a
panel — with a small "← back" to return. A Rias figure and the social
links only exist below the fold, reached by scrolling; there's nothing
on the home screen pointing at them except a faint down-arrow, and the
browser's own scrollbar is hidden so scrolling isn't obviously "there."

## ⚠️ Upload the whole thing together, including `vendor/`

This version adds a `vendor/` folder — don't leave it behind. If you're
copying files into an existing repo, copy `vendor/firebase-firestore-lite.bundle.js`
along with everything else, keeping that exact folder name, sitting next
to `index.html` (not inside it). If your last test was showing a stale
version, that's almost certainly a caching issue — re-upload everything
in one pass and hard-refresh.

## Files

- `index.html` — the desktop scene, the three folder views, guestbook markup
- `style.css` — layout (mobile stacked / desktop scattered), per-folder
  background colors, the new folder icon, guestbook styling
- `main.js` — folder open/close, central image, gallery grid, rias
  figure, scroll-hint visibility, wires up the guestbook
- `guestbook.js` — Firestore reads/writes, the drag-to-open interaction
- `vendor/firebase-firestore-lite.bundle.js` — the Firestore client,
  bundled locally (see below for why)
- `favicon.svg` — pawn mark

## Why the Firebase SDK is a local file now

You mentioned Privacy Badger blocking `gstatic.com` and having to disable
it to use the guestbook. That's Privacy Badger flagging the domain
broadly — gstatic.com hosts a lot of unrelated Google stuff, so tools
like it sometimes block the whole domain rather than anything specific
to Firebase.

Fix: the Firestore client now ships as a plain file in your own
`vendor/` folder instead of loading from gstatic.com, so there's no
Google domain for a blocker to catch at load time. It's the "Lite"
build specifically (no realtime listeners, no offline cache) since this
guestbook only ever does one-time reads and writes — that's all Lite
supports, and it's about a quarter the size of the full SDK as a result
(~34KB gzipped vs ~140KB).

One thing this doesn't change: actually reading/writing guestbook
entries still talks to `firestore.googleapis.com` at runtime — that's
Firebase's actual database endpoint, unavoidable no matter how the SDK
is loaded. Privacy Badger tends not to flag that one the same way it
flags gstatic.com, since it's a first-party data call rather than a
domain serving trackers/ads/fonts for half the web, but there's no way
to fully guarantee against every blocklist.

## Per-folder backgrounds

Set directly on `<body>` via a `data-view` attribute, swapped in
`main.js` when you open/close a folder:
- home (default): the pinky wallpaper
- about: near-black
- zen: gray-brown-black
- gallery: dark red-black

Change the exact shades in the `:root` tokens at the top of `style.css`
(`--view-about`, `--view-zen`, `--view-gallery`) if you want to tune them.

## Filling things in

- **Central photo** — `CENTRAL_IMAGE` in `main.js`, empty for now.
- **Gallery** — `GALLERY_IMAGES` array in `main.js`, same pattern.
- **Rias figure** — `RIAS_IMAGE` in `main.js`. Grayscale + crimson tint +
  bottom fade are already in CSS, so whatever png you drop in reads as a
  carved shape rather than a full picture.
- **Zen folder text** — just a placeholder line right now since I don't
  know what you want to say there yet.
- **Elsewhere links** — only poetry has a real URL; the rest are `#`.

## Firestore rules

Paste into **Firebase Console → fallenpage-fdb3d → Firestore Database →
Rules** if it isn't set up this way already:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guestbook/{entryId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['name', 'message', 'createdAt'])
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 40
                    && request.resource.data.message is string
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() <= 300
                    && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Entries are public-read by design (anyone can see who signed), which is
the normal way a guestbook works. Spam handling is a honeypot field plus
a 30-second client-side cooldown — enough for a small personal
guestbook, not real protection since both live in the browser.

## The guestbook trigger

Small dark pill, bottom-left, home screen only (it's hidden inside any
open folder). Press anywhere on it and drag the folder shape to the
right — past about 80% of the track it opens; let go earlier and it
snaps back. Keyboard users hold Enter or Space instead.

## Why it should hold up on the Aspire 5749Z

- No canvas/WebGL, no particle loops, no animated background.
- The Firestore Lite bundle is a quarter the size of the full SDK.
- The guestbook only talks to Firestore while its dialog is open.
- The drag/hold interaction and scroll-hint are transforms on small
  elements, not page-wide effects.
