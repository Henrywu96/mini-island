// Squares, parks and the streets between them; where you can walk and how Henry finds a route.
import { THREE, scene, canvasTex, M, mat, put, walkMeshes, colliders, boxes } from './gfx.js';
import { ISLANDS, ISL, LINKS, DISTRICT, POND, STATIONS } from '../data/world.js';
import { TOOLS } from '../data/content.js';
import { NPCS } from '../data/npcs.js';
import { clamp, srand, rrPath } from './util.js';

export { ISLANDS, ISL, POND };
export const TOWN_R = 40.5, LAWN_Y = -.06;
/** @type {any[]} */
export const BRIDGES = [];

// Places decoration must stay clear of: quest stops, tool coins, props and the townsfolk's spots.
export const keepouts = STATIONS.map(s => ({ x: s.x, z: s.z, r: 2.1 }))
  .concat(TOOLS.map(t => ({ x: t.at[0], z: t.at[1], r: 1.1 })))
  .concat([[0, -26.3], [-2.2, -6.6], [5.6, .9], [-5.6, .9], [20.2, 16.9], [-2.8, 3.2]].map(([x, z]) => ({ x, z, r: 2 })))
  .concat(NPCS.filter(n => n.at).map(n => ({ x: n.at[0], z: n.at[1], r: 1.6 })));

let cobbleImg = null;
function cobble(rx, ry) { const t = cobbleImg.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t; }

export function initNav() {
  for (const s of STATIONS) if (s.col) colliders.push({ x: s.x, z: s.z, r: s.col });
  cobbleImg = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#bba891'; c.fillRect(0, 0, w, h);
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let x = (r % 2) * -16 - 16; x < w + 16; x += 32) {
      const v = Math.random(); c.fillStyle = `hsl(${26 + v * 12}, ${18 + v * 12}%, ${71 + Math.random() * 9}%)`;
      rrPath(c, x + 2.5, r * rh + 2.5, 27, rh - 5, 8); c.fill();
    }
  });
  // each square is a cobblestone plaza or a grass park at street level
  ISLANDS.forEach(is => {
    const g = new THREE.Group(); g.position.set(is.x, 0, is.z); scene.add(g);
    const plaza = DISTRICT[is.id] === 'plaza';
    const top = put(g, new THREE.CylinderGeometry(is.r, is.r, .12, 72), plaza ? new THREE.MeshStandardMaterial({ map: cobble(is.r / 2.2, is.r / 2.2), roughness: .95 }) : mat.grass, 0, -.06, 0, false);
    walkMeshes.push(top);
    const lip = put(g, new THREE.TorusGeometry(is.r, plaza ? .1 : .07, 6, 80), plaza ? mat.curb : mat.grassDark, 0, -.02, 0, false); lip.rotation.x = Math.PI / 2;
    if (is.id === 'hub') for (const [r1, r2] of [[3.0, 3.3], [6.4, 6.6]]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 80), mat.inlay); ring.rotation.x = -Math.PI / 2; ring.position.y = .004; ring.receiveShadow = true; g.add(ring); }
  });
  // streets
  LINKS.forEach(([a, b]) => {
    const A = ISL[a], B = ISL[b];
    const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    const p1 = { x: A.x + ux * (A.r - .7), z: A.z + uz * (A.r - .7) }, p2 = { x: B.x - ux * (B.r - .7), z: B.z - uz * (B.r - .7) };
    const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const ia = Math.max(.5, A.r - 1.8), ib = Math.max(.5, B.r - 1.8);
    BRIDGES.push({ a, b, p1, p2, ux, uz, len, in1: { x: A.x + ux * ia, z: A.z + uz * ia }, in2: { x: B.x - ux * ib, z: B.z - uz * ib } });
    const g = new THREE.Group(); g.position.set(p1.x, 0, p1.z); g.rotation.y = Math.atan2(ux, uz); scene.add(g);
    const wid = b === 'lookout' ? 1.9 : 2.4;
    put(g, new THREE.BoxGeometry(wid, .1, len), new THREE.MeshStandardMaterial({ map: cobble(wid / 4, len / 4), roughness: .95 }), 0, -.045, len / 2, false);
    for (const side of [-1, 1]) put(g, new THREE.BoxGeometry(.16, .1, Math.max(.1, len - 1.3)), mat.curb, side * (wid / 2 + .07), -.025, len / 2, false);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, .1, len), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, -.1, len / 2); g.add(hit); walkMeshes.push(hit);
  });
}

// push a circle (x, z, r) out of an oriented box; returns the new centre, or null when they don't touch
export function boxPush(x, z, r, b) {
  const dx = x - b.x, dz = z - b.z;
  let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
  const qx = clamp(lx, -b.hw, b.hw), qz = clamp(lz, -b.hd, b.hd), ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
  if (d >= r) return null;
  if (d > 1e-6) { lx = qx + ex / d * r; lz = qz + ez / d * r; }
  else if (b.hw - Math.abs(lx) < b.hd - Math.abs(lz)) lx = Math.sign(lx || 1) * (b.hw + r);
  else lz = Math.sign(lz || 1) * (b.hd + r);
  return [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];
}
export function segInfo(x, z, b) {
  const vx = b.p2.x - b.p1.x, vz = b.p2.z - b.p1.z, L2 = vx * vx + vz * vz;
  const t = ((x - b.p1.x) * vx + (z - b.p1.z) * vz) / L2, tc = clamp(t, 0, 1);
  return { t, d: Math.hypot(x - (b.p1.x + vx * tc), z - (b.p1.z + vz * tc)) };
}
export function inIsland(x, z, pad = .45) { for (const is of ISLANDS) if ((x - is.x) ** 2 + (z - is.z) ** 2 < (is.r - pad) ** 2) return is; return null; }
export function walkable(x, z) { return Math.hypot(x, z) < TOWN_R && Math.hypot(x - POND.x, z - POND.z) > POND.r + .25; }
export function groundY(x, z) {
  if (inIsland(x, z, 0)) return 0;
  for (const b of BRIDGES) { const s = segInfo(x, z, b); if (s.t >= 0 && s.t <= 1 && s.d <= 1.25) return 0; }
  return LAWN_Y;
}
export function islandOf(p) {
  const is = inIsland(p.x, p.z, 0); if (is) return is.id;
  let best = null, bd = 1e9;
  for (const b of BRIDGES) { const s = segInfo(p.x, p.z, b); if (s.d < bd) { bd = s.d; best = s.t < .5 ? b.a : b.b; } }
  return best || 'hub';
}
export function bridgeBetween(a, b) {
  for (const br of BRIDGES) { if (br.a === a && br.b === b) return { br, fwd: true }; if (br.a === b && br.b === a) return { br, fwd: false }; }
  return null;
}

/* ---- grid path finding around everything solid ---- */
const NAV_X0 = -42, NAV_Z0 = -45, NAV_CS = .5, NAV_W = 168, NAV_H = 176;
let NAV = null;
const navIdx = (x, z) => clamp(Math.floor((z - NAV_Z0) / NAV_CS), 0, NAV_H - 1) * NAV_W + clamp(Math.floor((x - NAV_X0) / NAV_CS), 0, NAV_W - 1);
const navX = k => NAV_X0 + (k % NAV_W + .5) * NAV_CS, navZ = k => NAV_Z0 + (Math.floor(k / NAV_W) + .5) * NAV_CS;
function navGrid() {
  if (NAV) { while (NAV.nc < colliders.length) NAV.mark(colliders[NAV.nc++]); return NAV; } // obstacles added later join the grid
  const block = new Uint8Array(NAV_W * NAV_H), infl = .36;
  for (let k = 0; k < block.length; k++) { const x = navX(k), z = navZ(k); if (Math.hypot(x, z) > TOWN_R - infl || Math.hypot(x - POND.x, z - POND.z) < POND.r + .25 + infl) block[k] = 1; }
  const area = (x, z, R, test) => {
    const i0 = Math.max(0, Math.floor((x - R - NAV_X0) / NAV_CS)), i1 = Math.min(NAV_W - 1, Math.floor((x + R - NAV_X0) / NAV_CS));
    const j0 = Math.max(0, Math.floor((z - R - NAV_Z0) / NAV_CS)), j1 = Math.min(NAV_H - 1, Math.floor((z + R - NAV_Z0) / NAV_CS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * NAV_W + i; if (!block[k] && test(navX(k), navZ(k))) block[k] = 1; }
  };
  const mark = c => area(c.x, c.z, c.r + infl, (x, z) => Math.hypot(x - c.x, z - c.z) < c.r + infl);
  colliders.forEach(mark);
  for (const b of boxes) area(b.x, b.z, Math.hypot(b.hw, b.hd) + infl, (x, z) => !!boxPush(x, z, infl, b));
  NAV = { block, mark, nc: colliders.length };
  return NAV;
}
function navNearestFree(k0) {
  const { block } = NAV; if (!block[k0]) return k0;
  const seen = new Uint8Array(block.length), q = [k0]; seen[k0] = 1;
  for (let h = 0; h < q.length && h < 40000; h++) {
    const k = q[h]; if (!block[k]) return k;
    const i = k % NAV_W, j = (k - i) / NAV_W;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NAV_W || nj >= NAV_H) continue; const nk = nj * NAV_W + ni; if (!seen[nk]) { seen[nk] = 1; q.push(nk); } }
  }
  return -1;
}
function navSearch(s, t) {
  const { block } = NAV, N = block.length, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const ti = t % NAV_W, tj = (t - ti) / NAV_W;
  const hh = k => { const i = k % NAV_W, j = (k - i) / NAV_W, dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + .4142 * Math.min(dx, dz); };
  const hk = [], hf = [];
  const push = (k, f) => { let n = hk.length; hk.push(k); hf.push(f); while (n > 0) { const p = (n - 1) >> 1; if (hf[p] <= hf[n]) break; [hk[p], hk[n]] = [hk[n], hk[p]]; [hf[p], hf[n]] = [hf[n], hf[p]]; n = p; } };
  const pop = () => { const top = hk[0], lk = hk.pop(), lf = hf.pop(); if (hk.length) { hk[0] = lk; hf[0] = lf; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < hk.length && hf[l] < hf[m]) m = l; if (r < hk.length && hf[r] < hf[m]) m = r; if (m === n) break; [hk[m], hk[n]] = [hk[n], hk[m]]; [hf[m], hf[n]] = [hf[n], hf[m]]; n = m; } } return top; };
  g[s] = 0; push(s, hh(s));
  let best = s, bestH = hh(s);
  while (hk.length) {
    const k = pop(); if (k === t) break; if (closed[k]) continue; closed[k] = 1;
    const hk0 = hh(k); if (hk0 < bestH) { bestH = hk0; best = k; }
    const i = k % NAV_W, j = (k - i) / NAV_W;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NAV_W || nj >= NAV_H) continue;
      const nk = nj * NAV_W + ni; if (block[nk] || closed[nk]) continue;
      if (di && dj && (block[j * NAV_W + ni] || block[nj * NAV_W + i])) continue;
      const ng = g[k] + (di && dj ? 1.4142 : 1);
      if (ng < g[nk]) { g[nk] = ng; came[nk] = k; push(nk, ng + hh(nk)); }
    }
  }
  // an enclosed spot: go to the closest place that can be reached instead
  const end = s === t || came[t] >= 0 ? t : best;
  /** @type {any} */
  const cells = []; for (let k = end; k >= 0 && k !== s; k = came[k]) cells.push(k);
  cells.reached = end === t;
  return cells.reverse();
}
function navLOS(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (NAV_CS * .45));
  for (let i = 1; i <= n; i++) { const u = i / n; if (NAV.block[navIdx(ax + (bx - ax) * u, az + (bz - az) * u)]) return false; }
  return true;
}
export function buildPath(from, to) {
  navGrid();
  let s = navIdx(from.x, from.z), t = navIdx(to.x, to.z);
  const exact = !NAV.block[t] && walkable(to.x, to.z);
  s = navNearestFree(s); t = navNearestFree(t);
  if (s < 0 || t < 0) return [{ x: to.x, z: to.z }];
  const cells = navSearch(s, t);
  const pts = cells.map(k => ({ x: navX(k), z: navZ(k) }));
  if (!cells.reached) { if (!pts.length) return []; }
  else if (exact) { if (pts.length) pts[pts.length - 1] = { x: to.x, z: to.z }; else pts.push({ x: to.x, z: to.z }); }
  else if (!pts.length) pts.push({ x: navX(t), z: navZ(t) });
  const out = []; let ax = from.x, az = from.z, i = -1;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !navLOS(ax, az, pts[j].x, pts[j].z)) j--;
    out.push(pts[j]); ax = pts[j].x; az = pts[j].z; i = j;
  }
  return out;
}

/* ---- free spots for decoration inside a square or park ---- */
function bridgeAxesOf(id) {
  return BRIDGES.filter(b => b.a === id || b.b === id).map(b => b.a === id ? { ux: b.ux, uz: b.uz } : { ux: -b.ux, uz: -b.uz });
}
export function freeSpot(is, margin = .8, clear = 1.6) {
  for (let k = 0; k < 40; k++) {
    const a = srand() * Math.PI * 2, d = Math.sqrt(srand()) * (is.r - margin);
    const x = is.x + Math.cos(a) * d, z = is.z + Math.sin(a) * d, px = x - is.x, pz = z - is.z;
    let ok = true;
    for (const ax of bridgeAxesOf(is.id)) { const along = px * ax.ux + pz * ax.uz, perp = Math.abs(px * ax.uz - pz * ax.ux); if (along > -1 && perp < clear) { ok = false; break; } }
    if (ok && is.id === 'hub' && Math.hypot(x, z - 4.2) < 2) ok = false;
    if (ok && is.id === 'transit' && d < 4.75) ok = false;
    if (ok && is.id === 'yard' && px > -3.1 && px < 5 && pz > -3.7 && pz < 4.2) ok = false;
    if (ok && is.id === 'studio' && Math.hypot(px, pz - .2) < 4.3) ok = false;
    if (ok) for (const k2 of keepouts) if (Math.hypot(x - k2.x, z - k2.z) < k2.r) { ok = false; break; }
    if (ok) for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + .6) { ok = false; break; }
    if (ok) return { x, z };
  }
  return null;
}
