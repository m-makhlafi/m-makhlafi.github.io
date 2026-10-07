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
filterBtns.forEach((b) => {
  b.addEventListener("click", () => {
    const f = b.getAttribute("data-f");
    filterBtns.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    shorts.forEach((s) => { s.hidden = !(f === "all" || s.getAttribute("data-s") === f); });
  });
});

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
