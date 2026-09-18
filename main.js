import { initGuestbook } from "./guestbook.js";

// ---------------------------------------------------------------
// Gallery — add paths/URLs here; the grid below builds itself from
// this array. Leave it empty and the section just shows a note.
// ---------------------------------------------------------------
const GALLERY_IMAGES = [
  // { src: "images/one.jpg", alt: "" },
];

const galleryGrid = document.getElementById("galleryGrid");
if (galleryGrid) {
  for (const { src, alt = "" } of GALLERY_IMAGES) {
    const tile = document.createElement("div");
    tile.className = "gallery-tile";
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    tile.appendChild(img);
    galleryGrid.appendChild(tile);
  }
}

// ---------------------------------------------------------------
// Rias figure — set a path once you have the png; the grayscale +
// crimson-tint + fade treatment is all in style.css (.rias-figure),
// applied to whatever image lands here.
// ---------------------------------------------------------------
const RIAS_IMAGE = ""; // e.g. "images/rias.png"

const riasFigure = document.getElementById("riasFigure");
if (riasFigure && RIAS_IMAGE) {
  const img = document.createElement("img");
  img.src = RIAS_IMAGE;
  img.alt = "";
  img.loading = "lazy";
  riasFigure.replaceChildren(img);
}

// ---------------------------------------------------------------
// Folder nav — swaps which <section class="view"> is visible.
// Plain click handling, no routing/history needed for three tabs.
// ---------------------------------------------------------------
const folderLinks = document.querySelectorAll(".folder-link");
const views = document.querySelectorAll(".view");

folderLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.dataset.target;

    folderLinks.forEach((l) => l.classList.toggle("is-active", l === link));
    views.forEach((view) => {
      view.hidden = view.id !== `view-${target}`;
    });
  });
});

// ---------------------------------------------------------------
// Guestbook
// ---------------------------------------------------------------
const trigger = document.getElementById("gbTrigger");
const handle = document.getElementById("gbHandle");
const dialog = document.getElementById("gbDialog");

if (trigger && handle && dialog && typeof dialog.showModal === "function") {
  initGuestbook({ trigger, handle, dialog });
} else if (trigger) {
  // Very old browsers without <dialog> support: hide the trigger rather
  // than leave a control that does nothing.
  trigger.hidden = true;
}
