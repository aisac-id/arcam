// ARCAM Settings page — reads/writes startup defaults in chrome.storage.local.
import { EFFECTS } from "./effects.js";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings.js";

const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULT_SETTINGS };

const SELECTS = ["startEffect", "startSource", "resolution", "quality", "bitrate", "timer", "clip"];
const TOGGLES = ["mirror", "sound", "tracking", "mic"];

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  }, 2200);
}

function paint() {
  for (const id of SELECTS) $(id).value = String(settings[id]);
  for (const id of TOGGLES) {
    $(id).classList.toggle("on", !!settings[id]);
    $(id).setAttribute("aria-checked", String(!!settings[id]));
  }
}

let saveTimer = null;
function persist(msg) {
  const pill = $("saveState");
  pill.textContent = "saving…";
  pill.classList.add("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await saveSettings(settings);
    pill.textContent = "all changes saved";
    pill.classList.remove("saving");
    if (msg) toast(msg);
  }, 250);
}

function buildEffectSelect() {
  const sel = $("startEffect");
  const last = document.createElement("option");
  last.value = "last";
  last.textContent = "↺ Last used effect";
  sel.appendChild(last);
  for (const f of EFFECTS) {
    const o = document.createElement("option");
    o.value = f.key;
    o.textContent = `${f.emoji} ${f.name}`;
    sel.appendChild(o);
  }
}

function wire() {
  for (const id of SELECTS) {
    $(id).onchange = () => {
      const numeric = ["quality", "bitrate", "timer", "clip"].includes(id);
      settings[id] = numeric ? +$(id).value : $(id).value;
      persist();
    };
  }
  for (const id of TOGGLES) {
    $(id).onclick = () => {
      settings[id] = !settings[id];
      $(id).classList.toggle("on", settings[id]);
      $(id).setAttribute("aria-checked", String(settings[id]));
      persist();
    };
  }
  $("resetBtn").onclick = () => {
    settings = { ...DEFAULT_SETTINGS };
    paint();
    persist("Settings reset to defaults");
  };
  $("openBtn").onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") });
  };
}

async function boot() {
  buildEffectSelect();
  settings = await loadSettings();
  paint();
  wire();
}

boot();