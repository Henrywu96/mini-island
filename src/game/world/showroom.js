// Arcline showroom: the electric car on a turntable, with paint you can change.
import { THREE, scene, canvasTex, M, put, colliders, sparkTex } from '../gfx.js';
import { FONT, rrPath, reduceMotion } from '../util.js';
import { bench } from './bridgly.js';
import { faceToward } from '../actors/henry.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { SFX } from '../sound.js';

function demoSign(group, title, y, width = 2.5) {
  const tex = canvasTex(512, 120, (c, w, h) => {
    c.fillStyle = '#fffaf4'; rrPath(c, 0, 0, w, h, 16); c.fill();
    c.fillStyle = '#26334b'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 55px ' + FONT; c.fillText(title, w / 2, h / 2 + 3, w - 36);
  });
  // two one-sided boards back to back, so the name reads correctly from either side
  for (const [dz, ry] of [[-.01, 0], [.01, Math.PI]]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(width, .56), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    board.position.set(0, y, -1.26 + dz); board.rotation.y = ry; group.add(board);
  }
}
const ARC = { x: 0, z: 31.2, s: 1.5 };
const ARC_PAINTS = [['Silver', '#cbd7df'], ['Red', '#c8553d'], ['Blue', '#2f6fdd'], ['Midnight', '#2a3656'], ['White', '#f4f4f2']];
const arcline = { turn: null, paint: null, pi: 0, spin: 0, lights: null, flash: 0 };

export function initShowroom() {
  const g = new THREE.Group(); g.position.set(ARC.x, .02, ARC.z); g.scale.setScalar(ARC.s); scene.add(g);
  const graphite = M('#303c4e', { metalness: .35, roughness: .3 });
  const silver = M(ARC_PAINTS[0][1], { metalness: .55, roughness: .26 }); arcline.paint = silver;
  put(g, new THREE.CylinderGeometry(1.55, 1.6, .17, 40), M('#e9edf1'), 0, .1, 0);
  put(g, new THREE.TorusGeometry(1.45, .075, 10, 56, Math.PI), M('#5c6f89', { metalness: .6 }), 0, 1.02, .9);
  const turn = new THREE.Group(); turn.position.y = .19; g.add(turn); arcline.turn = turn;
  put(turn, new THREE.CylinderGeometry(1.2, 1.2, .04, 40), M('#d7dde4', { metalness: .3, roughness: .35 }), 0, 0, 0, false);
  const car = new THREE.Group(); car.position.set(0, -.19, .18); turn.add(car);
  put(car, new THREE.BoxGeometry(1.8, .36, .97), silver, 0, .57, -.18);
  put(car, new THREE.BoxGeometry(1.05, .35, .8), M('#87b8c9'), 0, .92, -.14);
  put(car, new THREE.BoxGeometry(1.82, .1, 1.02), graphite, 0, .4, -.18);
  for (const x of [-.91, .91]) for (const z of [-.55, .2]) {
    const wh = put(car, new THREE.CylinderGeometry(.24, .24, .12, 16), graphite, x, .37, z); wh.rotation.z = Math.PI / 2;
    const hub = put(car, new THREE.CylinderGeometry(.1, .1, .125, 12), M('#cbd7df', { metalness: .55, roughness: .26 }), x * 1.005, .37, z); hub.rotation.z = Math.PI / 2;
  }
  const lightM = M('#d6f4ff', { emissive: '#84ddff', emissiveIntensity: .6 }); arcline.lights = lightM;
  put(car, new THREE.BoxGeometry(1.5, .055, .025), lightM, 0, .68, -.68);
  demoSign(g, 'ARCLINE ONE', 2.55, 2.35);
  colliders.push({ x: ARC.x, z: ARC.z, r: 1.6 * ARC.s });
  // a charging post beside the showroom
  const ch = new THREE.Group(); ch.position.set(ARC.x + 3.4, 0, ARC.z + 1.6); ch.rotation.y = -.6; scene.add(ch);
  put(ch, new THREE.BoxGeometry(.4, 1.3, .3), M('#e9edf1'), 0, .65, 0); put(ch, new THREE.BoxGeometry(.3, .3, .02), M('#2a3656'), 0, .95, .16, false);
  put(ch, new THREE.BoxGeometry(.32, .05, .02), M('#7fe0ff', { emissive: '#4cc9ff', emissiveIntensity: .8 }), 0, .72, .16, false);
  colliders.push({ x: ARC.x + 3.4, z: ARC.z + 1.6, r: .35 });
  for (const sx of [-1, 1]) bench(ARC.x + sx * 3.5, ARC.z + 2.4, Math.atan2(-sx * 3.5, -2.4));
}
export function changePaint() {
  arcline.pi = (arcline.pi + 1) % ARC_PAINTS.length; const [name, col] = ARC_PAINTS[arcline.pi];
  arcline.paint.color.set(col); arcline.spin = 1.6; arcline.flash = 1;
  faceToward(ARC.x, ARC.z, 1.4); SFX.pop();
  spriteBurst(ARC.x, 2.2, ARC.z, sparkTex, 10, { size: .28, up: 1.6, spread: 2.2 });
  floatText(ARC.x, 2.9, ARC.z, `${name} paint<small>Try every option in the live configurator</small>`, 2.4);
  markInteract('paint');
}
export function updateShowroom(dt) {
  arcline.spin = Math.max(0, arcline.spin - dt);
  if (!reduceMotion) arcline.turn.rotation.y += dt * (.22 + arcline.spin * 2.2);
  arcline.flash = Math.max(0, arcline.flash - dt * 1.2);
  arcline.lights.emissiveIntensity = .6 + Math.abs(Math.sin(arcline.flash * 12)) * arcline.flash * 2.5;
}
