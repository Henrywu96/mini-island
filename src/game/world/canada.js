// A few Canadian touches: a Maple Leaf flag in the town square, an inukshuk at the lookout and a red
// canoe resting in the Bridgly garden. Each one looks for a free spot, so it never blocks a path.
import { THREE, scene, canvasTex, M, mat, put, colliders } from '../gfx.js';
import { ISL, spotIsFree } from '../nav.js';
import { reduceMotion } from '../util.js';
import { WXS } from '../sky/weather.js';
import { seeThrough } from './town.js';

const deg = d => d * Math.PI / 180;
/** first free spot in a square or park: angles every 15 degrees, closest to `prefer` first, at each distance */
function findSpot(is, prefer, radii, margin = .8, clear = 1.7, pad = .5) {
  const off = a => Math.abs(((a - prefer + 540) % 360) - 180);
  const angles = Array.from({ length: 24 }, (_, i) => i * 15).sort((a, b) => off(a) - off(b));
  for (const r of radii) for (const a of angles) {
    const x = is.x + Math.cos(deg(a)) * r, z = is.z + Math.sin(deg(a)) * r;
    if (spotIsFree(is, x, z, margin, clear, pad)) return { x, z, a: deg(a), is: is.id };
  }
  return null;
}
/** try several squares or parks in order */
function firstSpot(tries) {
  for (const [id, prefer, radii, margin, clear, pad] of tries) { const sp = findSpot(ISL[id], prefer, radii, margin, clear, pad); if (sp) return sp; }
  return null;
}
/** where each touch ended up (handy when checking the layout) */
export const CANADA = {};

/** the outline of a maple leaf, 21 points in a 64 x 64 box */
const LEAF = [[32, 4], [37, 15], [44, 11], [42, 25], [56, 19], [52, 30], [60, 33], [47, 41], [49, 47], [35, 45], [34, 58], [30, 58], [29, 45], [15, 47], [17, 41], [4, 33], [12, 30], [8, 19], [22, 25], [20, 11], [27, 15]];

let flag = null, flagBase = null;
function mapleFlag(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, new THREE.CylinderGeometry(.11, .14, .16, 12), mat.stone, 0, .08, 0);
  // the pole and flag fade out like the houses whenever they stand between the camera and Henry
  put(g, new THREE.CylinderGeometry(.035, .045, 4.2, 10), seeThrough(M('#cfd6df', { metalness: .3, roughness: .4 })), 0, 2.2, 0);
  put(g, new THREE.SphereGeometry(.07, 10, 8), mat.sun, 0, 4.34, 0, false);
  // the flag itself: red, white, red, with an 11-point maple leaf in the middle
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d52b1e'; c.fillRect(0, 0, w / 4, h); c.fillRect(w * 3 / 4, 0, w / 4, h);
    const s = h * .82 / 64, ox = w / 2 - 32 * s, oy = h / 2 - 31 * s;
    c.beginPath(); LEAF.forEach(([px, py], i) => (i ? c.lineTo(ox + px * s, oy + py * s) : c.moveTo(ox + px * s, oy + py * s))); c.closePath(); c.fill();
  });
  const geo = new THREE.PlaneGeometry(1.5, .75, 16, 4); geo.translate(.75, 0, 0);
  flag = new THREE.Mesh(geo, seeThrough(new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .85 })));
  flag.position.set(.04, 3.85, 0); flag.castShadow = true; g.add(flag);
  flagBase = Float32Array.from(geo.attributes.position.array);
  colliders.push({ x, z, r: .18 });
  return g;
}

function inukshuk(x, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
  const stone = M('#a9a49a', { flatShading: true }), stone2 = M('#bdb7ab', { flatShading: true });
  const slab = (w, h, d, m, px, py, pz, rz = 0) => { const o = put(g, new THREE.BoxGeometry(w, h, d), m, px, py, pz); o.rotation.z = rz; return o; };
  slab(.22, .5, .26, stone, -.2, .25, 0); slab(.22, .5, .26, stone2, .2, .25, 0, .04);       // legs
  slab(.72, .16, .32, stone2, 0, .58, 0);                                                    // hips
  slab(.34, .34, .28, stone, 0, .83, 0, -.03);                                               // body
  slab(1.08, .14, .3, stone2, 0, 1.07, 0, .02);                                              // arms
  slab(.26, .24, .24, stone, 0, 1.26, 0, .05);                                               // head
  colliders.push({ x, z, r: .55 });
}

function canoe(x, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
  const red = M('#c8382a', { roughness: .55, side: THREE.DoubleSide }), wood = mat.wood;
  // the hull: the bottom half of a sphere, stretched long and shallow
  const hull = put(g, new THREE.SphereGeometry(1, 22, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), red, 0, .26, 0);
  hull.scale.set(.95, .26, .23);
  const rim = put(g, new THREE.TorusGeometry(1, .018, 4, 40), wood, 0, .26, 0, false); rim.rotation.x = Math.PI / 2; rim.scale.set(.95, .23, 1);
  for (const sx of [-.42, 0, .42]) put(g, new THREE.BoxGeometry(.04, .03, .44 - Math.abs(sx) * .25), wood, sx, .24, 0, false);
  // a paddle resting across it
  const paddle = new THREE.Group(); paddle.position.set(.05, .29, .02); paddle.rotation.y = .5; g.add(paddle);
  put(paddle, new THREE.CylinderGeometry(.018, .018, 1.05, 6), wood, 0, 0, 0, false).rotation.z = Math.PI / 2;
  put(paddle, new THREE.BoxGeometry(.3, .014, .14), wood, .62, 0, 0, false);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const d of [-.55, 0, .55]) colliders.push({ x: x + c * d, z: z - s * d, r: .32 });
}

export function initCanada() {
  // the flag: the town square first, then the LRT park (Edmonton's own), then the lookout
  const fl = firstSpot([['hub', 120, [7.0, 6.4, 5.8, 5.2], .9, 1.9, .5], ['transit', 90, [5.0], .7, 1.8, .5], ['lookout', 200, [1.2, .8], .5, 1.3, .4]]);
  if (fl) { mapleFlag(fl.x, fl.z); CANADA.flag = fl; }
  // the inukshuk looks out from the lookout, or from the Skill Tree park
  const lk = firstSpot([['lookout', 200, [1.4, 1.0, .6], .5, 1.3, .4], ['grove', 135, [4.0, 3.4, 2.8], 1.0, 1.8, .7], ['bridgly', 210, [4.0, 3.2], 1.0, 1.8, .7]]);
  if (lk) { const is = ISL[lk.is]; inukshuk(lk.x, lk.z, Math.atan2(lk.x - is.x, lk.z - is.z)); CANADA.inukshuk = lk; }
  const br = firstSpot([['bridgly', 300, [4.2, 3.6, 3.0], 1.4, 2.0, .9]]);
  if (br) { canoe(br.x, br.z, br.a + Math.PI / 2); CANADA.canoe = br; }
}

export function updateCanada(dt, t) {
  if (!flag || reduceMotion) return;
  const pos = flag.geometry.attributes.position, a = pos.array, k = 1 + WXS.wind * 2;
  for (let i = 0; i < a.length; i += 3) {
    const u = flagBase[i] / 1.5; // 0 at the pole, 1 at the free end
    a[i + 2] = Math.sin(flagBase[i] * 4.2 - t * 5 * k + flagBase[i + 1] * 1.5) * .09 * u * k;
    a[i + 1] = flagBase[i + 1] - u * u * .04;
  }
  pos.needsUpdate = true; flag.geometry.computeVertexNormals();
}
