export function burst(list, x, y, n, color, speed, life) {
  if (list.length > 360) n = Math.min(n, 4);
  if (list.length > 420) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.75);
    list.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life,
      max: life,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

export function pushPopup(game, x, y, text, color = '#ffffff') {
  game.popups.push({ x, y, text, color, life: 0.85, max: 0.85 });
  if (game.popups.length > 28) game.popups.shift();
}

export function updateParticles(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = Math.exp(-2.4 * dt);
    p.vx *= drag;
    p.vy *= drag;
    if (p.life <= 0) {
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
    }
  }
}

export function updatePopups(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    p.y -= 26 * dt;
    if (p.life <= 0) {
      const last = list.length - 1;
      list[i] = list[last];
      list.pop();
    }
  }
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const s = Math.max(1, p.size);
    ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
  }
  ctx.globalAlpha = 1;
}

export function drawPopups(ctx, list) {
  ctx.font = '12px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(p.text, p.x + 1, p.y + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
