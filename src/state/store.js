// A tiny external store shared by the three.js engine (writes) and React (reads).
import { useSyncExternalStore } from 'react';
import { STATIONS } from '../data/world.js';

let collapsed = false;
try { collapsed = localStorage.getItem('hq-tracker-collapsed') === '1'; } catch (err) { }

const initial = {
  started: false,
  photo: false,
  quick: false,
  panelId: null,
  help: false,
  trackerCollapsed: collapsed,
  trackerOpen: false,
  level: 4,
  xp: 72,
  buffs: /** @type {{id:string,label:string,tour?:boolean}[]} */ ([]),
  visited: /** @type {string[]} */ ([]),
  found: /** @type {string[]} */ ([]),
  interactions: /** @type {string[]} */ ([]),
  met: /** @type {string[]} */ ([]),
  censusDone: false,
  prompt: /** @type {null | {key:string, main:string, sub:string, alt:string|null}} */ (null),
  emote: /** @type {string|null} */ (null),
  toast: /** @type {null | {id:number, html:string}} */ (null),
  wx: { time: '--:--', date: '', temp: '—', desc: 'Checking your weather…', icon: 'day', title: '' },
  canGeo: true,
  tod: 'day',
  todMode: 'auto',
  sound: true,
  dialogue: /** @type {null | {npc:string, name:string, role:string, color:string, text:string, choices:string[], next:boolean, n:number}} */ (null),
  stations: STATIONS.map(s => s.id),
};

let state = initial;
const listeners = new Set();
export const store = {
  get: () => state,
  set(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    let changed = false;
    for (const k in next) if (state[k] !== next[k]) { changed = true; break; }
    if (!changed) return;
    state = { ...state, ...next };
    listeners.forEach(l => l());
  },
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
};

/** @template T @param {(s: typeof initial) => T} sel @returns {T} */
export function useStore(sel) {
  return useSyncExternalStore(store.subscribe, () => sel(state), () => sel(initial));
}
