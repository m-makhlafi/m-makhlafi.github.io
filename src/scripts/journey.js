// 3D career journey: one floor per chapter, stacked into a tower.
// Scrolling moves the camera up the tower; a glowing packet climbs the cable with you.
// Clicking a model (or a tech chip in the side card) shows what Mohammed did with it.
// Hero hardware is realistic: procedural models (models.js) and a Blender-built cabinet (rack.glb).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { laptop, domeCamera, bulletCamera, switch1U, patchCable } from "./models.js";

const data = JSON.parse(document.getElementById("journey-data").textContent);
const floors = data.floors;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("jrCanvas");
const tip = document.getElementById("jrTip");
const root = document.getElementById("jr");
const callouts = document.getElementById("jrCallouts");
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COL = {
  bg: 0x0b1015, slab: 0x161d25, slab2: 0x1d2631, line: 0x2a3542, ink: 0xe6ecf2, muted: 0x93a1b0,
  accent: 0xf29a4a, blue: 0x4c8dd6, green: 0x47b07a, brown: 0xb08560, danger: 0xe5574f, dark: 0x0f141a,
};
const CSS = { accent: "#F29A4A", blue: "#4C8DD6", green: "#47B07A", brown: "#B08560", ink: "#E6ECF2", muted: "#93A1B0" };
const H = 14; // vertical distance between floors

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch (e) {
  root.classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);
scene.fog = new THREE.Fog(COL.bg, 22, 52);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x1a1208, 0.35));
// key light follows the current floor so its shadows stay sharp
const sun = new THREE.DirectionalLight(0xfff4e8, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x9cc4ff, 0.9);
scene.add(rim, rim.target);
// Ambient occlusion (soft contact shadows in ports, drive bays, between parts) is the most expensive effect.
// It lives in its own chunk, is downloaded only on strong GPUs, and is drawn only for the final still frame.
let composer = null, ao = null, aoLoading = null;
function ensureAO() {
  if (composer || aoLoading) return;
  aoLoading = Promise.all([
    import("three/examples/jsm/postprocessing/EffectComposer.js"),
    import("three/examples/jsm/postprocessing/OutputPass.js"),
    import("n8ao"),
  ]).then(([{ EffectComposer }, { OutputPass }, { N8AOPass }]) => {
    composer = new EffectComposer(renderer);
    ao = new N8AOPass(scene, camera, 1, 1);
    Object.assign(ao.configuration, { aoRadius: 0.55, distanceFalloff: 1.2, intensity: 3.2, screenSpaceRadius: false, halfRes: true, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new OutputPass());
    resize();
    settled = false; kick(); // redraw the still frame with AO
  }).catch(() => { Q.ao = false; });
}
const laptops = [];
const mixers = [];

/* ---------- adaptive quality ----------
   tier 2: full (ambient occlusion when still, 2048 shadows, sharp pixels)
   tier 1: medium (no AO, 1024 shadows refreshed less often)
   tier 0: light (no AO, no shadows, 1× pixels, slower idle animation)
   Starts from what the device reports, then steps down by itself if frames run slow. */
const LIGHT_KEY = "jr-light";
function detectTier() {
  const forced = location.search.match(/[?&]tier=([0-2])/); // testing hook
  if (forced) return +forced[1];
  try { if (localStorage.getItem(LIGHT_KEY) === "1") return 0; } catch (e) {}
  if (reduce) return 0;
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (/SwiftShader|llvmpipe|Software|Mali-4|Mali-T|Adreno \(TM\) [3-5]|PowerVR/i.test(gpu) || mem <= 2 || cores <= 2) return 0;
  if (coarse || mem <= 4 || /Intel/i.test(gpu)) return 1;
  return 2;
}
const Q = { tier: 2, ao: true, shadows: true, idleMs: 33 };
function applyTier(t) {
  Q.tier = t;
  const dpr = window.devicePixelRatio || 1;
  Q.ao = t === 2;
  Q.shadows = t >= 1;
  Q.idleMs = t === 0 ? 50 : 33;
  if (Q.ao) ensureAO();
  renderer.setPixelRatio([1, 1, Math.min(dpr, 1.5)][t]);
  renderer.shadowMap.enabled = Q.shadows;
  sun.castShadow = Q.shadows;
  const size = t === 2 ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  // clear-coat doubles the specular work per pixel: only the top tier keeps it
  scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => {
    if (m.isMeshPhysicalMaterial) {
      if (m.userData.cc === undefined) m.userData.cc = m.clearcoat;
      m.clearcoat = t === 2 ? m.userData.cc : 0;
    }
    m.needsUpdate = true;
  }); });
  renderer.shadowMap.needsUpdate = true;
  if (lightBtn) lightBtn.setAttribute("aria-pressed", t === 0 ? "true" : "false");
}
renderer.shadowMap.autoUpdate = false;
const lightBtn = document.getElementById("jrLight");
if (lightBtn) lightBtn.addEventListener("click", () => {
  const on = Q.tier !== 0;
  try { localStorage.setItem(LIGHT_KEY, on ? "1" : "0"); } catch (e) {}
  applyTier(on ? 0 : detectTier());
  resize();
}); // scroll-scrubbed animations: { floor, update(f), anchors }

/* ---------- helpers ---------- */
const mats = new Map();
function mat(color, { emissive = 0, ei = 0, metal = 0.2, rough = 0.7, opacity = 1 } = {}) {
  const k = [color, emissive, ei, metal, rough, opacity].join();
  if (!mats.has(k)) {
    mats.set(k, new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: ei, metalness: metal, roughness: rough,
      transparent: opacity < 1, opacity,
    }));
  }
  return mats.get(k);
}
function box(w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, opts, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}
function tube(points, radius, color, opts) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), mat(color, opts));
  m.userData.curve = curve;
  return m;
}
const isLatin = (s) => /^[\x00-\x7F·✓\s]+$/.test(s);
function label(text, { size = 44, color = CSS.ink, bg = "rgba(15,20,26,0.88)", border = null, weight = 600, scale = 0.0105 } = {}) {
  const c = document.createElement("canvas"), x = c.getContext("2d");
  const fam = isLatin(text) ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans Arabic', sans-serif";
  const font = `${weight} ${size}px ${fam}`;
  x.font = font;
  const pad = 22, w = Math.ceil(x.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.7);
  c.width = w; c.height = h;
  x.font = font;
  x.fillStyle = bg;
  x.beginPath(); x.roundRect(2, 2, w - 4, h - 4, 14); x.fill();
  if (border) { x.strokeStyle = border; x.lineWidth = 4; x.stroke(); }
  x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle";
  x.direction = isLatin(text) ? "ltr" : "rtl";
  x.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Labels draw on top so walls never clip them; only the current floor's labels are shown (see frame()).
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.renderOrder = 10;
  s.scale.set(w * scale, h * scale, 1);
  return s;
}
function codeTexture(lines, accent) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 320;
  const x = c.getContext("2d");
  x.fillStyle = "#0B1015"; x.fillRect(0, 0, 512, 320);
  x.fillStyle = "#1D2631"; x.fillRect(0, 0, 512, 34);
  ["#F29A4A", "#B08560", "#47B07A"].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(22 + i * 22, 17, 7, 0, 7); x.fill(); });
  x.font = "500 22px 'IBM Plex Mono', monospace"; x.textBaseline = "middle";
  lines.forEach((l, i) => {
    x.fillStyle = i === 0 ? accent : l.trim().startsWith("//") ? "#93A1B0" : "#E6ECF2";
    x.fillText(l, 22, 64 + i * 34);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clickables = [];
const animated = []; // { f: floor, fn(t) } — only floors near the camera are animated
let buildingFloor = -1;
const anim = (fn) => animated.push({ f: buildingFloor, fn });
function clickable(obj, floor, tech) {
  obj.userData.pick = { floor, tech };
  obj.traverse((o) => { if (o.isMesh) { o.userData.pickRoot = obj; clickables.push(o); } });
  return obj;
}
// Anything moved by an animation is marked dynamic; everything else on a floor is merged (see bakeFloor).
const dyn = (...objs) => { objs.forEach((o) => { o.userData.dyn = true; }); return objs[0]; };
// a row of status LEDs is one instanced draw call that blinks through per-instance colours
const ledGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
const ledMat = new THREE.MeshBasicMaterial({ toneMapped: false });
function leds(group, x0, y, z, n, color, gap = 0.18) {
  const im = new THREE.InstancedMesh(ledGeo, ledMat, n);
  const on = new THREE.Color(color).multiplyScalar(1.4), off = new THREE.Color(color).multiplyScalar(0.28);
  const m = new THREE.Matrix4(), phase = [], speed = [];
  for (let k = 0; k < n; k++) {
    m.makeTranslation(x0 + k * gap, y, z); im.setMatrixAt(k, m); im.setColorAt(k, on);
    phase.push(Math.random() * 6); speed.push(1 + Math.random() * 3);
  }
  anim((t) => {
    for (let k = 0; k < n; k++) im.setColorAt(k, Math.sin(t * speed[k] + phase[k]) > 0 ? on : off);
    im.instanceColor.needsUpdate = true;
  });
  group.add(im);
}

/* ---------- the tower ---------- */
const tower = new THREE.Group();
scene.add(tower);
const floorGroups = [];

function platform(i, f) {
  const g = new THREE.Group();
  g.position.y = i * H;
  const c = COL[f.color];
  const slab = box(18, 0.5, 13, COL.slab, 0, -0.25, 0, { rough: 0.9 });
  slab.userData.skipFit = true;
  g.add(slab);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(18, 0.5, 13)),
    new THREE.LineBasicMaterial({ color: c }),
  );
  edge.position.y = -0.25;
  edge.userData.skipFit = true;
  g.add(edge);
  const big = /^[0-9]/.test(f.when);
  const badge = label(f.when, { size: big ? 64 : 44, color: CSS[f.color], border: CSS[f.color], weight: 700, scale: 0.012 });
  badge.position.set(6.6, 0.9, 6.9);
  badge.userData.skipFit = true;
  g.add(badge);
  const num = label(`الطابق ${i + 1}`, { size: 34, color: CSS.muted, scale: 0.01 });
  num.position.set(-6.8, 0.6, 6.9);
  num.userData.skipFit = true;
  g.add(num);
  tower.add(g);
  floorGroups.push(g);
  return g;
}

// where the camera looks on each floor and how close it gets (hero framing)
const FOCUS = {
  university: [0, 2.6, 0, 16], bootcamp: [0, 2.4, -1.2, 14], field: [2.6, 3.3, -3.6, 9.5],
  network: [0, 2.3, -2.2, 10.5], servers: [0, 2.75, -2.4, 10.4], freelance: [0, 2.35, -2.5, 7.2],
  design: [0, 2.4, 0, 17], sama: [0, 2.4, -0.5, 15],
};

// Auto framing: each floor's content is measured, and the camera backs off just enough
// to show all of it in the space left free by the side menu and the story card.
const fits = []; // per floor: { c: Vector3 (floor-local centre), r: radius }
const _box = new THREE.Box3(), _tmpBox = new THREE.Box3(), _v = new THREE.Vector3();
function computeFit(i) {
  const g = floorGroups[i];
  if (!g) return;
  g.updateMatrixWorld(true);
  _box.makeEmpty();
  g.children.forEach((ch) => {
    if (ch.userData.skipFit) return;
    _tmpBox.setFromObject(ch, true);
    if (!_tmpBox.isEmpty()) _box.union(_tmpBox);
  });
  if (_box.isEmpty()) return;
  const c = _box.getCenter(new THREE.Vector3());
  c.y -= g.position.y;
  const r = _box.getSize(_v).length() / 2;
  fits[i] = { c, r: Math.max(3, r) };
}
// the free screen area between the side menu and the story card, measured from the page itself
const free = { left: 0, right: 0, top: 70 };
function measureFree() {
  const w = window.innerWidth;
  const nav = document.querySelector(".jr-nav ol");
  const card = document.querySelector(".jr-card");
  const navR = nav && nav.offsetParent !== null ? nav.getBoundingClientRect().right : 0;
  const cardL = card ? card.getBoundingClientRect().left : w;
  free.left = navR + 16;
  free.right = Math.max(free.left + 200, cardL - 16);
}
function fitDistance(r) {
  const w = window.innerWidth, h = window.innerHeight;
  const v = THREE.MathUtils.degToRad(camera.fov);
  let fx, fy;
  if (mobile) { fx = 0.92; fy = 0.5; }
  else { fx = (free.right - free.left) / w; fy = (h - free.top - 20) / h; }
  const vEff = 2 * Math.atan(Math.tan(v / 2) * fy);
  const hEff = 2 * Math.atan(Math.tan(v / 2) * camera.aspect * fx);
  return (r / Math.sin(Math.min(vEff, hEff) / 2)) * 0.95;
}

const builders = {
  university(g, i) {
    const b = new THREE.Group();
    b.add(box(7, 0.4, 4, COL.slab2, 0, 0.2, 0));
    for (let k = 0; k < 5; k++) b.add(cyl(0.22, 0.22, 3, COL.ink, -2.8 + k * 1.4, 1.9, 1.4, { rough: 0.5 }));
    b.add(box(7.2, 0.4, 4.2, COL.slab2, 0, 3.6, 0));
    const roof = cyl(0, 4.4, 1.6, COL.green, 0, 4.6, 0, { emissive: COL.green, ei: 0.15 }, 4);
    roof.rotation.y = Math.PI / 4; roof.scale.z = 0.62;
    b.add(roof);
    b.add(box(6, 3, 3, COL.slab2, 0, 1.9, -0.4));
    clickable(b, i, 0);
    g.add(b);
    [COL.blue, COL.accent, COL.green, COL.brown].forEach((c, k) => g.add(box(1.6, 0.28, 1.1, c, 5.4, 0.15 + k * 0.3, 2.6 + (k % 2) * 0.1)));
    const key = label("الجامعة تمنحك المفتاح", { size: 40, color: CSS.green, scale: 0.011 });
    key.position.set(0, 6.4, 0);
    g.add(key);
  },

  bootcamp(g, i, f) {
    const colors = [CSS.blue, CSS.accent, CSS.brown, CSS.green, CSS.ink];
    f.techs.forEach((t, k) => {
      const a = -0.9 + k * 0.45, r = 6;
      const panel = new THREE.Group();
      const c = document.createElement("canvas"); c.width = 360; c.height = 240;
      const x = c.getContext("2d");
      x.fillStyle = "#161D25"; x.fillRect(0, 0, 360, 240);
      x.strokeStyle = colors[k]; x.lineWidth = 10; x.strokeRect(8, 8, 344, 224);
      x.fillStyle = colors[k]; x.font = "700 46px 'IBM Plex Mono', monospace"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(t.name, 180, 104);
      x.fillStyle = "#93A1B0"; x.font = "500 22px 'IBM Plex Mono', monospace"; x.fillText("certification track", 180, 170);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
      panel.add(m);
      panel.position.set(Math.sin(a) * r, 2.6, Math.cos(a) * r - 3.5);
      panel.lookAt(0, 2.6, 6);
      dyn(panel);
      const base = panel.position.y, ph = k;
      if (!reduce) anim((tt) => { panel.position.y = base + Math.sin(tt * 1.1 + ph) * 0.18; });
      clickable(panel, i, k);
      g.add(panel);
    });
    g.add(box(2.4, 0.12, 1.6, COL.line, 0, 0.1, 2.6));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4), new THREE.MeshBasicMaterial({ map: codeTexture(["bootcamp --tracks 5", "ccna  network+  security+", "mcsa  mcse  itil"], CSS.brown) }));
    scr.position.set(0, 0.85, 1.85); scr.rotation.x = -0.25;
    g.add(scr);
  },

  field(g, i) {
    g.add(box(14, 5, 0.4, COL.slab2, 0, 2.5, -4.5));
    const data = tube([[-7, 4.9, -4.22], [-2, 4.9, -4.22], [3, 4.9, -4.22], [7, 4.9, -4.22]], 0.05, COL.blue, { emissive: COL.blue, ei: 0.25 });
    const power = tube([[-7, 1.1, -4.22], [0, 1.1, -4.22], [7, 1.1, -4.22]], 0.05, COL.danger, { emissive: COL.danger, ei: 0.2 });
    clickable(data, i, 2); g.add(data); g.add(power);
    const dl = label("Cat6 · Coaxial", { size: 30, color: CSS.blue, scale: 0.009 }); dl.position.set(-4.6, 5.3, -4); g.add(dl);
    const pl = label("كهرباء: مسار معزول", { size: 30, color: "#E5574F", scale: 0.009 }); pl.position.set(-4.6, 1.5, -4); g.add(pl);
    const sig = dyn(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat(COL.ink, { emissive: COL.blue, ei: 2 })));
    g.add(sig);
    anim((t) => { sig.position.copy(data.userData.curve.getPoint(reduce ? 0.5 : (t * 0.18) % 1)); });
    const cams = new THREE.Group();
    const dome = domeCamera();
    dome.group.scale.setScalar(0.85);
    dome.group.rotation.x = Math.PI / 2;
    dome.group.position.set(1.4, 3.6, -4.3);
    cams.add(dome.group);
    const bullet = bulletCamera();
    bullet.group.scale.setScalar(0.85);
    bullet.group.position.set(4.6, 3.4, -4.3);
    cams.add(bullet.group);
    if (!reduce) anim((t) => { bullet.aim.rotation.y = Math.sin(t * 0.45) * 0.45; dome.aim.rotation.y = t * 0.2; });
    clickable(cams, i, 0); g.add(cams);
    const nvr = new THREE.Group();
    nvr.add(box(2.6, 0.5, 1.8, 0x1a1f26, 0, 0, 0, { metal: 0.5 }));
    leds(nvr, -1, 0.05, 0.92, 6, COL.green, 0.2);
    nvr.position.set(-2.4, 1.3, 0.4);
    g.add(box(4, 1, 2.4, COL.slab2, -2.4, 0.5, 0.4));
    clickable(nvr, i, 1); g.add(nvr);
    const nl = label("NVR / DVR", { size: 30, color: CSS.green, scale: 0.009 }); nl.position.set(-2.4, 2.1, 0.4); g.add(nl);
    const ups = new THREE.Group();
    ups.add(box(1.2, 2, 1.6, 0x14181d, 0, 1, 0, { metal: 0.4 }));
    ups.add(box(0.7, 0.35, 0.02, 0x0b0f12, 0, 1.5, 0.81, { emissive: COL.accent, ei: 0.6 }));
    ups.position.set(-6.2, 0, 1.6);
    clickable(ups, i, 3); g.add(ups);
    const ul = label("UPS", { size: 30, color: CSS.accent, scale: 0.009 }); ul.position.set(-6.2, 2.5, 1.6); g.add(ul);
    const zk = new THREE.Group();
    zk.add(box(0.3, 2.4, 0.3, COL.line, 0, 1.2, 0));
    zk.add(box(0.9, 1.3, 0.25, 0x111418, 0, 2.6, 0.1));
    zk.add(box(0.6, 0.45, 0.02, 0x0b1015, 0, 2.85, 0.24, { emissive: COL.blue, ei: 0.8 }));
    zk.add(box(0.28, 0.28, 0.04, 0x0b1015, 0, 2.25, 0.24, { emissive: COL.green, ei: 0.9 }));
    zk.position.set(5.6, 0, 2);
    clickable(zk, i, 4); g.add(zk);
    const zl = label("ZKTeco", { size: 30, color: CSS.blue, scale: 0.009 }); zl.position.set(5.6, 3.7, 2); g.add(zl);
  },

  network(g, i) {
    const rack = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: 0x1c1f24, metalness: 0.8, roughness: 0.45 });
    [[-1.42, -0.75], [1.42, -0.75], [-1.42, 0.75], [1.42, 0.75]].forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), post); m.position.set(x, 2.1, z); rack.add(m);
    });
    [0.05, 4.2].forEach((y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1.6), post); m.position.y = y; rack.add(m); });
    const switches = [1.4, 1.95, 2.5].map((y) => {
      const sw = switch1U();
      sw.group.scale.setScalar(0.55);
      sw.group.position.set(0, y, 0);
      rack.add(sw.group);
      anim(sw.tick);
      return { sw, y };
    });
    rack.position.set(0, 0, -3);
    clickable(rack, i, 3);
    g.add(rack);
    const rl = label("Cisco · UniFi · MikroTik", { size: 30, color: CSS.ink, scale: 0.009 }); rl.position.set(0, 4.9, -3); g.add(rl);
    const zones = [
      { n: "الإدارة", v: "VLAN 10", c: COL.accent, x: -6 },
      { n: "المالية", v: "VLAN 20", c: COL.brown, x: -2 },
      { n: "الموظفون", v: "VLAN 30", c: COL.blue, x: 2 },
      { n: "الزوار", v: "VLAN 40", c: COL.green, x: 6 },
    ];
    const vl = new THREE.Group();
    const mid = switches[1];
    zones.forEach((z, k) => {
      const pod = new THREE.Group();
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2), mat(COL.slab2));
      desk.position.y = 0.15; pod.add(desk);
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.12), mat(0xe9e9e6, { rough: 0.4 }));
      port.position.set(0, 0.5, -0.9); pod.add(port);
      pod.position.set(z.x, 0, 3.4);
      g.add(pod);
      const [px, py] = mid.sw.portPos[k * 2];
      const from = new THREE.Vector3(px * 0.55, mid.y + py * 0.55, -3 + mid.sw.front * 0.55);
      const to = new THREE.Vector3(z.x, 0.5, 2.45);
      const pc = patchCable(z.c, from, to);
      vl.add(pc.group);
      const pkt = dyn(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      vl.add(pkt);
      const off = k * 0.25;
      anim((t) => { pkt.position.copy(pc.curve.getPoint(reduce ? 0.6 : (t * 0.22 + off) % 1)); });
      const lb = label(`${z.n} · ${z.v}`, { size: 28, color: "#" + z.c.toString(16).padStart(6, "0"), scale: 0.009 });
      lb.position.set(z.x, 1.6, 3.4);
      g.add(lb);
    });
    clickable(vl, i, 2);
    g.add(vl);
    [["IP Conflict ✓", 0, -6.3], ["Bottleneck ✓", 1, 6.3]].forEach(([t, k, x]) => {
      const s = label(t, { size: 30, color: CSS.green, border: CSS.green, scale: 0.01 });
      s.position.set(x, 3.6, -3);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(s.position);
      clickable(hit, i, k);
      g.add(s); g.add(hit);
    });
  },

  servers(g, i) {
    // Blender-built cabinet: perforated door opens and a server slides out as you arrive
    const holder = new THREE.Group();
    holder.position.set(0, 0, -2.6);
    holder.scale.setScalar(3.2);
    g.add(holder);
    // rack.glb is merged and meshopt-compressed at build time (4.8 MB → 0.7 MB, 222 parts → 29 meshes)
    lazy.push({ floor: i, run: () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(`${BASE}/models/rack.glb`, async (gltf) => {
      const model = gltf.scene;
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        if (o.material && o.material.name === "door_mesh") {
          o.material.alphaTest = 0.5; o.material.transparent = false; o.material.side = THREE.DoubleSide;
        }
      });
      // hotspot empties are stored as metadata by the optimiser; rebuild them as anchors
      const meta = (gltf.scene.userData && gltf.scene.userData.anchors) || {};
      Object.entries(meta).forEach(([name, a]) => {
        const o = new THREE.Object3D();
        o.name = "hs_" + name;
        o.position.fromArray(a.pos);
        (a.parent ? model.getObjectByName(a.parent) || model : model).add(o);
      });
      // compile its shaders in parallel before it is shown, so arriving on the floor does not stutter
      try { await renderer.compileAsync(model, camera, scene); } catch (e) {}
      holder.add(model);
      prepTextures(model);
      renderer.shadowMap.needsUpdate = true;
      clickable(model, i, 0);
      computeFit(i);
      settled = false; kick();
      const mixer = new THREE.AnimationMixer(model);
      const clip = (n) => gltf.animations.find((a) => a.name === n);
      const door = clip("door_open"), slide = clip("server_slide");
      const actions = [door, slide].filter(Boolean).map((c) => { const a = mixer.clipAction(c); a.play(); a.paused = true; return { a, c }; });
      const anchors = {};
      model.traverse((o) => { if (o.name.startsWith("hs_")) anchors[o.name.slice(3)] = o; });
      mixers.push({
        floor: i,
        update(f) {
          // f = distance into the floor: door opens on the way in, then the server slides out
          const doorT = Math.max(0, Math.min(1, (f + 0.75) / 0.35));
          const slideT = Math.max(0, Math.min(1, (f + 0.38) / 0.33));
          actions.forEach(({ a, c }) => { a.time = (c === door ? doorT : slideT) * c.duration; });
          mixer.update(0);
        },
        anchors,
      });
    }) });
  },

  freelance(g, i) {
    g.add(box(8, 0.2, 2.6, COL.slab2, 0, 1.4, -2.4));
    [0, 1.4].forEach((h) => g.add(box(0.2, h || 1.4, 0.2, COL.line, h ? 3.6 : -3.6, 0.7, -2.4)));
    const lap = laptop({
      code: [
        "// routes/orders.js",
        "import express from 'express';",
        "const router = express.Router();",
        "",
        "router.get('/orders', async (req, res) => {",
        "  const orders = await db.orders.find();",
        "  res.json(orders);",
        "});",
        "",
        "export default router;",
      ],
    });
    lap.group.scale.setScalar(1.15);
    lap.group.position.set(0, 1.5, -2.5);
    clickable(lap.group, i, 0);
    g.add(lap.group);
    laptops.push({ api: lap, floor: i });
    [["MySQL", COL.blue, -3.5], ["MongoDB", COL.green, -1.5]].forEach(([n, c, x]) => {
      const db = new THREE.Group();
      for (let k = 0; k < 3; k++) db.add(cyl(0.7, 0.7, 0.42, c, 0, 0.25 + k * 0.48, 0, { emissive: c, ei: 0.15 }));
      db.position.set(x, 0, 3);
      clickable(db, i, 3); g.add(db);
      const l = label(n, { size: 28, color: "#" + c.toString(16).padStart(6, "0"), scale: 0.009 }); l.position.set(x, 2, 3); g.add(l);
    });
    const git = new THREE.Group();
    const pts = [[0, 0], [1, 0], [2, 0], [3, 0], [1.5, 0.9], [2.5, 0.9]];
    pts.forEach(([x, y], k) => git.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mat(k > 3 ? COL.accent : COL.ink, { emissive: k > 3 ? COL.accent : COL.muted, ei: 0.4 })).translateX(x).translateY(y)));
    git.add(tube([[1, 0, 0], [1.5, 0.9, 0], [2.5, 0.9, 0], [3, 0, 0]], 0.05, COL.accent));
    git.add(tube([[0, 0, 0], [3, 0, 0]], 0.05, COL.ink));
    git.position.set(2, 1, 3);
    clickable(git, i, 4); g.add(git);
    const gl = label("Git / GitHub", { size: 28, color: CSS.accent, scale: 0.009 }); gl.position.set(3.5, 2.6, 3); g.add(gl);
  },

  design(g, i) {
    const nodes = {
      lb: [0, 4.6, -3], s1: [-3.5, 3, -2], s2: [0, 3, -2], s3: [3.5, 3, -2],
      q: [0, 1.6, 0.6], db: [-4, 0.9, 2.6], cap: [4.6, 2.8, -3.6],
    };
    const lb = new THREE.Group();
    lb.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7), mat(COL.accent, { emissive: COL.accent, ei: 0.5 })));
    lb.position.set(...nodes.lb);
    clickable(lb, i, 1); g.add(lb);
    const ll = label("Nginx · Load Balancer", { size: 28, color: CSS.accent, scale: 0.009 }); ll.position.set(0, 5.7, -3); g.add(ll);
    const svc = new THREE.Group();
    ["s1", "s2", "s3"].forEach((k, n) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), mat([COL.blue, COL.green, COL.brown][n], { emissive: [COL.blue, COL.green, COL.brown][n], ei: 0.3 }));
      s.position.set(...nodes[k]); svc.add(s);
      const line = tube([nodes.lb, nodes[k]], 0.04, COL.line); g.add(line);
      const p = dyn(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(COL.ink, { emissive: COL.accent, ei: 2 })));
      g.add(p);
      anim((t) => { p.position.copy(line.userData.curve.getPoint(reduce ? 0.5 : (t * 0.5 + n / 3) % 1)); });
    });
    clickable(svc, i, 2); g.add(svc);
    const sl = label("Payment · Booking", { size: 26, color: CSS.ink, scale: 0.009 }); sl.position.set(-3.5, 3.9, -2); g.add(sl);
    const q = new THREE.Group();
    q.add(box(6.4, 0.08, 0.9, COL.line, 0, -0.35, 0));
    const msgs = [];
    for (let k = 0; k < 7; k++) { const m = dyn(box(0.6, 0.45, 0.6, COL.brown, 0, 0, 0, { emissive: COL.brown, ei: 0.3 })); q.add(m); msgs.push(m); }
    anim((t) => msgs.forEach((m, k) => { m.position.x = -3 + ((reduce ? k / 7 : (t * 0.12 + k / 7) % 1) * 6); }));
    q.position.set(...nodes.q);
    clickable(q, i, 3); g.add(q);
    const ql = label("RabbitMQ · Kafka", { size: 28, color: CSS.brown, scale: 0.009 }); ql.position.set(1.2, 2.4, 0.6); g.add(ql);
    const dbg = new THREE.Group();
    for (let k = 0; k < 2; k++) for (let s = 0; s < 3; s++) dbg.add(cyl(0.55, 0.55, 0.35, COL.blue, k * 1.4, 0.2 + s * 0.4, 0, { emissive: COL.blue, ei: 0.15 }));
    dbg.add(cyl(0.45, 0.45, 0.8, COL.danger, 2.8, 0.4, 0.2, { emissive: COL.danger, ei: 0.3 }));
    dbg.position.set(...nodes.db);
    clickable(dbg, i, 4); g.add(dbg);
    const dl = label("Sharding · Replication · Redis", { size: 26, color: CSS.blue, scale: 0.009 }); dl.position.set(-3.4, 2.6, 3.8); g.add(dl);
    const cap = dyn(new THREE.Group());
    const tri = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(-1.1, -0.7, 0), new THREE.Vector3(1.1, -0.7, 0)]), new THREE.LineBasicMaterial({ color: COL.accent }));
    cap.add(tri);
    [["C", 0, 1.2], ["A", -1.1, -0.7], ["P", 1.1, -0.7]].forEach(([t, x, y]) => { const s = label(t, { size: 36, color: CSS.accent, scale: 0.009 }); s.position.set(x, y, 0); cap.add(s); });
    cap.add(new THREE.Mesh(new THREE.CircleGeometry(1.3, 3), new THREE.MeshBasicMaterial({ visible: false })));
    cap.position.set(...nodes.cap);
    if (!reduce) anim((t) => { cap.rotation.y = Math.sin(t * 0.4) * 0.6; });
    clickable(cap, i, 6); g.add(cap);
    const solid = new THREE.Group();
    "SOLID".split("").forEach((ch, k) => {
      solid.add(box(0.7, 0.7, 0.7, COL.slab2, k * 0.8, 0.35, 0));
      const s = label(ch, { size: 40, color: CSS.green, bg: "rgba(0,0,0,0)", scale: 0.009 }); s.position.set(k * 0.8, 0.4, 0.4); solid.add(s);
    });
    solid.position.set(1.4, 0, 3.0);
    clickable(solid, i, 0); g.add(solid);
    const ci = new THREE.Group();
    ["build", "test", "deploy"].forEach((n, k) => {
      ci.add(box(1.1, 0.5, 0.6, COL.slab2, k * 1.5, 0.25, 0));
      const s = label(n, { size: 24, color: CSS.green, scale: 0.008 }); s.position.set(k * 1.5, 0.85, 0); ci.add(s);
    });
    ci.position.set(-5.4, 0, -3.4); ci.rotation.y = 0.3;
    clickable(ci, i, 5); g.add(ci);
  },

  sama(g, i) {
    const road = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.35, 8, 64), mat(COL.slab2));
    road.rotation.x = Math.PI / 2; road.position.y = 0.05;
    g.add(road);
    const fleet = new THREE.Group();
    const cars = [];
    for (let k = 0; k < 6; k++) {
      const car = dyn(new THREE.Group());
      car.add(box(0.7, 0.25, 0.38, COL.accent, 0, 0.18, 0, { emissive: COL.accent, ei: 0.3 }));
      car.add(box(0.38, 0.18, 0.34, COL.ink, -0.05, 0.38, 0));
      fleet.add(car); cars.push(car);
    }
    anim((t) => cars.forEach((c, k) => {
      const a = (reduce ? 0 : t * 0.25) + (k / cars.length) * Math.PI * 2;
      c.position.set(Math.cos(a) * 5.2, 0.05, Math.sin(a) * 5.2); c.rotation.y = -a;
    }));
    clickable(fleet, i, 0); g.add(fleet);
    const core = new THREE.Group();
    core.add(box(1.8, 3.4, 1.4, 0x14181d, -1.2, 1.7, 0, { metal: 0.5 }));
    for (let r = 0; r < 5; r++) leds(core, -1.8, 0.7 + r * 0.6, 0.72, 5, COL.green, 0.24);
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshBasicMaterial({ map: codeTexture(["// fleet-api", "POST /trips", "GET /drivers/:id", "200 OK"], CSS.accent), side: THREE.DoubleSide }));
    mon.position.set(1.4, 2.4, 0);
    core.add(mon);
    core.add(tube([[-0.3, 2.4, 0], [0.3, 2.4, 0]], 0.08, COL.accent, { emissive: COL.accent, ei: 1 }));
    clickable(core, i, 2); g.add(core);
    const cloud = new THREE.Group();
    [[0, 0, 0, 0.9], [0.9, 0.2, 0, 0.7], [-0.9, 0.1, 0, 0.7], [0.3, 0.6, 0, 0.6]].forEach(([x, y, z, r]) => cloud.add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(COL.ink, { emissive: COL.blue, ei: 0.2 })).translateX(x).translateY(y).translateZ(z)));
    cloud.position.set(5.5, 5, -3.5);
    g.add(cloud);
    const cl = label("Cloud", { size: 28, color: CSS.blue, scale: 0.009 }); cl.position.set(5.5, 6.4, -3.5); g.add(cl);
    const fw = new THREE.Group();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) fw.add(box(0.48, 0.28, 0.3, (r + c) % 2 ? COL.danger : 0x8a2f2b, c * 0.5 - 0.75, r * 0.3, 0, { emissive: COL.danger, ei: 0.15 }));
    fw.position.set(2.6, 3, -3.5);
    clickable(fw, i, 3); g.add(fw);
    const fl = label("Firewall", { size: 26, color: "#E5574F", scale: 0.009 }); fl.position.set(2.6, 4.6, -3.5); g.add(fl);
    const api = tube([[-1.2, 3.6, 0], [0.6, 4.4, -2], [2.6, 3.4, -3.5], [5.5, 5, -3.5]], 0.06, COL.blue, { emissive: COL.blue, ei: 0.6 });
    g.add(api);
    const ap = dyn(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), mat(COL.ink, { emissive: COL.blue, ei: 2 })));
    g.add(ap);
    anim((t) => ap.position.copy(api.userData.curve.getPoint(reduce ? 0.7 : (t * 0.3) % 1)));
    const apiHit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    apiHit.position.set(0.6, 4.4, -2);
    clickable(apiHit, i, 1); g.add(apiHit);
    const al = label("APIs", { size: 28, color: CSS.blue, scale: 0.009 }); al.position.set(0.6, 5, -2); g.add(al);
  },
};

// Heavy models load only when the camera gets close to their floor.
const lazy = [];
// Static batching: every mesh that never moves on its own is merged with the others that share its material,
// into the nearest moving parent (or the floor). Dozens of parts become a handful of draw calls.
// The original meshes are kept off-scene only for precise click picking (CPU, never drawn).
const _m4 = new THREE.Matrix4();
function bakeFloor(floorGroup) {
  floorGroup.updateMatrixWorld(true);
  const buckets = new Map(), remove = [];
  floorGroup.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dyn) return;
    const m = o.material;
    if (Array.isArray(m) || m.transparent || !m.visible) return;
    let owner = o.parent;
    while (owner !== floorGroup && !owner.userData.dyn) owner = owner.parent;
    const geo = o.geometry.clone();
    Object.keys(geo.attributes).forEach((k) => { if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k); });
    geo.morphAttributes = {};
    geo.applyMatrix4(_m4.copy(owner.matrixWorld).invert().multiply(o.matrixWorld));
    const key = owner.uuid + "|" + m.uuid + "|" + Object.keys(geo.attributes).sort().join() + "|" + (geo.index ? 1 : 0);
    if (!buckets.has(key)) buckets.set(key, { owner, m, geos: [] });
    buckets.get(key).geos.push(geo);
    remove.push(o);
  });
  if (remove.length < 2) return;
  remove.forEach((o) => o.removeFromParent()); // matrixWorld stays valid for picking
  buckets.forEach(({ owner, m, geos }) => {
    const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; // never moves relative to its owner
    owner.add(mesh);
  });
}

// Upload a floor's textures to the GPU during idle time, so it does not happen in the middle of a scroll.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
function prepTextures(obj) {
  const seen = new Set();
  obj.traverse((o) => [].concat(o.material || []).forEach((m) => {
    ["map", "emissiveMap", "alphaMap", "normalMap", "roughnessMap"].forEach((k) => { if (m[k] && !seen.has(m[k])) seen.add(m[k]); });
  }));
  [...seen].forEach((t) => idle(() => renderer.initTexture(t)));
}

// Labels are drawn into canvases, so the tower is built once the web fonts are ready.
function buildTower() {
  floors.forEach((f, i) => {
    buildingFloor = i;
    const g = platform(i, f);
    (builders[f.id] || (() => {}))(g, i, f);
  });
  buildingFloor = -1;
  tower.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
  floors.forEach((_, i) => computeFit(i));
  floorGroups.forEach(bakeFloor);
}

// the cable that carries you up, and the packet riding it
const spineX = -9.6, spineZ = -6.9;
const spine = cyl(0.12, 0.12, (floors.length - 1) * H + 6, COL.line, spineX, ((floors.length - 1) * H) / 2, spineZ, { emissive: COL.blue, ei: 0.25 });
scene.add(spine);
const packet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mat(COL.ink, { emissive: COL.accent, ei: 2.2 }));
scene.add(packet);

/* ---------- scroll → camera ---------- */
const steps = [...document.querySelectorAll(".jr-step")];
const navBtns = [...document.querySelectorAll(".jr-nav button")];
let target = 0, cur = 0;
// step positions are measured once (and again when the layout changes), never during scrolling
let stepTops = [], stepEnd = 0;
function measureSteps() {
  const y = window.scrollY;
  stepTops = steps.map((s) => s.getBoundingClientRect().top + y);
  const last = steps[steps.length - 1];
  stepEnd = stepTops[stepTops.length - 1] + (last ? last.offsetHeight : 0);
}
if (window.ResizeObserver) new ResizeObserver(() => { measureSteps(); readScroll(); kick(); }).observe(document.body);
function readScroll() {
  if (!stepTops.length) measureSteps();
  const mid = window.scrollY + window.innerHeight * 0.5;
  let f = 0;
  for (let k = 0; k < stepTops.length; k++) {
    const top = stepTops[k], next = k + 1 < stepTops.length ? stepTops[k + 1] : stepEnd;
    if (mid >= top) f = k + Math.min(1, (mid - top) / (next - top)) - 0.5;
  }
  target = Math.max(0, Math.min(floors.length - 1, f));
}
window.addEventListener("scroll", readScroll, { passive: true });
navBtns.forEach((b, k) => b.addEventListener("click", () => steps[k].scrollIntoView({ behavior: reduce ? "auto" : "smooth" })));

let mobile = false;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  mobile = w < 860;
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    ao.setQualityMode(mobile ? "Low" : "Medium");
  }
  camera.aspect = w / h;
  if (mobile) camera.setViewOffset(w, h, 0, h * 0.22, w, h);
  else { measureFree(); camera.setViewOffset(w, h, w / 2 - (free.left + free.right) / 2, -(free.top / 2), w, h); }
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

const camPos = new THREE.Vector3(), look = new THREE.Vector3();
function placeCamera(f) {
  // blend the hero framing of the two nearest floors; the sweep stays in front so text never mirrors
  const i0 = Math.floor(f), i1 = Math.min(floors.length - 1, i0 + 1), k = f - i0;
  const fa = fits[i0] || { c: new THREE.Vector3(0, 2, 0), r: 8 }, fb = fits[i1] || fa;
  const fx = fa.c.x + (fb.c.x - fa.c.x) * k, fz = fa.c.z + (fb.c.z - fa.c.z) * k;
  const fy = f * H + fa.c.y + (fb.c.y - fa.c.y) * k;
  const r = fitDistance(fa.r + (fb.r - fa.r) * k) * view.zoom;
  const th = -0.4 + (f / Math.max(1, floors.length - 1)) * 0.8 + view.yaw;
  const el = 0.34 + view.pitch; // look slightly down onto the floor
  // a double-clicked part pulls the look-at point toward it
  const lx = fx + (view.focus.x - fx) * view.focusW;
  const ly = fy + (view.focus.y - fy) * view.focusW;
  const lz = fz + (view.focus.z - fz) * view.focusW;
  camPos.set(lx + Math.sin(th) * Math.cos(el) * r, ly + Math.sin(el) * r, lz + Math.cos(th) * Math.cos(el) * r);
  look.set(lx, ly, lz);
  camera.position.copy(camPos);
  camera.lookAt(look);
}

/* ---------- visitor controls: zoom, orbit, dive into a part ----------
   Default is the whole floor from afar. The visitor decides how deep to go:
   +/− buttons, Ctrl/⌘ + wheel or trackpad pinch, two-finger pinch on phones,
   drag (two fingers on phones) to orbit, double-click a part to fly to it, ⟲ to go back. */
const view = {
  zoom: 1, zoomT: 1, yaw: 0, yawT: 0, pitch: 0, pitchT: 0,
  focus: new THREE.Vector3(), focusW: 0, focusWT: 0,
};
const ZMIN = 0.18, ZMAX = 1.6;
const clampZ = (z) => Math.max(ZMIN, Math.min(ZMAX, z));
function resetView() { view.zoomT = 1; view.yawT = 0; view.pitchT = 0; view.focusWT = 0; kick(); }
function zoomBy(f) { view.zoomT = clampZ(view.zoomT * f); kick(); }
function viewEasing(dt) {
  const k = reduce ? 1 : 1 - Math.exp(-dt * 6);
  view.zoom += (view.zoomT - view.zoom) * k;
  view.yaw += (view.yawT - view.yaw) * k;
  view.pitch += (view.pitchT - view.pitch) * k;
  view.focusW += (view.focusWT - view.focusW) * k;
  return Math.abs(view.zoomT - view.zoom) > 0.001 || Math.abs(view.yawT - view.yaw) > 0.001 ||
    Math.abs(view.pitchT - view.pitch) > 0.001 || Math.abs(view.focusWT - view.focusW) > 0.002;
}
const zin = document.getElementById("jrZoomIn"), zout = document.getElementById("jrZoomOut"), zreset = document.getElementById("jrZoomReset");
if (zin) zin.addEventListener("click", () => zoomBy(0.72));
if (zout) zout.addEventListener("click", () => zoomBy(1 / 0.72));
if (zreset) zreset.addEventListener("click", resetView);
canvas.addEventListener("wheel", (e) => {
  if (!e.ctrlKey && !e.metaKey) return; // plain wheel keeps scrolling the story
  e.preventDefault();
  zoomBy(Math.exp(e.deltaY * 0.0022));
}, { passive: false });
window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (e.key === "+" || e.key === "=") zoomBy(0.8);
  else if (e.key === "-") zoomBy(1.25);
  else if (e.key === "0") resetView();
});
// drag to orbit (mouse), two-finger drag + pinch on touch
let drag = null, dragged = false;
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") return;
  drag = { x: e.clientX, y: e.clientY };
  dragged = false;
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
  if (!dragged) return;
  drag = { x: e.clientX, y: e.clientY };
  view.yawT = Math.max(-0.9, Math.min(0.9, view.yawT - dx * 0.006));
  view.pitchT = Math.max(-0.28, Math.min(0.55, view.pitchT + dy * 0.004));
  kick();
});
window.addEventListener("pointerup", () => { drag = null; });
let pinch = null;
const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const touchMid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) pinch = { d: touchDist(e.touches), z: view.zoomT, m: touchMid(e.touches) };
}, { passive: true });
canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 2 || !pinch) return;
  e.preventDefault();
  view.zoomT = clampZ(pinch.z * (pinch.d / touchDist(e.touches)));
  const m = touchMid(e.touches);
  view.yawT = Math.max(-0.9, Math.min(0.9, view.yawT - (m.x - pinch.m.x) * 0.006));
  view.pitchT = Math.max(-0.28, Math.min(0.55, view.pitchT + (m.y - pinch.m.y) * 0.004));
  pinch.m = m;
  kick();
}, { passive: false });
canvas.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinch = null; });

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let flashObj = null, flashUntil = 0;
function pickAt(cx, cy) {
  ptr.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(clickables, false)
    .find((h) => Math.abs(h.object.userData.pickRoot.userData.pick.floor - cur) < 0.75);
  return hit ? hit.object.userData.pickRoot : null;
}
function showTip(obj, x, y) {
  const { floor, tech } = obj.userData.pick;
  const t = floors[floor].techs[tech];
  if (!t) return;
  tip.querySelector("b").textContent = t.name;
  tip.querySelector("p").textContent = t.text;
  tip.style.setProperty("--wire", `var(--${floors[floor].color})`);
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.max(12, Math.min(window.innerWidth - r.width - 12, x - r.width / 2)) + "px";
  tip.style.top = Math.max(70, Math.min(window.innerHeight - r.height - 12, y + 18)) + "px";
  flashObj = obj; flashUntil = performance.now() + 1600;
  kick();
}
let lastHover = 0;
canvas.addEventListener("pointermove", (e) => {
  const n = performance.now();
  if (n - lastHover < 80) return;
  lastHover = n;
  if (!drag) canvas.style.cursor = pickAt(e.clientX, e.clientY) ? "pointer" : "";
});
canvas.addEventListener("click", (e) => {
  if (dragged) { dragged = false; return; }
  const o = pickAt(e.clientX, e.clientY);
  if (o) showTip(o, e.clientX, e.clientY); else tip.hidden = true;
});
// double-click: fly toward the exact spot under the pointer (any surface of the current floor)
canvas.addEventListener("dblclick", (e) => {
  const fl = floorGroups[Math.round(cur)];
  if (!fl) return;
  ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObject(fl, true).find((h) => h.object.visible && !h.object.isSprite);
  if (!hit) return;
  view.focus.copy(hit.point);
  view.focusWT = 1;
  view.zoomT = clampZ(Math.min(view.zoomT * 0.5, 0.38));
  kick();
});
document.querySelectorAll("[data-tech]").forEach((b) => b.addEventListener("click", () => {
  const f = +b.dataset.floor, k = +b.dataset.tech;
  const o = clickables.map((m) => m.userData.pickRoot).find((r) => r.userData.pick.floor === f && r.userData.pick.tech === k);
  const rb = b.getBoundingClientRect();
  if (o) {
    const p = new THREE.Vector3(); o.getWorldPosition(p); p.project(camera);
    showTip(o, (p.x + 1) / 2 * window.innerWidth, (1 - p.y) / 2 * window.innerHeight);
  } else {
    showTip({ userData: { pick: { floor: f, tech: k } } }, rb.left, rb.bottom);
  }
}));
window.addEventListener("keydown", (e) => { if (e.key === "Escape") tip.hidden = true; });

/* ---------- callouts (like a product explainer): name + leader line on the real hardware ---------- */
const CALLOUTS = { server: "SERVER", switch: "NETWORK SWITCH", patch: "PATCH PANEL", cables: "CABLE MANAGEMENT", firewall: "FIREWALL", nas: "NAS STORAGE", ups: "UPS", rails: "RAILS" };
const LEFT = new Set(["cables", "switch", "nas"]);
const calloutEls = {};
if (callouts) {
  Object.entries(CALLOUTS).forEach(([k, text]) => {
    const el = document.createElement("div");
    el.className = LEFT.has(k) ? "co left" : "co"; el.hidden = true;
    el.innerHTML = "<i></i><span></span><b></b>";
    el.querySelector("b").textContent = text;
    callouts.appendChild(el);
    calloutEls[k] = el;
  });
}
const tmpV = new THREE.Vector3();
const setHidden = (el, h) => { if (el.hidden !== h) el.hidden = h; };
let calloutsShown = false;
function updateCallouts() {
  const m = mixers.find((x) => Math.abs(cur - x.floor) < 0.3);
  if (!m && !calloutsShown) return;
  calloutsShown = !!m;
  Object.entries(calloutEls).forEach(([k, el]) => {
    const a = m && m.anchors[k];
    if (!a) { setHidden(el, true); return; }
    a.getWorldPosition(tmpV); tmpV.project(camera);
    if (tmpV.z > 1) { setHidden(el, true); return; }
    setHidden(el, false);
    const tr = `translate(${Math.round((tmpV.x + 1) / 2 * window.innerWidth)}px, ${Math.round((1 - tmpV.y) / 2 * window.innerHeight)}px)${LEFT.has(k) ? " translateX(-100%)" : ""}`;
    if (el.style.transform !== tr) el.style.transform = tr;
  });
}

/* ---------- loop: render on demand ----------
   Moving (scroll, zoom, drag, an effect): every display frame, cheap path (no AO).
   Just stopped: the floor's small animations play on for a few seconds at ~30 fps.
   Then one final still frame (fresh shadows, AO on strong GPUs) and the loop sleeps: zero GPU work
   until the next input. Only floors next to the camera are drawn and animated. */
const t0 = performance.now();
const TAIL_MS = reduce ? 0 : 3000;
let active = -1, lastRender = 0, idleSince = t0, spriteKey = null, shadowTick = 0, running = false, settled = false, sunFloor = -1;
const samples = [];
function kick() {
  idleSince = performance.now(); settled = false;
  if (!running && !document.hidden) { running = true; lastRender = 0; requestAnimationFrame(frame); }
}
window.addEventListener("scroll", kick, { passive: true });
window.addEventListener("resize", () => { measureSteps(); readScroll(); kick(); });
function frame(now) {
  if (document.hidden) { running = false; return; }
  const viewMoving = viewEasing(Math.min(0.1, (now - (lastRender || now)) / 1000) || 0.016);
  const moving = Math.abs(target - cur) > 0.0006 || flashObj !== null || viewMoving;
  if (moving) idleSince = now;
  const idleFor = now - idleSince;
  const finalFrame = !moving && idleFor > TAIL_MS;
  if (finalFrame && settled) { running = false; return; } // asleep: nothing is drawn until the next input
  requestAnimationFrame(frame);
  const interval = moving || finalFrame ? 0 : Q.idleMs;
  if (lastRender && now - lastRender < interval) return;
  const delta = lastRender ? now - lastRender : 16;
  lastRender = now;
  const dt = Math.min(0.1, delta / 1000);
  const t = (now - t0) / 1000;

  // watchdog: if scrolling runs below ~30 fps, step quality down
  if (moving && delta < 250) {
    samples.push(delta);
    if (samples.length >= 40) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      samples.length = 0;
      if (avg > 33 && Q.tier > 0) { applyTier(Q.tier - 1); resize(); }
    }
  }

  cur += (target - cur) * (reduce ? 1 : 1 - Math.exp(-dt * 5)); // same feel at any frame rate
  floorGroups.forEach((g, k) => { g.visible = Math.abs(k - cur) < 1.35; });
  const key = Math.round(cur * 4);
  if (key !== spriteKey) {
    spriteKey = key;
    floorGroups.forEach((g, k) => {
      const show = Math.abs(k - cur) < 0.75;
      g.traverse((o) => { if (o.isSprite) o.visible = show; });
    });
  }
  lazy.splice(0, lazy.length, ...lazy.filter((l) => (Math.abs(cur - l.floor) < 2.2 ? (l.run(), false) : true)));
  placeCamera(cur);
  packet.position.set(spineX, cur * H + 0.9 + (reduce ? 0 : Math.sin(t * 2) * 0.12), spineZ);
  animated.forEach((a) => { if (a.f < 0 || Math.abs(a.f - cur) < 1.2) a.fn(t); }); // motion-reduced effects hold still on their own
  // the key light snaps to the nearest floor, so its shadow map stays valid while you scroll
  const sf = Math.round(cur);
  if (sf !== sunFloor) {
    sunFloor = sf;
    const fy = sf * H;
    sun.position.set(9, fy + 18, 12); sun.target.position.set(0, fy, 0);
    rim.position.set(-10, fy + 8, -12); rim.target.position.set(0, fy + 2, 0);
    sun.target.updateMatrixWorld(); rim.target.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
  }
  laptops.forEach(({ api, floor }) => api.setOpen(Math.max(0, Math.min(1, 1.6 - Math.abs(cur - floor) * 1.6))));
  mixers.forEach((m) => { if (Math.abs(cur - m.floor) < 1.5) m.update(cur - m.floor); });
  if (flashObj) {
    const on = now < flashUntil;
    flashObj.traverse((o) => { if (o.isMesh && o.material && "emissiveIntensity" in o.material) o.scale.setScalar(on ? 1 + 0.06 * Math.sin(t * 12) : 1); });
    if (!on) flashObj = null;
  }
  const a = Math.round(cur);
  if (a !== active) {
    if (active !== -1) resetView();
    active = a;
    navBtns.forEach((b, k) => b.setAttribute("aria-current", k === a ? "step" : "false"));
    root.style.setProperty("--floor-color", `var(--${floors[a].color})`);
  }
  // shadows only change when parts move (door, lid): refresh them now and then while moving, and once at rest
  if (Q.shadows && (finalFrame || (moving && ++shadowTick % (Q.tier === 2 ? 3 : 8) === 0))) renderer.shadowMap.needsUpdate = true;
  if (finalFrame && Q.ao && composer) composer.render(); // the still frame gets ambient occlusion
  else renderer.render(scene, camera);
  updateCallouts();
  if (finalFrame) settled = true;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

(document.fonts ? document.fonts.ready : Promise.resolve()).then(async () => {
  buildTower();
  applyTier(detectTier());
  resize(); measureSteps(); readScroll(); cur = target;
  placeCamera(cur);
  // KHR_parallel_shader_compile: programs compile off the main thread instead of stalling the first frames
  try { await Promise.race([renderer.compileAsync(scene, camera), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
  root.classList.add("ready");
  renderer.shadowMap.needsUpdate = true;
  kick();
  // the floors nearest to the visitor get their textures first
  [...floorGroups].map((g, k) => [g, Math.abs(k - cur)]).sort((a, b) => a[1] - b[1]).forEach(([g]) => prepTextures(g));
  // fetch the rack while the visitor reads, not when they arrive
  idle(() => { lazy.splice(0).forEach((l) => l.run()); }, { timeout: 4000 });
  if (location.search.includes("debug")) window.__jr = { renderer, Q, view, get cur() { return cur; } };
});
