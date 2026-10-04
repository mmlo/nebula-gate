import { PLAY_H, PLAY_W, TUNE } from './const.js';
import { clamp } from './util.js';

export function createPlayer() {
  return {
    x: PLAY_W / 2,
    y: PLAY_H - 78,
    speed: TUNE.playerSpeed,
    focusSpeed: TUNE.focusSpeed,
    hitR: TUNE.hitR,
    grazeR: TUNE.grazeR,
    fireEvery: TUNE.fireEvery,
    fireCd: 0.2,
    lives: TUNE.lives,
    energy: TUNE.startEnergy,
    invuln: 2.8,
    bombCd: 0,
    anim: 0,
    muzzle: 0,
    hurt: 0,
    alive: true,
    focus: false,
    showBox: 3.2,
  };
}

export function updatePlayer(p, dt, game) {
  const inp = game.input;
  p.invuln = Math.max(0, p.invuln - dt);
  p.bombCd = Math.max(0, p.bombCd - dt);
  p.muzzle = Math.max(0, p.muzzle - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.showBox = Math.max(0, (p.showBox || 0) - dt);
  p.anim += dt;
  p.focus = !!inp.focus;

  if (inp.useMouse) {
    p.x = inp.playX;
    p.y = inp.playY;
  } else {
    let x = inp.ax;
    let y = inp.ay;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    const sp = p.focus ? p.focusSpeed : p.speed;
    p.x += x * sp * dt;
    p.y += y * sp * dt;
  }
  const pad = 16;
  p.x = clamp(p.x, pad, PLAY_W - pad);
  p.y = clamp(p.y, pad, PLAY_H - pad);

  const firing = (game.settings.autofire || inp.fire) && p.alive;
  p.fireCd -= dt;
  if (firing && p.fireCd <= 0) {
    p.fireCd += p.fireEvery;
    if (p.fireCd < 0) p.fireCd = 0;
    shoot(p, game);
    p.muzzle = 0.04;
    game.audio.shoot();
  }

  if (Math.floor(p.anim * 24) !== Math.floor((p.anim - dt) * 24)) {
    game.particles.push({
      x: p.x + (Math.random() * 6 - 3),
      y: p.y + 16,
      vx: (Math.random() - 0.5) * 12,
      vy: 40 + Math.random() * 30,
      life: 0.22,
      max: 0.22,
      color: Math.random() < 0.5 ? '#ff4fd8' : '#ffe56a',
      size: 2,
    });
  }
}

function shoot(p, game) {
  const focus = p.focus;
  const dmg = focus ? TUNE.focusDmg : TUNE.shotDmg;
  const spreadX = focus ? 5 : 11;
  const vy = -700;
  const shots = [
    shot(p.x - spreadX, p.y - 10, focus ? 0 : -16, vy, dmg, focus),
    shot(p.x + spreadX, p.y - 10, focus ? 0 : 16, vy, dmg, focus),
  ];
  if (focus) shots.push(shot(p.x, p.y - 16, 0, -760, dmg + 3, true));
  for (const b of shots) game.pBullets.push(b);
}

function shot(x, y, vx, vy, dmg, focus) {
  return {
    x, y, vx, vy,
    r: focus ? 2.4 : 3,
    dmg,
    focus,
    friendly: true,
    life: 1.5,
    grazed: false,
    color: '#ffffff',
  };
}
