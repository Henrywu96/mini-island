// The townsfolk: building them, walking their routes, posing, greeting, barks, dialogue,
// and the little things they do for you (boba, pancakes, poutine, ducks, mail, kites...).
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { THREE, scene, canvasTex, M, mat, put, hitMat, blobMat, stationHits, colliders, movers, markTex, sparkTex, puffTex, noteTex } from '../gfx.js';
import { NPCS, POSTCARDS, LRT_FACTS, SKETCHES } from '../../data/npcs.js';
import { groundY, buildPath, walkable } from '../nav.js';
import { S } from '../state.js';
import { store } from '../../state/store.js';
import { clamp, lerp, esc, angDiff, reduceMotion, rrPath, track } from '../util.js';
import { SFX } from '../sound.js';
import { makeVillager } from './rig.js';
import { emote, faceToward, hush } from './henry.js';
import { hamsterTreat } from './hamster.js';
import { P, beginGame, walkTo, walkToStation, onArrive } from '../play/player.js';
import { floatText, spriteBurst, burst, markAt } from '../play/fx.js';
import { met, markInteract, addXP, toast, syncTracker } from '../play/hud.js';
import { closePanel, startTour } from '../play/ui.js';
import { lureDucks } from '../world/town.js';
import { FC, stallPuff } from '../world/foodcourt.js';
import { mailFlag } from '../world/hub.js';
import { trainRunning, dispatchTrain } from '../world/transit.js';
import { WXS } from '../sky/weather.js';

/** the people in town at runtime (positions, rigs, state); `near` detection treats them like props */
/** @type {any[]} */
export const FOLK = [];
const BY = {};

// routes are closed loops through the streets; a third number is a stop, in seconds
const ROUTES = {
  mail: [[3.0, -3.2, 2.5], [.8, -11.5], [1.2, -20.0], [4.6, -25.1], [8.4, -26.9, 2.5], [4.6, -25.1], [-.9, -19.8], [-.8, -11.5], [-2.5, -2.0], [-10.5, -4.5], [-16.4, -7.0, 2.5], [-10.5, -4.5], [-2.5, -2.0], [2.5, -2.0], [10.5, -4.5], [16.4, -7.0, 2.5], [10.5, -4.5]],
  loop: [[2.5, 2.6], [8.5, 7.5], [14.6, 12.8], [8.5, 23], [4.8, 26.4], [-4.8, 26.4], [-8.5, 23], [-14.2, 12.6], [-8.5, 7.5], [-2.5, 2.6]],
};
const INFO_ACTS = new Set(['census', 'lrtfacts']);
const SKETCH_SVG = {
  heart: ['<path d="M32 52C8 36 10 14 24 14c5 0 8 4 8 8 0-4 3-8 8-8 14 0 16 22-8 38Z"/>', 'the heart over the garden'],
  train: ['<rect x="14" y="14" width="36" height="32" rx="7"/><path d="M14 30h36M22 46l-5 7M42 46l5 7"/><circle cx="23" cy="38" r="2.5"/><circle cx="41" cy="38" r="2.5"/>', 'an LRT train on the loop'],
  house: ['<path d="M11 31 32 14l21 17"/><path d="M17 27v24h30V27"/><path d="M28 51V39h8v12"/>', 'a little house by the pond'],
  hamster: ['<ellipse cx="32" cy="38" rx="17" ry="12"/><circle cx="21" cy="25" r="5"/><circle cx="43" cy="25" r="5"/><circle cx="26" cy="35" r="1.6"/><circle cx="38" cy="35" r="1.6"/><path d="M29 41q3 3 6 0"/>', 'your hamster, mid-zoom'],
};
let talkTex = null, crumbTex = null, dlgN = 0, censusAsked = false, factI = 0, cardI = 0, sketchI = 0;

/* ---- building ---- */
function makeExtras(n) {
  const fx = n.fx, fz = n.fz;
  if (n.id === 'jules') {
    // an open guitar case for tips
    const g = new THREE.Group(); g.position.set(n.x + fx * .85, 0, n.z + fz * .85); g.rotation.y = n.yaw + .3; scene.add(g);
    put(g, new THREE.BoxGeometry(.9, .1, .38), M('#2a2a30'), 0, .05, 0);
    put(g, new THREE.BoxGeometry(.82, .02, .3), M('#b23a48'), 0, .1, 0, false);
    const lid = put(g, new THREE.BoxGeometry(.9, .38, .03), M('#2a2a30'), 0, .24, -.2); lid.rotation.x = -.25;
    n.caseCoins = [];
    for (let i = 0; i < 8; i++) { const c = put(g, new THREE.CylinderGeometry(.05, .05, .012, 12), M('#ffd166', { metalness: .5, roughness: .3 }), -.3 + (i % 4) * .2, .115, -.06 + Math.floor(i / 4) * .12, false); c.visible = i < 2; n.caseCoins.push(c); }
    colliders.push({ x: g.position.x, z: g.position.z, r: .45 });
  }
  if (n.id === 'priya') {
    // an easel with the painting she is working on, and a palette in her left hand
    const g = new THREE.Group(); g.position.set(n.x + fx * .8, 0, n.z + fz * .8); g.rotation.y = n.yaw + Math.PI; scene.add(g);
    for (const [x, rz] of [[-.25, -.12], [.25, .12]]) { const l = put(g, new THREE.BoxGeometry(.04, 1.6, .04), mat.wood, x, .78, 0); l.rotation.z = rz; }
    const back = put(g, new THREE.BoxGeometry(.04, 1.5, .04), mat.wood, 0, .72, -.28); back.rotation.x = -.35;
    const art = canvasTex(160, 128, (c, w, h) => {
      c.fillStyle = '#fffaf4'; c.fillRect(0, 0, w, h);
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cfe6fb'); gr.addColorStop(1, '#fbe3d8'); c.fillStyle = gr; c.fillRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#9ed67e'; c.fillRect(8, h - 34, w - 16, 26);
      c.fillStyle = '#f27b78'; c.beginPath(); c.moveTo(80, 92); c.bezierCurveTo(44, 70, 48, 30, 68, 30); c.bezierCurveTo(74, 30, 80, 36, 80, 42); c.bezierCurveTo(80, 36, 86, 30, 92, 30); c.bezierCurveTo(112, 30, 116, 70, 80, 92); c.fill();
    });
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(.66, .54, .03), [mat.wood, mat.wood, mat.wood, mat.wood, new THREE.MeshStandardMaterial({ map: art, roughness: .8 }), mat.cream]);
    canvas.position.set(0, 1.25, .04); canvas.rotation.x = -.08; canvas.castShadow = true; g.add(canvas);
    put(g, new THREE.BoxGeometry(.7, .04, .08), mat.wood, 0, .96, .06);
    const pal = put(n.rig.arms[1], new THREE.CylinderGeometry(.13, .13, .02, 16), M('#e3b07c'), .02, -.48, .1, false); pal.rotation.x = 1.2;
    for (const [i, col] of ['#ec6a4e', '#3b82f6', '#ffd166', '#2fb67c'].entries()) put(pal, new THREE.CylinderGeometry(.025, .025, .02, 8), M(col), Math.cos(i * 1.4) * .07, .012, Math.sin(i * 1.4) * .07, false);
    colliders.push({ x: g.position.x, z: g.position.z, r: .4 });
  }
  if (n.id === 'theo') {
    // a kite shaped like a skill orb, on a string
    const kite = new THREE.Group(); scene.add(kite);
    const sh = new THREE.Shape(); sh.moveTo(0, .55); sh.lineTo(.4, .05); sh.lineTo(0, -.7); sh.lineTo(-.4, .05); sh.closePath();
    put(kite, new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: '#2fb67c', side: THREE.DoubleSide, roughness: .6, emissive: '#2fb67c', emissiveIntensity: .15 }), 0, 0, 0);
    const sh2 = new THREE.Shape(); sh2.moveTo(0, .55); sh2.lineTo(.4, .05); sh2.lineTo(0, .05); sh2.closePath();
    put(kite, new THREE.ShapeGeometry(sh2), new THREE.MeshStandardMaterial({ color: '#ffd166', side: THREE.DoubleSide, roughness: .6 }), 0, 0, .005, false);
    put(kite, new THREE.BoxGeometry(.02, 1.25, .02), mat.wood2, 0, -.07, .01, false); put(kite, new THREE.BoxGeometry(.8, .02, .02), mat.wood2, 0, .05, .01, false);
    const bows = [];
    for (let i = 0; i < 5; i++) { const b = put(kite, new THREE.BoxGeometry(.14, .05, .01), M(['#ec6a4e', '#3b82f6', '#ffd166', '#8b5cf6', '#ec6a4e'][i]), 0, -.85 - i * .22, 0, false); bows.push(b); }
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#fffaf4' })); line.frustumCulled = false; scene.add(line);
    n.kite = { g: kite, bows, line, h: 0 };
  }
  if (n.def.pose === 'serve') {
    // the cup Mei hands over
    const cup = new THREE.Group(); cup.position.set(0, -.5, .08); cup.visible = false; n.rig.arms[0].add(cup);
    put(cup, new THREE.CylinderGeometry(.06, .05, .17, 12), new THREE.MeshStandardMaterial({ color: '#c08552', roughness: .3 }), 0, 0, 0, false);
    put(cup, new THREE.CylinderGeometry(.008, .008, .16, 6), M('#ec6a4e'), .015, .13, 0, false);
    n.handProp = cup;
  }
  if (n.id === 'lin' || n.id === 'rosa') {
    // a spatula
    const sp = new THREE.Group(); sp.position.set(0, -.5, .06); sp.rotation.x = 1.3; n.rig.arms[0].add(sp);
    put(sp, new THREE.CylinderGeometry(.012, .012, .3, 6), M('#5a3a24'), 0, .1, 0, false);
    put(sp, new THREE.BoxGeometry(.1, .01, .12), mat.steel, 0, .27, .03, false);
  }
}
function npcTop(n) { const b = new THREE.Box3().setFromObject(n.rig.root); return b.max.y - n.rig.root.position.y; }

export function initNpcs() {
  talkTex = canvasTex(96, 96, (c) => {
    c.fillStyle = '#ffffff'; rrPath(c, 8, 12, 80, 58, 22); c.fill();
    c.beginPath(); c.moveTo(30, 66); c.lineTo(24, 86); c.lineTo(46, 68); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#ec6a4e'; rrPath(c, 8, 12, 80, 58, 22); c.stroke();
    c.fillStyle = '#ec6a4e'; for (const x of [30, 48, 66]) { c.beginPath(); c.arc(x, 41, 6, 0, 7); c.fill(); }
  });
  crumbTex = canvasTex(32, 32, (c) => { c.fillStyle = '#d9a35a'; c.beginPath(); c.arc(16, 16, 9, 0, 7); c.fill(); });
  for (const def of NPCS) {
    const rig = makeVillager(def.look); scene.add(rig.root);
    const start = def.at || (def.spots ? def.spots[0] : ROUTES[def.route][0]);
    const f = def.face || [0, 1], fl = Math.hypot(f[0], f[1]) || 1;
    /** @type {any} */
    const n = {
      id: def.id, def, npc: true, name: def.name, role: def.role, color: def.color, mode: def.mode, speed: def.speed || 1.2,
      x: start[0], z: start[1], y: 0, fx: f[0] / fl, fz: f[1] / fl, yaw: Math.atan2(f[0], f[1]), yawT: Math.atan2(f[0], f[1]), baseYaw: Math.atan2(f[0], f[1]), headYaw: 0,
      radius: def.talkAt ? 2.3 : 1.9, label: `Talk to ${def.name}`, sub: def.role,
      rig, path: [], pi: 0, wait: 0, hold: 0, walkPh: Math.random() * 6, gait: 0, spdNow: 0, ph: Math.random() * 6,
      serve: 0, serveDur: 1, emote: null, emoteT: 0, emoteDur: 0, talkT: 0, barkCd: 4 + Math.random() * 8, greeted: false, boost: 0, blink: 1 + Math.random() * 3, noteT: 0,
      top: 2.2, sayT: 0,
    };
    n.act = () => talkTo(n);
    n.alt = { label: def.alt.label, act: () => doAction(n, def.alt.act, false) };
    rig.root.position.set(n.x, 0, n.z); rig.root.rotation.y = n.yaw; rig.root.updateMatrixWorld(true);
    n.top = npcTop(n) - (def.pose === 'sit' ? .2 : 0);
    if (def.mode !== 'post') { n.body = { x: n.x, z: n.z, r: .3 }; movers.push(n.body); }
    else colliders.push({ x: n.x, z: n.z, r: .3 });
    if (!def.inTruck) { n.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), blobMat); n.blob.rotation.x = -Math.PI / 2; scene.add(n.blob); }
    n.hit = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2.3, 10), hitMat); n.hit.userData.npc = n; scene.add(n.hit); stationHits.push(n.hit);
    n.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: talkTex, toneMapped: false, fog: false, depthWrite: false })); n.icon.scale.setScalar(.52); scene.add(n.icon);
    const tag = document.createElement('div'); tag.className = 'npc-tag'; tag.innerHTML = `<span style="--c:${def.color}"></span>${esc(def.name)}<small>${esc(def.role)}</small>`;
    n.tagEl = tag; n.tag = new CSS2DObject(tag); n.tagOn = false; scene.add(n.tag);
    const bub = document.createElement('div'); bub.className = 'bubble npc-say'; bub.dataset.hide = ''; bub.style.setProperty('--c', def.color);
    n.bubbleEl = bub; n.bubble = new CSS2DObject(bub); scene.add(n.bubble);
    makeExtras(n);
    FOLK.push(n); BY[n.id] = n;
  }
  // routes need every obstacle in place, so they are planned last
  for (const n of FOLK) if (n.mode === 'route') n.path = planLoop(ROUTES[n.def.route]);
}
function planLoop(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const leg = buildPath({ x: a[0], z: a[1] }, { x: b[0], z: b[1] });
    leg.forEach((p, j) => out.push({ x: p.x, z: p.z, stop: j === leg.length - 1 && b[2] ? b[2] : 0 }));
  }
  return out;
}

/* ---- talking ---- */
function npcSay(n, text, secs = 3) { n.bubbleEl.textContent = text; delete n.bubbleEl.dataset.hide; n.sayT = secs; n.talkT = Math.min(2.5, text.length * .03); }
function onMet(n, quiet) {
  const total = FOLK.length;
  if (!quiet) floatText(n.x, n.y + n.top + 1.6, n.z, `New friend<small>${met.size} of ${total} townsfolk met</small>`, 2.2);
  if (met.size === total) setTimeout(() => toast(censusAsked ? '<b>You met everyone in town!</b> Mayor Maple has something for you.' : `<b>You met all ${total} townsfolk.</b> Mayor Maple would love to hear about it.`, 4), 700);
}
function meet(n, quiet = false) {
  if (met.has(n.id)) return;
  met.add(n.id); track('npc_met', { npc_id: n.id }); syncTracker(); addXP(1); onMet(n, quiet);
}
function showNode(n, id, node = null) {
  const nd = node || n.def.dialog.nodes[id];
  S.dialogue = { n, id, node: nd };
  n.talkT = Math.min(3, nd.text.length * .03);
  SFX.talk();
  store.set({ dialogue: { npc: n.id, name: n.name, role: n.role, color: n.color, text: nd.text, choices: (nd.choices || []).map(c => c.label), next: !!nd.next, n: ++dlgN } });
}
export function talkTo(n) {
  if (!S.started) { beginGame(); return; }
  if (S.dialogue && S.dialogue.n === n) return;
  closePanel();
  S.path = []; S.pendingAct = null; S.pendingOpen = null;
  meet(n);
  n.bubbleEl.dataset.hide = ''; n.sayT = 0; hush();
  showNode(n, n.def.dialog.start);
}
export function dialogueChoose(i) {
  const D = S.dialogue; if (!D) return;
  const c = (D.node.choices || [])[i]; if (!c) return;
  SFX.click();
  if (c.end) { dialogueClose(); return; }
  if (c.to) { showNode(D.n, c.to); return; }
  if (c.do) {
    if (INFO_ACTS.has(c.do)) {
      const r = doAction(D.n, c.do, true);
      if (r && typeof r === 'object') showNode(D.n, null, { text: r.reply, choices: [{ label: 'Back', to: D.n.def.dialog.start }, { label: 'Bye', end: true }] });
      return;
    }
    const n = D.n; dialogueClose();
    const r = doAction(n, c.do, true);
    if (typeof r === 'string') npcSay(n, r, 3.2);
  }
}
export function dialogueNext() {
  const D = S.dialogue; if (!D) return;
  if (D.node.next) showNode(D.n, D.node.next);
  else if (!(D.node.choices && D.node.choices.length)) dialogueClose();
}
export function dialogueClose() {
  const D = S.dialogue; if (!D) return;
  S.dialogue = null; store.set({ dialogue: null }); D.n.hold = 1.2; D.n.talkT = 0;
}
export function walkToNpc(n) {
  if (!S.started) beginGame();
  const d = Math.hypot(P.x - n.x, P.z - n.z);
  if (d <= n.radius) { n.act(); return; }
  let ax, az;
  if (n.def.talkAt) [ax, az] = n.def.talkAt;
  else { const ux = (P.x - n.x) / d, uz = (P.z - n.z) / d; ax = n.x + ux * 1.15; az = n.z + uz * 1.15; if (!walkable(ax, az)) { ax = n.x; az = n.z; } }
  walkTo({ x: ax, z: az }); S.pendingAct = n; markAt(ax, az, groundY(ax, az));
}

/* ---- what they do for you ---- */
function npcEmote(n, type, dur) { n.emote = type; n.emoteT = 0; n.emoteDur = dur; }
function serveFor(n, secs) { n.serve = secs; n.serveDur = secs; }
const ACTIONS = {
  handshake(n) {
    faceToward(n.x, n.z, 1.8); emote('hand', 1.4); npcEmote(n, 'hand', 1.4); SFX.pop();
    burst((n.x + P.x) / 2, 1.4, (n.z + P.z) / 2, ['#ffd166', '#e6a400', '#ffffff'], 16, 2.6);
    floatText(n.x, n.y + n.top + 1.6, n.z, `A pleasure!<small>${esc(n.name)} shook your hand</small>`, 2.4);
    markInteract('handshake');
  },
  busker(n) {
    faceToward(n.x, n.z, 1.6); emote('send', 1.0); SFX.coin(); setTimeout(() => SFX.tune(), 350);
    n.boost = 6; n.tips = Math.min(8, (n.tips || 2) + 1); n.caseCoins.forEach((c, i) => { c.visible = i < n.tips; });
    spriteBurst(n.x, n.y + 1.6, n.z, noteTex, 6, { size: .32, up: 1.3, spread: 1.2, life: 2 });
    floatText(n.x, n.y + n.top + 1.6, n.z, '♪ Thanks for the tip! ♪<small>Jules plays a song about long-distance love</small>', 2.8);
    markInteract('busker');
    return 'This one is called “Two Cities, One Dial.”';
  },
  boba(n) {
    faceToward(n.x, n.z, 2); serveFor(n, 1.4); emote('sip', 2.4);
    setTimeout(() => SFX.slurp(), 600);
    S.buffs.boba = 20;
    spriteBurst(FC.boba.x, FC.boba.y, FC.boba.z, sparkTex, 6, { size: .22, up: 1.2, spread: .6 });
    floatText(P.x, P.y + 2.9, P.z, 'Extra bouncy<small>Brown sugar boba · higher hops for 20 seconds</small>', 2.8);
    markInteract('boba');
    return 'Enjoy! Try a hop or two.';
  },
  snack(n) {
    faceToward(n.x, n.z, 2); serveFor(n, 1.6); SFX.sizzle(); stallPuff('griddle', 6);
    setTimeout(() => emote('eat', 2.2), 500);
    setTimeout(() => hamsterTreat(), 1500);
    floatText(n.x, n.y + n.top + 1.6, n.z, 'Crispy!<small>Henry shares a bite with his hamster</small>', 2.8);
    markInteract('snack');
    return 'Careful, it is hot!';
  },
  truck(n) {
    faceToward(n.x, n.z, 2); serveFor(n, 1.6); SFX.sizzle();
    spriteBurst(FC.window.x, FC.window.y, FC.window.z, puffTex, 7, { size: .35, up: 1, spread: .4, life: 1.6 });
    setTimeout(() => { emote('eat', 2.2); SFX.squeak(); }, 600);
    floatText(FC.window.x, 3.6, FC.window.z, 'Squeak, squeak<small>Fresh curds, hot gravy, crispy fries</small>', 2.8);
    markInteract('truck');
    return 'Order up! One prairie poutine.';
  },
  ducks(n) {
    faceToward(n.x, n.z, 1.6); serveFor(n, 1.8); emote('send', 1.1);
    lureDucks(n.x, n.z + .4, 8);
    spriteBurst(n.x, n.y + 1.0, n.z + .7, crumbTex, 12, { size: .08, up: 1.4, spread: 1.4, life: 1.4, g: 4 });
    setTimeout(() => SFX.quack(), 900); setTimeout(() => SFX.quack(), 1600);
    floatText(n.x, n.y + n.top + 1.6, n.z, 'Quack, quack!<small>The ducks paddle over for crumbs</small>', 2.8);
    markInteract('ducks');
    return 'There they come. The little one always wins.';
  },
  mail(n) {
    faceToward(n.x, n.z, 1.6); npcEmote(n, 'hand', 1.2); SFX.bell();
    const card = POSTCARDS[cardI++ % POSTCARDS.length];
    toast(`<b>Mail from Noor</b> · ${esc(card)}`, 4.2);
    mailFlag.rotation.z = -1.2;
    markInteract('mail');
    return 'Here you go, fresh from the sorting room!';
  },
  jog(n) {
    S.buffs.jog = 20; emote('cheer', 1.2);
    floatText(P.x, P.y + 2.9, P.z, "Runner's high<small>+25% speed for 20 seconds</small>", 2.6);
    markInteract('jog');
    return "Let's go! Try to keep up!";
  },
  sketch(n) {
    faceToward(n.x, n.z, 1.6); npcEmote(n, 'hand', 1.2); SFX.pop();
    const key = SKETCHES[sketchI++ % SKETCHES.length], [svg, cap] = SKETCH_SVG[key];
    toast(`<svg class="sketch" viewBox="0 0 64 64" aria-hidden="true">${svg}</svg><b>A sketch from Priya</b> · ${cap}`, 4.2);
    markInteract('sketch');
    return 'For you! Took me thirty seconds. Don’t tell anyone.';
  },
  kite(n) {
    faceToward(n.x, n.z, 1.6); emote('cheer', 1.4); SFX.whoosh(); n.boost = 9;
    if (n.kite) { const k = n.kite.g.position; spriteBurst(k.x, k.y, k.z, sparkTex, 10, { size: .3, up: .8, spread: 1.6 }); }
    markInteract('kite');
    return 'Woohoo! Look how high it goes!';
  },
  lrtfacts(n) {
    const fact = LRT_FACTS[factI++ % LRT_FACTS.length];
    let extra = '';
    if (!trainRunning()) { dispatchTrain(true); extra = ' Oh, and here comes a train now.'; }
    markInteract('lrtfacts');
    return { reply: fact + extra };
  },
  census(n) {
    const total = FOLK.length;
    if (store.get().censusDone) return { reply: "You already have the key to Quest Town. It doesn't open anything, but it looks lovely on a keyring." };
    censusAsked = true;
    if (met.size >= total) {
      store.set({ censusDone: true });
      addXP(10); SFX.level(); emote('cheer', 2.2);
      burst(P.x, P.y + 2.2, P.z, ['#ffd166', '#e6a400', '#ec6a4e', '#3b82f6', '#2fb67c'], 40, 5);
      setTimeout(() => toast('<b>Quest complete: Town census</b> · You got the key to Quest Town · +10 XP', 4.5), 300);
      track('census_complete');
      return { reply: 'Everyone says you are lovely! As promised, here is the key to Quest Town. Henry will be thrilled.' };
    }
    const left = FOLK.filter(f => !met.has(f.id)).map(f => f.name);
    const list = left.length > 3 ? `${left.slice(0, 3).join(', ')} and ${left.length - 3} more` : left.join(', ').replace(/, ([^,]*)$/, ' and $1');
    return { reply: `A small job, if you like: say hi to everyone who lives here. You have met ${met.size} of ${total}. Still to meet: ${list}. Come back when you are done.` };
  },
  tour() { startTour(); },
  about() { walkToStation('about'); },
};
function doAction(n, act, fromDialog) {
  if (!S.started) { beginGame(); return; }
  const f = ACTIONS[act]; if (!f) return;
  meet(n, true);
  const r = f(n);
  if (!fromDialog && r) npcSay(n, typeof r === 'string' ? r : r.reply, typeof r === 'string' ? 3 : 6);
  return r;
}

/* ---- every frame ---- */
function moveNpc(n, dt) {
  if (n.mode === 'stroll' && !n.path.length && n.wait <= 0) {
    const sp = n.def.spots, cur = n.spotI || 0; let next = Math.floor(Math.random() * sp.length); if (next === cur) next = (next + 1) % sp.length;
    n.spotI = next; n.path = buildPath({ x: n.x, z: n.z }, { x: sp[next][0], z: sp[next][1] }); n.pi = 0;
    if (!n.path.length) n.wait = 2;
  }
  if (!n.path.length || n.wait > 0) return 0;
  const wp = n.path[n.pi], dx = wp.x - n.x, dz = wp.z - n.z, d = Math.hypot(dx, dz);
  // don't walk into Henry
  const hx = P.x - n.x, hz = P.z - n.z, hd = Math.hypot(hx, hz);
  if (hd < 1.0 && d > .01 && (hx * dx + hz * dz) / (hd * d) > .3) { n.hold = .5; return 0; }
  if (d < .12) {
    n.pi++;
    if (wp.stop) n.wait = wp.stop;
    if (n.pi >= n.path.length) { if (n.mode === 'route') n.pi = 0; else { n.path = []; n.pi = 0; n.wait = 3 + Math.random() * 3.5; } }
    return 0;
  }
  const step = Math.min(d, n.speed * dt); n.x += dx / d * step; n.z += dz / d * step; n.yawT = Math.atan2(dx, dz);
  return step / Math.max(dt, 1e-4);
}
const _hand = new THREE.Vector3(), _kp = new THREE.Vector3();
function poseNpc(n, dt, t) {
  const R = n.rig, d = n.def;
  n.gait = lerp(n.gait, clamp(n.spdNow / (d.jog ? 3 : 1.6), 0, 1.2), 1 - Math.exp(-dt * 10));
  n.walkPh += n.spdNow * dt * (d.jog ? 2.5 : 3.4);
  const a = reduceMotion ? Math.min(n.gait, .4) : n.gait, s = Math.sin(n.walkPh), wk = clamp(a * 2.5, 0, 1);
  // pose when standing still
  let armR = 0, armL = 0, armRz = 0, armLz = 0, legR = 0, legL = 0, hipY = .7 + Math.sin(t * 2 + n.ph) * .006, lean = 0, roll = 0, headPitch = 0, headTilt = 0;
  const sv = n.serveDur ? clamp(Math.min((n.serveDur - n.serve) * 6, n.serve * 6), 0, 1) : 0;
  switch (d.pose) {
    case 'strum': { const r = n.boost > 0 ? 15 : 8; armR = -.95 + Math.sin(t * r) * .2; armRz = -.55; armL = -1.5; armLz = -.6; roll = Math.sin(t * 2.2) * .05; headTilt = Math.sin(t * 2.2 + .5) * .12; hipY += Math.abs(Math.sin(t * (n.boost > 0 ? 6 : 4.4))) * .02; break; }
    case 'serve': armR = lerp(-.7 + Math.sin(t * 2.6 + n.ph) * .06, -1.5, sv); armL = -.7; armRz = .05; armLz = .05; break;
    case 'cook': armR = -1.0 + Math.sin(t * (n.serve > 0 ? 15 : 5)) * (n.serve > 0 ? .35 : .18); armL = -.85; armLz = .1; headPitch = .2; break;
    case 'sit': hipY = .5; legR = legL = -1.45; lean = -.1; armR = armL = -.55; armRz = armLz = .1; if (n.serve > 0) armR = lerp(armR, -1.7 + Math.sin(n.serve * 16) * .35, sv); break;
    case 'paint': armR = -1.3 + Math.sin(t * 3.1) * .12; armRz = -.1 + Math.sin(t * 2.3) * .14; armL = -.9; armLz = .25; headTilt = Math.sin(t * .7) * .1; break;
    case 'kite': armR = -2.6 + Math.sin(t * 1.3) * .08; armRz = .15; armL = -.25; headPitch = -.4; if (n.boost > 0 && !reduceMotion) hipY += Math.abs(Math.sin(t * 7)) * .07; break;
    case 'wait': { const w = (t * .13 + n.ph) % 1; if (w < .14) { armL = -1.35; armLz = -.55; headPitch = .35; } break; }
    default: if (n.mode === 'stroll') { armR = armL = .35; armRz = armLz = -.05; } // the mayor clasps her hands behind her back
  }
  // walking takes over the legs and arms
  if (wk > 0) {
    const sw = d.jog ? .95 : .7;
    legR = lerp(legR, s * sw * a, wk); legL = lerp(legL, -s * sw * a, wk);
    armR = lerp(armR, -s * .6 * a - (d.jog ? .5 : 0), wk); armL = lerp(armL, s * .6 * a - (d.jog ? .5 : 0), wk);
    armRz = lerp(armRz, 0, wk); armLz = lerp(armLz, 0, wk);
    hipY += Math.abs(Math.cos(n.walkPh)) * (d.jog ? .09 : .05) * a; lean = lerp(lean, d.jog ? .2 : .08, wk);
  }
  // little emotes on top
  if (n.emote) {
    n.emoteT += dt; const k = clamp(Math.min(n.emoteT * 5, (n.emoteDur - n.emoteT) * 5), 0, 1), et = n.emoteT;
    if (n.emote === 'wave') { armRz = lerp(armRz, 2.6 + Math.sin(et * 11) * .28, k); armR = lerp(armR, 0, k); headTilt += .14 * k; }
    else if (n.emote === 'hand') { armR = lerp(armR, -1.25 + Math.sin(et * 14) * .12, k); armRz = lerp(armRz, .1, k); }
    if (n.emoteT >= n.emoteDur) n.emote = null;
  }
  if (n.handProp) n.handProp.visible = sv > .3;
  R.legs[0].rotation.x = legR; R.legs[1].rotation.x = legL;
  R.arms[0].rotation.set(armR, 0, -(.1 + armRz)); R.arms[1].rotation.set(armL, 0, .1 + armLz);
  R.hips.position.set(0, hipY, d.pose === 'sit' ? -.06 : 0); R.body.rotation.set(lean, 0, roll);
  // look at Henry when he is close, or while talking
  const dP = Math.hypot(P.x - n.x, P.z - n.z), talking = S.dialogue && S.dialogue.n === n;
  let hy = 0;
  if ((dP < 4.5 && S.started) || talking) hy = clamp(angDiff(Math.atan2(P.x - n.x, P.z - n.z), n.yaw), -1.1, 1.1);
  else if (d.pose === 'wait' || d.mode === 'stroll') hy = Math.sin(t * .5 + n.ph) * .35;
  n.headYaw = lerp(n.headYaw, hy, 1 - Math.exp(-dt * 6));
  if (n.talkT > 0) { n.talkT -= dt; headPitch += Math.sin(t * 9) * .05; R.mouth.scale.set(1, 1 + Math.abs(Math.sin(t * 15)) * 1.2, 1); } else R.mouth.scale.set(1, 1, 1);
  R.head.rotation.set(headPitch, n.headYaw, headTilt);
  n.blink -= dt; if (n.blink < 0) n.blink = 2.2 + Math.random() * 3;
  const eyeS = n.blink < .12 ? .12 : 1; R.eyes.forEach(e => { e.scale.y = eyeS; });
  R.root.position.set(n.x, n.y, n.z); R.root.rotation.y = n.yaw;
}
function updateKite(n, dt, t) {
  const K = n.kite; if (!K) return;
  K.h = lerp(K.h, n.boost > 0 ? 1 : 0, 1 - Math.exp(-dt * 1.5));
  const w = .6 + WXS.wind, dist = 4.2 + K.h * 1.8, height = 4.6 + K.h * 3.2;
  const sway = reduceMotion ? 0 : 1;
  _kp.set(n.x + n.fx * dist + Math.sin(t * .7) * .9 * w * sway, height + Math.sin(t * 1.1) * .45 * sway + (K.h > .5 ? Math.sin(t * 3) * .5 * sway : 0), n.z + n.fz * dist + Math.cos(t * .6) * .6 * w * sway);
  K.g.position.copy(_kp);
  n.rig.root.updateMatrixWorld(true);
  n.rig.arms[0].localToWorld(_hand.set(0, -.47, 0));
  K.g.lookAt(_hand); K.g.rotateZ(Math.sin(t * 1.7) * .25 * sway + (K.h > .5 ? t * 2.5 * sway : 0));
  K.bows.forEach((b, i) => { b.position.x = Math.sin(t * 4 - i * .9) * .08 * (i + 1) * sway; });
  const pos = K.line.geometry.attributes.position, end = K.g.position;
  for (let i = 0; i < 12; i++) { const u = i / 11; pos.setXYZ(i, lerp(_hand.x, end.x, u), lerp(_hand.y, end.y, u) - Math.sin(u * Math.PI) * .5, lerp(_hand.z, end.z, u)); }
  pos.needsUpdate = true;
}
export function updateNpcs(dt, t) {
  const total = FOLK.length, done = store.get().censusDone;
  for (const n of FOLK) {
    const talking = S.dialogue && S.dialogue.n === n, waitingForHenry = S.pendingAct === n;
    n.hold -= dt; n.boost = Math.max(0, n.boost - dt); n.serve = Math.max(0, n.serve - dt); n.barkCd -= dt;
    const dP = Math.hypot(P.x - n.x, P.z - n.z);
    // walking the route or strolling between spots
    n.spdNow = 0;
    if (n.mode !== 'post') {
      if (talking || waitingForHenry || n.hold > 0) { n.wait = Math.max(n.wait, 0); }
      else if (n.wait > 0) n.wait -= dt;
      else n.spdNow = moveNpc(n, dt);
      n.body.x = n.x; n.body.z = n.z;
    }
    // facing: their own direction, or towards Henry while they chat
    if (talking || waitingForHenry || (n.mode !== 'post' && n.spdNow === 0 && dP < 2.6)) {
      const want = Math.atan2(P.x - n.x, P.z - n.z);
      // townsfolk at a counter or on a bench only turn a little toward Henry
      n.yawT = n.mode === 'post' ? n.baseYaw + clamp(angDiff(want, n.baseYaw), -.9, .9) : want;
    } else if (n.mode === 'post') n.yawT = n.baseYaw;
    if (n.def.pose !== 'sit') n.yaw += angDiff(n.yawT, n.yaw) * (1 - Math.exp(-dt * 7));
    n.y = n.def.inTruck ? .55 : groundY(n.x, n.z);
    if (talking) faceToward(n.x, n.z, .4);
    // say hello the first time Henry walks up, then the odd remark
    if (S.started && !talking && dP < 3.6 && n.barkCd <= 0) {
      if (!n.greeted && !met.has(n.id)) { n.greeted = true; npcEmote(n, 'wave', 1.6); npcSay(n, n.def.barks[0], 2.8); }
      else npcSay(n, n.def.barks[Math.floor(Math.random() * n.def.barks.length)], 2.8);
      n.barkCd = 16 + Math.random() * 12;
    }
    if (n.sayT > 0) { n.sayT -= dt; if (n.sayT <= 0) n.bubbleEl.dataset.hide = ''; }
    if (talking && n.sayT > 0) { n.sayT = 0; n.bubbleEl.dataset.hide = ''; }
    // busking notes
    if (n.id === 'jules' && n.boost > 0 && !reduceMotion) { n.noteT -= dt; if (n.noteT <= 0) { n.noteT = .55; spriteBurst(n.x, n.y + 1.7, n.z, noteTex, 1, { size: .28, up: 1.1, spread: .9, life: 1.8 }); } }
    poseNpc(n, dt, t);
    updateKite(n, dt, t);
    // labels, the talk icon and the click target
    const top = n.y + n.top;
    n.hit.position.set(n.x, n.y + 1.15, n.z);
    if (n.blob) n.blob.position.set(n.x, n.y + .03, n.z);
    const ready = n.id === 'mayor' && met.size >= total && !done;
    n.icon.visible = S.started && !talking && (!met.has(n.id) || ready);
    if (n.icon.visible) {
      const want = ready ? markTex : talkTex; if (n.icon.material.map !== want) { n.icon.material.map = want; n.icon.material.needsUpdate = true; }
      n.icon.position.set(n.x, top + .42 + (reduceMotion ? 0 : Math.sin(t * 2.4 + n.ph) * .08), n.z);
    }
    n.tag.position.set(n.x, top + (n.icon.visible ? .95 : .45), n.z);
    n.bubble.position.set(n.x, top + (n.icon.visible ? 1.3 : .85), n.z);
    const show = S.started && !S.photo && (dP < 4 || (S.hoverObj && S.hoverObj.npc === n) || talking);
    if (show !== n.tagOn) { n.tagOn = show; n.tagEl.style.opacity = show ? '1' : '0'; }
  }
  // Henry stops short of someone he walked over to
  const pa = S.pendingAct;
  if (pa && pa.npc && !pa.def.talkAt && S.path.length && Math.hypot(P.x - pa.x, P.z - pa.z) < 1.5) { S.path = []; onArrive(); }
}
/** the townsfolk's dots on the minimap */
export const folkDots = () => FOLK.map(n => ({ x: n.x, z: n.z, c: n.color, met: met.has(n.id) }));
