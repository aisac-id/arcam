// Effect metadata — index maps to uEffect in the shader.
// params: generic floats p1..p4 with UI labels/ranges.

export const CATEGORIES = ["All", "Vibe", "Retro", "Distort", "Art", "Tech"];

export const EFFECTS = [
  { key: "clean",    name: "Clean Beauty", emoji: "✨", cat: "Vibe",
    params: [
      { p: 1, label: "Smooth",   min: 0, max: 1,  def: 0.45 },
      { p: 2, label: "Warmth",   min: -0.5, max: 0.5, def: 0.08 },
      { p: 3, label: "Bright",   min: -0.3, max: 0.3, def: 0.04 },
    ] },
  { key: "cinematic", name: "Cinematic",  emoji: "🎬", cat: "Vibe",
    params: [
      { p: 1, label: "Teal-Orange", min: 0, max: 1, def: 0.6 },
      { p: 2, label: "Contrast",    min: 0.6, max: 1.6, def: 1.12 },
      { p: 3, label: "Saturation",  min: 0, max: 2, def: 1.15 },
    ] },
  { key: "golden",   name: "Golden Hour", emoji: "🌅", cat: "Vibe",
    params: [
      { p: 1, label: "Warmth", min: 0, max: 1, def: 0.6 },
      { p: 2, label: "Haze",   min: 0, max: 1, def: 0.35 },
    ] },
  { key: "noir",     name: "Film Noir",  emoji: "🎞️", cat: "Retro",
    params: [
      { p: 1, label: "Contrast", min: 0.6, max: 2, def: 1.35 },
      { p: 2, label: "Grain",    min: 0, max: 1, def: 0.4 },
    ] },
  { key: "vapor",    name: "Vaporwave",  emoji: "🌆", cat: "Retro",
    params: [
      { p: 1, label: "Hue Drift", min: 0, max: 6.28, def: 2.2 },
      { p: 2, label: "Chroma",    min: 0, max: 1, def: 0.45 },
      { p: 3, label: "Scanlines", min: 0, max: 1, def: 0.35 },
    ] },
  { key: "duotone",  name: "Duotone",    emoji: "💜", cat: "Art", colors: true,
    params: [
      { p: 1, label: "Contrast", min: 0.5, max: 2, def: 1.1 },
    ] },
  { key: "vhs",      name: "VHS Tape",   emoji: "📼", cat: "Retro",
    params: [
      { p: 1, label: "Wobble",   min: 0, max: 1, def: 0.5 },
      { p: 2, label: "Chroma",   min: 0, max: 1, def: 0.55 },
      { p: 3, label: "Noise",    min: 0, max: 1, def: 0.4 },
      { p: 4, label: "Roll Bar", min: 0, max: 1, def: 0.5 },
    ] },
  { key: "glitch",   name: "Glitchcore", emoji: "⚡", cat: "Tech",
    params: [
      { p: 1, label: "Shift",    min: 0, max: 1, def: 0.5 },
      { p: 2, label: "Speed",    min: 0.5, max: 8, def: 3 },
      { p: 3, label: "RGB Split", min: 0, max: 1, def: 0.5 },
    ] },
  { key: "scan",     name: "Cyber Scan", emoji: "🤖", cat: "Tech", colors: true,
    params: [
      { p: 1, label: "Sweep Speed", min: 0.05, max: 1.5, def: 0.35 },
      { p: 2, label: "Tint",        min: 0, max: 1, def: 0.55 },
      { p: 3, label: "Grid",        min: 0, max: 1, def: 0.4 },
    ] },
  { key: "thermal",  name: "Thermal",    emoji: "🔥", cat: "Tech",
    params: [
      { p: 1, label: "Heat Gain", min: 0.5, max: 2, def: 1.1 },
      { p: 2, label: "Edge Heat", min: 0, max: 1, def: 0.35 },
    ] },
  { key: "night",    name: "Night Vision", emoji: "🥽", cat: "Tech",
    params: [
      { p: 1, label: "Gain",  min: 0.5, max: 2.5, def: 1.4 },
      { p: 2, label: "Noise", min: 0, max: 1, def: 0.35 },
    ] },
  { key: "pixel",    name: "Pixel Art",  emoji: "👾", cat: "Art",
    params: [
      { p: 1, label: "Pixel Size", min: 2, max: 40, def: 10 },
      { p: 2, label: "Palette",    min: 2, max: 16, def: 6 },
    ] },
  { key: "ascii",    name: "ASCII",      emoji: "⌨️", cat: "Art",
    params: [
      { p: 1, label: "Cell Size", min: 6, max: 26, def: 12 },
      { p: 2, label: "Colorize",  min: 0, max: 1, def: 0.55 },
    ] },
  { key: "halftone", name: "Comic Dots", emoji: "🗯️", cat: "Art",
    params: [
      { p: 1, label: "Dot Size", min: 4, max: 24, def: 9 },
      { p: 2, label: "Angle",    min: 0, max: 1.57, def: 0.5 },
      { p: 3, label: "Ink Mix",  min: 0, max: 1, def: 0.35 },
    ] },
  { key: "popart",   name: "Pop Art ×4", emoji: "🎨", cat: "Art",
    params: [
      { p: 1, label: "Posterize", min: 2, max: 8, def: 3 },
      { p: 2, label: "Zoom",      min: 1, max: 1.6, def: 1.1 },
    ] },
  { key: "kaleido",  name: "Kaleidoscope", emoji: "🔮", cat: "Distort",
    params: [
      { p: 1, label: "Segments", min: 3, max: 16, def: 8 },
      { p: 2, label: "Spin",     min: 0, max: 1.5, def: 0.25 },
      { p: 3, label: "Zoom",     min: 0.6, max: 2, def: 1 },
    ] },
  { key: "mirror",   name: "Mirror House", emoji: "🪞", cat: "Distort",
    params: [
      { p: 1, label: "Mode",  min: 0, max: 2, def: 0, step: 1 },
      { p: 2, label: "Zoom",  min: 0.8, max: 2, def: 1.1 },
    ] },
  { key: "swirl",    name: "Swirl",      emoji: "🌀", cat: "Distort",
    params: [
      { p: 1, label: "Twist",   min: -6, max: 6, def: 2.5 },
      { p: 2, label: "Radius",  min: 0.1, max: 1, def: 0.55 },
      { p: 3, label: "Animate", min: 0, max: 1, def: 0.3 },
    ] },
  { key: "fisheye",  name: "Fisheye",    emoji: "🐡", cat: "Distort",
    params: [
      { p: 1, label: "Bulge", min: -0.9, max: 0.9, def: 0.55 },
      { p: 2, label: "Zoom",  min: 0.6, max: 1.6, def: 1 },
    ] },
  { key: "ripple",   name: "Water Ripple", emoji: "💧", cat: "Distort",
    params: [
      { p: 1, label: "Amplitude", min: 0, max: 1, def: 0.4 },
      { p: 2, label: "Frequency", min: 5, max: 80, def: 32 },
      { p: 3, label: "Speed",     min: 0.5, max: 8, def: 3 },
    ] },
  { key: "rgb",      name: "RGB Split",  emoji: "🌈", cat: "Tech",
    params: [
      { p: 1, label: "Offset", min: 0, max: 1, def: 0.4 },
      { p: 2, label: "Angle",  min: 0, max: 6.28, def: 0 },
      { p: 3, label: "Pulse",  min: 0, max: 1, def: 0.5 },
    ] },
  { key: "dream",    name: "Dream Bloom", emoji: "☁️", cat: "Vibe",
    params: [
      { p: 1, label: "Softness", min: 0, max: 1, def: 0.55 },
      { p: 2, label: "Glow",     min: 0, max: 1, def: 0.5 },
      { p: 3, label: "Saturation", min: 0.5, max: 2, def: 1.2 },
    ] },
  { key: "negative", name: "Negative",   emoji: "🔄", cat: "Art",
    params: [
      { p: 1, label: "Hue Spin", min: 0, max: 6.28, def: 0 },
    ] },
];

export const STICKERS = [
  { key: "shades",   name: "Shades",     emoji: "🕶️" },
  { key: "deal",     name: "Deal With It", emoji: "😎" },
  { key: "cat",      name: "Cat Ears",   emoji: "🐱" },
  { key: "dog",      name: "Doggo",      emoji: "🐶" },
  { key: "crown",    name: "Crown",      emoji: "👑" },
  { key: "halo",     name: "Halo",       emoji: "😇" },
  { key: "mustache", name: "Mustache",   emoji: "🥸" },
  { key: "hearts",   name: "Heart Eyes", emoji: "😍" },
  { key: "laser",    name: "Laser Eyes", emoji: "👁️" },
  { key: "fire",     name: "Fire Breath", emoji: "🔥" },
  { key: "rainbow",  name: "Rainbow",    emoji: "🌈" },
  { key: "mesh",     name: "Cyber Mesh", emoji: "🕸️" },
  { key: "blush",    name: "Blush",      emoji: "🌸" },
  { key: "tears",    name: "Tears",      emoji: "😭" },
  { key: "clown",    name: "Clown",      emoji: "🤡" },
];

export function defaultParams(fx) {
  const o = {};
  for (const p of fx.params) o["p" + p.p] = p.def;
  return o;
}