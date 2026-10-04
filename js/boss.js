import { PLAY_W, TUNE, BULLET } from './const.js';
import { bulletSpeed } from './util.js';
import { pushEnemyBullets } from './bullets.js';
import { ring, spread } from './patterns.js';
import { burst, pushPopup } from './particles.js';

export function createBoss() {
  return {
    x: PLAY_W / 2,
    y: -130,
    homeY: 96,
    hp: TUNE.bossHp,
    maxHp: TUNE.bossHp,
    phase: 1,
    transition: 0,
    invuln: 2,
    entering: 1.85,
    dying: false,
    dieT: 0,
    hurt: 0,
    anim: 0,
    cd1: 0.7,
    cd2: 1.2,
    cd3: 0.35,
    spin: 0.4,
    patternT: 0,
    lastCycle: 0,
    breathShot: false,
    scored: false,
  };
}

export function bossHitByBullet(boss, b) {
  if (!boss || boss.dying || boss.invuln > 0 || boss.entering > 0) return false;
  const left = boss.x - 102;
  const right = boss.x + 102;
  const top = boss.y - 40;
  const bot = boss.y + 50;
  return b.x > left - b.r && b.x < right + b.r && b.y > top - b.r && b.y < bot + b.r;
}

export function bossHitsPlayer(boss, px, py, hitR) {
  if (!boss || boss.dying || boss.entering > 0.2) return false;
  const left = boss.x - 68;
  const right = boss.x + 68;
  const top = boss.y - 16;
  const bot = boss.y + 44;
  const cx = Math.max(left, Math.min(right, px));
  const cy = Math.max(top, Math.min(bot, py));
  return Math.hypot(px - cx, py - cy) < hitR + 1;
}

export function updateBoss(boss, dt, game) {
  boss.anim += dt;
  boss.hurt = Math.max(0, boss.hurt - dt);
  if (boss.dying) {
    boss.dieT -= dt;
    boss.invuln = 1;
    if (Math.random() < dt * 16) {
      burst(
        game.particles,
        boss.x + (Math.random() * 180 - 90),
        boss.y + (Math.random() * 70 - 20),
        8,
        Math.random() < 0.5 ? '#ff4fd8' : '#ffe56a',
        180,
        0.5,
      );
    }
    game.shake(3);
    if (boss.dieT <= 0) {
      boss.dieT = 99;
      if (!boss.scored) {
        boss.scored = true;
        game.addScore(120000);
        pushPopup(game, boss.x, boss.y + 40, '+120000', '#ffe56a');
      }
      game.audio.explode(true);
      game.endRun(true);
    }
    return;
  }

  if (boss.hp <= 0) {
    beginDeath(boss, game);
    return;
  }

  const ratio = boss.hp / boss.maxHp;
  let want = 1;
  if (ratio <= 0.34) want = 3;
  else if (ratio <= 0.67) want = 2;
  if (want !== boss.phase && boss.transition <= 0 && boss.entering <= 0) {
    beginPhase(boss, game, want);
  }

  if (boss.entering > 0) {
    boss.entering -= dt;
    const k = 1 - Math.max(0, boss.entering) / 1.85;
    const ease = 1 - (1 - k) ** 3;
    boss.y = -130 + (boss.homeY + 130) * Math.max(0, Math.min(1, ease));
    boss.x = PLAY_W / 2;
    return;
  }

  const amp = boss.phase === 3 ? 68 : 58;
  boss.x = PLAY_W / 2 + Math.sin(boss.anim * 0.55) * amp;
  boss.y = boss.homeY + Math.sin(boss.anim * 0.85) * 10;
  boss.x = Math.max(128, Math.min(PLAY_W - 128, boss.x));

  if (boss.transition > 0) {
    boss.transition -= dt;
    boss.invuln = Math.max(0, boss.invuln - dt);
    return;
  }
  boss.invuln = Math.max(0, boss.invuln - dt);
  boss.patternT += dt;

  if (boss.phase === 1) patternAegis(boss, dt, game);
  else if (boss.phase === 2) patternHelix(boss, dt, game);
  else patternGate(boss, dt, game);
}

function beginPhase(boss, game, phase) {
  boss.phase = phase;
  boss.transition = 1.55;
  boss.invuln = 1.55;
  boss.patternT = 0;
  boss.cd1 = 0.45;
  boss.cd2 = 0.9;
  boss.cd3 = 0.25;
  boss.spin = phase === 2 ? 0 : boss.spin;
  boss.breathShot = false;
  game.eBullets.length = 0;
  game.shake(10);
  game.flash = Math.max(game.flash, 0.55);
  game.audio.phase();
  const names = {
    2: ['PHASE II', 'TWIN HELIX'],
    3: ['PHASE III', 'GATE PROTOCOL'],
  };
  const label = names[phase] || ['PHASE', ''];
  game.banner = { text: label[0], sub: label[1], t: 2.2, warn: true };
  burst(game.particles, boss.x, boss.y, 30, '#ffffff', 220, 0.55);
}

function beginDeath(boss, game) {
  boss.dying = true;
  boss.dieT = 2.5;
  boss.hp = 0;
  game.eBullets.length = 0;
  game.vacuumT = Math.max(game.vacuumT, 2);
  game.shake(12);
  game.flash = 0.8;
  game.gate = 1.4;
  burst(game.particles, boss.x, boss.y, 40, '#5ef6ff', 260, 0.7);
  game.audio.explode(true);
}

function patternAegis(boss, dt, game) {
  const p = game.player;
  boss.cd1 -= dt;
  boss.cd2 -= dt;
  boss.telegraph = boss.cd1 < 0.18 && boss.cd1 > 0;
  if (boss.cd1 <= 0) {
    boss.cd1 = 0.98;
    const gap = Math.atan2(p.y - boss.y, p.x - boss.x);
    pushEnemyBullets(
      game,
      ring(boss.x, boss.y + 8, bulletSpeed(game, 112), 18, 0, gap, 0.36, BULLET.boss, 3.2),
    );
  }
  if (boss.cd2 <= 0) {
    boss.cd2 = 1.75;
    pushEnemyBullets(
      game,
      spread(boss.x, boss.y + 20, p.x, p.y, bulletSpeed(game, 168), 2, 0.22, BULLET.aimed, 3.3),
    );
  }
}

function patternHelix(boss, dt, game) {
  const p = game.player;
  const cycle = boss.patternT % 4.4;
  boss.telegraph = false;
  if (cycle > 3.7) return;
  boss.cd2 -= dt;
  boss.cd3 -= dt;
  boss.telegraph = boss.cd2 < 0.2;
  if (boss.cd3 <= 0) {
    boss.cd3 = 0.13;
    boss.spin += 0.42;
    const speed = bulletSpeed(game, 92);
    const arms = [
      [boss.x - 76, boss.y + 6, boss.spin],
      [boss.x + 76, boss.y + 6, -boss.spin + Math.PI],
    ];
    const list = arms.map(([x, y, a]) => ({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: 3.05,
      color: BULLET.spiral,
      grazed: false,
      life: 9,
      friendly: false,
    }));
    pushEnemyBullets(game, list);
  }
  if (boss.cd2 <= 0) {
    boss.cd2 = 1.2;
    pushEnemyBullets(
      game,
      spread(boss.x, boss.y + 24, p.x, p.y, bulletSpeed(game, 176), 4, 0.62, BULLET.aimed, 3.2),
    );
  }
}

function patternGate(boss, dt, game) {
  const p = game.player;
  const cycle = boss.patternT % 5;
  if (boss.lastCycle != null && cycle < boss.lastCycle) boss.breathShot = false;
  boss.lastCycle = cycle;
  boss.telegraph = false;

  if (cycle < 2.25) {
    boss.telegraph = boss.cd1 > 0 && boss.cd1 < 0.18;
    boss.cd1 -= dt;
    if (boss.cd1 <= 0) {
      boss.cd1 = 0.72;
      const gap = Math.atan2(p.y - boss.y, p.x - boss.x);
      pushEnemyBullets(
        game,
        ring(boss.x, boss.y + 6, bulletSpeed(game, 120), 20, 0, gap, 0.32, BULLET.boss, 3.15),
      );
      pushEnemyBullets(
        game,
        ring(boss.x, boss.y + 6, bulletSpeed(game, 78), 14, 0.35, gap, 0.32, BULLET.spiral, 3.0),
      );
    }
  } else if (cycle < 4.05) {
    boss.telegraph = boss.cd2 > 0 && boss.cd2 < 0.22;
    boss.cd2 -= dt;
    if (boss.cd2 <= 0) {
      boss.cd2 = 1.15;
      const gapX = p.x;
      const list = [];
      for (let x = 16; x < PLAY_W - 12; x += 28) {
        if (Math.abs(x - gapX) < 24) continue;
        list.push({
          x,
          y: -8,
          vx: 0,
          vy: bulletSpeed(game, 128),
          r: 3.2,
          color: BULLET.ring,
          grazed: false,
          life: 8,
          friendly: false,
        });
      }
      pushEnemyBullets(game, list);
    }
  } else if (!boss.breathShot) {
    boss.breathShot = true;
    pushEnemyBullets(
      game,
      spread(boss.x, boss.y + 18, p.x, p.y, bulletSpeed(game, 188), 3, 0.36, BULLET.aimed, 3.2),
    );
  }
}

export function drawBoss(ctx, b) {
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const accent = b.phase === 3 ? '#ffe56a' : b.phase === 2 ? '#ff4fd8' : '#5ef6ff';
  const flash = b.hurt > 0 || (b.transition > 0 && Math.sin(b.anim * 40) > 0);
  ctx.save();
  ctx.translate(x, y);
  const fade = b.dying ? Math.max(0.25, Math.min(1, b.dieT / 2.5)) : 1;
  ctx.globalAlpha = fade;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-70, 8, 140, 18);

  // Nacelles and engines (rear is up, nose points at the player).
  ctx.fillStyle = '#241838';
  ctx.fillRect(-118, -18, 40, 36);
  ctx.fillRect(78, -18, 40, 36);
  ctx.fillStyle = '#3a2a58';
  ctx.fillRect(-112, -12, 28, 24);
  ctx.fillRect(84, -12, 28, 24);
  ctx.fillStyle = flash ? '#ffffff' : '#ff4fd8';
  const flick = Math.floor(b.anim * 16) % 2;
  ctx.globalAlpha = 0.85 * fade;
  ctx.fillRect(-104, -28 - flick, 10, 12);
  ctx.fillRect(-90, -24 - flick, 8, 8);
  ctx.fillRect(94, -28 - flick, 10, 12);
  ctx.fillRect(82, -24 - flick, 8, 8);
  ctx.globalAlpha = fade;

  // Main hull.
  ctx.fillStyle = flash ? '#d9e4ff' : '#221633';
  ctx.fillRect(-78, -28, 156, 62);
  ctx.fillStyle = flash ? '#ffffff' : '#32244c';
  ctx.fillRect(-64, -40, 128, 18);
  ctx.fillStyle = '#1a1028';
  ctx.fillRect(-16, 30, 32, 16);
  ctx.fillRect(-28, 24, 56, 8);

  // Armor plates.
  ctx.fillStyle = '#4c3d72';
  ctx.fillRect(-70, -22, 34, 10);
  ctx.fillRect(36, -22, 34, 10);
  ctx.fillRect(-48, 6, 96, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(-70, -6, 18, 4);
  ctx.fillRect(52, -6, 18, 4);
  ctx.fillRect(-6, -36, 12, 6);

  // Rivets.
  ctx.fillStyle = '#d5dcff';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * 22 - 1, -16, 2, 2);
    ctx.fillRect(i * 22 - 1, 18, 2, 2);
  }

  // Cannons.
  ctx.fillStyle = '#161022';
  ctx.fillRect(-108, 8, 30, 8);
  ctx.fillRect(78, 8, 30, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(-108, 10, 8, 4);
  ctx.fillRect(100, 10, 8, 4);

  if (b.phase >= 2) {
    ctx.fillStyle = '#ff4fd8';
    ctx.fillRect(-92, -34, 6, 16);
    ctx.fillRect(86, -34, 6, 16);
  }
  if (b.phase >= 3) {
    ctx.strokeStyle = 'rgba(255,229,106,0.8)';
    ctx.beginPath();
    ctx.moveTo(-40, -10);
    ctx.lineTo(-10, 8);
    ctx.lineTo(18, -6);
    ctx.lineTo(48, 16);
    ctx.stroke();
  }

  // Core.
  ctx.fillStyle = '#0c0616';
  ctx.beginPath();
  ctx.arc(0, 4, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 18, b.anim * (b.phase === 2 ? -3 : 2), b.anim * 2 + 2.2);
  ctx.stroke();
  ctx.fillStyle = flash ? '#ffffff' : accent;
  ctx.beginPath();
  ctx.arc(0, 4, b.telegraph ? 8 : 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, 2, 4, 4);

  if (b.phase === 1) {
    ctx.strokeStyle = 'rgba(94,246,255,0.35)';
    ctx.beginPath();
    ctx.arc(0, 4, 30 + Math.sin(b.anim * 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
