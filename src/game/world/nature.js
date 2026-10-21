// Trees, rocks, grass tufts and flowers in the squares and parks, drifting clouds and butterflies.
import { THREE, scene, canvasTex, M, mat, put, colliders, dummy } from '../gfx.js';
import { ISL, freeSpot } from '../nav.js';
import { DISTRICT } from '../../data/world.js';
import { srand, reduceMotion } from '../util.js';
import { S } from '../state.js';
import { P } from '../play/player.js';
import { markInteract } from '../play/hud.js';
import { WXS } from '../sky/weather.js';

let G = null;
export function geos() {
  if (!G) G = {
    trunk: new THREE.CylinderGeometry(.12, .18, 1.1, 7), f1: new THREE.IcosahedronGeometry(.75, 0), f2: new THREE.IcosahedronGeometry(.55, 0), f3: new THREE.IcosahedronGeometry(.45, 0),
    cone: new THREE.ConeGeometry(.7, 1, 7),
    rock: new THREE.DodecahedronGeometry(.32, 0), tuft: new THREE.ConeGeometry(.07, .32, 4), flower: new THREE.SphereGeometry(.09, 8, 6), stem: new THREE.CylinderGeometry(.015, .015, .26, 4),
  };
  return G;
}
export const FLOWER_COLS = ['#ffffff', '#ffd166', '#f6a68f', '#ec6a4e', '#c9b6ff'].map(c => new THREE.Color(c));

/** where the maples stand, so falling leaves know where to start */
export const MAPLES = [];
/** a tree in a square or park: 'leaf', 'blossom', 'maple' (Canada's red and gold) or 'spruce' */
export function tree(x, z, s = 1, kind = 'leaf') {
  const g0 = geos();
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = srand() * 6; scene.add(g);
  if (kind === 'spruce') {
    put(g, g0.trunk, mat.trunk, 0, .4, 0).scale.set(.8, .75, .8);
    put(g, g0.cone, mat.spruce, 0, 1.15, 0).scale.set(1.05, 1.1, 1.05);
    put(g, g0.cone, mat.spruce2, 0, 1.75, 0).scale.set(.8, .95, .8);
    put(g, g0.cone, mat.spruce, 0, 2.3, 0).scale.set(.52, .8, .52);
  } else {
    const [m1, m2] = kind === 'blossom' ? [mat.blossom, mat.blossom2] : kind === 'maple' ? [mat.maple, srand() < .5 ? mat.maple2 : mat.maple3] : [mat.leaf, mat.leaf2];
    put(g, g0.trunk, mat.trunk, 0, .55, 0);
    put(g, g0.f1, m1, 0, 1.45, 0); put(g, g0.f2, m2, .32, 1.95, .1); put(g, g0.f3, m1, -.3, 1.85, -.15);
    if (kind === 'maple') MAPLES.push({ x, z, h: 1.9 * s, r: .8 * s });
  }
  colliders.push({ x, z, r: .3 * s });
  return g;
}
function planter(x, z) {
  put(scene, new THREE.CylinderGeometry(.62, .66, .24, 22), mat.curb, x, .12, z);
  put(scene, new THREE.CylinderGeometry(.54, .54, .02, 22), M('#8a6a4a'), x, .245, z, false);
  colliders.push({ x, z, r: .62 });
}

// trees, rocks, tufts and flowers in each square and park
export function initSquareDecor() {
  const g0 = geos();
  const tufts = new THREE.InstancedMesh(g0.tuft, mat.grassDark, 420); tufts.receiveShadow = true;
  const flowers = new THREE.InstancedMesh(g0.flower, new THREE.MeshStandardMaterial({ roughness: .6 }), 260);
  let tn = 0, fn = 0;
  // each square or park: how many trees, and which kinds take turns
  [['hub', 3, ['maple', 'leaf', 'maple']], ['bridgly', 4, ['blossom']], ['transit', 0, ['leaf']], ['yard', 2, ['spruce', 'maple']], ['grove', 2, ['maple', 'spruce']], ['workshop', 2, ['maple', 'leaf']], ['studio', 2, ['spruce', 'maple']], ['lookout', 0, ['leaf']]].forEach(([id, n, kinds]) => {
    const is = ISL[id], plaza = DISTRICT[id] === 'plaza';
    for (let i = 0; i < n; i++) { const p = freeSpot(is, 1.0, 1.8); if (p) { tree(p.x, p.z, .8 + srand() * .55, kinds[i % kinds.length]); if (plaza) planter(p.x, p.z); } }
    if (!plaza) for (let i = 0; i < Math.round(is.r * 1.2); i++) { const p = freeSpot(is, .5, 1.4); if (!p) continue; const r = put(scene, g0.rock, mat.rock, p.x, .1, p.z); r.scale.setScalar(.5 + srand() * .9); r.rotation.set(srand() * 3, srand() * 3, 0); }
    if (!plaza) for (let i = 0; i < Math.round(is.r * 9) && tn < 420; i++) { const p = freeSpot(is, .3, 1.2); if (!p) continue; dummy.position.set(p.x, .14, p.z); dummy.rotation.set((srand() - .5) * .4, srand() * 3, (srand() - .5) * .4); dummy.scale.setScalar(.7 + srand() * .8); dummy.updateMatrix(); tufts.setMatrixAt(tn++, dummy.matrix); }
    if (!plaza) for (let i = 0; i < Math.round(is.r * 5) && fn < 260; i++) { const p = freeSpot(is, .4, 1.3); if (!p) continue; dummy.position.set(p.x, .2, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.8 + srand() * .6); dummy.updateMatrix(); flowers.setMatrixAt(fn, dummy.matrix); flowers.setColorAt(fn++, FLOWER_COLS[Math.floor(srand() * FLOWER_COLS.length)]); }
  });
  tufts.count = tn; flowers.count = fn; scene.add(tufts, flowers);
}

/* ---- clouds ---- */
/** @type {THREE.IcosahedronGeometry} */ export let cloudGeo;
/** @type {THREE.MeshStandardMaterial} */ export let cloudMat;
const clouds = [];
function cloud(x, y, z, s, speed) {
  const g = new THREE.Group(), n = 4 + Math.floor(srand() * 4);
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(cloudGeo, cloudMat); m.position.set((i - n / 2) * .9 + srand() * .4, srand() * .5, (srand() - .5) * 1.2); m.scale.set(1 + srand() * .6, .7 + srand() * .4, 1 + srand() * .5); g.add(m); }
  g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g); clouds.push({ g, speed });
}
export function initClouds() {
  cloudGeo = new THREE.IcosahedronGeometry(1, 2);
  cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#fff0e8', emissiveIntensity: .4 });
  for (let i = 0; i < 7; i++) { const a = srand() * Math.PI * 2, d = 55 + srand() * 60; cloud(Math.cos(a) * d, 20 + srand() * 12, Math.sin(a) * d - 10, 2.6 + srand() * 2.4, .3 + srand() * .4); }
}
export function updateClouds(dt) {
  if (reduceMotion) return;
  clouds.forEach(c => { c.g.position.x += c.speed * (1 + WXS.wind * 2.5) * dt; if (c.g.position.x > 95) c.g.position.x = -95; });
}

/* ---- butterflies in the Bridgly garden and the grove ---- */
let bflies = [];
export function initButterflies() {
  const wingTex = col => canvasTex(64, 64, (c) => { c.fillStyle = col; c.beginPath(); c.ellipse(30, 24, 26, 18, -.35, 0, 7); c.fill(); c.beginPath(); c.ellipse(26, 46, 17, 13, .4, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.arc(34, 22, 6, 0, 7); c.fill(); });
  const wingGeo = new THREE.PlaneGeometry(.34, .34); wingGeo.rotateX(-Math.PI / 2);
  bflies = [['#f6a68f', -3, -21.4], ['#ffd166', 3, -21.8], ['#c9b6ff', -2.4, -25.4], ['#ec6a4e', 2.8, -25.2], ['#9ed6ff', -17, 15], ['#ffd166', -15.5, 17]].map(([col, x, z], i) => {
    const g = new THREE.Group(); scene.add(g);
    const m = new THREE.MeshBasicMaterial({ map: wingTex(col), side: THREE.DoubleSide, transparent: true, alphaTest: .3, toneMapped: false });
    const wings = [-1, 1].map(s => { const piv = new THREE.Group(); g.add(piv); const w = new THREE.Mesh(wingGeo, m); w.position.x = s * .17; w.scale.x = -s; piv.add(w); return piv; });
    const pos = new THREE.Vector3(+x, 1.5, +z);
    return { g, wings, pos, home: { x: +x, z: +z }, ph: i * 1.7, flee: 0, fx: 0, fz: 0 };
  });
}
export function updateButterflies(dt, t) {
  for (const b of bflies) {
    const dP = Math.hypot(b.pos.x - P.x, b.pos.z - P.z);
    let tx, ty, tz, spd;
    if (b.flee > 0) {
      b.flee -= dt; tx = b.pos.x + b.fx * 3; tz = b.pos.z + b.fz * 3; ty = 3.6; spd = 4.5;
    } else {
      tx = b.home.x + Math.sin(t * .5 + b.ph) * 2.4; tz = b.home.z + Math.sin(t * .37 + b.ph * 2) * 2.0; ty = 1.3 + Math.sin(t * .9 + b.ph) * .5; spd = 1.6;
      if (dP < 2.3 && S.started) { b.flee = 2.4; const l = dP || 1; b.fx = (b.pos.x - P.x) / l; b.fz = (b.pos.z - P.z) / l; markInteract('butterflies'); }
    }
    const dx = tx - b.pos.x, dy = ty - b.pos.y, dz = tz - b.pos.z, d = Math.hypot(dx, dy, dz);
    if (d > .02) { const st = Math.min(d, spd * dt); b.pos.x += dx / d * st; b.pos.y += dy / d * st; b.pos.z += dz / d * st; b.g.rotation.y = Math.atan2(dx, dz); }
    b.g.position.set(b.pos.x, b.pos.y + Math.sin(t * 6 + b.ph) * .06, b.pos.z);
    const fl = reduceMotion ? .3 : Math.sin(t * (b.flee > 0 ? 30 : 16) + b.ph) * .95;
    b.wings[0].rotation.z = fl; b.wings[1].rotation.z = -fl;
  }
}

/* ---- maple leaves drifting down from the maples near the squares ---- */
const LEAF_N = 42, leaves = [];
let leafMesh = null;
const LEAF_COLS = ['#d9472b', '#e8632f', '#ef7d2d', '#f2b23a', '#c8382a'].map(c => new THREE.Color(c));
/** a maple leaf drawn on a canvas: 11 points and a short stem, white so each leaf can be tinted */
function mapleLeafTex() {
  return canvasTex(64, 64, (c) => {
    const P = [[32, 4], [37, 15], [44, 11], [42, 25], [56, 19], [52, 30], [60, 33], [47, 41], [49, 47], [35, 45], [34, 58], [30, 58], [29, 45], [15, 47], [17, 41], [4, 33], [12, 30], [8, 19], [22, 25], [20, 11], [27, 15]];
    c.fillStyle = '#ffffff'; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 58); c.lineTo(32, 14); c.stroke();
  });
}
function resetLeaf(l, first) {
  const m = MAPLES[Math.floor(srand() * MAPLES.length)], a = srand() * Math.PI * 2, d = srand() * m.r;
  l.x = m.x + Math.cos(a) * d; l.z = m.z + Math.sin(a) * d; l.y = first ? .3 + srand() * m.h : m.h + srand() * .4;
  l.sp = .35 + srand() * .3; l.ph = srand() * 6; l.spin = (srand() - .5) * 3; l.rest = 0;
}
export function initMapleLeaves() {
  if (!MAPLES.length || reduceMotion) return;
  const geo = new THREE.PlaneGeometry(.2, .2);
  leafMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: mapleLeafTex(), transparent: true, alphaTest: .4, side: THREE.DoubleSide }), LEAF_N);
  leafMesh.frustumCulled = false; scene.add(leafMesh);
  for (let i = 0; i < LEAF_N; i++) { const l = {}; resetLeaf(l, true); leaves.push(l); leafMesh.setColorAt(i, LEAF_COLS[i % LEAF_COLS.length]); }
  leafMesh.instanceColor.needsUpdate = true;
}
export function updateMapleLeaves(dt, t) {
  if (!leafMesh) return;
  const wind = 1 + WXS.wind * 2.5;
  for (let i = 0; i < LEAF_N; i++) {
    const l = leaves[i];
    if (l.y > .03) {
      l.y -= l.sp * dt; l.x += (Math.sin(t * 1.3 + l.ph) * .35 + .12 * wind) * dt; l.z += Math.cos(t * 1.1 + l.ph) * .25 * dt;
      dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(Math.sin(t * 2 + l.ph) * .9, t * l.spin + l.ph, Math.cos(t * 1.7 + l.ph) * .6);
    } else {
      l.rest += dt; dummy.position.set(l.x, .03, l.z); dummy.rotation.set(-Math.PI / 2, 0, l.ph);
      if (l.rest > 5) resetLeaf(l, false);
    }
    dummy.scale.setScalar(1); dummy.updateMatrix(); leafMesh.setMatrixAt(i, dummy.matrix);
  }
  leafMesh.instanceMatrix.needsUpdate = true;
}
