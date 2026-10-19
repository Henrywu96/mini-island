// Progress shown in the HUD: quest stops visited, tool coins, interactions, neighbours met, XP and toasts.
import { store } from '../../state/store.js';
import { INTERACTIONS } from '../../data/world.js';
import { track } from '../util.js';
import { SFX } from '../sound.js';
import { burst } from './fx.js';
import { say, emote } from '../actors/henry.js';
import { P } from './player.js';

export const visited = new Set();
export const found = new Set();
export const didInt = new Set();
export const met = new Set();
let level = 4, xp = 72, toastId = 0;

export function syncTracker() {
  store.set({ visited: [...visited], found: [...found], interactions: [...didInt], met: [...met] });
}
export function addXP(n) {
  xp += n;
  if (xp >= 100) {
    xp -= 100; level++; SFX.level(); toast(`<b>Level up!</b> Henry reached LV. ${level}`); say(`Level ${level}! Thanks for exploring.`, 3); emote('cheer');
    burst(P.x, P.y + 1.5, P.z, ['#ffd166', '#ec6a4e', '#3b82f6', '#2fb67c', '#8b5cf6'], 46, 6);
  }
  store.set({ level, xp });
}
/** Short message at the top of the screen. `html` is always written by the game (dynamic parts escaped). */
export function toast(html, secs = 3.2) {
  const id = ++toastId;
  store.set({ toast: { id, html } });
  setTimeout(() => { const t = store.get().toast; if (t && t.id === id) store.set({ toast: null }); }, secs * 1000);
}
export function markInteract(id) {
  if (didInt.has(id)) return;
  track('island_interaction', { interaction_id: id });
  didInt.add(id); addXP(2); syncTracker(); SFX.pop();
  const total = Object.keys(INTERACTIONS).length;
  if (didInt.size === total) setTimeout(() => toast(`<b>All ${total} interactions found.</b> You really explored the town!`, 4), 900);
}
