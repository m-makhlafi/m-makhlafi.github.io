// Generic step-by-step lab viewer. Everything it shows comes from the lab's YAML file
// (embedded as JSON in #lab-data), so new labs need no code.
import { svgEl, copyText, runAlong } from "./util.js";

const lab = JSON.parse(document.getElementById("lab-data").textContent);
const T = lab.topology;
const C = (c) => "var(--" + c + ")";
const N = {};
T.nodes.forEach((n) => { N[n.id] = n; });
const isEnd = (n) => n.kind === "pc" || n.kind === "server";
const size = (n) => (isEnd(n) ? [112, 50] : [120, 52]);

/* ---------- Diagram ---------- */
const svg = document.getElementById("vSvg");
svg.setAttribute("viewBox", T.viewBox);

function geom(l) {
  const A = N[l.from], B = N[l.to];
  if (A.y === B.y || A.x === B.x) return [{ x: A.x, y: A.y }, { x: B.x, y: B.y }];
  const mid = (A.y + B.y) / 2;
  return [{ x: A.x, y: A.y }, { x: A.x, y: mid }, { x: B.x, y: mid }, { x: B.x, y: B.y }];
}
const dPath = (pts) => "M" + pts.map((p) => p.x + " " + p.y).join(" L ");
function tagPos(l) {
  const A = N[l.from], B = N[l.to];
  if (A.y === B.y) return { x: (A.x + B.x) / 2, y: A.y + 64 };
  return { x: B.x, y: (A.y + B.y) / 2 + 22 };
}

const gW = svgEl("g", {}, svg);
const L = {};
T.links.forEach((l) => {
  const A = N[l.from], B = N[l.to], pts = geom(l), d = dPath(pts);
  const horiz = A.y === B.y, vert = A.x === B.x;
  const off = horiz ? [0, 4] : vert ? [4, 0] : [3, 3];
  const base = svgEl("path", { class: "vw tr-base", d }, gW);
  const a = svgEl("path", { class: "vw", d, transform: `translate(${-off[0]} ${-off[1]})` }, gW);
  const b = svgEl("path", { class: "vw", d, transform: `translate(${off[0]} ${off[1]})` }, gW);
  a.style.strokeWidth = b.style.strokeWidth = "3.5";
  let label = null;
  if (horiz) {
    const dir = Math.sign(B.x - A.x) || 1;
    if (l.fromPort) svgEl("text", { class: "tl", x: A.x + dir * (size(A)[0] / 2 + 6), y: A.y + 22, "text-anchor": dir > 0 ? "start" : "end" }, gW).textContent = l.fromPort;
    if (l.toPort) svgEl("text", { class: "tl", x: B.x - dir * (size(B)[0] / 2 + 6), y: B.y + 22, "text-anchor": dir > 0 ? "end" : "start" }, gW).textContent = l.toPort;
    label = svgEl("text", { class: "tl", x: (A.x + B.x) / 2, y: A.y + 42, "text-anchor": "middle" }, gW);
  } else if (!vert) {
    const mid = (A.y + B.y) / 2, left = B.x < A.x;
    if (l.toPort) svgEl("text", { class: "tl", x: B.x + (left ? -6 : 6), y: mid - 6, "text-anchor": left ? "end" : "start" }, gW).textContent = l.toPort;
    if (l.fromPort) svgEl("text", { class: "tl", x: A.x + 6, y: A.y + size(A)[1] / 2 + 14 }, gW).textContent = l.fromPort;
  }
  L[l.id] = { def: l, base, a, b, label, pts };
});
const tagTxt = svgEl("text", { class: "tagtxt", x: -100, y: -100, "text-anchor": "middle" }, svg);

const gN = svgEl("g", {}, svg);
const NE = {};
T.nodes.forEach((n) => {
  const [w, h] = size(n);
  const g = svgEl("g", { class: "vn" + (isEnd(n) ? " pc" : "") }, gN);
  svgEl("rect", { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 8 }, g);
  svgEl("text", { class: "t1", x: n.x, y: n.y - 5, "text-anchor": "middle" }, g).textContent = n.label;
  const sub = svgEl("text", { class: "t2", x: n.x, y: n.y + 12, "text-anchor": "middle" }, g);
  const tag = svgEl("text", { class: isEnd(n) ? "t3" : "t2", x: n.x, y: isEnd(n) ? n.y + 42 : n.y - 36, "text-anchor": "middle" }, g);
  NE[n.id] = { g, sub, tag };
});
const pkt = svgEl("circle", { class: "vpkt", r: 7, cx: -20, cy: -20 }, svg);

function stateAt(i) {
  const s = { nodes: {}, links: {} };
  for (let k = 0; k <= Math.min(i, lab.steps.length - 1); k++) {
    const st = lab.steps[k].state || {};
    for (const id in st.nodes || {}) s.nodes[id] = Object.assign({}, s.nodes[id], st.nodes[id]);
    for (const id in st.links || {}) s.links[id] = Object.assign({}, s.links[id], st.links[id]);
  }
  return s;
}
function draw(i) {
  const s = stateAt(i);
  const hl = (lab.steps[i] && lab.steps[i].highlight) || [];
  T.nodes.forEach((n) => {
    const st = s.nodes[n.id] || {}, e = NE[n.id];
    e.g.classList.toggle("hl", hl.includes(n.id));
    e.sub.textContent = st.sub ?? n.sub;
    e.tag.textContent = st.tag ?? n.tag;
    if (st.color) e.g.style.setProperty("--vc", C(st.color)); else e.g.style.removeProperty("--vc");
  });
  Object.values(L).forEach((o) => {
    const st = s.links[o.def.id] || {};
    const trunk = st.style === "trunk";
    o.base.style.display = trunk ? "none" : "";
    o.a.style.display = o.b.style.display = trunk ? "" : "none";
    if (trunk) {
      const cs = st.colors || ["accent", "blue"];
      o.a.style.setProperty("--vc", C(cs[0]));
      o.b.style.setProperty("--vc", C(cs[1] || cs[0]));
    }
    // An access link takes the color of the end device it serves
    const end = isEnd(N[o.def.to]) ? o.def.to : isEnd(N[o.def.from]) ? o.def.from : null;
    const endColor = end && s.nodes[end] && s.nodes[end].color;
    o.base.classList.toggle("tr-base", !endColor);
    if (endColor) o.base.style.setProperty("--vc", C(endColor)); else o.base.style.removeProperty("--vc");
    if (o.label) {
      o.label.textContent = st.label ?? o.def.label ?? "";
      o.label.classList.toggle("on", trunk);
    }
  });
  tagTxt.textContent = "";
  pkt.setAttribute("cx", -20);
}

/* ---------- Pings ---------- */
const pingBox = document.getElementById("pingBox");
const pingBtns = document.getElementById("pingBtns");
const pingOut = document.getElementById("pingOut");
const pingTitle = document.getElementById("pingTitle");
let pinging = false;

function findLink(a, b) {
  return T.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
}
function runPing(p) {
  if (pinging) return;
  pinging = true;
  pkt.setAttribute("class", "vpkt");
  tagTxt.textContent = "";
  const lines = p.output.split("\n");
  pingOut.textContent = lines.slice(0, 3).join("\n");
  const pts = [], segLink = [];
  for (let i = 0; i < p.path.length - 1; i++) {
    const l = findLink(p.path[i], p.path[i + 1]);
    let g = geom(l);
    if (l.from !== p.path[i]) g = g.slice().reverse();
    g.forEach((pt, k) => {
      if (k === 0 && pts.length) return;
      pts.push(pt);
      if (pts.length > 1) segLink.push(l.id);
    });
  }
  runAlong(pkt, pts, (j) => {
    if (p.tag && segLink[j] === p.tag.link) {
      const tp = tagPos(L[p.tag.link].def);
      tagTxt.setAttribute("x", tp.x); tagTxt.setAttribute("y", tp.y);
      tagTxt.textContent = p.tag.text;
    } else tagTxt.textContent = "";
  }, () => {
    pkt.setAttribute("class", "vpkt " + (p.result === "ok" ? "ok" : "drop"));
    if (p.result === "drop" && p.dropText) {
      const last = N[p.path[p.path.length - 1]];
      tagTxt.setAttribute("x", last.x); tagTxt.setAttribute("y", last.y - 56);
      tagTxt.textContent = p.dropText;
    }
    pingOut.textContent = p.output;
    pinging = false;
  });
}
function setupPings(step) {
  pingBox.hidden = !step || !step.pings;
  if (pingBox.hidden) return;
  pingTitle.textContent = step.pingsTitle || "جرّب بنفسك";
  pingBtns.innerHTML = "";
  pingOut.textContent = "_";
  step.pings.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ghost-btn"; b.textContent = p.label;
    b.addEventListener("click", () => runPing(p));
    pingBtns.appendChild(b);
  });
}

/* ---------- Step panel ---------- */
const hasSummary = !!lab.summary;
const total = lab.steps.length + (hasSummary ? 1 : 0);
const stepper = document.getElementById("stepper");
const panel = document.getElementById("lvSteps");
const prog = document.getElementById("lvProg");
let cur = 0;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const h4 = (t) => el("h4", null, t);

for (let i = 0; i < total; i++) {
  const b = el("button");
  b.type = "button";
  b.append(el("span", "mono", String(i + 1)), el("span", null, i < lab.steps.length ? lab.steps[i].title : "الخلاصة"));
  b.addEventListener("click", () => go(i));
  stepper.appendChild(b);
}

const HINT = "مرّر المؤشر على أي سطر، أو اضغط عليه، لترى شرحه.";
function codeBlock(lines, explain) {
  const box = el("div", "code");
  lines.forEach((l) => {
    const s = el("span", "ln", l.cmd);
    s.tabIndex = 0;
    const show = () => {
      box.querySelectorAll(".ln.on").forEach((x) => x.classList.remove("on"));
      s.classList.add("on");
      explain.innerHTML = "";
      explain.append(el("b", "mono", l.cmd.trim()), document.createTextNode("  ←  " + l.ex));
    };
    s.addEventListener("mouseenter", show);
    s.addEventListener("focus", show);
    s.addEventListener("click", show);
    box.appendChild(s);
  });
  const c = el("button", "copy", "نسخ");
  c.type = "button";
  c.addEventListener("click", () => copyText(lines.map((l) => l.cmd).join("\n"), c, box));
  box.appendChild(c);
  return box;
}
function cheatSheet() {
  const seen = new Set(), rows = [];
  lab.steps.forEach((s) => Object.values(s.commands).forEach((ls) => ls.forEach((l) => {
    const c = l.cmd.trim();
    if (c === "exit" || seen.has(c)) return;
    seen.add(c);
    rows.push([c, l.ex]);
  })));
  const wrap = el("div", "cheat"), tbl = el("table"), tb = el("tbody");
  tbl.innerHTML = "<thead><tr><th>الأمر</th><th>وظيفته</th></tr></thead>";
  rows.forEach((r) => {
    const tr = el("tr");
    tr.append(el("td", "mono", r[0]), el("td", null, r[1]));
    tb.appendChild(tr);
  });
  tbl.appendChild(tb); wrap.appendChild(tbl);
  return { el: wrap, n: rows.length };
}
// `code` in YAML text becomes <code>
function withCode(text) {
  const p = el("p");
  text.split(/(`[^`]+`)/).forEach((part) => {
    if (part.startsWith("`") && part.endsWith("`")) p.appendChild(el("code", null, part.slice(1, -1)));
    else if (part) p.appendChild(document.createTextNode(part));
  });
  return p;
}

function go(i) {
  cur = i;
  stepper.querySelectorAll("button").forEach((b, k) => {
    if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.classList.toggle("done", k < i);
  });
  prog.style.width = ((i + 1) / total) * 100 + "%";
  const s = lab.steps[i];
  draw(Math.min(i, lab.steps.length - 1));
  setupPings(s);
  panel.innerHTML = "";
  panel.appendChild(el("h3", "step-title", s ? "الخطوة " + (i + 1) + ": " + s.title : "الخلاصة"));

  if (!s) {
    const sm = lab.summary, cs = cheatSheet();
    panel.append(el("p", "idea", sm.intro + " (" + cs.n + " أمراً)"), cs.el);
    if (sm.challenge) {
      const d = el("details", "challenge");
      d.appendChild(el("summary", null, sm.challenge.q));
      d.appendChild(withCode(sm.challenge.a));
      panel.append(h4("تحدٍّ قصير"), d);
    }
    const more = el("div", "lv-meta");
    (sm.files || []).forEach((f) => more.appendChild(el("span", "chip", f)));
    if (sm.short) {
      const a = el("a", "chip", sm.short.title);
      a.href = sm.short.href;
      a.style.textDecoration = "none";
      more.appendChild(a);
    }
    if (more.children.length) panel.append(h4("ملفات ومحتوى مرتبط"), more);
  } else {
    panel.append(h4("الفكرة"), el("p", "idea", s.idea));
    const devs = Object.keys(s.commands);
    const tabs = el("div", "dev-tabs"), holder = el("div"), explain = el("p", "explain", HINT);
    tabs.setAttribute("role", "tablist");
    const showDev = (d) => {
      tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.textContent === d ? "true" : "false"));
      holder.innerHTML = "";
      holder.appendChild(codeBlock(s.commands[d], explain));
      explain.textContent = HINT;
    };
    devs.forEach((d) => {
      const b = el("button", null, d);
      b.type = "button"; b.setAttribute("role", "tab");
      b.addEventListener("click", () => showDev(d));
      tabs.appendChild(b);
    });
    const wrap = el("div");
    wrap.append(tabs, holder);
    panel.append(h4(devs.length > 1 ? "الأوامر على " + devs.join(" و ") : "الأوامر"), wrap, explain);
    showDev(devs[0]);
    if (s.verify) {
      const out = el("pre", "out");
      out.append(el("span", "cm", s.verify.cmd + "\n"), document.createTextNode(s.verify.output));
      panel.append(h4("التحقق: ماذا يجب أن ترى"), out);
    }
    if (s.mistakes.length) {
      const ul = el("ul", "mistakes");
      s.mistakes.forEach((m) => ul.appendChild(el("li", null, m)));
      panel.append(h4(s.pings ? "ملاحظة" : "أخطاء شائعة"), ul);
    }
  }

  const nav = el("div", "lv-nav");
  const prev = el("button", "btn", "→ السابق");
  const next = el("button", "btn primary", i === total - 2 && hasSummary ? "الخلاصة ←" : "التالي ←");
  prev.type = next.type = "button";
  prev.disabled = i === 0;
  next.disabled = i === total - 1;
  prev.addEventListener("click", () => cur > 0 && go(cur - 1));
  next.addEventListener("click", () => cur < total - 1 && go(cur + 1));
  nav.append(prev, next);
  panel.appendChild(nav);
}

go(Math.min(lab.startStep || 0, total - 1));
