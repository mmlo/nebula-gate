import { PLAY_W, BULLET } from './const.js';
import { bulletSpeed, multiplier } from './util.js';
import { pushEnemyBullets } from './bullets.js';
import { ring, spread } from './patterns.js';
import { burst, pushPopup } from './particles.js';
import { spawnGems } from './pickups.js';

const SCORE = { drone: 600, spinner: 2600, lancer: 900, turret: 2100 };
const GEMS = { drone: 3, spinner: 8, lancer: 4, turret: 7 };
const HP = { drone: 46, spinner: 280, lancer: 62, turret: 340 };
const HURT = { drone: 13, spinner: 16, lancer: 12, turret: 18 };

export function createEnemy(ev) {
  const type = ev.type;
  return {
    type,
    pattern: ev.pattern || 'aim1',
    x: ev.x,
    y: ev.y,
    slotX: ev.slotX ?? ev.x,
    slotY: ev.slotY ?? ev.y,
    baseY: ev.baseY ?? ev.y,
    dir: ev.dir ?? 1,
    speed: ev.speed ?? 120,
    bob: ev.bob ?? 0,
    bobF: ev.bobF ?? 2,
    state: ev.state || (ev.pattern === 'cross' || type === 'lancer' ? 'dive' : 'in'),
    age: 0,
    anim: 0,
    hold: ev.hold ?? 4.5,
    holdT: 0,
    cd: ev.cd ?? 0.7,
    fireEvery: ev.fireEvery ?? 1,
    hp: ev.hp ?? HP[type] ?? 40,
    hurtR: ev.hurtR ?? HURT[type] ?? 12,
    wave: ev.wave ?? 1,
    spin: ev.spin ?? 0,
    spinRate: ev.spinRate ?? 0.4,
    orbit: ev.spin ?? 0,
    telegraph: false,
    hurt: 0,
    dead: false,
    left: false,
    rewarded: false,
    jitter: ((ev.x * 13) % 7) * 0.01,
  };
}

export function updateEnemies(list, dt, game) {
  for (let i = 0; i < list.length; i++) updateOne(list[i], dt, game);
}

function updateOne(e, dt, game) {
  if (e.left || e.dead || e.hp <= 0) return;
  e.age += dt;
  e.anim += dt;
  e.hurt = Math.max(0, e.hurt - dt);

  if (e.type === 'lancer' || e.pattern === 'cross') {
    e.x += e.dir * e.speed * dt;
    e.y = e.baseY + Math.sin(e.age * e.bobF) * e.bob;
    if (e.x < -46 || e.x > PLAY_W + 46) {
      e.left = true;
      return;
    }
  } else if (e.type === 'spinner') {
    if (e.state === 'in') {
      if (approach(e, dt, 150)) {
        e.state = 'hold';
        e.holdT = 0;
      }
    } else if (e.state === 'hold') {
      e.holdT += dt;
      e.orbit += dt * 1.25 * Math.sign(e.spinRate || 1);
      e.x = e.slotX + Math.cos(e.orbit) * 30;
      e.y = e.slotY + Math.sin(e.orbit * 1.25) * 18;
      if (e.holdT >= e.hold) e.state = 'out';
    } else {
      e.y -= 150 * dt;
      if (e.y < -46) {
        e.left = true;
        return;
      }
    }
  } else if (approachOrLeave(e, dt, e.type === 'turret' ? 80 : 170)) {
    return;
  }

  const canShoot = e.state === 'hold' || e.type === 'lancer' || e.pattern === 'cross';
  if (!canShoot) return;
  e.cd -= dt;
  e.telegraph = e.cd > 0 && e.cd < 0.16;
  if (e.cd <= 0) {
    e.cd = e.fireEvery * (0.94 + e.jitter);
    fireEnemy(e, game);
    e.telegraph = false;
  }
}

function approach(e, dt, speed) {
  const dx = e.slotX - e.x;
  const dy = e.slotY - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) {
    e.x = e.slotX;
    e.y = e.slotY;
    return true;
  }
  e.x += (dx / d) * speed * dt;
  e.y += (dy / d) * speed * dt;
  return false;
}

function approachOrLeave(e, dt, speed) {
  if (e.state === 'in') {
    if (approach(e, dt, speed)) {
      e.state = 'hold';
      e.holdT = 0;
    }
  } else if (e.state === 'hold') {
    e.holdT += dt;
    if (e.holdT >= e.hold) e.state = 'out';
  } else if (e.state === 'out') {
    e.y -= 140 * dt;
    if (e.y < -40) {
      e.left = true;
      return true;
    }
  }
  return false;
}

function fireEnemy(e, game) {
  const p = game.player;
  if (e.pattern === 'spiral' || e.pattern === 'spiral2') {
    e.spin += e.spinRate;
    const speed = bulletSpeed(game, e.wave <= 2 ? 62 : 90);
    const br = e.wave <= 2 ? 2.35 : 3.05;
    const arm = (a) => ({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: br,
      color: BULLET.spiral,
      grazed: false,
      life: 9,
      friendly: false,
    });
    const list = [arm(e.spin)];
    if (e.pattern === 'spiral2') list.push(arm(e.spin + Math.PI));
    pushEnemyBullets(game, list);
    return;
  }
  if (e.pattern === 'ring') {
    e.spin += 0.5;
    pushEnemyBullets(
      game,
      ring(e.x, e.y, bulletSpeed(game, 104), 15, 0, e.spin, 0.82, BULLET.ring, 3.25),
    );
    return;
  }
  const early = e.wave <= 2;
  const count = e.pattern === 'aim1' ? 1 : e.pattern === 'fan' ? 5 : 3;
  const arc = e.pattern === 'aim1' ? 0 : e.pattern === 'fan' ? 0.95 : (early ? 0.95 : 0.5);
  const base = e.pattern === 'fan' ? 142 : (e.wave === 1 ? 92 : e.wave === 2 ? 108 : 136);
  const speed = bulletSpeed(game, base);
  const color = e.pattern === 'fan' ? BULLET.fan : BULLET.aimed;
  const br = early ? 2.4 : 3.15;
  pushEnemyBullets(game, spread(e.x, e.y, p.x, p.y, speed, count, arc, color, br));
}

export function killEnemy(e, game) {
  if (e.rewarded) return;
  e.rewarded = true;
  const pts = Math.floor((SCORE[e.type] || 500) * multiplier(game.combo));
  game.addScore(pts);
  game.bumpCombo(2, e.x, e.y - 10);
  spawnGems(game, e.x, e.y, GEMS[e.type] || 3);
  burst(game.particles, e.x, e.y, e.type === 'spinner' || e.type === 'turret' ? 20 : 12, '#ff4fd8', 150, 0.45);
  burst(game.particles, e.x, e.y, 8, '#7af7ff', 90, 0.35);
  game.audio.explode(false);
  pushPopup(game, e.x, e.y - 12, `+${pts}`, '#7af7ff');
  game.shake(e.type === 'spinner' || e.type === 'turret' ? 3.5 : 2);
}

export function removeDeadEnemies(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].dead || list[i].left) {
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
    }
  }
}
