// What the laptop screen shows in each chapter. Every word comes from Mohammed's story.
// Animated screens redraw from (t = progress through the chapter, now = seconds).
import * as THREE from "three";

const W = 2048, H = 1320;
const KUFI = "'Reem Kufi', 'IBM Plex Sans Arabic', sans-serif";
const BODY = "'IBM Plex Sans Arabic', sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const C = { bg0: "#0a1222", bg1: "#0f1b33", line: "#22324f", ink: "#e9eef7", muted: "#8a99b4", blue: "#6ea0ff", accent: "#F29A4A", green: "#47B07A", brown: "#B08560" };

function surface(draw) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const api = { tex, draw: (t, now) => { draw(x, t, now); tex.needsUpdate = true; } };
  api.draw(0, 0);
  return api;
}
function frame(x, chapter, total, email) {
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(110,160,255,.06)"; x.lineWidth = 1;
  for (let i = 0; i < W; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 64) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  x.textBaseline = "middle";
  x.direction = "ltr"; x.textAlign = "left";
  x.fillStyle = C.blue; x.font = `600 44px ${MONO}`; x.fillText("</>", 110, 110);
  x.fillStyle = C.ink; x.font = `600 44px ${MONO}`; x.fillText("mohammed", 210, 110);
  x.textAlign = "right"; x.fillStyle = C.muted; x.font = `500 32px ${MONO}`;
  x.fillText(`${String(chapter).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 110, 110);
  x.fillStyle = C.line; x.fillRect(110, 170, W - 220, 2);
  x.textAlign = "right"; x.fillStyle = C.muted; x.font = `500 28px ${MONO}`; x.fillText(email, W - 110, H - 90);
}
function rtl(x, text, px, py, font, color, align = "center") {
  x.direction = "rtl"; x.textAlign = align; x.font = font; x.fillStyle = color; x.fillText(text, px, py);
}
function chip(x, text, cx, cy, color) {
  x.font = `600 40px ${/^[\x00-\x7F ·/+]+$/.test(text) ? MONO : BODY}`;
  const w = x.measureText(text).width + 80;
  x.beginPath(); x.roundRect(cx - w / 2, cy - 44, w, 88, 18);
  x.fillStyle = "rgba(110,160,255,.08)"; x.fill();
  x.strokeStyle = color; x.lineWidth = 3; x.stroke();
  x.fillStyle = C.ink; x.textAlign = "center"; x.direction = "ltr"; x.fillText(text, cx, cy + 2);
}

export function makeScreens(floors, email) {
  const total = floors.length;
  const byId = Object.fromEntries(floors.map((f, i) => [f.id, { f, n: i + 1 }]));

  const university = surface((x) => {
    const { f, n } = byId.university;
    frame(x, n, total, email);
    x.direction = "ltr"; x.textAlign = "center"; x.fillStyle = C.ink; x.font = `700 300px ${KUFI}`; x.fillText("2020", W / 2, 520);
    rtl(x, "بكالوريوس تقنية المعلومات", W / 2, 800, `600 84px ${BODY}`, C.blue);
    rtl(x, "الجامعة تمنحك المفتاح، لكن الميدان هو من يفتح الأبواب", W / 2, 960, `500 56px ${BODY}`, C.muted);
  });

  const bootcamp = surface((x, t) => {
    const { f, n } = byId.bootcamp;
    frame(x, n, total, email);
    rtl(x, f.title, W / 2, 360, `700 110px ${KUFI}`, C.ink);
    rtl(x, f.when, W / 2, 500, `500 52px ${BODY}`, C.muted);
    const cols = [C.blue, C.accent, C.brown, C.green, C.blue];
    const shown = Math.max(1, Math.ceil(t * 1.4 * f.techs.length));
    f.techs.forEach((tech, k) => {
      if (k >= shown) return;
      const row = k < 3 ? 0 : 1, inRow = row ? 2 : 3, idx = row ? k - 3 : k;
      chip(x, tech.name, W / 2 + (idx - (inRow - 1) / 2) * 520, 700 + row * 180, cols[k]);
    });
  });

  const code = surface((x, t) => {
    const { n } = byId.freelance;
    const lines = [
      "// orders.service.js",
      "import express from 'express';",
      "import { db } from './db.js';",
      "",
      "const router = express.Router();",
      "",
      "router.get('/orders', async (req, res) => {",
      "  const orders = await db.orders.find();",
      "  res.json(orders);",
      "});",
      "",
      "export default router;",
    ];
    x.fillStyle = "#0d1117"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#161b22"; x.fillRect(0, 0, W, 90); x.fillRect(0, 90, 380, H - 90);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(50 + i * 44, 45, 14, 0, 7); x.fill(); });
    x.direction = "ltr"; x.textAlign = "left"; x.textBaseline = "middle";
    x.font = `500 34px ${MONO}`; x.fillStyle = "#e6edf3"; x.fillText("orders.service.js", 440, 47);
    x.fillStyle = "#8b949e"; x.fillText("App.jsx", 820, 47); x.fillText("main.py", 1060, 47);
    x.fillStyle = C.accent; x.fillRect(420, 84, 340, 5);
    ["src", "  routes", "  services", "  components", "db.js", "server.js", "package.json"].forEach((s, i) => {
      x.fillStyle = i === 2 ? "#e6edf3" : "#8b949e"; x.fillText(s, 40, 160 + i * 58);
    });
    const kw = /^(import|from|const|async|await|export|default)$/;
    const totalChars = lines.join("").length;
    let budget = Math.floor(Math.min(1, t * 1.25) * totalChars);
    x.font = `500 42px ${MONO}`;
    lines.forEach((line, i) => {
      const y = 170 + i * 74;
      x.fillStyle = "#484f58"; x.fillText(String(i + 1).padStart(2, " "), 420, y);
      const visible = line.slice(0, Math.max(0, budget)); budget -= line.length;
      let px = 510;
      visible.split(/(\s+|[(){}.,;])/).forEach((tok) => {
        let c = "#e6edf3";
        if (line.trim().startsWith("//")) c = "#8b949e";
        else if (kw.test(tok)) c = "#ff7b72";
        else if (/^['"`]/.test(tok)) c = "#a5d6ff";
        else if (/^(get|json|find|Router)$/.test(tok)) c = "#d2a8ff";
        x.fillStyle = c; x.fillText(tok, px, y); px += x.measureText(tok).width;
      });
      if (budget < 0 && budget > -line.length - 1 && visible.length < line.length) {
        x.fillStyle = C.accent; x.fillRect(px + 4, y - 26, 20, 52);
      }
    });
    x.fillStyle = "#1f6feb"; x.fillRect(0, H - 60, W, 60);
    x.fillStyle = "#fff"; x.font = `500 30px ${MONO}`; x.fillText("main ✓   JavaScript · Node.js · React · Python · MySQL · MongoDB", 30, H - 30);
  });

  const arch = surface((x, t, now) => {
    const { f, n } = byId.design;
    frame(x, n, total, email);
    rtl(x, f.title, W / 2, 270, `700 90px ${KUFI}`, C.ink);
    const box = (label, cx, cy, color, w = 420) => {
      x.beginPath(); x.roundRect(cx - w / 2, cy - 64, w, 128, 22);
      x.fillStyle = "rgba(15,27,51,.95)"; x.fill(); x.strokeStyle = color; x.lineWidth = 4; x.stroke();
      x.direction = "ltr"; x.textAlign = "center"; x.fillStyle = C.ink; x.font = `600 42px ${MONO}`; x.fillText(label, cx, cy + 2);
    };
    const lb = [W / 2, 470], svc = [[W / 2 - 520, 720], [W / 2 + 520, 720]], q = [W / 2, 900], db = [W / 2, 1090];
    const links = [[lb, svc[0]], [lb, svc[1]], [svc[0], q], [svc[1], q], [q, db]];
    x.strokeStyle = "rgba(110,160,255,.45)"; x.lineWidth = 4;
    links.forEach(([a, b]) => { x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); });
    links.forEach(([a, b], k) => {
      const p = (now * 0.5 + k * 0.2) % 1;
      x.fillStyle = C.accent; x.beginPath(); x.arc(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, 14, 0, 7); x.fill();
    });
    box("Nginx · Load Balancer", lb[0], lb[1], C.accent, 640);
    box("Payment", svc[0][0], svc[0][1], C.blue);
    box("Booking", svc[1][0], svc[1][1], C.green);
    box("RabbitMQ · Kafka", q[0], q[1], C.brown, 560);
    box("Redis · Sharding · Replication", db[0], db[1], C.blue, 820);
  });

  const fleet = surface((x, t, now) => {
    const { f, n } = byId.sama;
    frame(x, n, total, email);
    rtl(x, "سما تاكسي", W - 140, 290, `700 96px ${KUFI}`, C.ink, "right");
    x.direction = "ltr"; x.textAlign = "right"; x.fillStyle = C.blue; x.font = `600 46px ${MONO}`;
    x.fillText(f.role || "", W - 140, 400);
    rtl(x, f.when, W - 140, 490, `500 48px ${BODY}`, C.muted, "right");
    f.techs.forEach((tech, k) => {
      const y = 640 + k * 130;
      x.beginPath(); x.roundRect(W - 980, y - 50, 840, 100, 18); x.fillStyle = "rgba(110,160,255,.07)"; x.fill();
      x.strokeStyle = C.line; x.lineWidth = 2; x.stroke();
      x.fillStyle = C.green; x.beginPath(); x.arc(W - 200, y, 12, 0, 7); x.fill();
      rtl(x, tech.name, W - 240, y + 2, `600 44px ${BODY}`, C.ink, "right");
    });
    // fleet map: a road grid with cars moving on it
    const mx = 140, my = 240, mw = 820, mh = 900;
    x.beginPath(); x.roundRect(mx, my, mw, mh, 24); x.fillStyle = "#0b1426"; x.fill(); x.strokeStyle = C.line; x.lineWidth = 2; x.stroke();
    x.strokeStyle = "#1f2f4c"; x.lineWidth = 14;
    for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(mx + 20, my + (mh / 5) * k); x.lineTo(mx + mw - 20, my + (mh / 5) * k); x.stroke(); }
    for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(mx + (mw / 4) * k, my + 20); x.lineTo(mx + (mw / 4) * k, my + mh - 20); x.stroke(); }
    for (let c = 0; c < 9; c++) {
      const horiz = c % 2 === 0, lane = (c % 4) + 1, p = (now * (0.05 + c * 0.006) + c * 0.13) % 1;
      const px = horiz ? mx + 20 + p * (mw - 40) : mx + (mw / 4) * ((c % 3) + 1);
      const py = horiz ? my + (mh / 5) * lane : my + 20 + p * (mh - 40);
      x.fillStyle = C.accent; x.beginPath(); x.arc(px, py, 13, 0, 7); x.fill();
      x.fillStyle = "rgba(242,154,74,.2)"; x.beginPath(); x.arc(px, py, 30, 0, 7); x.fill();
    }
  });

  return { university, bootcamp, code, arch, fleet };
}
