import { PLAY_H, PLAY_W, VIEW_H, VIEW_W } from './const.js';

export function createBackground() {
  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      z: 0.25 + Math.random() * 1,
      s: Math.random() < 0.86 ? 1 : 2,
      c: Math.random() < 0.14 ? '#ff8ae2' : Math.random() < 0.28 ? '#8ef6ff' : '#e4e6ff',
    });
  }
  const blobs = [];
  const tones = ['rgba(92,28,150,0.22)', 'rgba(18,70,150,0.18)', 'rgba(150,30,110,0.12)'];
  for (let i = 0; i < 8; i++) {
    blobs.push({
      x: 30 + Math.random() * (PLAY_W - 60),
      y: Math.random() * PLAY_H,
      r: 60 + Math.random() * 100,
      color: tones[i % tones.length],
      s: 14 + Math.random() * 22,
    });
  }
  return { stars, blobs, t: 0 };
}

export function updateBackground(bg, dt) {
  bg.t += dt;
  for (const s of bg.stars) {
    s.y += (16 + 48 * s.z) * dt;
    if (s.y > VIEW_H + 2) {
      s.y = -2;
      s.x = Math.random() * VIEW_W;
    }
  }
  for (const b of bg.blobs) {
    b.y += b.s * dt;
    if (b.y - b.r > PLAY_H) {
      b.y = -b.r;
      b.x = 30 + Math.random() * (PLAY_W - 60);
    }
  }
}

export function drawStars(ctx, bg) {
  for (const s of bg.stars) {
    ctx.globalAlpha = 0.35 + s.z * 0.55;
    ctx.fillStyle = s.c;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

export function drawNebula(ctx, bg) {
  for (const b of bg.blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 8, b.x, b.y, b.r);
    g.addColorStop(0, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGate(ctx, x, y, t, intensity) {
  const k = Math.max(0, intensity);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 6; i >= 1; i--) {
    const alpha = (0.05 + i * 0.025) * Math.min(1.4, k);
    ctx.strokeStyle = i % 2 === 0 ? `rgba(94,246,255,${alpha})` : `rgba(255,79,216,${alpha})`;
    ctx.lineWidth = i === 1 ? 2 : 1.5;
    ctx.beginPath();
    const rot = t * 0.22 * (i % 2 === 0 ? 1 : -1);
    ctx.ellipse(0, 0, 14 * i, 22 * i, rot, 0, Math.PI * 2);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
  g.addColorStop(0, `rgba(255,255,255,${0.28 * Math.min(1, k)})`);
  g.addColorStop(0.4, `rgba(94,246,255,${0.12 * k})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
