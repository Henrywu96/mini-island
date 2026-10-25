// Live local time and weather. Time and date come from the visitor's own clock. Weather comes from
// Open-Meteo for the visitor's approximate area (IP lookup via GeoJS, or the browser's precise location
// if they click the pin). Nothing is sent anywhere else; the last location is cached for six hours.
// Also: rain, snow, storm clouds, lightning and Henry's umbrella.
import { THREE, scene, hemi, mat, mesh, put, puffTex } from '../gfx.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { clamp, esc } from '../util.js';
import { SFX } from '../sound.js';
import { henryRig, holding, say } from '../actors/henry.js';
import { toast } from '../play/hud.js';
import { camTarget } from '../play/camera.js';
import { cloudGeo } from '../world/nature.js';
import { applyTod, setHourTarget, todProgress } from './tod.js';

/** weather currently shown (smoothed) */
export const WXS = { ov: 0, fog: 0, rain: 0, snow: 0, wind: .2, flash: 0 };
/** weather we are easing toward */
const WXT = { ov: 0, fog: 0, rain: 0, snow: 0, wind: .2, storm: false };
export const WX = { mode: 'live', live: null, status: 'loading', loc: null };
/** the sky light level without lightning, set by the time of day */
export const LIGHT = { hemiBase: 1.45 };
let wxGreeted = false, startedAt = 0, lightT = 3, lastWxKey = '', flashEl = null;
const _hsl = { h: 0, s: 0, l: 0 }, _white = new THREE.Color('#ffffff');
let grassBase = null, grassDarkBase = null;
export function overcast(c) { if (WXS.ov > .001) { c.getHSL(_hsl); c.setHSL(_hsl.h, _hsl.s * (1 - .7 * WXS.ov), _hsl.l * (1 - .14 * WXS.ov)); } return c; }

const WMO = {
  0: ['Clear sky', 'clear'], 1: ['Mainly clear', 'clear'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'], 56: ['Freezing drizzle', 'drizzle'], 57: ['Freezing drizzle', 'drizzle'],
  61: ['Light rain', 'rain1'], 63: ['Rain', 'rain2'], 65: ['Heavy rain', 'rain3'], 66: ['Freezing rain', 'rain1'], 67: ['Freezing rain', 'rain2'],
  71: ['Light snow', 'snow1'], 73: ['Snow', 'snow2'], 75: ['Heavy snow', 'snow3'], 77: ['Snow grains', 'snow1'],
  80: ['Rain showers', 'rain1'], 81: ['Rain showers', 'rain2'], 82: ['Heavy showers', 'rain3'], 85: ['Snow showers', 'snow1'], 86: ['Heavy snow showers', 'snow3'],
  95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm, hail', 'storm'], 99: ['Thunderstorm, hail', 'storm'],
};
const WKIND = {
  clear: { ov: 0, fog: 0, rain: 0, snow: 0, storm: false, icon: 'clear' },
  partly: { ov: .3, fog: 0, rain: 0, snow: 0, storm: false, icon: 'partly' },
  cloudy: { ov: .75, fog: 0, rain: 0, snow: 0, storm: false, icon: 'cloud' },
  fog: { ov: .55, fog: 1, rain: 0, snow: 0, storm: false, icon: 'fog' },
  drizzle: { ov: .7, fog: .2, rain: .3, snow: 0, storm: false, icon: 'rain' },
  rain1: { ov: .75, fog: .1, rain: .5, snow: 0, storm: false, icon: 'rain' },
  rain2: { ov: .85, fog: .15, rain: .8, snow: 0, storm: false, icon: 'rain' },
  rain3: { ov: .95, fog: .25, rain: 1, snow: 0, storm: false, icon: 'rain' },
  snow1: { ov: .6, fog: .1, rain: 0, snow: .45, storm: false, icon: 'snow' },
  snow2: { ov: .7, fog: .15, rain: 0, snow: .75, storm: false, icon: 'snow' },
  snow3: { ov: .85, fog: .3, rain: 0, snow: 1, storm: false, icon: 'snow' },
  storm: { ov: 1, fog: .2, rain: 1, snow: 0, storm: true, icon: 'storm' },
};
const PREVIEW = { clear: ['Clear sky', 'clear'], rain: ['Rain', 'rain2'], snow: ['Snow', 'snow2'], storm: ['Thunderstorm', 'storm'] };
const WX_ORDER = ['live', 'clear', 'rain', 'snow', 'storm'];

function wxNow() {
  if (WX.mode !== 'live') { const [label, k] = PREVIEW[WX.mode]; return { label, ...WKIND[k], wind: k === 'storm' ? 45 : 12 }; }
  if (!WX.live) return { label: '', ...WKIND.clear, wind: 8 };
  const [label, k] = WMO[WX.live.code] || ['Changeable', 'partly'];
  return { label, ...WKIND[k], wind: WX.live.wind || 0 };
}
function applyWeatherTarget() {
  const w = wxNow();
  Object.assign(WXT, { ov: w.ov, fog: w.fog, rain: w.rain, snow: w.snow, storm: w.storm, wind: clamp(w.wind / 35, 0, 1.3) });
  const key = `${WX.mode}:${w.rain > 0 ? 'r' : ''}${w.snow > 0 ? 's' : ''}${w.storm ? 't' : ''}${w.fog > .5 ? 'f' : ''}`;
  if (S.started && lastWxKey && key !== lastWxKey) {
    const live = WX.mode === 'live';
    if (w.storm) say(live ? 'Stormy where you are. The case studies stay dry in here.' : 'Thunder! Hold on to your hat.', 3.4);
    else if (w.rain > 0) say(live ? "It's raining where you are. Good thing I brought an umbrella." : 'Umbrella time.', 3.4);
    else if (w.snow > 0) say(live ? 'Snow where you are! Stay warm.' : 'Snow day!', 3);
    else if (w.fog > .5) say('Foggy today. Follow the lamps.', 3);
  }
  lastWxKey = key;
}
let lastWx = '';
export function renderWx() {
  const now = new Date(), w = wxNow();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const icon = w.icon === 'clear' ? S.tod : w.icon;
  let temp = '—', desc;
  if (WX.mode !== 'live') desc = `Preview · ${w.label}`;
  else if (WX.live) { temp = `${Math.round(WX.live.temp)}°C`; desc = `${w.label}${WX.loc && WX.loc.place ? ' · ' + WX.loc.place : ''}`; }
  else desc = WX.status === 'loading' ? 'Checking your weather…' : 'Weather unavailable · tap to preview';
  const wx = { time, date, temp, desc, icon, title: `${date}, ${time} · ${desc}. Click to preview other weather.` };
  const key = JSON.stringify(wx);
  if (key !== lastWx) { lastWx = key; store.set({ wx }); }
}

async function getJSON(url, ms = 7000) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(timer); }
}
async function locate() {
  try { const c = JSON.parse(localStorage.getItem('hq-loc') || 'null'); if (c && Date.now() - c.t < 6 * 3600e3) return c; } catch (err) { }
  /** @type {any} */
  let loc = null;
  try { const j = await getJSON('https://get.geojs.io/v1/ip/geo.json'); if (j && j.latitude) loc = { lat: +j.latitude, lon: +j.longitude, place: j.city || j.region || j.country || '' }; } catch (err) { }
  if (!loc) { try { const j = await getJSON('https://ipwho.is/'); if (j && j.success !== false && j.latitude != null) loc = { lat: +j.latitude, lon: +j.longitude, place: j.city || j.country || '' }; } catch (err) { } }
  if (loc) { loc.t = Date.now(); loc.src = 'ip'; try { localStorage.setItem('hq-loc', JSON.stringify(loc)); } catch (err) { } }
  return loc;
}
async function refreshWeather() {
  try {
    if (!WX.loc) WX.loc = await locate();
    if (!WX.loc) throw new Error('no location');
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${WX.loc.lat.toFixed(3)}&longitude=${WX.loc.lon.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1&temperature_unit=celsius`;
    const j = await getJSON(u);
    WX.live = { code: j.current.weather_code, temp: j.current.temperature_2m, wind: j.current.wind_speed_10m, sunrise: j.daily && j.daily.sunrise && j.daily.sunrise[0], sunset: j.daily && j.daily.sunset && j.daily.sunset[0], offset: j.utc_offset_seconds || 0, at: Date.now() };
    WX.status = 'live';
  } catch (err) { if (!WX.live) WX.status = 'offline'; }
  applyWeatherTarget(); renderWx();
  if (S.todMode === 'auto') setHourTarget(localHour());
}
export function usePreciseLocation() {
  if (!navigator.geolocation) { toast('Location is not available in this browser.', 2.6); return; }
  toast('Asking your browser for your location…', 2.4);
  navigator.geolocation.getCurrentPosition(async pos => {
    const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, place: '', src: 'gps', t: Date.now() };
    try { const j = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lon}&localityLanguage=en`); loc.place = j.city || j.locality || j.principalSubdivision || ''; } catch (err) { }
    WX.loc = loc; try { localStorage.setItem('hq-loc', JSON.stringify(loc)); } catch (err) { }
    WX.mode = 'live'; await refreshWeather();
    toast(WX.live ? `<b>Weather updated</b> for ${esc(loc.place || 'your location')}` : 'Location found, but the weather service did not answer.', 2.8);
  }, () => toast("Location wasn't shared, so the weather uses your approximate area.", 3.2), { timeout: 10000, maximumAge: 600000 });
}
/** the weather card cycles live weather and a few previews */
export function wxCycle() {
  WX.mode = WX_ORDER[(WX_ORDER.indexOf(WX.mode) + 1) % WX_ORDER.length];
  applyWeatherTarget(); renderWx(); SFX.click();
  toast(WX.mode === 'live' ? `<b>Live weather</b>${WX.live ? '' : ' · not available right now'}` : `<b>Weather preview</b> · ${PREVIEW[WX.mode][0]}`, 2);
}

/* ---- auto time of day from the visitor's clock (and real sunrise and sunset once weather is live) ---- */
const hm = s => { const m = /T(\d\d):(\d\d)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
/** the visitor's local time as an hour (0-24), at the weather location once the weather is live */
export function localHour() {
  const w = WX.live;
  if (w && w.offset != null) { const d = new Date(Date.now() + w.offset * 1000); return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600; }
  const now = new Date(); return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}
/** sunrise and sunset as hours: the real ones once the weather is live, otherwise 6:15 and 18:15 */
export function sunHours() {
  const w = WX.live, r = w && hm(w.sunrise), s = w && hm(w.sunset);
  return r != null && s != null ? [r / 60, s / 60] : [6.25, 18.25];
}
export function autoTod() {
  const now = new Date(); let mins = now.getHours() * 60 + now.getMinutes(), rise = 6 * 60 + 15, set = 18 * 60 + 15;
  const w = WX.live;
  if (w && hm(w.sunrise) != null && hm(w.sunset) != null) { const d = new Date(Date.now() + w.offset * 1000); mins = d.getUTCHours() * 60 + d.getUTCMinutes(); rise = hm(w.sunrise); set = hm(w.sunset); }
  if (mins >= rise + 40 && mins < set - 45) return 'day';
  if ((mins >= set - 45 && mins < set + 35) || (mins >= rise - 35 && mins < rise + 40)) return 'sunset';
  return 'night';
}

/* ---- rain, snow, lightning, umbrella ---- */
const RAIN_N = 1200, SNOW_N = 900;
let rainPos, rainD, rainGeo, rain, snowPos, snowD, snowGeo, snow, umbrella, stormClouds, stormMat;
export function initWeather(dom) {
  flashEl = dom.flash;
  grassBase = mat.grass.color.clone(); grassDarkBase = mat.grassDark.color.clone();
  rainPos = new Float32Array(RAIN_N * 6); rainD = Array.from({ length: RAIN_N }, () => ({ x: 0, y: -999, z: 0, s: 15 + Math.random() * 8 }));
  rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#dbe8ff', transparent: true, opacity: .55, depthWrite: false }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  snowPos = new Float32Array(SNOW_N * 3); snowD = Array.from({ length: SNOW_N }, () => ({ x: 0, y: -999, z: 0, s: 1 + Math.random() * 1.2, ph: Math.random() * 10 }));
  snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', map: puffTex, size: .26, transparent: true, opacity: .95, depthWrite: false }));
  snow.frustumCulled = false; snow.visible = false; scene.add(snow);
  umbrella = new THREE.Group(); umbrella.position.set(0, -.47, .04); umbrella.visible = false; henryRig.arms[0].add(umbrella);
  put(umbrella, new THREE.CylinderGeometry(.018, .018, 1.8, 6), mat.navy, 0, .9, 0);
  { const canopy = mesh(new THREE.ConeGeometry(.8, .38, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#ec6a4e', side: THREE.DoubleSide, roughness: .55 })); canopy.position.y = 1.8; umbrella.add(canopy); }
  put(umbrella, new THREE.SphereGeometry(.035, 8, 6), mat.navy, 0, 2.0, 0);
  stormClouds = new THREE.Group(); scene.add(stormClouds);
  stormMat = new THREE.MeshStandardMaterial({ color: '#aeb6c4', roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group(), a = i / 12 * Math.PI * 2 + Math.random() * .4, d = 22 + Math.random() * 38;
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(cloudGeo, stormMat); m.position.set((k - 3) * 1.1, Math.random() * .6, (Math.random() - .5) * 1.4); m.scale.set(1.3 + Math.random() * .6, .7 + Math.random() * .3, 1.2); g.add(m); }
    g.position.set(Math.cos(a) * d, 18 + Math.random() * 7, Math.sin(a) * d - 6); g.scale.setScalar(2.4 + Math.random() * 1.6); stormClouds.add(g);
  }
  stormClouds.visible = false;
  store.set({ canGeo: !!navigator.geolocation });
}
/** clocks and network: the weather card ticks every second and the forecast refreshes every 15 minutes */
export function startWeather() {
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!WX.live || Date.now() - WX.live.at > 15 * 60e3)) refreshWeather(); });
  setInterval(() => { renderWx(); if (S.todMode === 'auto' && !S.lapse) setHourTarget(localHour()); }, 1000);
  setInterval(refreshWeather, 15 * 60e3);
  applyWeatherTarget(); renderWx(); refreshWeather();
}

function updatePrecip(dt, t) {
  const cx = camTarget.x, cy = camTarget.y, cz = camTarget.z, drift = .6 + WXS.wind * 5;
  const nR = Math.floor(RAIN_N * WXS.rain); rain.visible = nR > 0;
  if (nR > 0) {
    for (let i = 0; i < nR; i++) {
      const d = rainD[i]; d.y -= d.s * dt; d.x += drift * dt;
      if (d.y < cy - 6 || Math.abs(d.x - cx) > 24 || Math.abs(d.z - cz) > 24) { d.x = cx + (Math.random() - .5) * 46; d.z = cz + (Math.random() - .5) * 46; d.y = cy + 4 + Math.random() * 18; }
      const o = i * 6; rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z; rainPos[o + 3] = d.x - drift * .04; rainPos[o + 4] = d.y + .6; rainPos[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true; rainGeo.setDrawRange(0, nR * 2);
  }
  const nS = Math.floor(SNOW_N * WXS.snow); snow.visible = nS > 0;
  if (nS > 0) {
    for (let i = 0; i < nS; i++) {
      const d = snowD[i]; d.y -= d.s * dt; d.x += (Math.sin(t * 1.3 + d.ph) * .5 + WXS.wind * 1.5) * dt; d.z += Math.cos(t * 1.1 + d.ph) * .4 * dt;
      if (d.y < cy - 6 || Math.abs(d.x - cx) > 22 || Math.abs(d.z - cz) > 22) { d.x = cx + (Math.random() - .5) * 42; d.z = cz + (Math.random() - .5) * 42; d.y = cy + 2 + Math.random() * 14; }
      snowPos[i * 3] = d.x; snowPos[i * 3 + 1] = d.y; snowPos[i * 3 + 2] = d.z;
    }
    snowGeo.attributes.position.needsUpdate = true; snowGeo.setDrawRange(0, nS);
  }
}
export function updateWeather(dt, t) {
  if (S.started && !startedAt) startedAt = t;
  const k = 1 - Math.exp(-dt * 1.4);
  const before = WXS.ov + WXS.fog;
  for (const key of ['ov', 'fog', 'rain', 'snow', 'wind']) WXS[key] += (WXT[key] - WXS[key]) * k;
  if (Math.abs(WXS.ov + WXS.fog - before) > .0015) applyTod(todProgress());
  updatePrecip(dt, t);
  stormMat.opacity = WXS.ov * .85; stormClouds.visible = stormMat.opacity > .02;
  mat.grass.color.copy(grassBase).lerp(_white, WXS.snow * .55); mat.grassDark.color.copy(grassDarkBase).lerp(_white, WXS.snow * .45);
  S.wxUmbrella = WXS.rain > .15; umbrella.visible = S.wxUmbrella;
  henryRig.pen.visible = !S.wxUmbrella && !holding();
  if (WXT.storm) {
    lightT -= dt;
    if (lightT <= 0) { WXS.flash = 1; lightT = 4 + Math.random() * 6; setTimeout(() => SFX.thunder(), 300 + Math.random() * 900); }
  }
  if (WXS.flash > 0) WXS.flash = Math.max(0, WXS.flash - dt * 3.2);
  const fl = WXS.flash > 0 ? WXS.flash * (.6 + .4 * Math.sin(t * 60)) : 0;
  hemi.intensity = LIGHT.hemiBase + fl * 2.2;
  if (flashEl) flashEl.style.opacity = (fl * .35).toFixed(3);
  if (!wxGreeted && S.started && WX.live && WX.mode === 'live' && t - startedAt > 7.5) {
    wxGreeted = true; const w = wxNow();
    say(`It's ${Math.round(WX.live.temp)}°C and ${w.label.toLowerCase()}${WX.loc && WX.loc.place ? ' in ' + WX.loc.place : ' where you are'} right now.`, 4);
  }
}
