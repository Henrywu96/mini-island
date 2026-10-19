// Quest stops (totems, icons, labels), the tool coins hidden around town and the props you can use.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene, camera, canvasTex, M, mat, put, hitMat, stationHits, markTex, doneTex, glyphTex, loadTex } from '../gfx.js';
import { STATIONS, SBY } from '../../data/world.js';
import { TOOLS } from '../../data/content.js';
import { groundY } from '../nav.js';
import { S } from '../state.js';
import { esc, FONT, reduceMotion, track } from '../util.js';
import { SFX } from '../sound.js';
import { burst } from './fx.js';
import { found, visited, addXP, toast, syncTracker } from './hud.js';
import { say } from '../actors/henry.js';
import { P } from './player.js';
import { sendHug } from '../world/bridgly.js';
import { wheelRun } from '../actors/hamster.js';
import { brewCoffee, moveCard } from '../world/market.js';
import { shakeTree } from '../world/grove.js';
import { dispatchTrain } from '../world/transit.js';
import { dispatchOrder } from '../world/yard.js';
import { changePaint } from '../world/showroom.js';
import { throwPlane } from './plane.js';

/** things you can walk up to and use that are not quest stops */
export const PROPS = [
  { id: 'hug', x: 0, z: -26.3, radius: 2.0, h: 7, label: 'Send a hug', sub: 'to the lookout cottage', act: () => sendHug() },
  { id: 'wheel', x: -2.2, z: -6.6, radius: 1.9, h: 1.6, label: 'Let the hamster run', sub: 'Hamster wheel', act: () => wheelRun() },
];

export function initStations() {
  STATIONS.forEach(st => {
    const g = new THREE.Group(); g.position.set(st.x, 0, st.z); scene.add(g);
    if (st.kind === 'quest') {
      put(g, new THREE.CylinderGeometry(.8, .98, .5, 28), mat.stone, 0, .25, 0);
      put(g, new THREE.CylinderGeometry(.58, .7, .55, 28), M(st.color, { roughness: .5 }), 0, .77, 0);
      put(g, new THREE.CylinderGeometry(.66, .66, .08, 28), mat.cream, 0, 1.08, 0);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.8, 56), new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: .6, depthWrite: false, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring); st.ring = ring;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 6, 28, 1, true), new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
      beam.position.y = 3; g.add(beam); st.beam = beam;
    }
    const iconTex = st.icon ? loadTex(st.icon) : glyphTex(st.glyph, st.color);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, toneMapped: false, fog: false, transparent: true }));
    icon.scale.setScalar(st.kind === 'quest' ? 1.4 : 1.05); icon.position.y = st.iy; g.add(icon); st.iconS = icon;
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, toneMapped: false, fog: false, transparent: true }));
    mk.scale.setScalar(.58); mk.position.y = st.iy + (st.kind === 'quest' ? 1.05 : .9); g.add(mk); st.mark = mk;
    const el = document.createElement('div'); el.className = 'slabel'; el.innerHTML = `<span style="--c:${st.color}"></span>${esc(st.name)}<small>${esc(st.tag)}</small>`;
    const lab = new CSS2DObject(el); lab.position.y = mk.position.y + .75; g.add(lab); st.labelEl = el;
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 10), hitMat); hit.position.y = 2; hit.userData.station = st; g.add(hit); stationHits.push(hit);
    st.group = g;
  });
  // the second action (F) at each stop
  SBY.emberline.alt = { label: 'Brew a coffee', act: brewCoffee };
  SBY.jobtracker.alt = { label: 'Move a job card', act: moveCard };
  SBY.skills.alt = { label: 'Shake the tree', act: shakeTree };
  SBY.edmontonlrt.alt = { label: 'Dispatch a train', act: () => dispatchTrain() };
  SBY.stackyard.alt = { label: 'Dispatch an order', act: () => dispatchOrder() };
  SBY.arcline.alt = { label: 'Change the paint', act: changePaint };
  SBY.contact.alt = { label: 'Throw a paper plane', act: throwPlane };
  PROPS.forEach(pr => { const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, pr.h, 10), hitMat); hit.position.set(pr.x, pr.h / 2, pr.z); hit.userData.prop = pr; scene.add(hit); stationHits.push(hit); });

  // tool coins
  const coinGeo = new THREE.CylinderGeometry(.42, .42, .1, 32); coinGeo.rotateX(Math.PI / 2);
  TOOLS.forEach(t => {
    const tex = canvasTex(128, 128, (c) => { c.fillStyle = t.c; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 50, 0, 7); c.stroke(); c.fillStyle = '#ffffff'; c.font = `700 ${t.a.length > 1 ? 46 : 56}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t.a, 64, 68); });
    const face = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const m = new THREE.Mesh(coinGeo, [new THREE.MeshStandardMaterial({ color: t.c, metalness: .35, roughness: .35 }), face, face]);
    m.castShadow = true; t.y = groundY(t.at[0], t.at[1]) + .95; m.position.set(t.at[0], t.y, t.at[1]); scene.add(m); t.m = m;
  });
}

/** the visited check mark and the dimmed label once a stop has been opened */
export function markVisited(st) {
  st.mark.material.map = doneTex; st.mark.material.needsUpdate = true; st.labelEl.classList.add('done');
}

/** pick up any tool coin Henry is touching */
export function checkTools() {
  for (const t of TOOLS) {
    if (found.has(t.n)) continue;
    if (Math.hypot(P.x - t.at[0], P.z - t.at[1]) < 1.05 && Math.abs((P.y + S.jumpY + 1) - t.y) < 1.4) {
      found.add(t.n); track('tool_found', { tool_name: t.n }); t.m.visible = false; SFX.coin(); burst(t.at[0], t.y, t.at[1], [t.c, '#ffd166', '#ffffff'], 20, 3.5);
      toast(`Tool unlocked: <b>${esc(t.n)}</b> · ${found.size}/${TOOLS.length}`); say(`${t.n}! ${found.size === TOOLS.length ? 'Full toolbelt.' : 'One of my everyday tools.'}`, 2.4);
      addXP(2); syncTracker();
    }
  }
}

const _seg = new THREE.Vector3(), _rel = new THREE.Vector3();
function blocking(x, y, z) {
  _seg.set(P.x - camera.position.x, P.y + 1.2 - camera.position.y, P.z - camera.position.z);
  _rel.set(x - camera.position.x, y - camera.position.y, z - camera.position.z);
  const L2 = _seg.lengthSq(), u = _rel.dot(_seg) / L2;
  if (u <= 0 || u >= .92) return false;
  return _rel.addScaledVector(_seg, -u).length() < 1.6;
}
export function updateStations(dt, t) {
  STATIONS.forEach((st, i) => {
    const bob = reduceMotion ? 0 : Math.sin(t * 2 + i) * .1;
    st.iconS.position.y = st.iy + bob; st.mark.position.y = st.iy + (st.kind === 'quest' ? 1.05 : .9) + bob * 1.3;
    if (st.ring && !reduceMotion) { st.ring.rotation.z = t * .4; st.ring.material.opacity = .45 + Math.sin(t * 2.4 + i) * .15; st.beam.material.opacity = visited.has(st.id) ? .05 : .09 + Math.sin(t * 2 + i) * .03; }
    const d = Math.hypot(P.x - st.x, P.z - st.z);
    let op = !S.started ? 1 : d < 16 ? 1 : d > 30 ? .4 : 1 - (d - 16) / 14 * .6;
    // a stop's floating icon fades when it sits between the camera and Henry
    const block = S.started && blocking(st.x, st.iy + st.group.position.y, st.z);
    const io = block ? .22 : 1;
    st.iconS.material.opacity += (io - st.iconS.material.opacity) * Math.min(1, dt * 8); st.mark.material.opacity = st.iconS.material.opacity;
    if (block) op = Math.min(op, .35);
    st.labelEl.style.opacity = String(op);
  });
  TOOLS.forEach((tl, i) => { if (!tl.m.visible) return; tl.m.rotation.y = reduceMotion ? .6 : t * 2 + i; tl.m.position.y = tl.y + (reduceMotion ? 0 : Math.sin(t * 2.5 + i) * .12); });
}
