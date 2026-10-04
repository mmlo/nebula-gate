import { TAU, angleDiff } from './util.js';

function make(x, y, vx, vy, color, r) {
  return {
    x, y, vx, vy, color, r,
    grazed: false,
    life: 8,
    friendly: false,
  };
}

export function spread(x, y, tx, ty, speed, count, arc, color, r) {
  const base = Math.atan2(ty - y, tx - x);
  const out = [];
  const n = Math.max(1, count | 0);
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? base : base - arc / 2 + (arc * i) / (n - 1);
    out.push(make(x, y, Math.cos(a) * speed, Math.sin(a) * speed, color, r));
  }
  return out;
}

export function ring(x, y, speed, count, rot, gapAngle, gapWidth, color, r) {
  const out = [];
  const n = Math.max(1, count | 0);
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    if (gapWidth > 0 && gapAngle != null && Math.abs(angleDiff(a, gapAngle)) < gapWidth) continue;
    out.push(make(x, y, Math.cos(a) * speed, Math.sin(a) * speed, color, r));
  }
  return out;
}

export function aimedPair(x, y, tx, ty, speed, color, r) {
  return spread(x, y, tx, ty, speed, 2, 0.2, color, r);
}
