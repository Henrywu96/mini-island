// Little visual effects: confetti, sprite bursts, floating text, click ripples and the hover ring.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene } from '../gfx.js';
import { SFX } from '../sound.js';

const parts = [];
let partGeo = null;
export function burst(x, y, z, colors, n = 18, power = 4) {
  if (!partGeo) partGeo = new THREE.BoxGeometry(.12, .12, .12);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, toneMapped: false }));
    m.position.set(x, y, z); scene.add(m);
    const a = Math.random() * Math.PI * 2, s = power * (.5 + Math.random() * .7);
    parts.push({ m, v: new THREE.Vector3(Math.cos(a) * s * .6, 2.5 + Math.random() * power, Math.sin(a) * s * .6), life: 1.2 + Math.random() * .5 });
  }
}

const sparts = [];
export function spriteBurst(x, y, z, tex, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    s.position.set(x + (Math.random() - .5) * .6, y, z + (Math.random() - .5) * .6);
    s.scale.setScalar((o.size || .35) * (.7 + Math.random() * .6)); scene.add(s);
    const sp = o.spread || 1, life = (o.life || 1.4) * (.8 + Math.random() * .4);
    sparts.push({ s, v: new THREE.Vector3((Math.random() - .5) * sp, (o.up || 1.6) * (.6 + Math.random() * .6), (Math.random() - .5) * sp), g: o.g || 0, life, max: life, spin: o.spin || 0 });
  }
}

const ftexts = [];
/** Floating label in the world. `html` is always written by the game itself. */
export function floatText(x, y, z, html, dur = 2.2) {
  const el = document.createElement('div'); el.className = 'ftext'; el.innerHTML = html;
  const o = new CSS2DObject(el); o.position.set(x, y, z); scene.add(o);
  ftexts.push({ o, el, t: 0, dur, y });
}

/* click ripple, destination dot and hover ring */
/** @type {THREE.Mesh} */ export let hoverRing;
/** @type {THREE.Mesh} */ export let ripple;
/** @type {THREE.Mesh} */ export let destDot;
let rippleT = 1;
export function initFx() {
  hoverRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.14, 48), new THREE.MeshBasicMaterial({ color: '#ec6a4e', transparent: true, opacity: .8, depthWrite: false, toneMapped: false }));
  hoverRing.rotation.x = -Math.PI / 2; hoverRing.visible = false; scene.add(hoverRing);
  ripple = new THREE.Mesh(new THREE.RingGeometry(.3, .42, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  ripple.rotation.x = -Math.PI / 2; scene.add(ripple);
  destDot = new THREE.Mesh(new THREE.CircleGeometry(.16, 24), new THREE.MeshBasicMaterial({ color: '#ec6a4e', transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
  destDot.rotation.x = -Math.PI / 2; destDot.visible = false; scene.add(destDot);
}
export function markAt(x, z, y = 0) { ripple.position.set(x, y + .05, z); rippleT = 0; SFX.click(); }

export function updateFx(dt) {
  if (rippleT < 1) { rippleT = Math.min(1, rippleT + dt / .6); ripple.scale.setScalar(.6 + rippleT * 2.2); /** @type {any} */ (ripple.material).opacity = .9 * (1 - rippleT); }
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; q.v.y -= 9 * dt; q.m.position.addScaledVector(q.v, dt); q.m.rotation.x += dt * 6; q.m.material.opacity = Math.min(1, q.life * 1.5); if (q.life <= 0) { scene.remove(q.m); q.m.material.dispose(); parts.splice(i, 1); } }
  for (let i = sparts.length - 1; i >= 0; i--) { const q = sparts[i]; q.life -= dt; q.v.y -= q.g * dt; q.s.position.addScaledVector(q.v, dt); q.s.material.rotation += q.spin * dt; q.s.material.opacity = Math.min(1, q.life / q.max * 1.8); if (q.life <= 0) { scene.remove(q.s); q.s.material.dispose(); sparts.splice(i, 1); } }
  for (let i = ftexts.length - 1; i >= 0; i--) { const f = ftexts[i]; f.t += dt; f.o.position.y = f.y + Math.min(1, f.t / f.dur) * .8; f.el.style.opacity = String(f.t < .2 ? f.t / .2 : f.t > f.dur * .7 ? Math.max(0, (f.dur - f.t) / (f.dur * .3)) : 1); if (f.t >= f.dur) { scene.remove(f.o); ftexts.splice(i, 1); } }
}
