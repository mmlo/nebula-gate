# Nebula Gate

An original one-stage vertical bullet-hell. Fly a small fighter through a violet nebula, survive three waves, and break the mechanical dreadnought Vesper before it can hold the star gate.

All art, text, and sound are original. Ships and effects are drawn on the canvas. Sound is synthesized with Web Audio. Nothing is loaded from a third party.

## Play

From this folder, start a static server. Opening `index.html` directly can block ES modules.

```bash
python3 -m http.server 5173
```

If that port is taken, pick another. Open `http://localhost:5173`.

`npx --yes serve . -l 5173` also works when `npx` is available. Some environments cannot download the `serve` package; the Python server above does not need a download.

Landscape phones are supported. Touch controls appear after a touch or on a coarse pointer: virtual stick on the left, Fire / Focus / Bomb on the right.

## Controls

| Action | Keyboard | Mouse | Gamepad | Touch |
| --- | --- | --- | --- | --- |
| Move | WASD or arrows | Move inside the corridor | Left stick or D-pad | Virtual stick |
| Fire | Z, J, or Space (autofire is on) | Left button | A or RT | FIRE |
| Focus | Shift or K | Right button | LB or LT | FOCUS |
| Bomb | X, L, or F | Middle button | B, X, or RB | BOMB |
| Pause | Esc or P | — | Start | — |
| Confirm | Enter or Space | Click the button | A (menus) | Tap |

Focus slows the ship and draws the hitbox. The red dot is the real hitbox. The ring is the graze band: bullets that pass through it without hitting fill the bomb meter and raise the combo.

A full meter fires a screen-clearing bomb. It erases enemy bullets, damages enemies and the boss, and pulls every score gem in.

Gems also magnetize when you are close, or when you fly near the top of the corridor.

You have five hulls and two continues. A continue restarts the current wave and keeps your score. Death clears the bullets already on screen. The best score is stored in `localStorage`.

## Stage

1. Scout Chevrons — slow aimed shots, then a wider spread.
2. Spiral Mines — cyan spirals you can weave.
3. Lance Battery — gold rings with a gap, plus diving fans.
4. Dreadnought Vesper — three phases:
   - Aegis: rings with a gap toward you, plus a thin aimed pair.
   - Twin Helix: opposite spirals from the wings and a center spread.
   - Gate Protocol: tighter double rings, a top curtain with a lane, then a short breather.

Magenta shots are aimed. Cyan shots are spirals. Gold shots are rings and curtains.

## Balance

Numbers live in `js/const.js` (`TUNE`). Waves 1–2 are slower, with wider aimed fans and staggered fire, so a first try can learn the red hit dot. The boss is unchanged in structure: phase 2 still pauses between helix bursts. Raise `bossHp` or the wave 1–2 speeds in `js/enemies.js` if you want a harsher run.

## Tests

```bash
node js/selftest.js
```

That checks pattern gaps, the stage queue, sprites, and bullet motion without a browser.
