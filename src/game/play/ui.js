// What the engine does when the React UI opens or closes things: quest cards, the quick view,
// photo mode and the guided tour. The UI itself is rendered by React from the store.
import { renderer } from '../gfx.js';
import { SBY, STATIONS, ORDER } from '../../data/world.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { track } from '../util.js';
import { SFX } from '../sound.js';
import { faceToward } from '../actors/henry.js';
import { mailFlag } from '../world/hub.js';
import { visited, addXP, toast, syncTracker } from './hud.js';
import { markVisited } from './stations.js';
import { beginGame, walkToStation } from './player.js';

export function openPanel(id) {
  const st = SBY[id]; if (!st) return;
  track('open_quest', { quest_id: id, quest_name: st.name });
  faceToward(st.x, st.z, 1.5); SFX.open(); onPanelOpened(id);
  S.panelId = id; store.set({ panelId: id, prompt: null });
  if (!visited.has(id)) {
    visited.add(id); markVisited(st);
    addXP(5); syncTracker();
    if (id === 'contact') mailFlag.rotation.z = -1.2;
    if (visited.size === STATIONS.length) setTimeout(() => toast('<b>Quest log complete.</b> Thanks for exploring Henry’s work!', 4.5), 600);
  }
}
export function closePanel() {
  if (!S.panelId) return;
  S.panelId = null; store.set({ panelId: null }); SFX.close();
  try { renderer.domElement.focus({ preventScroll: true }); } catch (err) { }
}
/** a button inside a card or the tracker that walks to another stop */
export function goTo(id) { closePanel(); store.set({ trackerOpen: false }); walkToStation(id); }

export function openQuick() { track('quick_view'); S.quick = true; store.set({ quick: true }); }
export function closeQuick(start = true) { S.quick = false; store.set({ quick: false }); if (start && !S.started) beginGame(); }
export function quickGo(id) { S.quick = false; store.set({ quick: false }); if (!S.started) beginGame(); walkToStation(id); }

export function setPhoto(on) {
  if (on && !S.started) beginGame();
  S.photo = on; store.set({ photo: on }); if (on) track('photo_mode');
  if (on) { closePanel(); S.path = []; SFX.click(); }
}

export function startTour() {
  track('start_tour');
  if (!S.started) beginGame();
  S.quick = false; store.set({ quick: false }); closePanel(); S.tour = true;
  toast('<b>Guided tour</b> · Henry walks you to every stop. Press “Next” in each card to continue.', 3.6);
  walkToStation(ORDER[0]);
}
export function stopTour() { S.tour = false; }
function onPanelOpened(id) {
  if (S.tour && id === ORDER[ORDER.length - 1]) { S.tour = false; track('complete_tour'); setTimeout(() => toast('<b>Tour complete.</b> Thanks for visiting every stop!', 3.6), 500); }
}
