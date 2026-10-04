import { env } from './env.js';

const BEST = 'nebula-gate-best';
const SETTINGS = 'nebula-gate-settings';
const TUTORIAL = 'nebula-gate-tutorial';

function read(key) {
  try {
    return env.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    env.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function loadBest() {
  const n = Number(read(BEST) || 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function saveBest(score) {
  const prev = loadBest();
  const next = Math.max(prev, Math.floor(score || 0));
  write(BEST, String(next));
  return next;
}

export function loadSettings(defaults) {
  const raw = read(SETTINGS);
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings) {
  write(SETTINGS, JSON.stringify(settings));
}

export function loadTutorialSeen() {
  return read(TUTORIAL) === '1';
}

export function saveTutorialSeen() {
  write(TUTORIAL, '1');
}
