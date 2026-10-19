// Market square: the Emberline coffee booth and the Job Tracker board.
import { THREE, scene, canvasTex, M, mat, mesh, put, puffTex } from '../gfx.js';
import { S } from '../state.js';
import { FONT, rrPath, reduceMotion } from '../util.js';
import { faceToward, emote } from '../actors/henry.js';
import { floatText, spriteBurst, burst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';

const steam = [];
let coffeeCup = null;
const job = { cols: [3, 2, 1], ctx: null, tex: null };

export function initMarket() {
  {
    const x = 15.1, z = 17.2, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z) + .4; scene.add(g);
    put(g, new THREE.BoxGeometry(1.7, .9, .9), mat.wood, 0, .45, 0); put(g, new THREE.BoxGeometry(1.8, .08, 1.0), mat.cream, 0, .94, 0);
    put(g, new THREE.BoxGeometry(1.72, .2, .02), mat.coral, 0, .7, .46);
    const cup = new THREE.Group(); cup.position.set(0, .98, 0); g.add(cup); coffeeCup = cup;
    put(cup, new THREE.CylinderGeometry(.62, .62, .05, 28), mat.white, 0, .03, 0);
    const prof = [[0, .05], [.36, .05], [.44, .2], [.5, .62], [.46, .62], [.4, .22], [0, .2]].map(([r, y]) => new THREE.Vector2(r, y));
    put(cup, new THREE.LatheGeometry(prof, 32), mat.white, 0, 0, 0);
    put(cup, new THREE.CylinderGeometry(.45, .45, .02, 28), M('#6b3f26'), 0, .56, 0, false);
    const h = put(cup, new THREE.TorusGeometry(.16, .045, 8, 18, Math.PI * 1.2), mat.white, .52, .36, 0); h.rotation.z = -Math.PI * .6;
    put(g, new THREE.CylinderGeometry(.18, .14, .3, 12), mat.coral, .62, 1.13, .1); put(g, new THREE.CylinderGeometry(.16, .16, .03, 12), M('#6b3f26'), .62, 1.29, .1, false);
    const steamTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: .7 })); s.position.set(0, 1.6, 0); cup.add(s); steam.push({ s, ph: i / 4 }); }
    for (const [cx, cz, r] of [[-1.2, .4, .3], [-1.3, -.4, .25]]) { const cr = put(g, new THREE.BoxGeometry(r * 2, r * 2, r * 2), mat.wood2, cx, r, cz); cr.rotation.y = .3; }
  }
  {
    const x = 19.6, z = 13.4, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z) - .35; scene.add(g);
    for (const s of [-1, 1]) { const l = put(g, new THREE.BoxGeometry(.08, 2.1, .08), mat.wood2, s * .75, 1.0, -.1); l.rotation.x = .12; }
    const back = put(g, new THREE.BoxGeometry(.08, 2.0, .08), mat.wood2, 0, .95, -.45); back.rotation.x = -.3;
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 260;
    job.ctx = cv.getContext('2d'); job.tex = new THREE.CanvasTexture(cv); job.tex.colorSpace = THREE.SRGBColorSpace; job.tex.anisotropy = 4;
    drawBoard();
    const board = mesh(new THREE.BoxGeometry(1.9, 1.25, .06), [mat.wood, mat.wood, mat.wood, mat.wood, new THREE.MeshStandardMaterial({ map: job.tex, roughness: .7 }), mat.wood]);
    board.position.set(0, 1.45, 0); board.rotation.x = -.1; g.add(board);
  }
}
function drawBoard() {
  const c = job.ctx, w = 400, h = 260;
  c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  [['Applied', '#ec6a4e'], ['Interview', '#ffd166'], ['Offer', '#2fb67c']].forEach(([t, col], i) => {
    const x0 = 14 + i * 128, n = job.cols[i];
    c.fillStyle = '#f3f5f9'; rrPath(c, x0, 12, 116, h - 24, 12); c.fill();
    c.fillStyle = col; rrPath(c, x0 + 8, 20, 100, 30, 8); c.fill();
    c.fillStyle = i === 1 ? '#202b45' : '#ffffff'; c.font = `600 17px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${t} · ${n}`, x0 + 58, 36);
    for (let k = 0; k < Math.min(n, 3); k++) {
      c.fillStyle = i === 2 ? '#eafaf2' : '#ffffff'; c.strokeStyle = i === 2 ? '#2fb67c' : '#e1e5ee'; c.lineWidth = 2;
      rrPath(c, x0 + 8, 62 + k * 58, 100, 48, 8); c.fill(); c.stroke();
      c.fillStyle = '#c6cbd6'; c.fillRect(x0 + 18, 76 + k * 58, 70, 6); c.fillRect(x0 + 18, 90 + k * 58, 46, 6);
    }
    if (n > 3) { c.fillStyle = '#8a93a6'; c.font = `600 13px ${FONT}`; c.fillText(`+${n - 3} more`, x0 + 58, h - 20); }
  });
  if (job.tex) job.tex.needsUpdate = true;
}
export function brewCoffee() {
  faceToward(15.1, 17.2, 2.2); emote('drink', 2.0);
  const v = coffeeCup.getWorldPosition(new THREE.Vector3());
  spriteBurst(v.x, v.y + .8, v.z, puffTex, 10, { size: .5, up: 1.1, spread: .4, life: 1.8 });
  S.buffs.coffee = 20;
  floatText(15.1, 2.7, 17.2, 'Caffeinated<small>+40% walking speed for 20 seconds</small>', 2.6);
  markInteract('coffee');
}
export function moveCard() {
  faceToward(19.6, 13.4, 1.4);
  const c = job.cols; let msg = '';
  if (c[0] > 0) { c[0]--; c[1]++; msg = 'Applied → Interview'; }
  else if (c[1] > 0) { c[1]--; c[2]++; msg = 'Offer received!'; burst(19.6, 2.2, 13.4, ['#2fb67c', '#ffd166', '#ec6a4e'], 26, 4); }
  if (c[0] === 0 && c[1] === 0) { msg = 'Every card has an offer'; setTimeout(() => { job.cols = [3, 2, 1]; drawBoard(); }, 2500); }
  drawBoard();
  floatText(19.6, 2.8, 13.4, `${msg}<small>${c[0]} applied · ${c[1]} interviewing · ${c[2]} offers</small>`, 2.6);
  markInteract('card');
}
export function updateMarket(dt, t) {
  if (reduceMotion) return;
  steam.forEach(s => { const p = (t * .35 + s.ph) % 1; s.s.position.set(Math.sin(p * 6 + s.ph * 9) * .08, .7 + p * 1.1, 0); s.s.scale.setScalar(.25 + p * .45); s.s.material.opacity = .7 * (1 - p); });
}
