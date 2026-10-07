// Reels-style player for the shorts grid. Data comes from src/data/portfolio.ts via #shorts-data.
const { base, series, items } = JSON.parse(document.getElementById("shorts-data").textContent);
const dlg = document.getElementById("player");
const frame = document.getElementById("plFrame");
const $ = (id) => document.getElementById(id);
const PLATFORMS = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };
const mediaUrl = (src) => (/^https?:/.test(src) ? src : base.replace(/\/$/, "") + "/" + src.replace(/^\//, ""));
let cur = 0;

function media(v) {
  if (v.video && v.video.type === "file") {
    const el = document.createElement("video");
    el.src = mediaUrl(v.video.src);
    if (v.video.poster) el.poster = mediaUrl(v.video.poster);
    el.controls = true; el.autoplay = true; el.playsInline = true; el.loop = true;
    el.setAttribute("aria-label", v.title);
    return el;
  }
  if (v.video && v.video.type === "youtube") {
    const el = document.createElement("iframe");
    el.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.video.id) + "?autoplay=1&rel=0&playsinline=1";
    el.title = v.title;
    el.allow = "autoplay; encrypted-media; picture-in-picture";
    el.allowFullscreen = true;
    return el;
  }
  const soon = document.createElement("div");
  soon.className = "pl-soon";
  const g = document.createElement("span"); g.className = "glyph"; g.textContent = v.glyph;
  const t = document.createElement("b"); t.textContent = "قيد الإنتاج";
  const p = document.createElement("span"); p.textContent = "هذا الفيديو جزء من الموسم الأول، وسيُنشر قريباً.";
  soon.append(g, t, p);
  return soon;
}

function render(i) {
  cur = (i + items.length) % items.length;
  const v = items[cur], s = series[v.s];
  dlg.style.setProperty("--wire", "var(--" + s.color + ")");
  frame.innerHTML = "";
  frame.appendChild(media(v));
  $("plSeries").textContent = s.label;
  $("plCount").textContent = cur + 1 + " من " + items.length;
  $("plTitle").textContent = v.title;
  $("plDesc").textContent = v.desc;
  const ul = $("plPoints");
  ul.innerHTML = "";
  v.points.forEach((p) => { const li = document.createElement("li"); li.textContent = p; ul.appendChild(li); });
  const lab = $("plLab");
  lab.hidden = !v.lab;
  if (v.lab) { lab.href = base.replace(/\/$/, "") + "/labs/" + v.lab.id + "/"; lab.textContent = v.lab.label + " ←"; }
  const links = $("plLinks");
  links.innerHTML = "";
  const entries = Object.entries(v.links || {}).filter(([, u]) => u);
  links.parentElement.hidden = entries.length === 0;
  entries.forEach(([k, u]) => {
    const a = document.createElement("a");
    a.className = "chip"; a.href = u; a.target = "_blank"; a.rel = "noopener"; a.textContent = PLATFORMS[k] || k;
    a.style.textDecoration = "none";
    links.appendChild(a);
  });
  history.replaceState(null, "", "#v-" + v.id);
}

function open(i) {
  render(i);
  if (!dlg.open) dlg.showModal();
}

document.querySelectorAll("#shorts .short").forEach((b) => {
  b.addEventListener("click", () => open(Number(b.getAttribute("data-i"))));
});
$("plNext").addEventListener("click", () => render(cur + 1));
$("plPrev").addEventListener("click", () => render(cur - 1));
$("plClose").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener("close", () => {
  frame.innerHTML = ""; // stops playback
  history.replaceState(null, "", location.pathname + location.search);
});
// RTL: the left arrow moves forward
dlg.addEventListener("keydown", (e) => {
  if (e.target.tagName === "VIDEO") return;
  if (e.key === "ArrowLeft") { e.preventDefault(); render(cur + 1); }
  if (e.key === "ArrowRight") { e.preventDefault(); render(cur - 1); }
});
// Swipe up / down on the video, like Reels
let y0 = null;
const stage = $("plStage");
stage.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
stage.addEventListener("touchend", (e) => {
  if (y0 === null) return;
  const dy = e.changedTouches[0].clientY - y0;
  if (dy < -60) render(cur + 1);
  else if (dy > 60) render(cur - 1);
  y0 = null;
});

// Deep link: /#v-<id> opens that short directly
function fromHash() {
  const m = location.hash.match(/^#v-(.+)$/);
  if (!m) return;
  const i = items.findIndex((v) => v.id === decodeURIComponent(m[1]));
  if (i > -1 && !(dlg.open && i === cur)) open(i);
}
fromHash();
window.addEventListener("hashchange", fromHash);
