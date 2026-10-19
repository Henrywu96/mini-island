// Paper planes thrown from the mailbox.
import { THREE, scene } from '../gfx.js';
import { SFX } from '../sound.js';
import { P } from './player.js';
import { faceToward, emote } from '../actors/henry.js';
import { floatText } from './fx.js';
import { markInteract } from './hud.js';

let planeGeo = null, planeMat = null;
const planes = [];
export function throwPlane() {
  if (!planeGeo) {
    planeGeo = new THREE.BufferGeometry();
    planeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, .38, -.28, .03, -.26, 0, 0, -.22, 0, 0, .38, 0, 0, -.22, .28, .03, -.26, 0, 0, .38, 0, -.1, -.24, 0, 0, -.22]), 3));
    planeGeo.computeVertexNormals();
    planeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: .6 });
  }
  const ox = P.x, oz = P.z, l = Math.hypot(ox, oz) || 1, dir = new THREE.Vector3(ox / l, 0, oz / l);
  faceToward(P.x + dir.x * 4, P.z + dir.z * 4, 1.6); emote('send', 1.2);
  const m = new THREE.Mesh(planeGeo, planeMat); m.castShadow = true; scene.add(m);
  planes.push({ m, t: 0, p0: new THREE.Vector3(P.x + dir.x * .4, P.y + 1.6, P.z + dir.z * .4), dir, side: new THREE.Vector3(-dir.z, 0, dir.x) });
  SFX.whoosh();
  floatText(P.x, P.y + 2.9, P.z, 'Paper plane away!<small>Real messages go through LinkedIn</small>', 2.6);
  markInteract('plane');
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3();
function planePos(q, tt, out) {
  return out.copy(q.p0).addScaledVector(q.dir, tt * 6.5).addScaledVector(q.side, Math.sin(tt * 1.6) * 2.2).add(_up.set(0, Math.sin(tt * 2.2) * .6 + tt * 1.3, 0));
}
export function updatePlanes(dt) {
  for (let i = planes.length - 1; i >= 0; i--) {
    const q = planes[i]; q.t += dt;
    planePos(q, q.t, _a); planePos(q, q.t + .05, _b);
    q.m.position.copy(_a); q.m.lookAt(_b);
    q.m.scale.setScalar(q.t > 5 ? Math.max(.01, 1 - (q.t - 5)) : 1);
    if (q.t > 6) { scene.remove(q.m); planes.splice(i, 1); }
  }
}
