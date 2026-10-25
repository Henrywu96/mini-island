// The island's edge: an uneven lawn that runs down a sandy beach into the sea, foam along the shore,
// small islands on the horizon, a lighthouse that sweeps the water at night, a jetty with a rowboat,
// and a couple of sailboats tacking around the island.
import { THREE, scene, canvasTex, M, put, mesh } from '../gfx.js';
import { reduceMotion } from '../util.js';
import { SKY } from '../sky/tod.js';
import { WXS } from '../sky/weather.js';
import { GROUND_Y, groundMesh } from './town.js';

/** how far the lawn reaches at angle a: a wobbly circle, so the coast has bays and points */
export const shoreR = a => 92 + 3 * Math.sin(3 * a + 1) + 2 * Math.sin(7 * a + .4) + 1.2 * Math.sin(13 * a + 2);
let SEA_Y = -.48;
let sea = null, foam = null, beam = null, lamp = null, boats = [], gulls = null;

/** the lawn out to the shore (replaces the town's old endless lawn) */
export function lawnGeometry() {
  const seg = 180, pos = [0, 0, 0], idx = [];
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, r = shoreR(a); pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  for (let i = 1; i <= seg; i++) idx.push(0, i + 1, i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function initCoast() {
  SEA_Y = GROUND_Y - .42;
  // the town's lawn now ends at the shore
  if (groundMesh) { groundMesh.geometry.dispose(); groundMesh.geometry = lawnGeometry(); groundMesh.rotation.x = 0; }
  // the beach: a band of sand that slopes from the lawn into the water
  {
    const seg = 180, rows = 4, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2, u = j / rows, r = shoreR(a) - .4 + u * 9;
      pos.push(Math.cos(a) * r, GROUND_Y - .005 - Math.pow(u, 1.3) * 1.1, Math.sin(a) * r);
      c.set(u < .55 ? '#f2dcb1' : '#e3c493'); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const beach = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), false); scene.add(beach);
  }
  // the sea, with slowly drifting ripples
  {
    const tex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#4eb3d8'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w, y = Math.random() * h, l = 10 + Math.random() * 26;
        c.strokeStyle = `rgba(255,255,255,${.12 + Math.random() * .16})`; c.lineWidth = 1.5 + Math.random() * 1.5;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 3, x + l, y); c.stroke();
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(70, 70);
    sea = new THREE.Mesh(new THREE.CircleGeometry(700, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: .22, metalness: .05 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = SEA_Y; sea.receiveShadow = false; scene.add(sea);
  }
  // white foam where the waves reach the beach
  {
    const seg = 180, pos = [], idx = [];
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, r = shoreR(a) + 2.9 + j * 1.6; pos.push(Math.cos(a) * r, SEA_Y + .03, Math.sin(a) * r); }
    for (let i = 0; i < seg; i++) idx.push(i, i + seg + 1, i + 1, i + 1, i + seg + 1, i + seg + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    foam = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5, depthWrite: false }));
    scene.add(foam);
  }
  lighthouse(-.95);
  jetty(1.75);
  for (const [r, sp, ph, sail] of [[118, .018, 0, '#ffffff'], [138, -.013, 2.6, '#ec6a4e'], [104, .022, 4.4, '#ffd166']]) boats.push(sailboat(r, sp, ph, sail));
  initGulls();
}

/** a striped lighthouse on a rocky point; at night its lamp glows and a beam sweeps the sea */
function lighthouse(a) {
  const r = shoreR(a) + 1.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
  const g = new THREE.Group(); g.position.set(x, GROUND_Y, z); scene.add(g);
  const rock = M('#a8a29a', { flatShading: true }), white = M('#fbf7f0'), red = M('#d9483b'), dark = M('#2b3242');
  for (const [dx, dz, s] of [[0, 0, 3.2], [2.4, 1.2, 1.8], [-2, 1.6, 1.5], [1.2, -2.2, 1.6]]) put(g, new THREE.IcosahedronGeometry(s, 0), rock, dx, -.9, dz).scale.set(1, .55, 1);
  const H = 9;
  for (let i = 0; i < 5; i++) { const y0 = .6 + i * H / 5, r0 = 1.35 - i * .14, r1 = 1.35 - (i + 1) * .14; put(g, new THREE.CylinderGeometry(r1, r0, H / 5, 24), i % 2 ? red : white, 0, y0 + H / 10, 0); }
  put(g, new THREE.CylinderGeometry(1.15, 1.15, .18, 24), dark, 0, H + .7, 0);
  for (let i = 0; i < 12; i++) { const b = i / 12 * Math.PI * 2; put(g, new THREE.CylinderGeometry(.03, .03, .5, 4), dark, Math.cos(b) * 1.08, H + 1.05, Math.sin(b) * 1.08, false); }
  lamp = put(g, new THREE.CylinderGeometry(.62, .62, 1.1, 16), new THREE.MeshStandardMaterial({ color: '#fff6cf', emissive: '#ffd36b', emissiveIntensity: .2, transparent: true, opacity: .85 }), 0, H + 1.35, 0, false);
  put(g, new THREE.ConeGeometry(.9, .9, 16), red, 0, H + 2.35, 0);
  // the beam: two soft cones back to back, turning slowly
  const cone = new THREE.ConeGeometry(2.2, 28, 20, 1, true); cone.translate(0, -14, 0); cone.rotateZ(Math.PI / 2);
  const bm = new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
  beam = new THREE.Group(); beam.position.set(0, H + 1.35, 0); g.add(beam);
  const c1 = new THREE.Mesh(cone, bm), c2 = new THREE.Mesh(cone, bm); c2.rotation.y = Math.PI; beam.add(c1, c2);
}
/** a wooden jetty out into the water with a rowboat tied to it */
function jetty(a) {
  const r = shoreR(a) + 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
  const g = new THREE.Group(); g.position.set(x, GROUND_Y, z); g.rotation.y = -a + Math.PI / 2; scene.add(g);
  const plank = M('#b98557'), post = M('#7a5638');
  for (let i = 0; i < 14; i++) put(g, new THREE.BoxGeometry(2.2, .1, .5), plank, 0, -.12, -i * .6 + (i % 2) * .02).rotation.y = (i % 3 - 1) * .02;
  for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) put(g, new THREE.CylinderGeometry(.09, .1, 1.6, 6), post, s * 1.05, -.7, -i * 2.05);
  const boat = new THREE.Group(); boat.position.set(1.9, SEA_Y - GROUND_Y + .05, -6); g.add(boat);
  const hull = put(boat, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#3b82f6', { side: THREE.DoubleSide }), 0, .2, 0); hull.scale.set(.55, .35, 1.4);
  put(boat, new THREE.BoxGeometry(.9, .05, .2), plank, 0, .16, .2, false);
  boats.push({ g: boat, bob: true, ph: 1.3 });
}
function sailboat(r, sp, ph, sail) {
  const g = new THREE.Group(); scene.add(g);
  const hull = put(g, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#fbf7f0', { side: THREE.DoubleSide }), 0, .3, 0, false); hull.scale.set(.9, .55, 2.4);
  put(g, new THREE.CylinderGeometry(.06, .07, 5, 6), M('#7a5638'), 0, 2.8, .2, false);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 4.2); sh.lineTo(1.9, 0); sh.closePath();
  const s = new THREE.Mesh(new THREE.ShapeGeometry(sh), M(sail, { side: THREE.DoubleSide })); s.position.set(.08, .7, .25); s.rotation.y = Math.PI / 2; g.add(s);
  return { g, r, sp, a: ph, ph };
}
/** a few gulls circling over the lighthouse */
function initGulls() {
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([-.5, .12, 0, 0, 0, .12, 0, 0, -.1, 0, 0, .12, .5, .12, 0, 0, 0, -.1], 3));
  shape.computeVertexNormals();
  gulls = new THREE.InstancedMesh(shape, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 5);
  gulls.frustumCulled = false; scene.add(gulls);
}

const _o = new THREE.Object3D();
export function updateCoast(dt, t) {
  if (!sea) return;
  const m = reduceMotion ? 0 : 1, rough = .6 + WXS.wind * .6;
  sea.material.map.offset.set(t * .004 * m * rough, t * .0025 * m);
  foam.material.opacity = .32 + Math.sin(t * .9) * .14 * m;
  foam.scale.setScalar(1 + Math.sin(t * .9) * .004 * m);
  // the lighthouse: brighter as the sky darkens
  const dark = SKY.dark;
  lamp.material.emissiveIntensity = .2 + dark * 3.2;
  beam.children[0].material.opacity = dark * .16;
  beam.visible = dark > .02;
  beam.rotation.y = t * .55 * (reduceMotion ? 0 : 1);
  for (const b of boats) {
    if (b.bob) { b.g.position.y = SEA_Y - GROUND_Y + .05 + Math.sin(t * 1.3 + b.ph) * .05 * m; b.g.rotation.z = Math.sin(t * 1.1 + b.ph) * .05 * m; continue; }
    b.a += b.sp * dt * m;
    const x = Math.cos(b.a) * b.r, z = Math.sin(b.a) * b.r;
    b.g.position.set(x, SEA_Y + Math.sin(t * 1.2 + b.ph) * .08 * m, z);
    b.g.rotation.set(0, Math.atan2(-Math.sin(b.a) * Math.sign(b.sp), Math.cos(b.a) * Math.sign(b.sp)), Math.sin(t * .9 + b.ph) * .06 * m);
  }
  const L = lamp.parent.position;
  for (let i = 0; i < gulls.count; i++) {
    const a = t * (.25 + i * .04) * m + i * 1.3, r = 6 + i * 1.7;
    _o.position.set(L.x + Math.cos(a) * r, 13 + i * .9 + Math.sin(t + i) * .6, L.z + Math.sin(a) * r);
    _o.rotation.set(Math.sin(t * 6 + i) * .25 * m, -a, 0); _o.scale.setScalar(1.3 + Math.abs(Math.sin(t * 5 + i)) * .2 * m); _o.updateMatrix();
    gulls.setMatrixAt(i, _o.matrix);
  }
  gulls.instanceMatrix.needsUpdate = true;
}
