# pawn7 — dark redesign + guestbook

New foundation for the site: dark, crimson/violet, blunt rather than
polished — closer to how oklama.com and travisscott.com read (plain,
direct, not a lot of decoration) than a typical "AI-generated" dark
site (no glow blobs, no glass panels, no fancy display font). Three
folders — about / gallery / rias — plus the elsewhere links and the
hidden guestbook.

Not a rebuild of the old peace/zen pages — this replaces the home/nav
layer. Bring those back later if you want them folded in too.

## Files

- `index.html` — structure, the three folder views, guestbook markup
- `style.css` — theme, layout, the trigger's fill animation
- `main.js` — folder-tab switching, gallery grid, wires up the guestbook
- `guestbook.js` — Firestore reads/writes, the hold-to-open timing
- `favicon.svg` — pawn mark, crimson-to-violet

## Filling things in

**Gallery** — `main.js` has a `GALLERY_IMAGES` array near the top,
currently empty. Add `{ src: "...", alt: "..." }` entries and the grid
builds itself; leave it empty and that tab just shows a note instead of
a blank hole.

**Rias tab** — just a short line and a colored block right now since I
don't have your actual art/screenshots or exact angle on it. Easy to
swap for real content/images whenever.

**Elsewhere links** — all nine from memory (poetry, spotify, instagram,
tiktok, snapchat, chess, anime list, movies, dustorb) but only the
poetry one has a real URL (AllPoetry). The rest are `href="#"` —
find-and-replace with your actual profile links.

**Guestbook `apiKey`** — `guestbook.js` has your project ID, sender ID,
and app ID, but not `apiKey`, since you didn't give me that one and I
didn't want to guess. Get it from:

**Firebase Console → fallenpage-fdb3d → Project settings → General →
Your apps → SDK setup and configuration**

That value isn't a secret — it identifies the project, it doesn't grant
access — so it's fine sitting in public client code. Access control is
entirely in the Firestore rules below.

## Firestore rules

Paste into **Firestore Database → Rules** if `fallenpage-fdb3d` doesn't
already have something equivalent for a `guestbook` collection:

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

Public read, validated create-only, everything else denied — same shape
you've used before. Spam handling is a honeypot field plus a 30-second
client-side cooldown, which is enough for a small personal guestbook but
isn't real protection since both live in the browser. Send over your
reCAPTCHA Enterprise site key if you want App Check reconnected the way
the rest of the site already has it, and I'll wire it in.

## Why it should hold up on the Aspire 5749Z

- No canvas/WebGL, no particle loops, no animated background — dropped
  the glow effect entirely this pass.
- The guestbook only talks to Firestore while its dialog is open.
- Everything else is plain CSS, not JS animation loops.

## The hold-to-open trigger

Small square, bottom-right, easy to miss on purpose. Needs a **held
press** (~650ms) — a quick tap does nothing — and fills bottom-to-top
as you hold. Works with touch, mouse, and keyboard (hold Enter/Space).
Built on `<dialog>`, so focus-trapping and Escape-to-close come from
the browser for free.
