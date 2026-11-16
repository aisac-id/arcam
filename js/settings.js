// Shared startup settings — edited on the Settings page (options.html),
// stored in chrome.storage.local so the sidebar and the full tab agree.

export const SETTINGS_KEY = "arcam-settings-v1";

export const DEFAULT_SETTINGS = {
  startEffect: "cinematic",   // effect key, or "last" to keep the previous session's
  startSource: "camera",      // "camera" | "demo"
  resolution: "1280x720",
  quality: 1,
  bitrate: 8,                 // Mbps for WebM recording
  timer: 0,                   // photo countdown seconds
  clip: 0,                    // clip auto-stop seconds (0 = unlimited)
  mirror: true,
  sound: true,
  tracking: true,
  mic: false,
};

export async function loadSettings() {
  try {
    const obj = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(obj[SETTINGS_KEY] || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}