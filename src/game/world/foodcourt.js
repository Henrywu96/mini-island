// The food court around the duck pond: Auntie Mei's bubble tea stand, Uncle Lin's night market cart,
// Chef Rosa's poutine truck, picnic tables and a loop of string lights that glow at night.
import { THREE, scene, canvasTex, M, mat, put, colliders, boxes, lampMats, puffTex } from '../gfx.js';
import { FONT, rrPath, reduceMotion } from '../util.js';
import { spriteBurst } from '../play/fx.js';
import { WXS } from '../sky/weather.js';

/** world spots the townsfolk actions use for their effects */
export const FC = {
  boba: new THREE.Vector3(-5.85, 1.25, 15.9),
  griddle: new THREE.Vector3(5.71, 1.1, 16.4),
  window: new THREE.Vector3(-.55, 1.6, 23.47),
  fryer: new THREE.Vector3(1.2, 1.6, 21.75),
};
const lanterns = [];
let sizzleT = 0, grillGlow = null;

function sign(text, w, h, bg, fg, sub) {
  return canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
    c.fillStyle = bg; rrPath(c, 0, 0, W, H, 22); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 6; rrPath(c, 8, 8, W - 16, H - 16, 16); c.stroke();
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${sub ? 64 : 72}px ${FONT}`; c.fillText(text, W / 2, sub ? H * .42 : H / 2 + 3, W - 40);
    if (sub) { c.font = `600 34px ${FONT}`; c.globalAlpha = .85; c.fillText(sub, W / 2, H * .76, W - 40); c.globalAlpha = 1; }
  });
}
function signPlane(parent, tex, w, h, x, y, z, ry = 0, oneSided = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .7, side: oneSided ? THREE.FrontSide : THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
}
const stripes = (a, b) => canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? b : a; c.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
function addBox(gx, gz, yaw, lx, lz, hw, hd) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  boxes.push({ x: gx + lx * c + lz * s, z: gz - lx * s + lz * c, c, s, hw, hd });
}
function boba(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  put(g, new THREE.CylinderGeometry(.075, .06, .2, 14), new THREE.MeshStandardMaterial({ color: '#f3e3cf', roughness: .2, transparent: true, opacity: .85 }), 0, .1, 0, false);
  put(g, new THREE.CylinderGeometry(.068, .058, .1, 14), M('#c08552'), 0, .07, 0, false);
  for (let i = 0; i < 5; i++) put(g, new THREE.SphereGeometry(.018, 6, 5), M('#2a1a12'), Math.cos(i * 1.3) * .03, .03, Math.sin(i * 1.3) * .03, false);
  put(g, new THREE.CylinderGeometry(.078, .078, .012, 14), M('#ffffff'), 0, .205, 0, false);
  const straw = put(g, new THREE.CylinderGeometry(.01, .01, .22, 6), M('#ec6a4e'), .02, .27, 0, false); straw.rotation.z = -.15;
  return g;
}

export function initFoodCourt() {
  /* ---- Auntie Mei's bubble tea stand, facing east across the pond ---- */
  {
    const gx = -6.6, gz = 16.2, yaw = Math.PI / 2;
    const g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = yaw; scene.add(g);
    const wood = M('#e3b07c'), pink = M('#f6a6b2'), cream = mat.cream;
    put(g, new THREE.BoxGeometry(1.9, .98, .5), wood, 0, .49, .75);
    put(g, new THREE.BoxGeometry(2.0, .06, .6), cream, 0, 1.01, .75);
    put(g, new THREE.BoxGeometry(1.9, .22, .02), pink, 0, .72, 1.005, false);
    put(g, new THREE.BoxGeometry(2.0, 2.3, .08), wood, 0, 1.15, -.42);
    for (let k = 0; k < 3; k++) put(g, new THREE.BoxGeometry(1.6, .04, .22), cream, 0, 1.25 + k * .38, -.28);
    ['#c08552', '#e8cfa8', '#9ad86f', '#f6a6b2', '#c08552', '#ffd166'].forEach((col, i) => put(g, new THREE.CylinderGeometry(.08, .08, .22, 12), M(col, { roughness: .3 }), -.55 + (i % 3) * .55, 1.38 + Math.floor(i / 3) * .38, -.28));
    for (const sx of [-.96, .96]) for (const sz of [-.36, 1.02]) put(g, new THREE.CylinderGeometry(.04, .04, 2.5, 8), M('#fffaf4'), sx, 1.25, sz);
    const aw = put(g, new THREE.BoxGeometry(2.25, .06, 1.75), new THREE.MeshStandardMaterial({ map: stripes('#f6a6b2', '#fffaf4'), roughness: .8 }), 0, 2.55, .35); aw.rotation.x = .1;
    signPlane(g, sign('BUBBLE TEA', 2, .55, '#f27b78', '#ffffff', 'brown sugar · fresh pearls'), 1.7, .47, 0, 2.95, 1.0);
    // a tea urn and cups on the counter
    put(g, new THREE.CylinderGeometry(.14, .16, .42, 16), M('#cfd6df', { metalness: .4, roughness: .3 }), -.62, 1.25, .7);
    put(g, new THREE.BoxGeometry(.05, .05, .12), mat.dark, -.62, 1.13, .85);
    boba(g, .1, 1.04, .82); boba(g, .3, 1.04, .7); boba(g, .5, 1.04, .84);
    addBox(gx, gz, yaw, 0, .3, 1.05, .78);
  }
  /* ---- Uncle Lin's night market cart, facing west across the pond ---- */
  {
    const gx = 6.45, gz = 16.2, yaw = -Math.PI / 2;
    const g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = yaw; scene.add(g);
    const red = M('#d9483b'), wood = M('#a8724a'), gold = M('#ffd166');
    put(g, new THREE.BoxGeometry(1.9, .6, .62), red, 0, .62, .72);
    put(g, new THREE.BoxGeometry(2.0, .06, .7), wood, 0, .95, .72);
    for (const sx of [-1.02, 1.02]) {
      const wh = put(g, new THREE.TorusGeometry(.32, .05, 8, 22), mat.dark, sx, .34, .72); wh.rotation.y = Math.PI / 2;
      const hub = put(g, new THREE.CylinderGeometry(.06, .06, .08, 10), gold, sx, .34, .72); hub.rotation.z = Math.PI / 2;
      for (let k = 0; k < 4; k++) { const sp = put(g, new THREE.BoxGeometry(.02, .6, .02), mat.dark, sx, .34, .72, false); sp.rotation.x = k * Math.PI / 4; }
    }
    // griddle with pancakes
    put(g, new THREE.BoxGeometry(.9, .06, .44), mat.dark, .2, 1.0, .74);
    grillGlow = new THREE.MeshStandardMaterial({ color: '#3a3142', emissive: '#ff6a2a', emissiveIntensity: .15, roughness: .4 });
    put(g, new THREE.BoxGeometry(.84, .012, .38), grillGlow, .2, 1.036, .74, false);
    for (const [px, pz] of [[-.05, .7], [.25, .82], [.48, .66]]) { const pc = put(g, new THREE.CylinderGeometry(.11, .11, .025, 18), M('#e9b25f', { roughness: .6 }), px, 1.05, pz, false); pc.rotation.y = px * 3; }
    put(g, new THREE.BoxGeometry(.4, .14, .3), M('#fff3d6'), -.65, 1.05, .72);
    // roof on two poles with paper lanterns
    for (const sx of [-.95, .95]) put(g, new THREE.CylinderGeometry(.035, .035, 1.7, 8), wood, sx, 1.8, .4);
    const roof = put(g, new THREE.BoxGeometry(2.3, .06, 1.25), new THREE.MeshStandardMaterial({ map: stripes('#d9483b', '#fff1de'), roughness: .8 }), 0, 2.66, .55); roof.rotation.x = -.12;
    signPlane(g, sign('NIGHT MARKET', 2, .55, '#d9483b', '#ffd166', 'scallion pancakes'), 1.7, .47, 0, 3.02, 1.05);
    const lanternM = new THREE.MeshStandardMaterial({ color: '#ff5a4a', emissive: '#ff8a5a', emissiveIntensity: .25, roughness: .6 }); lampMats.push(lanternM);
    for (const sx of [-.7, 0, .7]) {
      const piv = new THREE.Group(); piv.position.set(sx, 2.58, 1.08); g.add(piv);
      put(piv, new THREE.CylinderGeometry(.006, .006, .2, 4), mat.dark, 0, -.1, 0, false);
      const l = put(piv, new THREE.SphereGeometry(.13, 14, 10), lanternM, 0, -.3, 0, false); l.scale.y = 1.2;
      put(piv, new THREE.CylinderGeometry(.07, .07, .04, 10), gold, 0, -.15, 0, false); put(piv, new THREE.CylinderGeometry(.07, .07, .04, 10), gold, 0, -.46, 0, false);
      lanterns.push({ piv, ph: sx * 3 });
    }
    // a little stool behind the cart
    put(g, new THREE.CylinderGeometry(.17, .15, .42, 12), wood, .8, .21, -.2);
    addBox(gx, gz, yaw, 0, .55, 1.12, .45);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    colliders.push({ x: gx + .8 * c - .2 * s, z: gz - .8 * s - .2 * c, r: .2 });
  }
  /* ---- Chef Rosa's Prairie Poutine truck, parked south of the pond with its window to the showroom plaza ---- */
  {
    // built with the window on its local -z side, then turned to face south
    const g = new THREE.Group(); g.position.set(0, 0, 22.3); g.rotation.y = Math.PI; scene.add(g);
    const body = M('#fdf6ec', { roughness: .5 }), green = M('#2fb67c', { roughness: .5 }), trim = M('#2a3656'), inside = M('#4a4f63', { roughness: .9 });
    const FZ = -.95; // the window side
    // chassis, floor, wheels
    put(g, new THREE.BoxGeometry(5.1, .3, 1.85), trim, .5, .42, 0);
    put(g, new THREE.BoxGeometry(4.0, .06, 1.8), inside, 0, .52, 0, false);
    for (const wx of [-1.35, 1.35, 2.45]) for (const wz of [-.92, .92]) {
      const w = put(g, new THREE.CylinderGeometry(.36, .36, .22, 18), mat.dark, wx, .36, wz); w.rotation.x = Math.PI / 2;
      const hb = put(g, new THREE.CylinderGeometry(.14, .14, .23, 12), mat.steel, wx, .36, wz); hb.rotation.x = Math.PI / 2;
    }
    // box body: back, sides, roof, and a front wall around the serving window
    put(g, new THREE.BoxGeometry(4.0, 2.5, .07), body, 0, 1.8, .9);
    for (const sx of [-1.97, 1.97]) put(g, new THREE.BoxGeometry(.07, 2.5, 1.8), body, sx, 1.8, 0);
    put(g, new THREE.BoxGeometry(4.12, .12, 1.95), body, 0, 3.1, 0);
    put(g, new THREE.BoxGeometry(4.0, .85, .07), body, 0, .98, FZ);
    put(g, new THREE.BoxGeometry(4.0, .5, .07), body, 0, 2.8, FZ);
    for (const sx of [-1.6, 1.6]) put(g, new THREE.BoxGeometry(.8, 1.15, .07), body, sx, 1.98, FZ);
    put(g, new THREE.BoxGeometry(4.02, .26, 1.86), green, 0, .78, 0);
    put(g, new THREE.BoxGeometry(4.02, .08, 1.86), green, 0, 2.62, 0);
    // dark interior so the window reads, a fryer and a shelf
    put(g, new THREE.BoxGeometry(3.9, 2.4, .02), inside, 0, 1.8, .86, false);
    put(g, new THREE.BoxGeometry(.7, .9, .5), mat.steel, -1.2, 1.05, .55);
    put(g, new THREE.BoxGeometry(.6, .05, .4), M('#d9a64a', { roughness: .4 }), -1.2, 1.52, .55, false);
    put(g, new THREE.BoxGeometry(1.4, .05, .3), mat.wood, .9, 2.1, .7);
    for (let k = 0; k < 4; k++) put(g, new THREE.CylinderGeometry(.06, .06, .18, 10), M(['#ec6a4e', '#ffd166', '#2fb67c', '#3b82f6'][k]), .45 + k * .3, 2.22, .7);
    // serving shelf with a poutine and a napkin box, the awning flap and the cab
    put(g, new THREE.BoxGeometry(2.5, .06, .42), mat.wood, 0, 1.42, FZ - .2);
    for (const sx of [-.9, .9]) { const br = put(g, new THREE.BoxGeometry(.05, .3, .05), trim, sx, 1.27, FZ - .2); br.rotation.x = .6; }
    {
      const p = new THREE.Group(); p.position.set(.55, 1.45, FZ - .22); g.add(p);
      put(p, new THREE.BoxGeometry(.3, .1, .22), M('#e9e1d3'), 0, .05, 0, false);
      for (let i = 0; i < 9; i++) { const f = put(p, new THREE.BoxGeometry(.03, .03, .16), M('#f4c35a'), -.1 + (i % 3) * .1, .12 + Math.floor(i / 3) * .02, 0, false); f.rotation.y = i * .7; }
      put(p, new THREE.SphereGeometry(.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#8a5a2c', { roughness: .3 }), 0, .1, 0, false).scale.set(1.1, .35, .8);
      for (let i = 0; i < 4; i++) put(p, new THREE.BoxGeometry(.04, .03, .04), M('#fffaf0'), -.06 + i * .04, .15, (i % 2) * .04 - .02, false);
    }
    put(g, new THREE.BoxGeometry(.2, .16, .14), M('#ffffff'), -.7, 1.53, FZ - .22);
    const flap = new THREE.Group(); flap.position.set(0, 2.6, FZ - .04); g.add(flap);
    put(flap, new THREE.BoxGeometry(2.6, .05, 1.0), new THREE.MeshStandardMaterial({ map: stripes('#2fb67c', '#fdf6ec'), roughness: .8 }), 0, 0, -.5); flap.rotation.x = .38;
    put(g, new THREE.BoxGeometry(1.05, 1.6, 1.82), green, 2.5, 1.37, 0);
    put(g, new THREE.BoxGeometry(.02, .62, 1.5), M('#a9d6ee', { roughness: .2 }), 3.03, 1.75, 0, false);
    for (const sz of [-.92, .92]) put(g, new THREE.BoxGeometry(.6, .5, .02), M('#a9d6ee', { roughness: .2 }), 2.5, 1.75, sz * 1.0, false);
    put(g, new THREE.BoxGeometry(.1, .2, 1.9), trim, 3.07, .78, 0);
    for (const sz of [-.65, .65]) { const hl = put(g, new THREE.CylinderGeometry(.1, .1, .04, 12), M('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: .4 }), 3.07, 1.08, sz, false); hl.rotation.z = Math.PI / 2; }
    // roof sign
    for (const sx of [-1.2, 1.2]) put(g, new THREE.BoxGeometry(.06, .4, .06), trim, sx, 3.36, -.5);
    const ptex = sign('PRAIRIE POUTINE', 2.6, .62, '#2fb67c', '#ffffff', 'fries · gravy · squeaky curds');
    signPlane(g, ptex, 2.9, .7, 0, 3.6, -.53, Math.PI, true); signPlane(g, ptex, 2.9, .7, 0, 3.6, -.47, 0, true);
    boxes.push({ x: -.5, z: 22.3, c: 1, s: 0, hw: 2.6, hd: 1.0 });
  }
  /* ---- picnic tables with parasols ---- */
  for (const [x, z, ry, col] of [[-4.7, 20.3, .55, '#ec6a4e'], [4.6, 20.1, -.5, '#3b82f6'], [3.7, 12.2, .25, '#ffd166']]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    put(g, new THREE.BoxGeometry(1.5, .07, .72), mat.wood, 0, .74, 0);
    for (const sz of [-.62, .62]) put(g, new THREE.BoxGeometry(1.5, .06, .28), mat.wood, 0, .44, sz);
    for (const sx of [-.6, .6]) { const l1 = put(g, new THREE.BoxGeometry(.07, .9, .07), mat.wood2, sx, .4, 0); l1.rotation.x = .78; const l2 = put(g, new THREE.BoxGeometry(.07, .9, .07), mat.wood2, sx, .4, 0); l2.rotation.x = -.78; }
    put(g, new THREE.CylinderGeometry(.03, .03, 2.2, 8), mat.white, 0, 1.4, 0);
    const um = put(g, new THREE.ConeGeometry(1.15, .45, 10, 1, true), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: .7 }), 0, 2.4, 0);
    um.material.flatShading = true;
    boba(g, -.35, .78, .1, .9);
    colliders.push({ x, z, r: .95 });
  }
  /* ---- string lights looping around the court ---- */
  {
    const poles = [[-3.3, 10.6], [3.3, 10.6]];
    for (const [x, z] of poles) { put(scene, new THREE.CylinderGeometry(.05, .06, 3.0, 8), mat.navy, x, 1.5, z); put(scene, new THREE.SphereGeometry(.08, 8, 6), mat.sun, x, 3.04, z); colliders.push({ x, z, r: .12 }); }
    const runs = [
      [[-5.55, 2.62, 15.2], [-3.3, 2.98, 10.6]], [[-3.3, 2.98, 10.6], [3.3, 2.98, 10.6]], [[3.3, 2.98, 10.6], [5.55, 2.7, 15.2]],
      [[-5.55, 2.62, 17.2], [-2.0, 3.16, 21.36]], [[-2.0, 3.16, 21.36], [2.0, 3.16, 21.36]], [[2.0, 3.16, 21.36], [5.55, 2.7, 17.2]],
    ];
    const cols = ['#ffd166', '#ff9a76', '#9ed6ff', '#b6f09c', '#f6a6b2'];
    const bulbM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe3a8', emissiveIntensity: .25, roughness: .4 }); lampMats.push(bulbM);
    const total = runs.reduce((n, [a, b]) => n + Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / .55)), 0);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 8, 6), bulbM, total); bulbs.frustumCulled = false;
    const wireM = new THREE.LineBasicMaterial({ color: '#3a4258' }), tmp = new THREE.Object3D(), col = new THREE.Color();
    let k = 0;
    for (const [a, b] of runs) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B), sag = .25 + L * .05, pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3().lerpVectors(A, B, u).add(new THREE.Vector3(0, -4 * sag * u * (1 - u), 0))); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
      const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / .55));
      for (let i = 0; i < n; i++) {
        const u = (i + .5) / n; tmp.position.lerpVectors(A, B, u); tmp.position.y -= 4 * sag * u * (1 - u) + .07; tmp.updateMatrix();
        bulbs.setMatrixAt(k, tmp.matrix); bulbs.setColorAt(k, col.set(cols[k % cols.length])); k++;
      }
    }
    bulbs.count = k; scene.add(bulbs);
  }
}

/** a puff of steam or a sizzle at one of the stalls */
export function stallPuff(where, n = 6) {
  const p = FC[where]; if (!p) return;
  spriteBurst(p.x, p.y + .2, p.z, puffTex, n, { size: .35, up: .9, spread: .3, life: 1.5 });
}
export function updateFoodCourt(dt, t) {
  if (!reduceMotion) lanterns.forEach(l => { l.piv.rotation.z = Math.sin(t * 1.6 + l.ph) * (.06 + WXS.wind * .25); l.piv.rotation.x = Math.sin(t * 1.1 + l.ph) * .04; });
  sizzleT -= dt;
  if (sizzleT <= 0 && !reduceMotion) { sizzleT = 1.8 + Math.random() * 1.5; spriteBurst(FC.fryer.x, FC.fryer.y, FC.fryer.z, puffTex, 1, { size: .3, up: .6, spread: .15, life: 1.6 }); spriteBurst(FC.griddle.x, FC.griddle.y, FC.griddle.z, puffTex, 1, { size: .25, up: .6, spread: .2, life: 1.3 }); }
  if (grillGlow) grillGlow.emissiveIntensity = .15 + Math.sin(t * 3.1) * .05;
}
