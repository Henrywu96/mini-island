// The everyday crowd: small townsfolk who leave their houses, walk the streets to wherever people go at that
// hour and head home again at night. Mornings bring commuters to the LRT park and the coffee booth, lunch
// fills the food court, afternoons the parks, evenings the town square, and only a few are out at night.
// They are drawn as a handful of instanced meshes, so the whole crowd costs a few draw calls.
import { THREE, scene } from '../gfx.js';
import { ISL, POND, buildPath, groundY } from '../nav.js';
import { FOOD_COURT } from '../../data/world.js';
import { S } from '../state.js';
import { reduceMotion } from '../util.js';
import { HOUSES } from '../world/town.js';
import { P } from '../play/player.js';

const MAX = 32;
// where people want to be, by hour: [from, to, weights per place]
const SCHEDULE = [
  [5.5, 10, { transit: 3, toronto: 2, workshop: 3, hub: 2, yard: 1 }],
  [10, 14, { food: 5, hub: 2, workshop: 2, grove: 1, bridgly: 1 }],
  [14, 17.5, { grove: 2, bridgly: 2, studio: 2, hub: 2, yard: 1, transit: 1, toronto: 1 }],
  [17.5, 21.5, { hub: 3, food: 3, studio: 2, bridgly: 1, workshop: 1 }],
  [21.5, 29.5, { hub: 1, food: 1 }],
];
/** how many people are out at hour h: a few at night, a busy day, a lively evening */
function outAt(h) {
  const k = [[0, 3], [5, 3], [7.5, 22], [9, 28], [12, 32], [16, 28], [19, 30], [21.5, 18], [23, 6], [24, 3]];
  for (let i = 0; i < k.length - 1; i++) if (h >= k[i][0] && h < k[i + 1][0]) { const u = (h - k[i][0]) / (k[i + 1][0] - k[i][0]); return Math.round(k[i][1] + (k[i + 1][1] - k[i][1]) * u); }
  return 3;
}
function pickPlace(h) {
  const hh = h < 5.5 ? h + 24 : h, row = SCHEDULE.find(r => hh >= r[0] && hh < r[1]) || SCHEDULE[4], w = row[2];
  let tot = 0; for (const k in w) tot += w[k];
  let r = Math.random() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'hub';
}
function spotIn(place) {
  const a = Math.random() * Math.PI * 2;
  if (place === 'food') { const r = POND.r + 1.3 + Math.random() * (FOOD_COURT.r - POND.r - 2.3); return { x: FOOD_COURT.x + Math.cos(a) * r, z: FOOD_COURT.z + Math.sin(a) * r }; }
  const is = ISL[place] || ISL.hub, r = Math.sqrt(Math.random()) * (is.r - 1.4);
  return { x: is.x + Math.cos(a) * r, z: is.z + Math.sin(a) * r };
}

const SHIRTS = ['#ec6a4e', '#3b82f6', '#2fb67c', '#8b5cf6', '#e6a400', '#f6a68f', '#5b8c6a', '#d95b7a', '#4aa3b5', '#f2c14e', '#7a8bb5', '#c97a4a'];
const PANTS = ['#2a3656', '#3f4d73', '#5b6478', '#4a3a30', '#2c2f38', '#6b5b4b'];
const SKIN = ['#f3c9a6', '#e8b38c', '#d9a07a', '#c98d68', '#a8714f', '#8a5a3e'];
const HAIR = ['#2c201a', '#5a3a28', '#1f1a1a', '#7a4a2a', '#d8d2c8', '#3a3a3a', '#a8582f'];
const pick = a => a[Math.floor(Math.random() * a.length)];

const people = [];
let parts = null, pathBudget = 0, homes = [];
/** the nearest front door, for heading home at night */
function nearestHome(p) { let best = p.home, bd = 1e9; for (const h of homes) { const d = (h.x - p.x) ** 2 + (h.z - p.z) ** 2; if (d < bd) { bd = d; best = h; } } return best; }
export function initCrowd() {
  homes = HOUSES.filter(h => !h.tree);
  const torso = new THREE.CapsuleGeometry(.15, .26, 4, 10); torso.translate(0, .62, 0);
  const head = new THREE.SphereGeometry(.2, 14, 10); head.translate(0, 1.0, 0);
  const hair = new THREE.SphereGeometry(.212, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5); hair.rotateX(-.25); hair.translate(0, 1.03, -.01);
  const leg = new THREE.CapsuleGeometry(.055, .3, 3, 6); leg.translate(0, -.2, 0);       // hangs from the hip
  const mk = (g, cast) => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: .8 }), MAX); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.count = MAX; scene.add(m); return m; };
  parts = { torso: mk(torso, true), head: mk(head, false), hair: mk(hair, false), legL: mk(leg, false), legR: mk(leg, false) };
  const c = new THREE.Color();
  for (let i = 0; i < MAX; i++) {
    const home = homes.length ? homes[(i * 7) % homes.length] : { x: 0, z: 0 };
    people.push({ home, x: home.x, z: home.z, yaw: 0, path: [], state: 'off', wait: Math.random() * 4, speed: 1.05 + Math.random() * .45, ph: Math.random() * 6, show: 0, s: .86 + Math.random() * .2 });
    parts.torso.setColorAt(i, c.set(pick(SHIRTS))); parts.head.setColorAt(i, c.set(pick(SKIN))); parts.hair.setColorAt(i, c.set(pick(HAIR)));
    const pc = pick(PANTS); parts.legL.setColorAt(i, c.set(pc)); parts.legR.setColorAt(i, c.set(pc));
  }
  for (const m of Object.values(parts)) m.instanceColor.needsUpdate = true;
}

/** path finding is shared out: at most one new route per frame */
function route(p, to) { if (pathBudget <= 0) return false; pathBudget--; p.path = buildPath(p, to); return true; }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _hip = new THREE.Matrix4(), _l = new THREE.Matrix4();
export function updateCrowd(dt, t) {
  if (!parts) return;
  pathBudget = 1;
  const want = outAt(S.hour), out = people.filter(p => p.state !== 'off' && p.state !== 'home').length;
  // more people step out, or some head home
  if (out < want) { const p = people.find(q => q.state === 'off' && q.wait <= 0); if (p && route(p, spotIn(pickPlace(S.hour)))) { p.x = p.home.x; p.z = p.home.z; p.state = 'walk'; } }
  else if (out > want) { const p = people.find(q => q.state === 'idle'); if (p) { p.home = nearestHome(p); if (route(p, { x: p.home.x, z: p.home.z })) p.state = 'home'; } }
  for (let i = 0; i < MAX; i++) {
    const p = people[i];
    let moving = false;
    if (p.state === 'off') { p.wait -= dt; p.show = Math.max(0, p.show - dt * 3); }
    else if (p.state === 'idle') {
      p.wait -= dt; p.show = Math.min(1, p.show + dt * 3);
      if (p.wait <= 0 && route(p, spotIn(pickPlace(S.hour)))) p.state = 'walk';
    } else {
      p.show = p.state === 'home' && !p.path.length ? Math.max(0, p.show - dt * 3) : Math.min(1, p.show + dt * 3);
      const w = p.path[0];
      if (!w) {
        if (p.state === 'home') { if (p.show <= 0) { p.state = 'off'; p.wait = 4 + Math.random() * 10; } }
        else { p.state = 'idle'; p.wait = 4 + Math.random() * 12; }
      } else {
        const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
        // people stop for a moment rather than walk through Henry
        const toHenry = Math.hypot(P.x - p.x, P.z - p.z), blocked = toHenry < 1.1 && (P.x - p.x) * dx + (P.z - p.z) * dz > 0;
        p.block = blocked ? (p.block || 0) + dt : 0;
        if (d < .15) p.path.shift();
        else if (p.block > .8) {
          // still in the way after a moment: step round him
          const sx = -dz / d, sz = dx / d, st = p.speed * dt; p.x += sx * st; p.z += sz * st; moving = true;
        } else if (!blocked) {
          const st = Math.min(d, p.speed * dt); p.x += dx / d * st; p.z += dz / d * st; moving = true;
          const yaw = Math.atan2(dx, dz); let dy = yaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * Math.min(1, dt * 8);
        }
      }
    }
    // pose: a bob and swinging legs while walking, scaled to nothing while indoors
    const sc = p.show * p.s, sw = moving && !reduceMotion ? Math.sin(t * 9 * p.speed + p.ph) : 0;
    const y = groundY(p.x, p.z) + (moving ? Math.abs(sw) * .04 : 0);
    _q.setFromEuler(_e.set(0, p.yaw, moving ? sw * .04 : 0)); _m.compose(_v.set(p.x, y, p.z), _q, _s.set(sc, sc, sc));
    parts.torso.setMatrixAt(i, _m); parts.head.setMatrixAt(i, _m); parts.hair.setMatrixAt(i, _m);
    for (const [side, mesh] of [[-1, parts.legL], [1, parts.legR]]) {
      _hip.makeTranslation(side * .075, .42, 0); _l.makeRotationX(sw * .5 * side);
      mesh.setMatrixAt(i, _l.premultiply(_hip).premultiply(_m));
    }
  }
  for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
}
/** how many are out right now (for the debug hooks) */
export const crowdOut = () => people.filter(p => p.show > .5).length;
export const crowdDebug = () => { const c = {}; for (const p of people) c[p.state] = (c[p.state] || 0) + 1; return { c, hour: S.hour.toFixed(1), want: outAt(S.hour) }; };
