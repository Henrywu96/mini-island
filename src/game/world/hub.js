// The town square: signpost, Henry's desk, the mailbox, the hamster wheel, banners and lamps.
import { THREE, scene, canvasTex, mat, mesh, put, colliders, lampMats } from '../gfx.js';
import { ISL } from '../nav.js';
import { FONT } from '../util.js';

/** @type {THREE.Group} */ export let mailFlag;
/** @type {THREE.Group} */ export let wheel;
export const banners = [];

function signpost() {
  const g = new THREE.Group(); g.position.set(0, 0, 1.2); scene.add(g);
  put(g, new THREE.CylinderGeometry(.09, .1, 3.35, 8), mat.wood2, 0, 1.675, 0);
  put(g, new THREE.SphereGeometry(.14, 10, 8), mat.coral, 0, 3.45, 0);
  const dests = [['bridgly', 'Bridgly'], ['yard', 'Stackyard'], ['transit', 'LRT Station'], ['workshop', 'Market'], ['grove', 'Skill Tree'], ['studio', 'Showroom']];
  dests.forEach(([id, label], i) => {
    const is = ISL[id], dx = is.x, dz = is.z - 1.2, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    const face = (txt, flip) => canvasTex(320, 64, (c, w, h) => {
      c.fillStyle = '#fffaf4'; c.fillRect(0, 0, w, h); c.fillStyle = '#202b45'; c.font = `600 34px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.fillText(flip ? `‹  ${txt}` : `${txt}  ›`, w / 2, h / 2 + 2);
    });
    const mats = [mat.wood, mat.wood, mat.wood, mat.wood, new THREE.MeshStandardMaterial({ map: face(label, false), roughness: .8 }), new THREE.MeshStandardMaterial({ map: face(label, true), roughness: .8 })];
    const b = mesh(new THREE.BoxGeometry(1.55, .3, .06), mats); b.position.set(ux * .82, 2.9 - i * .35, uz * .82); b.rotation.y = Math.atan2(-uz, ux); g.add(b);
  });
  colliders.push({ x: 0, z: 1.2, r: .14 });
}
function aboutDesk(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, new THREE.BoxGeometry(1.9, .1, .95), mat.wood, 0, .78, 0);
  for (const [a, b] of [[-.85, -.4], [.85, -.4], [-.85, .4], [.85, .4]]) put(g, new THREE.BoxGeometry(.08, .78, .08), mat.wood2, a, .39, b);
  put(g, new THREE.BoxGeometry(.62, .03, .42), mat.dark, -.15, .845, .1);
  const scr = new THREE.Group(); scr.position.set(-.15, .86, -.1); scr.rotation.x = -.25; g.add(scr);
  put(scr, new THREE.BoxGeometry(.62, .42, .03), mat.dark, 0, .21, 0);
  const ui = canvasTex(160, 108, (c, w, h) => { c.fillStyle = '#f5f7fb'; c.fillRect(0, 0, w, h); c.fillStyle = '#202b45'; c.fillRect(0, 0, w, 12); c.fillStyle = '#ffffff'; c.fillRect(10, 22, 40, 74); c.fillRect(58, 22, 40, 74); c.fillRect(106, 22, 40, 74); c.fillStyle = '#ec6a4e'; c.fillRect(14, 28, 32, 20); c.fillStyle = '#ffd166'; c.fillRect(62, 28, 32, 20); c.fillStyle = '#9ed67e'; c.fillRect(110, 28, 32, 20); c.fillStyle = '#c4cad6'; for (const ox of [14, 62, 110]) for (let k = 0; k < 3; k++) c.fillRect(ox, 56 + k * 10, 32 - k * 6, 4); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(.56, .36), new THREE.MeshBasicMaterial({ map: ui, toneMapped: false })); sp.position.set(0, .21, .017); scr.add(sp);
  put(g, new THREE.CylinderGeometry(.13, .1, .22, 12), mat.coral, .62, .94, .05);
  put(g, new THREE.IcosahedronGeometry(.2, 0), mat.leaf, .62, 1.18, .05); put(g, new THREE.IcosahedronGeometry(.14, 0), mat.leaf2, .7, 1.32, .0);
  put(g, new THREE.CylinderGeometry(.07, .06, .13, 10), mat.white, .3, .9, .25);
  put(g, new THREE.BoxGeometry(.6, .08, .55), mat.coralSoft, -.15, .48, .78); put(g, new THREE.BoxGeometry(.6, .6, .08), mat.coralSoft, -.15, .8, 1.03);
  for (const [a, b] of [[-.4, .55], [.1, .55], [-.4, 1.0], [.1, 1.0]]) put(g, new THREE.BoxGeometry(.05, .44, .05), mat.dark, a, .22, b);
}
function mailbox(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = .35; scene.add(g);
  put(g, new THREE.BoxGeometry(.14, 1, .14), mat.wood2, 0, .5, 0);
  put(g, new THREE.BoxGeometry(.52, .38, .78), mat.coral, 0, 1.15, 0);
  const top = put(g, new THREE.CylinderGeometry(.26, .26, .78, 18), mat.coral, 0, 1.33, 0); top.rotation.x = Math.PI / 2;
  put(g, new THREE.BoxGeometry(.4, .3, .02), mat.cream, 0, 1.2, .4);
  const flag = new THREE.Group(); flag.position.set(.29, 1.15, -.1); g.add(flag);
  put(flag, new THREE.BoxGeometry(.03, .5, .05), mat.sun, 0, .2, 0); put(flag, new THREE.BoxGeometry(.03, .16, .24), mat.sun, 0, .38, .1);
  return flag;
}

export function initHub() {
  signpost();
  aboutDesk(-3.6, -4.4);
  mailFlag = mailbox(3.6, -4.4);
  wheel = (() => {
    const g = new THREE.Group(); g.position.set(-2.2, 0, -6.6); scene.add(g);
    put(g, new THREE.BoxGeometry(1.1, .08, .5), mat.wood, 0, .04, 0);
    for (const s of [-1, 1]) put(g, new THREE.BoxGeometry(.06, .7, .06), mat.wood2, 0, .4, s * .2);
    const w = new THREE.Group(); w.position.set(0, .72, 0); g.add(w);
    for (const s of [-1, 1]) put(w, new THREE.TorusGeometry(.55, .035, 8, 32), mat.coral, 0, 0, s * .16);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = put(w, new THREE.CylinderGeometry(.018, .018, .32, 4), mat.steel, Math.cos(a) * .55, Math.sin(a) * .55, 0); b.rotation.x = Math.PI / 2; }
    colliders.push({ x: -2.2, z: -6.6, r: .6 }); return w;
  })();
  [[-3, 7.3], [3, 7.3]].forEach(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    put(g, new THREE.CylinderGeometry(.05, .06, 2.8, 8), mat.wood2, 0, 1.4, 0);
    put(g, new THREE.SphereGeometry(.09, 8, 6), mat.sun, 0, 2.85, 0);
    const tex = canvasTex(128, 192, (c, w, h) => { c.fillStyle = '#ec6a4e'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w / 2, h - 34); c.lineTo(0, h); c.closePath(); c.fill(); c.fillStyle = '#202b45'; c.font = `700 72px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', w / 2, 72); c.fillStyle = '#ffd166'; c.fillRect(16, 128, w - 32, 6); });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .9 }));
    f.position.set(.42, 2.05, 0); f.castShadow = true; g.add(f); banners.push(f);
    colliders.push({ x, z, r: .2 });
  });
  [[-6.4, 2.6], [6.4, 2.6], [-5.6, -6.2], [5.6, -6.2]].forEach(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    put(g, new THREE.CylinderGeometry(.05, .07, 1.9, 8), mat.navy, 0, .95, 0);
    const lm = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd58a', emissiveIntensity: .25 }); lampMats.push(lm);
    put(g, new THREE.SphereGeometry(.16, 12, 10), lm, 0, 1.98, 0, false);
    put(g, new THREE.ConeGeometry(.22, .14, 12), mat.navy, 0, 2.15, 0);
    colliders.push({ x, z, r: .18 });
  });
}
