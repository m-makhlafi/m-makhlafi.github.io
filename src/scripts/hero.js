import { reduce } from "./util.js";

const root = document.documentElement;
const canvas = document.getElementById("topo");
const ctx = canvas.getContext("2d");
const colors = {};
function readColors() {
  const cs = getComputedStyle(root);
  ["--accent", "--blue", "--green", "--brown", "--ink", "--muted", "--line", "--surface-2"].forEach((k) => {
    colors[k] = cs.getPropertyValue(k).trim();
  });
}
readColors();
window.addEventListener("themechange", () => { readColors(); draw(); });
const mq = window.matchMedia("(prefers-color-scheme: light)");
if (mq.addEventListener) mq.addEventListener("change", () => { readColors(); draw(); });

const nodes = [
  { id: "net", label: "Internet", ip: "WAN", x: 0.5, y: 0.12 },
  { id: "rtr", label: "Router", ip: "10.0.0.1", x: 0.5, y: 0.38 },
  { id: "sw", label: "Switch", ip: "L2 · 24p", x: 0.5, y: 0.64 },
  { id: "s1", label: "srv-01", ip: "10.0.0.12", x: 0.14, y: 0.88 },
  { id: "s2", label: "srv-02", ip: "10.0.0.13", x: 0.38, y: 0.88 },
  { id: "nas", label: "NAS", ip: "10.0.0.20", x: 0.62, y: 0.88 },
  { id: "pc", label: "laptop", ip: "10.0.0.50", x: 0.86, y: 0.88 },
];
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const edges = [
  ["net", "rtr", "--accent"], ["rtr", "sw", "--blue"],
  ["sw", "s1", "--green"], ["sw", "s2", "--green"], ["sw", "nas", "--brown"], ["sw", "pc", "--blue"],
];
const routes = [
  ["pc", "sw", "rtr", "net"], ["net", "rtr", "sw", "s1"], ["s1", "sw", "nas"],
  ["pc", "sw", "s2"], ["s2", "sw", "rtr", "net"], ["nas", "sw", "pc"], ["net", "rtr", "sw", "s2"],
];
const routeColor = ["--accent", "--blue", "--green", "--brown"];
let packets = [], total = 0, W = 0, H = 0;
const pktCount = document.getElementById("pktCount");

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
const pos = (n) => ({ x: n.x * W, y: n.y * H });
function spawn(progress) {
  packets.push({
    route: routes[Math.floor(Math.random() * routes.length)], seg: 0, t: progress || 0,
    speed: 0.012 + Math.random() * 0.01, color: routeColor[Math.floor(Math.random() * routeColor.length)],
  });
  total++;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  const compact = W < 420;
  edges.forEach((e) => {
    const a = pos(byId[e[0]]), b = pos(byId[e[1]]);
    ctx.strokeStyle = colors[e[2]]; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    const midY = (a.y + b.y) / 2;
    ctx.lineTo(a.x, midY); ctx.lineTo(b.x, midY); ctx.lineTo(b.x, b.y); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  packets.forEach((p) => {
    const a = pos(byId[p.route[p.seg]]), b = pos(byId[p.route[p.seg + 1]]);
    const midY = (a.y + b.y) / 2;
    const l1 = Math.abs(midY - a.y), l2 = Math.abs(b.x - a.x), l3 = Math.abs(b.y - midY), L = l1 + l2 + l3 || 1;
    const d = p.t * L;
    let x, y;
    if (d < l1) { x = a.x; y = a.y + Math.sign(midY - a.y) * d; }
    else if (d < l1 + l2) { x = a.x + Math.sign(b.x - a.x) * (d - l1); y = midY; }
    else { x = b.x; y = midY + Math.sign(b.y - midY) * (d - l1 - l2); }
    ctx.fillStyle = colors[p.color];
    ctx.shadowColor = colors[p.color]; ctx.shadowBlur = 10;
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.shadowBlur = 0;
  });
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  nodes.forEach((n) => {
    const p = pos(n), w = compact ? 64 : 84, h = compact ? 34 : 40;
    roundRect(p.x - w / 2, p.y - h / 2, w, h, 7);
    ctx.fillStyle = colors["--surface-2"]; ctx.fill();
    ctx.strokeStyle = colors["--line"]; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = colors["--ink"];
    ctx.font = "500 " + (compact ? 10 : 12) + "px 'IBM Plex Mono', Consolas, monospace";
    ctx.fillText(n.label, p.x, p.y - (compact ? 6 : 7));
    ctx.fillStyle = colors["--muted"];
    ctx.font = (compact ? 8 : 10) + "px 'IBM Plex Mono', Consolas, monospace";
    ctx.fillText(n.ip, p.x, p.y + (compact ? 8 : 9));
  });
}
let onScreen = true;
new IntersectionObserver(([e]) => {
  const was = onScreen;
  onScreen = e.isIntersecting;
  if (onScreen && !was && !reduce) requestAnimationFrame(step);
}).observe(canvas);
function step() {
  if (!onScreen || document.hidden) return;
  packets.forEach((p) => { p.t += p.speed; if (p.t >= 1) { p.t = 0; p.seg++; } });
  packets = packets.filter((p) => p.seg < p.route.length - 1);
  if (packets.length < 9 && Math.random() < 0.06) spawn();
  pktCount.textContent = total + " pkts";
  draw();
  requestAnimationFrame(step);
}
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => { if (!document.hidden && onScreen && !reduce) requestAnimationFrame(step); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
for (let i = 0; i < 5; i++) spawn(Math.random());
resize();
pktCount.textContent = total + " pkts";
if (!reduce) requestAnimationFrame(step);

// Live ping lines
const pingEl = document.getElementById("pingLines");
let seq = 1;
const lines = [pingEl.textContent];
if (!reduce) {
  setInterval(() => {
    seq++;
    const ms = (0.3 + Math.random() * 0.4).toFixed(2);
    lines.push("64 bytes from 10.0.0.1: icmp_seq=" + seq + " ttl=64 time=" + ms + " ms");
    if (lines.length > 3) lines.shift();
    pingEl.textContent = lines.join("\n");
  }, 1200);
}
