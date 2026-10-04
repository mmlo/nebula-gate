import { env } from './env.js';
import { Game } from './game.js';

function boot() {
  const canvas = env.document.getElementById('c');
  const err = env.document.getElementById('err');
  env.addEventListener('error', (e) => {
    if (!err) return;
    err.hidden = false;
    err.textContent = e.message || 'Unexpected error';
  });
  const game = new Game(canvas);
  game.start();
}

if (env.document) {
  if (env.document.readyState === 'loading') env.document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
