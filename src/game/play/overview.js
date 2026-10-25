// Map view: the camera lifts off Henry to show the whole town from above. Drag to move around, right-drag
// (or two fingers) to turn, scroll or pinch to zoom. Every stop has a numbered label; clicking a label,
// a stop or a row in the project list flies the camera there and opens its card.
import { THREE, scene, camera, renderer, labelRenderer } from '../gfx.js';
import { SBY, MAP_ORDER, STATIONS, ISL } from '../../data/world.js';
import { THREAD } from '../../data/content.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { clamp, reduceMotion, track } from '../util.js';
import { SFX } from '../sound.js';
import { openPanel, closePanel } from './ui.js';
import { keys, beginGame, walkToStation } from './player.js';
import { THR } from './threads.js';
import { stopStory, storyPause, storyStops } from './story.js';

const MAX_R = 46;          // how far from the town centre the view can drift
const DIST = [14, 185];     // zoom range: from one stop up close out to the whole island
const PITCH = [.5, 1.38];   // from a low three-quarter view to almost straight down
const phone = () => innerWidth < 720;

/** where the map camera wants to be; the follow camera eases towards it (see camera.js) */
export const OV = {
  t: new THREE.Vector3(), dist: 62, yaw: 0, pitch: .98,
  fast: false,       // true while dragging, so the view follows the hand instead of easing
  back: 0, pitchBack: .62,
};
const homeDist = () => {
  // far enough back that the whole town (about 64 m across with its labels) fits the screen's width
  const w = renderer.domElement.clientWidth || innerWidth, h = renderer.domElement.clientHeight || innerHeight;
  const fit = 64 / (2 * Math.tan(camera.fov * Math.PI / 360) * w / h);
  return clamp(Math.max(60, fit), 60, 118);
};
const size = () => [renderer.domElement.clientWidth || innerWidth, renderer.domElement.clientHeight || innerHeight];
/**
 * point the map camera at (x, z) so that it sits in the middle of the part of the screen that cards leave
 * free: `left`, `right` and `bottom` are the pixels covered on each side
 */
function frame(x, z, { dist = OV.dist, pitch = OV.pitch, yaw = OV.yaw, left = 0, right = 0, bottom = 0, y = 0 } = {}) {
  const [w, h] = size(), visH = 2 * dist * Math.tan(camera.fov * Math.PI / 360), visW = visH * w / h;
  const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const side = (right - left) / 2 / w * visW, fwd = -(bottom / 2) / h * visH / Math.max(.35, Math.sin(pitch));
  OV.t.set(x + rx * side + fx * fwd, y, z + rz * side + fz * fwd); clampTarget();
  OV.dist = clamp(dist, DIST[0], DIST[1]); OV.pitch = pitch; OV.yaw = yaw; OV.fast = false;
}
const listPx = () => (store.get().listOpen && size()[0] >= 1100 ? 316 : 0);
/** the whole town, centred in the part of the screen the project list leaves free */
function home(keepYaw = true, listOpen = store.get().listOpen) {
  frame(0, 1, { dist: homeDist(), pitch: .98, yaw: keepYaw ? OV.yaw : 0, left: listOpen && size()[0] >= 1100 ? 316 : 0 });
}
export function frameHome({ bottom = 0 } = {}) { frame(0, 1, { dist: homeDist() * (bottom ? 1.12 : 1), pitch: .98, bottom }); }
/** frame a few stops together (or one, close up) */
export function frameStops(ids, { bottom = 0, right = 0, dist, yaw } = {}) {
  const sts = ids.map(id => SBY[id]).filter(Boolean); if (!sts.length) return;
  const cx = sts.reduce((a, s) => a + s.x, 0) / sts.length, cz = sts.reduce((a, s) => a + s.z, 0) / sts.length;
  const R = Math.max(...sts.map(s => Math.hypot(s.x - cx, s.z - cz))) + 7;
  const [w, h] = size(), tan = Math.tan(camera.fov * Math.PI / 360), left = listPx();
  const fw = (w - left - right) / w, fh = (h - bottom) / h;
  const fit = Math.max(R / (tan * (w / h) * fw), R / (tan * fh)) * 1.05;
  // one stop close up: aim at the middle of its totem, so the totem and its label both sit in view
  frame(cx, cz, { dist: dist || (sts.length > 1 ? fit : Math.max(fit, phone() ? 30 : 24)), pitch: sts.length > 1 ? .98 : .9, yaw, left, right, bottom, y: sts.length > 1 ? 0 : sts[0].iy * .5 });
}

export function enterOverview({ list } = {}) {
  if (S.overview) { if (list !== undefined) setList(list); return; }
  if (!S.started) beginGame();
  track('map_view');
  closePanel();
  S.overview = true; S.tour = false; S.path = []; S.pendingOpen = null; S.pendingAct = null; keys.clear();
  const listOpen = list !== undefined ? list : innerWidth >= 1100;
  OV.pitchBack = S.camPitch; OV.yaw = S.camYaw; home(true, listOpen);
  labelRenderer.domElement.classList.add('ov');
  setLabelsFocusable(true);
  store.set({ overview: true, listOpen, ovFocus: null, prompt: null });
  SFX.click();
}
export function exitOverview() {
  if (!S.overview) return;
  stopStory(); THR.focus = null; store.set({ threadFocus: null });
  S.overview = false; OV.back = 1.6; ovKeys.clear();
  closePanel();
  labelRenderer.domElement.classList.remove('ov');
  setLabelsFocusable(false);
  for (const id of MAP_ORDER) { const st = SBY[id]; if (st.label) st.label.center.set(.5, .5); }
  store.set({ overview: false, listOpen: false, ovFocus: null });
  SFX.click();
  try { renderer.domElement.focus({ preventScroll: true }); } catch (err) { }
}
export function toggleOverview() { if (S.overview) exitOverview(); else enterOverview(); }
export function setList(open) { store.set({ listOpen: open }); }

/** fly to a stop and open its card; the stop is framed in whatever part of the screen the card leaves free */
export function ovOpen(id) {
  const st = SBY[id]; if (!st) return;
  if (!S.overview) enterOverview({ list: false });
  storyPause();
  flyTo(st);
  if (S.panelId !== id) openPanel(id);
  store.set({ ovFocus: id, listOpen: innerWidth < 1100 ? false : store.get().listOpen });
}
function flyTo(st) {
  const [w, h] = size();
  // the card is a drawer on the right, or a sheet along the bottom on phones; the list sits on the left
  frame(st.x, st.z, { dist: phone() ? 30 : 24, pitch: .92, right: w > 720 ? 436 : 0, bottom: w > 720 ? 0 : h * .48, left: listPx(), y: st.iy * .5 });
}
/** show one thread on the map (null: all of them), framing its stops */
export function showThread(id) {
  if (!S.overview) enterOverview({ list: false });
  if (S.story) stopStory();
  THR.focus = id && THR.focus !== id ? id : null;
  store.set({ threadFocus: THR.focus });
  if (THR.focus) { closePanel(); frameStops(THREAD[THR.focus].stops, { bottom: phone() ? 120 : 90 }); }
}
/** leave the map and let Henry walk to this stop */
export function walkHere(id) { exitOverview(); walkToStation(id); }

/* ---- the view controls ---- */
export function zoomBy(f) { OV.dist = clamp(OV.dist * f, DIST[0], DIST[1]); OV.fast = false; }
export function turnBy(a) { OV.yaw += a; OV.fast = false; }
export function resetView() { home(false); THR.focus = null; store.set({ ovFocus: null, threadFocus: null }); closePanel(); }
function clampTarget() { const l = Math.hypot(OV.t.x, OV.t.z); if (l > MAX_R) { OV.t.x *= MAX_R / l; OV.t.z *= MAX_R / l; } }
/** move the view as if the ground were grabbed and dragged by (dx, dy) pixels */
function panPx(dx, dy) {
  const h = renderer.domElement.clientHeight || innerHeight;
  const per = 2 * S.camDist * Math.tan(camera.fov * Math.PI / 360) / h, yaw = S.camYaw, sp = Math.max(.35, Math.sin(S.camPitch));
  const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  OV.t.x += (-rx * dx + fx * dy / sp) * per; OV.t.z += (-rz * dx + fz * dy / sp) * per;
  clampTarget();
}

/* ---- pointer input (the engine hands pointer events here while the map is open) ---- */
const pts = new Map();
let gesture = null;
/** @param {PointerEvent} e */
export function ovDown(e) {
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.button !== 0 || pts.size > 1) storyPause();
  const turn = e.button === 2 || e.shiftKey || e.ctrlKey || e.altKey;
  gesture = { moved: false, turn, sx: e.clientX, sy: e.clientY, two: pts.size >= 2 ? pair() : null };
  if (pts.size >= 2) gesture.moved = true;
}
function pair() {
  const [a, b] = [...pts.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}
/** @param {PointerEvent} e @returns {boolean} true while a drag is in progress */
export function ovMove(e) {
  const p = pts.get(e.pointerId); if (!p || !gesture) return false;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 6) {
    gesture.moved = true; try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { }
  }
  if (!gesture.moved) return false;
  OV.fast = true; storyPause();
  if (pts.size >= 2) {
    // two fingers: pinch to zoom, twist to turn, move together to pan
    const now = pair(), was = gesture.two || now;
    if (was.d > 0) OV.dist = clamp(OV.dist * was.d / Math.max(1, now.d), DIST[0], DIST[1]);
    OV.yaw += now.ang - was.ang;
    panPx(now.mx - was.mx, now.my - was.my);
    gesture.two = now;
  } else if (gesture.turn) {
    OV.yaw -= dx * .006; OV.pitch = clamp(OV.pitch + dy * .004, PITCH[0], PITCH[1]);
  } else panPx(dx, dy);
  return true;
}
/** @param {PointerEvent} e @returns {boolean} true when the pointer went down and up without dragging (a click) */
export function ovUp(e) {
  const g = gesture; pts.delete(e.pointerId);
  if (pts.size === 0) { gesture = null; OV.fast = false; } else if (gesture) gesture.two = pair();
  return !!g && !g.moved;
}
export function ovCancel(e) { pts.delete(e.pointerId); if (!pts.size) { gesture = null; OV.fast = false; } }
export function ovWheel(e) { zoomBy(Math.exp(clamp(e.deltaY, -120, 120) * .0016)); }

/* ---- keyboard: arrows or WASD move, Q and E turn, + and − zoom ---- */
export const ovKeys = new Set();
const OV_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', '+', '=', '-', '_'];
export function ovKey(k, down) { if (!OV_KEYS.includes(k)) return false; if (down) ovKeys.add(k); else ovKeys.delete(k); return true; }

/* ---- labels ---- */
function setLabelsFocusable(on) {
  for (const id of MAP_ORDER) {
    const el = SBY[id].labelEl; if (!el) continue;
    el.tabIndex = on ? 0 : -1;
    if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
  }
}
const _v = new THREE.Vector3();
/** labels that would overlap on screen are stacked upwards, earlier stops (case studies) keep their spot */
function layoutLabels() {
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight, placed = [];
  for (const id of MAP_ORDER) {
    const st = SBY[id], lab = st.label, el = st.labelEl; if (!lab) continue;
    lab.getWorldPosition(_v).project(camera);
    if (_v.z > 1) continue;
    const lw = el.offsetWidth || 120, lh = el.offsetHeight || 28, x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h;
    let lvl = 0;
    const cx = x > 0 && x < w ? clamp(x, lw / 2 + 6, w - lw / 2 - 6) : x;
    const hit = l => placed.some(r => Math.abs(r.x - cx) < (r.w + lw) / 2 + 4 && Math.abs(r.y - (y - l * (lh + 6))) < (r.h + lh) / 2 + 3);
    while (lvl < 5 && hit(lvl)) lvl++;
    // a label near the edge slides sideways so it stays readable (as long as its stop is on screen)
    let nx = x;
    if (x > 0 && x < w) nx = clamp(x, lw / 2 + 6, w - lw / 2 - 6);
    placed.push({ x: nx, y: y - lvl * (lh + 6), w: lw, h: lh });
    lab.center.set(.5 - (nx - x) / lw, .5 + lvl * (lh + 6) / lh);
  }
}

/** the label of the stop whose card is open is highlighted */
let activeId = null;
function syncActive() {
  const want = S.overview ? S.panelId || S.storyStop : null;
  if (want === activeId) return;
  if (activeId && SBY[activeId]) SBY[activeId].labelEl.classList.remove('active');
  if (want && SBY[want]) SBY[want].labelEl.classList.add('active');
  activeId = want;
}

/** while a thread or a story chapter is in focus, the other stops' labels step back */
let dimKey = '';
function syncDim() {
  let keep = S.overview ? storyStops() : null;
  if (S.overview && THR.focus) { keep = keep || new Set(); for (const id of THREAD[THR.focus].stops) keep.add(id); }
  const key = keep ? [...keep].sort().join() : '';
  if (key === dimKey) return; dimKey = key;
  for (const id of MAP_ORDER) SBY[id].labelEl.classList.toggle('dim', !!keep && !keep.has(id));
}

/* ---- each project square gets a ring in its stop's colour in the map view, so districts read from above ---- */
const rings = [];
export function initMapRings() {
  const seen = new Set();
  for (const st of STATIONS) {
    const is = ISL[st.island]; if (!is || is.id === 'hub' || seen.has(is.id)) continue; seen.add(is.id);
    const m = new THREE.Mesh(new THREE.RingGeometry(is.r - .55, is.r - .12, 96), new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(is.x, .012, is.z); m.visible = false; m.renderOrder = 1; scene.add(m); rings.push(m);
  }
}

let layoutT = 0;
/** runs every frame before the camera update */
export function updateOverview(dt) {
  S.ovK += ((S.overview ? 1 : 0) - S.ovK) * Math.min(1, dt * 2.5);
  syncActive(); syncDim();
  for (const r of rings) { r.material.opacity = .7 * S.ovK; r.visible = S.ovK > .02; }
  if (!S.overview) return;
  if (ovKeys.size) {
    const sp = OV.dist * .8 * dt * 60;
    let x = 0, y = 0;
    if (ovKeys.has('w') || ovKeys.has('arrowup')) y += 1;
    if (ovKeys.has('s') || ovKeys.has('arrowdown')) y -= 1;
    if (ovKeys.has('a') || ovKeys.has('arrowleft')) x += 1;
    if (ovKeys.has('d') || ovKeys.has('arrowright')) x -= 1;
    if (x || y) panPx(x * sp * .1, y * sp * .1);
    if (ovKeys.has('q')) OV.yaw += dt * 1.4;
    if (ovKeys.has('e')) OV.yaw -= dt * 1.4;
    if (ovKeys.has('+') || ovKeys.has('=')) zoomBy(Math.exp(-dt * 1.1));
    if (ovKeys.has('-') || ovKeys.has('_')) zoomBy(Math.exp(dt * 1.1));
    OV.fast = true;
  } else if (!gesture) OV.fast = false;
  layoutT -= dt;
  if (layoutT <= 0) { layoutT = .08; layoutLabels(); }
}
/** how quickly the camera catches up with OV */
export const ovRate = () => (reduceMotion ? 30 : OV.fast ? 16 : 3.2);
