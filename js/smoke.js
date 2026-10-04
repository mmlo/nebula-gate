import { createRequire } from 'module';
import fs from 'fs';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  console.log('skip smoke: jsdom not installed');
  process.exit(0);
}

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
globalThis.document = w.document;
globalThis.window = w;
globalThis.navigator = w.navigator;
globalThis.localStorage = w.localStorage;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = w.addEventListener.bind(w);
globalThis.removeEventListener = w.removeEventListener.bind(w);

function createMockCtx() {
  const state = {
    globalAlpha: 1,
    lineWidth: 1,
    shadowBlur: 0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    font: '16px Courier New',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: 'transparent',
  };
  const fn = () => {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => ({ addColorStop() {} });
      }
      if (prop === 'measureText') return () => ({ width: 40 });
      return fn;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const canvas = globalThis.document.getElementById('c');
canvas.getContext = () => createMockCtx();
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540 });

const { Game } = await import('./game.js');
const game = new Game(canvas);
game.frame(1 / 60);
assert(game.mode === 'title', 'boots on the title');
game.startRun();
assert(game.mode === 'playing', 'run starts');
game.tryBomb();
assert(game.player.energy === 0, 'starting bomb spends the meter');
game.player.energy = 100;
game.setMode('paused');
assert(game.mode === 'paused', 'pause');
game.setMode('playing');

const steps = Math.ceil(70 / 0.05);
for (let i = 0; i < steps; i++) {
  game.player.invuln = 5;
  game.player.alive = true;
  game.frame(0.05, { draw: false });
}
game.frame(1 / 60, { draw: true });
assert(game.boss, 'boss spawned');
assert(game.score > 0, `score increased (${game.score})`);
game.boss.hp = Math.floor(game.boss.maxHp * 0.5);
for (let i = 0; i < 50; i++) {
  game.player.invuln = 5;
  game.player.alive = true;
  game.frame(0.05, { draw: false });
}
assert(game.boss && game.boss.phase === 2, 'phase 2 started');
game.boss.hp = Math.floor(game.boss.maxHp * 0.2);
for (let i = 0; i < 80; i++) {
  game.player.invuln = 5;
  game.player.alive = true;
  game.frame(0.05, { draw: false });
}
assert(game.boss && game.boss.phase === 3 && !game.boss.dying, 'phase 3 started');
assert(game.eBullets.length <= 210, 'bullet cap held');
game.frame(1 / 60, { draw: true });
assert(game.eBullets.length > 0 || (game.boss && game.boss.phase >= 1), 'combat produced fire');
assert(game.mode === 'playing' || game.mode === 'results', 'run still in a legal mode');

game.player.lives = 1;
game.player.invuln = 0;
game.player.alive = true;
game.killPlayer();
assert(game.mode === 'results' && game.cleared === false, 'last hull ends the run');
assert(game.continues === 2, 'continues still available');
game.continueRun();
assert(game.mode === 'playing' && game.continues === 1, 'continue rewinds into the stage');
assert(game.score > 0, 'continue keeps score');

console.log('smoke passed', {
  score: game.score,
  wave: game.director.waveName,
  bossHp: game.boss ? game.boss.hp : null,
  mode: game.mode,
});

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('ok', msg);
}
