// Builds Quest Town inside the given DOM nodes, wires keyboard and pointer input, runs the frame loop
// and returns the small API the React UI calls.
import { THREE, initGfx, renderer, labelRenderer, scene, camera, stationHits, walkMeshes, sun, QUALITY } from './gfx.js';
import { initNav, groundY } from './nav.js';
import { S } from './state.js';
import { store } from '../state/store.js';
import { clamp, reduceMotion } from './util.js';
import { SFX, isSoundOn, setSound, unlockAudio } from './sound.js';
import { initHub, banners, wheel } from './world/hub.js';
import { initBridgly, updateBridgly } from './world/bridgly.js';
import { initTransit, updateLRT } from './world/transit.js';
import { initYard, updateYard } from './world/yard.js';
import { initGrove, updateGrove } from './world/grove.js';
import { initMarket, updateMarket } from './world/market.js';
import { initShowroom, updateShowroom } from './world/showroom.js';
import { initSquareDecor, initClouds, updateClouds, initButterflies, updateButterflies, initMapleLeaves, updateMapleLeaves } from './world/nature.js';
import { initCanada, updateCanada, CANADA } from './world/canada.js';
import { initWildlife, updateWildlife, WILD } from './world/wildlife.js';
import { initFoodCourt, updateFoodCourt } from './world/foodcourt.js';
import { initTown, updateTown } from './world/town.js';
import { initStations, updateStations } from './play/stations.js';
import { initFx, updateFx, hoverRing, destDot, markAt } from './play/fx.js';
import { initHenry } from './actors/henry.js';
import { H, initHamster, petHamster } from './actors/hamster.js';
import { initBall, updateBall, BALL } from './play/ball.js';
import { initPets, updatePets, walkToPet } from './actors/pets.js';
import { initNpcs, updateNpcs, walkToNpc, dialogueChoose, dialogueNext, dialogueClose, FOLK } from './actors/npcs.js';
import { updatePlanes } from './play/plane.js';
import { initTod, updateTod, cycleTod, composer } from './sky/tod.js';
import { initWeather, startWeather, updateWeather, wxCycle, usePreciseLocation, WXS } from './sky/weather.js';
import { updateCamera, placeCamera, camTarget } from './play/camera.js';
import { initMinimap, drawMinimap, minimapClick } from './play/minimap.js';
import { syncTracker } from './play/hud.js';
import { P, keys, beginGame, walkTo, walkToStation, walkToProp, updatePlayer, updatePrompt, interact, interactAlt, jump, doEmote } from './play/player.js';
import { openPanel, closePanel, goTo, openQuick, closeQuick, quickGo, setPhoto, startTour, stopTour } from './play/ui.js';
import { ISL } from '../data/world.js';

const DEBUG = typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);
let created = null;

function setTrackerCollapsed(c) {
  store.set({ trackerCollapsed: c });
  try { localStorage.setItem('hq-tracker-collapsed', c ? '1' : '0'); } catch (err) { }
}

/**
 * @param {{stage: HTMLElement, vignette: HTMLElement, flash: HTMLElement, hovertip: HTMLElement, minimap: HTMLCanvasElement}} dom
 */
export async function createGame(dom) {
  if (created) return created;
  created = (async () => {
    try { await Promise.race([document.fonts.load('700 48px Fredoka'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { }
    initGfx(dom.stage);
    // the world, in the same order as the original single-file town
    initNav(); initHub(); initBridgly(); initTransit(); initYard(); initGrove(); initMarket(); initShowroom();
    initSquareDecor(); initClouds(); initFoodCourt(); initTown(); initStations(); initFx();
    initHenry(); initHamster(); initBall(); initPets(); initButterflies();
    initTod(dom); initWeather(dom);
    initNpcs();
    initCanada(); initMapleLeaves(); initWildlife();
    trimShadowCasters();
    initMinimap(dom.minimap);
    placeCamera(); syncTracker();
    wireInput(dom);
    const resize = () => {
      const w = dom.stage.clientWidth, h = dom.stage.clientHeight; if (!w || !h) return;
      renderer.setPixelRatio(QUALITY.pr); renderer.setSize(w, h); labelRenderer.setSize(w, h);
      camera.aspect = w / h; camera.fov = w < 720 ? 55 : 45; camera.updateProjectionMatrix();
      if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    };
    new ResizeObserver(resize).observe(dom.stage); resize(); resizeFn = resize;
    startWeather();
    requestAnimationFrame(frame);
    const api = {
      beginGame, interact, interactAlt, doEmote, petHamster, jump, setPhoto, cycleTod, startTour, stopTour,
      toggleSound: () => setSound(!isSoundOn()),
      goTo, openPanel, closePanel, openQuick, closeQuick, quickGo, minimapClick, wxCycle, usePreciseLocation,
      dialogueChoose, dialogueNext, dialogueClose, setTrackerCollapsed,
      focusStage: () => { try { renderer.domElement.focus({ preventScroll: true }); } catch (err) { } },
    };
    if (DEBUG) exposeDebug(api);
    return api;
  })();
  return created;
}

/* ---- input ---- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(ev, list) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera); return ray.intersectObjects(list, false)[0] || null;
}
function wireInput(dom) {
  const cvs = renderer.domElement, tip = dom.hovertip;
  addEventListener('pointerdown', unlockAudio); addEventListener('keydown', unlockAudio);
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), st = store.get();
    if (k === 'escape') {
      if (S.photo) { setPhoto(false); return; }
      if (S.dialogue) { dialogueClose(); return; }
      if (S.quick) closeQuick(false); else if (S.panelId) closePanel(); else store.set({ trackerOpen: false, help: false });
      return;
    }
    if (S.quick || !created) return;
    const tgt = /** @type {any} */ (e.target), onControl = tgt && tgt.closest && tgt.closest('button, a, input, textarea, [contenteditable]');
    if (S.dialogue) {
      if (/^[1-9]$/.test(k)) { e.preventDefault(); dialogueChoose(+k - 1); return; }
      if (k === 'e' || ((k === 'enter' || k === ' ') && !onControl)) { e.preventDefault(); dialogueNext(); return; }
      return;
    }
    if ((k === 'e' || k === 'enter') && !onControl) { e.preventDefault(); interact(); return; }
    if (k === 'f' && !onControl) { e.preventDefault(); interactAlt(); return; }
    if (!e.repeat && !onControl && S.started && !S.panelId) {
      if (k === '1') { doEmote('wave'); return; }
      if (k === '2') { doEmote('dance'); return; }
      if (k === '3') { doEmote('cheer'); return; }
      if (k === 'h') { petHamster(); return; }
      if (k === 'q') { setTrackerCollapsed(!st.trackerCollapsed); return; }
      if (k === 'n') { cycleTod(); return; }
      if (k === 'm') { setSound(!isSoundOn()); return; }
      if (k === 'p') { setPhoto(!S.photo); return; }
      if (k === 't') { startTour(); return; }
    }
    if (k === ' ' && !onControl) { e.preventDefault(); jump(); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
      if (onControl && k.startsWith('arrow')) return;
      if (!S.started && k !== 'shift') beginGame();
      keys.add(k); if (k.startsWith('arrow')) e.preventDefault();
    }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  cvs.addEventListener('pointerdown', e => { S.drag = { x: e.clientX, y: e.clientY, yaw: S.camYaw, pitch: S.camPitch, moved: false, id: e.pointerId }; });
  cvs.addEventListener('pointermove', e => {
    const d = S.drag;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; try { cvs.setPointerCapture(e.pointerId); } catch (err) { } }
      if (d.moved && S.started) { S.camYaw = d.yaw - dx * .006; S.camPitch = clamp(d.pitch + dy * .004, .3, 1.2); }
      return;
    }
    hoverAt(e, pick(e, stationHits), dom, tip);
  });
  cvs.addEventListener('pointerup', e => {
    const d = S.drag; S.drag = null; if (!d || d.moved) return;
    if (!S.started) { beginGame(); return; }
    if (S.photo) return;
    if (S.dialogue) { dialogueClose(); return; }
    if (S.panelId) closePanel();
    const sh = pick(e, stationHits);
    if (sh) {
      const u = sh.object.userData;
      if (u.station) walkToStation(u.station.id); else if (u.prop) walkToProp(u.prop); else if (u.pet) walkToPet(u.pet);
      else if (u.npc) walkToNpc(u.npc); else if (u.ham) petHamster();
      else if (u.ball) { walkTo({ x: BALL.x, z: BALL.z }); markAt(BALL.x, BALL.z, groundY(BALL.x, BALL.z)); }
      return;
    }
    const wh = pick(e, walkMeshes);
    if (wh) { walkTo({ x: wh.point.x, z: wh.point.z }); if (S.path.length) { const e2 = S.path[S.path.length - 1]; markAt(e2.x, e2.z, groundY(e2.x, e2.z)); } }
  });
  cvs.addEventListener('pointercancel', () => { S.drag = null; });
  cvs.addEventListener('pointerleave', () => { tip.hidden = true; S.hoverObj = null; });
  cvs.addEventListener('wheel', e => { e.preventDefault(); S.camDistTarget = clamp(S.camDistTarget + e.deltaY * .012, 8, 30); }, { passive: false });
}
function hoverAt(e, h, dom, tip) {
  S.hoverObj = h ? h.object.userData : null;
  renderer.domElement.style.cursor = h ? 'pointer' : '';
  if (!h || S.photo) { tip.hidden = true; return; }
  const u = h.object.userData;
  const label = u.station ? `${u.station.name} · ${u.station.tag}` : u.prop ? u.prop.label : u.pet ? `${u.pet.name} · ${u.pet.breed}` : u.npc ? `${u.npc.name} · ${u.npc.role}` : u.ham ? 'Pet the hamster' : u.ball ? 'Kick the ball' : '';
  tip.textContent = label; tip.hidden = !label;
  const r = dom.stage.getBoundingClientRect(); tip.style.left = (e.clientX - r.left + 16) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
}
function updateHover(t) {
  let hp = null;
  const u = S.hoverObj;
  if (u && !S.photo) hp = u.station ? u.station : u.prop ? u.prop : u.pet ? u.pet : u.npc ? u.npc : u.ham ? H : u.ball ? { x: BALL.x, z: BALL.z } : null;
  hoverRing.visible = !!hp;
  if (hp) {
    const y = hp.pet && hp.perch ? hp.perch.y : hp.npc ? hp.y : groundY(hp.x, hp.z);
    hoverRing.position.set(hp.x, y + .045, hp.z);
    hoverRing.scale.setScalar((u.ham || u.ball ? .6 : u.pet ? .7 : u.npc ? .75 : 1.2) * (1 + Math.sin(t * 5) * .06));
  }
  destDot.visible = S.path.length > 0 && !S.photo;
  if (destDot.visible) { const e2 = S.path[S.path.length - 1]; destDot.position.set(e2.x, groundY(e2.x, e2.z) + .05, e2.z); destDot.scale.setScalar(1 + Math.sin(t * 6) * .15); }
}

/* ---- buffs shown under the player card ---- */
let lastBuffs = '';
function renderBuffs() {
  const b = S.buffs, chips = [];
  if (b.coffee > 0) chips.push({ id: 'coffee', label: `Caffeinated · ${Math.ceil(b.coffee)}s` });
  if (b.boba > 0) chips.push({ id: 'boba', label: `Extra bouncy · ${Math.ceil(b.boba)}s` });
  if (b.jog > 0) chips.push({ id: 'jog', label: `Runner's high · ${Math.ceil(b.jog)}s` });
  if (S.tour) chips.push({ id: 'tour', label: 'Guided tour · stop ×', tour: true });
  const key = JSON.stringify(chips);
  if (key !== lastBuffs) { lastBuffs = key; store.set({ buffs: chips }); }
  store.set({ hamPet: S.hamState === 'pet' });
}

/* ---- performance ---- */
// small props and the little parts of people and pets do not need their own shadows; skipping them
// takes hundreds of draws off the shadow pass every frame
function trimShadowCasters() {
  const sz = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    o.getWorldScale(sz);
    if (o.geometry.boundingSphere.radius * Math.max(sz.x, sz.y, sz.z) < .2) o.castShadow = false;
  });
}
// the sun's shadow box follows the camera's target and only covers what the camera can see
const shadowCenter = new THREE.Vector3();
let shadowHalf = 0;
function updateShadowBox() {
  const wide = !S.started || S.photo, half = wide ? 38 : clamp(Math.round((S.camDist * 1.25 + 6) / 2) * 2, 16, 38);
  if (wide) shadowCenter.set(0, 0, 0); else shadowCenter.set(Math.round(camTarget.x / 2) * 2, 0, Math.round(camTarget.z / 2) * 2);
  sun.target.position.copy(shadowCenter); sun.target.updateMatrixWorld();
  sun.position.copy(shadowCenter).add(sun.userData.off);
  if (half !== shadowHalf) {
    shadowHalf = half; const c = sun.shadow.camera;
    c.left = c.bottom = -half; c.right = c.top = half; c.updateProjectionMatrix();
  }
}
// resolution steps down (to 1x) when frames run slow for a couple of seconds, and back up when there is room
let resizeFn = null, perfAcc = 0, perfN = 0, perfSlow = 0;
function adaptQuality(dt) {
  perfAcc += dt; perfN++;
  if (perfAcc < 2) return;
  const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
  let pr = QUALITY.pr;
  if (avg > 1 / 42 && pr > QUALITY.min) { pr = Math.max(QUALITY.min, pr - .25); perfSlow++; }
  else if (avg < 1 / 57 && pr < QUALITY.max && perfSlow < 3) pr = Math.min(QUALITY.max, pr + .25);
  if (pr !== QUALITY.pr) { QUALITY.pr = pr; if (resizeFn) resizeFn(); }
}

/* ---- one frame ---- */
let last = performance.now(), mmAcc = 0, uiAcc = 0, groveOn = null, tOff = 0;
function simulate(dt, t) {
  updatePlayer(dt);
  updatePrompt();
  updateTod(dt, t);
  updateBall(dt); updatePets(dt, t); updateNpcs(dt, t); updateButterflies(dt, t); updatePlanes(dt);
  updateHover(t);
  updateWeather(dt, t);
  updateCamera(dt);
  updateShadowBox();
  if (DEBUG && /** @type {any} */ (window).__ov) { const v = /** @type {any} */ (window).__ov; camera.position.set(...v.p); camera.lookAt(...v.t); }
  updateTown(dt, t);
  updateClouds(dt); updateBridgly(dt, t); updateMarket(dt, t); updateGrove(dt, t);
  if (!reduceMotion) banners.forEach((b, i) => { b.rotation.y = Math.sin(t * (2 + WXS.wind * 3) + i) * (.25 + WXS.wind * .3); });
  wheel.rotation.z -= dt * (S.hamState === 'wheel' ? 10 : reduceMotion ? 0 : 1.2);
  updateLRT(dt, t); updateYard(dt); updateShowroom(dt); updateFoodCourt(dt, t);
  updateCanada(dt, t); updateMapleLeaves(dt, t); updateWildlife(dt, t);
  for (const k of ['coffee', 'boba', 'jog']) S.buffs[k] = Math.max(0, S.buffs[k] - dt);
  updateStations(dt, t);
  const g = Math.hypot(P.x - ISL.grove.x, P.z - ISL.grove.z) < 9;
  if (g !== groveOn) { groveOn = g; labelRenderer.domElement.classList.toggle('near-grove', g); }
  updateFx(dt);
}
function render() {
  if (composer) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
function frame(now) {
  const raw = (now - last) / 1000, dt = clamp(raw, 0, .05); last = now; const t = now / 1000 + tOff;
  // Quick view covers the whole town, so the town rests until it closes
  if (S.quick) { requestAnimationFrame(frame); return; }
  simulate(dt, t);
  render();
  if (raw < .5) adaptQuality(raw);
  uiAcc += dt; if (uiAcc > .25) { uiAcc = 0; renderBuffs(); }
  mmAcc += dt; if (mmAcc > 1 / 20) { mmAcc = 0; drawMinimap(); }
  requestAnimationFrame(frame);
}

/* ---- test hooks, only with ?debug in the address ---- */
function exposeDebug(api) {
  /** @type {any} */ (window).__qt = {
    api, S, store, P, FOLK, BALL, scene, camera, renderer, CANADA, WILD,
    /** time n full renders (ms per frame) and report draw calls and triangles */
    perf(n = 30) { const t0 = performance.now(); for (let i = 0; i < n; i++) render(); renderer.getContext().finish(); const ms = (performance.now() - t0) / n; const r = renderer.info.render; return { ms: +ms.toFixed(1), calls: r.calls, triangles: r.triangles, pr: renderer.getPixelRatio() }; },
    /** run the simulation n steps of dt seconds without waiting for frames */
    step(n = 1, dt = .05) { for (let i = 0; i < n; i++) { tOff += dt; simulate(dt, performance.now() / 1000 + tOff); } renderBuffs(); render(); drawMinimap(); return [P.x, P.z]; },
    teleport(x, z) { P.x = x; P.z = z; S.path = []; },
    get near() { const n = S.near; return n ? (n.kind ? 's:' + n.id : (n.npc ? 'n:' : 'p:') + n.id) : null; },
    folk: () => FOLK.map(n => `${n.id}@${n.x.toFixed(1)},${n.z.toFixed(1)}${n.path.length ? ' path ' + n.path.length : ''}`).join(' | '),
    sfx: SFX,
  };
}
