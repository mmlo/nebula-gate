import { COL } from './const.js';

export const SPRITES = {
  player: [
    '.......w.......',
    '......ccc......',
    '.....ccccc.....',
    '....ccwcwcc....',
    '...cccwcwccc...',
    '..mcccwcwcccm..',
    '.mmcccccccccmm.',
    'mmmcwwwwwwwcmmm',
    '.mm..w.c.w..mm.',
    '..m...w.w...m..',
    '...m..e.e..m...',
    '....eee.eee....',
    '...ee.....ee...',
  ],
  drone: [
    '......m......',
    '.....mmm.....',
    '....mmmmm....',
    '...mmm.mmm...',
    '..mmmm.mmmm..',
    '.mmmmcwcmmmm.',
    '..mmm.c.mmm..',
    '...m.....m...',
  ],
  spinner: [
    '......c......',
    '.....cwc.....',
    '....cwwwc....',
    '...cwwwwwc...',
    '..cwwwmwwwc..',
    '...cwwwwwc...',
    '....cwwwc....',
    '.....cwc.....',
    '......m......',
  ],
  lancer: [
    '...c...',
    '..ccc..',
    '.ccccc.',
    'cccwccc',
    '.mcccm.',
    '..m.m..',
    '...e...',
  ],
  turret: [
    '..s.s.s..',
    '.scccccs.',
    'scwcwcwcs',
    '.scccccs.',
    '..s.m.s..',
  ],
};

for (const [name, rows] of Object.entries(SPRITES)) {
  const w = rows[0].length;
  for (const row of rows) {
    if (row.length !== w) throw new Error(`Uneven sprite row in ${name}`);
  }
}

export function drawSprite(ctx, rows, px, ox, oy, tint, flipY = false) {
  const list = flipY ? rows.slice().reverse() : rows;
  const h = list.length;
  const w = list[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = list[y][x];
      if (ch === '.' || (!tint && !COL[ch])) continue;
      ctx.fillStyle = tint || COL[ch];
      ctx.fillRect(
        Math.round(ox + (x - w / 2) * px),
        Math.round(oy + (y - h / 2) * px),
        px,
        px,
      );
    }
  }
}

function paint(ctx, rows, px, x, y, tint, flipY) {
  drawSprite(ctx, rows, px, x + 1, y + 1, '#140818', flipY);
  drawSprite(ctx, rows, px, x, y, tint, flipY);
}

export function drawPlayer(ctx, p, game) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const blink = p.invuln > 0 && game.runActive && Math.sin(game.time * 46) > 0.55;
  if (!blink) {
    paint(ctx, SPRITES.player, 2, x, y, p.hurt > 0 ? '#ffffff' : null, false);
    const flick = Math.floor(game.time * 18) % 2;
    ctx.fillStyle = flick ? '#ffe56a' : '#ff4fd8';
    ctx.fillRect(x - 3, y + 14, 2, flick ? 6 : 4);
    ctx.fillRect(x + 2, y + 14, 2, flick ? 4 : 6);
    if (p.muzzle > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, y - 18, 2, 6);
    }
  }
  const teach = !!(p.focus || (p.showBox > 0) || (game.settings && game.settings.hitbox));
  ctx.save();
  ctx.strokeStyle = game.nearMiss
    ? 'rgba(255,229,106,0.95)'
    : (teach ? 'rgba(94,246,255,0.9)' : 'rgba(94,246,255,0.32)');
  ctx.lineWidth = teach || game.nearMiss ? 2 : 1;
  ctx.beginPath();
  ctx.arc(x, y, p.grazeR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ff2458';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2.2, p.hitR), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (p.focus) {
    ctx.strokeStyle = 'rgba(94,246,255,0.85)';
    ctx.strokeRect(x - 18, y - 18, 36, 36);
  }
  ctx.restore();
}

export function drawEnemy(ctx, e) {
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  const tint = e.hurt > 0 ? '#ffffff' : e.telegraph ? '#fff1a8' : null;
  ctx.save();
  if (e.type === 'lancer') {
    ctx.translate(x, y);
    ctx.rotate(e.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    paint(ctx, SPRITES.lancer, 3, 0, 0, tint, false);
  } else if (e.type === 'spinner') {
    paint(ctx, SPRITES.spinner, 2, x, y, tint, false);
    ctx.strokeStyle = 'rgba(94,246,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 16, e.anim * 2, e.anim * 2 + 1.4);
    ctx.stroke();
  } else if (e.type === 'turret') {
    paint(ctx, SPRITES.turret, 3, x, y, tint, false);
  } else {
    paint(ctx, SPRITES.drone, 2, x, y, tint, true);
  }
  ctx.restore();
}
