// ---------------------------------------------------------------
// THE PART YOU EDIT — image paths.
// Set a path and the image appears; leave it "" and that spot shows
// a small dashed note instead of a hole. (The words on each folder
// page live in index.html, inside the <div class="page-text"> blocks.)
// ---------------------------------------------------------------
const CENTRAL_IMAGE = ""; // home, middle           e.g. "images/central.jpg"
const ABOUT_IMAGE = ""; //   under the about text   e.g. "images/about.jpg"
const ZEN_IMAGE = ""; //     tall scan of a page    e.g. "images/zen-page.jpg"
const RIAS_IMAGE = ""; //    scroll secret          e.g. "images/rias.png"

// Gallery — add paths/URLs here; the gallery folder page builds itself
// from this array. Leave it empty and it shows a note.
const GALLERY_IMAGES = [
  // { src: "images/one.jpg", alt: "" },
];

// ---------------------------------------------------------------
// Custom folder icon (optional) — the built-in pixel folder is drawn
// once at the top of index.html. If you'd rather use your own svg, paste
// its inner markup (the <path>/<circle>/etc, not the outer <svg> tag)
// here and it replaces the icon on all three folders. Set the viewBox
// too if it isn't the built-in "0 0 28 22" (so it doesn't look squashed).
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
// Images. Drops an <img> into a container, replacing the dashed note.
// If the file can't be found, the note comes back and says which path
// failed, so a typo in a path is easy to spot.
// ---------------------------------------------------------------
function fillImage(container, src, { alt = "", lazy = false } = {}) {
  if (!container || !src) return;
  const note = container.firstElementChild;
  const img = new Image();
  img.alt = alt;
  img.decoding = "async";
  if (lazy) img.loading = "lazy";
  img.addEventListener("error", () => {
    if (!note) return;
    note.textContent = `couldn't load ${src}`;
    container.replaceChildren(note);
  });
  img.src = src;
  container.replaceChildren(img);
}

fillImage(document.getElementById("centralImage"), CENTRAL_IMAGE);
fillImage(document.getElementById("aboutImage"), ABOUT_IMAGE);
fillImage(document.getElementById("zenImage"), ZEN_IMAGE);
fillImage(document.getElementById("riasFigure"), RIAS_IMAGE);

const galleryGrid = document.getElementById("galleryGrid");
if (galleryGrid) {
  for (const { src, alt = "" } of GALLERY_IMAGES) {
    const tile = document.createElement("figure");
    tile.className = "gallery-tile";
    const img = new Image();
    img.src = src;
    img.alt = alt;
    img.decoding = "async";
    img.loading = "lazy";
    tile.appendChild(img);
    galleryGrid.appendChild(tile);
  }
}

// ---------------------------------------------------------------
// Scroll hint + guestbook trigger — both only make sense before the
// visitor has scrolled down, and only on the home scene. The trigger
// is position:fixed so it wouldn't scroll away on its own; once
// you're down looking at the rias figure/links it hides too, so nothing
// from the desktop scene lingers on screen.
// ---------------------------------------------------------------
const scrollHint = document.getElementById("scrollHint");
const gbTriggerEl = document.getElementById("gbTrigger");

function updateOnScroll() {
  const showIt = document.body.dataset.view === "home" && window.scrollY < 40;
  if (scrollHint) scrollHint.style.opacity = showIt ? "" : "0";
  if (gbTriggerEl) {
    gbTriggerEl.style.opacity = showIt ? "" : "0";
    gbTriggerEl.style.pointerEvents = showIt ? "" : "none";
  }
}
window.addEventListener("scroll", updateOnScroll, { passive: true });

// ---------------------------------------------------------------
// Folders — opening one swaps the whole page: the home scene is hidden
// and only that folder's page is shown (background comes from
// body[data-view] in style.css). Like oklama, every folder page has its
// own address: /#about, /#zen, /#gallery. That means the browser's back
// button, the "←" and Esc all take you home, and a page can be linked to
// or reloaded. This runs before the guestbook loads, on purpose — see
// the note further down.
// ---------------------------------------------------------------
const desktopScene = document.getElementById("desktopScene");
const elsewhereSection = document.getElementById("elsewhereSection");
const folderLinks = document.querySelectorAll(".folder-link");
const folderViews = document.querySelectorAll(".folder-view");
const VIEWS = [...folderViews].map((view) => view.id.replace("view-", ""));

const BASE_TITLE = document.title;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const THEME_HOME = themeMeta ? themeMeta.content : "";
const THEME_FOLDER = "#050505";

let shown = null; //             which page is on screen: "home" | "about" | "zen" | "gallery"
let lastFolderButton = null; //  so focus can return to the folder you opened
let cameFromHome = false; //     true once a folder was opened by clicking (so "back" can use history)

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function routeFromHash() {
  const name = location.hash.slice(1);
  return VIEWS.includes(name) ? name : "home";
}

function show(name, { moveFocus = false } = {}) {
  const isHome = name === "home";

  // `hidden` really hides now (see the [hidden] rule at the top of style.css)
  desktopScene.hidden = !isHome;
  elsewhereSection.hidden = !isHome;
  folderViews.forEach((view) => {
    view.hidden = view.id !== `view-${name}`;
  });

  document.body.dataset.view = name;
  const label = isHome ? "" : document.getElementById(`view-${name}`).getAttribute("aria-label") || name;
  document.title = isHome ? BASE_TITLE : `${label} - ${BASE_TITLE}`;
  if (themeMeta) themeMeta.content = isHome ? THEME_HOME : THEME_FOLDER;

  window.scrollTo(0, 0);
  updateOnScroll();

  if (moveFocus) {
    const target = isHome ? lastFolderButton : document.querySelector(`#view-${name} .back-btn`);
    if (target) target.focus({ preventScroll: true });
  }
}

function render(options) {
  const name = routeFromHash();
  if (name === shown) return;
  shown = name;
  show(name, options);
}

function goBack() {
  if (shown === "home") return;
  if (cameFromHome) {
    history.back(); // pops the #folder entry -> hashchange -> home
  } else {
    // opened straight from a link/reload: there's no home entry behind us
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      location.hash = ""; // pages opened from file:// can't rewrite their own address
    }
    render({ moveFocus: true });
  }
}

folderLinks.forEach((button) => {
  button.addEventListener("click", () => {
    lastFolderButton = button;
    cameFromHome = true;
    location.hash = button.dataset.target; // -> hashchange -> render()
  });
});
document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", goBack);
});
window.addEventListener("hashchange", () => render({ moveFocus: true }));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") goBack();
});

// "skip to content" jumps focus to <main> without touching the address
const skipLink = document.querySelector(".skip-link");
if (skipLink) {
  skipLink.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("content").focus();
  });
}

render(); // first paint also honours a direct link like /#about

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
