// Henry as the player: keyboard and click-to-walk movement, jumping, facing, what is in reach,
// the E / F prompt, emotes and starting the game.
import { THREE, renderer, colliders, boxes, movers } from '../gfx.js';
import { STATIONS, SBY, ISL, TIPS } from '../../data/world.js';
import { walkable, groundY, islandOf, buildPath, boxPush } from '../nav.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { lerp, angDiff, reduceMotion, track } from '../util.js';
import { SFX } from '../sound.js';
import { anim, face, FACE_CAM, emote, endEmote, say, animateHenry } from '../actors/henry.js';
import { H, updateHamster } from '../actors/hamster.js';
import { PETS } from '../actors/pets.js';
import { FOLK } from '../actors/npcs.js';
import { PROPS, checkTools } from './stations.js';
import { burst, spriteBurst } from './fx.js';
import { openPanel, closePanel } from './ui.js';
import { noteTex } from '../gfx.js';

export const P = new THREE.Vector3(0, 0, 4.2);
export const vel = new THREE.Vector3();
export const keys = new Set();
let stuckT = 0, wpRef = null, wpBest = 1e9, wpT = 0, tipI = 0;

export function beginGame() {
  if (S.started) return;
  track('start_exploring');
  S.started = true; store.set({ started: true }); S.camDistTarget = innerWidth < 720 ? 17 : 15;
  try { renderer.domElement.focus({ preventScroll: true }); } catch (err) { }
  setTimeout(() => { emote('wave'); say("Hi, I'm Henry! Walk to a glowing totem to open a case study, or say hi to the townsfolk.", 6); }, reduceMotion ? 0 : 900);
}

/* ---- walking ---- */
export function walkTo(point, station = null) {
  if (!S.started) beginGame();
  S.path = buildPath(P, point); S.pendingOpen = station; S.pendingAct = null; stuckT = 0;
}
function approachDir(islandId) {
  const is = ISL[islandId];
  if (!is || is.id === 'hub') return [0, 1];
  let dx = -is.x, dz = -is.z; const d = Math.hypot(dx, dz); return [dx / d, dz / d];
}
export function walkToStation(id) {
  const st = SBY[id]; if (!st) return;
  if (Math.hypot(P.x - st.x, P.z - st.z) <= st.radius) { openPanel(id); return; }
  const [dx, dz] = approachDir(st.island);
  let ax = st.x + dx * ((st.col || .5) + 1), az = st.z + dz * ((st.col || .5) + 1);
  if (!walkable(ax, az)) { ax = st.x; az = st.z; }
  walkTo({ x: ax, z: az }, st);
}
export function walkToProp(pr) {
  if (Math.hypot(P.x - pr.x, P.z - pr.z) <= pr.radius) { pr.act(); return; }
  const [dx, dz] = approachDir(islandOf(pr));
  let ax = pr.x + dx * 1.4, az = pr.z + dz * 1.4;
  if (!walkable(ax, az)) { ax = pr.x; az = pr.z; }
  walkTo({ x: ax, z: az }); S.pendingAct = pr;
}
export function onArrive() {
  if (S.pendingOpen) { const st = S.pendingOpen; S.pendingOpen = null; if (Math.hypot(P.x - st.x, P.z - st.z) <= st.radius + .8) openPanel(st.id); }
  if (S.pendingAct) { const pr = S.pendingAct; S.pendingAct = null; if (Math.hypot(P.x - pr.x, P.z - pr.z) <= pr.radius + .8) pr.act(); }
}
function tryMove(nx, nz) {
  for (const list of [colliders, movers]) for (const c of list) { const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), min = c.r + .32; if (d < min && d > 1e-4) { nx = c.x + dx / d * min; nz = c.z + dz / d * min; } }
  for (const b of boxes) { const r = boxPush(nx, nz, .32, b); if (r) { nx = r[0]; nz = r[1]; } }
  return walkable(nx, nz) ? [nx, nz] : null;
}
// auto-walk steers around posts, trees, props and people instead of pushing into them
function steer(mx, mz, dist) {
  let sx = mx, sz = mz;
  for (const list of [colliders, movers]) for (const c of list) {
    const cx = c.x - P.x, cz = c.z - P.z, d = Math.hypot(cx, cz);
    if (d > c.r + 2.4 || d > dist + c.r) continue;
    if (cx * mx + cz * mz <= 0) continue;
    const lat = -cx * mz + cz * mx, need = c.r + .55;
    if (Math.abs(lat) >= need) continue;
    const side = lat > 0 ? -1 : 1, w = 1.6 * (1 - Math.abs(lat) / need) * (1 - Math.min(1, Math.max(0, d - c.r) / 2.4)) + .2;
    sx += -mz * side * w; sz += mx * side * w;
  }
  const l = Math.hypot(sx, sz) || 1; return [sx / l, sz / l];
}
export const canMove = () => S.started && !S.panelId && !S.quick && !S.photo && !S.dialogue;

export function updatePlayer(dt) {
  let ix = 0, iz = 0;
  const free = canMove();
  if (free) {
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
  }
  if (S.dialogue) { S.path = []; S.pendingOpen = null; S.pendingAct = null; }
  let mx = 0, mz = 0;
  if (ix || iz) {
    S.path = []; S.pendingOpen = null; S.pendingAct = null;
    const fx = -Math.sin(S.camYaw), fz = -Math.cos(S.camYaw), rx = Math.cos(S.camYaw), rz = -Math.sin(S.camYaw);
    mx = rx * ix - fx * iz; mz = rz * ix - fz * iz; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
  } else if (S.path.length) {
    const wp = S.path[0], dx = wp.x - P.x, dz = wp.z - P.z, d = Math.hypot(dx, dz);
    if (d < .3) { S.path.shift(); if (!S.path.length) onArrive(); }
    else { [mx, mz] = steer(dx / d, dz / d, d); }
  }
  const B = S.buffs;
  const spd = (keys.has('shift') ? 8.5 : (S.path.length ? 6.6 : 5.4)) * (B.coffee > 0 ? 1.4 : 1) * (B.jog > 0 ? 1.25 : 1);
  const k = 1 - Math.exp(-dt * 12);
  vel.x = lerp(vel.x, mx * spd, k); vel.z = lerp(vel.z, mz * spd, k);
  const ox = P.x, oz = P.z;
  const r = tryMove(P.x + vel.x * dt, P.z + vel.z * dt) || tryMove(P.x + vel.x * dt, P.z) || tryMove(P.x, P.z + vel.z * dt);
  if (r) { P.x = r[0]; P.z = r[1]; } else { vel.set(0, 0, 0); }
  const moved = Math.hypot(P.x - ox, P.z - oz);
  if (S.path.length && moved < .4 * dt) { stuckT += dt; if (stuckT > 1.1) { S.path = []; S.pendingOpen = null; S.pendingAct = null; stuckT = 0; } } else stuckT = 0;
  if (S.path.length) {
    const wp = S.path[0], dw = Math.hypot(wp.x - P.x, wp.z - P.z);
    if (wp !== wpRef) { wpRef = wp; wpBest = dw; wpT = 0; } else if (dw < wpBest - .05) { wpBest = dw; wpT = 0; } else wpT += dt;
    const goal = S.pendingOpen || (S.pendingAct && !S.pendingAct.pet ? S.pendingAct : null);
    if (goal && Math.hypot(P.x - goal.x, P.z - goal.z) < goal.radius - .4) { S.path = []; onArrive(); }
    else if (wpT > 1.6) { if (goal && Math.hypot(P.x - goal.x, P.z - goal.z) <= goal.radius) { S.path = []; onArrive(); } else { S.path = []; S.pendingOpen = null; S.pendingAct = null; } wpT = 0; }
  }
  S.speedNow = moved / Math.max(dt, 1e-4);
  if (S.speedNow > .4) { S.heading = Math.atan2(vel.x, vel.z); S.idleT = 0; if (anim.emote && anim.emote !== 'drink' && anim.emote !== 'sip' && anim.emote !== 'eat') endEmote(); }
  if (S.jumpY > 0 || S.vy > 0) { S.vy -= 24 * dt; S.jumpY += S.vy * dt; if (S.jumpY <= 0) { S.jumpY = 0; S.vy = 0; } }
  P.y = groundY(P.x, P.z);
  // which way Henry faces: where he walks, at the camera for emotes, at whatever he is using
  face.t -= dt;
  let targetYaw = anim.yaw;
  if (S.speedNow > .4) targetYaw = S.heading;
  else if (anim.emote && FACE_CAM.includes(anim.emote)) targetYaw = S.camYaw;
  else if (face.t > 0) targetYaw = face.yaw;
  anim.yaw += angDiff(targetYaw, anim.yaw) * (1 - Math.exp(-dt * 9));
  // the nearest thing to use, and something to look at
  let best = null, bd = 1e9, look = null, ld = 6;
  for (const list of [STATIONS, PROPS, PETS, FOLK]) for (const it of list) {
    const d = Math.hypot(P.x - it.x, P.z - it.z) + (it.pet ? .25 : 0);
    if (d < it.radius && d < bd) { bd = d; best = it; }
    if (d < ld) { ld = d; look = it; }
  }
  if (S.hamState === 'pet') look = H;
  if (S.dialogue) look = S.dialogue.n;
  face.look = look;
  S.near = best;
  animateHenry(dt);
  updateHamster(dt);
  if (free && S.speedNow < .4 && !anim.emote && !S.path.length) {
    S.idleT += dt;
    if (S.idleT > 11) { S.idleT = -16; emote('idlewave'); say(TIPS[tipI++ % TIPS.length], 3.6); }
  } else if (!free) S.idleT = 0;
  checkTools();
}

/** the E / F buttons above the dock */
export function updatePrompt() {
  const n = S.near;
  if (!n || S.panelId || !S.started || S.quick || S.photo || S.dialogue || S.overview) { if (store.get().prompt) store.set({ prompt: null }); return; }
  const key = (n.kind ? 's:' : 'p:') + n.id + ':' + (n.sub || '');
  const cur = store.get().prompt;
  if (cur && cur.key === key) return;
  store.set({ prompt: n.kind ? { key, main: n.verb, sub: n.name, alt: n.alt ? n.alt.label : null } : { key, main: n.label, sub: n.sub, alt: n.alt ? n.alt.label : null } });
}
export function interact() {
  if (!S.started) { beginGame(); return; }
  if (S.panelId) { closePanel(); return; }
  const n = S.near; if (!n) return;
  if (n.kind) openPanel(n.id); else n.act();
}
export function interactAlt() {
  if (!S.started || S.panelId || S.dialogue) return;
  const n = S.near; if (!n || !n.alt) return;
  n.alt.act();
}
export function jump() {
  if (!S.started) { beginGame(); return; }
  if (S.jumpY === 0 && !S.panelId && !S.photo && !S.dialogue) { S.vy = S.buffs.boba > 0 ? 10.5 : 7.5; S.jumpY = .001; if (anim.emote) endEmote(); SFX.jump(); }
}
const SAY = { wave: 'Hi there!', dance: '♪ ♫ ♪', cheer: 'Woohoo!' };
export function doEmote(type) {
  if (!S.started) { beginGame(); return; }
  if (S.panelId) closePanel();
  S.path = []; S.pendingOpen = null; S.pendingAct = null; vel.set(0, 0, 0); S.idleT = 0;
  emote(type); say(SAY[type], 1.8); SFX.pop();
  if (type === 'cheer') burst(P.x, P.y + 2.4, P.z, ['#ffd166', '#ec6a4e', '#3b82f6', '#8b5cf6'], 22, 3);
  if (type === 'dance') spriteBurst(P.x, P.y + 2.2, P.z, noteTex, 6, { size: .35, up: 1.2, spread: 1.4, life: 2 });
}
