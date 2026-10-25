// The story tour (T): a short, chaptered walk through the work in the map view. Each chapter frames a stop,
// a group of stops or the whole town, brings out the thread that connects them, and plays on by itself
// (pause, step back and forth, skip or replay from the story card).
import { STORY } from '../../data/content.js';
import { SBY } from '../../data/world.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { reduceMotion, track } from '../util.js';
import { SFX } from '../sound.js';
import { closePanel } from './ui.js';
import { OV, enterOverview, frameStops, frameHome } from './overview.js';
import { THR } from './threads.js';

const ST = { i: 0, t: 0, dur: 8, playing: false };
/** reading time for a chapter: about 4 words a second, at least 7 seconds */
const durOf = c => Math.max(7, Math.min(15, 3 + c.text.split(/\s+/).length / 3.6));
const STEPS = STORY.length;

export function startStory() {
  track('start_story');
  enterOverview({ list: false });
  closePanel();
  S.story = true; ST.playing = !reduceMotion;
  store.set({ listOpen: false });
  go(0);
}
export function stopStory() {
  if (!S.story) return;
  S.story = false; S.storyStop = null; THR.focus = null; ST.playing = false;
  store.set({ story: null, threadFocus: null });
}
function sync() {
  store.set({ story: { i: ST.i, n: STEPS, playing: ST.playing, t: Math.min(1, ST.t / ST.dur) }, threadFocus: THR.focus });
}
/** the story card's height, so each shot frames its stops above the card */
const cardPx = () => { const el = document.querySelector('.story'); return el ? el.getBoundingClientRect().height + 24 : (innerWidth < 720 ? innerHeight * .44 : 250); };
function go(i) {
  ST.i = Math.max(0, Math.min(STEPS - 1, i)); ST.t = 0;
  const c = STORY[ST.i]; ST.dur = durOf(c);
  S.storyStop = c.stop || null; THR.focus = c.thread || null;
  if (S.panelId) closePanel();
  // frame the shot now, then again once the card has its new text (and so its final height)
  const yaw = c.yaw !== undefined ? OV.yaw + c.yaw : undefined;
  const shoot = () => { const bottom = cardPx(); if (c.shot === 'home') frameHome({ bottom }); else frameStops(c.fit || [c.stop], { bottom, dist: c.dist, yaw }); };
  shoot(); requestAnimationFrame(shoot);
  if (ST.i === STEPS - 1) ST.playing = false;
  SFX.click(); sync();
}
export const storyNext = () => { if (ST.i < STEPS - 1) go(ST.i + 1); };
export const storyBack = () => go(ST.i - 1);
export const storyReplay = () => { ST.playing = !reduceMotion; go(0); };
export function storyPlay(on = !ST.playing) { ST.playing = on; if (on && ST.i === STEPS - 1) go(0); sync(); }
/** opening a card or dragging the map pauses the story */
export function storyPause() { if (S.story && ST.playing) { ST.playing = false; sync(); } }

let syncAcc = 0;
export function updateStory(dt) {
  if (!S.story) return;
  if (!S.overview) { stopStory(); return; }
  if (ST.playing && !S.panelId) {
    ST.t += dt;
    if (ST.t >= ST.dur) { if (ST.i < STEPS - 1) go(ST.i + 1); else { ST.playing = false; sync(); } }
  }
  syncAcc += dt; if (syncAcc > .1) { syncAcc = 0; sync(); }
}
/** the stops the current chapter is about (their labels stay bright) */
export function storyStops() {
  if (!S.story) return null;
  const c = STORY[ST.i];
  return new Set([...(c.fit || []), ...(c.stop ? [c.stop] : [])].filter(id => SBY[id]));
}
