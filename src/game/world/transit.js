// Edmonton LRT park: a loop of track, a platform, a live map board and a train you can dispatch.
import { THREE, scene, canvasTex, M, mat, put, boxes, dummy } from '../gfx.js';
import { ISL } from '../nav.js';
import { FONT, rrPath, reduceMotion } from '../util.js';
import { tree } from './nature.js';
import { faceToward } from '../actors/henry.js';
import { floatText } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { SFX } from '../sound.js';

export const TR = ISL.transit;
const TRACK_R = 3.9;
const LRT_LINES = [['Capital', '#2f6fdd'], ['Metro', '#e0393e'], ['Valley', '#2fa35f']];
const LRT_SPAN = 1.52 / TRACK_R, LRT_PARK = -Math.PI / 2 + LRT_SPAN / 2;
const LRT_MAP = [
  ['#2f6fdd', [[236, 50], [204, 92], [162, 118], [152, 150], [142, 204]]],
  ['#e0393e', [[86, 56], [118, 84], [150, 110], [162, 118], [152, 150], [148, 174]]],
  ['#2fa35f', [[164, 124], [202, 142], [246, 166], [292, 200]]],
];
export const lrt = { phi: LRT_PARK, t: 1, dur: 9, line: 0, cars: [], paints: [], idle: 9, bctx: null, btex: null, bAcc: 0, g: null };

export function initTransit() {
  for (const a of [2.35, 3.05, 3.75]) tree(TR.x + Math.cos(a) * 5.05, TR.z + Math.sin(a) * 5.05, .85, a > 3 ? 'leaf' : 'blossom');
  const g = new THREE.Group(); g.position.set(TR.x, 0, TR.z); scene.add(g); lrt.g = g;
  // ballast ring, rails and sleepers
  const bal = new THREE.Mesh(new THREE.RingGeometry(TRACK_R - .48, TRACK_R + .48, 112), M('#d3cabe', { roughness: 1 }));
  bal.rotation.x = -Math.PI / 2; bal.position.y = .008; bal.receiveShadow = true; g.add(bal);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(.66, .05, .13), mat.wood2, 56); sleepers.receiveShadow = true;
  for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2; dummy.position.set(Math.cos(a) * TRACK_R, .03, Math.sin(a) * TRACK_R); dummy.rotation.set(0, -a, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); sleepers.setMatrixAt(i, dummy.matrix); }
  g.add(sleepers);
  const railM = M('#7d8795', { metalness: .45, roughness: .4 });
  for (const r of [TRACK_R - .2, TRACK_R + .2]) { const rail = put(g, new THREE.TorusGeometry(r, .03, 6, 140), railM, 0, .075, 0, false); rail.rotation.x = Math.PI / 2; }
  // platform with a canopy on the north side of the loop
  put(g, new THREE.BoxGeometry(2.4, .26, .62), mat.stone, 0, .13, -3.0);
  put(g, new THREE.BoxGeometry(2.4, .02, .1), M('#ffd166'), 0, .27, -3.25, false);
  for (const sx of [-.95, .95]) put(g, new THREE.BoxGeometry(.08, 1.95, .08), mat.navy, sx, 1.23, -2.86);
  put(g, new THREE.BoxGeometry(2.5, .09, .95), M('#28445f'), 0, 2.22, -2.98);
  put(g, new THREE.BoxGeometry(1.0, .07, .3), mat.wood, -.35, .62, -2.85); put(g, new THREE.BoxGeometry(1.0, .3, .06), mat.wood, -.35, .8, -2.72);
  const sign = canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#fffaf4'; rrPath(c, 0, 0, w, h, 14); c.fill();
    c.fillStyle = '#26334b'; c.font = `700 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EDMONTON LRT', w / 2 + 34, h / 2 + 2);
    LRT_LINES.forEach(([, col], i) => { c.fillStyle = col; c.beginPath(); c.arc(40 + i * 26, h / 2, 10, 0, 7); c.fill(); });
  });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .42), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sp.position.set(0, 2.5, -2.5); g.add(sp);
  boxes.push({ x: TR.x, z: TR.z - 2.98, c: 1, s: 0, hw: 1.25, hd: .4 });
  // live map board in the middle of the park, facing the street from the square
  const bd = new THREE.Group(); bd.position.set(0, 0, 0); bd.rotation.y = Math.atan2(-TR.x, -TR.z); g.add(bd);
  for (const sx of [-.62, .62]) put(bd, new THREE.BoxGeometry(.08, 1.0, .08), mat.navy, sx, .5, 0);
  put(bd, new THREE.BoxGeometry(1.62, 1.12, .1), mat.navy, 0, 1.52, 0);
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 220;
  lrt.bctx = cv.getContext('2d'); lrt.btex = new THREE.CanvasTexture(cv); lrt.btex.colorSpace = THREE.SRGBColorSpace; lrt.btex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.03), new THREE.MeshBasicMaterial({ map: lrt.btex, toneMapped: false })); scr.position.set(0, 1.52, .056); bd.add(scr);
  drawLrtBoard(0);
  // a two-car train
  const glass = M('#3a4a63', { roughness: .25 }), win = M('#a9d6ee', { roughness: .2 }), white = M('#f5fafc'), bogie = M('#3a4258'), lampM = M('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: .8 });
  for (let k = 0; k < 2; k++) {
    const car = new THREE.Group(); g.add(car);
    const paint = M(LRT_LINES[0][1], { roughness: .45 }); lrt.paints.push(paint);
    put(car, new THREE.BoxGeometry(.6, .46, 1.42), paint, 0, .46, 0);
    put(car, new THREE.BoxGeometry(.62, .26, 1.38), white, 0, .82, 0);
    for (const s of [-1, 1]) put(car, new THREE.BoxGeometry(.02, .17, 1.12), win, s * .316, .83, 0, false);
    put(car, new THREE.BoxGeometry(.5, .06, 1.24), M('#e3e8ee'), 0, .98, 0);
    for (const e of [-1, 1]) { put(car, new THREE.BoxGeometry(.5, .2, .02), glass, 0, .82, e * .7, false); for (const s of [-1, 1]) put(car, new THREE.BoxGeometry(.08, .05, .02), lampM, s * .2, .4, e * .71, false); }
    for (const z of [-.44, .44]) put(car, new THREE.BoxGeometry(.48, .14, .34), bogie, 0, .17, z);
    if (k === 0) { const pa = put(car, new THREE.BoxGeometry(.03, .34, .03), bogie, 0, 1.15, .1); pa.rotation.x = .6; put(car, new THREE.BoxGeometry(.36, .03, .05), bogie, 0, 1.29, .2); }
    lrt.cars.push(car);
  }
  placeTrain();
}
function drawLrtBoard(t) {
  const c = lrt.bctx, w = 320, h = 220;
  c.fillStyle = '#1f2a44'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff'; c.font = `700 22px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('ETS LRT', 16, 24);
  c.fillStyle = '#2fb67c'; rrPath(c, w - 84, 11, 68, 26, 13); c.fill(); c.fillStyle = '#ffffff'; c.font = `700 14px ${FONT}`; c.fillText('● LIVE', w - 74, 25);
  const ptAt = (pts, u) => {
    const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let d = u * L; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const f = d / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= seg[i]; }
    return pts[pts.length - 1];
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [col, pts] of LRT_MAP) { c.strokeStyle = /** @type {string} */ (col); c.lineWidth = 8; c.beginPath(); /** @type {number[][]} */ (pts).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  for (const [, pts] of LRT_MAP) for (const [x, y] of /** @type {number[][]} */ (pts)) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
  LRT_MAP.forEach(([col, pts], li) => {
    for (let k = 0; k < 2; k++) {
      const s = (t * .045 + k * .5 + li * .23) % 1, u = s < .5 ? s * 2 : 2 - s * 2, [x, y] = ptAt(pts, u);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.fillStyle = /** @type {string} */ (col); c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
    }
  });
  if (lrt.btex) lrt.btex.needsUpdate = true;
}
function placeTrain() {
  lrt.cars.forEach((car, k) => {
    const a = lrt.phi - k * LRT_SPAN;
    car.position.set(Math.cos(a) * TRACK_R, .06, Math.sin(a) * TRACK_R);
    car.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
  });
}
export const trainRunning = () => lrt.t < 1;
export function updateLRT(dt, t) {
  if (lrt.t < 1) {
    lrt.t = Math.min(1, lrt.t + dt / lrt.dur);
    const u = lrt.t, e = u * u * u * (u * (u * 6 - 15) + 10);
    lrt.phi = LRT_PARK + e * Math.PI * 2; placeTrain();
  } else if (!reduceMotion && (lrt.idle += dt) > 18) dispatchTrain(true);
  lrt.bAcc += dt; if (lrt.bAcc > .2) { lrt.bAcc = 0; drawLrtBoard(reduceMotion ? 0 : t); }
}
export function dispatchTrain(auto = false) {
  if (lrt.t < 1) { if (!auto) floatText(TR.x, 3.0, TR.z - 2.9, 'Already on the line<small>It stops here again in a moment</small>', 1.8); return; }
  lrt.line = (lrt.line + 1) % LRT_LINES.length; const [name, col] = LRT_LINES[lrt.line];
  lrt.paints.forEach(p => p.color.set(col)); lrt.t = 0; lrt.idle = 0;
  if (auto) return;
  faceToward(TR.x, TR.z - 3.2, 1.4); SFX.chime();
  floatText(TR.x, 3.1, TR.z - 2.9, `${name} Line departing<small>On the live map every train follows ETS schedules</small>`, 2.8);
  markInteract('train');
}
