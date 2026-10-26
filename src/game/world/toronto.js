// Toronto Transit Live plaza: a subway platform between two tunnel portals, a live map board of the
// Toronto rail lines and a little CN Tower. Press F and the train at the platform heads into the tunnel
// and the next one, on another line, pulls in.
import { THREE, scene, canvasTex, M, mat, put, colliders, boxes, lampMats } from '../gfx.js';
import { ISL } from '../nav.js';
import { FONT, rrPath, reduceMotion } from '../util.js';
import { tree } from './nature.js';
import { faceToward } from '../actors/henry.js';
import { floatText } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { SFX } from '../sound.js';

export const TO = ISL.toronto;
// the track runs east–west along the south side of the plaza, between two portals
const TRACK_Z = 2.0, PORTAL = 3.3, PORTAL_LEN = 1.3, PLAT_Z = 1.15;
const CAR_L = 1.0, CAR_GAP = .06, CARS = 3, PITCH = CAR_L + CAR_GAP;
const STOP = PITCH;                                        // the head car's centre when the middle car is at the platform
const FROM = -PORTAL - .6, TO_END = PORTAL + .5 + CAR_L / 2 + (CARS - 1) * PITCH + .1;
const SUBWAY = [['Line 1 Yonge–University', '#f8c300'], ['Line 2 Bloor–Danforth', '#00923f'], ['Line 4 Sheppard', '#a21a68']];
// the board: a schematic of the subway, the LRT lines and the GO lakeshore line (320 × 220 canvas)
const TO_MAP = [
  ['#7a8a99', [[18, 207], [302, 207]], true],                                                            // GO lakeshore
  ['#ff8000', [[44, 74], [276, 74]]],                                                                    // Line 5 Eglinton
  ['#969594', [[34, 48], [104, 48]]],                                                                    // Line 6 Finch West
  ['#a21a68', [[208, 48], [276, 48]]],                                                                   // Line 4 Sheppard
  ['#00923f', [[22, 116], [298, 116]]],                                                                  // Line 2 Bloor–Danforth
  ['#f8c300', [[118, 40], [118, 140], [130, 168], [160, 180], [190, 168], [204, 140], [204, 40]]],      // Line 1 Yonge–University
];
export const subway = { phase: 'parked', t: 0, head: STOP, line: 0, idle: 0, cars: [], stripes: [], bctx: null, btex: null, bAcc: 0, g: null };

const dur = { out: 3.4, gap: 1.2, in: 3.8 };

export function initToronto() {
  const g = new THREE.Group(); g.position.set(TO.x, 0, TO.z); scene.add(g); subway.g = g;
  const stone = M('#d9d2c8'), concrete = M('#bfb8ae', { roughness: 1 }), black = M('#1d2230', { roughness: .6 });

  // track bed, rails and sleepers between (and into) the portals
  const bedLen = (PORTAL + PORTAL_LEN) * 2;
  put(g, new THREE.BoxGeometry(bedLen, .04, 1.0), M('#cfc6ba', { roughness: 1 }), 0, .02, TRACK_Z, false);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(.13, .05, .66), mat.wood2, 30); sleepers.receiveShadow = true;
  const dm = new THREE.Object3D();
  for (let i = 0; i < 30; i++) { dm.position.set(-PORTAL - .4 + i * ((PORTAL + .4) * 2 / 29), .05, TRACK_Z); dm.updateMatrix(); sleepers.setMatrixAt(i, dm.matrix); }
  g.add(sleepers);
  const railM = M('#7d8795', { metalness: .45, roughness: .4 });
  for (const dz of [-.2, .2]) put(g, new THREE.BoxGeometry(bedLen, .05, .05), railM, 0, .09, TRACK_Z + dz, false);

  // the two tunnel portals: a concrete housing with a dark mouth facing the platform
  for (const s of [-1, 1]) {
    const cx = s * (PORTAL + PORTAL_LEN / 2);
    put(g, new THREE.BoxGeometry(PORTAL_LEN, 1.15, 1.2), concrete, cx, .575, TRACK_Z);
    put(g, new THREE.BoxGeometry(PORTAL_LEN + .1, .14, 1.32), stone, cx, 1.2, TRACK_Z);
    // grass on the roof of the cut-and-cover box
    put(g, new THREE.BoxGeometry(PORTAL_LEN - .1, .06, 1.1), mat.grass, cx, 1.3, TRACK_Z, false);
    const mouth = put(g, new THREE.PlaneGeometry(.78, .86), black, s * (PORTAL - .006), .45, TRACK_Z, false);
    mouth.rotation.y = -s * Math.PI / 2;
    for (const dz of [-.47, .47]) put(g, new THREE.BoxGeometry(.08, .96, .08), stone, s * (PORTAL - .03), .48, TRACK_Z + dz);
    put(g, new THREE.BoxGeometry(.08, .1, 1.02), stone, s * (PORTAL - .03), .93, TRACK_Z);
    boxes.push({ x: TO.x + cx, z: TO.z + TRACK_Z, c: 1, s: 0, hw: PORTAL_LEN / 2 + .05, hd: .62 });
  }

  // the platform, its canopy and the station sign
  put(g, new THREE.BoxGeometry(4.1, .26, .62), mat.stone, 0, .13, PLAT_Z);
  put(g, new THREE.BoxGeometry(4.1, .02, .1), M('#ffd166'), 0, .27, PLAT_Z + .26, false);
  for (const sx of [-1.7, 1.7]) put(g, new THREE.BoxGeometry(.08, 1.85, .08), black, sx, 1.18, PLAT_Z - .18);
  put(g, new THREE.BoxGeometry(4.2, .09, 1.0), M('#2b2f3a'), 0, 2.12, PLAT_Z + .06);
  const glow = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd58a', emissiveIntensity: .25 }); lampMats.push(glow);
  put(g, new THREE.BoxGeometry(3.6, .03, .12), glow, 0, 2.06, PLAT_Z + .1, false);
  put(g, new THREE.BoxGeometry(1.0, .07, .3), mat.wood, -.9, .62, PLAT_Z - .12); put(g, new THREE.BoxGeometry(1.0, .3, .06), mat.wood, -.9, .8, PLAT_Z - .26);
  // the sign reads the same way as the site's station cards: a black band, the name, and the line's bullet
  const sign = canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#111111'; rrPath(c, 0, 0, w, h, 12); c.fill();
    c.fillStyle = '#f8c300'; c.beginPath(); c.arc(54, h / 2, 26, 0, 7); c.fill();
    c.fillStyle = '#111111'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 54, h / 2 + 2);
    c.fillStyle = '#ffffff'; c.font = `700 52px ${FONT}`; c.textAlign = 'left'; c.fillText('Union', 100, h / 2 + 3);
    c.font = `500 26px ${FONT}`; c.fillStyle = '#c9ced8'; c.textAlign = 'right'; c.fillText('Toronto', w - 26, h / 2 + 3);
  });
  for (const [dz, ry] of [[-.025, Math.PI], [.025, 0]]) {
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .45), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }));
    sp.position.set(0, 2.42, PLAT_Z - .38 + dz); sp.rotation.y = ry; g.add(sp);
  }
  put(g, new THREE.BoxGeometry(2.46, .5, .04), black, 0, 2.42, PLAT_Z - .38);
  boxes.push({ x: TO.x, z: TO.z + PLAT_Z, c: 1, s: 0, hw: 2.1, hd: .36 });

  // the live map board in the middle of the plaza, facing the town square
  const bd = new THREE.Group(); bd.rotation.y = Math.atan2(-TO.x, -TO.z); bd.position.set(0, 0, 0); g.add(bd);
  for (const sx of [-.62, .62]) put(bd, new THREE.BoxGeometry(.08, 1.0, .08), mat.navy, sx, .5, 0);
  put(bd, new THREE.BoxGeometry(1.62, 1.12, .1), black, 0, 1.52, 0);
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 220;
  subway.bctx = cv.getContext('2d'); subway.btex = new THREE.CanvasTexture(cv); subway.btex.colorSpace = THREE.SRGBColorSpace; subway.btex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.03), new THREE.MeshBasicMaterial({ map: subway.btex, toneMapped: false })); scr.position.set(0, 1.52, .056); bd.add(scr);
  drawBoard(0);

  // a little CN Tower at the west end of the plaza
  const tw = new THREE.Group(); tw.position.set(-3.3, 0, -2.3); g.add(tw);
  const towerM = M('#d8d4cc'), podM = M('#9aa3ad', { metalness: .2, roughness: .5 });
  put(tw, new THREE.CylinderGeometry(.62, .7, .3, 6), concrete, 0, .15, 0);
  put(tw, new THREE.CylinderGeometry(.14, .34, 5.1, 6), towerM, 0, 2.85, 0);
  put(tw, new THREE.CylinderGeometry(.62, .5, .42, 18), podM, 0, 5.25, 0);
  put(tw, new THREE.CylinderGeometry(.66, .66, .1, 18), towerM, 0, 5.02, 0);
  const podGlow = new THREE.MeshStandardMaterial({ color: '#cfe0ee', emissive: '#ffd58a', emissiveIntensity: .25 }); lampMats.push(podGlow);
  put(tw, new THREE.CylinderGeometry(.635, .635, .1, 18, 1, true), podGlow, 0, 5.3, 0, false);
  put(tw, new THREE.CylinderGeometry(.1, .14, 1.0, 6), towerM, 0, 5.95, 0);
  put(tw, new THREE.CylinderGeometry(.22, .2, .2, 12), podM, 0, 6.5, 0);
  put(tw, new THREE.CylinderGeometry(.035, .07, 1.6, 6), M('#e6e8ec'), 0, 7.4, 0);
  put(tw, new THREE.SphereGeometry(.06, 8, 6), M('#ff5a4e', { emissive: '#ff3b2f', emissiveIntensity: .8 }), 0, 8.22, 0, false);
  colliders.push({ x: TO.x - 3.3, z: TO.z - 2.3, r: .66 });

  // two maples in planters on the north side
  for (const [x, z] of [[-1.3, -3.9], [.9, -4.5]]) {
    put(g, new THREE.CylinderGeometry(.62, .66, .24, 22), mat.curb, x, .12, z);
    put(g, new THREE.CylinderGeometry(.54, .54, .02, 22), M('#8a6a4a'), x, .245, z, false);
    tree(TO.x + x, TO.z + z, .85, 'maple');
    colliders.push({ x: TO.x + x, z: TO.z + z, r: .62 });
  }

  // the train: three silver cars with a stripe in the line's colour
  const silver = M('#d9dde3', { metalness: .35, roughness: .35 }), roof = M('#eef1f4'), glass = M('#2f3a4f', { roughness: .25 }), bogie = M('#3a4258');
  const lampM = M('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: .8 }), tail = M('#ff6b5e', { emissive: '#ff3b2f', emissiveIntensity: .6 });
  for (let k = 0; k < CARS; k++) {
    const car = new THREE.Group(); g.add(car);
    const stripe = M(SUBWAY[0][1], { roughness: .45 }); subway.stripes.push(stripe);
    put(car, new THREE.BoxGeometry(CAR_L, .5, .56), silver, 0, .46, 0);
    put(car, new THREE.BoxGeometry(CAR_L - .04, .06, .5), roof, 0, .74, 0);
    put(car, new THREE.BoxGeometry(CAR_L + .002, .06, .566), stripe, 0, .32, 0, false);
    for (const s of [-1, 1]) {
      put(car, new THREE.BoxGeometry(CAR_L - .16, .15, .02), glass, 0, .57, s * .284, false);
      put(car, new THREE.BoxGeometry(.03, .34, .012), glass, -.18, .46, s * .284, false);
      put(car, new THREE.BoxGeometry(.03, .34, .012), glass, .18, .46, s * .284, false);
    }
    for (const x of [-.3, .3]) put(car, new THREE.BoxGeometry(.3, .12, .44), bogie, x, .15, 0);
    if (k === 0 || k === CARS - 1) {
      const e = k === 0 ? 1 : -1;
      put(car, new THREE.BoxGeometry(.02, .18, .42), glass, e * (CAR_L / 2 + .005), .57, 0, false);
      for (const s of [-1, 1]) put(car, new THREE.BoxGeometry(.02, .05, .08), k === 0 ? lampM : tail, e * (CAR_L / 2 + .01), .33, s * .19, false);
    }
    subway.cars.push(car);
  }
  placeTrain();
}

function drawBoard(t) {
  const c = subway.bctx, w = 320, h = 220;
  c.fillStyle = '#1b2030'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#000000'; c.fillRect(0, 0, w, 40);
  c.fillStyle = '#ffffff'; c.font = `700 19px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('TORONTO TRANSIT', 14, 21);
  c.fillStyle = '#2fb67c'; rrPath(c, w - 82, 8, 68, 26, 13); c.fill(); c.fillStyle = '#ffffff'; c.font = `700 14px ${FONT}`; c.fillText('● LIVE', w - 72, 22);
  const ptAt = (pts, u) => {
    const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let d = u * L; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const f = d / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= seg[i]; }
    return pts[pts.length - 1];
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [col, pts, dash] of TO_MAP) {
    c.strokeStyle = /** @type {string} */ (col); c.lineWidth = dash ? 5 : 8; c.setLineDash(dash ? [10, 7] : []);
    c.beginPath(); /** @type {number[][]} */ (pts).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  }
  c.setLineDash([]);
  // interchanges where the subway lines meet, and Union at the bottom of the U
  for (const [x, y] of [[118, 116], [204, 116], [118, 74], [204, 74], [204, 48], [160, 180]]) { c.fillStyle = '#ffffff'; c.strokeStyle = '#1b2030'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 5.5, 0, 7); c.fill(); c.stroke(); }
  c.fillStyle = '#c9ced8'; c.font = `600 12px ${FONT}`; c.textAlign = 'center'; c.fillText('Union', 160, 194);
  TO_MAP.forEach(([col, pts], li) => {
    const n = li === 5 || li === 4 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const s = (t * .04 + k / n + li * .17) % 1, u = s < .5 ? s * 2 : 2 - s * 2, [x, y] = ptAt(pts, u);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); c.fillStyle = /** @type {string} */ (col); c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
    }
  });
  if (subway.btex) subway.btex.needsUpdate = true;
}

function placeTrain() {
  subway.cars.forEach((car, k) => {
    const cx = subway.head - k * PITCH;
    car.position.set(cx, .07, TRACK_Z);
    // a car shows while any of it is between the two portal mouths; past them it is inside the tunnel
    car.visible = cx - CAR_L / 2 < PORTAL && cx + CAR_L / 2 > -PORTAL;
  });
}

export const subwayBusy = () => subway.phase !== 'parked';
export function updateSubway(dt, t) {
  const sw = subway;
  if (sw.phase === 'out') {
    sw.t = Math.min(1, sw.t + dt / dur.out); const u = sw.t;
    sw.head = STOP + (TO_END - STOP) * u * u * u;
    if (u >= 1) { sw.phase = 'gap'; sw.t = 0; sw.line = (sw.line + 1) % SUBWAY.length; sw.stripes.forEach(m => m.color.set(SUBWAY[sw.line][1])); sw.head = FROM; }
    placeTrain();
  } else if (sw.phase === 'gap') {
    if ((sw.t += dt) > dur.gap) { sw.phase = 'in'; sw.t = 0; }
  } else if (sw.phase === 'in') {
    sw.t = Math.min(1, sw.t + dt / dur.in); const u = 1 - sw.t;
    sw.head = STOP - (STOP - FROM) * u * u * u;
    if (sw.t >= 1) { sw.phase = 'parked'; sw.head = STOP; sw.idle = 0; }
    placeTrain();
  } else if (!reduceMotion && (sw.idle += dt) > 20) depart(true);
  sw.bAcc += dt; if (sw.bAcc > .2) { sw.bAcc = 0; drawBoard(reduceMotion ? 0 : t); }
}

function depart(auto) { subway.phase = 'out'; subway.t = 0; if (!auto) subway.idle = 0; }
export function sendSubway() {
  if (subway.phase !== 'parked') { floatText(TO.x, 3.0, TO.z + PLAT_Z, 'The next train is on its way<small>It pulls in on another line</small>', 1.8); return; }
  const [name] = SUBWAY[subway.line], [next] = SUBWAY[(subway.line + 1) % SUBWAY.length];
  depart(false);
  faceToward(TO.x, TO.z + PLAT_Z, 1.4); SFX.chime();
  floatText(TO.x, 3.1, TO.z + PLAT_Z, `${name} departing<small>Next in: ${next}. On the live map every train runs to its timetable</small>`, 3);
  markInteract('subway');
}
