import { PLAY_H, PLAY_W, TUNE } from './const.js';
import { burst, pushPopup } from './particles.js';
import { multiplier } from './util.js';

export function spawnGems(game, x, y, n) {
  for (let i = 0; i < n; i++) {
    if (game.pickups.length > 90) break;
    const a = Math.random() * Math.PI * 2;
    const s = 50 + Math.random() * 90;
    game.pickups.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 20,
      anim: Math.random() * 8,
    });
  }
}

export function updatePickups(list, dt, game) {
  const p = game.player;
  const vacuum = game.vacuumT > 0 || (p.alive && p.y < TUNE.vacuumY);
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    it.anim += dt;
    const dx = p.x - it.x;
    const dy = p.y - it.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && (vacuum || d < TUNE.magnetR)) {
      const s = vacuum ? 480 : 250;
      it.vx = (dx / d) * s;
      it.vy = (dy / d) * s;
    } else {
      it.vx *= Math.exp(-1.6 * dt);
      it.vy = Math.min(40, it.vy + 36 * dt);
    }
    it.x += it.vx * dt;
    it.y += it.vy * dt;
    if (p.alive && d < TUNE.gemCollectR) {
      const pts = TUNE.gemScore * multiplier(game.combo);
      game.addScore(pts);
      game.bumpCombo(1, it.x, it.y - 8);
      game.audio.pickup();
      pushPopup(game, it.x, it.y, `+${pts}`, '#ffe56a');
      burst(game.particles, it.x, it.y, 5, '#ffe56a', 70, 0.28);
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
      continue;
    }
    if (it.y > PLAY_H + 24 || it.x < -30 || it.x > PLAY_W + 30) {
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
    }
  }
}

export function drawGem(ctx, it) {
  const x = Math.round(it.x);
  const y = Math.round(it.y + Math.sin(it.anim * 6) * 1.2);
  ctx.fillStyle = '#6a4a12';
  ctx.fillRect(x - 1, y - 3, 3, 8);
  ctx.fillStyle = '#ffe56a';
  ctx.fillRect(x, y - 4, 2, 2);
  ctx.fillRect(x - 2, y - 2, 6, 2);
  ctx.fillRect(x - 1, y, 4, 2);
  ctx.fillRect(x, y + 2, 2, 2);
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(x, y - 2, 2, 2);
}
