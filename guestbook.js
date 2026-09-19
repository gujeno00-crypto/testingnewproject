// guestbook.js
// Firestore-backed guestbook. The trigger is a small hidden icon — press
// and hold it (~650ms) and a terminal-styled panel grows in from the
// bottom-left corner. Works the same way with a pointer or a keyboard
// (hold Enter/Space).
//
// The Firestore client is bundled locally (firebase-lite.js, same folder
// as this file) instead of loaded from www.gstatic.com. Privacy Badger
// and similar tracker blockers sometimes flag gstatic.com broadly (it
// hosts a lot of unrelated Google properties), which was breaking this
// for at least one visitor without them needing to disable anything.
// Loading the SDK from the same origin as the rest of the site
// sidesteps that. It's the "Firestore Lite" build specifically — no
// realtime onSnapshot listeners, no offline cache — since this
// guestbook only ever does one-time reads (on open) and writes (on
// submit), which is all Lite supports and it's roughly a quarter the
// size of the full SDK as a result.
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
} from "./firebase-lite.js";

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
const HOLD_MS = 650; // how long the trigger must be held to open

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function initGuestbook({ trigger, dialog }) {
  const closeBtn = dialog.querySelector(".gb-close");
  const form = dialog.querySelector("#gbForm");
  const status = dialog.querySelector(".gb-status");
  const entriesList = dialog.querySelector("#gbEntries");
  const submitBtn = form.querySelector(".gb-submit");

  let dialogOpen = false;
  let holdRAF = null;
  let holdStart = 0;

  function setProgress(value) {
    trigger.style.setProperty("--progress", value.toFixed(3));
  }

  function beginHold(event) {
    if (dialogOpen || holdRAF !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    holdStart = performance.now();
    trigger.classList.add("is-holding");
    holdRAF = requestAnimationFrame(tick);
  }

  function tick() {
    const elapsed = performance.now() - holdStart;
    const pct = Math.min(elapsed / HOLD_MS, 1);
    setProgress(pct);
    if (pct >= 1) {
      endHold(false);
      openDialog();
    } else {
      holdRAF = requestAnimationFrame(tick);
    }
  }

  function endHold(reset) {
    if (holdRAF !== null) cancelAnimationFrame(holdRAF);
    holdRAF = null;
    trigger.classList.remove("is-holding");
    if (reset) setProgress(0);
  }

  trigger.addEventListener("pointerdown", beginHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) =>
    trigger.addEventListener(evt, () => endHold(true))
  );
  trigger.addEventListener("contextmenu", (event) => event.preventDefault());

  trigger.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && holdRAF === null && !dialogOpen) {
      event.preventDefault();
      beginHold(event);
    }
  });
  trigger.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") endHold(true);
  });

  // ---- dialog open/close ----
  function openDialog() {
    dialogOpen = true;
    dialog.showModal();
    loadEntries();
  }
  dialog.addEventListener("close", () => {
    dialogOpen = false;
    setProgress(0);
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
