# pawn7 — folders, guestbook, rias figure

Current shape: a soft pinky-white background with everything that acts
like a UI object — the three nav folders, the guestbook — styled as dark
shapes sitting on top of it, like icons on a desktop. No visible folder
labels (hover or screen readers get the name); about/gallery/rias, always
in that order.

## Files

- `index.html` — structure: folder nav, the three views, the rias figure
  slot, elsewhere links, guestbook markup
- `style.css` — the wallpaper/dark-object color system, drag-track styles,
  the rias figure's grayscale+tint treatment
- `main.js` — folder-tab switching, gallery grid, rias figure, wires up
  the guestbook
- `guestbook.js` — Firebase config (filled in — see below), Firestore
  reads/writes, the drag-to-open interaction
- `favicon.svg` — pawn mark

## Firebase — done

`guestbook.js` now has the full config you sent (apiKey included), so
there's nothing left to fill in there. It's fine for this to sit in
public client code — the web config identifies the project, it doesn't
grant access. Access control is entirely in the Firestore rules below.

If `fallenpage-fdb3d` doesn't already have rules like these for a
`guestbook` collection, paste this into **Firestore Database → Rules**:

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

Spam handling is a honeypot field plus a 30-second client-side cooldown —
enough for a small personal guestbook, not real protection since both
live in the browser. Send over your reCAPTCHA Enterprise site key if you
want App Check reconnected the way the rest of the site already has it.

## Filling in the rest

**Gallery** — `GALLERY_IMAGES` array near the top of `main.js`. Add
`{ src: "...", alt: "..." }` entries and the grid builds itself.

**Rias figure** — `RIAS_IMAGE` constant near the top of `main.js`, empty
for now. Once you've got the png, set `const RIAS_IMAGE = "images/rias.png";`
(or a URL) and it'll appear above the elsewhere links — grayscale, a
crimson multiply tint, and a fade at the bottom are already applied in
CSS so it reads as a carved shape rather than a full picture. Nothing
else to change.

**Elsewhere links** — all 9 (poetry, spotify, instagram, tiktok,
snapchat, chess, anime list, movies, dustorb), only poetry has a real
URL. Rest are `href="#"` — swap in your actual profiles.

## The guestbook trigger

It's a small dark track, bottom-left. Press anywhere on it and **drag
the folder to the right** — past about 80% of the track it opens; let go
earlier and it snaps back. Keyboard users hold Enter or Space instead of
dragging (fills the same way, same threshold). Built on `<dialog>`, so
focus-trapping and Escape-to-close come from the browser.

## Why it should hold up on the Aspire 5749Z

- No canvas/WebGL, no particle loops, no animated background.
- The guestbook only talks to Firestore while its dialog is open.
- The drag/hold interaction is a transform on one small element, not a
  page-wide effect.
