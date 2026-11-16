// Face-anchored sticker renderer (2D overlay canvas).
// Landmarks: MediaPipe FaceMesh 468-point topology, normalized coords.

const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

// Build a friendly anchor set in canvas pixels.
export function anchors(lm, W, H, mirror) {
  const pt = (i) => ({
    x: (mirror ? 1 - lm[i].x : lm[i].x) * W,
    y: lm[i].y * H,
  });
  const eyeL = mid(pt(33), pt(133));
  const eyeR = mid(pt(362), pt(263));
  const faceW = dist(pt(234), pt(454));
  const angle = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const mouth = mid(pt(13), pt(14));
  const mouthOpen = dist(pt(13), pt(14)) / Math.max(faceW, 1);
  return {
    pt, eyeL, eyeR, faceW, angle, mouth, mouthOpen,
    eyesMid: mid(eyeL, eyeR),
    forehead: pt(10), nose: pt(4), chin: pt(152),
    cheekL: pt(50), cheekR: pt(280), upperLip: pt(0),
  };
}

// Fallback anchors when no face is present — keeps stickers alive & centered.
export function fallbackAnchors(W, H, t) {
  const sway = Math.sin(t * 0.8) * W * 0.01;
  const bob = Math.sin(t * 1.1) * H * 0.012;
  const cx = W / 2 + sway, cy = H * 0.44 + bob;
  const faceW = W * 0.26;
  const eyeL = { x: cx - faceW * 0.22, y: cy };
  const eyeR = { x: cx + faceW * 0.22, y: cy };
  return {
    pt: null, eyeL, eyeR, faceW, angle: 0,
    eyesMid: { x: cx, y: cy },
    mouth: { x: cx, y: cy + faceW * 0.34 },
    mouthOpen: 0.1 + 0.08 * Math.sin(t * 2.2),
    forehead: { x: cx, y: cy - faceW * 0.42 },
    nose: { x: cx, y: cy + faceW * 0.16 },
    chin: { x: cx, y: cy + faceW * 0.5 },
    cheekL: { x: cx - faceW * 0.34, y: cy + faceW * 0.2 },
    cheekR: { x: cx + faceW * 0.34, y: cy + faceW * 0.2 },
    upperLip: { x: cx, y: cy + faceW * 0.28 },
    fallback: true,
  };
}

function heart(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.32);
  ctx.bezierCurveTo(s * 0.5, -s * 0.28, s * 1.1, s * 0.18, 0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.1, s * 0.18, -s * 0.5, -s * 0.28, 0, s * 0.32);
  ctx.closePath();
}

function withFrame(ctx, a, x, y, scale, fn, rot = true) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(a.angle);
  ctx.scale(scale, scale);
  fn();
  ctx.restore();
}

// Each draw fn works in units of face width (a.faceW * size).
const DRAW = {
  shades(ctx, a, s, t) {
    withFrame(ctx, a, a.eyesMid.x, a.eyesMid.y, s, () => {
      const w = 0.34, h = 0.2, gap = 0.055;
      const grad = ctx.createLinearGradient(-w, -h, w, h);
      grad.addColorStop(0, "#22d3ee"); grad.addColorStop(0.5, "#7c3aed"); grad.addColorStop(1, "#ff2ea6");
      ctx.lineWidth = 0.035; ctx.strokeStyle = "#14082a";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        const x = side * (gap + w / 2) - w / 2;
        ctx.roundRect(x, -h / 2, w, h, 0.06);
        ctx.fillStyle = grad; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 0.05, -h / 2 + 0.05); ctx.lineTo(x + w * 0.45, -h / 2 + 0.05);
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.022; ctx.stroke();
        ctx.strokeStyle = "#14082a"; ctx.lineWidth = 0.035;
      }
      ctx.beginPath(); ctx.moveTo(-gap, -0.02); ctx.quadraticCurveTo(0, -0.06, gap, -0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-gap - w, -0.02); ctx.lineTo(-gap - w - 0.16, -0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gap + w, -0.02); ctx.lineTo(gap + w + 0.16, -0.06); ctx.stroke();
    });
  },

  deal(ctx, a, s, t) {
    withFrame(ctx, a, a.eyesMid.x, a.eyesMid.y, s, () => {
      ctx.fillStyle = "#0a0a0f";
      const w = 0.3, h = 0.16, gap = 0.04, px = 0.04;
      for (const side of [-1, 1]) {
        const x = side * (gap + w / 2) - w / 2;
        ctx.fillRect(x, -h / 2, w, h);
        ctx.fillRect(x + px, h / 2, w - px * 2, px);
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(x + px, -h / 2 + px, px * 2, px);
        ctx.fillStyle = "#0a0a0f";
      }
      ctx.fillRect(-gap, -h / 2, gap * 2, px);
      ctx.fillRect(-gap - w - 0.14, -h / 2, 0.14, px);
      ctx.fillRect(gap + w, -h / 2, 0.14, px);
    });
  },

  cat(ctx, a, s, t) {
    const wig = Math.sin(t * 3) * 0.03;
    for (const side of [-1, 1]) {
      withFrame(ctx, a, a.forehead.x + side * a.faceW * 0.3, a.forehead.y - a.faceW * 0.06, s, () => {
        ctx.rotate(side * (0.25 + wig));
        ctx.beginPath();
        ctx.moveTo(-0.14, 0.1); ctx.lineTo(0, -0.24); ctx.lineTo(0.14, 0.1); ctx.closePath();
        ctx.fillStyle = "#2a1440"; ctx.fill();
        ctx.strokeStyle = "#ff2ea6"; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-0.07, 0.06); ctx.lineTo(0, -0.13); ctx.lineTo(0.07, 0.06); ctx.closePath();
        ctx.fillStyle = "#ff7cc8"; ctx.fill();
      });
    }
  },

  dog(ctx, a, s, t) {
    for (const side of [-1, 1]) {
      withFrame(ctx, a, a.forehead.x + side * a.faceW * 0.38, a.forehead.y + a.faceW * 0.02, s, () => {
        ctx.rotate(side * (0.5 + Math.sin(t * 2.4) * 0.06));
        ctx.beginPath(); ctx.ellipse(0, 0.12, 0.1, 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#8a5a2b"; ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0.14, 0.055, 0.13, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#6b421c"; ctx.fill();
      });
    }
    withFrame(ctx, a, a.nose.x, a.nose.y, s, () => {
      ctx.beginPath(); ctx.ellipse(0, 0, 0.085, 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#241019"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-0.025, -0.018, 0.02, 0.012, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
    });
    if (a.mouthOpen > 0.05) {
      withFrame(ctx, a, a.mouth.x, a.mouth.y + a.faceW * 0.1, s, () => {
        const l = 0.12 + a.mouthOpen * 0.5;
        ctx.beginPath(); ctx.roundRect(-0.05, 0, 0.1, l, 0.05);
        ctx.fillStyle = "#ff6a8d"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0.02); ctx.lineTo(0, l - 0.03);
        ctx.strokeStyle = "#e14b70"; ctx.lineWidth = 0.015; ctx.stroke();
      });
    }
  },

  crown(ctx, a, s, t) {
    withFrame(ctx, a, a.forehead.x, a.forehead.y - a.faceW * 0.22 + Math.sin(t * 1.6) * a.faceW * 0.008, s, () => {
      const w = 0.42, h = 0.2;
      const grad = ctx.createLinearGradient(0, -h, 0, 0.05);
      grad.addColorStop(0, "#ffe08a"); grad.addColorStop(1, "#e8a417");
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w / 2, -h * 0.55); ctx.lineTo(-w * 0.25, -h * 0.25); ctx.lineTo(0, -h);
      ctx.lineTo(w * 0.25, -h * 0.25); ctx.lineTo(w / 2, -h * 0.55); ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = "#a86e08"; ctx.lineWidth = 0.018; ctx.stroke();
      for (const [jx, jy, c] of [[-w / 2, -h * 0.6, "#ff3b5c"], [0, -h * 1.04, "#22d3ee"], [w / 2, -h * 0.6, "#a3e635"]]) {
        ctx.beginPath(); ctx.arc(jx, jy, 0.032, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.fill();
        ctx.shadowColor = c; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.beginPath(); ctx.arc(0, -h * 0.28, 0.035, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2ea6"; ctx.fill();
    });
  },

  halo(ctx, a, s, t) {
    withFrame(ctx, a, a.forehead.x, a.forehead.y - a.faceW * (0.3 + Math.sin(t * 2) * 0.015), s, () => {
      ctx.beginPath(); ctx.ellipse(0, 0, 0.26, 0.07, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd75e"; ctx.lineWidth = 0.045;
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 18;
      ctx.stroke(); ctx.stroke(); ctx.shadowBlur = 0;
    });
  },

  mustache(ctx, a, s, t) {
    withFrame(ctx, a, a.upperLip.x, a.upperLip.y + a.faceW * 0.015, s, () => {
      ctx.fillStyle = "#3a2417";
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.1, -0.05, 0.2, -0.04, 0.26, -0.09);
        ctx.bezierCurveTo(0.3, -0.11, 0.32, -0.06, 0.28, -0.02);
        ctx.bezierCurveTo(0.2, 0.05, 0.08, 0.055, 0, 0.03);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    });
  },

  hearts(ctx, a, s, t) {
    const pulse = 1 + Math.sin(t * 5) * 0.09;
    for (const e of [a.eyeL, a.eyeR]) {
      withFrame(ctx, a, e.x, e.y - a.faceW * 0.02, s * pulse, () => {
        heart(ctx, 0.14);
        ctx.fillStyle = "#ff2e63";
        ctx.shadowColor = "#ff2e63"; ctx.shadowBlur = 14;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(-0.045, 0.045, 0.022, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.fill();
      });
    }
  },

  laser(ctx, a, s, t, env) {
    const target = env.mousePx || { x: env.W * 0.5, y: env.H };
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of [a.eyeL, a.eyeR]) {
      const flick = 0.75 + 0.25 * Math.sin(t * 31 + e.x);
      const grad = ctx.createLinearGradient(e.x, e.y, target.x, target.y);
      grad.addColorStop(0, "rgba(255,80,80,0.95)");
      grad.addColorStop(1, "rgba(255,160,40,0.55)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = s * 0.028 * flick;
      ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(target.x, target.y); ctx.stroke();
      ctx.lineWidth = s * 0.01;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(target.x, target.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(e.x, e.y, s * 0.045 * flick, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,120,90,0.9)"; ctx.fill();
    }
    const burst = a.faceW * 0.06 * (1 + 0.3 * Math.sin(t * 22));
    const rg = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, burst * 2.4);
    rg.addColorStop(0, "rgba(255,240,180,0.95)");
    rg.addColorStop(0.4, "rgba(255,120,50,0.6)");
    rg.addColorStop(1, "rgba(255,60,30,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(target.x, target.y, burst * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  fire(ctx, a, s, t, env) {
    if (a.mouthOpen > 0.045) {
      env.emit("fire", a.mouth.x, a.mouth.y, Math.min(6, 1 + a.mouthOpen * 40), s);
    }
    withFrame(ctx, a, a.mouth.x, a.mouth.y, s, () => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.1);
      const alpha = Math.min(0.65, a.mouthOpen * 6);
      g.addColorStop(0, `rgba(255,200,90,${alpha})`);
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, Math.PI * 2); ctx.fill();
    });
  },

  rainbow(ctx, a, s, t, env) {
    if (a.mouthOpen > 0.045) {
      env.emit("rainbow", a.mouth.x, a.mouth.y, Math.min(7, 2 + a.mouthOpen * 40), s);
    }
  },

  mesh(ctx, a, s, t, env) {
    if (!a.pt) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(34,211,238,0.55)";
    ctx.lineWidth = Math.max(1, a.faceW * 0.004);
    ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < FACE_OVAL.length; i++) {
      const p = a.pt(FACE_OVAL[i]);
      ctx[i ? "lineTo" : "moveTo"](p.x, p.y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "rgba(124,200,255,0.5)";
    for (let i = 0; i < 468; i += 3) {
      const p = a.pt(i);
      ctx.fillRect(p.x, p.y, 1.6, 1.6);
    }
    // scanning highlight
    const scanY = a.forehead.y + ((t * 0.35) % 1) * (a.chin.y - a.forehead.y);
    ctx.strokeStyle = "rgba(163,230,53,0.7)";
    ctx.beginPath();
    ctx.moveTo(a.eyesMid.x - a.faceW * 0.55, scanY);
    ctx.lineTo(a.eyesMid.x + a.faceW * 0.55, scanY);
    ctx.stroke();
    ctx.restore();
  },

  blush(ctx, a, s, t) {
    for (const c of [a.cheekL, a.cheekR]) {
      withFrame(ctx, a, c.x, c.y, s, () => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.11);
        g.addColorStop(0, "rgba(255,110,170,0.55)");
        g.addColorStop(1, "rgba(255,110,170,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,140,190,0.7)"; ctx.lineWidth = 0.012;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 0.035 - 0.015, -0.03); ctx.lineTo(i * 0.035 + 0.015, 0.03);
          ctx.stroke();
        }
      });
    }
  },

  tears(ctx, a, s, t, env) {
    for (const e of [a.eyeL, a.eyeR]) {
      withFrame(ctx, a, e.x, e.y + a.faceW * 0.06, s, () => {
        const streamH = 0.34 + Math.sin(t * 3 + e.x) * 0.03;
        const g = ctx.createLinearGradient(0, 0, 0, streamH);
        g.addColorStop(0, "rgba(120,200,255,0.85)");
        g.addColorStop(1, "rgba(120,200,255,0.15)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.roundRect(-0.035, 0, 0.07, streamH, 0.03); ctx.fill();
        const dropY = ((t * 0.5 + e.x) % 1) * streamH;
        ctx.beginPath(); ctx.ellipse(0, dropY, 0.045, 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(170,220,255,0.9)"; ctx.fill();
      });
    }
  },

  clown(ctx, a, s, t) {
    withFrame(ctx, a, a.nose.x, a.nose.y, s, () => {
      const g = ctx.createRadialGradient(-0.02, -0.02, 0.01, 0, 0, 0.085);
      g.addColorStop(0, "#ff8a8a"); g.addColorStop(1, "#e01235");
      ctx.beginPath(); ctx.arc(0, 0, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.shadowColor = "#ff3b5c"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    });
    for (const c of [a.cheekL, a.cheekR]) {
      withFrame(ctx, a, c.x, c.y, s, () => {
        ctx.beginPath(); ctx.arc(0, 0, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,60,90,0.6)"; ctx.fill();
      });
    }
    for (const e of [a.eyeL, a.eyeR]) {
      withFrame(ctx, a, e.x, e.y - a.faceW * 0.09, s, () => {
        ctx.beginPath();
        ctx.moveTo(0, -0.06); ctx.lineTo(0.035, 0); ctx.lineTo(0, 0.06); ctx.lineTo(-0.035, 0);
        ctx.closePath();
        ctx.fillStyle = "rgba(60,120,255,0.75)"; ctx.fill();
      });
    }
  },
};

export function drawStickers(ctx, keys, a, size, t, env) {
  const s = a.faceW * size;
  for (const k of keys) {
    const fn = DRAW[k];
    if (fn) {
      ctx.save();
      fn(ctx, a, s, t, env);
      ctx.restore();
    }
  }
}