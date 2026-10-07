// Product-grade procedural models for the journey: real geometry (bevels, lathed shells,
// instanced keys and ports), physical materials, and high-resolution canvas surfaces.
// No downloaded assets, so nothing to license and nothing heavy to load.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* ---------- materials ----------
   One shared instance per finish: fewer shader programs and state changes, and identical parts can be merged. */
const shared = (make) => { let m = null; return () => (m || (m = make())); };
export const M = {
  alu: shared(() => new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.3, clearcoat: 0.25, clearcoatRoughness: 0.3 })),
  aluDark: shared(() => new THREE.MeshPhysicalMaterial({ color: 0x3b3f46, metalness: 1, roughness: 0.38, clearcoat: 0.2 })),
  steel: shared(() => new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.85, roughness: 0.45 })),
  whitePlastic: shared(() => new THREE.MeshPhysicalMaterial({ color: 0xf1f1ee, metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 })),
  blackPlastic: shared(() => new THREE.MeshPhysicalMaterial({ color: 0x0f1012, metalness: 0.1, roughness: 0.4, clearcoat: 0.3 })),
  rubber: shared(() => new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0, roughness: 0.85 })),
  glass: shared(() => new THREE.MeshPhysicalMaterial({ color: 0x0c1824, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 1 })),
  smoked: shared(() => new THREE.MeshPhysicalMaterial({ color: 0x15171a, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false })),
};

const irMat = shared(() => new THREE.MeshStandardMaterial({ color: 0x220808, emissive: 0x7a1010, emissiveIntensity: 0.6, roughness: 0.2 }));

function rbox(w, h, d, r, mat, segs = 4) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segs, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function lathe(profile, mat, segs = 64) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segs), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function rr(x, X, Y, W, H, R) { x.beginPath(); x.roundRect(X, Y, W, H, R); }

/* ---------- laptop ---------- */
// rows of key widths in key units; a 14.5-unit wide board, 6 rows
const ROWS = [
  { h: 0.62, keys: Array(14).fill(1).map((w, i) => (i === 0 || i === 13 ? 1.25 : 1)), labels: ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "⏻"] },
  { h: 1, keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], labels: ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"] },
  { h: 1, keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], labels: ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"] },
  { h: 1, keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75], labels: ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"] },
  { h: 1, keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25], labels: ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"] },
  { h: 1, keys: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1], labels: ["fn", "ctrl", "opt", "cmd", "", "cmd", "opt", "◀", "▼", "▶"] },
];

export function laptop({ code = [], accent = "#F29A4A", color = null } = {}) {
  const g = new THREE.Group();
  const W = 3.3, D = 2.25, T = 0.1;
  // matte anodised finish (like the reference) when a color is given, bright aluminium otherwise
  const alu = color === null ? M.alu() : new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const base = rbox(W, T, D, 0.045, alu, 6);
  base.position.y = T / 2;
  g.add(base);
  // rubber feet
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), M.rubber());
    f.position.set(sx * (W / 2 - 0.25), -0.005, sz * (D / 2 - 0.22));
    g.add(f);
  });

  // keyboard geometry
  const kbW = W * 0.82, unit = kbW / 14.5, gap = unit * 0.12;
  const kbTop = -D / 2 + 0.2;
  const totalH = ROWS.reduce((s, r) => s + r.h, 0) * unit;
  const keyMat = M.blackPlastic();
  const keyGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.18);
  const keys = [];
  let z = kbTop;
  ROWS.forEach((row) => {
    const rowW = row.keys.reduce((s, k) => s + k, 0) * unit;
    let x = -rowW / 2;
    row.keys.forEach((k, i) => {
      keys.push({ x: x + (k * unit) / 2, z: z + (row.h * unit) / 2, w: k * unit - gap, d: row.h * unit - gap, label: row.labels[i] || "" });
      x += k * unit;
    });
    z += row.h * unit;
  });
  const inst = new THREE.InstancedMesh(keyGeo, keyMat, keys.length);
  inst.castShadow = true; inst.receiveShadow = true;
  const mtx = new THREE.Matrix4();
  keys.forEach((k, i) => {
    mtx.compose(new THREE.Vector3(k.x, T + 0.012, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w, 0.03, k.d));
    inst.setMatrixAt(i, mtx);
  });
  g.add(inst);

  // deck: keyboard well, speaker grilles, trackpad
  const PX = 1024 / W; // px per unit
  const deck = canvasTex(1024, Math.round(D * PX), (x, w, h) => {
    const grd = x.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#9ba1a9"); grd.addColorStop(1, "#8f959d");
    x.fillStyle = grd; x.fillRect(0, 0, w, h);
    const toPx = (vx, vz) => [(vx + W / 2) * PX, (vz + D / 2) * PX];
    const [wx, wy] = toPx(-kbW / 2 - 0.03, kbTop - 0.03);
    x.fillStyle = "#2a2d32"; rr(x, wx, wy, (kbW + 0.06) * PX, totalH * PX + 0.06 * PX, 10); x.fill();
    x.fillStyle = "#6f747b";
    [-1, 1].forEach((s) => {
      const gx = (W / 2 + s * (kbW / 2 + 0.13)) * PX;
      for (let r = 0; r < 34; r++) for (let c = 0; c < 6; c++) {
        x.beginPath(); x.arc(gx + (c - 2.5) * 5, wy + 6 + r * 5.6, 1.2, 0, 7); x.fill();
      }
    });
    const tpW = 1.25, tpD = 0.78;
    const [tx, ty] = toPx(-tpW / 2, kbTop + totalH + 0.12);
    x.fillStyle = "#a3a9b1"; rr(x, tx, ty, tpW * PX, tpD * PX, 16); x.fill();
    x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 2; x.stroke();
    x.fillStyle = "rgba(0,0,0,.25)"; rr(x, w / 2 - 40, h - 8, 80, 6, 3); x.fill();
  });
  const deckMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), new THREE.MeshPhysicalMaterial({ map: deck, metalness: 0.9, roughness: 0.38, clearcoat: 0.2 }));
  deckMesh.rotation.x = -Math.PI / 2; deckMesh.position.y = T + 0.0015; deckMesh.receiveShadow = true;
  g.add(deckMesh);

  // key legends printed on the key tops
  const legends = canvasTex(2048, Math.round(2048 * (totalH / kbW)), (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = "rgba(235,238,242,.92)"; x.textAlign = "center"; x.textBaseline = "middle";
    keys.forEach((k) => {
      if (!k.label) return;
      const px = ((k.x + kbW / 2) / kbW) * w, py = ((k.z - kbTop) / totalH) * h;
      x.font = `500 ${k.label.length > 2 ? 22 : 34}px 'IBM Plex Sans Arabic', Arial, sans-serif`;
      x.fillText(k.label, px, py);
    });
  });
  const legendMesh = new THREE.Mesh(new THREE.PlaneGeometry(kbW, totalH), new THREE.MeshBasicMaterial({ map: legends, transparent: true, depthWrite: false }));
  legendMesh.rotation.x = -Math.PI / 2; legendMesh.position.set(0, T + 0.028, kbTop + totalH / 2);
  g.add(legendMesh);

  // hinge + lid (pivot on the back edge)
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W * 0.86, 24), M.aluDark());
  hinge.rotation.z = Math.PI / 2; hinge.position.set(0, T + 0.02, -D / 2 + 0.03);
  g.add(hinge);
  const lid = new THREE.Group();
  lid.userData.dyn = true; // opens and closes with the scroll
  lid.position.set(0, T + 0.02, -D / 2 + 0.03);
  g.add(lid);
  const LH = D - 0.06, LT = 0.06;
  const shell = rbox(W, LH, LT, 0.04, alu, 6);
  shell.position.set(0, LH / 2, -LT / 2);
  lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, LH - 0.06), new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.15, clearcoat: 1 }));
  bezel.position.set(0, LH / 2, 0.001);
  lid.add(bezel);
  const screenTex = canvasTex(2048, 1320, (x, w, h) => drawEditor(x, w, h, code, accent));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, LH - 0.24), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, LH / 2 + 0.03, 0.002);
  lid.add(screen);
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, LH - 0.24), new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.02, clearcoat: 1, metalness: 0 }));
  glare.position.set(0, LH / 2 + 0.03, 0.003);
  lid.add(glare);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: 0x1b2a3a }));
  cam.position.set(0, LH - 0.06, 0.004);
  lid.add(cam);
  const logo = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 48), new THREE.MeshPhysicalMaterial({ color: 0xc7ccd3, metalness: 1, roughness: 0.12 }));
  logo.position.set(0, LH / 2, -LT - 0.001); logo.rotation.y = Math.PI;
  lid.add(logo);

  const api = {
    group: g,
    setOpen(a) { lid.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.02, -0.32, a); },
    setScreen(tex) { if (screen.material.map !== tex) { screen.material.map = tex; screen.material.needsUpdate = true; } },
    screenTex,
    screen,
  };
  api.setOpen(1);
  return api;
}

function drawEditor(x, w, h, code, accent) {
  x.fillStyle = "#0d1117"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#161b22"; x.fillRect(0, 0, w, 64); x.fillRect(0, 64, 300, h - 64);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(36 + i * 34, 32, 11, 0, 7); x.fill(); });
  x.font = "500 26px 'IBM Plex Mono', monospace"; x.fillStyle = "#8b949e";
  x.fillText("server.js", 360, 41); x.fillText("App.jsx", 560, 41);
  x.fillStyle = accent; x.fillRect(340, 60, 160, 4);
  ["src", "  api", "  components", "  services", "routes.js", "server.js", "package.json"].forEach((f, i) => {
    x.fillStyle = i === 5 ? "#e6edf3" : "#8b949e"; x.fillText(f, 30, 120 + i * 46);
  });
  const colors = { kw: "#ff7b72", fn: "#d2a8ff", str: "#a5d6ff", com: "#8b949e", txt: "#e6edf3" };
  x.font = "500 34px 'IBM Plex Mono', monospace";
  code.forEach((line, i) => {
    const y = 130 + i * 54;
    x.fillStyle = "#484f58"; x.fillText(String(i + 1).padStart(2, " "), 330, y);
    let px = 410;
    line.split(/(\s+)/).forEach((tok) => {
      let c = colors.txt;
      if (/^(const|let|return|import|from|export|function|async|await|def|if|new)$/.test(tok)) c = colors.kw;
      else if (/^["'`].*["'`]?[,;)]*$/.test(tok)) c = colors.str;
      else if (/\($|\(/.test(tok)) c = colors.fn;
      if (line.trim().startsWith("//") || line.trim().startsWith("#")) c = colors.com;
      x.fillStyle = c; x.fillText(tok, px, y); px += x.measureText(tok).width;
    });
  });
  x.fillStyle = "#1f6feb"; x.fillRect(0, h - 40, w, 40);
  x.fillStyle = "#fff"; x.font = "500 22px 'IBM Plex Mono', monospace"; x.fillText("main  ✓  Node.js · React", 24, h - 13);
}

/* ---------- dome camera ---------- */
export function domeCamera() {
  const g = new THREE.Group();
  const white = M.whitePlastic();
  // ceiling base, skirt and trim ring (lathed profiles, y up = away from mount)
  g.add(lathe([[0, 0], [0.98, 0], [1.02, 0.03], [1.02, 0.13], [0.96, 0.19], [0.86, 0.22], [0, 0.22]], white));
  g.add(lathe([[0.86, 0.2], [0.9, 0.26], [0.88, 0.33], [0.8, 0.36], [0.76, 0.34]], white));
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.steel());
    s.position.set(Math.cos(a) * 0.9, 0.225, Math.sin(a) * 0.9);
    g.add(s);
  });
  // camera module on a gimbal, tilted toward the scene
  const mod = new THREE.Group();
  mod.userData.dyn = true; // pans
  mod.position.y = 0.4;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 32), M.blackPlastic());
  ball.castShadow = true;
  mod.add(ball);
  const lens = new THREE.Group();
  lens.add(lathe([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.16], [0.18, 0.2], [0, 0.2]], M.steel(), 48));
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), M.glass());
  glass.position.y = 0.13;
  lens.add(glass);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), irMat());
    led.position.set(Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3);
    lens.add(led);
  }
  lens.position.y = 0.36;
  mod.add(lens);
  mod.rotation.z = 0.75;
  g.add(mod);
  // smoked bubble over everything
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.78, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), M.smoked());
  bubble.position.y = 0.34;
  bubble.renderOrder = 2;
  g.add(bubble);
  return { group: g, aim: mod };
}

/* ---------- bullet camera ---------- */
export function bulletCamera() {
  const g = new THREE.Group();
  const white = M.whitePlastic();
  // wall plate + arm + ball joint
  const plate = rbox(0.9, 0.9, 0.08, 0.04, white); plate.position.z = 0.04; g.add(plate);
  const arm = rbox(0.18, 0.18, 0.7, 0.06, white); arm.position.set(0, 0, 0.42); g.add(arm);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16), white); joint.position.set(0, 0.05, 0.78); joint.castShadow = true; g.add(joint);
  // body: lathed tube along +z
  const body = new THREE.Group();
  const shell = lathe([[0, -0.05], [0.24, -0.05], [0.3, 0.05], [0.3, 1.55], [0.28, 1.62], [0, 1.62]], white);
  body.add(shell);
  const bezel = lathe([[0.2, 1.6], [0.31, 1.6], [0.33, 1.7], [0.27, 1.72], [0.2, 1.72]], M.blackPlastic());
  body.add(bezel);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 48), M.glass());
  face.position.y = 1.71; face.rotation.x = -Math.PI / 2;
  body.add(face);
  const lensRing = lathe([[0.06, 1.66], [0.11, 1.66], [0.11, 1.715], [0.06, 1.715]], M.steel(), 32);
  body.add(lensRing);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), irMat());
    led.position.set(Math.cos(a) * 0.19, 1.712, Math.sin(a) * 0.19);
    body.add(led);
  }
  // sun shield: open half-shell above the body
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 1.85, 48, 1, true, -Math.PI * 0.42, Math.PI * 0.84), white);
  shield.material = white.clone(); shield.material.side = THREE.DoubleSide;
  shield.position.y = 0.92; shield.castShadow = true;
  body.add(shield);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.32, 0.6);
  const aim = new THREE.Group();
  aim.userData.dyn = true; // pans
  aim.position.set(0, 0.05, 0.78);
  body.position.sub(aim.position);
  aim.add(body);
  aim.rotation.x = 0.18;
  g.add(aim);
  return { group: g, aim };
}

/* ---------- 1U PoE switch ---------- */
const portShieldMat = shared(() => new THREE.MeshStandardMaterial({ color: 0x8c939c, metalness: 1, roughness: 0.35 }));
const portHoleMat = shared(() => new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }));
export function switch1U({ label = "24-PORT GIGABIT POE+", ledColor = 0x47b07a } = {}) {
  const g = new THREE.Group();
  const W = 4.4, H = 0.44, D = 2.4;
  const chassis = rbox(W, H, D, 0.02, M.aluDark(), 2);
  g.add(chassis);
  const face = canvasTex(2048, 205, (x, w, h) => {
    const grd = x.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#2e3238"); grd.addColorStop(1, "#24272c");
    x.fillStyle = grd; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; x.fillRect(Math.random() * w, Math.random() * h, 60, 1); }
    x.fillStyle = "#c9ced6"; x.font = "600 22px 'IBM Plex Mono', monospace"; x.fillText(label, 40, 46);
    x.fillStyle = "#7d848d"; x.font = "500 16px 'IBM Plex Mono', monospace";
    for (let p = 0; p < 12; p++) { x.fillText(String(p * 2 + 1), 470 + p * 104, 28); x.fillText(String(p * 2 + 2), 470 + p * 104, 196); }
    x.fillText("SFP+", 1820, 28);
  });
  const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ map: face, metalness: 0.7, roughness: 0.45 }));
  faceMesh.position.z = D / 2 + 0.001;
  g.add(faceMesh);
  // RJ45 ports: metal shield + dark socket, 12 columns × 2 rows
  const portGeo = new THREE.BoxGeometry(0.17, 0.125, 0.06);
  const shieldMat = portShieldMat(), holeMat = portHoleMat();
  const shields = new THREE.InstancedMesh(portGeo, shieldMat, 24);
  const holes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), holeMat, 24);
  const ledGeo = new THREE.BoxGeometry(0.035, 0.022, 0.01);
  const ledMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const leds = new THREE.InstancedMesh(ledGeo, ledMat, 48);
  const m = new THREE.Matrix4(), on = new THREE.Color(ledColor), amber = new THREE.Color(0xf2a03a), off = new THREE.Color(0x101410);
  const portPos = [];
  for (let p = 0; p < 24; p++) {
    const col = Math.floor(p / 2), row = p % 2;
    const px = -W / 2 + 0.98 + col * 0.223, py = row ? -0.085 : 0.085;
    portPos.push([px, py]);
    m.makeTranslation(px, py, D / 2 + 0.005); shields.setMatrixAt(p, m);
    m.makeTranslation(px, py + (row ? 0.01 : -0.01), D / 2 + 0.027); holes.setMatrixAt(p, m);
    m.makeTranslation(px - 0.05, py + (row ? -0.075 : 0.075), D / 2 + 0.006); leds.setMatrixAt(p * 2, m);
    m.makeTranslation(px + 0.05, py + (row ? -0.075 : 0.075), D / 2 + 0.006); leds.setMatrixAt(p * 2 + 1, m);
    leds.setColorAt(p * 2, on); leds.setColorAt(p * 2 + 1, amber);
  }
  g.add(shields, holes, leds);
  // SFP cages
  for (let s = 0; s < 4; s++) {
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), shieldMat);
    cage.position.set(W / 2 - 0.62 + (s % 2) * 0.24, s < 2 ? 0.08 : -0.08, D / 2 + 0.01);
    g.add(cage);
  }
  // rack ears with screw holes
  [-1, 1].forEach((s) => {
    const ear = rbox(0.3, H, 0.04, 0.01, M.aluDark(), 2);
    ear.position.set(s * (W / 2 + 0.15), 0, D / 2 - 0.02);
    g.add(ear);
    [-0.1, 0.1].forEach((y) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), M.steel());
      screw.rotation.x = Math.PI / 2; screw.position.set(s * (W / 2 + 0.15), y, D / 2 + 0.005);
      g.add(screw);
    });
  });
  // blink: activity LEDs flicker, link LEDs stay mostly on
  const seeds = Array.from({ length: 24 }, () => Math.random() * 10);
  function tick(t) {
    for (let p = 0; p < 24; p++) {
      leds.setColorAt(p * 2, Math.sin(t * (3 + (p % 5)) + seeds[p]) > -0.6 ? on : off);
      leds.setColorAt(p * 2 + 1, Math.sin(t * 11 + seeds[p] * 3) > 0.3 ? amber : off);
    }
    leds.instanceColor.needsUpdate = true;
  }
  return { group: g, tick, portPos, front: D / 2, width: W };
}

/* ---------- 2U rack server ---------- */
export function server2U() {
  const g = new THREE.Group();
  const W = 4.4, H = 0.88, D = 3.2;
  const chassis = rbox(W, H, D, 0.03, M.aluDark(), 2);
  g.add(chassis);
  // front bezel with perforated vents on both sides
  const face = canvasTex(2048, 410, (x, w, h) => {
    x.fillStyle = "#1b1e23"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#0b0c0e";
    for (let r = 0; r < 26; r++) for (let c = 0; c < 18; c++) {
      x.beginPath(); x.arc(30 + c * 16 + (r % 2) * 8, 20 + r * 14.5, 4.2, 0, 7); x.fill();
      x.beginPath(); x.arc(w - 318 + c * 16 + (r % 2) * 8, 20 + r * 14.5, 4.2, 0, 7); x.fill();
    }
    x.fillStyle = "#9aa3ad"; x.font = "600 22px 'IBM Plex Mono', monospace"; x.fillText("SRV-01", w - 300, h - 18);
  });
  const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ map: face, metalness: 0.6, roughness: 0.5 }));
  faceMesh.position.z = D / 2 + 0.001;
  g.add(faceMesh);
  // 12 hot-swap drive caddies with orange release latches and status LEDs
  const caddyGeo = new RoundedBoxGeometry(0.42, 0.34, 0.08, 2, 0.02);
  const caddies = new THREE.InstancedMesh(caddyGeo, new THREE.MeshStandardMaterial({ color: 0x2c3036, metalness: 0.7, roughness: 0.4 }), 12);
  const latches = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.24, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8792b, roughness: 0.5 }), 12);
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), new THREE.MeshBasicMaterial({ toneMapped: false }), 24);
  const m = new THREE.Matrix4(), green = new THREE.Color(0x47e07a), blue = new THREE.Color(0x4c9dff), off = new THREE.Color(0x0e1310);
  for (let k = 0; k < 12; k++) {
    const col = k % 6, row = Math.floor(k / 6);
    const x = -1.25 + col * 0.46, y = row ? -0.19 : 0.19;
    m.makeTranslation(x, y, D / 2 + 0.03); caddies.setMatrixAt(k, m);
    m.makeTranslation(x + 0.16, y, D / 2 + 0.075); latches.setMatrixAt(k, m);
    m.makeTranslation(x - 0.16, y + 0.12, D / 2 + 0.075); leds.setMatrixAt(k * 2, m);
    m.makeTranslation(x - 0.16, y + 0.06, D / 2 + 0.075); leds.setMatrixAt(k * 2 + 1, m);
    leds.setColorAt(k * 2, green); leds.setColorAt(k * 2 + 1, blue);
  }
  g.add(caddies, latches, leds);
  // rack handles and power button
  [-1, 1].forEach((s) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 10, 24, Math.PI), M.steel());
    handle.position.set(s * (W / 2 - 0.12), 0, D / 2 + 0.06); handle.rotation.z = s * Math.PI / 2;
    g.add(handle);
  });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24), new THREE.MeshBasicMaterial({ color: 0x4c9dff, toneMapped: false }));
  btn.rotation.x = Math.PI / 2; btn.position.set(W / 2 - 0.42, 0.25, D / 2 + 0.02);
  g.add(btn);
  const seeds = Array.from({ length: 12 }, () => Math.random() * 9);
  function tick(t) {
    for (let k = 0; k < 12; k++) leds.setColorAt(k * 2 + 1, Math.sin(t * (6 + k % 4) + seeds[k]) > 0.2 ? blue : off);
    leds.instanceColor.needsUpdate = true;
  }
  return { group: g, tick };
}

/* ---------- patch cable from a port, curving down ---------- */
export function patchCable(color, from, to) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.3 });
  const boot = rbox(0.15, 0.11, 0.22, 0.03, new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, transmission: 0, transparent: true, opacity: 0.92, clearcoat: 0.8 }), 2);
  boot.position.set(from.x, from.y, from.z + 0.1);
  g.add(boot);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(from.x, from.y, from.z + 0.2),
    new THREE.Vector3(from.x, from.y - 0.05, from.z + 0.55),
    new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2 + 0.2, (from.z + to.z) / 2 + 0.4),
    to,
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.035, 10, false), mat);
  cable.castShadow = true;
  g.add(cable);
  return { group: g, curve };
}
