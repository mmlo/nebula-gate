import { env } from './env.js';
import { PLAY_H, PLAY_W, TUNE, VIEW_H, VIEW_W } from './const.js';
import { classifyProximity, multiplier, now } from './util.js';
import { loadBest, loadSettings, loadTutorialSeen, saveBest, saveTutorialSeen } from './storage.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { createBackground, updateBackground } from './background.js';
import { createPlayer, updatePlayer } from './player.js';
import { killEnemy, removeDeadEnemies, updateEnemies } from './enemies.js';
import { bossHitByBullet, bossHitsPlayer, updateBoss } from './boss.js';
import { stepBullets } from './bullets.js';
import { updatePickups } from './pickups.js';
import { burst, pushPopup, updateParticles, updatePopups } from './particles.js';
import { createDirector, rewindPoint, updateDirector } from './stage.js';
import { render } from './render.js';

export const DEFAULT_SETTINGS = {
  master: 0.85,
  sfx: 0.8,
  bgm: 0.38,
  autofire: true,
  mouse: true,
  hitbox: false,
  shake: true,
};

function emptyStats() {
  return { graze: 0, maxCombo: 0, time: 0, bombsUsed: 0, hits: 0 };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.settings = loadSettings(DEFAULT_SETTINGS);
    this.best = loadBest();
    this.audio = new AudioEngine();
    this.audio.setVolumes(this.settings);
    this.input = new Input(canvas);
    this.ui = new UI(this);
    this.bg = createBackground();
    this.mode = 'title';
    this.runActive = false;
    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.comboIdle = 0;
    this.rank = 1;
    this.continues = TUNE.continues;
    this.player = createPlayer();
    this.director = createDirector();
    this.enemies = [];
    this.pBullets = [];
    this.eBullets = [];
    this.pickups = [];
    this.particles = [];
    this.popups = [];
    this.boss = null;
    this.banner = null;
    this.flash = 0;
    this.warnT = 0;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.vacuumT = 0;
    this.bombFx = null;
    this.gate = 0.45;
    this.nearMiss = false;
    this.hitFlash = 0;
    this.cleared = false;
    this.isNewBest = false;
    this.hitStop = 0;
    this.stats = emptyStats();
    this.settingsFrom = 'title';
    this.coarse = false;
    this.resize();
    this.ui.syncControls(this.settings);
    this.ui.apply(this);
    this._detectCoarse();
    env.addEventListener('resize', () => this.resize());
    env.document.addEventListener('visibilitychange', () => {
      if (env.document.hidden && this.mode === 'playing') this.setMode('paused');
    });
  }

  _detectCoarse() {
    try {
      const mq = env.matchMedia && env.matchMedia('(pointer: coarse)');
      if (mq && mq.matches) {
        this.coarse = true;
        env.document.body.classList.add('touch');
      }
    } catch { /* ignore */ }
    env.addEventListener('touchstart', () => {
      this.coarse = true;
      env.document.body.classList.add('touch');
      this.audio.unlock();
    }, { passive: true });
  }

  resize() {
    const dpr = Math.min(env.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.floor(VIEW_W * dpr);
    this.canvas.height = Math.floor(VIEW_H * dpr);
  }

  start() {
    let last = now();
    const loop = (t) => {
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      this.frame(dt);
      env.requestAnimationFrame(loop);
    };
    env.requestAnimationFrame(loop);
  }

  frame(dt, opts = {}) {
    const step = Math.max(0, Math.min(0.05, dt || 0));
    const edges = this.input.sample(this);
    const frozen = this.mode === 'paused'
      || this.mode === 'results'
      || (this.mode === 'settings' && this.runActive);
    if (!frozen) {
      this.time += step;
      updateBackground(this.bg, step);
      if (!this.runActive) this.gate += (0.5 - this.gate) * Math.min(1, step * 2);
    }
    if (this.mode === 'playing') {
      if (edges.pause) this.setMode('paused');
      else this.updatePlaying(step, edges);
    } else if (this.mode === 'paused') {
      if (edges.pause || edges.confirm) this.setMode('playing');
    } else if (this.mode === 'title') {
      if (edges.confirm) this.onStart();
    } else if (this.mode === 'tutorial') {
      if (edges.confirm) this.dismissTutorial(true);
    } else if (this.mode === 'settings') {
      if (edges.pause) this.closeSettings();
    } else if (this.mode === 'results') {
      if (edges.confirm) this.onResultsConfirm();
    }
    this.audio.update();
    if (opts.draw !== false) this.render();
  }

  render() {
    if (!this.ctx) return;
    render(this.ctx, this);
  }

  updatePlaying(dt, edges) {
    let step = dt;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      step = dt * 0.05;
    }
    this.rank = Math.min(1.14, 1 + Math.max(0, this.director.t - 40) * 0.0022);
    const gateTarget = this.boss ? (this.boss.dying ? 1.45 : 1) : (this.director.t > 50 ? 0.72 : 0.3);
    this.gate += (gateTarget - this.gate) * Math.min(1, step * 1.3);

    if (this.player.alive) updatePlayer(this.player, step, this);
    if (edges.bomb) this.tryBomb();
    updateDirector(this.director, step, this);
    if (this.boss) updateBoss(this.boss, step, this);
    if (this.mode !== 'playing') return;
    updateEnemies(this.enemies, step, this);
    stepBullets(this.pBullets, step);
    stepBullets(this.eBullets, step);
    updatePickups(this.pickups, step, this);
    updateParticles(this.particles, step);
    updatePopups(this.popups, step);
    this.resolveCombat();
    removeDeadEnemies(this.enemies);

    this.comboIdle += step;
    if (this.comboIdle > 2.35 && this.combo > 0) this.combo = Math.max(0, this.combo - step * 7);
    if (this.banner) {
      this.banner.t -= step;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.flash = Math.max(0, this.flash - step * 1.15);
    this.hitFlash = Math.max(0, (this.hitFlash || 0) - step * 0.8);
    this.warnT = Math.max(0, this.warnT - step);
    if (this.vacuumT > 0) this.vacuumT -= step;
    if (this.bombFx) {
      this.bombFx.life -= step;
      this.bombFx.r += 860 * step;
      if (this.bombFx.life <= 0) this.bombFx = null;
    }
    this.updateShake(step);
    this.stats.time += step;
  }

  resolveCombat() {
    const p = this.player;
    this.nearMiss = false;
    for (let i = this.pBullets.length - 1; i >= 0; i--) {
      const b = this.pBullets[i];
      let hit = false;
      for (const e of this.enemies) {
        if (e.dead || e.left) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.hurtR + b.r;
        if (dx * dx + dy * dy <= rr * rr) {
          e.hp -= b.dmg;
          e.hurt = 0.08;
          this.audio.tick();
          burst(this.particles, b.x, b.y, 4, '#ffffff', 90, 0.18);
          if (e.hp <= 0) {
            e.dead = true;
            killEnemy(e, this);
          }
          hit = true;
          break;
        }
      }
      if (!hit && bossHitByBullet(this.boss, b)) {
        this.boss.hp = Math.max(0, this.boss.hp - b.dmg);
        this.boss.hurt = 0.06;
        this.audio.tick();
        burst(this.particles, b.x, b.y, 3, '#d7e7ff', 80, 0.16);
        hit = true;
      }
      if (hit) {
        const last = this.pBullets.length - 1;
        this.pBullets[i] = this.pBullets[last];
        this.pBullets.pop();
      }
    }

    if (!p.alive) return;
    if (p.invuln <= 0) {
      for (let i = 0; i < this.eBullets.length; i++) {
        const b = this.eBullets[i];
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        const cls = classifyProximity(d, p.hitR, b.r, p.grazeR);
        if (cls === 'hit') {
          this.killPlayer();
          return;
        }
        if (cls === 'graze') {
          this.nearMiss = true;
          if (!b.grazed) this.graze(b);
        }
      }
      for (const e of this.enemies) {
        if (e.dead || e.left) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.hurtR * 0.46 + p.hitR) {
          this.killPlayer();
          return;
        }
      }
      if (bossHitsPlayer(this.boss, p.x, p.y, p.hitR)) this.killPlayer();
    } else {
      for (const b of this.eBullets) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d <= p.grazeR && d > p.hitR + b.r) {
          this.nearMiss = true;
          if (!b.grazed) this.graze(b);
        }
      }
    }
  }

  graze(b) {
    b.grazed = true;
    this.stats.graze += 1;
    this.bumpCombo(1, this.player.x, this.player.y - 22);
    this.addScore(TUNE.grazeScore * multiplier(this.combo));
    const p = this.player;
    if (p.energy < TUNE.energyMax) {
      const before = p.energy;
      p.energy = Math.min(TUNE.energyMax, p.energy + TUNE.grazeEnergy);
      if (before < TUNE.energyMax && p.energy >= TUNE.energyMax) this.audio.ready();
    }
    this.audio.graze();
    burst(this.particles, (b.x + p.x) / 2, (b.y + p.y) / 2, 3, '#bffcff', 50, 0.16);
  }

  killPlayer() {
    const p = this.player;
    if (!p.alive || p.invuln > 0 || this.mode !== 'playing') return;
    this.stats.hits += 1;
    this.audio.playerHit();
    this.shake(14);
    this.flash = Math.max(this.flash, 0.85);
    this.hitFlash = 0.7;
    this.hitStop = 0.08;
    burst(this.particles, p.x, p.y, 28, '#ff4fd8', 200, 0.5);
    burst(this.particles, p.x, p.y, 12, '#5ef6ff', 120, 0.4);
    this.eBullets.length = 0;
    this.combo = 0;
    this.comboIdle = 0;
    p.lives -= 1;
    if (p.lives > 0) {
      p.x = PLAY_W / 2;
      p.y = PLAY_H - 78;
      p.invuln = 3.3;
      p.hurt = 0.55;
      p.showBox = 3.2;
      this.banner = { text: 'HULL BREACH', sub: `${p.lives} REMAIN`, t: 1.35, warn: true };
    } else {
      p.alive = false;
      this.endRun(false);
    }
  }

  tryBomb() {
    const p = this.player;
    if (!p || !p.alive || p.bombCd > 0 || this.mode !== 'playing') return;
    if (p.energy < TUNE.energyMax) {
      this.audio.deny();
      return;
    }
    p.energy = 0;
    p.bombCd = 0.5;
    p.invuln = Math.max(p.invuln, 1.2);
    this.vacuumT = Math.max(this.vacuumT, 1.3);
    this.stats.bombsUsed += 1;
    const n = this.eBullets.length;
    if (n) this.addScore(n * 12);
    this.eBullets.length = 0;
    for (const e of this.enemies) {
      if (e.dead || e.left) continue;
      e.hp -= TUNE.bombEnemyDmg;
      e.hurt = 0.12;
      if (e.hp <= 0) {
        e.dead = true;
        killEnemy(e, this);
      }
    }
    if (this.boss && this.boss.invuln <= 0 && this.boss.entering <= 0 && !this.boss.dying) {
      this.boss.hp = Math.max(0, this.boss.hp - TUNE.bombBossDmg);
      this.boss.hurt = 0.16;
    }
    this.bombFx = { r: 18, life: 0.5 };
    this.flash = Math.max(this.flash, 0.65);
    this.shake(12);
    this.audio.bomb();
    burst(this.particles, p.x, p.y, 40, '#ffe56a', 300, 0.55);
    burst(this.particles, p.x, p.y, 16, '#5ef6ff', 180, 0.4);
    pushPopup(this, p.x, p.y - 28, n ? `CANCEL ${n}` : 'BOMB', '#ffe56a');
  }

  addScore(n) {
    this.score += Math.max(0, Math.floor(n || 0));
  }

  bumpCombo(n, x, y) {
    const prev = Math.floor(this.combo);
    this.combo = prev + n;
    this.comboIdle = 0;
    if (this.combo > this.stats.maxCombo) this.stats.maxCombo = this.combo;
    if (x != null && Math.floor(prev / 10) !== Math.floor(this.combo / 10)) {
      pushPopup(this, x, y, `COMBO ${this.combo}`, '#ffe56a');
      this.audio.combo();
    }
  }

  shake(mag) {
    if (!this.settings.shake) return;
    this.shakeMag = Math.min(16, this.shakeMag + mag);
  }

  updateShake(dt) {
    if (!this.settings.shake) this.shakeMag = 0;
    this.shakeMag *= Math.exp(-3.2 * dt);
    if (this.shakeMag < 0.3) this.shakeMag = 0;
    this.shakeX = (Math.random() * 2 - 1) * this.shakeMag;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeMag;
  }

  resetField() {
    this.enemies.length = 0;
    this.pBullets.length = 0;
    this.eBullets.length = 0;
    this.pickups.length = 0;
    this.particles.length = 0;
    this.popups.length = 0;
    this.boss = null;
    this.banner = null;
    this.flash = 0;
    this.warnT = 0;
    this.vacuumT = 0;
    this.bombFx = null;
    this.hitStop = 0;
    this.hitFlash = 0;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  startRun() {
    this.score = 0;
    this.combo = 0;
    this.comboIdle = 0;
    this.rank = 1;
    this.stats = emptyStats();
    this.continues = TUNE.continues;
    this.cleared = false;
    this.isNewBest = false;
    this.player = createPlayer();
    this.director = createDirector();
    this.resetField();
    this.runActive = true;
    this.gate = 0.32;
    this.audio.setBossMode(false);
    this.audio.unlock();
    this.banner = { text: 'NEBULA GATE', sub: 'ENTER THE CORRIDOR', t: 2.2, warn: false };
    this.setMode('playing');
  }

  continueRun() {
    if (this.cleared || this.continues <= 0 || this.mode !== 'results') return;
    this.continues -= 1;
    const point = rewindPoint(this.director.t);
    const score = this.score;
    const stats = { ...this.stats };
    const continues = this.continues;
    this.resetField();
    this.player = createPlayer();
    this.score = score;
    this.stats = stats;
    this.continues = continues;
    this.combo = 0;
    this.comboIdle = 0;
    this.director.t = Math.max(0, point - 0.05);
    this.director.qi = 0;
    const q = this.director.queue;
    while (this.director.qi < q.length && q[this.director.qi].t < this.director.t) this.director.qi += 1;
    this.director.bossSpawned = false;
    this.director.waveName = '';
    this.director.waveId = 0;
    this.runActive = true;
    this.audio.setBossMode(false);
    this.audio.unlock();
    this.banner = { text: 'CONTINUE', sub: `${this.continues} REMAINING`, t: 1.7, warn: false };
    this.setMode('playing');
  }

  endRun(cleared) {
    if (this.mode === 'results') return;
    this.cleared = !!cleared;
    this.isNewBest = this.score > this.best;
    if (this.score > this.best) this.best = saveBest(this.score);
    this.audio.setBossMode(false);
    this.audio.sting(this.cleared);
    this.setMode('results');
  }

  onResultsConfirm() {
    if (!this.cleared && this.continues > 0) this.continueRun();
    else this.retry();
  }

  onStart() {
    this.audio.unlock();
    this.audio.ui();
    if (!loadTutorialSeen()) this.setMode('tutorial');
    else this.startRun();
  }

  openTutorial() {
    this.audio.unlock();
    this.setMode('tutorial');
  }

  dismissTutorial(engage) {
    const box = env.document.getElementById('tut-remember');
    if (!box || box.checked) saveTutorialSeen();
    if (engage) this.startRun();
    else this.setMode('title');
  }

  openSettings(from) {
    this.settingsFrom = from || (this.runActive ? 'paused' : 'title');
    this.ui.syncControls(this.settings);
    this.setMode('settings');
  }

  closeSettings() {
    this.setMode(this.settingsFrom === 'paused' && this.runActive ? 'paused' : 'title');
  }

  retry() {
    this.audio.unlock();
    this.startRun();
  }

  toTitle() {
    this.runActive = false;
    this.audio.setBossMode(false);
    this.resetField();
    this.player = createPlayer();
    this.director = createDirector();
    this.score = 0;
    this.combo = 0;
    this.banner = null;
    this.setMode('title');
  }

  setMode(mode) {
    this.mode = mode;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.ui.apply(this);
  }
}
