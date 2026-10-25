// Time of day on a 24-hour clock: sky, fog, sun, lamps, stars, fireflies and the glow pass. The clock follows
// the visitor's local time (auto) or a time picked on the slider, and can run a whole day as a time-lapse.
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THREE, renderer, scene, camera, hemi, sun, sunDisc, lampMats, puffTex } from '../gfx.js';
import { ISL } from '../nav.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { ease, reduceMotion, track } from '../util.js';
import { SFX } from '../sound.js';
import { toast } from '../play/hud.js';
import { H_MAT } from '../world/town.js';
import { cloudMat } from '../world/nature.js';
import { WXS, LIGHT, overcast, localHour, sunHours } from './weather.js';

/** @type {EffectComposer|null} */ export let composer = null;
/** @type {UnrealBloomPass|null} */ let bloom = null;
let lampLights = [], stars = null, flies = null, vignetteEl = null;

const TOD = {
  day: { sky: ['#93c6f1', '#cfe6fb', '#fbe8de', '#f8d8c8'], fog: '#f7e3d9', hemiS: '#ffffff', hemiG: '#f1cdb8', hemiI: 1.45, sunC: '#fff1df', sunI: 2.5, sunP: [22, 38, 16], disc: '#ffd678', discP: [70, 52, -130], lamp: .25, light: 0, stars: 0, flies: 0, exp: 1.12, bT: 1.25, bS: .22, cloud: '#fff0e8', vig: .14 },
  sunset: { sky: ['#5d6db6', '#f0a184', '#ffcf9d', '#f2a98b'], fog: '#efb69b', hemiS: '#ffd7bf', hemiG: '#9b7093', hemiI: 1.2, sunC: '#ffac72', sunI: 2.3, sunP: [44, 14, -10], disc: '#ff9658', discP: [120, 20, -70], lamp: 1.6, light: 3, stars: .2, flies: .35, exp: 1.08, bT: 1.0, bS: .32, cloud: '#ffcdb6', vig: .2 },
  night: { sky: ['#060a20', '#121a42', '#283063', '#1c2050'], fog: '#1d2250', hemiS: '#9fb6ff', hemiG: '#2c2547', hemiI: .8, sunC: '#b9cdff', sunI: .95, sunP: [-24, 40, -12], disc: '#eef2ff', discP: [-80, 70, -110], lamp: 3.4, light: 9, stars: 1, flies: 1, exp: 1.0, bT: .5, bS: .7, cloud: '#323a6d', vig: .32 },
};
export const TOD_NAME = { day: 'Day', sunset: 'Sunset', night: 'Night' };
/** how dark the sky is right now: 0 in the day, about .2 at sunset, 1 at night (the lighthouse and crowd use it) */
export const SKY = { dark: 0 };
for (const k in TOD) TOD[k].name = k;
let todFrom = TOD.day, todTo = TOD.day, todK = 1;
export const todProgress = () => todK;
const _ca = new THREE.Color(), _cb = new THREE.Color();
const mix = (x, y, k) => _ca.set(x).lerp(_cb.set(y), k);

export function initTod(dom) {
  vignetteEl = dom.vignette;
  // warm lights by the square's lamps, the lookout cottage and the food court
  lampLights = [[-6.4, 1.85, 2.6, 8], [6.4, 1.85, 2.6, 8], [-5.6, 1.85, -6.2, 8], [5.6, 1.85, -6.2, 8], [10, 1.2, -27.9, 6], [0, 2.5, 11.6, 9], [0, 2.6, 24.6, 8]].map(([x, y, z, d]) => {
    const l = new THREE.PointLight('#ffc983', 0, d, 2); l.position.set(x, y, z); scene.add(l); return l;
  });
  {
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, y = .08 + Math.random() * .92, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 230, y * 230, Math.sin(a) * r * 230], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.visible = false; scene.add(stars);
  }
  {
    const n = 90, base = [], p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const is = [ISL.hub, ISL.grove, ISL.transit, ISL.bridgly, { x: 0, z: 16.2, r: 6.5 }][i % 5], a = Math.random() * Math.PI * 2, d = Math.random() * (is.r - .5);
      base.push({ x: is.x + Math.cos(a) * d, y: .5 + Math.random() * 2.4, z: is.z + Math.sin(a) * d, ph: Math.random() * 10 });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    flies = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffe17a', map: puffTex, size: .32, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flies.visible = false; flies.userData.base = base; scene.add(flies);
  }
  // glow on larger screens
  if (innerWidth >= 720) {
    try {
      const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .22, .5, 1.25); composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (err) { composer = null; bloom = null; }
  }
  S.hour = S.hourT = localHour(); applyHour(S.hour);
}

export function applyTod(k) {
  const A = todFrom, B = todTo, L = (x, y) => x + (y - x) * k;
  const bg = /** @type {THREE.CanvasTexture} */ (scene.background), cv = bg.image, g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, cv.height);
  [0, .45, .78, 1].forEach((st, i) => gr.addColorStop(st, '#' + overcast(mix(A.sky[i], B.sky[i], k)).getHexString()));
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height); bg.needsUpdate = true;
  const fog = /** @type {THREE.Fog} */ (scene.fog);
  fog.color.copy(overcast(mix(A.fog, B.fog, k))); fogBase.near = 55 - 38 * WXS.fog - 14 * WXS.ov; fogBase.far = 140 - 68 * WXS.fog - 32 * WXS.ov; mapFog();
  hemi.color.copy(mix(A.hemiS, B.hemiS, k)); hemi.groundColor.copy(mix(A.hemiG, B.hemiG, k)); hemi.intensity = L(A.hemiI, B.hemiI) * (1 - .22 * WXS.ov);
  sun.color.copy(mix(A.sunC, B.sunC, k)); sun.intensity = L(A.sunI, B.sunI) * (1 - .62 * WXS.ov); sun.userData.off.set(L(A.sunP[0], B.sunP[0]), L(A.sunP[1], B.sunP[1]), L(A.sunP[2], B.sunP[2]));
  sunDisc.material.color.copy(mix(A.disc, B.disc, k)); sunDisc.material.opacity = 1 - .9 * WXS.ov; sunDisc.position.set(L(A.discP[0], B.discP[0]), L(A.discP[1], B.discP[1]), L(A.discP[2], B.discP[2]));
  lampMats.forEach(m => { m.emissiveIntensity = L(A.lamp, B.lamp); });
  // unlit lamps are hidden so every surface skips them in the daytime
  lampLights.forEach(l => { l.intensity = L(A.light, B.light); l.visible = l.intensity > .05; });
  if (H_MAT) H_MAT.win.emissiveIntensity = Math.max(0, L(A.lamp, B.lamp) - .25) * .55;
  SKY.dark = L(A.stars, B.stars);
  stars.material.opacity = L(A.stars, B.stars) * (1 - WXS.ov); stars.visible = stars.material.opacity > .01;
  flies.material.opacity = L(A.flies, B.flies); flies.visible = flies.material.opacity > .01;
  renderer.toneMappingExposure = L(A.exp, B.exp);
  if (bloom) { bloom.threshold = L(A.bT, B.bT); bloom.strength = L(A.bS, B.bS); bloom.enabled = bloom.threshold < 1.15; }
  if (cloudMat) cloudMat.emissive.copy(mix(A.cloud, B.cloud, k));
  if (vignetteEl) vignetteEl.style.setProperty('--vig', (L(A.vig, B.vig) + .1 * WXS.ov).toFixed(3));
  LIGHT.hemiBase = hemi.intensity;
}
/* ---- the clock ---- */
// which two looks the sky is between at hour h (0-24), and how far: night, a pink dawn, day, sunset, night
function blendAt(h) {
  const [rise, set] = sunHours();
  const keys = [[rise - 1.1, TOD.night], [rise - .1, TOD.sunset], [rise + 1.2, TOD.day], [set - 1.1, TOD.day], [set + .1, TOD.sunset], [set + 1.1, TOD.night]];
  if (h < keys[0][0] || h >= keys[keys.length - 1][0]) return [TOD.night, TOD.night, 1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, A] = keys[i], [h1, B] = keys[i + 1];
    if (h >= h0 && h < h1) return [A, B, ease((h - h0) / (h1 - h0))];
  }
  return [TOD.day, TOD.day, 1];
}
let shownHour = -1, lastStoreHour = -1;
function applyHour(h) {
  const [A, B, k] = blendAt(h);
  todFrom = A; todTo = B; todK = k; applyTod(k);
  shownHour = h;
  const name = (k < .5 ? A : B).name;
  if (name !== S.tod) { S.tod = name; store.set({ tod: name }); }
}
const wrap = h => ((h % 24) + 24) % 24;
/** the hour the clock eases towards; `snap` jumps straight there */
export function setHourTarget(h, snap = false) { S.hourT = wrap(h); if (snap || reduceMotion) S.hour = S.hourT; }
/** the slider: pick a time, which stops following the local clock */
export function setHour(h) {
  if (!isFinite(h)) return;
  S.todMode = 'manual'; S.lapse = false; setHourTarget(h);
  store.set({ todMode: 'manual', lapse: false });
}
export function setTodAuto() {
  S.todMode = 'auto'; S.lapse = false; setHourTarget(localHour());
  store.set({ todMode: 'auto', lapse: false });
}
/** a whole day in under a minute */
export function toggleLapse(on = !S.lapse) {
  S.lapse = on; if (on) { S.todMode = 'manual'; S.hourT = S.hour; }
  store.set({ lapse: on, todMode: S.todMode });
  if (on) track('time_lapse');
}
const PRESET = { day: 12, sunset: 0, night: 22 };
/** jump to a named look; sunset follows the real sunset time when the weather knows it */
export function setTod(name, quiet = false) {
  if (!(name in PRESET)) return;
  setHour(name === 'sunset' ? sunHours()[1] + .1 : PRESET[name]);
  if (S.started && !quiet) { toast(`<b>${TOD_NAME[name]}</b>${name === 'night' ? ' · the lamps, string lights and fireflies are out' : ''}`, 2); SFX.chime(); }
}
/** N: auto → day → sunset → night → auto */
export function cycleTod() {
  const order = ['auto', 'day', 'sunset', 'night'];
  const cur = S.todMode === 'auto' ? 'auto' : order.find(n => n !== 'auto' && Math.abs(((S.hourT - (n === 'sunset' ? sunHours()[1] + .1 : PRESET[n]) + 36) % 24) - 12) < .1) || S.tod;
  const next = order[(order.indexOf(cur) + 1) % order.length];
  if (next === 'auto') { setTodAuto(); if (S.started) { toast(`<b>Auto</b> · following your local time (${fmtHour(localHour())})`, 2.4); SFX.chime(); } }
  else setTod(next);
}
export const fmtHour = h => { const m = Math.round(wrap(h) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
function tickClock(dt) {
  if (S.lapse) { S.hourT = wrap(S.hourT + dt * 24 / 50); S.hour = S.hourT; }
  else {
    // ease the long way round only if that is shorter: 23:00 to 01:00 goes through midnight
    let d = ((S.hourT - S.hour + 36) % 24) - 12;
    if (Math.abs(d) > 1e-4) S.hour = wrap(S.hour + Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * dt * 3, dt * 2)));
  }
  if (Math.abs(S.hour - shownHour) > 1e-4) applyHour(S.hour);
  if (Math.abs(S.hour - lastStoreHour) > .05) { lastStoreHour = S.hour; store.set({ hour: S.hour }); }
}

/** the map view looks at the whole town from high up, so the haze pulls back while it is open */
const fogBase = { near: 55, far: 140 };
function mapFog() {
  const fog = /** @type {THREE.Fog} */ (scene.fog);
  // pulled back further still when the map is zoomed out to the whole island
  const out = Math.max(0, S.camDist - 60) * S.ovK;
  fog.near = fogBase.near + 85 * S.ovK + out; fog.far = fogBase.far + 140 * S.ovK + out * 1.6;
}
export function updateTod(dt, t) {
  tickClock(dt);
  if (S.ovK > .001 || S.overview) mapFog();
  if (flies.visible) {
    const a = flies.geometry.attributes.position, base = flies.userData.base;
    for (let i = 0; i < base.length; i++) { const b = base[i]; a.setXYZ(i, b.x + Math.sin(t * .6 + b.ph) * .7, b.y + Math.sin(t * 1.3 + b.ph * 2) * .35, b.z + Math.cos(t * .5 + b.ph) * .7); }
    a.needsUpdate = true;
    /** @type {THREE.PointsMaterial} */ (flies.material).size = .26 + Math.sin(t * 3) * .05;
  }
}
