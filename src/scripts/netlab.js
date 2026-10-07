// Interactive home-lab showcase: topology + packet trace, live monitoring, subnet calculator.
// Ported 1:1 from the approved design preview.
import { reduce } from "./util.js";

/* ===== Interactive lab: tabs ===== */
var tabBtns = document.querySelectorAll(".lab-tabs button");
function openTab(name) {
  tabBtns.forEach(function (b) {
    var on = b.getAttribute("data-tab") === name;
    b.setAttribute("aria-selected", on ? "true" : "false");
    document.getElementById("tab-" + b.getAttribute("data-tab")).hidden = !on;
  });
}
tabBtns.forEach(function (b) { b.addEventListener("click", function () { openTab(b.getAttribute("data-tab")); }); });
document.querySelectorAll("[data-open]").forEach(function (a) {
  a.addEventListener("click", function () { openTab(a.getAttribute("data-open")); });
});

/* ===== Topology ===== */
var NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
var LN = {
  isp: { x: 340, y: 42, t: "Internet", ip: "203.0.113.7", role: "مزود الخدمة. العنوان العام الوحيد للمنزل كله.", vlan: "WAN", ports: "443 ← srv-01 · 51820/udp",
    cfg: "# public IP (documentation range)\nwan0  203.0.113.7/30\ngw    203.0.113.5" },
  wg: { x: 600, y: 42, t: "wg-phone", ip: "10.8.0.2", role: "هاتف خارج المنزل يتصل بالمختبر عبر نفق WireGuard مشفر.", vlan: "tunnel", ports: "51820/udp",
    cfg: "[Interface]\nAddress    = 10.8.0.2/32\n\n[Peer]\nEndpoint   = 203.0.113.7:51820\nAllowedIPs = 10.0.10.0/24" },
  fw: { x: 340, y: 130, t: "pfSense", ip: "10.0.0.1", role: "الجدار الناري والراوتر بين الشبكات. كل حزمة تنتقل بين VLAN وأخرى تمر من هنا.", vlan: "trunk 10,20,30", ports: "NAT · rules · VPN",
    cfg: "pass  SERVERS -> NAS     tcp/2049\npass  WG      -> SERVERS any\npass  GUEST   -> WAN     any\nblock GUEST   -> LAN     any\nrdr   WAN:443 -> 10.0.10.12:443" },
  sw: { x: 340, y: 222, t: "core-sw", ip: "L2 · 24p", role: "سويتش مُدار يفصل الأجهزة إلى شبكات افتراضية (VLAN) على نفس الأسلاك.", vlan: "10 · 20 · 30", ports: "Gi0/24 trunk",
    cfg: "interface Gi0/24\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30\ninterface Gi0/1\n switchport access vlan 10" },
  s1: { x: 95, y: 332, t: "srv-01", ip: "10.0.10.12", role: "سيرفر الويب. يستضيف هذا الموقع خلف Nginx.", vlan: "10 · SERVERS", ports: "443/tcp · 22/tcp",
    cfg: "server {\n  listen 443 ssl;\n  server_name lab.example;\n  location / {\n    proxy_pass http://127.0.0.1:3000;\n  }\n}" },
  s2: { x: 235, y: 332, t: "srv-02", ip: "10.0.10.13", role: "سيرفر Docker. عليه Grafana و Prometheus وبوت المراقبة.", vlan: "10 · SERVERS", ports: "3000/tcp · 9090/tcp",
    cfg: "services:\n  grafana:\n    image: grafana/grafana\n    ports: [\"3000:3000\"]\n  prometheus:\n    image: prom/prometheus" },
  nas: { x: 420, y: 332, t: "NAS", ip: "10.0.20.20", role: "وحدة التخزين والنسخ الاحتياطي، في شبكة منفصلة.", vlan: "20 · STORAGE", ports: "2049/tcp (NFS)",
    cfg: "# /etc/exports\n/export/backup 10.0.10.0/24(rw,sync)" },
  iot: { x: 600, y: 332, t: "guest", ip: "10.0.30.40", role: "شبكة الضيوف والأجهزة الذكية. معزولة ولها إنترنت فقط.", vlan: "30 · GUEST", ports: "—",
    cfg: "# isolated: internet only\naddress 10.0.30.40/24\ngateway 10.0.30.1" }
};
var LINKS = [
  ["isp", "wg", "--accent", "tunnel"], ["isp", "fw", "--accent", ""], ["fw", "sw", "--blue", "trunk"],
  ["sw", "s1", "--green", ""], ["sw", "s2", "--green", ""], ["sw", "nas", "--brown", ""], ["sw", "iot", "--blue", ""]
];
var LAN = { s1: 10, s2: 10, nas: 20, iot: 30 };
var down = {};
var svg = document.getElementById("labSvg");
var nodeEls = {}, linkEls = {};
function key(a, b) { return [a, b].sort().join("-"); }
function linkPts(a, b) {
  var A = LN[a], B = LN[b];
  if (A.y === B.y || A.x === B.x) return [{ x: A.x, y: A.y }, { x: B.x, y: B.y }];
  var mid = (A.y + B.y) / 2;
  return [{ x: A.x, y: A.y }, { x: A.x, y: mid }, { x: B.x, y: mid }, { x: B.x, y: B.y }];
}

var gV = svgEl("g", {}, svg);
[[22, 292, 290, "10 · SERVERS", "--green"], [348, 292, 144, "20 · STORAGE", "--brown"], [528, 292, 144, "30 · GUEST", "--blue"]].forEach(function (v) {
  var g = svgEl("g", { "class": "vlan", style: "--v:var(" + v[4] + ")" }, gV);
  svgEl("rect", { x: v[0], y: v[1], width: v[2], height: 84, rx: 10 }, g);
  svgEl("text", { x: v[0] + 10, y: v[1] + 15 }, g).textContent = "VLAN " + v[3];
});
var gL = svgEl("g", {}, svg);
LINKS.forEach(function (l) {
  var k = key(l[0], l[1]);
  var d = "M" + linkPts(l[0], l[1]).map(function (p) { return p.x + " " + p.y; }).join(" L ");
  var g = svgEl("g", { "class": "link " + l[3], style: "--w:var(" + l[2] + ")", tabindex: "0", role: "button",
    "aria-label": "فصل أو توصيل الكابل بين " + LN[l[0]].t + " و " + LN[l[1]].t }, gL);
  svgEl("path", { "class": "wire", d: d }, g);
  svgEl("path", { "class": "hit-area", d: d }, g);
  linkEls[k] = g;
  function toggle() {
    down[k] = !down[k];
    g.classList.toggle("down", !!down[k]);
    setVerdict(down[k]
      ? "فصلت الكابل بين " + LN[l[0]].t + " و " + LN[l[1]].t + ". أرسل حزمة تمر به لترى النتيجة."
      : "أعدت توصيل الكابل بين " + LN[l[0]].t + " و " + LN[l[1]].t + ".", down[k] ? "--danger" : "--green");
  }
  g.addEventListener("click", toggle);
  g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
});
var gN = svgEl("g", {}, svg);
Object.keys(LN).forEach(function (id) {
  var n = LN[id];
  var g = svgEl("g", { "class": "node", tabindex: "0", role: "button", "aria-label": n.t + " " + n.ip }, gN);
  svgEl("rect", { x: n.x - 52, y: n.y - 23, width: 104, height: 46, rx: 8 }, g);
  svgEl("text", { "class": "n-title", x: n.x, y: n.y - 4, "text-anchor": "middle" }, g).textContent = n.t;
  svgEl("text", { "class": "n-sub", x: n.x, y: n.y + 12, "text-anchor": "middle" }, g).textContent = n.ip;
  nodeEls[id] = g;
  g.addEventListener("click", function () { selectNode(id); });
  g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(id); } });
});
var pkt = svgEl("circle", { "class": "pkt", r: 7, cx: -20, cy: -20 }, svg);

function selectNode(id) {
  var n = LN[id];
  Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.toggle("sel", k === id); });
  document.getElementById("devTitle").textContent = n.t;
  document.getElementById("devIp").textContent = n.ip;
  document.getElementById("devRole").textContent = n.role;
  document.getElementById("devKv").innerHTML = "";
  [["الشبكة", n.vlan], ["المنافذ", n.ports]].forEach(function (r) {
    var dt = document.createElement("dt"); dt.textContent = r[0];
    var dd = document.createElement("dd"); dd.textContent = r[1]; dd.className = "mono";
    document.getElementById("devKv").append(dt, dd);
  });
  document.getElementById("devCfg").textContent = n.cfg;
}
selectNode("fw");

document.getElementById("vlanToggle").addEventListener("change", function (e) {
  svg.classList.toggle("vlans-off", !e.target.checked);
});
document.getElementById("resetLinks").addEventListener("click", function () {
  down = {};
  Object.keys(linkEls).forEach(function (k) { linkEls[k].classList.remove("down"); });
  setVerdict("كل الكابلات موصولة.", "--green");
});

function up(n) {
  if (n in LAN) return [n, "sw", "fw"];
  if (n === "isp") return ["isp", "fw"];
  return ["wg", "isp", "fw"];
}
function route(a, b) {
  if (a === b) return null;
  if ((a in LAN) && (b in LAN) && LAN[a] === LAN[b]) return [a, "sw", b];
  if ((a === "isp" && b === "wg") || (a === "wg" && b === "isp")) return [a, b];
  return up(a).concat(up(b).slice().reverse().slice(1));
}
function zone(n) {
  return n === "s1" || n === "s2" ? "SERVERS" : n === "nas" ? "NAS" : n === "iot" ? "GUEST" : n === "isp" ? "WAN" : "WG";
}
function fwRule(a, b) {
  var za = zone(a), zb = zone(b);
  if (za === "GUEST") return zb === "WAN"
    ? { pass: true, r: "pass GUEST -> WAN any", ar: "شبكة الضيوف مسموح لها بالخروج للإنترنت فقط." }
    : { pass: false, r: "block GUEST -> LAN any", ar: "أوقفها الجدار الناري. شبكة الضيوف معزولة، فحتى لو اختُرق جهاز ذكي فلن يصل إلى السيرفرات أو التخزين." };
  if (za === "WAN") return b === "s1"
    ? { pass: true, r: "rdr WAN:443 -> 10.0.10.12:443", ar: "وصلت لأن المنفذ 443 محوّل (Port forward) إلى srv-01. الموقع هو الخدمة الوحيدة المكشوفة للإنترنت." }
    : { pass: false, r: "block WAN -> LAN (default deny)", ar: "أوقفها الجدار الناري. لا شيء يدخل من الإنترنت إلا ما فُتح له منفذ صراحة." };
  if (za === "WG") return zb === "SERVERS"
    ? { pass: true, r: "pass WG -> SERVERS any", ar: "مرّت عبر نفق WireGuard المشفر، فالهاتف يتصرف كأنه داخل المنزل ويصل إلى السيرفرات." }
    : { pass: false, r: "block WG -> " + zb, ar: "الـVPN يعطي صلاحية الوصول إلى السيرفرات فقط، لا إلى كل الشبكة. هذا مبدأ أقل صلاحية ممكنة." };
  if (zb === "GUEST") return { pass: false, r: "block LAN -> GUEST", ar: "العزل في الاتجاهين: الأجهزة الداخلية لا تفتح اتصالاً مع شبكة الضيوف." };
  if (zb === "WG") return { pass: true, r: "pass LAN -> WG", ar: "السيرفر يرد على الهاتف عبر نفس النفق المشفر." };
  if (za === "SERVERS" && zb === "NAS") return { pass: true, r: "pass SERVERS -> NAS tcp/2049", ar: "النسخ الاحتياطي مسموح. السيرفرات تكتب على الـNAS عبر NFS على المنفذ 2049 فقط." };
  if (za === "NAS" && zb === "SERVERS") return { pass: true, r: "pass NAS -> SERVERS (established)", ar: "الـNAS يرد على اتصال بدأه السيرفر، والجدار الناري يتذكر الاتصالات المفتوحة (Stateful)." };
  if (zb === "WAN") return { pass: true, r: "pass LAN -> WAN (NAT)", ar: "خرجت إلى الإنترنت عبر NAT، فاستُبدل العنوان الداخلي بالعنوان العام 203.0.113.7." };
  return { pass: false, r: "block (default deny)", ar: "لا توجد قاعدة تسمح بهذا الاتصال، فالرفض هو الافتراضي." };
}

var logEl = document.getElementById("hopLog"), verdictEl = document.getElementById("verdict");
function log(text, cls) {
  var s = document.createElement("span");
  if (cls) s.className = cls;
  s.textContent = text + "\n";
  logEl.appendChild(s);
}
function setVerdict(text, color) { verdictEl.textContent = text; verdictEl.style.setProperty("--vc", "var(" + color + ")"); }
function pad(s, n) { while (s.length < n) s += " "; return s; }

function animateSeg(a, b, done) {
  var pts = linkPts(a, b);
  if (pts[0].x !== LN[a].x || pts[0].y !== LN[a].y) pts.reverse();
  var lens = [], L = 0;
  for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); lens.push(l); L += l; }
  function place(f) {
    var d = f * L, j = 0;
    while (j < lens.length - 1 && d > lens[j]) { d -= lens[j]; j++; }
    var t = lens[j] ? Math.min(d / lens[j], 1) : 1;
    pkt.setAttribute("cx", pts[j].x + (pts[j + 1].x - pts[j].x) * t);
    pkt.setAttribute("cy", pts[j].y + (pts[j + 1].y - pts[j].y) * t);
  }
  if (reduce) { place(1); done(); return; }
  var dur = key(a, b).indexOf("isp") > -1 ? 700 : 480, t0 = null;
  function frame(ts) {
    if (t0 === null) t0 = ts;
    var f = Math.min((ts - t0) / dur, 1);
    place(f);
    if (f < 1) requestAnimationFrame(frame); else done();
  }
  requestAnimationFrame(frame);
}

var busy = false;
function send(a, b) {
  if (busy) return;
  var path = route(a, b);
  if (!path) { setVerdict("اختر مصدراً ووجهة مختلفين.", "--muted"); return; }
  busy = true;
  Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("hit", "blocked"); });
  pkt.setAttribute("class", "pkt");
  pkt.setAttribute("cx", LN[a].x); pkt.setAttribute("cy", LN[a].y);
  logEl.textContent = "";
  log("$ traceroute " + LN[b].ip + "   # from " + LN[a].t, "c");
  setVerdict("الحزمة في الطريق…", "--accent");
  var i = 0, hop = 0, total = 0, ruled = false;
  function finish(ok, text) {
    pkt.setAttribute("class", "pkt " + (ok ? "ok" : "drop"));
    setVerdict(text, ok ? "--green" : "--danger");
    busy = false;
  }
  function next() {
    var here = path[i];
    nodeEls[here].classList.add("hit");
    if (here === "fw" && !ruled) {
      ruled = true;
      var rule = fwRule(a, b);
      log("        pfSense   " + (rule.pass ? "PASS  " : "DROP  ") + rule.r, rule.pass ? "fw" : "drop");
      if (!rule.pass) { nodeEls.fw.classList.add("blocked"); finish(false, rule.ar); return; }
      ruleText = rule.ar;
    }
    if (i === path.length - 1) {
      log("OK      delivered to " + LN[b].t + " (" + LN[b].ip + ") in " + total.toFixed(2) + " ms", "ok");
      var txt;
      if (path.length === 3 && path[1] === "sw") txt = "نفس الـVLAN، فأوصلها السويتش مباشرة دون المرور بالجدار الناري.";
      else if (path.length === 2) txt = "الحزمة تسير على الإنترنت العام مشفرة داخل نفق WireGuard.";
      else {
        txt = ruleText;
        if (path.join(",").indexOf("sw,fw,sw") > -1) txt += " لاحظ أنها صعدت إلى الجدار الناري ثم عادت إلى السويتش، لأن الانتقال بين VLAN وأخرى يمر دائماً بالراوتر (Router on a stick).";
      }
      finish(true, txt);
      return;
    }
    var x = path[i], y = path[i + 1], k = key(x, y);
    if (down[k]) {
      log("!H      " + LN[x].t + " -> " + LN[y].t + "   Destination host unreachable", "drop");
      nodeEls[x].classList.add("blocked");
      finish(false, "الكابل بين " + LN[x].t + " و " + LN[y].t + " مفصول، ولا يوجد مسار بديل في هذه الشبكة. هنا تظهر أهمية الرابط الاحتياطي (Redundancy).");
      return;
    }
    hop++;
    var ms = k.indexOf("isp") > -1 ? 8 + Math.random() * 7 : 0.15 + Math.random() * 0.35;
    total += ms;
    var tag = k === "fw-sw" ? "802.1Q trunk" : k.indexOf("isp") > -1 ? (k === "isp-wg" ? "wireguard" : "wan") : "vlan " + LAN[x in LAN ? x : y];
    log(pad("hop " + hop, 8) + pad(LN[x].t + " -> " + LN[y].t, 22) + pad(tag, 14) + ms.toFixed(2) + " ms");
    animateSeg(x, y, function () { i++; next(); });
  }
  var ruleText = "";
  next();
}

var srcSel = document.getElementById("srcSel"), dstSel = document.getElementById("dstSel");
["s1", "s2", "nas", "iot", "isp", "wg"].forEach(function (id) {
  [srcSel, dstSel].forEach(function (sel) {
    var o = document.createElement("option");
    o.value = id; o.textContent = LN[id].t + " · " + LN[id].ip;
    sel.appendChild(o);
  });
});
document.getElementById("sendBtn").addEventListener("click", function () { send(srcSel.value, dstSel.value); });
var SCEN = [
  ["iot", "nas", "ضيف يحاول الوصول للـNAS"],
  ["s1", "nas", "نسخ احتياطي إلى الـNAS"],
  ["wg", "s2", "دخول عن بعد عبر VPN"],
  ["isp", "s1", "زائر يفتح الموقع"],
  ["isp", "nas", "هجوم من الإنترنت"],
  ["s1", "s2", "سيرفر يكلم سيرفر"]
];
var scenBox = document.getElementById("scenarios");
SCEN.forEach(function (s) {
  var b = document.createElement("button");
  b.type = "button"; b.textContent = s[2];
  b.addEventListener("click", function () { srcSel.value = s[0]; dstSel.value = s[1]; send(s[0], s[1]); });
  scenBox.appendChild(b);
});
srcSel.value = "iot"; dstSel.value = "nas";
send("iot", "nas");

/* ===== Monitoring ===== */
var SRV = [
  { id: "srv-01", base: 22, ram: 41, net: 12, c: "--green" },
  { id: "srv-02", base: 34, ram: 58, net: 30, c: "--blue" },
  { id: "NAS", base: 12, ram: 33, net: 55, c: "--brown" }
];
var srvList = document.getElementById("srvList"), chat = document.getElementById("chatMsgs");
var stressBtn = document.getElementById("stressBtn");
SRV.forEach(function (s) {
  s.cpu = s.base; s.hist = []; s.stress = 0; s.hot = 0; s.alerted = false;
  for (var i = 0; i < 40; i++) s.hist.push(s.base + (Math.random() - 0.5) * 12);
  var row = document.createElement("div"); row.className = "srv-row";
  row.innerHTML = '<div class="who"><b></b><span class="pill">● سليم</span></div>' +
    '<svg class="spark" viewBox="0 0 100 44" preserveAspectRatio="none" style="--sc:var(' + s.c + ')" aria-hidden="true"><polygon></polygon><polyline></polyline></svg>' +
    '<div class="nums"></div>';
  row.querySelector("b").textContent = s.id;
  s.pill = row.querySelector(".pill"); s.poly = row.querySelector("polyline"); s.area = row.querySelector("polygon"); s.nums = row.querySelector(".nums");
  srvList.appendChild(row);
});
function nowStr() { return new Date().toLocaleTimeString("en-GB"); }
function say(text, cls) {
  var m = document.createElement("div"); m.className = "msg " + (cls || "");
  var t = document.createElement("time"); t.textContent = "uptime-bot · " + nowStr();
  m.appendChild(t); m.appendChild(document.createTextNode(text));
  chat.appendChild(m);
  while (chat.children.length > 4) chat.removeChild(chat.firstChild);
}
say("كل الخدمات تعمل. 3 سيرفرات، 0 تنبيهات.");
function renderSrv(s) {
  var n = s.hist.length, pts = s.hist.map(function (v, i) { return (i * 100 / (n - 1)).toFixed(1) + "," + (42 - v / 100 * 40).toFixed(1); });
  s.poly.setAttribute("points", pts.join(" "));
  s.area.setAttribute("points", "0,44 " + pts.join(" ") + " 100,44");
  s.nums.innerHTML = "CPU <b>" + Math.round(s.cpu) + "%</b> · RAM <b>" + Math.round(s.ram) + "%</b> · NET <b>" + Math.round(s.net) + " Mb/s</b>";
  var warn = s.cpu > 85;
  s.pill.className = "pill" + (warn ? " warn" : "");
  s.pill.textContent = warn ? "▲ تحذير" : "● سليم";
}
function tick() {
  SRV.forEach(function (s) {
    var target = s.stress > 0 ? 93 + Math.random() * 6 : s.base + (Math.random() - 0.5) * 16;
    s.cpu += (target - s.cpu) * 0.55;
    s.cpu = Math.max(2, Math.min(99, s.cpu));
    s.ram += ((s.stress > 0 ? 82 : s.ram) - s.ram) * 0.3 + (Math.random() - 0.5) * 2;
    s.net = Math.max(1, s.net + (Math.random() - 0.5) * 6);
    s.hist.push(s.cpu); s.hist.shift();
    if (s.stress > 0) s.stress--;
    s.hot = s.cpu > 90 ? s.hot + 1 : 0;
    if (s.hot === 3 && !s.alerted) { s.alerted = true; say("تنبيه: المعالج في " + s.id + " عند " + Math.round(s.cpu) + "% منذ 3 قراءات متتالية. الحاوية الأكثر استهلاكاً: prometheus.", "alert"); }
    if (s.alerted && s.cpu < 60) { s.alerted = false; s.ram = 58; say("تم: " + s.id + " عاد للوضع الطبيعي. المعالج " + Math.round(s.cpu) + "%.", "recover"); stressBtn.disabled = false; }
    renderSrv(s);
  });
}
SRV.forEach(renderSrv);
setInterval(tick, 1000);
stressBtn.addEventListener("click", function () { SRV[1].stress = 9; stressBtn.disabled = true; });

/* ===== Subnet calculator ===== */
var ipIn = document.getElementById("ipIn"), prefIn = document.getElementById("prefIn"), prefOut = document.getElementById("prefOut");
function ipToInt(s) {
  var p = s.trim().split(".");
  if (p.length !== 4) return null;
  var n = 0;
  for (var i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(p[i]) || +p[i] > 255) return null;
    n = n * 256 + (+p[i]);
  }
  return n;
}
function intToIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
function isPrivate(n) {
  var a = n >>> 24, b = (n >>> 16) & 255;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
function calc() {
  var p = +prefIn.value;
  prefOut.textContent = "/" + p;
  var ip = ipToInt(ipIn.value);
  document.getElementById("ipErr").hidden = ip !== null;
  document.getElementById("calcRes").style.opacity = ip === null ? 0.4 : 1;
  if (ip === null) return;
  var mask = (0xFFFFFFFF << (32 - p)) >>> 0;
  var net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
  var hosts = Math.pow(2, 32 - p) - 2;
  document.getElementById("rNet").textContent = intToIp(net) + "/" + p;
  document.getElementById("rMask").textContent = intToIp(mask);
  document.getElementById("rFirst").textContent = intToIp(net + 1);
  document.getElementById("rLast").textContent = intToIp(bc - 1);
  document.getElementById("rBc").textContent = intToIp(bc);
  document.getElementById("rHosts").textContent = hosts.toLocaleString("en");
  var bits = document.getElementById("bits"); bits.innerHTML = "";
  for (var o = 0; o < 4; o++) {
    var oct = document.createElement("span"); oct.className = "oct";
    for (var b = 0; b < 8; b++) {
      var idx = o * 8 + b, bit = document.createElement("span");
      bit.className = "bit " + (idx < p ? "n" : "h");
      bit.textContent = (ip >>> (31 - idx)) & 1;
      oct.appendChild(bit);
    }
    bits.appendChild(oct);
  }
  document.getElementById("calcNote").textContent =
    "الشبكة /" + p + " تتسع لـ" + hosts.toLocaleString("en") + " جهاز. أول " + p + " بت (البرتقالي) تحدد الشبكة، والـ" + (32 - p) +
    " بت الباقية (الأزرق) لعناوين الأجهزة. هذا " + (isPrivate(ip) ? "عنوان خاص (Private) لا يظهر على الإنترنت." : "عنوان عام (Public) يمكن الوصول إليه من الإنترنت.");
}
ipIn.addEventListener("input", calc);
prefIn.addEventListener("input", calc);
document.querySelectorAll("#presets button").forEach(function (b) {
  b.addEventListener("click", function () { prefIn.value = b.getAttribute("data-p"); calc(); });
});
calc();
