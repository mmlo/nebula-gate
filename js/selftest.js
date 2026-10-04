import { classifyProximity, angleDiff, multiplier, formatScore } from './util.js';
import { ring, spread } from './patterns.js';
import { makeQueue, WAVES, rewindPoint } from './stage.js';
import { SPRITES } from './sprites.js';
import { stepBullets } from './bullets.js';
import { createEnemy } from './enemies.js';
import { createBoss, bossHitByBullet } from './boss.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  } else {
    console.log('ok', msg);
  }
}

assert(classifyProximity(0, 3.6, 3.2, 27) === 'hit', 'center is a hit');
assert(classifyProximity(14, 3.6, 3.2, 27) === 'graze', 'mid band is a graze');
assert(classifyProximity(40, 3.6, 3.2, 27) === 'none', 'far shot is safe');
assert(multiplier(0) === 1 && multiplier(9) === 1 && multiplier(10) === 2 && multiplier(25) === 3, 'combo multiplier');
assert(formatScore(42) === '00000042', 'score pad');

const gap = 0.7;
const aimed = ring(0, 0, 100, 20, 0, 0, gap, '#fff', 3);
assert(aimed.length < 20 && aimed.length > 8, 'gap ring removes a slice');
for (const b of aimed) {
  const a = Math.atan2(b.vy, b.vx);
  assert(Math.abs(angleDiff(a, 0)) >= gap - 1e-6, 'bullet stays outside the gap');
}
const fan = spread(0, 0, 0, 100, 50, 5, 0.8, '#fff', 3);
assert(fan.length === 5, 'spread count');
assert(fan.every((b) => Math.abs(Math.hypot(b.vx, b.vy) - 50) < 1e-6), 'spread speed');

const q = makeQueue();
let prev = -1;
for (const ev of q) {
  assert(ev.t >= prev, 'queue is time-sorted');
  prev = ev.t;
}
const types = new Set(q.filter((e) => e.kind === 'spawn').map((e) => e.type));
assert(types.has('drone') && types.has('spinner') && types.has('lancer') && types.has('turret'), 'three wave types');
assert(q.some((e) => e.kind === 'boss'), 'boss is scheduled');
assert(WAVES.length === 4, 'four chapters');
assert(rewindPoint(10) === WAVES[0].start, 'early rewind');
assert(rewindPoint(80) === 58, 'boss rewind includes the warning');

for (const [name, rows] of Object.entries(SPRITES)) {
  const w = rows[0].length;
  assert(rows.every((r) => r.length === w), `sprite ${name} is rectangular`);
}

const list = [
  { x: 10, y: 10, vx: 0, vy: -100, life: 1, r: 2 },
  { x: 10, y: 10, vx: 0, vy: 0, life: 0.01, r: 2 },
];
stepBullets(list, 0.05);
assert(list.length === 1, 'expired bullet is removed');
stepBullets(list, 2);
assert(list.length === 0, 'offscreen bullet is removed');

const drone = createEnemy(q.find((e) => e.kind === 'spawn' && e.type === 'drone'));
assert(drone.hp > 0 && drone.hurtR > 0, 'drone has a body');
const boss = createBoss();
assert(boss.phase === 1 && boss.hp === boss.maxHp, 'boss starts in phase 1');
assert(bossHitByBullet(boss, { x: boss.x, y: 10, r: 3 }) === false, 'entering boss shrugs shots');
boss.entering = 0;
boss.invuln = 0;
boss.x = 200;
boss.y = 96;
assert(bossHitByBullet(boss, { x: 200, y: 100, r: 3 }) === true, 'hull can be hit after entrance');

await import('./game.js');
console.log('ok modules import');

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('selftest passed');
