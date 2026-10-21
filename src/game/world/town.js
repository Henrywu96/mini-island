// The town around the squares and parks: houses, street lamps, the duck pond, yard trees, woods and hills.
// Everything here is decoration outside the walkable plazas and streets. Repeated parts are instanced,
// so the whole town is a handful of draw calls.
import { THREE, scene, camera, M, mat, mesh, put, walkMeshes, colliders, boxes, lampMats, dummy } from '../gfx.js';
import { ISLANDS, BRIDGES, POND, TOWN_R, segInfo, boxPush } from '../nav.js';
import { FOOD_COURT } from '../../data/world.js';
import { S } from '../state.js';
import { angDiff } from '../util.js';
import { geos, FLOWER_COLS, MAPLES } from './nature.js';
import { bench } from './bridgly.js';
import { P } from '../play/player.js';
import { WXS } from '../sky/weather.js';

export const GROUND_Y = -.06;
/** a meadow in the woods north-west of town where the moose grazes (no trees there) */
export const CLEARING = { a: 250 * Math.PI / 180, half: .2, r1: TOWN_R + 10 };
function inClearing(x, z) {
  const d = Math.atan2(z, x) - CLEARING.a;
  return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < CLEARING.half && Math.hypot(x, z) < CLEARING.r1;
}
const trand = (() => { let s = 20261012; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const tpick = arr => arr[Math.floor(trand() * arr.length)];

/** every house (and yard tree) placed in town; the minimap draws the houses */
export const HOUSES = [];
/** @type {Record<string, THREE.MeshStandardMaterial>} */ export let H_MAT;
let lawnMat = null, lawnBase = null;
const _snowWhite = new THREE.Color('#ffffff');

// houses between the camera and Henry turn see-through, so the town never hides him
const CUT = { uCamPos: { value: new THREE.Vector3() }, uTarget: { value: new THREE.Vector3() }, uCut: { value: 0 } };
export function seeThrough(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCamPos = CUT.uCamPos; sh.uniforms.uTarget = CUT.uTarget; sh.uniforms.uCut = CUT.uCut;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTownWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vec4 townW = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n  townW = instanceMatrix * townW;\n  #endif\n  vTownWorld = (modelMatrix * townW).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCamPos;\nuniform vec3 uTarget;\nuniform float uCut;\nvarying vec3 vTownWorld;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uCut > 0.5) {
    vec3 seg = uTarget - uCamPos;
    float tt = clamp(dot(vTownWorld - uCamPos, seg) / max(dot(seg, seg), 1e-4), 0.0, 1.0);
    float dd = length(vTownWorld - (uCamPos + seg * tt));
    if (tt < 0.97 && dd < 1.9 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
  }`);
  };
  m.customProgramCacheKey = () => 'town-see-through';
  return m;
}

function roofGeo() {
  // unit gable prism: ridge along x at y = 1, eaves at z = ±.5
  const A = [-.5, 0, -.5], B = [.5, 0, -.5], C = [.5, 0, .5], D = [-.5, 0, .5], E = [-.5, 1, 0], F = [.5, 1, 0];
  const tris = [[D, C, F], [D, F, E], [B, A, E], [B, E, F], [A, D, E], [C, B, F], [A, B, C], [A, C, D]];
  const pos = [], cen = [0, .33, 0];
  for (const [p, q, r] of tris) {
    const u = q.map((v, i) => v - p[i]), w = r.map((v, i) => v - p[i]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const mid = [0, 1, 2].map(i => (p[i] + q[i] + r[i]) / 3 - cen[i]);
    pos.push(...(n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] >= 0 ? [...p, ...q, ...r] : [...p, ...r, ...q]));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
function inst(geo, m, n, cast = true) { const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = cast; im.receiveShadow = true; im.count = 0; im.frustumCulled = false; scene.add(im); return im; }
const _tq = new THREE.Quaternion(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3(), _tm = new THREE.Matrix4(), _tc = new THREE.Color(), _te = new THREE.Euler();
function addInst(im, x, y, z, yaw, sx, sy, sz, color, rx = 0) {
  _te.set(rx, yaw, 0, 'YXZ'); _tq.setFromEuler(_te); _tm.compose(_tp.set(x, y, z), _tq, _ts.set(sx, sy, sz));
  const i = im.count++; im.setMatrixAt(i, _tm); im.setColorAt(i, _tc.set(color));
}

// where things may go: not on a plaza, park, street, the pond or the food court, and not on another house
function townFree(x, z, rad, lim = TOWN_R - .5) {
  if (Math.hypot(x, z) > lim) return false;
  for (const is of ISLANDS) if (Math.hypot(x - is.x, z - is.z) < is.r + rad + .9) return false;
  for (const b of BRIDGES) if (segInfo(x, z, b).d < 1.5 + rad) return false;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + rad + .9) return false;
  if (Math.hypot(x - FOOD_COURT.x, z - FOOD_COURT.z) < FOOD_COURT.r + rad) return false;
  for (const h of HOUSES) if (Math.hypot(x - h.x, z - h.z) < h.rad + rad + .45) return false;
  return true;
}
// small things on the lawn (grass, flowers) may grow in the food court, just not inside a stall
function lawnFree(x, z, rad) {
  if (Math.hypot(x, z) > TOWN_R - .5) return false;
  for (const is of ISLANDS) if (Math.hypot(x - is.x, z - is.z) < is.r + rad + .9) return false;
  for (const b of BRIDGES) if (segInfo(x, z, b).d < 1.5 + rad) return false;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + rad + .3) return false;
  for (const h of HOUSES) if (Math.hypot(x - h.x, z - h.z) < h.rad + rad + .45) return false;
  if (Math.hypot(x - FOOD_COURT.x, z - FOOD_COURT.z) < FOOD_COURT.r) {
    for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + rad) return false;
    for (const b of boxes) if (boxPush(x, z, rad, b)) return false;
  }
  return true;
}

const WALLS = ['#f8dccd', '#fbe6b8', '#d9eed9', '#d8e6f6', '#f5cdcd', '#fff1de', '#e9dbf4', '#f3e2c7'];
const ROOFS = ['#e07a5f', '#c8553d', '#3f4d73', '#6d8fbf', '#8a5a44', '#d98c5f', '#5b8c6a', '#b55d6f'];
const DOORS = ['#3f4d73', '#e07a5f', '#5b8c6a', '#8a5a44', '#2a3656', '#b55d6f'];
const BLOOMS = ['#f27b78', '#ffd166', '#c9b6ff', '#f6a68f', '#ffffff'];
const AWNS = ['#ec6a4e', '#3b82f6', '#2fb67c', '#ffd166', '#b55d6f'];
const LEAVES = ['#7cc463', '#9bd57a', '#6ab258', '#f7a7a3', '#8fcf6e'];
// maple reds and golds, and spruce greens, for the Canadian woods
const MAPLE_LEAVES = ['#d9472b', '#e8632f', '#ef7d2d', '#f2b23a', '#c8382a'];
const SPRUCE = ['#3f8a5a', '#4f9c68', '#357a4e'];

function tryHouse(x, z, yaw, w, d, h, pathLen, shop) {
  const rad = Math.hypot(w, d) / 2;
  if (!townFree(x, z, rad)) return false;
  HOUSES.push({ x, z, yaw, w, d, h, rad, pathLen, shop, rh: .85 + trand() * .55, wall: tpick(WALLS), roof: tpick(ROOFS), door: tpick(DOORS) });
  boxes.push({ x, z, c: Math.cos(yaw), s: Math.sin(yaw), hw: w / 2 + .05, hd: d / 2 + .16 });
  return true;
}

/* ---- the duck pond ---- */
const ducks = [];
let lure = null;
/** ducks paddle over to (x, z) on the pond's edge for a few seconds, e.g. when someone tosses crumbs */
export function lureDucks(x, z, secs = 7) { lure = { x, z, t: secs }; }

export function initTown() {
  lawnMat = M('#97cc79'); lawnBase = lawnMat.color.clone();
  const ground = mesh(new THREE.CircleGeometry(420, 72), lawnMat, false); ground.rotation.x = -Math.PI / 2; ground.position.y = GROUND_Y; scene.add(ground); walkMeshes.push(ground);

  H_MAT = {
    wall: seeThrough(M('#ffffff', { roughness: .92 })), roof: seeThrough(M('#ffffff', { roughness: .75, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0 })),
    trim: seeThrough(M('#ffffff', { roughness: .7 })), door: seeThrough(M('#ffffff', { roughness: .6 })),
    win: seeThrough(new THREE.MeshStandardMaterial({ color: '#cfe0ee', emissive: '#ffc46b', emissiveIntensity: 0, roughness: .3 })),
    leaf: seeThrough(M('#ffffff', { flatShading: true, emissive: '#ffffff', emissiveIntensity: 0 })), trunk: seeThrough(M('#a8724a')),
  };
  // the trees already standing in the squares and parks fade the same way
  for (const m of [mat.leaf, mat.leaf2, mat.blossom, mat.blossom2, mat.maple, mat.maple2, mat.maple3, mat.spruce, mat.spruce2, mat.trunk]) seeThrough(m);
  const unitBox = new THREE.BoxGeometry(1, 1, 1), rg = roofGeo();
  const trunkGeo = new THREE.CylinderGeometry(.13, .2, 1, 7), crownGeo = new THREE.IcosahedronGeometry(1, 0), coneGeo = new THREE.ConeGeometry(1, 1, 7);
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd58a', emissiveIntensity: .25 }); lampMats.push(lampHeadMat);
  const TOWN = {
    walls: inst(unitBox, H_MAT.wall, 140), gables: inst(rg, H_MAT.wall, 140), roofs: inst(rg, H_MAT.roof, 140),
    doors: inst(unitBox, H_MAT.door, 140), frames: inst(unitBox, H_MAT.trim, 1300), wins: inst(unitBox, H_MAT.win, 1300, false),
    boxes: inst(unitBox, H_MAT.trim, 400), chimneys: inst(unitBox, H_MAT.trim, 140), paths: inst(unitBox, M('#ffffff', { roughness: .95 }), 140, false),
    awnings: inst(unitBox, H_MAT.trim, 80),
    // yard trees cast shadows; the woods around town are too far out for the shadow map, so they skip it
    trunks: inst(trunkGeo, H_MAT.trunk, 60), crowns: inst(crownGeo, H_MAT.leaf, 150), cones: inst(coneGeo, H_MAT.leaf, 120),
    farTrunks: inst(trunkGeo, H_MAT.trunk, 260, false), farCrowns: inst(crownGeo, H_MAT.leaf, 420, false), farCones: inst(coneGeo, H_MAT.leaf, 560, false),
    posts: inst(new THREE.CylinderGeometry(.05, .07, 1, 8), mat.navy, 60), heads: inst(new THREE.SphereGeometry(.16, 12, 10), lampHeadMat, 60, false), caps: inst(new THREE.ConeGeometry(.22, .14, 12), mat.navy, 60),
  };

  // 1) houses lining the streets, facing the street
  for (const b of BRIDGES) {
    if (b.b === 'lookout') continue;
    const nx = -b.uz, nz = b.ux;
    for (const side of [-1, 1]) {
      let s = 1.6 + trand() * .8;
      while (s < b.len - 1.4) {
        const w = 2.4 + trand() * 1.0, d = 2.3 + trand() * .6, off = 1.3 + 1.45 + d / 2;
        const x = b.p1.x + b.ux * s + nx * side * off, z = b.p1.z + b.uz * s + nz * side * off;
        tryHouse(x, z, Math.atan2(-nx * side, -nz * side), w, d, 2.0 + trand() * .6, 1.45, b.a === 'hub' && b.b === 'workshop');
        s += w + .9 + trand() * .8;
      }
    }
  }
  // 2) a ring of houses around each square and park, facing in, each with a front path onto it
  for (const is of ISLANDS) {
    const d0 = 2.5, R = is.r + 1.6 + d0 / 2;
    let a = trand() * Math.PI * 2;
    const end = a + Math.PI * 2;
    while (a < end) {
      const w = 2.4 + trand() * 1.1, d = 2.3 + trand() * .6;
      const x = is.x + Math.cos(a) * R, z = is.z + Math.sin(a) * R;
      tryHouse(x, z, Math.atan2(is.x - x, is.z - z), w, d, 2.0 + trand() * .6, R - d / 2 - is.r, is.id === 'hub' || is.id === 'workshop');
      a += (w + 1.7 + trand() * 1.1) / R;
    }
  }
  // build every house out of instanced parts
  for (const H of HOUSES) {
    const c = Math.cos(H.yaw), s = Math.sin(H.yaw);
    const at = (lx, lz) => [H.x + lx * c + lz * s, H.z - lx * s + lz * c];
    const P3 = (im, lx, ly, lz, sx, sy, sz, col, yawOff = 0, rx = 0) => { const [x, z] = at(lx, lz); addInst(im, x, GROUND_Y + ly, z, H.yaw + yawOff, sx, sy, sz, col, rx); };
    const { w, d, h, rh } = H;
    P3(TOWN.walls, 0, h / 2, 0, w, h, d, H.wall);
    P3(TOWN.gables, 0, h, 0, w - .02, rh - .04, d - .02, H.wall);
    P3(TOWN.roofs, 0, h - .02, 0, w + .34, rh + .04, d + .42, H.roof);
    if (trand() < .7) P3(TOWN.chimneys, w * .26, h + rh * .55, -d * .16, .32, rh + .3, .32, '#b9644a');
    const narrow = w < 2.75, doorX = narrow ? -w * .2 : 0;
    P3(TOWN.doors, doorX, .5, d / 2 + .03, .56, 1.0, .06, H.door);
    P3(TOWN.frames, doorX, .53, d / 2 + .015, .7, 1.12, .04, '#fffaf4');
    const wy = Math.min(h * .52, 1.25), cols = narrow ? [w * .22] : [-w * .3, w * .3];
    for (const wx of cols) {
      P3(TOWN.frames, wx, wy, d / 2 + .015, .6, .62, .04, '#fffaf4'); P3(TOWN.wins, wx, wy, d / 2 + .035, .46, .48, .03, '#cfe0ee');
      P3(TOWN.boxes, wx, wy - .4, d / 2 + .09, .58, .14, .16, tpick(BLOOMS));
    }
    if (h > 2.9) for (const wx of narrow ? [doorX, w * .22] : [-w * .3, 0, w * .3]) { P3(TOWN.frames, wx, h - .72, d / 2 + .015, .56, .62, .04, '#fffaf4'); P3(TOWN.wins, wx, h - .72, d / 2 + .035, .42, .48, .03, '#cfe0ee'); }
    for (const sd of [-1, 1]) { P3(TOWN.frames, sd * (w / 2 + .015), wy, 0, .6, .62, .04, '#fffaf4', Math.PI / 2); P3(TOWN.wins, sd * (w / 2 + .035), wy, 0, .46, .48, .03, '#cfe0ee', Math.PI / 2); }
    if (H.shop) P3(TOWN.awnings, 0, Math.min(h * .8, 2.0), d / 2 + .34, w * .78, .06, .72, tpick(AWNS), 0, .38);
    if (H.pathLen > .2) P3(TOWN.paths, doorX, .015, d / 2 + H.pathLen / 2, .74, .04, H.pathLen + .05, '#e3d5c1');
  }
  // street lamps, alternating sides
  for (const b of BRIDGES) {
    if (b.b === 'lookout') continue;
    const nx = -b.uz, nz = b.ux;
    for (let s = 2.4, k = 0; s < b.len - 1.6; s += 4.6, k++) {
      const side = k % 2 ? 1 : -1, x = b.p1.x + b.ux * s + nx * side * 1.62, z = b.p1.z + b.uz * s + nz * side * 1.62;
      addInst(TOWN.posts, x, GROUND_Y + 1.0, z, 0, 1, 2.0, 1, '#ffffff'); addInst(TOWN.heads, x, GROUND_Y + 2.08, z, 0, 1, 1, 1, '#ffffff'); addInst(TOWN.caps, x, GROUND_Y + 2.25, z, 0, 1, 1, 1, '#ffffff'); colliders.push({ x, z, r: .12 });
    }
  }
  // the duck pond south of the square, with Grandpa Wen's bench facing the water
  {
    const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 56), new THREE.MeshStandardMaterial({ color: '#8fd0ee', roughness: .12, metalness: .1, emissive: '#3b82f6', emissiveIntensity: .05 }));
    water.rotation.x = -Math.PI / 2; water.position.set(POND.x, GROUND_Y + .025, POND.z); water.receiveShadow = true; scene.add(water);
    const rim = put(scene, new THREE.TorusGeometry(POND.r, .16, 8, 64), mat.curb, POND.x, GROUND_Y + .02, POND.z, false); rim.rotation.x = Math.PI / 2;
    for (const [a, r, s] of [[.6, 2.3, .34], [2.2, 2.6, .28], [3.9, 1.9, .3], [5.1, 2.7, .26]]) { const pad = new THREE.Mesh(new THREE.CircleGeometry(s, 16, .3, Math.PI * 1.8), M('#6fb85a')); pad.rotation.x = -Math.PI / 2; pad.position.set(POND.x + Math.cos(a) * r, GROUND_Y + .032, POND.z + Math.sin(a) * r); scene.add(pad); }
    for (let i = 0; i < 9; i++) { const a = 1.2 + i * .19, r = POND.r + .1; const reed = put(scene, new THREE.ConeGeometry(.05, .7 + (i % 3) * .2, 5), mat.grassDark, POND.x + Math.cos(a) * r, GROUND_Y + .35, POND.z + Math.sin(a) * r); reed.rotation.z = (i % 2 - .5) * .2; }
    const duckM = M('#fffaf0', { roughness: .6 }), beakM = M('#f59e3b'), eyeM = M('#1b1b1f');
    for (const [r, ph, dir, sc] of [[1.7, 0, 1, 1], [1.7, .9, 1, .62], [2.5, 3, -1, 1]]) {
      const g = new THREE.Group(); g.scale.setScalar(sc); scene.add(g);
      const body = put(g, new THREE.SphereGeometry(.17, 14, 10), duckM, 0, .07, 0); body.scale.set(1, .7, 1.35);
      put(g, new THREE.SphereGeometry(.1, 12, 10), duckM, 0, .22, .16);
      const beak = put(g, new THREE.ConeGeometry(.04, .1, 8), beakM, 0, .2, .27); beak.rotation.x = Math.PI / 2;
      for (const sd of [-1, 1]) put(g, new THREE.SphereGeometry(.014, 6, 6), eyeM, sd * .06, .25, .22, false);
      const tail = put(g, new THREE.ConeGeometry(.06, .14, 6), duckM, 0, .14, -.22); tail.rotation.x = -2.2;
      const x = POND.x + Math.cos(ph) * r, z = POND.z + Math.sin(ph) * r, yaw = Math.atan2(-Math.sin(ph) * dir, Math.cos(ph) * dir);
      ducks.push({ g, r, ph, dir, x, z, yaw, yawT: yaw });
    }
    bench(POND.x - 1.2, POND.z - POND.r - 1.0, 0);
  }
  // trees in the yards between houses, the woods around town and hills on the horizon
  // kind: 'leaf', 'maple' (red and gold) or 'spruce' (stacked cones); far trees skip the shadow map
  function townTree(x, z, s, kind = 'leaf', solid = false, far = false) {
    if (far && inClearing(x, z)) return;
    if (solid) colliders.push({ x, z, r: .32 * s });
    const [trunks, crowns, cones] = far ? [TOWN.farTrunks, TOWN.farCrowns, TOWN.farCones] : [TOWN.trunks, TOWN.crowns, TOWN.cones];
    if (kind === 'spruce') {
      addInst(trunks, x, GROUND_Y + .4 * s, z, 0, .8 * s, .8 * s, .8 * s, '#8d5f3e');
      const col = tpick(SPRUCE);
      addInst(cones, x, GROUND_Y + 1.15 * s, z, trand() * 6, .78 * s, 1.15 * s, .78 * s, col);
      addInst(cones, x, GROUND_Y + 1.78 * s, z, trand() * 6, .6 * s, 1.0 * s, .6 * s, col);
      addInst(cones, x, GROUND_Y + 2.35 * s, z, trand() * 6, .38 * s, .8 * s, .38 * s, col);
      return;
    }
    addInst(trunks, x, GROUND_Y + .55 * s, z, 0, s, 1.1 * s, s, '#a8724a');
    const maple = kind === 'maple', col = tpick(maple ? MAPLE_LEAVES : LEAVES), col2 = maple ? tpick(MAPLE_LEAVES) : col;
    addInst(crowns, x, GROUND_Y + 1.55 * s, z, trand() * 6, .85 * s, .95 * s, .85 * s, col);
    addInst(crowns, x + .3 * s, GROUND_Y + 2.05 * s, z + .1 * s, trand() * 6, .58 * s, .62 * s, .58 * s, col2);
    if (maple) addInst(crowns, x - .32 * s, GROUND_Y + 1.95 * s, z - .12 * s, trand() * 6, .5 * s, .52 * s, .5 * s, col);
  }
  const pickKind = (maple, spruce) => { const r = trand(); return r < maple ? 'maple' : r < maple + spruce ? 'spruce' : 'leaf'; };
  for (let k = 0, placed = 0; k < 900 && placed < 34; k++) {
    const a = trand() * Math.PI * 2, r = 9 + trand() * 31, x = Math.cos(a) * r, z = Math.sin(a) * r - 3, s = .8 + trand() * .55;
    if (townFree(x, z, .9 * s)) {
      const kind = pickKind(.45, .25); townTree(x, z, s, kind, true);
      if (kind === 'maple' && Math.hypot(x, z) < 30) MAPLES.push({ x, z, h: 1.9 * s, r: .8 * s });
      HOUSES.push({ x, z, rad: .9 * s, tree: true }); placed++;
    }
  }
  // the edge of town and the woods beyond: fewer trees than before, mostly spruce with maples between
  for (let a = 0; a < Math.PI * 2; a += 3.3 / (TOWN_R + 1.2)) { const r = TOWN_R + .9 + trand() * 1.4; townTree(Math.cos(a) * r, Math.sin(a) * r, 1.1 + trand() * .7, pickKind(.35, .5), false, true); }
  for (let i = 0; i < 120; i++) { const a = trand() * Math.PI * 2, r = TOWN_R + 4 + trand() * 36; townTree(Math.cos(a) * r, Math.sin(a) * r, 1.3 + trand() * 1.1, pickKind(.3, .55), false, true); }
  {
    const hillM = M('#9fcf83', { flatShading: true }), hillM2 = M('#b3d98f', { flatShading: true });
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + trand() * .2, r = 125 + trand() * 50, s = 20 + trand() * 16;
      const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), i % 2 ? hillM : hillM2); hill.scale.set(s * 1.5, s * (.32 + trand() * .18), s * 1.2);
      hill.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); hill.rotation.y = trand() * 3; scene.add(hill);
    }
  }
  // tufts and flowers on the lawns
  {
    const G = geos();
    const lt = new THREE.InstancedMesh(G.tuft, mat.grassDark, 900), lf = new THREE.InstancedMesh(G.flower, new THREE.MeshStandardMaterial({ roughness: .6 }), 360);
    let nt = 0, nf = 0;
    for (let k = 0; k < 6000 && (nt < 900 || nf < 360); k++) {
      const a = trand() * Math.PI * 2, r = 4 + Math.sqrt(trand()) * 38, x = Math.cos(a) * r, z = Math.sin(a) * r - 3;
      if (!lawnFree(x, z, .25)) continue;
      if (nt < 900) { dummy.position.set(x, GROUND_Y + .14, z); dummy.rotation.set((trand() - .5) * .4, trand() * 3, (trand() - .5) * .4); dummy.scale.setScalar(.7 + trand() * .8); dummy.updateMatrix(); lt.setMatrixAt(nt++, dummy.matrix); }
      if (nf < 360 && trand() < .35) { dummy.position.set(x + .2, GROUND_Y + .2, z + .1); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.8 + trand() * .6); dummy.updateMatrix(); lf.setMatrixAt(nf, dummy.matrix); lf.setColorAt(nf++, FLOWER_COLS[Math.floor(trand() * FLOWER_COLS.length)]); }
    }
    lt.count = nt; lf.count = nf; lt.receiveShadow = lf.receiveShadow = true; lt.frustumCulled = lf.frustumCulled = false; scene.add(lt, lf);
  }
  for (const im of Object.values(TOWN)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
}

export function updateTown(dt, t) {
  CUT.uCut.value = S.started && !S.photo ? 1 : 0;
  CUT.uCamPos.value.copy(camera.position); CUT.uTarget.value.set(P.x, P.y + 1.0, P.z);
  if (lure) { lure.t -= dt; if (lure.t <= 0) lure = null; }
  ducks.forEach((dk, i) => {
    let tx, tz;
    if (lure) {
      const a = Math.atan2(lure.z - POND.z, lure.x - POND.x) + (i - 1) * .34, r = POND.r - .75 - (i % 2) * .4;
      tx = POND.x + Math.cos(a) * r; tz = POND.z + Math.sin(a) * r;
    } else { const a = t * .22 * dk.dir + dk.ph; tx = POND.x + Math.cos(a) * dk.r; tz = POND.z + Math.sin(a) * dk.r; }
    const dx = tx - dk.x, dz = tz - dk.z, d = Math.hypot(dx, dz), sp = lure ? 1.2 : .8;
    if (d > .01) { const st = Math.min(d, sp * dt); dk.x += dx / d * st; dk.z += dz / d * st; }
    if (d > .06) dk.yawT = Math.atan2(dx, dz); else if (lure) dk.yawT = Math.atan2(lure.x - dk.x, lure.z - dk.z);
    dk.yaw += angDiff(dk.yawT, dk.yaw) * (1 - Math.exp(-dt * 6));
    const peck = lure && d < .12 ? Math.max(0, Math.sin(t * 8 + i * 2)) * .05 : 0;
    dk.g.position.set(dk.x, GROUND_Y + .02 + Math.sin(t * 2.2 + i) * .012, dk.z);
    dk.g.rotation.set(peck * 4, dk.yaw, 0, 'YXZ');
  });
  const snowK = WXS.snow;
  H_MAT.roof.emissiveIntensity = snowK * .35; H_MAT.leaf.emissiveIntensity = snowK * .25;
  lawnMat.color.copy(lawnBase).lerp(_snowWhite, snowK * .6);
}
