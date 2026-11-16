// Particle system — ambient sparkles, click confetti, mouth fire & rainbow.

const PALETTE = ["#ff2ea6", "#22d3ee", "#a3e635", "#fbbf24", "#7c3aed", "#ff6a3d"];
const RAINBOW = ["#ff3b5c", "#ff9f1c", "#ffe74c", "#a3e635", "#22d3ee", "#7c3aed", "#ff2ea6"];

export class Particles {
  constructor() {
    this.list = [];
    this.sparkleAcc = 0;
  }

  burst(x, y, n = 42) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 420;
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140,
        life: 0, ttl: 0.9 + Math.random() * 0.9,
        size: 3 + Math.random() * 6,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        shape: Math.random() < 0.5 ? "rect" : "dot",
        spin: (Math.random() - 0.5) * 12,
        rot: Math.random() * Math.PI,
        g: 620,
      });
    }
  }

  emit(kind, x, y, n, scale) {
    for (let i = 0; i < n; i++) {
      if (kind === "fire") {
        this.list.push({
          x: x + (Math.random() - 0.5) * scale * 0.06,
          y,
          vx: (Math.random() - 0.5) * 90,
          vy: 60 + Math.random() * 160,
          life: 0, ttl: 0.5 + Math.random() * 0.5,
          size: scale * (0.02 + Math.random() * 0.035),
          color: ["#ffe08a", "#ffb03a", "#ff6a3d", "#ff3b5c"][(Math.random() * 4) | 0],
          shape: "glow", g: -180, rot: 0, spin: 0,
        });
      } else if (kind === "rainbow") {
        const idx = (Math.random() * RAINBOW.length) | 0;
        this.list.push({
          x: x + (Math.random() - 0.5) * scale * 0.05,
          y,
          vx: 40 + Math.random() * 130,
          vy: 40 + idx * 22,
          life: 0, ttl: 0.8 + Math.random() * 0.6,
          size: scale * 0.022,
          color: RAINBOW[idx],
          shape: "dot", g: 480, rot: 0, spin: 0,
        });
      }
    }
  }

  ambient(W, H, amount, dt) {
    this.sparkleAcc += amount * 26 * dt;
    while (this.sparkleAcc >= 1) {
      this.sparkleAcc -= 1;
      this.list.push({
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 24,
        vy: -(30 + Math.random() * 70),
        life: 0, ttl: 3 + Math.random() * 3,
        size: 1 + Math.random() * 2.6,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        shape: "spark", g: 0, rot: 0, spin: 0,
      });
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life += dt;
      if (p.life >= p.ttl) { l.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= 1 - 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    if (l.length > 900) l.splice(0, l.length - 900);
  }

  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.life / p.ttl;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.shape === "glow") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        g.addColorStop(0, p.color);
        g.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === "spark") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}