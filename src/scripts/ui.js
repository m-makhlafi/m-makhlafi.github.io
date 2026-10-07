import { copyText } from "./util.js";

const root = document.documentElement;

// Theme toggle (initial theme is applied by the inline script in Base.astro)
const themeBtn = document.getElementById("themeBtn");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("pf-theme", next); } catch (e) {}
    window.dispatchEvent(new Event("themechange"));
  });
}

// Shorts filter
const filterBtns = document.querySelectorAll("#shortsFilter button");
const shorts = document.querySelectorAll("#shorts .short");
const moreBtn = document.getElementById("shortsMore");
// The home page shows the first 6 shorts; "show all" or picking a series reveals the rest.
const PREVIEW = 6;
let shortsFilter = "all", shortsExpanded = false;
// the preview takes turns between the series, so all four are represented
const preview = new Set();
{
  const bySeries = new Map();
  shorts.forEach((s) => { const k = s.getAttribute("data-s"); if (!bySeries.has(k)) bySeries.set(k, []); bySeries.get(k).push(s); });
  const queues = [...bySeries.values()];
  for (let round = 0; preview.size < Math.min(PREVIEW, shorts.length); round++) {
    queues.forEach((q) => { if (q[round] && preview.size < PREVIEW) preview.add(q[round]); });
  }
}
function applyShorts() {
  shorts.forEach((s) => {
    const match = shortsFilter === "all" || s.getAttribute("data-s") === shortsFilter;
    s.hidden = !match || (shortsFilter === "all" && !shortsExpanded && !preview.has(s));
  });
  if (moreBtn) {
    moreBtn.hidden = shortsFilter !== "all" || shorts.length <= PREVIEW;
    moreBtn.setAttribute("aria-expanded", String(shortsExpanded));
    moreBtn.textContent = shortsExpanded ? "عرض أقل" : `عرض كل الفيديوهات (${shorts.length})`;
  }
}
filterBtns.forEach((b) => {
  b.addEventListener("click", () => {
    shortsFilter = b.getAttribute("data-f");
    filterBtns.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    applyShorts();
  });
});
if (moreBtn) moreBtn.addEventListener("click", () => {
  shortsExpanded = !shortsExpanded;
  applyShorts();
  if (!shortsExpanded) document.getElementById("content").scrollIntoView({ behavior: "smooth" });
});
if (shorts.length) applyShorts();

// On phones the changelog opens with the latest 3 chapters; the rest is one tap away.
const xpLog = document.getElementById("xpLog");
const xpMore = document.getElementById("xpMore");
if (xpLog && xpMore) {
  const entries = [...xpLog.querySelectorAll(".entry")];
  const phone = window.matchMedia("(max-width: 640px)");
  let open = false;
  const applyXp = () => {
    const collapse = phone.matches && !open && entries.length > 3;
    entries.forEach((e, i) => { e.hidden = collapse && i >= 3; });
    xpMore.hidden = !phone.matches || entries.length <= 3;
    xpMore.setAttribute("aria-expanded", String(open));
    xpMore.textContent = open ? "عرض أقل" : `عرض المسيرة كاملة (${entries.length})`;
  };
  xpMore.addEventListener("click", () => { open = !open; applyXp(); });
  if (phone.addEventListener) phone.addEventListener("change", applyXp);
  applyXp();
}

// Copy email
const copyBtn = document.getElementById("copyBtn");
const mail = document.getElementById("mail");
if (copyBtn && mail) copyBtn.addEventListener("click", () => copyText(mail.textContent, copyBtn, mail));

// Contact form: no backend yet, so we show a clear message instead of pretending to send
const form = document.getElementById("contactForm");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("formMsg").hidden = false;
  });
}
