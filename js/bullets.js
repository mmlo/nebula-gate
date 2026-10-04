import { TUNE } from './const.js';
import { PLAY_W, PLAY_H } from './const.js';

export function stepBullets(list, dt) {
  const margin = 70;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (
      b.life <= 0 ||
      b.x < -margin ||
      b.y < -margin ||
      b.x > PLAY_W + margin ||
      b.y > PLAY_H + margin
    ) {
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
    }
  }
}

export function pushEnemyBullets(game, bullets) {
  const cap = TUNE.bulletCap;
  for (const b of bullets) {
    if (game.eBullets.length >= cap) break;
    game.eBullets.push(b);
  }
}

export function drawEnemyBullet(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(0, 0, b.r * 2.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.1, b.r * 0.42), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPlayerBullet(ctx, b) {
  const h = b.focus ? 16 : 13;
  const w = b.focus ? 2 : 3;
  ctx.fillStyle = b.focus ? 'rgba(255,229,106,0.35)' : 'rgba(94,246,255,0.35)';
  ctx.fillRect(b.x - w, b.y - h * 0.5, w * 2, h);
  ctx.fillStyle = b.focus ? '#fff4c4' : '#f3ffff';
  ctx.fillRect(b.x - 1, b.y - h * 0.45, 2, h * 0.9);
}
