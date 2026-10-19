// Henry's hamster: follows him around, chases the ball, runs on the wheel and loves pets.
import { THREE, scene, hitMat, blobMat, stationHits, heartTex } from '../gfx.js';
import { S } from '../state.js';
import { angDiff, reduceMotion } from '../util.js';
import { makeHamster } from './rig.js';
import { walkable, groundY } from '../nav.js';
import { anim, faceToward } from './henry.js';
import { P, beginGame } from '../play/player.js';
import { ballChase } from '../play/ball.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { SFX } from '../sound.js';

export const H = new THREE.Vector3(1.1, 0, 5.2);
export const WHEEL = { x: -2.2, z: -6.6 };
let hamRig = null, hamBlob = null, hamHit = null, hamHop = 0, hamYaw = 0, hamYawTarget = 0;

export function initHamster() {
  hamRig = makeHamster(); hamRig.root.scale.setScalar(1.15); scene.add(hamRig.root);
  hamBlob = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), blobMat); hamBlob.rotation.x = -Math.PI / 2; scene.add(hamBlob);
  hamHit = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 6), hitMat); hamHit.userData.ham = true; scene.add(hamHit); stationHits.push(hamHit);
}

export function updateHamster(dt) {
  let tx = H.x, tz = H.z, moving = false;
  if (S.hamState === 'follow' || S.hamState === 'pet') { const bx = Math.sin(anim.yaw), bz = Math.cos(anim.yaw); tx = P.x - bx * 1.2 + bz * .65; tz = P.z - bz * 1.2 - bx * .65; }
  const chase = S.hamState === 'follow' ? ballChase() : null; if (chase) { tx = chase.x; tz = chase.z; }
  else if (S.hamState === 'toWheel') { tx = WHEEL.x; tz = WHEEL.z; }
  const hd = Math.hypot(tx - H.x, tz - H.z);
  if (S.hamState !== 'wheel' && S.hamState !== 'pet' && hd > .15) {
    const step = Math.min(hd, (hd > 3 ? 9.5 : 6.2) * dt), nx = H.x + (tx - H.x) / hd * step, nz = H.z + (tz - H.z) / hd * step;
    if (walkable(nx, nz) || hd > 6 || S.hamState === 'toWheel') { hamYawTarget = Math.atan2(tx - H.x, tz - H.z); H.x = nx; H.z = nz; moving = true; }
  }
  if (S.hamState === 'toWheel' && hd < .2) { S.hamState = 'wheel'; S.hamT = 0; }
  if (S.hamState === 'wheel') {
    S.hamT += dt; H.x = WHEEL.x; H.z = WHEEL.z; hamYawTarget = Math.PI / 2;
    if (S.hamT > 6) { S.hamState = 'follow'; H.z = WHEEL.z + .9; floatText(H.x, 1.3, H.z, 'Whew!', 1.4); }
  }
  if (S.hamState === 'pet' || S.hamState === 'happy') { S.hamT += dt; if (S.hamT > 1.4) S.hamState = 'follow'; }
  if (!moving && S.hamState === 'follow') hamYawTarget = Math.atan2(P.x - H.x, P.z - H.z);
  hamYaw += angDiff(hamYawTarget, hamYaw) * (1 - Math.exp(-dt * 10));
  H.y = S.hamState === 'wheel' ? .19 : groundY(H.x, H.z);
  const running = moving || S.hamState === 'wheel';
  if (running) hamHop += dt * (S.hamState === 'wheel' ? 24 : 15);
  let hop = running ? Math.abs(Math.sin(hamHop)) * (S.hamState === 'wheel' ? .05 : .18) : 0, spin = 0;
  if (S.hamState === 'pet' || S.hamState === 'happy') { hop = Math.abs(Math.sin(S.hamT * 7)) * .3; spin = S.hamT * 9; }
  else if (anim.emote === 'dance' && !running) { hop = Math.abs(Math.sin(anim.et * 13)) * .12; spin = Math.sin(anim.et * 6.5) * .9; }
  if (reduceMotion) { hop = 0; spin = 0; }
  hamRig.root.position.set(H.x, H.y, H.z); hamRig.root.rotation.y = hamYaw + spin;
  hamRig.body.position.y = hop;
  hamRig.body.scale.set(1, 1 + (running && !reduceMotion ? Math.cos(hamHop * 2) * .05 : Math.sin(performance.now() / 260) * .015), 1);
  hamBlob.position.set(H.x, groundY(H.x, H.z) + .03, H.z); hamHit.position.set(H.x, H.y + .35, H.z);
}

export function wheelRun() {
  if (S.hamState === 'wheel' || S.hamState === 'toWheel') { floatText(WHEEL.x, 1.9, WHEEL.z, 'Already running!', 1.6); return; }
  S.hamState = 'toWheel'; faceToward(WHEEL.x, WHEEL.z, 1.2);
  floatText(WHEEL.x, 1.9, WHEEL.z, 'Go, go, go!<small>Hamster on the wheel</small>', 2.2);
  markInteract('wheel');
}
export function petHamster() {
  if (!S.started) { beginGame(); return; }
  if (S.hamState === 'wheel' || S.hamState === 'toWheel') { floatText(H.x, 1.3, H.z, 'Busy running!', 1.4); return; }
  S.hamState = 'pet'; S.hamT = 0; faceToward(H.x, H.z, 1.3);
  spriteBurst(H.x, H.y + .7, H.z, heartTex, 7, { size: .28, up: 1.5, spread: .7 });
  floatText(H.x, H.y + 1.3, H.z, 'Squeak!', 1.4); SFX.squeak();
  markInteract('pet');
}
/** a happy little spin, e.g. when Henry shares a snack */
export function hamsterTreat() {
  if (S.hamState === 'wheel' || S.hamState === 'toWheel') return;
  S.hamState = 'happy'; S.hamT = 0;
  floatText(H.x, H.y + 1.1, H.z, 'Nom!', 1.2); SFX.squeak();
}
