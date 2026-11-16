// WebGL effect pipeline — one fullscreen pass, 23 effect branches + shared post.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uGlyph;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform float uMirror;
uniform int uEffect;
uniform float uP1, uP2, uP3, uP4;
uniform vec3 uColorA, uColorB;
uniform vec2 uMouse;
uniform float uGlow, uGrain, uVignette;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 tex(vec2 uv) { return texture2D(uTex, clamp(uv, 0.002, 0.998)).rgb; }

vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
vec3 sat(vec3 c, float s) { return mix(vec3(luma(c)), c, s); }

vec3 thermalPalette(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.0, 0.0, 0.25), vec3(0.5, 0.0, 0.6), smoothstep(0.0, 0.3, t));
  c = mix(c, vec3(0.95, 0.1, 0.1), smoothstep(0.3, 0.55, t));
  c = mix(c, vec3(1.0, 0.65, 0.0), smoothstep(0.55, 0.8, t));
  c = mix(c, vec3(1.0, 1.0, 0.85), smoothstep(0.8, 1.0, t));
  return c;
}

vec3 blur8(vec2 uv, float r) {
  vec2 px = r / uRes;
  vec3 s = tex(uv) * 0.2;
  s += tex(uv + vec2( px.x, 0.0)) * 0.1;
  s += tex(uv + vec2(-px.x, 0.0)) * 0.1;
  s += tex(uv + vec2(0.0,  px.y)) * 0.1;
  s += tex(uv + vec2(0.0, -px.y)) * 0.1;
  s += tex(uv + px * 0.7) * 0.1;
  s += tex(uv - px * 0.7) * 0.1;
  s += tex(uv + vec2(px.x, -px.y) * 0.7) * 0.1;
  s += tex(uv + vec2(-px.x, px.y) * 0.7) * 0.1;
  return s;
}

void main() {
  vec2 uv = vUv;
  if (uMirror > 0.5) uv.x = 1.0 - uv.x;
  vec3 orig = tex(uv);
  vec3 col = orig;
  vec2 center = uv - 0.5;
  float aspect = uRes.x / uRes.y;

  if (uEffect == 0) {                                  // clean beauty
    vec3 soft = blur8(uv, 3.0 + uP1 * 5.0);
    col = mix(orig, soft, uP1 * 0.65);
    col.r += uP2 * 0.14; col.b -= uP2 * 0.12;
    col += uP3;
  }
  else if (uEffect == 1) {                             // cinematic
    float l = luma(orig);
    vec3 shadows = vec3(0.0, 0.32, 0.38);
    vec3 highs = vec3(1.0, 0.55, 0.22);
    vec3 tone = mix(shadows, highs, smoothstep(0.15, 0.85, l));
    col = mix(orig, orig * tone * 1.9, uP1 * 0.55);
    col = (col - 0.5) * uP2 + 0.5;
    col = sat(col, uP3);
  }
  else if (uEffect == 2) {                             // golden hour
    col = orig * vec3(1.0 + uP1 * 0.35, 1.0 + uP1 * 0.12, 1.0 - uP1 * 0.28);
    vec3 soft = blur8(uv, 8.0);
    col = mix(col, soft, uP2 * 0.45);
    col += vec3(0.16, 0.09, 0.0) * uP2;
    col = sat(col, 1.12);
  }
  else if (uEffect == 3) {                             // noir
    float l = luma(orig);
    l = (l - 0.5) * uP1 + 0.5;
    col = vec3(l);
    col += (hash(uv * uRes + fract(uTime) * 91.0) - 0.5) * uP2 * 0.32;
  }
  else if (uEffect == 4) {                             // vaporwave
    col = hueShift(orig, uP1 + sin(uTime * 0.4) * 0.25);
    float off = uP2 * 0.006;
    col.r = hueShift(tex(uv + vec2(off, 0.0)), uP1).r;
    col.b = hueShift(tex(uv - vec2(off, 0.0)), uP1).b;
    col *= 1.0 - uP3 * 0.22 * (0.5 + 0.5 * sin(uv.y * uRes.y * 2.4));
    col = sat(col, 1.4);
  }
  else if (uEffect == 5) {                             // duotone
    float l = (luma(orig) - 0.5) * uP1 + 0.5;
    col = mix(uColorA, uColorB, clamp(l, 0.0, 1.0));
  }
  else if (uEffect == 6) {                             // vhs
    vec2 w = uv;
    w.x += sin(uv.y * 80.0 + uTime * 7.0) * 0.0025 * uP1;
    w.x += (hash(vec2(floor(uv.y * 240.0), floor(uTime * 12.0))) - 0.5) * 0.008 * uP1;
    float off = 0.0035 * uP2;
    col.r = tex(w + vec2(off, 0.0)).r;
    col.g = tex(w).g;
    col.b = tex(w - vec2(off, 0.0)).b;
    float n = hash(w * uRes + fract(uTime * 3.7) * 173.0);
    col = mix(col, vec3(n), uP3 * 0.18);
    float bar = smoothstep(0.0, 0.12, abs(fract(uv.y - uTime * 0.07) - 0.5));
    col *= mix(1.18, 1.0, mix(1.0, bar, uP4));
    col *= 1.0 - 0.12 * (0.5 + 0.5 * sin(uv.y * uRes.y * 3.14159));
    col = sat(col, 0.82);
  }
  else if (uEffect == 7) {                             // glitch
    float band = floor(uv.y * 22.0);
    float t = floor(uTime * uP2);
    float h = hash(vec2(band, t));
    float gate = step(0.72, hash(vec2(band * 1.7, t)));
    vec2 g = uv;
    g.x += (h - 0.5) * 0.22 * uP1 * gate;
    float off = 0.008 * uP3 * (0.4 + gate);
    col.r = tex(g + vec2(off, 0.0)).r;
    col.g = tex(g).g;
    col.b = tex(g - vec2(off, 0.0)).b;
    col = mix(col, col.brg, gate * 0.25 * uP1);
  }
  else if (uEffect == 8) {                             // cyber scan
    float l = luma(orig);
    col = mix(orig, uColorA * (0.35 + l), uP2);
    float sweep = fract(uv.y - uTime * uP1);
    float beam = smoothstep(0.06, 0.0, abs(sweep - 0.5));
    col += uColorA * beam * 0.9;
    vec2 grid = abs(fract(uv * vec2(40.0 * aspect, 40.0)) - 0.5);
    float gline = smoothstep(0.46, 0.5, max(grid.x, grid.y));
    col += uColorA * gline * uP3 * 0.25;
    col *= 0.9 + 0.1 * sin(uv.y * uRes.y * 2.0);
  }
  else if (uEffect == 9) {                             // thermal
    float l = luma(orig) * uP1;
    float edge = abs(luma(tex(uv + vec2(2.0 / uRes.x, 0.0))) - luma(tex(uv - vec2(2.0 / uRes.x, 0.0))))
               + abs(luma(tex(uv + vec2(0.0, 2.0 / uRes.y))) - luma(tex(uv - vec2(0.0, 2.0 / uRes.y))));
    l += edge * uP2 * 2.2;
    col = thermalPalette(l);
  }
  else if (uEffect == 10) {                            // night vision
    float l = luma(orig) * uP1;
    float n = hash(uv * uRes + fract(uTime * 5.0) * 271.0);
    l += (n - 0.5) * uP2 * 0.4;
    col = vec3(0.12, 1.0, 0.28) * l;
    col *= 1.0 - 0.16 * (0.5 + 0.5 * sin(uv.y * uRes.y * 2.6));
    float d = length(center * vec2(aspect, 1.0));
    col *= 1.0 - smoothstep(0.55, 0.95, d) * 0.75;
  }
  else if (uEffect == 11) {                            // pixel art
    vec2 cells = uRes / max(uP1, 2.0);
    vec2 puv = (floor(uv * cells) + 0.5) / cells;
    col = tex(puv);
    float levels = max(uP2, 2.0);
    col = floor(col * levels + 0.5) / levels;
    col = sat(col, 1.3);
  }
  else if (uEffect == 12) {                            // ascii
    float cell = max(uP1, 4.0);
    vec2 grid = uRes / cell;
    vec2 cid = floor(uv * grid);
    vec2 cuv = fract(uv * grid);
    vec3 c = tex((cid + 0.5) / grid);
    float l = luma(c);
    float idx = floor(clamp(l, 0.0, 0.999) * 10.0);
    float g = texture2D(uGlyph, vec2((idx + cuv.x) / 10.0, cuv.y)).r;
    vec3 ink = mix(vec3(0.35, 1.0, 0.55), c * 1.7 + 0.12, uP2);
    col = ink * g + vec3(0.01, 0.015, 0.03);
  }
  else if (uEffect == 13) {                            // halftone
    float cell = max(uP1, 3.0);
    float cs = cos(uP2), sn = sin(uP2);
    vec2 p = uv * uRes;
    p = mat2(cs, -sn, sn, cs) * p;
    vec2 cid = floor(p / cell);
    vec2 cuv = fract(p / cell) - 0.5;
    vec2 sp = (cid + 0.5) * cell;
    sp = mat2(cs, sn, -sn, cs) * sp / uRes;
    vec3 c = tex(sp);
    float r = (1.0 - luma(c)) * 0.62;
    float dot_ = smoothstep(r, r - 0.12, length(cuv));
    vec3 paper = vec3(0.97, 0.94, 0.88);
    vec3 ink = mix(vec3(0.07, 0.03, 0.12), c * 0.55, uP3);
    col = mix(paper, ink, dot_);
  }
  else if (uEffect == 14) {                            // pop art x4
    vec2 q = fract(uv * 2.0);
    q = (q - 0.5) / uP2 + 0.5;
    vec3 c = tex(q);
    float levels = max(uP1, 2.0);
    c = floor(c * levels + 0.5) / levels;
    float l = luma(c);
    vec2 id = floor(uv * 2.0);
    float which = id.x + id.y * 2.0;
    vec3 a, b;
    if (which < 0.5)      { a = vec3(1.0, 0.13, 0.55); b = vec3(1.0, 0.92, 0.2); }
    else if (which < 1.5) { a = vec3(0.1, 0.12, 0.6);  b = vec3(0.25, 0.95, 0.95); }
    else if (which < 2.5) { a = vec3(0.4, 0.05, 0.5);  b = vec3(1.0, 0.45, 0.12); }
    else                  { a = vec3(0.02, 0.3, 0.2); b = vec3(0.7, 1.0, 0.25); }
    col = mix(a, b, l);
    vec2 edge = abs(fract(uv * 2.0) - 0.5);
    col = mix(vec3(0.04, 0.01, 0.08), col, smoothstep(0.5, 0.487, max(edge.x, edge.y)));
  }
  else if (uEffect == 15) {                            // kaleidoscope
    vec2 p = center * vec2(aspect, 1.0);
    float r = length(p) / uP3;
    float a = atan(p.y, p.x) + uTime * uP2;
    float seg = 6.28318 / max(uP1, 3.0);
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    vec2 kuv = vec2(cos(a), sin(a)) * r;
    kuv = kuv / vec2(aspect, 1.0) + 0.5;
    col = tex(kuv);
    col = sat(col, 1.25);
  }
  else if (uEffect == 16) {                            // mirror house
    vec2 m = uv;
    if (uP1 < 0.5)      { m.x = 0.5 - abs(m.x - 0.5); m.x = m.x * 2.0; }
    else if (uP1 < 1.5) { m.y = 0.5 - abs(m.y - 0.5); m.y = m.y * 2.0; }
    else                { m = 0.5 - abs(m - 0.5); m *= 2.0; }
    m = (m - 0.5) / uP2 + 0.5;
    col = tex(m);
  }
  else if (uEffect == 17) {                            // swirl
    vec2 p = center * vec2(aspect, 1.0);
    float r = length(p);
    float twist = uP1 * (1.0 + uP3 * sin(uTime * 1.3) * 0.6);
    float amt = twist * smoothstep(uP2, 0.0, r);
    float cs = cos(amt), sn = sin(amt);
    p = mat2(cs, -sn, sn, cs) * p;
    col = tex(p / vec2(aspect, 1.0) + 0.5);
  }
  else if (uEffect == 18) {                            // fisheye
    vec2 p = center * vec2(aspect, 1.0);
    float r = length(p);
    float k = 1.0 + uP1 * r * r * 2.4;
    p = p * k / uP2;
    col = tex(p / vec2(aspect, 1.0) + 0.5);
  }
  else if (uEffect == 19) {                            // ripple (follows cursor)
    vec2 mpos = uMouse;
    if (uMirror > 0.5) mpos.x = 1.0 - mpos.x;
    vec2 d = (uv - mpos) * vec2(aspect, 1.0);
    float dist = length(d);
    float wave = sin(dist * uP2 - uTime * uP3) * uP1 * 0.03;
    wave *= smoothstep(0.9, 0.0, dist);
    vec2 ruv = uv + normalize(d + 0.0001) * wave / vec2(aspect, 1.0);
    col = tex(ruv);
    col += vec3(0.06, 0.1, 0.14) * abs(wave) * 18.0;
  }
  else if (uEffect == 20) {                            // rgb split
    float pulse = 1.0 + uP3 * sin(uTime * 2.6) * 0.7;
    vec2 dir = vec2(cos(uP2), sin(uP2)) * uP1 * 0.014 * pulse;
    col.r = tex(uv + dir).r;
    col.g = tex(uv).g;
    col.b = tex(uv - dir).b;
  }
  else if (uEffect == 21) {                            // dream bloom
    vec3 soft = blur8(uv, 4.0 + uP1 * 14.0);
    col = mix(orig, soft, uP1 * 0.75);
    float l = luma(soft);
    col += soft * smoothstep(0.45, 0.95, l) * uP2 * 0.85;
    col = sat(col, uP3);
  }
  else if (uEffect == 22) {                            // negative
    col = 1.0 - orig;
    col = hueShift(col, uP1);
  }

  // intensity blend against the untouched frame
  col = mix(orig, col, uIntensity);

  // shared atmosphere: glow, grain, vignette
  if (uGlow > 0.003) {
    vec3 soft = blur8(uv, 12.0);
    col += soft * smoothstep(0.5, 1.0, luma(soft)) * uGlow * 0.7;
  }
  if (uGrain > 0.003) {
    col += (hash(vUv * uRes + fract(uTime * 7.13) * 313.0) - 0.5) * uGrain * 0.22;
  }
  if (uVignette > 0.003) {
    float d = distance(vUv, vec2(0.5));
    col *= 1.0 - uVignette * smoothstep(0.32, 0.85, d);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error("Shader: " + gl.getShaderInfoLog(s));
  }
  return s;
}

function makeGlyphAtlas() {
  const chars = " .:-=+*#%@";
  const cell = 64;
  const c = document.createElement("canvas");
  c.width = cell * chars.length;
  c.height = cell;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 52px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * cell + cell / 2, cell / 2 + 3);
  }
  return c;
}

export class GLPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Link: " + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    for (const n of ["uTex","uGlyph","uRes","uTime","uIntensity","uMirror","uEffect",
                     "uP1","uP2","uP3","uP4","uColorA","uColorB","uMouse","uGlow","uGrain","uVignette"]) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }

    this.tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(this.u.uTex, 0);

    this.glyphTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeGlyphAtlas());
    gl.uniform1i(this.u.uGlyph, 1);
    gl.activeTexture(gl.TEXTURE0);
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  // state: {effect, p1..p4, intensity, mirror, colorA:[r,g,b], colorB, mouse:[x,y], glow, grain, vignette}
  render(source, time, s) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform1f(this.u.uIntensity, s.intensity);
    gl.uniform1f(this.u.uMirror, s.mirror ? 1 : 0);
    gl.uniform1i(this.u.uEffect, s.effect);
    gl.uniform1f(this.u.uP1, s.p1 || 0);
    gl.uniform1f(this.u.uP2, s.p2 || 0);
    gl.uniform1f(this.u.uP3, s.p3 || 0);
    gl.uniform1f(this.u.uP4, s.p4 || 0);
    gl.uniform3fv(this.u.uColorA, s.colorA);
    gl.uniform3fv(this.u.uColorB, s.colorB);
    gl.uniform2fv(this.u.uMouse, s.mouse);
    gl.uniform1f(this.u.uGlow, s.glow);
    gl.uniform1f(this.u.uGrain, s.grain);
    gl.uniform1f(this.u.uVignette, s.vignette);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

export function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}