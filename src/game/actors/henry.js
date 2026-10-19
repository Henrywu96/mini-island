// Henry: his rig, emotes, walk animation and speech bubble.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene, blobMat } from '../gfx.js';
import { S } from '../state.js';
import { clamp, lerp, angDiff, reduceMotion } from '../util.js';
import { makeHenry } from './rig.js';
import { P } from '../play/player.js';
import { store } from '../../state/store.js';

/** @type {ReturnType<typeof makeHenry>} */ export let henryRig;
/** @type {THREE.Mesh} */ export let blob;
export const anim = { w: 0, amt: 0, yaw: 0, emote: /** @type {string|null} */ (null), et: 0, edur: 0, headYaw: 0 };
export const face = { t: 0, yaw: 0, look: /** @type {any} */ (null) };
const EMOTE_DUR = { wave: 2.2, idlewave: 1.8, dance: 3.4, cheer: 2.2, drink: 2.0, sip: 2.2, eat: 2.2, shake: 1.3, send: 1.4, petdown: 1.5, hand: 1.4 };
export const FACE_CAM = ['wave', 'idlewave', 'dance', 'cheer'];

let bubbleEl = null, bubbleObj = null, bubbleT = 0;
export function initHenry() {
  henryRig = makeHenry(); henryRig.root.position.copy(P); scene.add(henryRig.root);
  blob = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), blobMat); blob.rotation.x = -Math.PI / 2; scene.add(blob);
  bubbleEl = document.createElement('div'); bubbleEl.className = 'bubble'; bubbleEl.dataset.hide = '';
  bubbleObj = new CSS2DObject(bubbleEl); scene.add(bubbleObj);
}
export function say(text, secs = 4) { if (!bubbleEl) return; bubbleEl.textContent = text; delete bubbleEl.dataset.hide; bubbleT = secs; }
export function hush() { if (bubbleEl) { bubbleEl.dataset.hide = ''; bubbleT = 0; } }

function showHeld(type) {
  const R = henryRig;
  R.cupInHand.visible = type === 'drink'; R.bobaInHand.visible = type === 'sip'; R.snackInHand.visible = type === 'eat';
  R.pen.visible = !(type === 'drink' || type === 'sip' || type === 'eat') && !S.wxUmbrella;
}
export function emote(type, dur) {
  anim.emote = type; anim.et = 0; anim.edur = dur || EMOTE_DUR[type] || 2;
  showHeld(type); store.set({ emote: type });
}
export function endEmote() { anim.emote = null; showHeld(null); store.set({ emote: null }); }
export function faceToward(x, z, secs = 1.2) { if (Math.hypot(x - P.x, z - P.z) < .05) return; face.yaw = Math.atan2(x - P.x, z - P.z); face.t = secs; }
export const holding = () => anim.emote === 'drink' || anim.emote === 'sip' || anim.emote === 'eat';

export function animateHenry(dt) {
  const R = henryRig;
  if (anim.emote) { anim.et += dt; if (anim.et >= anim.edur) endEmote(); }
  const e = anim.emote, t = performance.now() / 1000;
  anim.amt = lerp(anim.amt, clamp(S.speedNow / 5.5, 0, 1.25), 1 - Math.exp(-dt * 10));
  anim.w += S.speedNow * dt * 2.4;
  const a = reduceMotion ? Math.min(anim.amt, .4) : anim.amt, s = Math.sin(anim.w);
  let legR = s * .75 * a, legL = -s * .75 * a, armR = -s * .6 * a, armL = s * .6 * a, armRz = 0, armLz = 0;
  let hipY = .72 + Math.abs(Math.cos(anim.w)) * .06 * a + Math.sin(t * 2.2) * .006, hipX = 0, lean = .1 * a, bodyYaw = 0, headTilt = 0, headPitch = -.04 * a;
  if (S.jumpY > 0) { legR = -.7; legL = .25; armRz = .55; armLz = .55; }
  if (S.wxUmbrella) { armR = -.3; armRz = -.15; }
  if (e) {
    const k = clamp(Math.min(anim.et * 5, (anim.edur - anim.et) * 5), 0, 1), et = anim.et;
    if (e === 'wave' || e === 'idlewave') { armRz = lerp(armRz, 2.6 + Math.sin(et * 11) * .28, k); armR = lerp(armR, 0, k); headTilt = .14 * k; }
    else if (e === 'cheer') { armRz = lerp(armRz, 2.75, k); armLz = lerp(armLz, 2.75, k); hipY += Math.abs(Math.sin(et * 7)) * .22 * k; }
    else if (e === 'dance') { const b = et * 6.5; bodyYaw = Math.sin(b) * .55 * k; hipX = Math.sin(b) * .07 * k; hipY += Math.abs(Math.sin(b * 2)) * .07 * k; armRz = (1.7 + Math.sin(b * 2) * .9) * k; armLz = (1.7 - Math.sin(b * 2) * .9) * k; legR = Math.sin(b * 2) * .3 * k; legL = -legR; headTilt = Math.sin(b) * .18 * k; }
    else if (e === 'drink' || e === 'sip' || e === 'eat') { armR = lerp(armR, -2.15 + (e === 'eat' ? Math.sin(et * 9) * .15 : 0), k); armRz = -.4 * k; headPitch = -.22 * k; }
    else if (e === 'shake') { armR = lerp(armR, -1.45, k); armL = lerp(armL, -1.45, k); bodyYaw = Math.sin(et * 32) * .1 * k; }
    else if (e === 'send') { armR = lerp(armR, -2.0, k); armRz = .25 * k; armL = lerp(armL, -.6, k); }
    else if (e === 'hand') { armR = lerp(armR, -1.25 + Math.sin(et * 14) * .12, k); armRz = .1 * k; }
    else if (e === 'petdown') { hipY -= .15 * k; lean += .45 * k; legR = lerp(legR, -.5, k); legL = lerp(legL, -.5, k); armR = lerp(armR, -1.2 + Math.sin(et * 14) * .14, k); armRz = .05 * k; headPitch = .3 * k; }
  }
  R.legs[0].rotation.x = legR; R.legs[1].rotation.x = legL;
  R.arms[0].rotation.set(armR, 0, -(.12 + armRz)); R.arms[1].rotation.set(armL, 0, .12 + armLz);
  R.hips.position.set(hipX, hipY, 0); R.body.rotation.set(lean, bodyYaw, 0);
  let hy = 0;
  if (face.look && !e) hy = clamp(angDiff(Math.atan2(face.look.x - P.x, face.look.z - P.z), anim.yaw), -1, 1) * .8;
  anim.headYaw = lerp(anim.headYaw, hy, 1 - Math.exp(-dt * 6));
  R.head.rotation.set(headPitch, anim.headYaw, headTilt);
  R.root.position.set(P.x, P.y + S.jumpY, P.z); R.root.rotation.y = anim.yaw;
  blob.position.set(P.x, P.y + .03, P.z); blob.scale.setScalar(1 - Math.min(.5, S.jumpY * .25));
  bubbleObj.position.set(P.x, P.y + S.jumpY + 2.75, P.z);
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) bubbleEl.dataset.hide = ''; }
}
