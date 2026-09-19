// ---------------------------------------------------------------
// Custom folder icon (optional) — if you find an svg online you like
// better, paste its inner markup (the <path>/<circle>/etc, not the
// outer <svg> tag) here and it replaces the folder icon everywhere:
// nav folders, the guestbook trigger, the guestbook header. Leave
// empty to keep the built-in one. If the svg you found uses a
// different viewBox than "0 0 48 38", set CUSTOM_FOLDER_ICON_VIEWBOX
// too so it doesn't look squashed.
// (Quick licensing note: most icon sites are free to use but require
// attribution — worth a glance at whatever page you copy it from.)
// ---------------------------------------------------------------
const CUSTOM_FOLDER_ICON_SVG = "";
const CUSTOM_FOLDER_ICON_VIEWBOX = "";

if (CUSTOM_FOLDER_ICON_SVG) {
  document.querySelectorAll(".folder-icon").forEach((svg) => {
    svg.innerHTML = CUSTOM_FOLDER_ICON_SVG;
    if (CUSTOM_FOLDER_ICON_VIEWBOX) svg.setAttribute("viewBox", CUSTOM_FOLDER_ICON_VIEWBOX);
  });
}

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
// place. Back returns to the scattered home scene. This runs first
// and doesn't depend on the guestbook loading at all, on purpose —
// see the note further down.
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
// Guestbook — loaded as a separate module on purpose. If this fails
// for any reason (a missing file, a browser blocking the request),
// it only takes the guestbook down with it, not the folders/gallery/
// scroll-hint code above, which has already run by this point.
// ---------------------------------------------------------------
const trigger = document.getElementById("gbTrigger");
const dialog = document.getElementById("gbDialog");

if (trigger && dialog && typeof dialog.showModal === "function") {
  import("./guestbook.js")
    .then(({ initGuestbook }) => initGuestbook({ trigger, dialog }))
    .catch((err) => {
      console.error("guestbook failed to load, hiding its trigger:", err);
      trigger.hidden = true;
    });
} else if (trigger) {
  // Very old browsers without <dialog> support.
  trigger.hidden = true;
}
