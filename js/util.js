export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

export function hypot(x, y) {
  return Math.hypot(x, y);
}

export function multiplier(combo) {
  return 1 + Math.floor(Math.max(0, combo) / 10);
}

export function formatScore(n) {
  return String(Math.max(0, Math.floor(n || 0))).padStart(8, '0');
}

export function formatTime(s) {
  const sec = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function now() {
  const p = globalThis.performance;
  return p && p.now ? p.now() : Date.now();
}

/** Hit uses both radii. Graze is a ring around the ship out to grazeR. */
export function classifyProximity(dist, hitR, bulletR, grazeR) {
  if (dist <= hitR + bulletR) return 'hit';
  if (dist <= grazeR) return 'graze';
  return 'none';
}

export function bulletSpeed(game, base) {
  return base * (game.rank || 1);
}
