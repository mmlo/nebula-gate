import { PLAY_W } from './const.js';
import { createEnemy } from './enemies.js';
import { createBoss } from './boss.js';

export const WAVES = [
  { id: 1, name: 'SCOUT CHEVRONS', start: 0.6, end: 17 },
  { id: 2, name: 'SPIRAL MINES', start: 18, end: 36 },
  { id: 3, name: 'LANCE BATTERY', start: 37, end: 58 },
  { id: 4, name: 'DREADNOUGHT VESPER', start: 62, end: 9999, rewind: 58 },
];

export function currentWave(t) {
  let wave = WAVES[0];
  for (const w of WAVES) if (t >= w.start) wave = w;
  return wave;
}

export function rewindPoint(t) {
  if (t >= 58) return 58;
  let point = 0.4;
  for (const w of WAVES) {
    if (t >= w.start) point = w.rewind ?? w.start;
  }
  return point;
}

export function makeQueue() {
  const q = [];
  const drone = (t, x, slotY, pattern, hold, every, wave, extra = {}) => {
    q.push({
      t,
      kind: 'spawn',
      type: 'drone',
      x,
      y: -28,
      slotX: x,
      slotY,
      pattern,
      hold,
      fireEvery: every,
      wave,
      cd: 0.45 + (x % 7) * 0.04,
      ...extra,
    });
  };

  [70, 145, 255, 330].forEach((x, i) => drone(1.15 + i * 0.16, x, 72, 'aim1', 4.0, 1.6, 1, { cd: 1.05 + i * 0.32 }));
  [110, 200, 290].forEach((x, i) => drone(8.4 + i * 0.18, x, 136, 'aim3', 4.0, 1.45, 1, { cd: 1.1 + i * 0.38 }));
  q.push({
    t: 12.4, kind: 'spawn', type: 'drone', pattern: 'cross', x: -24, y: 200, baseY: 200,
    dir: 1, speed: 118, fireEvery: 1.25, wave: 1, cd: 0.7, bob: 16, bobF: 2.2,
  });
  q.push({
    t: 14.1, kind: 'spawn', type: 'drone', pattern: 'cross', x: PLAY_W + 24, y: 260, baseY: 260,
    dir: -1, speed: 118, fireEvery: 1.25, wave: 1, cd: 0.85, bob: 14, bobF: 2.5,
  });

  q.push({
    t: 18, kind: 'spawn', type: 'spinner', x: 120, y: -40, slotX: 120, slotY: 118,
    pattern: 'spiral', hold: 6.2, fireEvery: 0.22, wave: 2, spin: 0.2, spinRate: 0.64, cd: 0.55,
  });
  q.push({
    t: 25.0, kind: 'spawn', type: 'spinner', x: 280, y: -40, slotX: 280, slotY: 150,
    pattern: 'spiral', hold: 5.8, fireEvery: 0.22, wave: 2, spin: 2.1, spinRate: -0.6, cd: 0.7,
  });
  q.push({
    t: 31.6, kind: 'spawn', type: 'spinner', x: 200, y: -40, slotX: 200, slotY: 124,
    pattern: 'spiral2', hold: 5.2, fireEvery: 0.2, wave: 2, spin: 0.6, spinRate: 0.58, cd: 0.45,
  });
  [100, 300].forEach((x, i) => drone(33.4 + i * 0.9, x, 68, 'aim3', 3.2, 1.35, 2, { cd: 0.8 + i * 0.3 }));

  q.push({
    t: 37, kind: 'spawn', type: 'turret', x: 92, y: -36, slotX: 92, slotY: 70,
    pattern: 'ring', hold: 11.5, fireEvery: 1.18, wave: 3, spin: 0.2, cd: 0.7,
  });
  q.push({
    t: 37.7, kind: 'spawn', type: 'turret', x: 308, y: -36, slotX: 308, slotY: 70,
    pattern: 'ring', hold: 11.2, fireEvery: 1.18, wave: 3, spin: 1.4, cd: 1.25,
  });
  const lancer = (t, dir, y, speed = 112) => q.push({
    t, kind: 'spawn', type: 'lancer', pattern: 'fan',
    x: dir > 0 ? -30 : PLAY_W + 30,
    y, baseY: y, dir, speed, fireEvery: 0.74, wave: 3, cd: 0.32, bob: 24, bobF: 1.6,
  });
  lancer(39.6, 1, 176);
  lancer(41.3, -1, 236);
  lancer(44.6, 1, 300, 128);
  lancer(45.4, -1, 156, 128);
  lancer(49.2, 1, 206, 136);
  lancer(50.1, -1, 276, 136);
  q.push({
    t: 52.6, kind: 'spawn', type: 'drone', pattern: 'cross', x: -24, y: 124, baseY: 124,
    dir: 1, speed: 146, fireEvery: 0.68, wave: 3, cd: 0.25, bob: 10, bobF: 3,
  });

  q.push({
    t: 58.2, kind: 'banner', text: 'WARNING', sub: 'STAR GATE UNSEALING', warn: true, time: 3.1,
  });
  q.push({ t: 62, kind: 'boss' });
  q.sort((a, b) => a.t - b.t);
  return q;
}

export function createDirector() {
  return {
    t: 0,
    queue: makeQueue(),
    qi: 0,
    waveName: '',
    waveId: 0,
    bonuses: {},
    bossSpawned: false,
  };
}

export function updateDirector(dir, dt, game) {
  dir.t += dt;
  while (dir.qi < dir.queue.length && dir.queue[dir.qi].t <= dir.t) {
    const ev = dir.queue[dir.qi++];
    if (ev.kind === 'spawn') game.enemies.push(createEnemy(ev));
    else if (ev.kind === 'banner') {
      game.banner = { text: ev.text, sub: ev.sub, t: ev.time || 2.6, warn: !!ev.warn };
      if (ev.warn) {
        game.warnT = ev.time || 3;
        game.audio.warning();
        game.shake(4);
      }
    } else if (ev.kind === 'boss' && !dir.bossSpawned) {
      dir.bossSpawned = true;
      for (const e of game.enemies) e.left = true;
      game.boss = createBoss();
      game.audio.setBossMode(true);
      game.audio.warning();
      game.banner = { text: 'VESPER', sub: 'MECHANICAL DREADNOUGHT', t: 2.6, warn: true };
      game.warnT = 2.4;
      game.shake(6);
    }
  }

  const wave = currentWave(dir.t);
  if (wave.id !== dir.waveId) {
    dir.waveId = wave.id;
    dir.waveName = wave.name;
    if (wave.id < 4) {
      game.banner = { text: `WAVE ${wave.id}`, sub: wave.name, t: 2.3, warn: false };
    }
  }

  for (const w of WAVES) {
    if (w.id >= 4) continue;
    if (dir.t < w.end || dir.bonuses[w.id]) continue;
    if (dir.queue.some((ev, i) => i >= dir.qi && ev.wave === w.id)) continue;
    if (game.enemies.some((e) => e.wave === w.id && !e.dead && !e.left)) continue;
    dir.bonuses[w.id] = true;
    const bonus = 5000 + w.id * 1500;
    game.addScore(bonus);
    game.banner = { text: 'WAVE CLEAR', sub: `+${bonus}`, t: 1.6, warn: false };
    game.audio.combo();
  }
}
