import { initGuestbook } from "./guestbook.js";

// ---------------------------------------------------------------
// Central photo on the home scene — add a path/URL and it appears;
// leave it empty and that spot just shows a note instead of a hole.
// ---------------------------------------------------------------
const CENTRAL_IMAGE = ""; // e.g. "images/central.jpg"

const centralImage = document.getElementById("centralImage");
if (centralImage && CENTRAL_IMAGE) {
  const img = document.createElement("img");
  img.src = CENTRAL_IMAGE;
  img.alt = "";
  img.loading = "lazy";
  centralImage.replaceChildren(img);
}

// ---------------------------------------------------------------
// Gallery — add paths/URLs here; the grid in the gallery folder-view
// builds itself from this array. Leave it empty and it shows a note.
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
// applied to whatever image lands here. Only ever reachable by
// scrolling past the home scene — nothing points at it on purpose.
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
// Folders — opening one swaps the whole page (background comes from
// body[data-view] in style.css) rather than swapping a panel in
// place. Back returns to the scattered home scene.
// ---------------------------------------------------------------
const desktopScene = document.getElementById("desktopScene");
const elsewhereSection = document.getElementById("elsewhereSection");
const folderLinks = document.querySelectorAll(".folder-link");
const folderViews = document.querySelectorAll(".folder-view");

function openFolder(target) {
  desktopScene.hidden = true;
  elsewhereSection.hidden = true;
  folderViews.forEach((view) => {
    view.hidden = view.id !== `view-${target}`;
  });
  document.body.dataset.view = target;
  window.scrollTo(0, 0);
}

function goHome() {
  folderViews.forEach((view) => (view.hidden = true));
  desktopScene.hidden = false;
  elsewhereSection.hidden = false;
  document.body.dataset.view = "home";
  window.scrollTo(0, 0);
}

folderLinks.forEach((link) => {
  link.addEventListener("click", () => openFolder(link.dataset.target));
});
document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", goHome);
});

// ---------------------------------------------------------------
// Scroll hint — only makes sense before the visitor has scrolled, and
// only on the home scene.
// ---------------------------------------------------------------
const scrollHint = document.getElementById("scrollHint");
if (scrollHint) {
  const updateHint = () => {
    const onHome = document.body.dataset.view === "home";
    scrollHint.style.opacity = onHome && window.scrollY < 40 ? "" : "0";
  };
  window.addEventListener("scroll", updateHint, { passive: true });
  updateHint();
}

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
