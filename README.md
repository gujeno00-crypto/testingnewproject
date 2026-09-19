# pawn7 — scattered folders, terminal guestbook

## What was actually broken, and the fix

Folders not reacting to clicks and the guestbook not opening were very
likely the *same* root cause: `main.js` was loading the guestbook code
with a regular `import` at the top of the file. If that one import
fails for any reason — like `vendor/` not being uploaded correctly — a
regular `import` failing takes the **entire file** down with it,
including the folder-click code that had nothing to do with the
guestbook. That's probably why nothing was responding.

Two fixes:
1. **No more subfolder.** The Firestore file used to live in
   `vendor/firebase-firestore-lite.bundle.js`; it's now just
   `firebase-lite.js`, sitting flat next to everything else. Nothing to
   create or nest — upload it like any other file.
2. **The guestbook now loads itself separately, after everything else.**
   Folder navigation, the gallery, the scroll hint — all of that runs
   first and doesn't depend on the guestbook at all anymore. If the
   guestbook file ever fails to load again for some reason, only its own
   trigger disappears; the rest of the page keeps working.

**To fix your current upload:** just re-upload all 6 files below to the
same folder in your repo (flat, no subfolders), overwriting what's
there. That's it.

## Files

- `index.html`, `style.css`, `main.js`, `guestbook.js`, `favicon.svg`
- `firebase-lite.js` — the Firestore client, self-hosted (see below)

## The guestbook, redesigned

Trigger moved to the **bottom-right** — a small folder icon, barely
visible until you hover. **Press and hold it** (~650ms, same for mouse,
touch, or keyboard Enter/Space) and a terminal-styled panel grows in
from the **bottom-left** corner — deliberately the opposite side, so
pressing one corner and having something happen in the other is part of
the surprise. Monospace, dark, a thin crimson border — closer to a
terminal window than a form.

## Use your own folder icon

Near the top of `main.js`:

```js
const CUSTOM_FOLDER_ICON_SVG = "";
const CUSTOM_FOLDER_ICON_VIEWBOX = "";
```

Find an SVG you like, copy just the inner shapes (the `<path>`,
`<circle>`, etc. — not the outer `<svg ...>` tag itself) into
`CUSTOM_FOLDER_ICON_SVG`, and it replaces the folder icon everywhere:
the three nav folders, the guestbook trigger, the guestbook header. If
that SVG's own `viewBox` isn't `0 0 48 38`, set
`CUSTOM_FOLDER_ICON_VIEWBOX` to whatever it is (e.g. `"0 0 24 24"`) so
it doesn't come out stretched. Leave both blank to keep the built-in
icon. Most free icon sites (Flaticon included) are fine to use but ask
for attribution — worth a quick check on whichever page you copy from.

## Folder layout

Repositioned closer to the oklama spread — bigger (78×62px, up from
64×51), and spread across more of the screen instead of bunched in one
corner: gallery upper-left, about mid-left, zen lower-middle. Each
folder's `--fx`/`--fy` (in its `style="..."` in `index.html`) are just
percentages of the screen, so nudging any of them is a one-line edit.

## Why the Firebase SDK is a local file

Privacy Badger (and similar tracker blockers) sometimes blocks
`gstatic.com` broadly, since it hosts a lot of unrelated Google stuff —
that was breaking the guestbook until you disabled it. Now the
Firestore client ships as `firebase-lite.js`, a plain file in your own
repo, so there's no Google domain for a blocker to catch at load time.

It's the "Lite" build specifically (no realtime listeners, no offline
cache) since this guestbook only ever does one-time reads and writes —
about a quarter the size of the full SDK as a result (~34KB gzipped vs
~140KB). One thing this doesn't change: the actual reads/writes still
talk to `firestore.googleapis.com` at runtime, since that's Firebase's
database endpoint — no way around that regardless of how the SDK is
loaded. Privacy Badger tends not to flag that one the way it flags
gstatic.com, since it's a first-party data call rather than a domain
serving trackers/fonts/ads site-wide, but no blocklist is fully
predictable.

## Firestore rules

Paste into **Firebase Console → fallenpage-fdb3d → Firestore Database →
Rules** if it isn't already set up this way:

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

Entries are public-read by design — anyone can see who signed, which is
the normal way a guestbook works. Spam handling is a honeypot field plus
a 30-second client-side cooldown, not real security since both live in
the browser.

## Everything else (unchanged from last time)

- Per-folder backgrounds (about/zen/gallery each take over the whole
  page when opened) — colors are the `--view-*` tokens in `style.css`.
- `CENTRAL_IMAGE`, `GALLERY_IMAGES`, `RIAS_IMAGE` in `main.js` — still
  empty, still just waiting on your files.
- Scrollbar hidden, small down-arrow hints that the page scrolls.
- Rias figure + the 9 elsewhere links are still scroll-only, still a
  secret.
