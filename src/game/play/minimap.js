// The minimap in the corner: squares, streets, houses, the pond and food court, quest stops,
// tool coins, pets, townsfolk and Henry. Click it to travel.
import { STATIONS, ISLANDS, DISTRICT, POND } from '../../data/world.js';
import { TOOLS } from '../../data/content.js';
import { BRIDGES, walkable } from '../nav.js';
import { S } from '../state.js';
import { rrPath } from '../util.js';
import { HOUSES } from '../world/town.js';
import { PETS } from '../actors/pets.js';
import { FOLK, walkToNpc } from '../actors/npcs.js';
import { found, visited } from './hud.js';
import { P, walkTo, walkToStation } from './player.js';
import { closePanel } from './ui.js';

let mm = null, mg = null;
const MM = { cx: 0, cz: 1, s: 320 / 84 };
const toMM = (x, z) => [160 + (x - MM.cx) * MM.s, 160 + (z - MM.cz) * MM.s];
export function initMinimap(canvas) { mm = canvas; mg = canvas ? canvas.getContext('2d') : null; }

export function drawMinimap() {
  if (!mm || !mg || !mm.offsetParent) return;
  mg.clearRect(0, 0, 320, 320);
  mg.fillStyle = '#d6eac2'; rrPath(mg, 0, 0, 320, 320, 24); mg.fill();
  mg.save(); rrPath(mg, 0, 0, 320, 320, 24); mg.clip();
  { const [px, py] = toMM(POND.x, POND.z); mg.fillStyle = '#9fd3ef'; mg.beginPath(); mg.arc(px, py, POND.r * MM.s, 0, 7); mg.fill(); }
  // the food court stalls and truck
  mg.fillStyle = '#f6c9a0';
  for (const [x, z, w, h] of [[-6.3, 16.2, 1.6, 2.1], [6.1, 16.2, 1.2, 2.2], [-.5, 22.3, 5.1, 1.9]]) { const [a, b] = toMM(x - w / 2, z - h / 2); mg.fillRect(a, b, w * MM.s, h * MM.s); }
  mg.fillStyle = '#efb9a0';
  for (const h of HOUSES) { if (h.tree) continue; const [hx, hy] = toMM(h.x, h.z); mg.save(); mg.translate(hx, hy); mg.rotate(-h.yaw); mg.fillRect(-h.w / 2 * MM.s, -h.d / 2 * MM.s, h.w * MM.s, h.d * MM.s); mg.restore(); }
  mg.restore();
  mg.strokeStyle = '#f1e8da'; mg.lineCap = 'round'; mg.lineWidth = 2.4 * MM.s;
  for (const b of BRIDGES) { const [a1, a2] = toMM(b.p1.x, b.p1.z), [b1, b2] = toMM(b.p2.x, b.p2.z); mg.beginPath(); mg.moveTo(a1, a2); mg.lineTo(b1, b2); mg.stroke(); }
  for (const is of ISLANDS) { const [x, y] = toMM(is.x, is.z), pz = DISTRICT[is.id] === 'plaza'; mg.fillStyle = pz ? '#f4ecdf' : '#a6db86'; mg.strokeStyle = pz ? '#dcc9ae' : '#86c867'; mg.lineWidth = 3; mg.beginPath(); mg.arc(x, y, is.r * MM.s, 0, 7); mg.fill(); mg.stroke(); }
  for (const t of TOOLS) { if (found.has(t.n)) continue; const [x, y] = toMM(t.at[0], t.at[1]); mg.fillStyle = '#ffd166'; mg.strokeStyle = '#fff'; mg.lineWidth = 2; mg.beginPath(); mg.arc(x, y, 5, 0, 7); mg.fill(); mg.stroke(); }
  for (const pt of PETS) { const [x, y] = toMM(pt.x, pt.z); mg.fillStyle = pt.fur; mg.strokeStyle = '#fff'; mg.lineWidth = 2; mg.beginPath(); mg.arc(x, y, 4.5, 0, 7); mg.fill(); mg.stroke(); }
  for (const n of FOLK) { const [x, y] = toMM(n.x, n.z); mg.fillStyle = n.color; mg.strokeStyle = '#fff'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(x, y - 6); mg.lineTo(x + 5.5, y + 4); mg.lineTo(x - 5.5, y + 4); mg.closePath(); mg.fill(); mg.stroke(); }
  for (const st of STATIONS) {
    const [x, y] = toMM(st.x, st.z), done = visited.has(st.id);
    mg.fillStyle = done ? '#2fb67c' : st.color; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.arc(x, y, st.kind === 'quest' ? 10 : 8, 0, 7); mg.fill(); mg.stroke();
    if (done) { mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(x - 4, y); mg.lineTo(x - 1, y + 3); mg.lineTo(x + 4, y - 3); mg.stroke(); }
  }
  if (S.path.length) { mg.strokeStyle = 'rgba(236,106,78,.8)'; mg.setLineDash([6, 6]); mg.lineWidth = 3; mg.beginPath(); mg.moveTo(...toMM(P.x, P.z)); for (const p of S.path) mg.lineTo(...toMM(p.x, p.z)); mg.stroke(); mg.setLineDash([]); }
  const [px, py] = toMM(P.x, P.z);
  mg.save(); mg.translate(px, py); mg.rotate(-S.camYaw);
  const fov = mg.createRadialGradient(0, 0, 0, 0, 0, 60); fov.addColorStop(0, 'rgba(32,43,69,.18)'); fov.addColorStop(1, 'rgba(32,43,69,0)');
  mg.fillStyle = fov; mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, 60, -Math.PI / 2 - .5, -Math.PI / 2 + .5); mg.closePath(); mg.fill(); mg.restore();
  mg.save(); mg.translate(px, py); mg.rotate(Math.PI - S.heading);
  mg.fillStyle = '#ec6a4e'; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(8, 8); mg.lineTo(0, 4); mg.lineTo(-8, 8); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
}

/** a click on the map, in the canvas's 320 × 320 pixel space */
export function minimapClick(sx, sy) {
  const x = MM.cx + (sx - 160) / MM.s, z = MM.cz + (sy - 160) / MM.s;
  let best = null, bd = 1e9; for (const st of STATIONS) { const d = Math.hypot(x - st.x, z - st.z); if (d < bd) { bd = d; best = st; } }
  if (best && bd < 2.5) { closePanel(); walkToStation(best.id); return; }
  let bn = null, bnd = 1e9; for (const n of FOLK) { const d = Math.hypot(x - n.x, z - n.z); if (d < bnd) { bnd = d; bn = n; } }
  if (bn && bnd < 1.8) { closePanel(); walkToNpc(bn); return; }
  if (walkable(x, z)) { closePanel(); walkTo({ x, z }); return; }
  const is = ISLANDS.reduce((a, b) => Math.hypot(x - b.x, z - b.z) < Math.hypot(x - a.x, z - a.z) ? b : a);
  closePanel(); walkTo({ x: is.x + (x > is.x ? .8 : -.8), z: is.z + 1.6 });
}
