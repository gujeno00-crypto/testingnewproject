// guestbook.js
// Firestore-backed guestbook, opened by a press-and-hold gesture on a small
// trigger button rather than a plain click — the button fills via the
// --progress custom property set below (see style.css for how it's drawn).
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

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Firebase web config is not a secret — it identifies the project, it
// doesn't authorize access. Access control lives in the Firestore rules
// above. The one piece missing here is apiKey: Firebase Console → Project
// settings → General → Your apps → SDK setup and configuration.
const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "fallenpage-fdb3d.firebaseapp.com",
  projectId: "fallenpage-fdb3d",
  messagingSenderId: "97560388444",
  appId: "1:97560388444:web:71906c3e2f1e2652edd799",
};

const ENTRIES_LIMIT = 20;
const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = "gb-last-sign";

let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function initGuestbook({ trigger, dialog, holdMs = 650 }) {
  const closeBtn = dialog.querySelector(".gb-close");
  const form = dialog.querySelector("#gbForm");
  const status = dialog.querySelector(".gb-status");
  const entriesList = dialog.querySelector("#gbEntries");
  const submitBtn = form.querySelector(".gb-submit");

  let holdRAF = null;
  let holdStart = 0;
  let dialogOpen = false;

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
    const pct = Math.min(elapsed / holdMs, 1);
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
  trigger.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && holdRAF === null && !dialogOpen) {
      event.preventDefault();
      beginHold(event);
    }
  });
  trigger.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") endHold(true);
  });
  trigger.addEventListener("contextmenu", (event) => event.preventDefault());

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
