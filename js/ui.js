import { env } from './env.js';
import { formatScore, formatTime } from './util.js';
import { saveSettings } from './storage.js';

export class UI {
  constructor(game) {
    this.game = game;
    const $ = (id) => env.document.getElementById(id);
    this.overlay = $('overlay');
    this.screens = {
      title: $('screen-title'),
      tutorial: $('screen-tutorial'),
      settings: $('screen-settings'),
      paused: $('screen-pause'),
      results: $('screen-results'),
    };
    this.best = $('title-best');
    this.master = $('vol-master');
    this.sfx = $('vol-sfx');
    this.bgm = $('vol-bgm');
    this.autofire = $('opt-autofire');
    this.mouse = $('opt-mouse');
    this.hitbox = $('opt-hitbox');
    this.shake = $('opt-shake');
    this.remember = $('tut-remember');
    this.resTitle = $('res-title');
    this.resSub = $('res-sub');
    this.resScore = $('res-score');
    this.resBest = $('res-best');
    this.resNew = $('res-new');
    this.resGraze = $('res-graze');
    this.resCombo = $('res-combo');
    this.resTime = $('res-time');
    this.resBombs = $('res-bombs');
    this.resHits = $('res-hits');
    this.btnContinue = $('btn-continue');

    const click = (id, fn) => {
      const el = $(id);
      el.addEventListener('click', (e) => {
        e.preventDefault();
        game.audio.unlock();
        game.audio.ui();
        fn();
      });
    };
    click('btn-start', () => game.onStart());
    click('btn-how', () => game.openTutorial());
    click('btn-settings', () => game.openSettings('title'));
    click('btn-tut-go', () => game.dismissTutorial(true));
    click('btn-tut-back', () => game.dismissTutorial(false));
    click('btn-set-back', () => game.closeSettings());
    click('btn-resume', () => game.setMode('playing'));
    click('btn-pause-settings', () => game.openSettings('paused'));
    click('btn-retry', () => game.retry());
    click('btn-quit', () => game.toTitle());
    click('btn-continue', () => game.continueRun());
    click('btn-results-retry', () => game.retry());
    click('btn-results-title', () => game.toTitle());

    const onSet = () => this.commitSettings();
    for (const el of [this.master, this.sfx, this.bgm, this.autofire, this.mouse, this.hitbox, this.shake]) {
      el.addEventListener('input', onSet);
      el.addEventListener('change', onSet);
    }
  }

  syncControls(s) {
    this.master.value = String(Math.round(s.master * 100));
    this.sfx.value = String(Math.round(s.sfx * 100));
    this.bgm.value = String(Math.round(s.bgm * 100));
    this.autofire.checked = !!s.autofire;
    this.mouse.checked = !!s.mouse;
    this.hitbox.checked = !!s.hitbox;
    this.shake.checked = !!s.shake;
  }

  commitSettings() {
    const g = this.game;
    g.settings = {
      master: num(this.master.value) / 100,
      sfx: num(this.sfx.value) / 100,
      bgm: num(this.bgm.value) / 100,
      autofire: !!this.autofire.checked,
      mouse: !!this.mouse.checked,
      hitbox: !!this.hitbox.checked,
      shake: !!this.shake.checked,
    };
    g.audio.setVolumes(g.settings);
    saveSettings(g.settings);
  }

  apply(game) {
    const open = game.mode !== 'playing';
    this.overlay.dataset.open = open ? '1' : '0';
    for (const [mode, el] of Object.entries(this.screens)) {
      el.hidden = game.mode !== mode;
    }
    env.document.body.classList.toggle('playing', game.mode === 'playing');
    if (game.mode === 'title') this.best.textContent = formatScore(game.best);
    if (game.mode === 'results') this.fillResults(game);
  }

  fillResults(game) {
    this.resTitle.textContent = game.cleared ? 'GATE BREACHED' : 'SIGNAL LOST';
    this.resSub.textContent = game.cleared
      ? 'Vesper breaks apart. The star gate answers.'
      : 'The corridor keeps its dead. The gate is still shut.';
    this.resScore.textContent = formatScore(game.score);
    this.resBest.textContent = formatScore(game.best);
    this.resNew.hidden = !game.isNewBest;
    this.resGraze.textContent = String(game.stats.graze);
    this.resCombo.textContent = String(game.stats.maxCombo);
    this.resTime.textContent = formatTime(game.stats.time);
    this.resBombs.textContent = String(game.stats.bombsUsed);
    this.resHits.textContent = String(game.stats.hits);
    const can = !game.cleared && game.continues > 0;
    this.btnContinue.hidden = !can;
    this.btnContinue.textContent = `CONTINUE (${game.continues})`;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
