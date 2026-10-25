// Connections on the map: every thread (a way of working or a kind of build shared by several stops) is drawn
// as glowing dashed arcs between its stops. In the map view all threads show softly; opening a stop brings
// out the threads it belongs to, and picking a thread in the legend (or a story chapter) shows just that one.
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { THREE, scene, renderer } from '../gfx.js';
import { SBY } from '../../data/world.js';
import { THREADS } from '../../data/content.js';
import { S } from '../state.js';
import { reduceMotion } from '../util.js';

/** the thread picked in the legend or by the story (null shows them all) */
export const THR = { focus: /** @type {string|null} */ (null) };
const arcs = [], mats = [], _res = new THREE.Vector2();

/** visit a thread's stops in a short chain, nearest first, so its arcs don't cross the town twice */
function chain(ids) {
  const left = ids.map(id => SBY[id]).filter(Boolean), out = [left.shift()];
  while (left.length) {
    const a = out[out.length - 1]; let bi = 0, bd = 1e9;
    left.forEach((b, i) => { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < bd) { bd = d; bi = i; } });
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}
export function initThreads() {
  THREADS.forEach((th, ti) => {
    const stops = chain(th.stops);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1], d = Math.hypot(a.x - b.x, a.z - b.z);
      // threads that share a pair of stops fly at different heights
      const lift = 3 + d * .22 + ti * 1.1, ya = a.iy + .8, yb = b.iy + .8;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, ya, a.z), new THREE.Vector3((a.x + b.x) / 2, Math.max(ya, yb) + lift, (a.z + b.z) / 2), new THREE.Vector3(b.x, yb, b.z));
      const pos = curve.getPoints(Math.max(24, Math.round(d * 1.5))).flatMap(v => [v.x, v.y, v.z]);
      // lines keep the same width on screen at any zoom: a soft white edge under a dashed line in the thread's colour
      const mk = (color, width, dashed, order) => {
        const g = new LineGeometry(); g.setPositions(pos);
        const m = new LineMaterial({ color, linewidth: width, dashed, dashSize: 1.2, gapSize: .7, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false });
        const l = new Line2(g, m); l.computeLineDistances(); l.visible = false; l.renderOrder = order; scene.add(l); mats.push(m); return l;
      };
      arcs.push({ lines: [mk('#ffffff', 8, false, 2), mk(th.color, 4, true, 3)], th: th.id, stops: [a.id, b.id], op: 0 });
    }
  });
}
/** the threads that should stand out right now */
function lit() {
  if (THR.focus) return new Set([THR.focus]);
  if (S.overview && S.panelId) return new Set(THREADS.filter(th => th.stops.includes(S.panelId)).map(th => th.id));
  return null;
}
export function updateThreads(dt, t) {
  const show = S.ovK, L = lit(), k = Math.min(1, dt * 5);
  if (show > .02) { renderer.getSize(_res);   // widths are in CSS pixels
    for (const m of mats) m.resolution.copy(_res); }
  for (const a of arcs) {
    const want = show < .02 ? 0 : (L ? (L.has(a.th) ? 1 : .07) : .5) * show;
    a.op += (want - a.op) * k;
    const vis = a.op > .01;
    a.lines.forEach((l, i) => { l.visible = vis; if (!vis) return; l.material.opacity = a.op * (i ? 1 : .55); if (i && !reduceMotion) l.material.dashOffset = -t * .9; });
  }
}
