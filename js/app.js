// ARCAM studio — orchestrates camera/demo source, GL effects, stickers,
// particles, capture (photo + WebM recording), looks and all UI state.

import { EFFECTS, STICKERS, CATEGORIES, defaultParams } from "./effects.js";
import { GLPipeline, hexToVec3 } from "./gl.js";
import { anchors, fallbackAnchors, drawStickers } from "./stickers.js";
import { Particles } from "./particles.js";
import { FaceTracker } from "./face.js";
import { sfx, setSound } from "./audio.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── state ─────────────────────────────────────────────────── */

const state = {
  fxKey: "cinematic",
  paramsByFx: {},          // per-effect param memory
  colorsByFx: {
    duotone: { a: "#ff2ea6", b: "#22d3ee" },
    scan: { a: "#22d3ee", b: "#ff2ea6" },
  },
  intensity: 1,
  glow: 0.15, grain: 0.12, vignette: 0.25, sparkles: 0.25,
  stickers: ["shades"],
  stickerSize: 1,
  mirror: true,
  mic: false,
  sound: true,
  tracking: true,
  source: "demo",
  quality: 1,
  category: "All",
  search: "",
};

const LS_KEY = "arcam-state-v1";
const LS_LOOKS = "arcam-looks-v1";

function persist() {
  clearTimeout(persist._t);
  persist._t = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }, 250);
}

function restore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    Object.assign(state, s, { source: "demo", category: "All", search: "" });
    if (!EFFECTS.some((f) => f.key === state.fxKey)) state.fxKey = "cinematic";
    state.stickers = state.stickers.filter((k) => STICKERS.some((s) => s.key === k));
  } catch {}
}

const fx = () => EFFECTS.find((f) => f.key === state.fxKey);
const fxIndex = () => EFFECTS.indexOf(fx());
function params() {
  if (!state.paramsByFx[state.fxKey]) state.paramsByFx[state.fxKey] = defaultParams(fx());
  return state.paramsByFx[state.fxKey];
}
function colors() {
  const f = fx();
  if (!f.colors) return { a: "#ff2ea6", b: "#22d3ee" };
  if (!state.colorsByFx[f.key]) state.colorsByFx[f.key] = { a: "#ff2ea6", b: "#22d3ee" };
  return state.colorsByFx[f.key];
}

/* ── toasts ────────────────────────────────────────────────── */

function toast(msg, opts = {}) {
  const el = document.createElement("div");
  el.className = "toast";
  const span = document.createElement("span");
  span.textContent = msg;
  el.appendChild(span);
  if (opts.action) {
    const btn = document.createElement("button");
    btn.textContent = opts.action;
    btn.onclick = () => { opts.onAction?.(); kill(); };
    el.appendChild(btn);
  }
  $("toasts").appendChild(el);
  const kill = () => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  };
  setTimeout(kill, opts.timeout || 2600);
  return kill;
}

/* ── effect library UI ─────────────────────────────────────── */

function filteredEffects() {
  const q = state.search.trim().toLowerCase();
  return EFFECTS.filter((f) =>
    (state.category === "All" || f.cat === state.category) &&
    (!q || f.name.toLowerCase().includes(q) || f.key.includes(q))
  );
}

function buildCats() {
  const nav = $("catTabs");
  nav.innerHTML = "";
  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.className = "cat-tab" + (c === state.category ? " active" : "");
    b.textContent = c;
    b.onclick = () => {
      state.category = c;
      sfx.toggle();
      buildCats(); buildGrid();
    };
    nav.appendChild(b);
  }
}

function buildGrid() {
  const grid = $("fxGrid");
  grid.innerHTML = "";
  const list = filteredEffects();
  $("fxCount").textContent = `${list.length}/${EFFECTS.length}`;
  if (!list.length) {
    const d = document.createElement("div");
    d.className = "fx-empty";
    d.textContent = "no effects match — try another word";
    grid.appendChild(d);
    return;
  }
  list.forEach((f, i) => {
    const b = document.createElement("button");
    b.className = "fx-chip" + (f.key === state.fxKey ? " active" : "");
    b.style.animationDelay = `${Math.min(i * 0.02, 0.4)}s`;
    b.title = f.name;
    const em = document.createElement("span");
    em.className = "fx-emoji"; em.textContent = f.emoji;
    const nm = document.createElement("span");
    nm.className = "fx-name"; nm.textContent = f.name;
    b.append(em, nm);
    b.onclick = () => selectEffect(f.key);
    grid.appendChild(b);
  });
}

function selectEffect(key, silent = false) {
  state.fxKey = key;
  params(); // ensure defaults exist
  if (!silent) sfx.pop();
  buildGrid();
  buildParamSliders();
  syncColorRow();
  const tag = $("effectTag");
  tag.textContent = `${fx().emoji} ${fx().name}`;
  tag.classList.remove("bump");
  void tag.offsetWidth;
  tag.classList.add("bump");
  $("tuneName").textContent = fx().name;
  persist();
}

/* ── tune panel ────────────────────────────────────────────── */

function paintRange(input) {
  const min = +input.min, max = +input.max, v = +input.value;
  input.style.setProperty("--val", `${((v - min) / (max - min)) * 100}%`);
  const out = input.parentElement.querySelector("output");
  if (out) {
    if (input.id === "intensity") out.textContent = `${Math.round(v * 100)}%`;
    else if (max <= 2) out.textContent = v.toFixed(2);
    else out.textContent = Math.round(v);
  }
}

function buildParamSliders() {
  const wrap = $("paramSliders");
  wrap.innerHTML = "";
  const p = params();
  for (const meta of fx().params) {
    const row = document.createElement("div");
    row.className = "slider-row";
    const label = document.createElement("label");
    label.textContent = meta.label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = meta.min; input.max = meta.max;
    input.step = meta.step || (meta.max - meta.min) / 100;
    input.value = p["p" + meta.p];
    const out = document.createElement("output");
    row.append(label, input, out);
    input.oninput = () => {
      p["p" + meta.p] = +input.value;
      paintRange(input);
      persist();
    };
    wrap.appendChild(row);
    paintRange(input);
  }
}

function syncColorRow() {
  const row = $("colorRow");
  if (fx().colors) {
    row.classList.remove("hidden");
    $("colorA").value = colors().a;
    $("colorB").value = colors().b;
  } else {
    row.classList.add("hidden");
  }
}

function bindGlobalSlider(id, key) {
  const input = $(id);
  input.value = state[key];
  paintRange(input);
  input.oninput = () => {
    state[key] = +input.value;
    paintRange(input);
    persist();
  };
}

/* ── stickers UI ───────────────────────────────────────────── */

function buildStickerGrid() {
  const grid = $("stickerGrid");
  grid.innerHTML = "";
  for (const s of STICKERS) {
    const b = document.createElement("button");
    b.className = "st-chip" + (state.stickers.includes(s.key) ? " on" : "");
    const em = document.createElement("span");
    em.className = "st-emoji"; em.textContent = s.emoji;
    const nm = document.createElement("span");
    nm.className = "st-name"; nm.textContent = s.name;
    b.append(em, nm);
    b.onclick = () => {
      const i = state.stickers.indexOf(s.key);
      if (i >= 0) state.stickers.splice(i, 1);
      else state.stickers.push(s.key);
      b.classList.toggle("on", i < 0);
      sfx.toggle();
      $("stickerCount").textContent = `${state.stickers.length} on`;
      persist();
    };
    grid.appendChild(b);
  }
  $("stickerCount").textContent = `${state.stickers.length} on`;
}

/* ── looks ─────────────────────────────────────────────────── */

const SEED_LOOKS = [
  { name: "Cyber Night", fxKey: "scan", params: { p1: 0.5, p2: 0.75, p3: 0.6 },
    colors: { a: "#22d3ee", b: "#ff2ea6" }, stickers: ["mesh", "laser"],
    intensity: 1, glow: 0.4, grain: 0.15, vignette: 0.4, sparkles: 0.35 },
  { name: "Soft Golden", fxKey: "golden", params: { p1: 0.7, p2: 0.45 },
    stickers: ["blush", "halo"],
    intensity: 0.9, glow: 0.3, grain: 0.06, vignette: 0.18, sparkles: 0.2 },
  { name: "Retro VHS", fxKey: "vhs", params: { p1: 0.6, p2: 0.7, p3: 0.5, p4: 0.6 },
    stickers: ["deal"],
    intensity: 1, glow: 0.1, grain: 0.3, vignette: 0.42, sparkles: 0 },
];

function getLooks() {
  try {
    const raw = localStorage.getItem(LS_LOOKS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...SEED_LOOKS];
}
function setLooks(looks) {
  try { localStorage.setItem(LS_LOOKS, JSON.stringify(looks)); } catch {}
  buildLooks();
}

function buildLooks() {
  const row = $("looksRow");
  row.innerHTML = "";
  const looks = getLooks();
  looks.forEach((look, idx) => {
    const chip = document.createElement("span");
    chip.className = "look-chip";
    const name = document.createElement("b");
    name.textContent = look.name;
    const x = document.createElement("span");
    x.className = "x"; x.textContent = "✕"; x.title = "Delete look";
    chip.append(name, x);
    chip.onclick = (e) => {
      if (e.target === x) return;
      applyLook(look);
    };
    x.onclick = (e) => {
      e.stopPropagation();
      const cur = getLooks();
      cur.splice(idx, 1);
      setLooks(cur);
      sfx.error();
      toast(`Deleted “${look.name}”`, {
        action: "Undo",
        timeout: 5000,
        onAction: () => {
          const again = getLooks();
          again.splice(Math.min(idx, again.length), 0, look);
          setLooks(again);
          toast("Look restored");
        },
      });
    };
    row.appendChild(chip);
  });
}

function applyLook(look) {
  state.fxKey = look.fxKey;
  state.paramsByFx[look.fxKey] = { ...defaultParams(fx()), ...look.params };
  if (look.colors) state.colorsByFx[look.fxKey] = { ...look.colors };
  state.stickers = [...(look.stickers || [])];
  for (const k of ["intensity", "glow", "grain", "vignette", "sparkles"]) {
    if (look[k] !== undefined) state[k] = look[k];
  }
  refreshAllControls();
  selectEffect(look.fxKey);
  buildStickerGrid();
  toast(`Look “${look.name}” applied`);
}

function saveCurrentLook() {
  const looks = getLooks();
  const base = fx().name;
  let name = base, n = 2;
  while (looks.some((l) => l.name === name)) name = `${base} ${n++}`;
  looks.push({
    name,
    fxKey: state.fxKey,
    params: { ...params() },
    colors: fx().colors ? { ...colors() } : undefined,
    stickers: [...state.stickers],
    intensity: state.intensity, glow: state.glow, grain: state.grain,
    vignette: state.vignette, sparkles: state.sparkles,
  });
  setLooks(looks);
  sfx.sparkle();
  toast(`Saved look “${name}”`);
}

function refreshAllControls() {
  for (const [id, key] of [["intensity", "intensity"], ["glow", "glow"], ["grain", "grain"],
                          ["vignette", "vignette"], ["sparkles", "sparkles"], ["stickerSize", "stickerSize"]]) {
    const input = $(id);
    input.value = state[key];
    paintRange(input);
  }
}

/* ── sources: camera + demo scene ──────────────────────────── */

const video = $("cam");
let camStream = null;
let W = 1280, H = 720;

const demo = document.createElement("canvas");
demo.width = 1280; demo.height = 720;
const demoCtx = demo.getContext("2d");

function drawDemo(t) {
  const c = demoCtx, w = demo.width, h = demo.height;
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#160b2e"); bg.addColorStop(0.55, "#2a0f45"); bg.addColorStop(1, "#0b1e3a");
  c.fillStyle = bg; c.fillRect(0, 0, w, h);

  // drifting neon blobs
  const blobs = [
    ["#7c3aed", 0.32, 0.4, 260, 0.21],
    ["#ff2ea6", 0.72, 0.35, 210, 0.34],
    ["#22d3ee", 0.5, 0.75, 240, 0.16],
    ["#fbbf24", 0.85, 0.8, 130, 0.42],
  ];
  for (const [col, bx, by, r, sp] of blobs) {
    const x = w * bx + Math.sin(t * sp * 2.1) * w * 0.09;
    const y = h * by + Math.cos(t * sp * 1.7) * h * 0.1;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + "cc"); g.addColorStop(1, col + "00");
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  // perspective grid floor
  c.strokeStyle = "rgba(124,58,237,0.4)"; c.lineWidth = 1.5;
  const horizon = h * 0.62;
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * w;
    c.beginPath(); c.moveTo(w / 2 + (x - w / 2) * 0.18, horizon); c.lineTo(x, h); c.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const p = ((t * 0.12 + i / 8) % 1);
    const y = horizon + p * p * (h - horizon);
    c.globalAlpha = 0.25 + p * 0.5;
    c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
  }
  c.globalAlpha = 1;

  // bouncing mascot with an opening mouth (drives fire/rainbow in demo)
  const mx = w * 0.5 + Math.sin(t * 0.7) * w * 0.16;
  const my = h * 0.42 + Math.sin(t * 1.3) * h * 0.06;
  const r = 86;
  const mg = c.createRadialGradient(mx - 24, my - 30, 8, mx, my, r);
  mg.addColorStop(0, "#ffe08a"); mg.addColorStop(1, "#f5a623");
  c.fillStyle = mg;
  c.beginPath(); c.arc(mx, my, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#241019";
  c.beginPath(); c.arc(mx - 30, my - 20, 10, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(mx + 30, my - 20, 10, 0, Math.PI * 2); c.fill();
  const open = (Math.sin(t * 2.2) * 0.5 + 0.5);
  c.beginPath();
  c.ellipse(mx, my + 28, 26, 6 + open * 24, 0, 0, Math.PI * 2);
  c.fill();

  // floating wordmark
  c.font = "700 44px 'Space Grotesk', system-ui, sans-serif";
  c.textAlign = "center";
  c.fillStyle = "rgba(245,236,255,0.85)";
  c.shadowColor = "#ff2ea6"; c.shadowBlur = 24;
  c.fillText("A R C A M", w * 0.5, h * 0.14 + Math.sin(t * 0.9) * 6);
  c.shadowBlur = 0;
  c.font = "500 17px 'Space Grotesk', system-ui, sans-serif";
  c.fillStyle = "rgba(157,143,184,0.9)";
  c.fillText("demo scene — switch to live camera anytime", w * 0.5, h * 0.14 + 30);
}

function setStageSize(w, h) {
  W = w; H = h;
  $("fxCanvas").width = w;
  $("fxCanvas").height = h;
  composite.width = w;
  composite.height = h;
  $("stage").style.aspectRatio = `${w} / ${h}`;
}

async function listDevices() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter((d) => d.kind === "videoinput");
    const sel = $("deviceSel");
    const cur = sel.value;
    sel.innerHTML = "";
    cams.forEach((d, i) => {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || `Camera ${i + 1}`;
      sel.appendChild(o);
    });
    if (!cams.length) {
      const o = document.createElement("option");
      o.textContent = "no camera found";
      sel.appendChild(o);
    }
    if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  } catch {}
}

async function startCamera(deviceId) {
  const [rw, rh] = $("resSel").value.split("x").map(Number);
  const constraints = {
    video: {
      width: { ideal: rw }, height: { ideal: rh },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
    },
    audio: false,
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (camStream) camStream.getTracks().forEach((t) => t.stop());
    camStream = stream;
    video.srcObject = stream;
    await video.play();
    await new Promise((res) => {
      if (video.videoWidth) return res();
      video.onloadedmetadata = () => res();
    });
    setStageSize(video.videoWidth || rw, video.videoHeight || rh);
    state.source = "camera";
    $("sourceSel").value = "camera";
    $("srcNote").textContent = "camera";
    $("camGate").classList.add("hidden");
    listDevices();
    persist();
    return true;
  } catch (e) {
    console.warn("Camera unavailable:", e.name);
    state.source = "demo";
    $("sourceSel").value = "demo";
    $("srcNote").textContent = "demo";
    setStageSize(1280, 720);
    $("camGate").classList.remove("hidden");
    return false;
  }
}

function stopCamera() {
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  video.srcObject = null;
}

function useDemo() {
  stopCamera();
  state.source = "demo";
  $("sourceSel").value = "demo";
  $("srcNote").textContent = "demo";
  $("camGate").classList.add("hidden");
  setStageSize(1280, 720);
  persist();
}

/* ── capture: composite, photo, recording ──────────────────── */

const composite = document.createElement("canvas");
const compCtx = composite.getContext("2d");
const glCanvas = $("glCanvas");
const fxCanvas = $("fxCanvas");
const fxCtx = fxCanvas.getContext("2d");

function drawComposite() {
  compCtx.drawImage(glCanvas, 0, 0, W, H);
  compCtx.drawImage(fxCanvas, 0, 0, W, H);
}

let modalUrl = null;

function showModal({ title, mediaEl, meta, filename, url }) {
  closeModal();
  modalUrl = url;
  $("modalTitle").textContent = title;
  const box = $("modalMedia");
  box.innerHTML = "";
  box.appendChild(mediaEl);
  $("modalMeta").textContent = meta;
  const dl = $("modalDownload");
  dl.href = url;
  dl.download = filename;
  $("modal").classList.remove("hidden");
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("modalMedia").innerHTML = "";
  if (modalUrl) { URL.revokeObjectURL(modalUrl); modalUrl = null; }
}

let countingDown = false;
async function runCountdown() {
  const n = +$("timerSel").value;
  if (!n || countingDown) return;
  countingDown = true;
  const el = $("countdown");
  el.classList.remove("hidden");
  for (let i = n; i > 0; i--) {
    el.innerHTML = `<span>${i}</span>`;
    sfx.beep();
    await sleep(1000);
  }
  el.classList.add("hidden");
  sfx.go();
  countingDown = false;
}

async function takePhoto({ instant = false } = {}) {
  if (countingDown) return;
  if (!instant) await runCountdown();
  drawComposite();
  sfx.shutter();
  const flash = $("flash");
  flash.classList.remove("snap");
  void flash.offsetWidth;
  flash.classList.add("snap");
  composite.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    if (instant) {
      const a = document.createElement("a");
      a.href = url; a.download = `arcam-frame-${stamp}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Frame exported as PNG");
    } else {
      showModal({
        title: "Nice shot! 📸",
        mediaEl: img,
        meta: `PNG · ${W}×${H} · ${(blob.size / 1024).toFixed(0)} KB · ${fx().name}`,
        filename: `arcam-photo-${stamp}.png`,
        url,
      });
    }
  }, "image/png");
}

let recorder = null;
let recChunks = [];
let recStart = 0;
let micStream = null;
let recMime = "";

function pickMime() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

async function startRecording() {
  if (recorder || countingDown) return;
  await runCountdown();
  drawComposite();
  const fps = 30;
  const stream = composite.captureStream(fps);
  if (state.mic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      toast("Mic blocked — recording video only");
    }
  }
  recMime = pickMime();
  try {
    recorder = new MediaRecorder(stream, {
      ...(recMime ? { mimeType: recMime } : {}),
      videoBitsPerSecond: 8_000_000,
    });
  } catch (e) {
    console.error(e);
    toast("Recording not supported in this browser");
    sfx.error();
    recorder = null;
    return;
  }
  recChunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
  recorder.onstop = finishRecording;
  recorder.start(250);
  recStart = performance.now();
  $("recBtn").classList.add("recording");
  $("recBadge").classList.remove("hidden");
  $("micNote").classList.toggle("hot", state.mic && !!micStream);
  sfx.recStart();
}

function stopRecording() {
  if (recorder && recorder.state !== "inactive") recorder.stop();
}

function finishRecording() {
  const dur = (performance.now() - recStart) / 1000;
  const blob = new Blob(recChunks, { type: recMime || "video/webm" });
  recChunks = [];
  recorder = null;
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  $("recBtn").classList.remove("recording");
  $("recBadge").classList.add("hidden");
  $("micNote").classList.remove("hot");
  sfx.recStop();
  if (!blob.size) { toast("Clip was empty — try again"); return; }
  const url = URL.createObjectURL(blob);
  const vid = document.createElement("video");
  vid.src = url;
  vid.controls = true;
  vid.loop = true;
  vid.play().catch(() => {});
  const ext = (recMime || "video/webm").includes("mp4") ? "mp4" : "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  showModal({
    title: "That's a wrap! 🎬",
    mediaEl: vid,
    meta: `${ext.toUpperCase()} · ${dur.toFixed(1)}s · ${W}×${H} · ${(blob.size / 1048576).toFixed(1)} MB${state.mic ? " · with audio" : ""}`,
    filename: `arcam-clip-${stamp}.${ext}`,
    url,
  });
}

function toggleRecording() {
  if (recorder) stopRecording();
  else startRecording();
}

/* ── face tracking ─────────────────────────────────────────── */

const tracker = new FaceTracker((status) => { faceStatus = status; });
let faceStatus = "boot";

function updateFacePill() {
  const pill = $("facePill");
  let txt, cls;
  if (!state.tracking || faceStatus === "off") { txt = "face: off"; cls = "pill off"; }
  else if (tracker.fresh()) { txt = "face: locked"; cls = "pill live"; }
  else if (faceStatus === "boot") { txt = "face: boot"; cls = "pill"; }
  else { txt = "face: searching"; cls = "pill warn"; }
  pill.className = cls;
  pill.innerHTML = `<i class="dot"></i>${txt}`;
}

/* ── render loop ───────────────────────────────────────────── */

let gl;
const particles = new Particles();
const mouseNorm = [0.5, 0.5];   // texture-space (y up)
let mousePx = null;             // display-space pixels
let lastFrame = performance.now();
let fpsEMA = 60;
let frameCount = 0;
let pillTimer = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const t = now / 1000;
  frameCount++;

  // 1. pick source
  let source;
  if (state.source === "camera" && video.readyState >= 2 && video.videoWidth) {
    source = video;
  } else {
    drawDemo(t);
    source = demo;
  }

  // 2. GL pass
  const q = state.quality;
  gl.resize(Math.round(W * q), Math.round(H * q));
  const p = params();
  const col = colors();
  gl.render(source, t, {
    effect: fxIndex(),
    p1: p.p1, p2: p.p2, p3: p.p3, p4: p.p4,
    intensity: state.intensity,
    mirror: state.mirror,
    colorA: hexToVec3(col.a),
    colorB: hexToVec3(col.b),
    mouse: mouseNorm,
    glow: state.glow, grain: state.grain, vignette: state.vignette,
  });

  // 3. face pump (every 2nd frame, async & non-blocking)
  if (state.tracking && frameCount % 2 === 0) tracker.pump(source);

  // 4. overlay: stickers + particles
  fxCtx.clearRect(0, 0, W, H);
  const a = tracker.fresh()
    ? anchors(tracker.landmarks, W, H, state.mirror)
    : fallbackAnchors(W, H, t);
  const env = {
    W, H, mousePx,
    emit: (kind, x, y, n, s) => particles.emit(kind, x, y, n, s),
  };
  if (state.stickers.length) drawStickers(fxCtx, state.stickers, a, state.stickerSize, t, env);
  particles.ambient(W, H, state.sparkles, dt);
  particles.update(dt);
  particles.draw(fxCtx);

  // 5. recording composite + timer
  if (recorder && recorder.state === "recording") {
    drawComposite();
    const el = (now - recStart) / 1000;
    const mm = String(Math.floor(el / 60)).padStart(2, "0");
    const ss = String(Math.floor(el % 60)).padStart(2, "0");
    $("recTime").textContent = `${mm}:${ss}`;
    const limit = +$("clipSel").value;
    if (limit && el >= limit) stopRecording();
  }

  // 6. status pills
  fpsEMA = fpsEMA * 0.92 + (1 / Math.max(dt, 0.001)) * 0.08;
  pillTimer += dt;
  if (pillTimer > 0.5) {
    pillTimer = 0;
    $("fpsPill").textContent = `${Math.round(Math.min(fpsEMA, 240))} fps`;
    updateFacePill();
  }

  requestAnimationFrame(frame);
}

/* ── randomize / reset ─────────────────────────────────────── */

function randomize() {
  const f = EFFECTS[(Math.random() * EFFECTS.length) | 0];
  state.fxKey = f.key;
  const p = {};
  for (const meta of f.params) {
    p["p" + meta.p] = meta.min + Math.random() * (meta.max - meta.min);
    if (meta.step === 1) p["p" + meta.p] = Math.round(p["p" + meta.p]);
  }
  state.paramsByFx[f.key] = p;
  if (f.colors) {
    const hue = Math.random() * 360;
    state.colorsByFx[f.key] = {
      a: hslHex(hue, 95, 60),
      b: hslHex((hue + 120 + Math.random() * 120) % 360, 90, 60),
    };
  }
  state.glow = Math.random() * 0.6;
  state.grain = Math.random() * 0.4;
  state.vignette = Math.random() * 0.6;
  refreshAllControls();
  selectEffect(f.key, true);
  sfx.dice();
  toast(`🎲 ${f.name} — rolled fresh params`);
}

function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function resetTune() {
  state.paramsByFx[state.fxKey] = defaultParams(fx());
  state.intensity = 1;
  state.glow = 0.15; state.grain = 0.12; state.vignette = 0.25; state.sparkles = 0.25;
  if (fx().colors) state.colorsByFx[state.fxKey] = { a: "#ff2ea6", b: "#22d3ee" };
  refreshAllControls();
  buildParamSliders();
  syncColorRow();
  sfx.toggle();
  toast("Tuning reset to defaults");
  persist();
}

/* ── toggles & top bar ─────────────────────────────────────── */

function setToggle(btn, on) {
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-checked", String(on));
}

function syncMirror() {
  setToggle($("mirrorTgl"), state.mirror);
  $("mirrorBtn").classList.toggle("active", state.mirror);
}

const SOUND_ON_PATH = "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z";
const SOUND_OFF_PATH = "M3 9v6h4l5 5V4L7 9H3zm18.6 3 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4-2.1-2.1z";

function syncSound() {
  setSound(state.sound);
  $("soundPath").setAttribute("d", state.sound ? SOUND_ON_PATH : SOUND_OFF_PATH);
  $("soundBtn").classList.toggle("muted-state", !state.sound);
  $("soundBtn").classList.toggle("active", state.sound);
}

/* ── wiring ────────────────────────────────────────────────── */

function wire() {
  $("fxSearch").addEventListener("input", (e) => {
    state.search = e.target.value;
    buildGrid();
  });

  $("saveLookBtn").onclick = saveCurrentLook;
  $("resetBtn").onclick = resetTune;
  $("randomBtn").onclick = randomize;
  $("diceBtn").onclick = randomize;
  $("exportBtn").onclick = () => takePhoto({ instant: true });
  $("photoBtn").onclick = () => takePhoto();
  $("recBtn").onclick = toggleRecording;

  $("colorA").oninput = (e) => { colors().a = e.target.value; persist(); };
  $("colorB").oninput = (e) => { colors().b = e.target.value; persist(); };

  $("soundBtn").onclick = () => { state.sound = !state.sound; syncSound(); if (state.sound) sfx.toggle(); persist(); };
  $("mirrorBtn").onclick = () => { state.mirror = !state.mirror; syncMirror(); sfx.toggle(); persist(); };
  $("mirrorTgl").onclick = () => { state.mirror = !state.mirror; syncMirror(); sfx.toggle(); persist(); };

  $("micTgl").onclick = () => {
    state.mic = !state.mic;
    setToggle($("micTgl"), state.mic);
    $("micNote").textContent = state.mic ? "mic on" : "mic off";
    sfx.toggle(); persist();
  };
  $("trackTgl").onclick = () => {
    state.tracking = !state.tracking;
    tracker.enabled = state.tracking;
    setToggle($("trackTgl"), state.tracking);
    $("trackNote").textContent = state.tracking
      ? "Tracking loads locally (MediaPipe). No frame ever leaves your machine."
      : "Tracking paused — stickers float at frame center.";
    sfx.toggle(); updateFacePill(); persist();
  };

  $("sourceSel").onchange = async (e) => {
    if (e.target.value === "demo") { useDemo(); toast("Demo scene — every effect still works"); }
    else {
      const ok = await startCamera($("deviceSel").value || undefined);
      if (!ok) { toast("Camera blocked — staying in demo mode"); sfx.error(); }
    }
  };
  $("deviceSel").onchange = async (e) => {
    if (state.source === "camera") await startCamera(e.target.value);
  };
  $("resSel").onchange = async () => {
    if (state.source === "camera") {
      const ok = await startCamera($("deviceSel").value || undefined);
      if (ok) toast(`Resolution → ${$("resSel").selectedOptions[0].textContent}`);
    } else {
      const [rw, rh] = $("resSel").value.split("x").map(Number);
      demo.width = rw; demo.height = rh;
      setStageSize(rw, rh);
    }
  };
  $("qualitySel").onchange = (e) => { state.quality = +e.target.value; persist(); };

  $("retryCamBtn").onclick = async () => {
    const ok = await startCamera();
    if (ok) toast("Camera live 🎥");
    else { toast("Still blocked — check the camera icon in the address bar"); sfx.error(); }
  };
  $("demoBtn").onclick = () => { useDemo(); toast("Demo mode — play away!"); };

  $("helpBtn").onclick = () => $("helpModal").classList.remove("hidden");
  $("helpX").onclick = () => $("helpModal").classList.add("hidden");
  $("helpModal").addEventListener("click", (e) => {
    if (e.target === $("helpModal")) $("helpModal").classList.add("hidden");
  });

  $("modalX").onclick = closeModal;
  $("modalDiscard").onclick = () => { closeModal(); toast("Discarded"); };
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) closeModal();
  });
  $("modalDownload").addEventListener("click", () => {
    toast("Saved to your downloads ⤓");
    setTimeout(closeModal, 400);
  });

  // stage interaction: confetti + cursor-tracked effects
  const stage = $("stage");
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    mouseNorm[0] = nx;
    mouseNorm[1] = 1 - ny;
    mousePx = { x: nx * W, y: ny * H };
  });
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#camGate")) return;
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    particles.burst(x, y);
    sfx.sparkle();
  });

  // keyboard
  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (tag === "BUTTON") document.activeElement.blur();
      toggleRecording();
    }
    else if (e.key === "p" || e.key === "P") takePhoto();
    else if (e.key === "r" || e.key === "R") randomize();
    else if (e.key === "m" || e.key === "M") { state.mirror = !state.mirror; syncMirror(); persist(); }
    else if (e.key === "s" || e.key === "S") { state.sound = !state.sound; syncSound(); persist(); }
    else if (e.key === "?") $("helpModal").classList.remove("hidden");
    else if (e.key === "Escape") { closeModal(); $("helpModal").classList.add("hidden"); }
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const list = filteredEffects();
      if (!list.length) return;
      const i = list.findIndex((f) => f.key === state.fxKey);
      const next = e.key === "ArrowRight"
        ? list[(i + 1 + list.length) % list.length]
        : list[(i - 1 + list.length) % list.length];
      selectEffect(next.key);
    }
  });

  navigator.mediaDevices?.addEventListener?.("devicechange", listDevices);
}

/* ── boot ──────────────────────────────────────────────────── */

async function boot() {
  restore();
  try {
    gl = new GLPipeline(glCanvas);
  } catch (e) {
    document.body.innerHTML =
      `<div style="display:grid;place-items:center;height:100vh;color:#f5ecff;font-family:sans-serif;text-align:center;padding:20px">
        <div><h2>WebGL is unavailable 😢</h2><p style="color:#9d8fb8">ARCAM needs WebGL. Enable hardware acceleration in chrome://settings and reload.</p></div>
      </div>`;
    return;
  }

  buildCats();
  buildGrid();
  buildLooks();
  buildStickerGrid();
  buildParamSliders();
  syncColorRow();
  refreshAllControls();
  syncMirror();
  syncSound();
  setToggle($("micTgl"), state.mic);
  $("micNote").textContent = state.mic ? "mic on" : "mic off";
  setToggle($("trackTgl"), state.tracking);
  tracker.enabled = state.tracking;
  $("qualitySel").value = String(state.quality);
  for (const [id, key] of [["intensity", "intensity"], ["glow", "glow"], ["grain", "grain"],
                          ["vignette", "vignette"], ["sparkles", "sparkles"], ["stickerSize", "stickerSize"]]) {
    bindGlobalSlider(id, key);
  }
  $("effectTag").textContent = `${fx().emoji} ${fx().name}`;
  $("tuneName").textContent = fx().name;
  wire();

  setStageSize(1280, 720);
  requestAnimationFrame(frame);

  // camera & tracker load async — demo scene renders instantly meanwhile
  tracker.init();
  const ok = await startCamera();
  if (ok) toast("Camera live — pick an effect and play ✨");
}

boot();