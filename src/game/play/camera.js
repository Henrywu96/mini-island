// The follow camera: a slow sway on the start screen, then it trails Henry. During a chat it eases in
// between Henry and whoever he is talking to. In the map view it eases towards the map camera (overview.js).
import { THREE, camera } from '../gfx.js';
import { S } from '../state.js';
import { lerp, angDiff, reduceMotion } from '../util.js';
import { P } from './player.js';
import { OV, ovRate } from './overview.js';

export const camTarget = new THREE.Vector3(0, 0, -6);
const tmpV = new THREE.Vector3();
let introT = 0, chatK = 0;
export function placeCamera() {
  const cp = Math.cos(S.camPitch) * S.camDist;
  camera.position.set(camTarget.x + Math.sin(S.camYaw) * cp, camTarget.y + Math.sin(S.camPitch) * S.camDist, camTarget.z + Math.cos(S.camYaw) * cp);
  camera.lookAt(camTarget);
}
export function updateCamera(dt) {
  if (S.overview) {
    const k = 1 - Math.exp(-dt * ovRate());
    camTarget.lerp(OV.t, k);
    S.camDist = lerp(S.camDist, OV.dist, k); S.camPitch = lerp(S.camPitch, OV.pitch, k);
    S.camYaw += angDiff(OV.yaw, S.camYaw) * k;
    placeCamera(); return;
  }
  // coming back down from the map: the follow camera settles to its usual tilt
  if (OV.back > 0) { OV.back -= dt; S.camPitch = lerp(S.camPitch, OV.pitchBack, 1 - Math.exp(-dt * 3)); }
  const D = S.dialogue;
  chatK = lerp(chatK, D ? 1 : 0, 1 - Math.exp(-dt * 3));
  if (!S.started) { introT += dt; if (!reduceMotion) S.camYaw = Math.sin(introT * .12) * .5; camTarget.lerp(tmpV.set(0, 0, -7), .05); }
  else {
    tmpV.set(P.x, P.y + 1.2, P.z);
    if (D) tmpV.lerp(new THREE.Vector3(D.n.x, D.n.y + 1.3, D.n.z), .42 * chatK);
    camTarget.lerp(tmpV, 1 - Math.exp(-dt * 6));
  }
  const want = S.started ? lerp(S.camDistTarget, Math.min(S.camDistTarget, 11.5), chatK) : S.camDistTarget;
  S.camDist = lerp(S.camDist, want, 1 - Math.exp(-dt * (S.started ? 2.5 : 1)));
  if (S.photo && !S.drag) S.camYaw += dt * .08;
  placeCamera();
}
