// Stackyard: racks, an outbound pallet, a delivery van and an AGV that fills orders.
import { THREE, scene, canvasTex, M, mat, put, boxes, colliders, sparkTex, puffTex } from '../gfx.js';
import { ISL } from '../nav.js';
import { S } from '../state.js';
import { FONT, rrPath, ease, angDiff, reduceMotion } from '../util.js';
import { P } from '../play/player.js';
import { faceToward } from '../actors/henry.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract, toast } from '../play/hud.js';
import { SFX } from '../sound.js';

const YD = ISL.yard;
const YARD_HOME = { x: .3, z: 2.35 }, YARD_AISLE = -1.65, YARD_LANE = 3.0, PALLET = { x: 3.95, z: .9 };
const yard = { slots: [], steps: [], cur: null, carry: null, fly: null, shipped: 0, onPallet: [], idle: 6, sctx: null, stex: null, g: null, agv: null };
const tmpYard = new THREE.Vector3();

export function initYard() {
  const g = new THREE.Group(); g.position.set(YD.x, 0, YD.z); scene.add(g); yard.g = g;
  const steel = M('#346aa0', { metalness: .22, roughness: .6 }), orange = M('#eda844'), boxM = M('#c69c69'), tape = M('#ffcc4d', { roughness: .8 });
  const tapeSeg = (x1, z1, x2, z2) => { const len = Math.hypot(x2 - x1, z2 - z1); const m = put(g, new THREE.BoxGeometry(.07, .012, len + .07), tape, (x1 + x2) / 2, .008, (z1 + z2) / 2, false); m.rotation.y = Math.atan2(x2 - x1, z2 - z1); };
  tapeSeg(YARD_HOME.x, YARD_HOME.z, YARD_HOME.x, YARD_AISLE); tapeSeg(-2.4, YARD_AISLE, YARD_LANE, YARD_AISLE); tapeSeg(YARD_LANE, YARD_AISLE, YARD_LANE, YARD_HOME.z); tapeSeg(YARD_LANE, YARD_HOME.z, YARD_HOME.x, YARD_HOME.z);
  for (const [x1, z1, x2, z2] of [[3.35, .3, 4.55, .3], [4.55, .3, 4.55, 1.5], [4.55, 1.5, 3.35, 1.5], [3.35, 1.5, 3.35, .3]]) tapeSeg(x1, z1, x2, z2);
  // charging pad where the AGV waits
  put(g, new THREE.BoxGeometry(.9, .02, 1.1), M('#3a4258'), YARD_HOME.x, .012, YARD_HOME.z, false);
  put(g, new THREE.BoxGeometry(.5, .022, .08), M('#2fb67c', { emissive: '#2fb67c', emissiveIntensity: .5 }), YARD_HOME.x, .02, YARD_HOME.z + .62, false);
  // two racks facing the aisle
  for (const rx of [-1.3, 1.45]) {
    for (const x of [-1.16, 1.16]) for (const z of [-.38, .38]) put(g, new THREE.BoxGeometry(.1, 2.3, .1), steel, rx + x, 1.15, -2.9 + z);
    for (const y of [.42, 1.12, 1.82]) {
      put(g, new THREE.BoxGeometry(2.42, .08, .86), steel, rx, y, -2.9);
      for (const bx of [-.78, 0, .78]) { const b = put(g, new THREE.BoxGeometry(.52, .42, .52), bx === 0 && y > 1 ? orange : boxM, rx + bx, y + .25, -2.9); if (y < .5) yard.slots.push({ m: b, x: rx + bx, home: b.position.clone() }); }
    }
    boxes.push({ x: YD.x + rx, z: YD.z - 2.9, c: 1, s: 0, hw: 1.25, hd: .48 });
  }
  const sign = canvasTex(512, 110, (c, w, h) => { c.fillStyle = '#fffaf4'; rrPath(c, 0, 0, w, h, 16); c.fill(); c.fillStyle = '#26334b'; c.font = `700 56px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STACKYARD', w / 2, h / 2 + 3); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .52), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sp.position.set(.08, 2.62, -2.42); g.add(sp);
  // outbound pallet and the delivery van
  put(g, new THREE.BoxGeometry(1.0, .12, 1.0), mat.wood, PALLET.x, .06, PALLET.z);
  colliders.push({ x: YD.x + PALLET.x, z: YD.z + PALLET.z, r: .62 });
  const van = new THREE.Group(); van.position.set(4.0, 0, 2.95); g.add(van);
  put(van, new THREE.BoxGeometry(1.0, 1.0, 1.5), mat.white, 0, .68, -.2); put(van, new THREE.BoxGeometry(1.02, .14, 1.52), orange, 0, .5, -.2);
  put(van, new THREE.BoxGeometry(.96, .72, .62), orange, 0, .55, .82); put(van, new THREE.BoxGeometry(.8, .3, .03), M('#3a4a63', { roughness: .25 }), 0, .72, 1.135, false);
  for (const x of [-.5, .5]) for (const z of [-.6, .75]) { const w = put(van, new THREE.CylinderGeometry(.18, .18, .1, 14), M('#344156'), x, .18, z); w.rotation.z = Math.PI / 2; }
  boxes.push({ x: YD.x + 4.0, z: YD.z + 3.05, c: 1, s: 0, hw: .55, hd: 1.12 });
  // control kiosk with an order counter (the station marker sits on it)
  const k = new THREE.Group(); k.position.set(-1.7, 0, -.5); k.rotation.y = Math.atan2(-YD.x, -YD.z); g.add(k);
  put(k, new THREE.BoxGeometry(.5, .9, .36), mat.navy, 0, .45, 0);
  const head = new THREE.Group(); head.position.set(0, 1.12, .02); head.rotation.x = -.45; k.add(head);
  put(head, new THREE.BoxGeometry(.72, .5, .06), mat.navy, 0, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
  yard.sctx = cv.getContext('2d'); yard.stex = new THREE.CanvasTexture(cv); yard.stex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.64, .4), new THREE.MeshBasicMaterial({ map: yard.stex, toneMapped: false })); scr.position.set(0, 0, .032); head.add(scr);
  drawYardScreen();
  // the AGV
  const agv = new THREE.Group(); agv.position.set(YARD_HOME.x, 0, YARD_HOME.z); agv.rotation.y = Math.PI; g.add(agv); yard.agv = agv;
  put(agv, new THREE.BoxGeometry(.66, .24, .86), orange, 0, .2, 0);
  put(agv, new THREE.BoxGeometry(.58, .04, .78), M('#455b70'), 0, .34, 0);
  put(agv, new THREE.BoxGeometry(.5, .05, .03), M('#7fe0ff', { emissive: '#4cc9ff', emissiveIntensity: .8 }), 0, .24, .44, false);
  for (const x of [-.34, .34]) for (const z of [-.26, .26]) { const w = put(agv, new THREE.CylinderGeometry(.1, .1, .08, 10), M('#344156'), x, .1, z); w.rotation.z = Math.PI / 2; }
}
function drawYardScreen() {
  const c = yard.sctx, w = 256, h = 160;
  c.fillStyle = '#1f2a44'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#eda844'; c.font = `700 20px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('STACKYARD OPS', 16, 26);
  c.fillStyle = '#a9b4c8'; c.font = `600 16px ${FONT}`; c.fillText('Orders shipped', 16, 66);
  c.fillStyle = '#ffffff'; c.font = `700 48px ${FONT}`; c.fillText(String(yard.shipped), 16, 112);
  const busy = yard.steps.length || yard.cur; c.fillStyle = busy ? '#ffd166' : '#2fb67c'; rrPath(c, 150, 92, 92, 34, 17); c.fill();
  c.fillStyle = '#1f2a44'; c.font = `700 15px ${FONT}`; c.textAlign = 'center'; c.fillText(busy ? 'PICKING' : 'READY', 196, 110);
  if (yard.stex) yard.stex.needsUpdate = true;
}
const PALLET_SPOTS = [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]];
export function dispatchOrder(auto = false) {
  if (yard.steps.length || yard.cur) { if (!auto) floatText(YD.x - 1.7, 2.4, YD.z - .5, 'The AGV is on it<small>One order at a time</small>', 1.6); return; }
  let free = yard.slots.filter(s => s.m.visible);
  if (!free.length) { restockRacks(); free = yard.slots; }
  const sl = free[Math.floor(Math.random() * free.length)];
  const go = (x, z) => ({ go: true, x, z });
  yard.steps = [go(YARD_HOME.x, YARD_AISLE), go(sl.x, YARD_AISLE), { face: Math.PI }, { pick: sl }, { wait: .5 }, go(YARD_LANE, YARD_AISLE), go(YARD_LANE, PALLET.z), { face: Math.PI / 2 }, { drop: true }, { wait: .5 }, go(YARD_LANE, YARD_HOME.z), go(YARD_HOME.x, YARD_HOME.z), { face: Math.PI }, { done: true }];
  yard.idle = 0; drawYardScreen();
  if (auto) return;
  faceToward(YD.x - 1.7, YD.z - .5, 1.4); SFX.pop();
  floatText(YD.x - 1.7, 2.5, YD.z - .5, `Order #${1043 + yard.shipped} sent to the floor<small>Pick, pack and ship, like the live dashboard</small>`, 2.8);
  markInteract('order');
}
function restockRacks() {
  yard.slots.forEach(s => { s.m.visible = true; });
  spriteBurst(YD.x, 1.2, YD.z - 2.9, sparkTex, 10, { size: .28, up: 1.4, spread: 2.4 });
}
export function updateYard(dt) {
  const agv = yard.agv;
  if (yard.fly) {
    const f = yard.fly; f.t = Math.min(1, f.t + dt / .55); const e = ease(f.t);
    f.m.position.lerpVectors(f.a, f.b, e); f.m.position.y += Math.sin(f.t * Math.PI) * .35;
    if (f.t >= 1) { yard.fly = null; f.end(); }
    return;
  }
  if (!yard.cur && yard.steps.length) yard.cur = yard.steps.shift();
  const s = yard.cur;
  if (!s) { if (!reduceMotion && (yard.idle += dt) > 22) dispatchOrder(true); return; }
  // a polite safety stop when Henry stands in front of the AGV
  const wp = agv.getWorldPosition(tmpYard), fx = Math.sin(agv.rotation.y), fz = Math.cos(agv.rotation.y), hx = P.x - wp.x, hz = P.z - wp.z;
  if (s.go && Math.hypot(hx, hz) < 1.0 && hx * fx + hz * fz > 0) return;
  if (s.go) {
    const dx = s.x - agv.position.x, dz = s.z - agv.position.z, d = Math.hypot(dx, dz);
    if (d < .02) { agv.position.x = s.x; agv.position.z = s.z; yard.cur = null; return; }
    const want = Math.atan2(dx, dz), diff = angDiff(want, agv.rotation.y);
    if (Math.abs(diff) > .04) { agv.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), dt * 4.5); return; }
    agv.rotation.y = want; const st = Math.min(d, dt * 1.5); agv.position.x += dx / d * st; agv.position.z += dz / d * st;
  } else if (s.face !== undefined) {
    const diff = angDiff(s.face, agv.rotation.y);
    if (Math.abs(diff) < .03) { agv.rotation.y = s.face; yard.cur = null; } else agv.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), dt * 4.5);
  } else if (s.pick) {
    const sl = s.pick; yard.cur = null;
    const b = sl.m.clone(); yard.g.add(b); b.position.copy(sl.home); sl.m.visible = false;
    const top = new THREE.Vector3(agv.position.x, .58, agv.position.z);
    yard.fly = { m: b, t: 0, a: b.position.clone(), b: top, end: () => { yard.carry = b; agv.attach(b); b.position.set(0, .58, 0); b.rotation.set(0, 0, 0); } };
  } else if (s.drop) {
    const b = yard.carry; yard.cur = null; if (!b) return;
    yard.g.attach(b); yard.carry = null;
    const n = yard.onPallet.length, [ox, oz] = PALLET_SPOTS[n % 4], layer = Math.floor(n / 4);
    yard.fly = { m: b, t: 0, a: b.position.clone(), b: new THREE.Vector3(PALLET.x + ox, .32 + layer * .36, PALLET.z + oz), end: () => { b.scale.setScalar(.82); yard.onPallet.push(b); } };
  } else if (s.wait !== undefined) {
    s.wait -= dt; if (s.wait <= 0) yard.cur = null;
  } else if (s.done) {
    yard.cur = null; yard.shipped++; yard.idle = 0; drawYardScreen();
    if (yard.onPallet.length >= 8) {
      setTimeout(() => {
        yard.onPallet.forEach(b => { yard.g.remove(b); spriteBurst(YD.x + PALLET.x, .8, YD.z + PALLET.z, puffTex, 3, { size: .5, up: .8, spread: .6 }); });
        yard.onPallet = []; if (S.started && Math.hypot(P.x - YD.x, P.z - YD.z) < 12) toast(`<b>Van loaded.</b> ${yard.shipped} orders shipped from Stackyard`);
      }, 400);
    }
  }
}
