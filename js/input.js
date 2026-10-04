import { env } from './env.js';
import { PLAY_H, PLAY_W, PLAY_X, VIEW_H, VIEW_W } from './const.js';
import { now } from './util.js';

const MOVE = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.fire = false;
    this.focus = false;
    this.ax = 0;
    this.ay = 0;
    this.useMouse = false;
    this.playX = PLAY_W / 2;
    this.playY = PLAY_H - 80;
    this.mouseInside = false;
    this.mouseDown = false;
    this.rightDown = false;
    this.middleDown = false;
    this.clientX = 0;
    this.clientY = 0;
    this.mouseMovedAt = -1e9;
    this.bombPressed = false;
    this.pausePressed = false;
    this.confirmPressed = false;
    this.touch = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.touchFire = false;
    this.touchFocus = false;
    this._gpPrev = { bomb: false, start: false, confirm: false };
    this._bindKeys();
    this._bindPointer();
    this._bindTouch();
  }

  _bindKeys() {
    env.addEventListener('keydown', (e) => this._onKey(e, true));
    env.addEventListener('keyup', (e) => this._onKey(e, false));
    env.addEventListener('blur', () => this.resetTransient());
  }

  _onKey(e, down) {
    const block = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (block.includes(e.code)) e.preventDefault();
    if (down) {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
      if (e.code === 'Enter' || e.code === 'Space') this.confirmPressed = true;
      if (e.code === 'KeyX' || e.code === 'KeyL' || e.code === 'KeyF') this.bombPressed = true;
    } else {
      this.keys.delete(e.code);
    }
  }

  _bindPointer() {
    env.addEventListener('mousemove', (e) => {
      this.clientX = e.clientX;
      this.clientY = e.clientY;
      this.mouseMovedAt = now();
    });
    env.addEventListener('mousedown', (e) => {
      this.clientX = e.clientX;
      this.clientY = e.clientY;
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 1) {
        this.middleDown = true;
        this.bombPressed = true;
        e.preventDefault();
      }
      if (e.button === 2) this.rightDown = true;
    });
    env.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 1) this.middleDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _bindTouch() {
    const zone = env.document.getElementById('stick-zone');
    const stick = env.document.getElementById('stick');
    const knob = env.document.getElementById('knob');
    const fire = env.document.getElementById('btn-fire');
    const focus = env.document.getElementById('btn-focus');
    const bomb = env.document.getElementById('btn-bomb');
    this._stickEl = stick;
    this._knobEl = knob;

    const hold = (el, set) => {
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        set(true);
      };
      const off = (e) => {
        e.preventDefault();
        set(false);
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    hold(fire, (v) => { this.touchFire = v; });
    hold(focus, (v) => { this.touchFocus = v; });
    if (bomb) {
      bomb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.bombPressed = true;
      });
    }
    if (!zone) return;
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touch.active = true;
      this.touch.id = e.pointerId;
      this.touch.ox = e.clientX;
      this.touch.oy = e.clientY;
      this.touch.dx = 0;
      this.touch.dy = 0;
      if (zone.setPointerCapture) {
        try { zone.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      this._placeStick(e.clientX, e.clientY, 0, 0);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.touch.active || e.pointerId !== this.touch.id) return;
      const dx = e.clientX - this.touch.ox;
      const dy = e.clientY - this.touch.oy;
      const max = 56;
      const mag = Math.hypot(dx, dy) || 1;
      const k = Math.min(max, mag);
      this.touch.dx = (dx / mag) * k;
      this.touch.dy = (dy / mag) * k;
      this._placeStick(this.touch.ox, this.touch.oy, this.touch.dx, this.touch.dy);
    });
    const end = (e) => {
      if (this.touch.id != null && e.pointerId !== this.touch.id) return;
      this.touch.active = false;
      this.touch.id = null;
      this.touch.dx = 0;
      this.touch.dy = 0;
      if (this._stickEl) this._stickEl.hidden = true;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  _placeStick(x, y, dx, dy) {
    if (!this._stickEl || !this._knobEl) return;
    const parent = this._stickEl.offsetParent || this._stickEl.parentElement;
    const rect = parent && parent.getBoundingClientRect ? parent.getBoundingClientRect() : { left: 0, top: 0 };
    this._stickEl.hidden = false;
    this._stickEl.style.left = `${x - rect.left}px`;
    this._stickEl.style.top = `${y - rect.top}px`;
    this._knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  resetTransient() {
    this.keys.clear();
    this.mouseDown = false;
    this.rightDown = false;
    this.touchFire = false;
    this.touchFocus = false;
    this.touch.active = false;
    if (this._stickEl) this._stickEl.hidden = true;
  }

  sample(game) {
    this._pointerToPlay();
    this._gamepad();
    const keyX = (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? -1 : 0)
      + (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
    const keyY = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? -1 : 0)
      + (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const keyMove = keyX !== 0 || keyY !== 0;

    let gpx = 0;
    let gpy = 0;
    const pad = this._pad;
    if (pad) {
      gpx = deadzone((pad.axes && pad.axes[0]) || 0);
      gpy = deadzone((pad.axes && pad.axes[1]) || 0);
      if (btn(pad, 14)) gpx -= 1;
      if (btn(pad, 15)) gpx += 1;
      if (btn(pad, 12)) gpy -= 1;
      if (btn(pad, 13)) gpy += 1;
      gpx = Math.max(-1, Math.min(1, gpx));
      gpy = Math.max(-1, Math.min(1, gpy));
    }

    if (this.touch.active) {
      this.ax = this.touch.dx / 56;
      this.ay = this.touch.dy / 56;
    } else if (keyMove) {
      this.ax = keyX;
      this.ay = keyY;
    } else if (Math.hypot(gpx, gpy) > 0.05) {
      this.ax = gpx;
      this.ay = gpy;
    } else {
      this.ax = 0;
      this.ay = 0;
    }

    const mouseRecent = now() - this.mouseMovedAt < 400;
    this.useMouse = !!(
      game.settings.mouse &&
      this.mouseInside &&
      !this.touch.active &&
      !keyMove &&
      Math.hypot(gpx, gpy) <= 0.05 &&
      (mouseRecent || this.mouseDown)
    );

    const padFire = !!(pad && (btn(pad, 0) || trigger(pad, 7)));
    const padFocus = !!(pad && (btn(pad, 4) || trigger(pad, 6)));
    this.fire = this.mouseDown || this.touchFire || padFire
      || this.keys.has('KeyZ') || this.keys.has('KeyJ') || this.keys.has('Space');
    this.focus = this.rightDown || this.touchFocus || padFocus
      || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyK');

    if (pad) {
      const bombNow = btn(pad, 1) || btn(pad, 2) || btn(pad, 5);
      const startNow = btn(pad, 9);
      const confirmNow = btn(pad, 0);
      if (bombNow && !this._gpPrev.bomb) this.bombPressed = true;
      if (startNow && !this._gpPrev.start) this.pausePressed = true;
      if (confirmNow && !this._gpPrev.confirm && game.mode !== 'playing') this.confirmPressed = true;
      this._gpPrev = { bomb: bombNow, start: startNow, confirm: confirmNow };
    }

    return {
      bomb: take(this, 'bombPressed'),
      pause: take(this, 'pausePressed'),
      confirm: take(this, 'confirmPressed'),
    };
  }

  _pointerToPlay() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      this.mouseInside = false;
      return;
    }
    const vx = ((this.clientX - rect.left) / rect.width) * VIEW_W;
    const vy = ((this.clientY - rect.top) / rect.height) * VIEW_H;
    this.playX = vx - PLAY_X;
    this.playY = vy;
    this.mouseInside = this.playX >= 0 && this.playY >= 0 && this.playX <= PLAY_W && this.playY <= PLAY_H;
  }

  _gamepad() {
    this._pad = null;
    const nav = env.navigator;
    if (!nav || !nav.getGamepads) return;
    let pads = [];
    try { pads = nav.getGamepads() || []; } catch { pads = []; }
    for (const pad of pads) {
      if (pad) {
        this._pad = pad;
        break;
      }
    }
  }
}

function deadzone(v) {
  const d = 0.2;
  if (Math.abs(v) < d) return 0;
  return (v - Math.sign(v) * d) / (1 - d);
}

function btn(pad, i) {
  return !!(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
}

function trigger(pad, i) {
  const b = pad.buttons && pad.buttons[i];
  return !!(b && (b.pressed || b.value > 0.5));
}

function take(obj, key) {
  const v = obj[key];
  obj[key] = false;
  return v;
}

void MOVE;
void PLAY_H;
