export const reduce =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NS = "http://www.w3.org/2000/svg";
export function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// Copies text; falls back to selecting `selectEl` when the clipboard is refused.
export function copyText(text, button, selectEl, labels = { done: "تم النسخ", selected: "محدد", idle: "نسخ" }) {
  function fallback() {
    if (selectEl) {
      const r = document.createRange();
      r.selectNodeContents(selectEl);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    button.textContent = labels.selected;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => { button.textContent = labels.done; }, fallback);
  } else fallback();
  setTimeout(() => { button.textContent = labels.idle; }, 1800);
}

// Moves `dot` (an SVG circle) along a polyline. onSeg(index) fires every frame.
export function runAlong(dot, pts, onSeg, done, speed = 3.2) {
  const lens = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(l);
    L += l;
  }
  function place(f) {
    let d = f * L, j = 0;
    while (j < lens.length - 1 && d > lens[j]) { d -= lens[j]; j++; }
    const t = lens[j] ? Math.min(d / lens[j], 1) : 1;
    dot.setAttribute("cx", pts[j].x + (pts[j + 1].x - pts[j].x) * t);
    dot.setAttribute("cy", pts[j].y + (pts[j + 1].y - pts[j].y) * t);
    onSeg(j);
  }
  if (reduce) { place(1); done(); return; }
  const dur = Math.max(L * speed, 300);
  let t0 = null;
  function frame(ts) {
    if (t0 === null) t0 = ts;
    const f = Math.min((ts - t0) / dur, 1);
    place(f);
    if (f < 1) requestAnimationFrame(frame); else done();
  }
  requestAnimationFrame(frame);
}
