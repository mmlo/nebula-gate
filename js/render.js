import { PLAY_H, PLAY_W, PLAY_X, VIEW_H, VIEW_W } from './const.js';
import { drawGate, drawNebula, drawStars } from './background.js';
import { drawEnemyBullet, drawPlayerBullet } from './bullets.js';
import { drawGem } from './pickups.js';
import { drawParticles, drawPopups } from './particles.js';
import { drawBoss } from './boss.js';
import { drawEnemy, drawPlayer } from './sprites.js';
import { drawChrome, drawVignette } from './hud.js';

export function render(ctx, game) {
  const dpr = game.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#070414';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(Math.round(game.shakeX || 0), Math.round(game.shakeY || 0));
  drawStars(ctx, game.bg);

  ctx.fillStyle = 'rgba(6,3,16,0.8)';
  ctx.fillRect(0, 0, PLAY_X, VIEW_H);
  ctx.fillRect(PLAY_X + PLAY_W, 0, VIEW_W - PLAY_X - PLAY_W, VIEW_H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAY_X, 0, PLAY_W, PLAY_H);
  ctx.clip();
  ctx.translate(PLAY_X, 0);
  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
  drawNebula(ctx, game.bg);
  const gatePulse = 0.85 + Math.sin(game.time * 2.2) * 0.15;
  drawGate(ctx, PLAY_W / 2, 74, game.bg.t, game.gate * gatePulse);

  if (!game.runActive) drawScenic(ctx, game);
  else drawWorld(ctx, game);

  drawVignette(ctx);
  ctx.restore();

  drawChrome(ctx, game);

  const dim = game.mode === 'paused' || game.mode === 'results' || (game.mode === 'settings' && game.runActive);
  if (dim) {
    ctx.fillStyle = 'rgba(3,0,12,0.5)';
    ctx.fillRect(PLAY_X, 0, PLAY_W, PLAY_H);
  }
  if (game.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 36, 84, ${Math.min(0.33, game.hitFlash)})`;
    ctx.fillRect(PLAY_X, 0, PLAY_W, PLAY_H);
  }
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, game.flash)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < VIEW_H; y += 3) ctx.fillRect(0, y, VIEW_W, 1);
  ctx.restore();
}

function drawScenic(ctx, game) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  drawBoss(ctx, {
    x: PLAY_W / 2,
    y: 108,
    phase: 1,
    anim: game.time,
    hurt: 0,
    transition: 0,
    dying: false,
    entering: 0,
    dieT: 1,
  });
  ctx.restore();
  drawPlayer(ctx, {
    x: PLAY_W / 2 + Math.sin(game.time * 0.8) * 36,
    y: PLAY_H * 0.74 + Math.sin(game.time * 1.4) * 8,
    anim: game.time,
    invuln: 0,
    focus: false,
    muzzle: 0,
    grazeR: 36,
    hitR: 3.1,
    hurt: 0,
  }, game);
}

function drawWorld(ctx, game) {
  for (const it of game.pickups) drawGem(ctx, it);
  if (game.boss) drawBoss(ctx, game.boss);
  for (const e of game.enemies) drawEnemy(ctx, e);
  for (const b of game.pBullets) drawPlayerBullet(ctx, b);
  for (const b of game.eBullets) drawEnemyBullet(ctx, b);
  drawParticles(ctx, game.particles);
  if (game.player) drawPlayer(ctx, game.player, game);
  if (game.bombFx && game.bombFx.life > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,229,106,${Math.max(0, game.bombFx.life)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.bombFx.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(94,246,255,${Math.max(0, game.bombFx.life * 0.7)})`;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.bombFx.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawPopups(ctx, game.popups);
}
