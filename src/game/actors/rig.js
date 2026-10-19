// Procedural chibi characters: Henry, his hamster, the dogs and cats, and the townsfolk.
import { THREE, CM, addTo } from '../gfx.js';

// Henry as a chibi 3D figure built from his illustration: curly dark hair, round glasses,
// navy jacket over a cream hoodie, dark trousers, white sneakers, stylus + tablet.
export function makeHenry() {
  const m = {
    skin: CM('#f3c9a6'), hair: CM('#2c201a', { roughness: .5 }), jacket: CM('#232c47'), hood: CM('#ece3d3'), pants: CM('#25282f'),
    shoe: CM('#f6f3ee'), sole: CM('#cdc6ba'), black: CM('#16171b', { roughness: .35 }), gold: CM('#e6a400', { metalness: .4, roughness: .35 }),
    white: CM('#ffffff'), tablet: CM('#d3d8e0', { metalness: .3, roughness: .4 }), screen: new THREE.MeshBasicMaterial({ color: '#9cc9f5', toneMapped: false }),
    blush: new THREE.MeshBasicMaterial({ color: '#f59a8c', transparent: true, opacity: .5, depthWrite: false }),
  };
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = .72; root.add(hips);
  const legs = [-1, 1].map(s => {
    const leg = new THREE.Group(); leg.position.x = s * .13; hips.add(leg);
    addTo(leg, new THREE.CapsuleGeometry(.1, .42, 4, 12), m.pants, 0, -.33, 0);
    const shoe = new THREE.Group(); shoe.position.set(0, -.63, .05); leg.add(shoe);
    addTo(shoe, new THREE.CapsuleGeometry(.09, .16, 4, 10), m.shoe, 0, 0, 0).rotation.x = Math.PI / 2;
    addTo(shoe, new THREE.BoxGeometry(.19, .04, .34), m.sole, 0, -.07, 0);
    return leg;
  });
  const body = new THREE.Group(); hips.add(body);
  addTo(body, new THREE.CylinderGeometry(.26, .3, .62, 22), m.jacket, 0, .31, 0);
  addTo(body, new THREE.SphereGeometry(.26, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.jacket, 0, .62, 0);
  addTo(body, new THREE.BoxGeometry(.17, .5, .06), m.hood, 0, .34, .25);
  for (const s of [-1, 1]) addTo(body, new THREE.BoxGeometry(.012, .5, .02), m.black, s * .09, .34, .272);
  const em = addTo(body, new THREE.CylinderGeometry(.04, .04, .02, 14), m.gold, .17, .47, .255); em.rotation.x = Math.PI / 2;
  const collar = addTo(body, new THREE.TorusGeometry(.16, .06, 10, 24), m.hood, 0, .68, -.02); collar.rotation.x = Math.PI / 2;
  const hood = addTo(body, new THREE.SphereGeometry(.22, 18, 12), m.hood, 0, .6, -.24); hood.scale.set(1, .8, .55);
  for (const s of [-1, 1]) addTo(body, new THREE.CylinderGeometry(.012, .012, .2, 5), m.hood, s * .05, .52, .29);
  const arms = [-1, 1].map(s => {
    const arm = new THREE.Group(); arm.position.set(s * .33, .56, 0); body.add(arm);
    addTo(arm, new THREE.CapsuleGeometry(.085, .34, 4, 10), m.jacket, 0, -.22, 0);
    addTo(arm, new THREE.SphereGeometry(.078, 14, 10), m.skin, 0, -.47, 0);
    return arm;
  });
  // his right hand (arms[0]) holds the stylus, his left hand (arms[1]) the tablet
  const pen = addTo(arms[0], new THREE.CylinderGeometry(.013, .013, .28, 6), m.black, 0, -.5, .07); pen.rotation.x = 1.25;
  const tab = new THREE.Group(); tab.position.set(.05, -.47, .1); arms[1].add(tab);
  addTo(tab, new THREE.BoxGeometry(.025, .34, .25), m.tablet, 0, 0, 0);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.22, .3), m.screen); scr.position.x = .014; scr.rotation.y = Math.PI / 2; tab.add(scr);
  // things he can hold: a coffee cup, a bubble tea and a scallion pancake
  const cupInHand = new THREE.Group(); cupInHand.visible = false; cupInHand.position.set(0, -.55, .05); arms[0].add(cupInHand);
  addTo(cupInHand, new THREE.CylinderGeometry(.065, .05, .13, 14), m.white, 0, 0, 0);
  addTo(cupInHand, new THREE.CylinderGeometry(.055, .055, .01, 14), CM('#6b3f26'), 0, .062, 0);
  const bobaInHand = new THREE.Group(); bobaInHand.visible = false; bobaInHand.position.set(0, -.56, .05); arms[0].add(bobaInHand);
  addTo(bobaInHand, new THREE.CylinderGeometry(.07, .055, .2, 14), new THREE.MeshStandardMaterial({ color: '#e9f4ff', transparent: true, opacity: .55, roughness: .1 }), 0, 0, 0);
  addTo(bobaInHand, new THREE.CylinderGeometry(.062, .05, .16, 14), CM('#c69264'), 0, -.01, 0);
  for (let i = 0; i < 5; i++) addTo(bobaInHand, new THREE.SphereGeometry(.016, 6, 5), CM('#2a1a14', { roughness: .3 }), Math.cos(i * 1.3) * .03, -.07, Math.sin(i * 1.3) * .03);
  const straw = addTo(bobaInHand, new THREE.CylinderGeometry(.011, .011, .2, 6), CM('#ec6a4e'), .02, .14, 0); straw.rotation.z = -.2;
  const snackInHand = new THREE.Group(); snackInHand.visible = false; snackInHand.position.set(0, -.56, .06); arms[0].add(snackInHand);
  const pancake = addTo(snackInHand, new THREE.CylinderGeometry(.1, .1, .025, 18), CM('#e6b45e'), 0, .02, 0); pancake.rotation.x = 1.2;
  const wrap = addTo(snackInHand, new THREE.ConeGeometry(.08, .14, 12, 1, true), CM('#fffaf4'), 0, -.05, .02); wrap.rotation.x = Math.PI;
  const head = new THREE.Group(); head.position.y = .7; body.add(head);
  addTo(head, new THREE.CylinderGeometry(.09, .1, .14, 12), m.skin, 0, .02, 0);
  const skull = addTo(head, new THREE.SphereGeometry(.4, 32, 24), m.skin, 0, .44, 0); skull.scale.set(1, .96, .94);
  for (const s of [-1, 1]) { const ear = addTo(head, new THREE.SphereGeometry(.075, 12, 10), m.skin, s * .39, .42, -.01); ear.scale.set(.55, 1, .9); }
  // Side-swept fringe: a side part over his left brow, bangs sweeping diagonally across the forehead
  // toward the right temple, smooth crown with a little extra volume on the swept side.
  const HC = new THREE.Vector3(0, .46, -.02);
  const dirOf = (a, b) => new THREE.Vector3(Math.sin(a) * Math.sin(b), Math.cos(a), Math.sin(a) * Math.cos(b));
  const cap = addTo(head, new THREE.SphereGeometry(.44, 40, 24, 0, Math.PI * 2, 0, Math.PI * .62), m.hair, HC.x, HC.y, HC.z);
  cap.rotation.x = -.9; cap.scale.set(1.03, 1, 1.03);
  const nape = addTo(head, new THREE.SphereGeometry(.2, 18, 12), m.hair, 0, .25, -.27); nape.scale.set(1.3, .85, .62);
  const volA = addTo(head, new THREE.SphereGeometry(.2, 22, 14), m.hair, -.1, .77, .06); volA.scale.set(1.35, .6, 1.3);
  const volB = addTo(head, new THREE.SphereGeometry(.16, 20, 12), m.hair, .22, .74, .0); volB.scale.set(1, .55, 1.2);
  for (const s of [-1, 1]) { const side = addTo(head, new THREE.SphereGeometry(.13, 16, 12), m.hair, s * .385, .47, -.03); side.scale.set(.5, 1.15, 1.05); }
  const lockGeo = new THREE.SphereGeometry(1, 18, 12);
  const PART = .55;                                   // azimuth of the side part (his left, +x)
  const strandPoint = (k, u) => {
    const e = u * u * (3 - 2 * u);
    const a = (.35 + k * .12) + ((.9 + k * .1) - (.35 + k * .12)) * e;
    const b = PART + ((-.85 + k * .06) - PART) * u;
    const n = dirOf(a, b); return { n, p: HC.clone().addScaledVector(n, .455 + .028 * Math.sin(Math.PI * u)) };
  };
  for (let k = 0; k < 5; k++) {
    const N = 9;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), { n, p } = strandPoint(k, u);
      const tan = strandPoint(k, Math.min(1, u + .03)).p.sub(strandPoint(k, Math.max(0, u - .03)).p).normalize();
      const x = new THREE.Vector3().crossVectors(tan, n).normalize(), z = new THREE.Vector3().crossVectors(x, tan).normalize();
      const lock = new THREE.Mesh(lockGeo, m.hair);
      lock.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, tan, z));
      const sz = .1 - .045 * u;
      lock.scale.set(sz * .8, sz * 1.8, sz * .4);
      lock.position.copy(p); lock.castShadow = true; head.add(lock);
    }
  }
  // the tip of the fringe flicks slightly outward at the right temple
  const tip = strandPoint(4, 1).p, flick = addTo(head, new THREE.SphereGeometry(.05, 12, 8), m.hair, tip.x - .03, tip.y - .03, tip.z - .02); flick.scale.set(.75, 1.3, .6);
  // a short side-part line
  const partPts = []; for (let i = 0; i <= 8; i++) partPts.push(HC.clone().addScaledVector(dirOf(.12 + i / 8 * .5, PART + .04), .449));
  addTo(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(partPts), 12, .008, 6), CM('#d4ab8c'), 0, 0, 0);
  for (const s of [-1, 1]) {
    const eye = addTo(head, new THREE.SphereGeometry(.052, 14, 10), m.black, s * .14, .4, .352); eye.scale.z = .55;
    addTo(head, new THREE.SphereGeometry(.016, 8, 6), m.white, s * .14 + .018, .422, .38);
    addTo(head, new THREE.TorusGeometry(.1, .017, 8, 28), m.black, s * .145, .41, .385);
    const temple = addTo(head, new THREE.BoxGeometry(.016, .016, .3), m.black, s * .29, .42, .23); temple.rotation.y = s * -.35;
    const brow = addTo(head, new THREE.BoxGeometry(.11, .025, .02), m.hair, s * .145, .55, .35); brow.rotation.z = s * -.12;
    const bl = new THREE.Mesh(new THREE.CircleGeometry(.055, 16), m.blush); bl.position.set(s * .24, .3, .29); bl.rotation.y = s * .55; head.add(bl);
  }
  addTo(head, new THREE.BoxGeometry(.08, .016, .016), m.black, 0, .425, .39);
  addTo(head, new THREE.SphereGeometry(.03, 10, 8), m.skin, 0, .33, .37);
  const smile = addTo(head, new THREE.TorusGeometry(.055, .012, 6, 14, Math.PI), m.black, 0, .25, .335); smile.rotation.z = Math.PI;
  return { root, hips, body, head, legs, arms, pen, cupInHand, bobaInHand, snackInHand };
}

export function makeHamster() {
  const m = { fur: CM('#e3a566'), cream: CM('#fff3e3'), pink: CM('#f4a3a0'), black: CM('#1b1b1f', { roughness: .3 }), white: CM('#ffffff') };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const b = addTo(body, new THREE.SphereGeometry(.24, 22, 16), m.fur, 0, .23, -.02); b.scale.set(1, .86, 1.12);
  const belly = addTo(body, new THREE.SphereGeometry(.18, 18, 12), m.cream, 0, .19, .08); belly.scale.set(1, .9, .95);
  addTo(body, new THREE.SphereGeometry(.2, 22, 16), m.fur, 0, .34, .17);
  for (const s of [-1, 1]) {
    addTo(body, new THREE.SphereGeometry(.095, 14, 10), m.cream, s * .1, .29, .27);
    const ear = addTo(body, new THREE.SphereGeometry(.065, 12, 8), m.fur, s * .13, .5, .12); ear.scale.z = .5;
    const inner = addTo(body, new THREE.SphereGeometry(.04, 10, 8), m.pink, s * .13, .5, .145); inner.scale.z = .4;
    addTo(body, new THREE.SphereGeometry(.034, 10, 8), m.black, s * .075, .38, .34);
    addTo(body, new THREE.SphereGeometry(.011, 6, 6), m.white, s * .075 + .012, .392, .368);
    addTo(body, new THREE.SphereGeometry(.03, 8, 6), m.pink, s * .07, .2, .3);
    addTo(body, new THREE.SphereGeometry(.04, 8, 6), m.pink, s * .11, .03, .06);
  }
  addTo(body, new THREE.SphereGeometry(.022, 8, 6), m.pink, 0, .335, .37);
  addTo(body, new THREE.SphereGeometry(.035, 8, 6), m.fur, 0, .2, -.28);
  return { root, body };
}

// procedural pets, same chibi style as Henry and the hamster
let PET_GEO = null;
function petGeo() {
  if (!PET_GEO) PET_GEO = { dLeg: new THREE.CylinderGeometry(.05, .044, .28, 8), dPaw: new THREE.SphereGeometry(.056, 10, 8), cLeg: new THREE.CylinderGeometry(.034, .03, .19, 8), cPaw: new THREE.SphereGeometry(.04, 10, 8) };
  return PET_GEO;
}
export function makeDog(d) {
  const G = petGeo();
  const m = { fur: CM(d.fur), cream: CM(d.cream), black: CM('#1b1b1f', { roughness: .3 }), white: CM('#ffffff'), pink: CM('#f28b8b'), collar: CM(d.collar), gold: CM('#ffd166', { metalness: .4, roughness: .35 }) };
  const root = new THREE.Group(), roll = new THREE.Group(), body = new THREE.Group();
  root.add(roll); roll.position.y = .24; roll.add(body); body.position.y = -.24;
  const torso = addTo(body, new THREE.SphereGeometry(.2, 20, 14), m.fur, 0, .42, 0); torso.scale.set(1, .86, 1.6);
  const bib = addTo(body, new THREE.SphereGeometry(.14, 16, 12), m.cream, 0, .4, .19); bib.scale.set(1, 1.1, .85);
  const belly = addTo(body, new THREE.SphereGeometry(.15, 16, 12), m.cream, 0, .33, -.02); belly.scale.set(.95, .6, 1.45);
  const legs = [[.1, .2], [-.1, .2], [.1, -.2], [-.1, -.2]].map(([x, z]) => {
    const piv = new THREE.Group(); piv.position.set(x, .34, z); body.add(piv);
    addTo(piv, G.dLeg, m.fur, 0, -.14, 0);
    const paw = addTo(piv, G.dPaw, m.cream, 0, -.28, .02); paw.scale.set(1, .6, 1.3);
    return piv;
  });
  const collar = addTo(body, new THREE.TorusGeometry(.108, .022, 8, 22), m.collar, 0, .52, .26); collar.rotation.x = -.9;
  addTo(body, new THREE.SphereGeometry(.026, 8, 6), m.gold, 0, .43, .35);
  const head = new THREE.Group(); head.position.set(0, .64, .3); body.add(head);
  addTo(head, new THREE.SphereGeometry(.11, 14, 10), m.fur, 0, -.1, -.07);
  const skull = addTo(head, new THREE.SphereGeometry(.17, 20, 14), m.fur, 0, 0, 0); skull.scale.set(1.06, .95, 1);
  const cheeks = addTo(head, new THREE.SphereGeometry(.11, 16, 12), m.cream, 0, -.06, .08); cheeks.scale.set(1.3, .8, 1);
  const muzzle = addTo(head, new THREE.SphereGeometry(.085, 14, 10), m.cream, 0, -.045, .165); muzzle.scale.set(1, .82, 1.2);
  addTo(head, new THREE.SphereGeometry(.033, 10, 8), m.black, 0, -.015, .262);
  const eyes = [-1, 1].map(s => {
    const e = addTo(head, new THREE.SphereGeometry(.027, 10, 8), m.black, s * .072, .035, .148); e.scale.set(1, 1, .6); e.userData.sy = 1;
    const hl = addTo(e, new THREE.SphereGeometry(.009, 6, 6), m.white, .01, .012, .022); hl.castShadow = false;
    return e;
  });
  if (d.brows) for (const s of [-1, 1]) addTo(head, new THREE.SphereGeometry(.02, 8, 6), m.cream, s * .07, .095, .138);
  const ears = [-1, 1].map(s => {
    const piv = new THREE.Group(); head.add(piv);
    if (d.ear === 'up') {
      piv.position.set(s * .095, .13, -.01); piv.rotation.z = -s * .28;
      addTo(piv, new THREE.ConeGeometry(.062, .15, 12), m.fur, 0, .06, 0);
      const inner = addTo(piv, new THREE.ConeGeometry(.036, .09, 10), m.cream, 0, .045, .024); inner.scale.z = .5;
    } else {
      piv.position.set(s * .15, .08, -.01); piv.rotation.z = s * .35;
      const ear = addTo(piv, new THREE.SphereGeometry(.075, 12, 10), m.fur, 0, -.06, 0); ear.scale.set(.42, 1.15, .85);
    }
    piv.userData.z = piv.rotation.z;
    return piv;
  });
  const tongue = addTo(head, new THREE.BoxGeometry(.05, .012, .075), m.pink, 0, -.1, .2); tongue.rotation.x = .5; tongue.visible = false;
  const tail = new THREE.Group(); tail.position.set(0, .52, -.29); body.add(tail);
  if (d.tail === 'curl') { const c = addTo(tail, new THREE.TorusGeometry(.075, .034, 8, 18, Math.PI * 1.6), m.fur, 0, .075, .02); c.rotation.y = Math.PI / 2; }
  else {
    const tm = addTo(tail, new THREE.CylinderGeometry(.022, .036, .34, 8), m.fur, 0, .085, -.148); tm.rotation.x = -1.05;
    if (d.tip) addTo(tail, new THREE.SphereGeometry(.03, 8, 6), m.cream, 0, .17, -.296);
  }
  return { root, roll, body, legs, head, ears, eyes, tongue, tail, headY: .64, headZ: .3, segs: null };
}
export function makeCat(d) {
  const G = petGeo();
  const m = { fur: CM(d.fur), cream: CM(d.cream), stripe: CM(d.stripes || d.fur), eye: CM(d.eye, { roughness: .25, emissive: d.eye, emissiveIntensity: .18 }), black: CM('#141418', { roughness: .3 }), white: CM('#ffffff'), pink: CM('#f4a3a0'), whisk: CM(d.whisker || '#ffffff') };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = addTo(body, new THREE.SphereGeometry(.15, 18, 14), m.fur, 0, .29, 0); torso.scale.set(1, .9, 1.65);
  const chest = addTo(body, new THREE.SphereGeometry(.1, 14, 10), m.cream, 0, .28, .15); chest.scale.set(1, 1.15, .85);
  if (d.stripes) for (const z of [-.14, -.04, .06]) { const f = Math.sqrt(1 - (z / .2475) ** 2), s = addTo(body, new THREE.TorusGeometry(.151 * f, .012, 6, 18, Math.PI), m.stripe, 0, .29, z); s.scale.y = .9; s.castShadow = false; }
  const legs = [[.065, .15], [-.065, .15], [.065, -.15], [-.065, -.15]].map(([x, z]) => {
    const piv = new THREE.Group(); piv.position.set(x, .22, z); body.add(piv);
    addTo(piv, G.cLeg, m.fur, 0, -.095, 0);
    const paw = addTo(piv, G.cPaw, d.socks ? m.cream : m.fur, 0, -.19, .012); paw.scale.set(1, .6, 1.2);
    return piv;
  });
  const head = new THREE.Group(); head.position.set(0, .44, .22); body.add(head);
  const skull = addTo(head, new THREE.SphereGeometry(.14, 18, 14), m.fur, 0, 0, 0); skull.scale.set(1.12, .95, 1);
  for (const s of [-1, 1]) { const pad = addTo(head, new THREE.SphereGeometry(.045, 10, 8), m.cream, s * .032, -.05, .112); pad.scale.set(1, .85, .9); }
  addTo(head, new THREE.SphereGeometry(.018, 8, 6), m.pink, 0, -.018, .138);
  const eyes = [-1, 1].map(s => {
    const e = addTo(head, new THREE.SphereGeometry(.031, 12, 10), m.eye, s * .062, .022, .112); e.scale.set(1, 1.1, .5); e.userData.sy = 1.1;
    const pu = addTo(e, new THREE.SphereGeometry(.019, 8, 6), m.black, 0, 0, .027); pu.scale.set(.45, 1, .5);
    addTo(e, new THREE.SphereGeometry(.007, 6, 6), m.white, .01, .012, .028).castShadow = false;
    return e;
  });
  const ears = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(s * .078, .105, -.01); piv.rotation.z = -s * .32; piv.userData.z = piv.rotation.z; head.add(piv);
    addTo(piv, new THREE.ConeGeometry(.056, .12, 10), m.fur, 0, .05, 0);
    const inner = addTo(piv, new THREE.ConeGeometry(.032, .075, 8), m.pink, 0, .04, .02); inner.scale.z = .45;
    return piv;
  });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const w = addTo(head, new THREE.BoxGeometry(.15, .004, .004), m.whisk, s * .1, -.047 + i * .014, .1); w.rotation.z = s * (i - 1) * .14; w.rotation.y = -s * .3; w.castShadow = false; }
  const tail = new THREE.Group(); tail.position.set(0, .34, -.23); body.add(tail);
  const segs = []; let parent = tail;
  for (let i = 0; i < 4; i++) {
    const sg = new THREE.Group(); if (i) sg.position.y = .12; parent.add(sg);
    const tm = (d.stripes && i % 2) ? m.stripe : m.fur;
    addTo(sg, new THREE.SphereGeometry(.031 - i * .002, 8, 6), tm, 0, 0, 0);
    addTo(sg, new THREE.CylinderGeometry(.028 - i * .002, .031 - i * .002, .13, 8), tm, 0, .06, 0);
    segs.push(sg); parent = sg;
  }
  addTo(segs[3], new THREE.SphereGeometry(.024, 8, 6), m.fur, 0, .125, 0);
  return { root, roll: null, body, legs, head, ears, eyes, tongue: null, tail, segs, headY: .44, headZ: .22 };
}

/* ---- townsfolk: one builder, many looks ---- */
const VGEO = {};
function vg(key, make) { return VGEO[key] || (VGEO[key] = make()); }
export function makeVillager(look) {
  const L = look, sc = L.scale || 1;
  const m = {
    skin: CM(L.skin), hair: CM(L.hair, { roughness: .55 }), top: CM(L.top), bottom: CM(L.bottom), shoe: CM(L.shoes || '#2a2a30'),
    black: CM('#16171b', { roughness: .35 }), white: CM('#ffffff'), hat: CM(L.hatColor || '#202b45'),
    blush: new THREE.MeshBasicMaterial({ color: '#f59a8c', transparent: true, opacity: .45, depthWrite: false }),
  };
  const acc = new Set(L.acc || []);
  const root = new THREE.Group(), scaler = new THREE.Group(); scaler.scale.setScalar(sc); root.add(scaler);
  const hips = new THREE.Group(); hips.position.y = .7; scaler.add(hips);
  const legs = [-1, 1].map(s => {
    const leg = new THREE.Group(); leg.position.x = s * .12; hips.add(leg);
    addTo(leg, vg('leg', () => new THREE.CapsuleGeometry(.095, .4, 4, 10)), m.bottom, 0, -.32, 0);
    const shoe = addTo(leg, vg('shoe', () => new THREE.CapsuleGeometry(.085, .14, 4, 8)), m.shoe, 0, -.61, .05); shoe.rotation.x = Math.PI / 2;
    return leg;
  });
  const body = new THREE.Group(); hips.add(body);
  addTo(body, vg('torso', () => new THREE.CylinderGeometry(.25, .29, .6, 18)), m.top, 0, .3, 0);
  addTo(body, vg('shoulders', () => new THREE.SphereGeometry(.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), m.top, 0, .6, 0);
  const arms = [-1, 1].map(s => {
    const arm = new THREE.Group(); arm.position.set(s * .32, .55, 0); body.add(arm);
    addTo(arm, vg('arm', () => new THREE.CapsuleGeometry(.08, .32, 4, 8)), m.top, 0, -.21, 0);
    addTo(arm, vg('hand', () => new THREE.SphereGeometry(.074, 12, 8)), m.skin, 0, -.45, 0);
    return arm;
  });
  if (acc.has('apron')) { const ap = addTo(body, new THREE.BoxGeometry(.4, .62, .04), CM(L.apron || '#ffffff'), 0, .12, .27); ap.rotation.x = -.06; addTo(body, new THREE.BoxGeometry(.5, .04, .52), CM(L.apron || '#ffffff'), 0, .42, 0); }
  if (acc.has('sash')) { const sm = CM(L.sash || '#e6a400', { metalness: .2 }); for (const zz of [.276, -.276]) { const sa = addTo(body, new THREE.BoxGeometry(.13, .86, .02), sm, 0, .3, zz); sa.rotation.z = .72; } }
  if (acc.has('scarf')) { const sf = addTo(body, new THREE.TorusGeometry(.17, .065, 8, 18), CM(L.scarf || '#e0393e'), 0, .64, 0); sf.rotation.x = Math.PI / 2; addTo(body, new THREE.BoxGeometry(.1, .26, .05), CM(L.scarf || '#e0393e'), .1, .48, .25); }
  let bag = null;
  if (acc.has('bag')) { bag = addTo(body, new THREE.BoxGeometry(.3, .26, .12), CM('#8a5a44'), .3, .05, .06); for (const zz of [.272, -.272]) { const strap = addTo(body, new THREE.BoxGeometry(.055, .86, .02), CM('#6b4632'), 0, .3, zz); strap.rotation.z = -.72; } }
  // head
  const head = new THREE.Group(); head.position.y = .66; body.add(head);
  addTo(head, vg('neck', () => new THREE.CylinderGeometry(.085, .095, .13, 10)), m.skin, 0, .02, 0);
  const skull = addTo(head, vg('skull', () => new THREE.SphereGeometry(.38, 26, 18)), m.skin, 0, .42, 0); skull.scale.set(1, .96, .94);
  for (const s of [-1, 1]) { const ear = addTo(head, vg('ear', () => new THREE.SphereGeometry(.07, 10, 8)), m.skin, s * .37, .4, -.01); ear.scale.set(.55, 1, .9); }
  const eyes = [-1, 1].map(s => { const e = addTo(head, vg('eye', () => new THREE.SphereGeometry(.048, 12, 8)), m.black, s * .135, .39, .335); e.scale.z = .55; addTo(head, vg('glint', () => new THREE.SphereGeometry(.014, 6, 5)), m.white, s * .135 + .016, .41, .36); return e; });
  for (const s of [-1, 1]) { const bl = new THREE.Mesh(vg('blush', () => new THREE.CircleGeometry(.05, 14)), m.blush); bl.position.set(s * .23, .29, .28); bl.rotation.y = s * .55; head.add(bl); }
  const mouth = addTo(head, vg('smile', () => new THREE.TorusGeometry(.05, .011, 6, 12, Math.PI)), m.black, 0, .25, .32); mouth.rotation.z = Math.PI;
  addTo(head, vg('nose', () => new THREE.SphereGeometry(.028, 8, 6)), m.skin, 0, .32, .355);
  if (acc.has('glasses')) for (const s of [-1, 1]) { addTo(head, vg('lens', () => new THREE.TorusGeometry(.09, .014, 6, 22)), m.black, s * .14, .4, .37); }
  if (acc.has('beard')) { const bd = addTo(head, new THREE.SphereGeometry(.2, 16, 10), m.hair, 0, .2, .2); bd.scale.set(1.1, .7, .6); }
  // hair
  const H = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = addTo(head, geo, m.hair, x, y, z); o.scale.set(sx, sy, sz); return o; };
  const capGeo = vg('haircap', () => new THREE.SphereGeometry(.415, 30, 18, 0, Math.PI * 2, 0, Math.PI * .55));
  const style = L.hairStyle || 'short';
  if (style !== 'bald') { const c = H(capGeo, 0, .45, -.02, 1.02, 1, 1.03); c.rotation.x = -.75; }
  else for (const s of [-1, 1]) H(vg('tuft', () => new THREE.SphereGeometry(.12, 12, 8)), s * .35, .42, -.1, .5, .8, 1.1);
  if (style === 'short' || style === 'curly' || style === 'pony' || style === 'bun' || style === 'long') H(vg('nape', () => new THREE.SphereGeometry(.2, 14, 10)), 0, .26, -.26, 1.3, .8, .6);
  if (style === 'curly') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; H(vg('curl', () => new THREE.SphereGeometry(.1, 10, 8)), Math.cos(a) * .26, .74 + Math.sin(a * 2) * .03, Math.sin(a) * .22 - .02); }
  if (style === 'bun') H(vg('bun', () => new THREE.SphereGeometry(.14, 14, 10)), 0, .78, -.18);
  if (style === 'pony') { const p = H(vg('pony', () => new THREE.CapsuleGeometry(.075, .3, 4, 8)), 0, .38, -.42); p.rotation.x = .5; }
  if (style === 'long') { H(vg('longback', () => new THREE.SphereGeometry(.3, 16, 12)), 0, .18, -.2, 1.25, 1.35, .7); for (const s of [-1, 1]) H(vg('longside', () => new THREE.CapsuleGeometry(.08, .32, 4, 8)), s * .34, .2, .02); }
  // hats
  const hatM = m.hat;
  if (L.hat === 'top') { addTo(head, new THREE.CylinderGeometry(.42, .42, .03, 24), hatM, 0, .78, -.02); addTo(head, new THREE.CylinderGeometry(.24, .26, .42, 20), hatM, 0, 1.0, -.02); addTo(head, new THREE.CylinderGeometry(.262, .262, .07, 20), CM(L.sash || '#e6a400'), 0, .83, -.02); }
  if (L.hat === 'chef') { addTo(head, new THREE.CylinderGeometry(.3, .28, .22, 20), m.white, 0, .82, -.02); const puff = addTo(head, new THREE.SphereGeometry(.34, 18, 12), m.white, 0, 1.02, -.02); puff.scale.set(1, .7, 1); }
  if (L.hat === 'cap') { const c = addTo(head, new THREE.SphereGeometry(.4, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, .5, -.02); c.scale.set(1.1, .95, 1.1); const bill = addTo(head, new THREE.CylinderGeometry(.24, .24, .03, 18, 1, false, -Math.PI / 2, Math.PI), hatM, 0, .53, .3); bill.rotation.y = Math.PI; }
  if (L.hat === 'beret') { const b = addTo(head, new THREE.SphereGeometry(.34, 18, 10), hatM, -.05, .78, -.02); b.scale.set(1.15, .35, 1.1); b.rotation.z = .25; }
  if (L.hat === 'beanie') { const b = addTo(head, new THREE.SphereGeometry(.41, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, .53, -.02); b.scale.set(1.09, 1.02, 1.09); addTo(head, new THREE.SphereGeometry(.08, 10, 8), m.white, 0, .97, -.02); }
  if (L.hat === 'straw') { addTo(head, new THREE.CylinderGeometry(.62, .62, .03, 26), hatM, 0, .74, -.02); addTo(head, new THREE.CylinderGeometry(.27, .3, .2, 20), hatM, 0, .84, -.02); addTo(head, new THREE.CylinderGeometry(.302, .302, .05, 20), CM('#8a5a44'), 0, .78, -.02); }
  if (acc.has('headband')) { const hb = addTo(head, new THREE.TorusGeometry(.38, .035, 6, 28), CM(L.headband || '#ffffff'), 0, .58, -.02); hb.rotation.x = Math.PI / 2 + .25; }
  // things they hold
  const props = {};
  if (acc.has('guitar')) {
    const g = new THREE.Group(); g.position.set(.02, .28, .3); g.rotation.set(0, 0, .95); body.add(g);
    const wood = CM('#d08c4a'), dark = CM('#5a3a24');
    const b1 = addTo(g, new THREE.CylinderGeometry(.2, .2, .1, 20), wood, -.1, 0, 0); b1.rotation.x = Math.PI / 2;
    const b2 = addTo(g, new THREE.CylinderGeometry(.15, .15, .1, 20), wood, .14, 0, 0); b2.rotation.x = Math.PI / 2;
    const hole = addTo(g, new THREE.CylinderGeometry(.055, .055, .102, 14), CM('#2a1a10'), 0, 0, .0); hole.rotation.x = Math.PI / 2;
    addTo(g, new THREE.BoxGeometry(.5, .06, .04), dark, .48, 0, .02);
    addTo(g, new THREE.BoxGeometry(.1, .08, .05), dark, .76, 0, .02);
    props.guitar = g;
  }
  if (acc.has('brush')) { const br = addTo(arms[0], new THREE.CylinderGeometry(.014, .01, .32, 6), CM('#c98d5a'), 0, -.52, .08); br.rotation.x = 1.3; addTo(br, new THREE.SphereGeometry(.025, 8, 6), CM('#ec6a4e'), 0, .17, 0); props.brush = br; }
  return { root, scaler, hips, body, head, legs, arms, eyes, mouth, bag, props, scale: sc };
}
