import { PLAY_H, PLAY_W, PLAY_X, VIEW_H, VIEW_W } from './const.js';
import { formatScore, multiplier } from './util.js';
import { drawSprite, SPRITES } from './sprites.js';

export function drawChrome(ctx, game) {
  frame(ctx, game);
  if (!game.runActive) drawTitleHud(ctx, game);
  else drawRunHud(ctx, game);
}

function frame(ctx, game) {
  const warn = game.warnT > 0 && Math.sin(game.time * 16) > 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = warn ? '#ff4fd8' : 'rgba(94,246,255,0.9)';
  ctx.strokeRect(PLAY_X + 1.5, 1.5, PLAY_W - 3, PLAY_H - 3);
  ctx.strokeStyle = 'rgba(255,79,216,0.45)';
  ctx.strokeRect(PLAY_X + 6, 6, PLAY_W - 12, PLAY_H - 12);
  corner(ctx, PLAY_X + 10, 10, 1, 1);
  corner(ctx, PLAY_X + PLAY_W - 10, 10, -1, 1);
  corner(ctx, PLAY_X + 10, PLAY_H - 10, 1, -1);
  corner(ctx, PLAY_X + PLAY_W - 10, PLAY_H - 10, -1, -1);
}

function corner(ctx, x, y, sx, sy) {
  ctx.strokeStyle = '#5ef6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + sy * 16);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * 16, y);
  ctx.stroke();
}

function label(ctx, text, x, y, size, color, align = 'left') {
  ctx.font = `${size}px Courier New, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawTitleHud(ctx, game) {
  label(ctx, 'NEBULA GATE', 22, 28, 18, '#5ef6ff');
  label(ctx, 'STAR CORRIDOR', 22, 52, 12, '#ff4fd8');
  label(ctx, 'BEST', 22, 110, 12, '#9aa0c8');
  label(ctx, formatScore(game.best), 22, 128, 22, '#ffe56a');
  label(ctx, 'ONE FIGHTER', 22, 200, 14, '#d5d7ff');
  label(ctx, 'ONE GATE', 22, 220, 14, '#d5d7ff');
  const hint = game.coarse
    ? 'TOUCH STICK + BUTTONS'
    : 'WASD / ARROWS / MOUSE / PAD';
  label(ctx, hint, 22, PLAY_H - 48, 11, '#8ea0c0');
  label(ctx, 'RIGHT FLANK', PLAY_X + PLAY_W + 22, 28, 12, '#9aa0c8');
  label(ctx, 'MAGENTA AIMED', PLAY_X + PLAY_W + 22, 70, 13, '#ff4fd8');
  label(ctx, 'CYAN SPIRALS', PLAY_X + PLAY_W + 22, 92, 13, '#5ef6ff');
  label(ctx, 'GOLD RINGS', PLAY_X + PLAY_W + 22, 114, 13, '#ffe56a');
}

function drawRunHud(ctx, game) {
  const p = game.player;
  const right = PLAY_X + PLAY_W + 22;
  label(ctx, 'NEBULA GATE', 22, 20, 14, '#5ef6ff');
  label(ctx, 'SCORE', 22, 52, 12, '#9aa0c8');
  label(ctx, formatScore(game.score), 22, 70, 22, '#f4f7ff');
  label(ctx, 'BEST', 22, 108, 12, '#9aa0c8');
  label(ctx, formatScore(Math.max(game.best, game.score)), 22, 124, 16, '#ffe56a');
  label(ctx, 'GRAZE', 22, 168, 12, '#9aa0c8');
  label(ctx, String(game.stats.graze).padStart(4, '0'), 22, 186, 18, '#5ef6ff');
  const mult = multiplier(game.combo);
  label(ctx, 'COMBO', 22, 224, 12, '#9aa0c8');
  label(ctx, `${Math.floor(game.combo)}  x${mult}`, 22, 242, 18, mult > 1 ? '#ffe56a' : '#f4f7ff');
  label(ctx, game.director.waveName || 'APPROACH', 22, 292, 13, '#ff9ae0');

  label(ctx, 'MAGENTA AIMED', 22, 360, 11, '#ff4fd8');
  label(ctx, 'CYAN SPIRALS', 22, 376, 11, '#5ef6ff');
  label(ctx, 'GOLD RINGS', 22, 392, 11, '#ffe56a');

  const hint = game.coarse
    ? 'FOCUS SLOWS THE SHIP'
    : 'SHIFT FOCUS   X BOMB';
  label(ctx, 'RED DOT = HIT', 22, PLAY_H - 54, 11, '#ff8aa2');
  label(ctx, hint, 22, PLAY_H - 36, 11, '#8ea0c0');

  label(ctx, 'HULLS', right, 22, 12, '#9aa0c8');
  for (let i = 0; i < p.lives; i++) {
    drawSprite(ctx, SPRITES.player, 1, right + 12 + i * 18, 58, null, false);
  }
  label(ctx, `CONTINUES ${game.continues}`, right, 84, 13, '#d5d7ff');

  label(ctx, 'BOMB', right, 122, 12, '#9aa0c8');
  const ready = p.energy >= 100;
  ctx.fillStyle = '#140818';
  ctx.fillRect(right, 142, 180, 14);
  ctx.fillStyle = ready ? (Math.sin(game.time * 8) > 0 ? '#ffe56a' : '#fff6c8') : '#5ef6ff';
  ctx.fillRect(right, 142, Math.max(0, Math.min(180, 1.8 * p.energy)), 14);
  ctx.strokeStyle = ready ? '#ffe56a' : '#5ef6ff';
  ctx.strokeRect(right + 0.5, 142.5, 179, 13);
  if (ready) label(ctx, 'READY', right + 188, 140, 12, '#ffe56a');

  if (game.boss) {
    const b = game.boss;
    label(ctx, 'VESPER', right, 190, 13, '#ff4fd8');
    label(ctx, `PHASE ${b.phase}`, right + 120, 190, 13, '#5ef6ff');
    const ratio = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = '#140818';
    ctx.fillRect(right, 212, 200, 12);
    ctx.fillStyle = b.phase === 3 ? '#ffe56a' : b.phase === 2 ? '#ff4fd8' : '#5ef6ff';
    ctx.fillRect(right, 212, 200 * ratio, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(right + 0.5, 212.5, 199, 11);
    ctx.fillStyle = '#070414';
    ctx.fillRect(right + Math.floor(200 * 0.67), 212, 2, 12);
    ctx.fillRect(right + Math.floor(200 * 0.34), 212, 2, 12);
  } else {
    label(ctx, 'STAR GATE', right, 200, 12, '#9aa0c8');
    label(ctx, 'AHEAD', right, 218, 16, '#5ef6ff');
  }

  if (game.banner) drawBanner(ctx, game.banner);
}

function drawBanner(ctx, banner) {
  const cx = PLAY_X + PLAY_W / 2;
  const y = 168;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const alpha = Math.min(1, banner.t);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = '28px Courier New, monospace';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(banner.text, cx + 2, y + 2);
  ctx.fillStyle = banner.warn ? '#ff4fd8' : '#f4fbff';
  ctx.fillText(banner.text, cx, y);
  if (banner.sub) {
    ctx.font = '14px Courier New, monospace';
    ctx.fillStyle = '#5ef6ff';
    ctx.fillText(banner.sub, cx, y + 28);
  }
  ctx.restore();
}

export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(PLAY_W / 2, PLAY_H / 2, 80, PLAY_W / 2, PLAY_H / 2, PLAY_H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PLAY_W, VIEW_H);
}
