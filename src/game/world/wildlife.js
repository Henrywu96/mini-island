// Canadian wildlife, every kind as a male and female pair: two beavers by their lodge at the duck pond,
// two common loons on the water, a bull and a cow moose grazing at the edge of town and four pairs of
// Canada geese that fly over in a V. Walk up to the beavers, the loons and the moose and they react
// (each counts as an interaction).
//
// Each animal is sculpted from smooth parts that are baked into a few vertex-coloured meshes (one per
// moving part), so they stay detailed without costing many draw calls.
import { THREE, scene, canvasTex, colliders, puffTex } from '../gfx.js';
import { POND, TOWN_R } from '../nav.js';
import { S } from '../state.js';
import { reduceMotion, srand } from '../util.js';
import { SFX } from '../sound.js';
import { floatText, spriteBurst } from '../play/fx.js';
import { markInteract } from '../play/hud.js';
import { P } from '../play/player.js';
import { GROUND_Y, CLEARING } from './town.js';

const near = (x, z, r) => S.started && Math.hypot(P.x - x, P.z - z) < r;

/* ---- sculpting helpers ---- */
const FUR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78 });
const GLOSS = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .35 });
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color(), _v = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/**
 * one part: a geometry placed with position p, rotation r (radians, optional Euler order) and scale s,
 * painted with a colour, or with a function (x, y, z) => colour for gradients and patterns
 */
function part(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = 1, order = 'XYZ') {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose();
  if (r.isQuaternion) _q.copy(r); else { _e.set(r[0], r[1], r[2], order); _q.setFromEuler(_e); }
  _m.compose(_p.set(p[0], p[1], p[2]), _q, typeof s === 'number' ? _s.set(s, s, s) : _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m);
  const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (typeof color !== 'function') _c.set(color);
    else if (color.flat) { const j = i - (i % 3); _c.set(color((pos.getX(j) + pos.getX(j + 1) + pos.getX(j + 2)) / 3, (pos.getY(j) + pos.getY(j + 1) + pos.getY(j + 2)) / 3, (pos.getZ(j) + pos.getZ(j + 1) + pos.getZ(j + 2)) / 3)); }
    else _c.set(color(pos.getX(i), pos.getY(i), pos.getZ(i)));
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/** paint whole triangles from their centres, for crisp stripes and spots */
const flat = fn => Object.assign(fn, { flat: true });
/** bake parts into one mesh */
function sculpt(parts, mat = FUR, shadow = true) {
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m;
}
const sph = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
const cap = (r, len, w = 14) => new THREE.CapsuleGeometry(r, len, 6, w);
const cyl = (r1, r2, h, w = 14) => new THREE.CylinderGeometry(r1, r2, h, w);
const cone = (r, h, w = 14) => new THREE.ConeGeometry(r, h, w);
/** a body of revolution: profile [radius, along] points turned around the long axis, lying along +z */
const lathe = (pts, w = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), w).rotateX(Math.PI / 2);
/** a flat shape, `depth` thick with rounded edges, lying flat with its y axis pointing forward (+z) */
function slab(pts, depth, bevel = .01) {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); g.rotateX(Math.PI / 2); return g;
}
/** two glossy eyes with a small white glint, for faces looking along +z */
function eyes(arr, x, y, z, r, iris = '#121214') {
  for (const s of [-1, 1]) {
    arr.push(part(sph(r, 12, 10), iris, [s * x, y, z]));
    arr.push(part(sph(r * .32, 8, 6), '#ffffff', [s * (x - r * .1), y + r * .4, z + r * .75]));
  }
}

/* ---- beavers ---- */
// a pair: the male gnaws a chewed stick, the female (a little smaller, with a redder coat) a leafy willow twig
const BV = { list: [], x: 0, z: 0, since: Infinity, cool: 0 };
function beaverLodge(lx, lz) {
  const L = [];
  const mud = (x, y, z) => (y > .38 ? '#6e5038' : Math.sin(x * 37 + z * 23) > .2 ? '#5e432f' : '#6a4b34');
  // a rounded dome of mud
  const RX = .64, RY = .52;
  L.push(part(new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), mud, [0, 0, 0], [0, 0, 0], [RX, RY, RX]));
  // sticks and branches laid over it every which way, lying on the surface
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mer = new THREE.Vector3(), az = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399, f = Math.acos(1 - ((i * .618) % 1) * .93), psi = Math.sin(i * 12.9898) * 1.3;   // f: angle down from the top
    const sf = Math.sin(f), cf = Math.cos(f), ca = Math.cos(a), sa = Math.sin(a);
    mer.set(RX * cf * ca, -RY * sf, RX * cf * sa).normalize(); az.set(-sa, 0, ca);
    dir.copy(mer).multiplyScalar(Math.cos(psi)).addScaledVector(az, Math.sin(psi)).normalize();
    nrm.set(sf * ca / RX, cf / RY, sf * sa / RX).normalize();
    const len = .2 + ((i * 7) % 5) * .045, th = .016 + (i % 3) * .005;
    L.push(part(cyl(th * .8, th, len, 6), (i % 3) ? '#8a6340' : (i % 2) ? '#a57a4d' : '#6e4e33',
      [RX * sf * ca + nrm.x * th, RY * cf + nrm.y * th, RX * sf * sa + nrm.z * th], new THREE.Quaternion().setFromUnitVectors(up, dir)));
  }
  // a couple of leafy branches still poking out of the top
  for (const [a, l] of [[.6, .32], [2.4, .26], [4.3, .3]]) L.push(part(cyl(.012, .018, l, 5), '#7a573a', [Math.cos(a) * .12, .5 + l * .3, Math.sin(a) * .12], [Math.sin(a) * .7, 0, -Math.cos(a) * .7]));
  // a little mud apron where it meets the water
  L.push(part(sph(.5, 18, 8), '#5a4030', [0, -.02, 0], [0, 0, 0], [1.25, .08, 1.1]));
  const m = sculpt(L); m.position.set(lx, GROUND_Y, lz); scene.add(m);
  colliders.push({ x: lx, z: lz, r: .66 });
}
let scaleTex = null;
/** one beaver sitting up on its haunches at (x, z), facing yaw */
function beaver(x, z, yaw, { s = 1, fur = '#7b4a28', top = '#6e4224', belly = '#a5744a', leafy = false, lag = 0, ph = 0 } = {}) {
  const coat = (px, py, pz) => (py < .14 && pz > -.02 ? '#9a6a42' : py > .36 ? top : fur), dark = '#3b2a22';
  const g = new THREE.Group(); g.position.set(x, GROUND_Y, z); g.rotation.y = yaw; g.scale.setScalar(s); scene.add(g);
  // the body, round and pear-shaped
  const B = [];
  B.push(part(lathe([[0, 0], [.13, .02], [.2, .08], [.235, .17], [.235, .26], [.21, .34], [.16, .42], [.1, .47], [0, .5]]).rotateX(-Math.PI / 2), coat, [0, .03, -.04], [.62, 0, 0], [1, 1, 1.02]));
  B.push(part(sph(.15), belly, [0, .18, .1], [.5, 0, 0], [1, 1.2, .6]));                           // lighter belly
  for (const sd of [-1, 1]) {
    // big webbed hind feet
    B.push(part(slab([[-.05, -.06], [.05, -.06], [.075, .04], [.08, .13], [.04, .16], [0, .12], [-.04, .16], [-.08, .13], [-.075, .04]], .02, .008), dark, [sd * .13, .015, .1], [0, sd * -.25, 0], .8));
    // haunches
    B.push(part(sph(.11), coat, [sd * .13, .1, -.02], [0, 0, 0], [1, .9, 1.2]));
    // short front arms holding the stick to its mouth
    B.push(part(cap(.032, .1, 10), coat, [sd * .085, .33, .2], [-.9, 0, sd * .4]));
    B.push(part(sph(.035, 10, 8), dark, [sd * .06, .37, .27]));
  }
  if (leafy) {
    // a willow twig with a few leaves at the end
    B.push(part(cyl(.018, .022, .44, 8), '#7a5a3a', [0, .38, .28], [0, 0, Math.PI / 2 - .15]));
    for (let i = 0; i < 6; i++) B.push(part(sph(.05, 8, 6), i % 2 ? '#6fa84a' : '#88bd5a', [.2 + (i % 3) * .045, .41 + (i % 3) * .025, .27 + (i % 2 ? .03 : -.03)], [i, i * .7, 0], [1, .25, .45]));
  } else B.push(part(cyl(.03, .032, .46, 12), (px) => (Math.abs(px + .05) < .04 ? '#e9cfa0' : '#8a6340'), [0, .38, .28], [0, 0, Math.PI / 2]));   // a stick with pale chewed patches
  g.add(sculpt(B));
  // head: round, with plump cheeks, a dark nose, small ears, whiskers and the famous orange teeth
  const head = new THREE.Group(); head.position.set(0, .45, .14); g.add(head);
  const H = [];
  H.push(part(sph(.125), fur, [0, .04, .04], [0, 0, 0], [1, .92, 1.12]));
  H.push(part(sph(.075), '#8e5c36', [0, -.005, .13], [0, 0, 0], [1.25, .85, 1]));
  for (const sd of [-1, 1]) {
    H.push(part(sph(.055), '#93613a', [sd * .055, -.01, .14]));
    H.push(part(sph(.03, 12, 8), dark, [sd * .095, .125, -.005], [0, 0, 0], [1, 1, .55]));
    for (let w = 0; w < 3; w++) H.push(part(cyl(.0025, .0015, .13, 4), '#e6d6bb', [sd * .1, -.005 - w * .012, .17], [0, 0, Math.PI / 2 + sd * (w - 1) * .18]));
    H.push(part(new THREE.BoxGeometry(.021, .05, .012), '#e8902a', [sd * .012, -.07, .17]));
  }
  H.push(part(sph(.03, 12, 8), '#1d1512', [0, .03, .2], [0, 0, 0], [1.35, .8, 1]));
  eyes(H, .07, .075, .115, .02);
  head.add(sculpt(H, GLOSS));
  // the flat, scaly tail, hinged at its root so it can slap the ground
  const tail = new THREE.Group(); tail.position.set(0, .045, -.11); g.add(tail);
  if (!scaleTex) {
    scaleTex = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#2b201b'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4b3b31'; c.lineWidth = 3;
      for (let i = -h; i < w + h; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
    });
    scaleTex.wrapS = scaleTex.wrapT = THREE.RepeatWrapping; scaleTex.repeat.set(24, 24);   // the paddle's UVs are in metres
  }
  const paddle = new THREE.Mesh(slab([[0, 0], [.06, -.03], [.085, -.12], [.08, -.24], [.05, -.32], [0, -.345], [-.05, -.32], [-.08, -.24], [-.085, -.12], [-.06, -.03]], .03, .012), new THREE.MeshStandardMaterial({ map: scaleTex, roughness: .6 }));
  paddle.rotation.x = -.08; paddle.castShadow = true; tail.add(paddle);
  colliders.push({ x, z, r: .35 * s });
  BV.list.push({ g, head, tail, x, z, s, lag, ph });
}
function initBeaver() {
  // the lodge sits on the north-west shore of the pond, clear of the ducks and Grandpa Wen's bench,
  // with one beaver on either side of it
  const a = Math.PI * 1.25, lx = POND.x + Math.cos(a) * (POND.r + .6), lz = POND.z + Math.sin(a) * (POND.r + .6);
  beaverLodge(lx, lz);
  const mx = lx + Math.cos(a - 1.2) * 1.02, mz = lz + Math.sin(a - 1.2) * 1.02;
  const fx = lx + Math.cos(a + .85) * 1.0, fz = lz + Math.sin(a + .85) * 1.0;
  beaver(mx, mz, Math.atan2(lx - mx, lz - mz) + 1.6);
  beaver(fx, fz, Math.atan2(lx - fx, lz - fz) - 1.6, { s: .92, fur: '#86532e', top: '#774827', belly: '#b07e52', leafy: true, lag: .25, ph: 1.7 });
  BV.x = (mx + fx) / 2; BV.z = (mz + fz) / 2;
}
function updateBeaver(dt, t) {
  if (!BV.list.length) return;
  BV.cool = Math.max(0, BV.cool - dt); BV.since += dt;
  if (BV.cool <= 0 && BV.list.some(b => near(b.x, b.z, 2.6))) {
    BV.since = 0; BV.cool = 14; SFX.kick();
    for (const b of BV.list) spriteBurst(b.x, .25, b.z, puffTex, 5, { size: .3, up: 1, spread: .8, life: .9 });
    floatText(BV.x, 1.2, BV.z, 'Tail slap!<small>A beaver pair, Canada’s national animal</small>', 2.8);
    markInteract('beaver');
  }
  for (const b of BV.list) {
    const e = BV.since - b.lag;   // seconds since this one was startled (the female reacts a beat later)
    // the tail lifts, then slaps down and wobbles
    b.tail.rotation.x = e >= 0 && e < .25 ? 1.0 : e >= .25 && e < .7 ? Math.abs(Math.sin((.7 - e) * 30)) * .2 : reduceMotion ? 0 : Math.abs(Math.sin(t * 1.3 + b.ph)) * .05;
    // ducks into the lodge for a few seconds, then peeks back out
    const k = e < .8 ? 0 : e < 5.4 ? 1 : e < 6 ? (6 - e) / .6 : 0;
    b.g.position.y = GROUND_Y - .45 * k; b.g.visible = k < .98;
    // gnawing away
    b.head.rotation.x = reduceMotion ? .05 : .05 + Math.max(0, Math.sin(t * 9 + b.ph)) * .1;
    b.head.rotation.y = reduceMotion ? 0 : Math.sin(t * .7 + b.ph) * .12;
  }
}

/* ---- a pair of loons on the pond ---- */
// they swim one behind the other and dive together, the female (a touch smaller) a moment after the male
const LN = { list: [], dive: Infinity, next: 18, called: 0 };
let loonGeo = null;
function loonMesh() {
  if (!loonGeo) {
    const L = [];
    const black = '#15171a', head = '#1a2a24';
    // a long, low body: black on top, white below the waterline
    L.push(part(lathe([[0, -.3], [.07, -.28], [.12, -.2], [.145, -.08], [.15, .04], [.13, .15], [.09, .23], [0, .27]]), (x, y) => (y < -.035 ? '#f1f1ec' : black), [0, .05, 0], [0, 0, 0], [1, .66, 1]));
    // the checkerboard of white spots on its back and the fine speckles on its flanks
    for (let row = 0; row < 6; row++) for (let col = -3; col <= 3; col++) {
      const z = -.15 + row * .05 + (col % 2 ? .02 : 0), x = col * .035, y = .05 + .095 * Math.sqrt(Math.max(0, 1 - (x / .15) ** 2 - (z / .3) ** 2));
      if (Math.abs(x) < .13 && y > .07) L.push(part(new THREE.BoxGeometry(.014, .004, .014), '#f4f4ef', [x, y + .002, z], [0, .3, 0]));
    }
    for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1, z = -.2 + (i >> 1) * .033; L.push(part(sph(.006, 6, 4), '#e9e9e3', [s * .135, .055 + (i % 3) * .008, z])); }
    // neck and head with the white striped collar, dagger bill and red eyes
    L.push(part(cyl(.042, .06, .17, 18), head, [0, .14, .19], [.38, 0, 0]));
    // the striped white necklace
    L.push(part(new THREE.CylinderGeometry(.05, .052, .026, 48, 1, true), flat((x, y, z) => (Math.round((Math.atan2(x, z - .2) + Math.PI) / (Math.PI * 2) * 48) % 2 ? '#f4f4ef' : head)), [0, .168, .201], [.38, 0, 0]));
    L.push(part(sph(.062), head, [0, .23, .245], [-.15, 0, 0], [.9, .92, 1.3]));
    L.push(part(cone(.02, .13, 10), '#22262b', [0, .225, .36], [Math.PI / 2, 0, 0], [1, 1, .72]));
    eyes(L, .04, .245, .27, .012, '#c3202a');
    loonGeo = sculpt(L, GLOSS, false).geometry;
  }
  const g = new THREE.Mesh(loonGeo, GLOSS); g.castShadow = false; g.receiveShadow = true; scene.add(g);
  return g;
}
const rippleMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35, depthWrite: false });
function initLoon() {
  for (const [off, s, lag] of [[0, 1, 0], [-.95, .9, .5]]) {
    const g = loonMesh(); g.scale.setScalar(s);
    // a soft ring of ripples around each one on the water
    const ripple = new THREE.Mesh(new THREE.RingGeometry(.22, .26, 32), rippleMat()); ripple.rotation.x = -Math.PI / 2; scene.add(ripple);
    LN.list.push({ g, ripple, a: off, s, lag, ph: off * 3 });
  }
}
function updateLoon(dt, t) {
  if (!LN.list.length) return;
  // every so often the pair dives and comes up a little further round the pond
  LN.next -= dt; LN.dive += dt;
  if (LN.next <= 0 && !reduceMotion) { LN.dive = 0; LN.next = 20 + srand() * 14; }
  for (const l of LN.list) {
    const e = LN.dive - l.lag, under = e >= 0 && e < 3.5;
    if (!reduceMotion) l.a += dt * (under ? .66 : .16);
    const x = POND.x + Math.cos(l.a) * .85, z = POND.z + Math.sin(l.a) * .85;
    l.g.position.set(x, GROUND_Y + .02 + Math.sin(t * 1.7 + l.ph) * .006 - (under && e < .3 ? e * .4 : 0), z); l.g.rotation.y = -l.a;
    l.g.visible = !under || e < .3 || e > 3.2;
    const rk = (t * .45 + l.ph * .1) % 1;
    l.ripple.position.set(x, GROUND_Y + .03, z); l.ripple.scale.setScalar((1 + rk * 1.6) * l.s); l.ripple.material.opacity = .32 * (1 - rk) * (l.g.visible ? 1 : .5);
  }
  LN.called = Math.max(0, LN.called - dt);
  if (LN.called <= 0 && near(POND.x, POND.z, POND.r + 2.2)) {
    // the male calls and the female answers
    LN.called = 40; SFX.loon(); setTimeout(() => SFX.loon(), 2600);
    const l = LN.list[0];
    floatText(l.g.position.x, .9, l.g.position.z, 'Ooo-ooo-ooo…<small>A pair of common loons, the bird on Canada’s $1 coin</small>', 3);
    markInteract('loon');
  }
}

/* ---- moose at the edge of town ---- */
// a bull and a cow graze in the meadow the woods leave open for them (CLEARING), just past where Henry
// can walk. Only the bull grows antlers; the cow is a little smaller, with a lighter, browner face.
const MO = { list: [], alert: 0, cool: 0 };
/** a palmate moose antler as a flat shape: x points out from the skull, y forward */
function antler(s) {
  const pts = [[0, .03], [.17, .05], [.24, .19], [.3, .32], [.34, .2], [.45, .24], [.55, .38], [.58, .22], [.68, .2], [.82, .29], [.79, .12], [.88, .05], [.99, .07], [.91, -.05], [.97, -.15], [.84, -.14], [.86, -.27], [.74, -.2], [.6, -.24], [.43, -.18], [.28, -.09], [.17, -.03], [0, -.03]];
  return slab(s > 0 ? pts : pts.map(([x, y]) => [-x, y]).reverse(), .035, .014);
}
const BULL = { back: '#2f2119', flank: '#47321f', saddle: '#4f3a2b', legs: '#3a291e', face: '#46311f', muzzle: '#3d2a1d' };
const COW = { back: '#3a291f', flank: '#55402f', saddle: '#5e4836', legs: '#45332a', face: '#68503d', muzzle: '#5a4434' };
function moose(a0, r, { bull = true, s = 1, graze = 0 } = {}) {
  const C = bull ? BULL : COW;
  const g = new THREE.Group(); g.scale.setScalar(s); scene.add(g);
  const m = { g, head: null, legs: [], a0, a: a0, r, dir: bull ? 1 : -1, graze, ph: bull ? 0 : 1.3 };
  // coat: near-black on the back, dark brown on the flanks, a lighter saddle
  const coat = (x, y, z) => (y > 1.72 ? C.back : y < 1.02 ? C.legs : z > .3 && y > 1.45 ? C.saddle : C.flank);
  const T = [];
  T.push(part(lathe([[0, -1.0], [.28, -.96], [.42, -.82], [.47, -.56], [.48, -.2], [.5, .15], [.52, .45], [.48, .7], [.36, .88], [0, .98]]), coat, [0, 1.3, 0], [0, 0, 0], [.82, 1.06, 1]));
  T.push(part(sph(.4), coat, [0, 1.64, .46], [0, 0, 0], [.85, .72, 1.25]));          // the shoulder hump
  T.push(part(sph(.42), coat, [0, 1.35, .78], [0, 0, 0], [.78, .95, .8]));            // deep chest
  T.push(part(sph(.43), coat, [0, 1.34, -.72], [0, 0, 0], [.86, .88, .9]));           // rump
  T.push(part(cone(.07, .16, 10), C.back, [0, 1.45, -1.1], [-2.3, 0, 0]));           // stubby tail
  g.add(sculpt(T));
  // legs: dark thighs, then long pale grey-tan lower legs ending in split hooves
  for (const [lx, lz, front] of [[-.27, .62, 1], [.27, .62, 1], [-.25, -.66, 0], [.25, -.66, 0]]) {
    const leg = new THREE.Group(); leg.position.set(lx, 1.26, lz); g.add(leg); m.legs.push(leg);
    const Lg = [];
    Lg.push(part(sph(.19), C.legs, [0, -.08, 0], [0, 0, 0], front ? [.75, 1.3, 1] : [.85, 1.45, 1.15]));
    Lg.push(part(cap(.095, .34), C.legs, [0, -.36, front ? .02 : -.03], [front ? .05 : -.12, 0, 0]));
    Lg.push(part(sph(.072, 12, 10), '#8f7c63', [0, -.58, front ? .03 : -.06]));
    Lg.push(part(cap(.058, .46), (x, y) => (y < -.95 ? '#b8a58a' : '#a28f74'), [0, -.86, front ? .03 : -.03], [front ? 0 : .08, 0, 0]));
    for (const s of [-1, 1]) Lg.push(part(cyl(.032, .042, .09, 10), '#231c16', [s * .024, -1.205, .035], [0, 0, 0], [1, 1, 1.35]));
    leg.add(sculpt(Lg));
  }
  // head and neck pivot at the shoulders so it can lower to graze
  const head = new THREE.Group(); head.position.set(0, 1.56, .86); g.add(head); m.head = head;
  const Hd = [];
  Hd.push(part(cyl(.19, .28, .72), coat, [0, .2, .3], [1.02, 0, 0]));                 // neck
  Hd.push(part(sph(.12), C.back, [0, .36, .22], [1.02, 0, 0], [.6, 2.4, .6]));         // the dark mane along the top
  Hd.push(part(cap(.165, .4, 16), C.face, [0, .41, .74], [Math.PI / 2 + .38, 0, 0], [1, 1, 1.08]));   // long face
  Hd.push(part(sph(.19), C.muzzle, [0, .25, 1.02], [0, 0, 0], [.95, .86, 1.15]));    // big overhanging muzzle
  Hd.push(part(sph(.15), C.muzzle, [0, .21, 1.1], [0, 0, 0], [1, .66, 1]));          // upper lip
  for (const s of [-1, 1]) {
    Hd.push(part(sph(.03, 10, 8), '#120d0a', [s * .065, .23, 1.24], [0, 0, 0], [1, .7, 1]));   // nostrils
    Hd.push(part(cone(.065, .24), C.face, [s * .17, .63, .55], [-.35, 0, -s * .95]));          // ears
    Hd.push(part(cone(.04, .14), '#7a5a43', [s * .175, .62, .57], [-.35, 0, -s * .95]));        // inner ears
  }
  Hd.push(part(cap(.04, bull ? .2 : .1, 10), C.back, [0, bull ? .14 : .18, .62], [.2, 0, 0]));   // the bell under the chin
  eyes(Hd, .15, .5, .74, .03);
  // the bull's wide palmate antlers, tilted up and out
  if (bull) for (const s of [-1, 1]) {
    Hd.push(part(cyl(.035, .045, .16, 10), '#cbb994', [s * .14, .66, .64], [0, 0, -s * 1.1]));
    Hd.push(part(antler(s), (x, y) => (y < .7 ? '#cbb994' : '#e6d9bb'), [s * .19, .69, .62], [-.55, -s * .15, s * .42], .74, 'ZYX'));
  }
  head.add(sculpt(Hd));
  MO.list.push(m);
}
function initMoose() {
  // the bull nearer the town, the cow a little further into the meadow; each wanders its own stretch
  moose(CLEARING.a - .04, TOWN_R + 2.6);
  moose(CLEARING.a + .06, TOWN_R + 5.2, { bull: false, s: .9, graze: 4 });
}
const mx = m => Math.cos(m.a) * m.r, mz = m => Math.sin(m.a) * m.r;
const turnTo = (g, yaw, k) => { g.rotation.y += Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y)) * k; };
function updateMoose(dt, t) {
  if (!MO.list.length) return;
  MO.cool = Math.max(0, MO.cool - dt); MO.alert = Math.max(0, MO.alert - dt);
  const bull = MO.list[0];
  if (MO.alert <= 0 && MO.cool <= 0 && MO.list.some(m => near(mx(m), mz(m), 8.5))) {
    MO.alert = 5; MO.cool = 30; SFX.moose();
    floatText(mx(bull), 3.3, mz(bull), 'A pair of moose!<small>Only the bull grows antlers, new ones every year</small>', 3);
    markInteract('moose');
  }
  for (const m of MO.list) {
    const x = mx(m), z = mz(m);
    let walking = false;
    if (MO.alert > 0) {
      // both look up at Henry
      turnTo(m.g, Math.atan2(P.x - x, P.z - z), Math.min(1, dt * 2));
      m.head.rotation.x += (-.15 - m.head.rotation.x) * Math.min(1, dt * 4);
    } else if (!reduceMotion) {
      // ambles a few metres along the tree line, stops to graze, turns back
      m.graze -= dt;
      if (m.graze > 0) m.head.rotation.x += (.95 - m.head.rotation.x) * Math.min(1, dt * 2);
      else {
        walking = true; m.a += m.dir * dt * .018;
        if (Math.abs(m.a - m.a0) > .1) { m.dir *= -1; m.a = m.a0 + Math.sign(m.a - m.a0) * .1; }
        m.head.rotation.x += (.1 - m.head.rotation.x) * Math.min(1, dt * 2);
        turnTo(m.g, Math.atan2(-Math.sin(m.a) * m.dir, Math.cos(m.a) * m.dir), Math.min(1, dt * 1.5));
        if (m.graze < -6 - (Math.sin(t + m.ph) + 1) * 3) m.graze = 5 + (Math.cos(t * .7 + m.ph) + 1) * 3;
      }
    }
    // a slow walk: diagonal legs move together
    m.legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(t * 3.2 + m.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * .26 : 0; });
    m.g.position.set(x, GROUND_Y + (walking ? Math.abs(Math.sin(t * 3.2 + m.ph)) * .03 : 0), z);
  }
}

/* ---- Canada geese flying over in a V, four pairs ---- */
const GE = { g: null, birds: [], t: -12, dur: 24, from: new THREE.Vector3(), to: new THREE.Vector3(), honked: false };
/** a wing as a flat shape, x along the span, y forward, with feathered tips at the back edge */
function wing(s) {
  const pts = [[0, .07], [.18, .08], [.36, .06], [.5, .02], [.6, -.03], [.56, -.06], [.5, -.05], [.47, -.09], [.4, -.08], [.36, -.12], [.28, -.1], [.22, -.13], [.12, -.1], [0, -.08]];
  return slab(s > 0 ? pts : pts.map(([x, y]) => [-x, y]).reverse(), .014, .005);
}
function initGeese() {
  if (reduceMotion) return;
  const g = new THREE.Group(); g.visible = false; scene.add(g); GE.g = g;
  const bodyCol = (x, y, z) => (z < -.24 ? '#f2efe8' : y < -.04 ? '#d9cdb8' : z > .12 && y < .02 ? '#cdbfa8' : '#8b7d6b');
  // four pairs: each gander is a touch bigger than his mate
  for (let i = 0; i < 8; i++) {
    const side = i === 0 ? 0 : (i % 2 ? 1 : -1), rank = Math.ceil(i / 2);
    const b = new THREE.Group(); b.position.set(side * rank * .95, 0, -rank * 1.05); b.scale.setScalar(i % 2 ? .93 : 1.05); g.add(b);
    const B = [];
    B.push(part(lathe([[0, -.3], [.06, -.27], [.11, -.17], [.14, -.04], [.14, .08], [.11, .18], [.06, .24], [0, .27]]), bodyCol, [0, 0, 0], [0, 0, 0], [.9, .85, 1]));
    B.push(part(cone(.06, .12, 10), '#1c1c1e', [0, .01, -.33], [-Math.PI / 2, 0, 0], [1, .45, 1]));         // black tail
    // the long black neck, curving gently forward, with the head and its white chinstrap
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .03, .2), new THREE.Vector3(0, .07, .38), new THREE.Vector3(0, .09, .55)]);
    B.push(part(new THREE.TubeGeometry(curve, 10, .032, 10), '#18181b'));
    B.push(part(sph(.05), '#18181b', [0, .1, .6], [0, 0, 0], [.85, .9, 1.35]));
    B.push(part(sph(.03, 12, 8), '#f4f2ec', [0, .085, .6], [0, 0, 0], [1.75, .9, 1.4]));                   // chinstrap
    B.push(part(cone(.022, .07, 10), '#202024', [0, .095, .68], [Math.PI / 2, 0, 0], [1, 1, .7]));        // bill
    b.add(sculpt(B, FUR, false));
    const wings = [-1, 1].map(s => {
      const w = new THREE.Group(); w.position.set(s * .1, .05, .03); b.add(w);
      w.add(sculpt([part(wing(s), (x) => (Math.abs(x) > .4 ? '#4c4238' : '#7d705f'))], FUR, false));
      return w;
    });
    GE.birds.push({ b, wings, ph: i * .6 });
  }
}
function startFlight() {
  const a = srand() * Math.PI * 2, off = (srand() - .5) * 30, y = 14 + srand() * 4, c = Math.cos(a), s = Math.sin(a);
  GE.from.set(-c * 90 - s * off, y, -s * 90 + c * off); GE.to.set(c * 90 - s * off, y + 2, s * 90 + c * off);
  GE.g.rotation.y = Math.atan2(GE.to.x - GE.from.x, GE.to.z - GE.from.z); GE.honked = false;
}
function updateGeese(dt, t) {
  if (!GE.g) return;
  GE.t += dt;
  if (GE.t < 0) { GE.g.visible = false; return; }
  if (!GE.g.visible) { startFlight(); GE.g.visible = true; }
  const k = GE.t / GE.dur;
  if (k >= 1) { GE.g.visible = false; GE.t = -(30 + srand() * 25); return; }
  GE.g.position.lerpVectors(GE.from, GE.to, k);
  for (const bd of GE.birds) { const f = Math.sin(t * 6 + bd.ph) * .55; bd.wings[0].rotation.z = f; bd.wings[1].rotation.z = -f; bd.b.position.y = Math.sin(t * 6 + bd.ph + 1) * .06; }
  if (!GE.honked && S.started && k > .4) { GE.honked = true; SFX.honk(); }
}

/** the animals' state, for the ?debug hooks */
export const WILD = { BV, LN, MO, GE };
export function initWildlife() { initBeaver(); initLoon(); initMoose(); initGeese(); }
export function updateWildlife(dt, t) { updateBeaver(dt, t); updateLoon(dt, t); updateMoose(dt, t); updateGeese(dt, t); }
