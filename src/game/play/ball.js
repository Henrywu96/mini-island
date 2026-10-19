// The beach ball you can kick around the square (the hamster and the dogs chase it).
import { THREE, scene, canvasTex, mesh, hitMat, stationHits, colliders, boxes, movers, puffTex } from '../gfx.js';
import { ISLANDS, walkable, groundY, boxPush } from '../nav.js';
import { S } from '../state.js';
import { SFX } from '../sound.js';
import { P, vel } from './player.js';
import { spriteBurst, floatText } from './fx.js';
import { markInteract } from './hud.js';

export const BALL = { x: -2.8, z: 3.2, vx: 0, vz: 0, y: 0, vy: 0, r: .38, falling: false, home: { x: -2.8, z: 3.2 }, cd: 0, gy: 0 };
/** @type {THREE.Mesh} */ let ball;
/** @type {THREE.Mesh} */ let ballHit;
const _axis = new THREE.Vector3();

export function initBall() {
  const ballTex = canvasTex(256, 128, (c, w, h) => {
    ['#ec6a4e', '#ffffff', '#ffd166', '#ffffff', '#3b82f6', '#ffffff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 6, 0, w / 6 + 1, h); });
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h * .1); c.fillRect(0, h * .9, w, h * .1);
  });
  ball = mesh(new THREE.SphereGeometry(.38, 28, 20), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .35 }));
  scene.add(ball);
  ballHit = new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6), hitMat); ballHit.userData.ball = true; scene.add(ballHit); stationHits.push(ballHit);
}

function bounceOff(cx, cz, min, nx2, nz2) {
  const ex = nx2 - cx, ez = nz2 - cz, ed = Math.hypot(ex, ez);
  if (ed < min && ed > 1e-4) { const ux = ex / ed, uz = ez / ed, dot = BALL.vx * ux + BALL.vz * uz; if (dot < 0) { BALL.vx -= 1.7 * dot * ux; BALL.vz -= 1.7 * dot * uz; } return [cx + ux * min, cz + uz * min]; }
  return null;
}
export function updateBall(dt) {
  BALL.cd -= dt;
  if (BALL.falling) {
    BALL.vy -= 20 * dt; BALL.y += BALL.vy * dt; BALL.x += BALL.vx * dt; BALL.z += BALL.vz * dt;
    if (BALL.y < -16) {
      Object.assign(BALL, { x: BALL.home.x, z: BALL.home.z, vx: 0, vz: 0, y: 1.5, vy: 0, falling: false });
      spriteBurst(BALL.x, 1.2, BALL.z, puffTex, 8, { size: .5, up: 1, spread: .8 }); floatText(BALL.x, 1.6, BALL.z, "The ball's back", 1.6);
    }
  } else {
    const dx = BALL.x - P.x, dz = BALL.z - P.z, d = Math.hypot(dx, dz);
    if (d < BALL.r + .45 && S.jumpY < .9) {
      const nx = dx / (d || 1), nz = dz / (d || 1), sp = Math.hypot(vel.x, vel.z), push = Math.max(2.2, sp * 1.15);
      BALL.vx = nx * push + vel.x * .35; BALL.vz = nz * push + vel.z * .35;
      if (BALL.y < .05) BALL.vy = Math.min(4.2, 1.2 + sp * .4);
      BALL.x = P.x + nx * (BALL.r + .46); BALL.z = P.z + nz * (BALL.r + .46);
      if (BALL.cd <= 0) { SFX.kick(); BALL.cd = .25; markInteract('ball'); }
    }
    let nx2 = BALL.x + BALL.vx * dt, nz2 = BALL.z + BALL.vz * dt;
    for (const c of colliders) { const r = bounceOff(c.x, c.z, c.r + BALL.r, nx2, nz2); if (r) [nx2, nz2] = r; }
    for (const c of movers) { const r = bounceOff(c.x, c.z, c.r + BALL.r, nx2, nz2); if (r) [nx2, nz2] = r; }
    for (const b of boxes) {
      const r = boxPush(nx2, nz2, BALL.r, b); if (!r) continue;
      const ex = r[0] - nx2, ez = r[1] - nz2, el = Math.hypot(ex, ez) || 1, ux = ex / el, uz = ez / el, dot = BALL.vx * ux + BALL.vz * uz;
      if (dot < 0) { BALL.vx -= 1.7 * dot * ux; BALL.vz -= 1.7 * dot * uz; }
      nx2 = r[0]; nz2 = r[1];
    }
    if (!walkable(BALL.x, BALL.z)) { const is = ISLANDS.reduce((a, b) => Math.hypot(BALL.x - b.x, BALL.z - b.z) < Math.hypot(BALL.x - a.x, BALL.z - a.z) ? b : a); BALL.x += (is.x - BALL.x) * .1; BALL.z += (is.z - BALL.z) * .1; nx2 = BALL.x; nz2 = BALL.z; }
    else if (!walkable(nx2, nz2)) {
      if (walkable(nx2, BALL.z)) { BALL.vz = -BALL.vz * .6; nz2 = BALL.z; }
      else if (walkable(BALL.x, nz2)) { BALL.vx = -BALL.vx * .6; nx2 = BALL.x; }
      else { BALL.vx = -BALL.vx * .6; BALL.vz = -BALL.vz * .6; nx2 = BALL.x; nz2 = BALL.z; }
      if (Math.hypot(BALL.vx, BALL.vz) > 1.5 && BALL.cd <= 0) { SFX.kick(); BALL.cd = .2; }
    }
    BALL.x = nx2; BALL.z = nz2;
    const f = Math.exp(-dt * (BALL.y > .05 ? .3 : 1.3)); BALL.vx *= f; BALL.vz *= f;
    BALL.vy -= 20 * dt; BALL.y += BALL.vy * dt; if (BALL.y < 0) { BALL.y = 0; BALL.vy = Math.abs(BALL.vy) > 1.2 ? -BALL.vy * .45 : 0; }
    BALL.gy = groundY(BALL.x, BALL.z);
  }
  ball.position.set(BALL.x, (BALL.falling ? 0 : BALL.gy) + BALL.r + BALL.y, BALL.z);
  const sp = Math.hypot(BALL.vx, BALL.vz);
  if (sp > .02) { _axis.set(BALL.vz, 0, -BALL.vx).normalize(); ball.rotateOnWorldAxis(_axis, sp * dt / BALL.r); }
  ballHit.position.copy(ball.position);
}
/** where the hamster should run to chase a rolling ball, or null */
export function ballChase() {
  if (BALL.falling) return null;
  const sp = Math.hypot(BALL.vx, BALL.vz);
  if (sp < 1 || Math.hypot(BALL.x - P.x, BALL.z - P.z) > 10) return null;
  return { x: BALL.x - BALL.vx / sp * .6, z: BALL.z - BALL.vz / sp * .6 };
}
