// The dogs (Mochi, Bean) and cats (Mango, Sesame) who live on the town square: wandering, napping,
// eating, zoomies, fetch, tricks, yarn, the cat tree, and hissing at dogs who get too close.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene, canvasTex, M, mat, put, addTo, hitMat, blobMat, stationHits, colliders, movers, heartTex, puffTex } from '../gfx.js';
import { ISL, walkable } from '../nav.js';
import { S } from '../state.js';
import { clamp, lerp, ease, esc, angDiff, reduceMotion, FONT, rrPath } from '../util.js';
import { SFX } from '../sound.js';
import { makeDog, makeCat } from './rig.js';
import { anim, emote, faceToward, say } from './henry.js';
import { H } from './hamster.js';
import { P, walkTo, onArrive, beginGame } from '../play/player.js';
import { BALL } from '../play/ball.js';
import { floatText, spriteBurst, markAt } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { WXS } from '../sky/weather.js';

const HUB = ISL.hub, PET_LIM = HUB.r - 1.1;
const DOG_SPD = { walk: 1.5, trot: 2.8, run: 5.2 }, CAT_SPD = { walk: 1.1, trot: 2.3, run: 3.8 };
const hubClamp = (x, z, lim) => { const dx = x - HUB.x, dz = z - HUB.z, r = Math.hypot(dx, dz); return r > lim ? [HUB.x + dx / r * lim, HUB.z + dz / r * lim] : [x, z]; };
let zTex = null, boneTex = null;

// doghouse with food and water bowls on the east side of the square, cat tree on the west side
const DOGHOUSE = { x: 5.6, z: .9, ry: -.55 };
function dhWorld(lx, lz) { const c = Math.cos(DOGHOUSE.ry), s = Math.sin(DOGHOUSE.ry); return { x: DOGHOUSE.x + lx * c + lz * s, z: DOGHOUSE.z - lx * s + lz * c }; }
const EAT = (() => { const s = dhWorld(-1.36, .03), b = dhWorld(-.84, .03); return { x: s.x, z: s.z, yaw: Math.atan2(b.x - s.x, b.z - s.z) }; })();
let bowlBy = null;
const CATTREE = { x: -5.6, z: .9 };
let catToy = null;
const PERCHES = [
  { x: CATTREE.x, y: 1.17, z: CATTREE.z, yaw: .5, sx: CATTREE.x + .95, sz: CATTREE.z + .5, by: null },
  { x: CATTREE.x + .38, y: .645, z: CATTREE.z, yaw: 1.2, sx: CATTREE.x + 1.12, sz: CATTREE.z - .38, by: null },
];

const PET_DEFS = [
  { id: 'mochi', species: 'dog', name: 'Mochi', breed: 'Shiba', fur: '#dd8a3e', cream: '#fff1de', ear: 'up', tail: 'curl', brows: true, collar: '#ec6a4e', at: [3.4, 3.0], mat: -1 },
  { id: 'bean', species: 'dog', name: 'Bean', breed: 'Border collie', fur: '#34333c', cream: '#fbfaf7', ear: 'flop', tail: 'long', tip: true, collar: '#3b82f6', at: [2.6, -1.8], mat: 1 },
  { id: 'mango', species: 'cat', name: 'Mango', breed: 'Orange tabby', fur: '#f09c48', cream: '#fff3e3', stripes: '#cf7428', socks: true, eye: '#9ad86f', at: [-3.7, 1.6] },
  { id: 'sesame', species: 'cat', name: 'Sesame', breed: 'Tuxedo cat', fur: '#2a2930', cream: '#f7f5f1', socks: true, eye: '#ffd166', at: [CATTREE.x, CATTREE.z], perch: 0 },
];
/** @type {any[]} */
export const PETS = [];
let yarn = null;

export function initPets() {
  zTex = canvasTex(64, 64, (c) => { c.font = `700 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 7; c.strokeStyle = 'rgba(32,43,69,.55)'; c.strokeText('z', 32, 32); c.fillStyle = '#ffffff'; c.fillText('z', 32, 32); });
  boneTex = canvasTex(64, 64, (c) => {
    c.translate(32, 32); c.rotate(-.6); c.fillStyle = '#fff1d6'; c.beginPath(); c.rect(-15, -5, 30, 10);
    for (const [x, y] of [[-16, -6], [-16, 6], [16, -6], [16, 6]]) { c.moveTo(x + 7, y); c.arc(x, y, 7, 0, 7); }
    c.fill(); c.strokeStyle = '#d29a62'; c.lineWidth = 2; c.stroke();
  });
  // doghouse
  {
    const g = new THREE.Group(); g.position.set(DOGHOUSE.x, 0, DOGHOUSE.z); g.rotation.y = DOGHOUSE.ry; scene.add(g);
    const wall = M('#f2b45e'), roof = M('#3f4d73', { roughness: .7 });
    put(g, new THREE.BoxGeometry(1.18, .08, 1.26), mat.wood2, 0, .04, 0);
    put(g, new THREE.BoxGeometry(1.0, .68, 1.1), wall, 0, .42, 0);
    const tri = new THREE.Shape(); tri.moveTo(-.5, 0); tri.lineTo(.5, 0); tri.lineTo(0, .4); tri.closePath();
    const gab = new THREE.ShapeGeometry(tri);
    for (const s of [1, -1]) { const m = put(g, gab, wall, 0, .76, s * .55); if (s < 0) m.rotation.y = Math.PI; }
    for (const s of [-1, 1]) { const r = put(g, new THREE.BoxGeometry(.84, .07, 1.34), roof, s * .32, .95, 0); r.rotation.z = -s * .65; }
    put(g, new THREE.BoxGeometry(.09, .09, 1.38), mat.sun, 0, 1.2, 0);
    const doorM = new THREE.MeshStandardMaterial({ color: '#3a3142', roughness: .95 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(.44, .34), doorM); door.position.set(0, .25, .556); g.add(door);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(.22, 24), doorM); arch.position.set(0, .42, .556); g.add(arch);
    const plate = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#fffaf4'; rrPath(c, 2, 2, w - 4, h - 4, 16); c.fill(); c.fillStyle = '#202b45'; c.font = `700 30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MOCHI & BEAN', w / 2, h / 2 + 2); });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(.52, .13), new THREE.MeshStandardMaterial({ map: plate, transparent: true, roughness: .8 })); pl.position.set(0, .87, .558); g.add(pl);
    const bowl = (lx, lz, col, fill) => { const b = new THREE.Group(); b.position.set(lx, 0, lz); g.add(b); put(b, new THREE.CylinderGeometry(.14, .11, .09, 20), M(col, { roughness: .5 }), 0, .045, 0); put(b, new THREE.CylinderGeometry(.115, .115, .02, 20), fill, 0, .085, 0, false); };
    bowl(-.84, -.14, '#ec6a4e', M('#9a6b3f', { flatShading: true })); bowl(-.84, .2, '#3b82f6', new THREE.MeshStandardMaterial({ color: '#9ed6ff', roughness: .1, metalness: .1 }));
    for (const [s, col] of [[-1, '#f6a68f'], [1, '#9ed6ff']]) put(g, new THREE.CylinderGeometry(.33, .35, .05, 28), M(col), s * .4, .025, 1.02, false);
    colliders.push({ x: DOGHOUSE.x, z: DOGHOUSE.z, r: .78 });
    const bw = dhWorld(-.84, .03); colliders.push({ x: bw.x, z: bw.z, r: .3 });
  }
  // cat tree with two perches
  {
    const g = new THREE.Group(); g.position.set(CATTREE.x, 0, CATTREE.z); scene.add(g);
    const ply = M('#ead8c4'), cushion = M('#f6a68f');
    put(g, new THREE.BoxGeometry(.92, .08, .92), ply, 0, .04, 0);
    put(g, new THREE.CylinderGeometry(.09, .09, 1.1, 14), mat.rope, 0, .6, 0);
    for (let i = 0; i < 6; i++) { const r = put(g, new THREE.TorusGeometry(.094, .012, 5, 16), mat.wood2, 0, .2 + i * .15, 0, false); r.rotation.x = Math.PI / 2; }
    put(g, new THREE.CylinderGeometry(.38, .38, .06, 28), ply, 0, 1.13, 0);
    const ring = put(g, new THREE.TorusGeometry(.25, .07, 10, 28), cushion, 0, 1.19, 0); ring.rotation.x = Math.PI / 2;
    put(g, new THREE.CylinderGeometry(.23, .23, .03, 22), M('#fbd3c5'), 0, 1.175, 0, false);
    put(g, new THREE.BoxGeometry(.52, .05, .44), ply, .36, .62, 0);
    put(g, new THREE.CylinderGeometry(.045, .045, .6, 10), mat.rope, .52, .31, 0);
    const toy = new THREE.Group(); toy.position.set(-.3, 1.1, .14); g.add(toy);
    put(toy, new THREE.CylinderGeometry(.006, .006, .34, 4), mat.dark, 0, -.17, 0, false);
    put(toy, new THREE.SphereGeometry(.055, 12, 10), mat.coral, 0, -.36, 0);
    catToy = toy;
    colliders.push({ x: CATTREE.x + .1, z: CATTREE.z, r: .64 });
  }
  // the pets themselves
  for (const d of PET_DEFS) {
    const dog = d.species === 'dog', rig = dog ? makeDog(d) : makeCat(d);
    scene.add(rig.root);
    /** @type {any} */
    const p = {
      ...d, pet: true, dog, rig, x: d.at[0], z: d.at[1], y: 0, yaw: Math.random() * 6.28, yawT: 0, state: 'idle', t: 1 + Math.random() * 2, tmax: 3, st: 0,
      tx: 0, tz: 0, spd: 0, after: null, afterT: 0, afterYaw: null, moving: false, speedNow: 0, walkPh: Math.random() * 6, gait: 0, stuck: 0, air: null, perch: null, perchTarget: null, perchNap: false,
      pose: { sit: 0, lie: 0, crouch: 0, bow: 0, leap: 0, paw: 0, eat: 0, groom: 0, closed: 0 }, headYaw: 0, happy: 0, petN: 0, petT: 0, hissCd: 0, zzT: 0, blink: 2 + Math.random() * 3, trickI: 0, trick: null, hop: 0, greet: false, zDir: 1,
      radius: dog ? 1.75 : 1.6, rad: dog ? .26 : .2, label: `Pet ${d.name}`, sub: d.breed,
    };
    p.yawT = p.yaw;
    p.act = () => petPet(p);
    p.alt = dog ? { label: 'Ask for a trick', act: () => dogTrick(p) } : { label: 'Toss the yarn', act: () => tossYarn(p) };
    p.blob = new THREE.Mesh(new THREE.PlaneGeometry(dog ? .95 : .7, dog ? .95 : .7), blobMat); p.blob.rotation.x = -Math.PI / 2; scene.add(p.blob);
    p.hit = new THREE.Mesh(new THREE.SphereGeometry(dog ? .62 : .5, 8, 6), hitMat); p.hit.userData.pet = p; scene.add(p.hit); stationHits.push(p.hit);
    const el = document.createElement('div'); el.className = 'pet-tag'; el.innerHTML = `<span style="--c:${d.fur}"></span>${esc(d.name)}`;
    p.tagEl = el; p.tag = new CSS2DObject(el); p.tagOn = false; scene.add(p.tag);
    if (d.perch != null) { const pr = PERCHES[d.perch]; pr.by = p; p.perch = pr; p.perchTarget = pr; p.perchNap = true; p.x = pr.x; p.z = pr.z; p.y = pr.y; p.yaw = p.yawT = pr.yaw; p.state = 'perch'; p.t = p.tmax = 14; }
    PETS.push(p);
  }
  // yarn ball for the cats
  {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const ym = M('#8b5cf6', { roughness: .9 }), ym2 = M('#b9a2fb', { roughness: .9 });
    addTo(g, new THREE.SphereGeometry(.12, 14, 10), ym, 0, 0, 0);
    for (const r of [[0, 0, 0], [1.2, .3, 0], [.4, 1.1, .6], [2.2, .2, 1.3]]) { const w = addTo(g, new THREE.TorusGeometry(.121, .012, 6, 22), ym2, 0, 0, 0); w.rotation.set(r[0], r[1], r[2]); }
    addTo(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.1, -.05, 0), new THREE.Vector3(.24, -.1, .06), new THREE.Vector3(.42, -.11, -.04)]), 10, .01, 5), ym, 0, 0, 0);
    yarn = { g, on: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, air: null, cat: null, n: 0, fade: 0 };
  }
}

const ATTENDABLE = new Set(['idle', 'walk', 'sit', 'eat', 'groom', 'visit', 'zoom']);
const FETCHABLE = new Set(['idle', 'walk', 'sit', 'eat', 'visit', 'zoom', 'attend']);
const PARTYABLE = new Set(['idle', 'walk', 'sit', 'visit', 'attend']);
const CALM_CAT = new Set(['idle', 'walk', 'sit', 'groom', 'visit', 'nap']);
const ZC = { x: 0, z: -.4, r: 3.9 };
let fetcher = null, fetchCd = 0, petGreet = false, petGreetT = 0, petEmote = null;
const _axis = new THREE.Vector3();

function petSet(p, s, t = 2) {
  if (bowlBy === p && s !== 'eat' && !(s === 'walk' && p.after === 'eat')) bowlBy = null;
  if (p.perchTarget && !p.perch && s !== 'jump' && !(s === 'walk' && p.after === 'perchUp')) { if (p.perchTarget.by === p) p.perchTarget.by = null; p.perchTarget = null; }
  if (fetcher === p && s !== 'chase') fetcher = null;
  p.state = s; p.t = t; p.tmax = t; p.st = 0;
}
function petGo(p, x, z, spd, after = 'idle', afterT = 2, afterYaw = null) { p.tx = x; p.tz = z; p.spd = spd; p.after = after; p.afterT = afterT; p.afterYaw = afterYaw; p.stuck = 0; petSet(p, 'walk', 14); }
function petSpot(p) {
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (PET_LIM - .7), x = HUB.x + Math.cos(a) * d, z = HUB.z + Math.sin(a) * d;
    let ok = Math.hypot(x - P.x, z - P.z) > 1.4 && Math.hypot(x - p.x, z - p.z) > 1.2;
    if (ok) for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + p.rad + .3) { ok = false; break; }
    if (ok) return { x, z };
  }
  return { x: p.x, z: p.z };
}
function petSteer(p, mx, mz, dist) {
  let sx = mx, sz = mz;
  for (const c of colliders) {
    const cx = c.x - p.x, cz = c.z - p.z, d = Math.hypot(cx, cz);
    if (d > c.r + 1.6 || d > dist + c.r) continue;
    if (cx * mx + cz * mz <= 0) continue;
    const lat = -cx * mz + cz * mx, need = c.r + p.rad + .2;
    if (Math.abs(lat) >= need) continue;
    const side = lat > 0 ? -1 : 1, w = 1.6 * (1 - Math.abs(lat) / need) * (1 - Math.min(1, Math.max(0, d - c.r) / 1.6)) + .2;
    sx += -mz * side * w; sz += mx * side * w;
  }
  const l = Math.hypot(sx, sz) || 1; return [sx / l, sz / l];
}
function petResolve(p) {
  for (const list of [colliders, movers]) for (const c of list) {
    const ex = p.x - c.x, ez = p.z - c.z, ed = Math.hypot(ex, ez), min = c.r + p.rad;
    if (ed < min) { if (ed < 1e-4) { p.x += min; continue; } p.x = c.x + ex / ed * min; p.z = c.z + ez / ed * min; }
  }
  [p.x, p.z] = hubClamp(p.x, p.z, PET_LIM);
}
function petMove(p, dt, tx, tz, spd, arriveR = .2) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d < arriveR) { p.stuck = 0; return true; }
  const [mx, mz] = petSteer(p, dx / d, dz / d, d), step = Math.min(d, spd * dt), ox = p.x, oz = p.z;
  p.x += mx * step; p.z += mz * step; petResolve(p);
  const moved = Math.hypot(p.x - ox, p.z - oz);
  if (moved > 1e-4) p.yawT = Math.atan2(p.x - ox, p.z - oz);
  p.moving = true; p.speedNow = moved / Math.max(dt, 1e-4);
  if (moved < spd * dt * .3) p.stuck += dt; else p.stuck = Math.max(0, p.stuck - dt);
  return false;
}
function petJump(p, x1, y1, z1, dur, h, then) {
  if (Math.hypot(x1 - p.x, z1 - p.z) > .05) p.yawT = Math.atan2(x1 - p.x, z1 - p.z);
  p.air = { t: 0, dur, x0: p.x, y0: p.y, z0: p.z, x1, y1, z1, h, then };
}
function jumpDown(p, then = null) {
  const pr = p.perch; if (!pr) { if (then) then(); return; }
  p.perch = null; pr.by = null; p.perchTarget = null; p.perchNap = false;
  petSet(p, 'jump', 2);
  petJump(p, pr.sx + (Math.random() - .5) * .3, 0, pr.sz + (Math.random() - .5) * .3, .48, .32, then || (() => petSet(p, 'idle', 1)));
}
const henryOnHub = () => Math.hypot(P.x - HUB.x, P.z - HUB.z) < HUB.r - .3;
const faceHenry = p => Math.atan2(P.x - p.x, P.z - p.z);
const dPet = p => Math.hypot(P.x - p.x, P.z - p.z);
export function petNap(p) { return p.state === 'nap' || (p.state === 'perch' && p.perchNap); }

function petDecide(p) {
  const r = Math.random(), sleepy = S.tod === 'night' || WXS.rain > .3 || WXS.snow > .3;
  if (p.dog) {
    if (r < (sleepy ? .5 : .1)) { const s = dhWorld(p.mat * .4, 1.02); return petGo(p, s.x, s.z, DOG_SPD.walk, 'nap', sleepy ? 22 + Math.random() * 18 : 9 + Math.random() * 8, DOGHOUSE.ry); }
    if (r < (sleepy ? .58 : .22) && !bowlBy) { bowlBy = p; return petGo(p, EAT.x, EAT.z, DOG_SPD.walk, 'eat', 3 + Math.random() * 2.5, EAT.yaw); }
    if (S.started && henryOnHub() && r < .36) return petSet(p, 'visit', 8);
    if (!sleepy && !reduceMotion && r < .43) { p.zDir = Math.random() < .5 ? 1 : -1; petSet(p, 'zoom', 4 + Math.random() * 2); if (S.started && dPet(p) < 9) floatText(p.x, 1.25, p.z, 'Zoomies!', 1.3); return; }
    if (r < .58) return petSet(p, 'sit', 3 + Math.random() * 4);
    const s = petSpot(p); return petGo(p, s.x, s.z, Math.random() < .3 ? DOG_SPD.trot : DOG_SPD.walk, 'idle', 1.5 + Math.random() * 3);
  }
  if (r < (sleepy ? .45 : .18)) { const pr = PERCHES.find(q => !q.by); if (pr) { pr.by = p; p.perchTarget = pr; return petGo(p, pr.sx, pr.sz, CAT_SPD.walk, 'perchUp', 0); } }
  if (r < (sleepy ? .65 : .3)) return petSet(p, 'nap', 10 + Math.random() * 14);
  if (S.started && henryOnHub() && r < .38) return petSet(p, 'visit', 8);
  if (r < .52) return petSet(p, 'sit', 3 + Math.random() * 5);
  if (r < .62) return petSet(p, 'groom', 3 + Math.random() * 2);
  const s = petSpot(p); return petGo(p, s.x, s.z, CAT_SPD.walk, 'idle', 2 + Math.random() * 3);
}
function catFlee(p, fx, fz, dist) {
  let dx = p.x - fx, dz = p.z - fz, dl = Math.hypot(dx, dz);
  if (dl < .01) { const a = Math.random() * 6.28; dx = Math.cos(a); dz = Math.sin(a); dl = 1; }
  let [tx, tz] = hubClamp(p.x + dx / dl * dist, p.z + dz / dl * dist, PET_LIM - .5);
  if (Math.hypot(tx - p.x, tz - p.z) < 1) { const s = petSpot(p); tx = s.x; tz = s.z; }
  petGo(p, tx, tz, CAT_SPD.run, 'sit', 2 + Math.random() * 2);
}
function arriveHenry(p) {
  const greet = p.greet; p.greet = false;
  petSet(p, 'sit', 3 + Math.random() * 2.5); p.yawT = faceHenry(p);
  if (p.dog) p.happy = 3;
  if (!S.started) return;
  if (greet) { floatText(p.x, 1.35, p.z, `Woof!<small>${esc(p.name)} came to say hi · press E to pet</small>`, 3.2); SFX.woof(); }
  else if (!p.dog && Math.random() < .5) { floatText(p.x, 1.0, p.z, 'Mrrp?', 1.3); SFX.meow(); }
}

/* what you can do with them */
function petPet(p) {
  if (!S.started) { beginGame(); return; }
  if (p.air || p.state === 'chase' || p.state === 'trick' || p.state === 'jump') return;
  const high = p.y > .5;
  faceToward(p.x, p.z, 1.6); emote(high ? 'send' : 'petdown', high ? 1.2 : 1.5);
  const hy = p.y + (p.dog ? .95 : .72);
  if (p.dog) {
    petSet(p, 'petted', 2.2); p.happy = 4; p.yawT = faceHenry(p);
    spriteBurst(p.x, hy, p.z, heartTex, 6, { size: .26, up: 1.4, spread: .7 });
    floatText(p.x, hy + .55, p.z, `${['Woof!', 'Arf!', 'Wruff!'][Math.floor(Math.random() * 3)]}<small>${esc(p.name)} loves belly rubs</small>`, 1.9);
    SFX.woof(); markInteract('dog');
    return;
  }
  p.petN = p.petT > 0 ? p.petN + 1 : 1; p.petT = 10;
  if (p.petN >= 4) {
    p.petN = 0; p.petT = 0; p.hissCd = 6;
    floatText(p.x, hy + .55, p.z, `Hss!<small>${esc(p.name)} has had enough pets for now</small>`, 2.2); SFX.hiss();
    const flee = () => catFlee(p, P.x, P.z, 2.8);
    if (p.perch) jumpDown(p, flee); else flee();
    return;
  }
  const woke = petNap(p);
  petSet(p, 'petted', 2.4); p.perchNap = false; if (!p.perch) p.yawT = faceHenry(p);
  spriteBurst(p.x, hy, p.z, heartTex, 5, { size: .24, up: 1.3, spread: .6 });
  floatText(p.x, hy + .55, p.z, woke ? `Mrrp?<small>You woke ${esc(p.name)} up</small>` : `Purrr…<small>${esc(p.name)} is purring</small>`, 1.9);
  if (woke) SFX.meow(); else SFX.purr();
  markInteract('cat');
}
const TRICKS = [['spin', 'Spin'], ['paw', 'High five'], ['roll', 'Roll over'], ['bow', 'Play bow']];
function dogTrick(p) {
  if (!S.started) { beginGame(); return; }
  if (p.air || p.state === 'trick' || p.state === 'chase') return;
  const [kind, cmd] = TRICKS[p.trickI++ % TRICKS.length];
  faceToward(p.x, p.z, 1.6); emote('send', 1.0); say(`${p.name}, ${cmd.toLowerCase()}!`, 1.6);
  p.trick = kind; petSet(p, 'trick', kind === 'roll' ? 2.1 : 1.8); p.yawT = faceHenry(p); p.happy = 3;
  SFX.yip();
}
function trickDone(p) {
  const hy = p.y + 1.0;
  spriteBurst(p.x, hy, p.z, boneTex, 5, { size: .3, up: 1.6, spread: .8 });
  floatText(p.x, hy + .4, p.z, `Good pup!<small>${esc(p.name)} earned a treat</small>`, 1.8); SFX.chime();
  markInteract('trick'); petSet(p, 'sit', 2.5); p.happy = 3; p.yawT = faceHenry(p);
}
function tossYarn(p) {
  if (!S.started) { beginGame(); return; }
  if (yarn.on) { floatText(yarn.x, .8, yarn.z, 'Already playing!', 1.2); return; }
  if (p.air) return;
  let dx = p.x - P.x, dz = p.z - P.z, dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  let [lx, lz] = hubClamp(p.x + dx * 2.2, p.z + dz * 2.2, PET_LIM - .8);
  if (Math.hypot(lx - p.x, lz - p.z) < 1.2) { const cx = HUB.x - p.x, cz = HUB.z - p.z, cl = Math.hypot(cx, cz) || 1; lx = p.x + cx / cl * 2.2; lz = p.z + cz / cl * 2.2; }
  for (const c of colliders) { const ex = lx - c.x, ez = lz - c.z, ed = Math.hypot(ex, ez) || 1e-3, min = c.r + .25; if (ed < min) { lx = c.x + ex / ed * min; lz = c.z + ez / ed * min; } }
  yarn.on = true; yarn.cat = p; yarn.n = 0; yarn.fade = 0; yarn.vx = yarn.vz = 0; yarn.g.visible = true; yarn.g.scale.setScalar(1);
  yarn.air = { t: 0, dur: .7, x0: P.x + Math.sin(anim.yaw) * .35, y0: P.y + 1.3, z0: P.z + Math.cos(anim.yaw) * .35, x1: lx, z1: lz };
  yarn.x = yarn.air.x0; yarn.y = yarn.air.y0; yarn.z = yarn.air.z0;
  faceToward(lx, lz, 1.4); emote('send', 1.1); SFX.whoosh();
  const go = () => petSet(p, 'stalk', 9);
  if (p.perch) jumpDown(p, go); else go();
}
function pounceLand(p) {
  yarn.n++; SFX.pop(); markInteract('yarn');
  const ang = p.yaw + (Math.random() - .5) * 1.6;
  yarn.vx = Math.sin(ang) * 2.4; yarn.vz = Math.cos(ang) * 2.4;
  spriteBurst(yarn.x, .3, yarn.z, puffTex, 4, { size: .25, up: .6, spread: .6 });
  if (yarn.n >= 3) { yarn.vx *= .35; yarn.vz *= .35; yarn.fade = .001; petSet(p, 'proud', 2.6); floatText(p.x, 1.0, p.z, `Got it!<small>${esc(p.name)} caught the yarn</small>`, 2); SFX.meow(); }
  else petSet(p, 'stalk', 6);
}
export function walkToPet(p) {
  if (!S.started) beginGame();
  const d = Math.hypot(P.x - p.x, P.z - p.z);
  if (d <= p.radius) { p.act(); return; }
  if (!p.perch && !p.air && ATTENDABLE.has(p.state)) petSet(p, 'attend', 7);
  const ux = (P.x - p.x) / d, uz = (P.z - p.z) / d;
  let ax = p.x + ux, az = p.z + uz;
  if (!walkable(ax, az)) { ax = p.x; az = p.z; }
  walkTo({ x: ax, z: az }); S.pendingAct = p; markAt(ax, az);
}

function updateYarn(dt) {
  if (!yarn.on) return;
  if (yarn.air) {
    const a = yarn.air; a.t += dt; const u = Math.min(1, a.t / a.dur);
    yarn.x = lerp(a.x0, a.x1, u); yarn.z = lerp(a.z0, a.z1, u); yarn.y = lerp(a.y0, .12, u) + 3.6 * u * (1 - u);
    if (u >= 1) { yarn.air = null; yarn.y = .12; SFX.click(); }
  } else {
    let nx = yarn.x + yarn.vx * dt, nz = yarn.z + yarn.vz * dt;
    for (const c of colliders) { const ex = nx - c.x, ez = nz - c.z, ed = Math.hypot(ex, ez), min = c.r + .12; if (ed < min && ed > 1e-4) { const ux = ex / ed, uz = ez / ed, dot = yarn.vx * ux + yarn.vz * uz; if (dot < 0) { yarn.vx -= 1.8 * dot * ux; yarn.vz -= 1.8 * dot * uz; } nx = c.x + ux * min; nz = c.z + uz * min; } }
    const hx = nx - HUB.x, hz = nz - HUB.z, hr = Math.hypot(hx, hz), lim = PET_LIM - .3;
    if (hr > lim) { const ux = hx / hr, uz = hz / hr, dot = yarn.vx * ux + yarn.vz * uz; if (dot > 0) { yarn.vx -= 1.8 * dot * ux; yarn.vz -= 1.8 * dot * uz; } nx = HUB.x + ux * lim; nz = HUB.z + uz * lim; }
    yarn.x = nx; yarn.z = nz;
    const f = Math.exp(-dt * 2.2); yarn.vx *= f; yarn.vz *= f;
    const sp = Math.hypot(yarn.vx, yarn.vz);
    if (sp > .02) { _axis.set(yarn.vz, 0, -yarn.vx).normalize(); yarn.g.rotateOnWorldAxis(_axis, sp * dt / .12); }
  }
  if (yarn.fade === 0 && !yarn.air && yarn.cat && !['stalk', 'crouch', 'pounce', 'jump'].includes(yarn.cat.state)) yarn.fade = .001;
  if (yarn.fade > 0) {
    yarn.fade += dt;
    if (yarn.fade > 1.4) { const s = Math.max(0, 1 - (yarn.fade - 1.4) / .4); yarn.g.scale.setScalar(Math.max(.001, s)); if (s <= 0) { yarn.on = false; yarn.g.visible = false; yarn.cat = null; } }
  }
  yarn.g.position.set(yarn.x, yarn.y, yarn.z);
}

function updatePet(p, dt) {
  p.t -= dt; p.st += dt; p.hissCd -= dt; p.happy = Math.max(0, p.happy - dt); p.hop = Math.max(0, p.hop - dt);
  if (p.petT > 0) { p.petT -= dt; if (p.petT <= 0) p.petN = 0; }
  p.moving = false; p.speedNow = 0;
  const dP = dPet(p);
  if (p.air) {
    const a = p.air; a.t += dt; const u = Math.min(1, a.t / a.dur);
    p.x = lerp(a.x0, a.x1, u); p.z = lerp(a.z0, a.z1, u); p.y = lerp(a.y0, a.y1, u) + 4 * a.h * u * (1 - u);
    if (u >= 1) { p.air = null; p.y = a.y1; if (a.then) a.then(); }
    return;
  }
  switch (p.state) {
    case 'idle': if (p.t <= 0) petDecide(p); break;
    case 'sit': if (p.happy > 0) p.yawT = faceHenry(p); if (p.t <= 0) petDecide(p); break;
    case 'nap': case 'groom': if (p.t <= 0) petDecide(p); break;
    case 'eat': p.yawT = EAT.yaw; if (p.t <= 0) petDecide(p); break;
    case 'walk': {
      const arrived = petMove(p, dt, p.tx, p.tz, p.spd, .22);
      if (!arrived && p.t > 0 && p.stuck < 1.3) break;
      if (p.after === 'perchUp') {
        const pr = p.perchTarget;
        if (arrived && pr && pr.by === p) {
          petSet(p, 'jump', 2);
          petJump(p, pr.x, pr.y, pr.z, .5, .45, () => { p.perch = pr; p.perchNap = Math.random() < (S.tod === 'night' ? .85 : .55); petSet(p, 'perch', (p.perchNap ? 14 : 6) + Math.random() * 10); p.yawT = pr.yaw; });
        } else petSet(p, 'idle', 1);
      } else if (p.after === 'eat' && !arrived) petSet(p, 'idle', 1);
      else { petSet(p, p.after || 'idle', p.afterT || 2); if (p.afterYaw != null) p.yawT = p.afterYaw; }
      break;
    }
    case 'visit': case 'return': {
      if (!henryOnHub()) { petSet(p, 'idle', 1); break; }
      const dx = p.x - P.x, dz = p.z - P.z, dl = Math.hypot(dx, dz) || 1;
      if (dl < 1.35) { arriveHenry(p); break; }
      const [tx, tz] = hubClamp(P.x + dx / dl * 1.15, P.z + dz / dl * 1.15, PET_LIM - .1);
      const sp = p.dog ? (p.state === 'return' || p.greet ? DOG_SPD.trot : DOG_SPD.walk) : CAT_SPD.walk;
      petMove(p, dt, tx, tz, sp, .2);
      if (p.t <= 0 || p.stuck > 1.5) petSet(p, 'idle', 1);
      break;
    }
    case 'attend': {
      p.yawT = faceHenry(p);
      if (p.dog && dP > 1.35 && henryOnHub()) { const ux = (p.x - P.x) / dP, uz = (p.z - P.z) / dP; if (!petMove(p, dt, P.x + ux * 1.15, P.z + uz * 1.15, DOG_SPD.trot, .15)) p.yawT = faceHenry(p); }
      if (p.t <= 0) petSet(p, 'idle', 1);
      break;
    }
    case 'petted':
      if (!p.perch) p.yawT = faceHenry(p);
      if (p.t <= 0) { if (p.perch) petSet(p, 'perch', 4 + Math.random() * 6); else petSet(p, 'sit', 1.5 + Math.random() * 2); }
      break;
    case 'trick': if (p.trick !== 'spin') p.yawT = faceHenry(p); if (p.t <= 0) trickDone(p); break;
    case 'party':
      p.yawT = faceHenry(p);
      if (p.t <= 0 || (anim.emote !== 'dance' && anim.emote !== 'cheer')) { petSet(p, 'sit', 2); p.happy = 2; }
      break;
    case 'zoom': {
      const a = Math.atan2(p.z - ZC.z, p.x - ZC.x) + p.zDir * .6;
      petMove(p, dt, ZC.x + Math.cos(a) * ZC.r, ZC.z + Math.sin(a) * ZC.r, DOG_SPD.run, .05);
      if (p.t <= 0) { petSet(p, 'sit', 2.5); p.happy = 2.5; }
      break;
    }
    case 'chase': {
      const bsp = Math.hypot(BALL.vx, BALL.vz), bx = BALL.x - P.x, bz = BALL.z - P.z, bl = Math.hypot(bx, bz) || 1;
      if (BALL.falling || Math.hypot(BALL.x - HUB.x, BALL.z - HUB.z) > PET_LIM + .6 || p.t <= 0) { petSet(p, 'idle', 1); break; }
      const db = Math.hypot(BALL.x - p.x, BALL.z - p.z);
      if (db < BALL.r + p.rad + .14 && bsp < 3) {
        const v = clamp((bl - 1.7) * 1.3, .5, 4.2);
        BALL.vx = -bx / bl * v; BALL.vz = -bz / bl * v;
        fetchCd = 3.5; SFX.woof();
        if (S.started) { floatText(p.x, 1.3, p.z, `Fetch!<small>${esc(p.name)} nudged the ball back to you</small>`, 2.2); markInteract('fetch'); }
        petSet(p, 'return', 6); p.happy = 3;
        break;
      }
      petMove(p, dt, db < 1.0 ? BALL.x : BALL.x + bx / bl * .5, db < 1.0 ? BALL.z : BALL.z + bz / bl * .5, DOG_SPD.run, .05);
      break;
    }
    case 'stalk': {
      if (!yarn.on || yarn.cat !== p || yarn.fade > 0) { petSet(p, 'idle', 1); break; }
      p.yawT = Math.atan2(yarn.x - p.x, yarn.z - p.z);
      if (yarn.air) break;
      if (Math.hypot(yarn.x - p.x, yarn.z - p.z) < .95) { petSet(p, 'crouch', .75); break; }
      petMove(p, dt, yarn.x, yarn.z, CAT_SPD.trot, .8);
      if (p.t <= 0 || p.stuck > 1.5) { yarn.fade = .001; petSet(p, 'idle', 1); }
      break;
    }
    case 'crouch':
      p.yawT = Math.atan2(yarn.x - p.x, yarn.z - p.z);
      if (p.t <= 0) {
        const dx = yarn.x - p.x, dz = yarn.z - p.z, dl = Math.hypot(dx, dz) || 1;
        petSet(p, 'pounce', 2); SFX.pop();
        const [jx, jz] = hubClamp(yarn.x - dx / dl * .2, yarn.z - dz / dl * .2, PET_LIM);
        petJump(p, jx, 0, jz, .42, .38, () => pounceLand(p));
      }
      break;
    case 'proud': case 'jump': case 'pounce': if (p.t <= 0) petSet(p, 'idle', .5); break;
    case 'perch':
      if (!p.perch) { petSet(p, 'idle', 1); break; }
      p.x = p.perch.x; p.z = p.perch.z; p.y = p.perch.y;
      p.yawT = !p.perchNap && dP < 4 ? faceHenry(p) : p.perch.yaw;
      if (p.t <= 0) jumpDown(p);
      break;
    default: petSet(p, 'idle', 1);
  }
}

function posePet(p, dt, t) {
  const R = p.rig, k = 1 - Math.exp(-dt * 9), st = p.state, u = p.tmax ? clamp(1 - p.t / p.tmax, 0, 1) : 0;
  const napping = petNap(p);
  const tg = { sit: 0, lie: 0, crouch: 0, bow: 0, leap: 0, paw: 0, eat: 0, groom: 0, closed: 0 };
  let wagRate = 5, wagAmt = .16, hop = 0, spin = 0, roll = 0, tilt = 0;
  if (napping) { tg.lie = 1; tg.closed = 1; wagAmt = .03; wagRate = 1.5; }
  else if (st === 'perch' || st === 'sit' || st === 'proud' || (st === 'attend' && !p.moving)) tg.sit = 1;
  else if (st === 'petted') { tg.sit = 1; if (p.dog) { tilt = Math.sin(p.st * 3) * .22; } else { tg.closed = .85; tilt = Math.sin(p.st * 2.4) * .25; } }
  else if (st === 'eat') tg.eat = 1;
  else if (st === 'groom') { tg.sit = 1; tg.groom = 1; }
  else if (st === 'crouch') tg.crouch = 1;
  else if (st === 'party') { hop = Math.abs(Math.sin(p.st * 9)) * .2; spin = Math.sin(p.st * 4.5) * .7; }
  else if (st === 'trick') {
    if (p.trick === 'spin') { spin = ease(u) * Math.PI * 2; hop = Math.sin(u * Math.PI) * .22; }
    else if (p.trick === 'paw') { tg.sit = 1; tg.paw = clamp(Math.min((u - .15) / .15, (.9 - u) / .15), 0, 1); }
    else if (p.trick === 'roll') { tg.lie = clamp(Math.min(u / .12, (1 - u) / .12), 0, 1); roll = ease(clamp((u - .15) / .65, 0, 1)) * Math.PI * 2; }
    else if (p.trick === 'bow') tg.bow = clamp(Math.min(u / .15, (1 - u) / .15), 0, 1);
  }
  if (p.air) tg.leap = 1;
  if (p.hop > 0) hop = Math.sin((1 - p.hop / .35) * Math.PI) * .25;
  if (p.happy > 0 || st === 'party' || st === 'trick' || st === 'zoom' || st === 'chase') { wagRate = 17; wagAmt = .45; }
  if (reduceMotion) { hop = 0; if (st === 'party') spin = 0; }
  p.blink -= dt; if (p.blink < 0) p.blink = 2.4 + Math.random() * 3;
  if (p.blink < .12) tg.closed = Math.max(tg.closed, 1);
  const Q = p.pose;
  for (const key in tg) Q[key] += (tg[key] - Q[key]) * (key === 'closed' ? 1 - Math.exp(-dt * 30) : k);
  p.gait = lerp(p.gait, p.moving ? clamp(p.speedNow / (p.dog ? 2 : 1.5), 0, 1) : 0, 1 - Math.exp(-dt * 10));
  if (p.moving) p.walkPh += p.speedNow * dt * (p.dog ? 9 : 12);
  const s = Math.sin(p.walkPh), a = p.gait * .7, gal = clamp((p.speedNow - (p.dog ? 3.2 : 2.6)) / 1.4, 0, 1);
  const trot = [s, -s, -s, s], bound = [s, s, -s, -s];
  const C = p.dog ? { rx: -.5, dy: -.06, dz: .12, back: -1.35, head: .42, lieY: -.2, lieF: -1.45, lieB: -1.25, crY: -.08 } : { rx: -.6, dy: -.04, dz: .1, back: -1.4, head: .5, lieY: -.14, lieF: -1.45, lieB: -1.3, crY: -.07 };
  const legs = [0, 1, 2, 3].map(i => {
    const front = i < 2;
    let r = lerp(trot[i], bound[i] * 1.15, gal) * a;
    r += front ? Q.sit * -C.rx + Q.lie * C.lieF + Q.bow * -1.5 + Q.leap * -1.0 + Q.crouch * -.45 : Q.sit * C.back + Q.lie * C.lieB + Q.bow * -.45 + Q.leap * 1.0 + Q.crouch * -.65;
    if (i === 1) r += Q.paw * -1.9 + Q.groom * -2.2;
    return r;
  });
  legs.forEach((r, i) => { R.legs[i].rotation.x = r; R.legs[i].scale.y = 1 - (p.dog ? .3 : .5) * Q.lie; });
  const bob = Math.abs(Math.cos(p.walkPh)) * .025 * a;
  const by = (p.dog ? -.24 : 0) + Q.sit * C.dy + Q.lie * C.lieY + Q.crouch * C.crY - Q.bow * .04 + bob + hop;
  R.body.position.set(0, by, Q.sit * C.dz);
  R.body.rotation.set(Q.sit * C.rx + Q.bow * .45 + Q.crouch * .12 + Q.eat * .12 + Math.sin(p.walkPh) * .1 * gal, 0, st === 'crouch' ? Math.sin(t * 28) * .1 * Q.crouch : 0);
  if (p.dog) R.roll.rotation.z = roll;
  let hy = 0;
  const lookH = (p.dog ? dPet(p) < 4.5 : dPet(p) < 2.6) && !napping && !['eat', 'groom', 'zoom', 'chase', 'stalk', 'crouch'].includes(st);
  if (lookH) hy = clamp(angDiff(faceHenry(p), p.yaw + spin), -1, 1) * .9;
  else if (st === 'idle' || st === 'sit' || st === 'perch') hy = Math.sin(t * .6 + p.walkPh) * .45;
  p.headYaw = lerp(p.headYaw, hy, k);
  R.head.position.set(0, R.headY - Q.eat * .22 - Q.lie * (p.dog ? .1 : .06) - Q.groom * .03, R.headZ + Q.eat * .06);
  R.head.rotation.set(Q.sit * C.head + Q.lie * .28 + Q.eat * (.85 + Math.sin(t * 9) * .1) - Q.bow * .35 + Q.groom * (.35 + Math.sin(t * 8) * .08) - Q.crouch * .1, p.headYaw - Q.groom * .3, tilt + Q.groom * .3);
  for (const e of R.eyes) e.scale.y = e.userData.sy * (1 - .88 * Q.closed);
  if (p.dog) {
    R.tongue.visible = p.happy > 0 || st === 'party' || st === 'zoom' || p.speedNow > 3;
    R.ears.forEach((e, i) => { e.rotation.x = (p.ear === 'flop' ? Math.sin(p.walkPh + i) * .25 * a : 0) - (p.happy > 0 ? .25 : 0); });
    R.tail.rotation.set((p.tail === 'long' ? -(Q.lie * .7 + Q.sit * .6) : 0), Math.sin(t * wagRate + p.walkPh * .2) * wagAmt, 0);
  } else {
    R.ears.forEach((e, i) => { e.rotation.y = Math.max(0, Math.sin(t * 2.3 + i * 2 + p.walkPh)) ** 24 * .5 * (1 - Q.lie); });
    const down = Math.max(Q.sit, Q.lie);
    R.tail.rotation.x = -.95 - .3 * Q.sit - .75 * Q.lie - .3 * Q.crouch;
    R.segs.forEach((sg, i) => { sg.rotation.x = .28 * (1 - down) + (st === 'crouch' ? .1 : 0); sg.rotation.z = Math.sin(t * (st === 'crouch' ? 9 : 1.7) - i * .7) * (.12 + i * .05) * (1 - Q.lie * .8) + down * .42; });
    R.body.scale.y = st === 'petted' && !reduceMotion ? 1 + Math.sin(t * 55) * .012 : 1;
  }
  p.yaw += angDiff(p.yawT, p.yaw) * (1 - Math.exp(-dt * (p.state === 'zoom' || p.state === 'chase' ? 12 : 8)));
  R.root.position.set(p.x, p.y, p.z); R.root.rotation.y = p.yaw + spin;
  p.blob.position.set(p.x, (p.perch ? p.perch.y : 0) + .03, p.z); p.blob.scale.setScalar(clamp(1 - (p.air ? (p.y - (p.air.y1 || 0)) * .4 : 0), .5, 1));
  p.hit.position.set(p.x, p.y + .35, p.z);
  p.tag.position.set(p.x, p.y + (p.dog ? 1.08 : .82) + hop, p.z);
  const show = (dPet(p) < 3.4 && S.started) || (S.hoverObj && S.hoverObj.pet === p) || st === 'petted' || st === 'trick';
  if (show !== p.tagOn) { p.tagOn = show; p.tagEl.style.opacity = show ? '1' : '0'; }
  if (napping && !reduceMotion) { p.zzT -= dt; if (p.zzT <= 0) { p.zzT = 1.5; spriteBurst(p.x + Math.sin(p.yaw) * .2, p.y + (p.dog ? .7 : .5), p.z + Math.cos(p.yaw) * .2, zTex, 1, { size: .2, up: .45, spread: .15, life: 1.9 }); } }
}

export function updatePets(dt, t) {
  fetchCd -= dt;
  // the first dog trots over to say hi once the game starts
  if (S.started && !petGreet) {
    petGreetT += dt;
    if (petGreetT > 2.4) { petGreet = true; const m = PETS[0]; if (!m.air && !m.perch && ATTENDABLE.has(m.state)) { m.greet = true; petSet(m, 'visit', 9); } }
  }
  // dogs join in when Henry dances or cheers, cats stay unimpressed
  if (anim.emote !== petEmote) {
    petEmote = anim.emote;
    if (petEmote === 'dance' || petEmote === 'cheer' || petEmote === 'wave') {
      let barked = false;
      for (const p of PETS) {
        const d = dPet(p); if (d > 5.5 || p.air || p.perch) continue;
        if (p.dog && petEmote === 'wave') { p.happy = Math.max(p.happy, 2.5); continue; }
        if (p.dog && PARTYABLE.has(p.state)) { petSet(p, 'party', 3.6); p.happy = 4; barked = true; }
        else if (!p.dog && petEmote === 'dance' && d < 4 && S.started && !petNap(p) && Math.random() < .7) floatText(p.x, 1.0, p.z, `…<small>${esc(p.name)} is not impressed</small>`, 1.8);
      }
      if (barked && S.started) SFX.woof();
    }
  }
  // fetch: the nearest awake dog chases a kicked ball and noses it back
  const bsp = Math.hypot(BALL.vx, BALL.vz);
  if (!fetcher && fetchCd <= 0 && !BALL.falling && bsp > 2 && Math.hypot(BALL.x - HUB.x, BALL.z - HUB.z) < PET_LIM + .4) {
    let best = null, bd = 9;
    for (const p of PETS) if (p.dog && !p.air && FETCHABLE.has(p.state)) { const d = Math.hypot(BALL.x - p.x, BALL.z - p.z); if (d < bd) { bd = d; best = p; } }
    if (best) { petSet(best, 'chase', 7); fetcher = best; best.happy = 3; if (S.started) SFX.yip(); }
  }
  for (const p of PETS) updatePet(p, dt);
  // cats hiss at dogs that come too close; bodies don't overlap each other, Henry or the ball
  for (const p of PETS) {
    if (p.air || p.perch) continue;
    if (!p.dog && p.hissCd <= 0 && CALM_CAT.has(p.state)) {
      for (const q of PETS) if (q.dog && !q.air && Math.hypot(q.x - p.x, q.z - p.z) < .85) {
        p.hissCd = 14; catFlee(p, q.x, q.z, 2.2); p.hop = .35;
        if (S.started && dPet(p) < 10) { floatText(p.x, .95, p.z, 'Hss!', 1.2); SFX.hiss(); }
        break;
      }
    }
    for (const q of PETS) {
      if (q === p || q.air || q.perch) continue;
      const ex = p.x - q.x, ez = p.z - q.z, ed = Math.hypot(ex, ez), min = p.rad + q.rad + .06;
      if (ed < min && ed > 1e-4) { const push = (min - ed) / 2; p.x += ex / ed * push; p.z += ez / ed * push; q.x -= ex / ed * push; q.z -= ez / ed * push; }
    }
    const hx = p.x - P.x, hz = p.z - P.z, hd = Math.hypot(hx, hz), hmin = p.rad + .38;
    if (hd < hmin && hd > 1e-4 && S.jumpY < .6) { p.x = P.x + hx / hd * hmin; p.z = P.z + hz / hd * hmin; }
    const mx = p.x - H.x, mz = p.z - H.z, md = Math.hypot(mx, mz), mmin = p.rad + .2;
    if (md < mmin && md > 1e-4 && S.hamState !== 'wheel') { p.x = H.x + mx / md * mmin; p.z = H.z + mz / md * mmin; }
    if (!BALL.falling && p !== fetcher) {
      const ex = BALL.x - p.x, ez = BALL.z - p.z, ed = Math.hypot(ex, ez), min = BALL.r + p.rad;
      if (ed < min && ed > 1e-4 && BALL.y < .5) {
        const ux = ex / ed, uz = ez / ed, dot = BALL.vx * ux + BALL.vz * uz;
        if (dot < 0) { BALL.vx -= 1.6 * dot * ux; BALL.vz -= 1.6 * dot * uz; }
        BALL.x = p.x + ux * min; BALL.z = p.z + uz * min;
        if (!p.dog && dot < -1 && CALM_CAT.has(p.state) && S.started) { p.hop = .35; catFlee(p, BALL.x, BALL.z, 1.6); floatText(p.x, .9, p.z, '!', .9); }
      }
    }
    petResolve(p);
  }
  // Henry stops short of a pet he walked over to, instead of bumping into it
  if (S.pendingAct && S.pendingAct.pet && S.path.length && Math.hypot(P.x - S.pendingAct.x, P.z - S.pendingAct.z) < 1.25) { S.path = []; onArrive(); }
  for (const p of PETS) {
    p.sub = petNap(p) ? `${p.breed} · napping` : p.perch ? `${p.breed} · on the cat tree` : p.breed;
    posePet(p, dt, t);
  }
  updateYarn(dt);
  if (catToy && !reduceMotion) catToy.rotation.z = Math.sin(t * 1.7) * .16 + Math.sin(t * 3.1) * WXS.wind * .3;
}
