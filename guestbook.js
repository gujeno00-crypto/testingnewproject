// guestbook.js
// Firestore-backed guestbook. The trigger is a small drag track — press
// anywhere on it and drag right; releasing past the threshold opens the
// dialog, releasing early snaps it back. Keyboard users get an equivalent
// hold-to-open path (Enter/Space) that animates the same handle.
//
// The Firestore client is bundled locally (vendor/firebase-firestore-lite.bundle.js)
// instead of loaded from www.gstatic.com. Privacy Badger and similar
// tracker blockers sometimes flag gstatic.com broadly (it hosts a lot of
// unrelated Google properties), which was breaking this for at least one
// visitor without them needing to disable anything. Loading the SDK from
// the same origin as the rest of the site sidesteps that. It's the
// "Firestore Lite" build specifically — no realtime onSnapshot listeners,
// no offline cache — since this guestbook only ever does one-time reads
// (on open) and writes (on submit), which is all Lite supports and it's
// roughly a quarter the size of the full SDK as a result.
//
// Firestore data shape (collection "guestbook"):
//   { name: string, message: string, createdAt: server timestamp }
//
// Suggested Firestore rules (paste into Firebase Console → Firestore → Rules;
// see README.md for the full block and notes on App Check / reCAPTCHA):
//   match /guestbook/{entryId} {
//     allow read: if true;
//     allow create: if request.resource.data.keys().hasOnly(['name','message','createdAt'])
//                   && request.resource.data.name is string
//                   && request.resource.data.name.size() > 0
//                   && request.resource.data.name.size() <= 40
//                   && request.resource.data.message is string
//                   && request.resource.data.message.size() > 0
//                   && request.resource.data.message.size() <= 300
//                   && request.resource.data.createdAt == request.time;
//     allow update, delete: if false;
//   }

import {
  initializeApp,
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "./vendor/firebase-firestore-lite.bundle.js";

// Web config is not a secret — it identifies the project, it doesn't
// authorize access. Access control lives entirely in the Firestore rules
// above (and, optionally, App Check).
const firebaseConfig = {
  apiKey: "AIzaSyDu86dT60sh_x-pCElZQZ0C0AdisG_qSAk",
  authDomain: "fallenpage-fdb3d.firebaseapp.com",
  projectId: "fallenpage-fdb3d",
  storageBucket: "fallenpage-fdb3d.firebasestorage.app",
  messagingSenderId: "97560388444",
  appId: "1:97560388444:web:71906c3e2f1e2652edd799",
  measurementId: "G-SVFVCJJQ64",
};

const ENTRIES_LIMIT = 20;
const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = "gb-last-sign";
const DRAG_THRESHOLD = 0.78; // fraction of the track that must be crossed
const KEY_HOLD_MS = 650; // keyboard-equivalent hold duration

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function initGuestbook({ trigger, handle, dialog }) {
  const closeBtn = dialog.querySelector(".gb-close");
  const form = dialog.querySelector("#gbForm");
  const status = dialog.querySelector(".gb-status");
  const entriesList = dialog.querySelector("#gbEntries");
  const submitBtn = form.querySelector(".gb-submit");

  let dialogOpen = false;
  let dragging = false;
  let startX = 0;
  let maxDrag = 0;
  let keyRAF = null;
  let keyStart = 0;

  function getMaxDrag() {
    return Math.max(trigger.clientWidth - handle.offsetWidth - 4, 1);
  }

  function setDrag(px) {
    handle.style.setProperty("--drag", `${px}px`);
  }

  // ---- pointer drag ----
  function onPointerDown(event) {
    if (dialogOpen || keyRAF !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    maxDrag = getMaxDrag();
    trigger.classList.add("is-dragging");
    trigger.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const delta = Math.min(Math.max(event.clientX - startX, 0), maxDrag);
    setDrag(delta);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    trigger.classList.remove("is-dragging");
    trigger.releasePointerCapture?.(event.pointerId);
    const delta = Math.min(Math.max(event.clientX - startX, 0), maxDrag);
    if (delta / maxDrag >= DRAG_THRESHOLD) {
      setDrag(maxDrag);
      openDialog();
    } else {
      setDrag(0);
    }
  }

  trigger.addEventListener("pointerdown", onPointerDown);
  trigger.addEventListener("pointermove", onPointerMove);
  trigger.addEventListener("pointerup", onPointerUp);
  trigger.addEventListener("pointercancel", onPointerUp);
  trigger.addEventListener("contextmenu", (event) => event.preventDefault());

  // ---- keyboard equivalent: hold Enter/Space ----
  function beginKeyHold() {
    if (dialogOpen || dragging) return;
    keyStart = performance.now();
    maxDrag = getMaxDrag();
    trigger.classList.add("is-dragging");
    keyRAF = requestAnimationFrame(keyTick);
  }
  function keyTick() {
    const elapsed = performance.now() - keyStart;
    const pct = Math.min(elapsed / KEY_HOLD_MS, 1);
    setDrag(pct * maxDrag);
    if (pct >= 1) {
      endKeyHold(false);
      openDialog();
    } else {
      keyRAF = requestAnimationFrame(keyTick);
    }
  }
  function endKeyHold(reset) {
    if (keyRAF !== null) cancelAnimationFrame(keyRAF);
    keyRAF = null;
    trigger.classList.remove("is-dragging");
    if (reset) setDrag(0);
  }
  trigger.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && keyRAF === null && !dialogOpen) {
      event.preventDefault();
      beginKeyHold();
    }
  });
  trigger.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") endKeyHold(true);
  });

  // ---- dialog open/close ----
  function openDialog() {
    dialogOpen = true;
    dialog.showModal();
    loadEntries();
  }
  dialog.addEventListener("close", () => {
    dialogOpen = false;
    setDrag(0);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  closeBtn.addEventListener("click", () => dialog.close());

  async function loadEntries() {
    entriesList.setAttribute("aria-busy", "true");
    entriesList.innerHTML = '<li class="gb-loading">reading the pages…</li>';
    try {
      const q = query(
        collection(getDb(), "guestbook"),
        orderBy("createdAt", "desc"),
        limit(ENTRIES_LIMIT)
      );
      const snapshot = await getDocs(q);
      entriesList.innerHTML = "";
      if (snapshot.empty) {
        entriesList.innerHTML =
          '<li class="gb-empty">no one has signed yet — be the first.</li>';
      }
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("li");
        item.className = "gb-entry";

        const name = document.createElement("span");
        name.className = "gb-entry-name";
        name.textContent = data.name || "anonymous";

        const message = document.createElement("p");
        message.className = "gb-entry-message";
        message.textContent = data.message || "";

        item.append(name, message);
        entriesList.appendChild(item);
      });
    } catch (err) {
      console.error("guestbook: failed to load entries", err);
      entriesList.innerHTML =
        '<li class="gb-empty">couldn\u2019t reach the guestbook right now.</li>';
    } finally {
      entriesList.removeAttribute("aria-busy");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const name = form.name.value.trim();
    const message = form.message.value.trim();
    const honeypot = form.website.value;

    if (honeypot) return; // silently drop likely-bot submissions

    if (!name || !message) {
      status.textContent = "a name and a message are both needed.";
      return;
    }

    const lastSigned = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (Date.now() - lastSigned < COOLDOWN_MS) {
      status.textContent = "one entry at a time — thanks for signing.";
      return;
    }

    submitBtn.disabled = true;
    status.textContent = "signing…";

    try {
      await addDoc(collection(getDb(), "guestbook"), {
        name: name.slice(0, 40),
        message: message.slice(0, 300),
        createdAt: serverTimestamp(),
      });
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      form.reset();
      status.textContent = "signed. thanks for stopping by.";
      loadEntries();
    } catch (err) {
      console.error("guestbook: failed to submit", err);
      status.textContent = "that didn't go through — try again in a moment.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}
