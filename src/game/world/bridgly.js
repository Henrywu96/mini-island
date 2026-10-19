// The Bridgly garden: a floating heart, benches and the little lookout cottage you can send hugs to.
import { THREE, scene, mat, mesh, put, colliders, lampMats, heartTex } from '../gfx.js';
import { reduceMotion } from '../util.js';
import { P } from '../play/player.js';
import { faceToward, emote } from '../actors/henry.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { SFX } from '../sound.js';

/** @type {THREE.Mesh} */ export let heart;
let heartPulse = 0;
const hugs = [];

function heartGeo() {
  const s = new THREE.Shape(), x = 0, y = 0;
  s.moveTo(x + 5, y + 5); s.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y); s.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
  s.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19); s.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
  s.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y); s.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 3, curveSegments: 18 });
  g.center(); g.rotateZ(Math.PI); g.scale(.085, .085, .085); return g;
}
export function bench(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  put(g, new THREE.BoxGeometry(1.3, .08, .42), mat.wood, 0, .45, 0); put(g, new THREE.BoxGeometry(1.3, .34, .06), mat.wood, 0, .72, -.2);
  for (const s of [-1, 1]) put(g, new THREE.BoxGeometry(.08, .45, .38), mat.navy, s * .55, .22, 0);
  colliders.push({ x, z, r: .6 });
  return g;
}
export function initBridgly() {
  heart = mesh(heartGeo(), new THREE.MeshStandardMaterial({ color: '#f27b78', roughness: .45, emissive: '#f27b78', emissiveIntensity: .15 }));
  heart.position.set(0, 5.4, -26.4); scene.add(heart);
  bench(-2.5, -20.6, Math.PI / 2); bench(2.5, -20.6, -Math.PI / 2);
  const g = new THREE.Group(); g.position.set(10, 0, -27.9); g.rotation.y = -.5; scene.add(g);
  put(g, new THREE.BoxGeometry(1.1, .8, 1.0), mat.cream, 0, .4, 0);
  const roof = put(g, new THREE.ConeGeometry(.95, .7, 4), mat.coral, 0, 1.15, 0); roof.rotation.y = Math.PI / 4;
  put(g, new THREE.BoxGeometry(.3, .5, .03), mat.wood2, 0, .25, .51);
  { const wm = new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: '#ffd58a', emissiveIntensity: .6 }); lampMats.push(wm); put(g, new THREE.BoxGeometry(.24, .22, .03), wm, .33, .5, .51); }
  colliders.push({ x: 10, z: -27.9, r: .75 });
}

export function sendHug() {
  faceToward(10, -27.9, 2); emote('send', 1.4); heartPulse = 1; SFX.chime();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(.45); s.visible = false; scene.add(s);
    hugs.push({ s, t: -i * .12, last: i === 5, p0: new THREE.Vector3(P.x, P.y + 1.9, P.z), p2: new THREE.Vector3(10, 1.4, -27.9) });
  }
  markInteract('hug');
}
function hugArrived() {
  spriteBurst(10, 1.6, -27.9, heartTex, 10, { size: .35, up: 1.8, spread: 1.2 });
  let tpe = '14:00', ldn = '07:00';
  try { const f = tz => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }); tpe = f('Asia/Taipei'); ldn = f('Europe/London'); } catch (err) { }
  floatText(10, 2.6, -27.9, `Hug delivered<small>Your ${tpe} in Taipei is their ${ldn} in London</small>`, 3.4);
}
export function updateBridgly(dt, t) {
  if (!reduceMotion) {
    heart.rotation.y = Math.sin(t * .8) * .5; heart.position.y = 5.4 + Math.sin(t * 1.2) * .2;
    heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 3.2)) ** 6 * .12 + heartPulse * .6);
  } else heart.scale.setScalar(1 + heartPulse * .6);
  heartPulse = Math.max(0, heartPulse - dt * 1.4);
  for (let i = hugs.length - 1; i >= 0; i--) {
    const h = hugs[i]; h.t += dt / 1.5; if (h.t < 0) continue;
    h.s.visible = true; const u = Math.min(1, h.t), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    const cx = (h.p0.x + h.p2.x) / 2, cy = Math.max(h.p0.y, h.p2.y) + 4, cz = (h.p0.z + h.p2.z) / 2;
    h.s.position.set(a * h.p0.x + b * cx + c * h.p2.x, a * h.p0.y + b * cy + c * h.p2.y, a * h.p0.z + b * cz + c * h.p2.z);
    h.s.scale.setScalar(.45 + Math.sin(u * Math.PI) * .2);
    if (h.t >= 1) { scene.remove(h.s); h.s.material.dispose(); hugs.splice(i, 1); if (h.last) hugArrived(); }
  }
}
