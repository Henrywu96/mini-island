// The Skill Tree park: a big tree with six glowing skill orbs that you can shake loose.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene, mat, put, colliders, leafTex } from '../gfx.js';
import { SKILLS } from '../../data/content.js';
import { reduceMotion } from '../util.js';
import { faceToward, emote } from '../actors/henry.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';

const orbs = [];
let crown = null, shakeT = 0;
export function initGrove() {
  crown = new THREE.Group();
  const x = -17.4, z = 15.5, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, new THREE.CylinderGeometry(.42, .7, 3.4, 9), mat.trunk, 0, 1.7, 0);
  for (const [a, y, l] of [[.6, 2.6, 1.2], [2.6, 2.9, 1.1], [4.4, 2.4, 1.0]]) { const br = put(g, new THREE.CylinderGeometry(.1, .18, l, 6), mat.trunk, Math.cos(a) * .45, y, Math.sin(a) * .45); br.rotation.z = Math.cos(a) * .9; br.rotation.x = -Math.sin(a) * .9; }
  crown.position.y = 3.2; g.add(crown);
  const canopy = [[0, 4.6, 0, 2.0], [1.3, 4.0, .6, 1.4], [-1.3, 4.1, -.4, 1.5], [.4, 4.3, -1.3, 1.35], [-.4, 5.5, .3, 1.3], [-.6, 3.9, 1.2, 1.2]];
  canopy.forEach(([cx, cy, cz, r], i) => put(crown, new THREE.IcosahedronGeometry(r, 1), i % 2 ? mat.leaf2 : mat.leaf, cx, cy - 3.2, cz));
  const cols = ['#ec6a4e', '#ffd166', '#3b82f6', '#8b5cf6', '#2fb67c', '#f27b78'];
  SKILLS.forEach(([name], i) => {
    const a = i / SKILLS.length * Math.PI * 2 + .3, r = 2.05, y = 3.3 + (i % 2) * .9 - 3.2;
    const m = new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: .9, roughness: .3 });
    const o = put(crown, new THREE.SphereGeometry(.27, 16, 12), m, Math.cos(a) * r, y, Math.sin(a) * r, false);
    const el = document.createElement('div'); el.className = 'orb-label'; el.textContent = name;
    const lab = new CSS2DObject(el); lab.position.y = .5; o.add(lab);
    orbs.push({ m: o, base: y, ph: i, mat: m });
  });
  colliders.push({ x, z, r: .8 });
}
export function shakeTree() {
  faceToward(-17.4, 15.5, 1.6); emote('shake', 1.3); shakeT = 1.4;
  spriteBurst(-17.4, 4.4, 15.5, leafTex, 14, { size: .3, up: .5, spread: 2.6, life: 2.2, g: 1.2, spin: 2 });
  const [name] = SKILLS[Math.floor(Math.random() * SKILLS.length)];
  floatText(-17.4, 6.3, 15.5, `${name}<small>An ability fell out of the tree</small>`, 2.4);
  markInteract('shake');
}
export function updateGrove(dt, t) {
  if (!reduceMotion) orbs.forEach(o => { o.m.position.y = o.base + Math.sin(t * 1.5 + o.ph) * .12; });
  if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); const amp = reduceMotion ? 0 : shakeT * .1; crown.rotation.z = Math.sin(t * 30) * amp; crown.rotation.x = Math.cos(t * 26) * amp * .6; }
  orbs.forEach(o => { o.mat.emissiveIntensity = .9 + shakeT * 2.2; });
}
export const groveShaking = () => shakeT > 0;
