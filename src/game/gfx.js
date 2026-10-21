// Renderer, scene, camera, materials and the small mesh/texture helpers every part of the town uses.
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { rrPath, FONT } from './util.js';

export { THREE };
/** @type {THREE.WebGLRenderer} */ export let renderer;
/** @type {CSS2DRenderer} */ export let labelRenderer;
/** @type {THREE.Scene} */ export let scene;
/** @type {THREE.PerspectiveCamera} */ export let camera;
/** @type {THREE.HemisphereLight} */ export let hemi;
/** @type {THREE.DirectionalLight} */ export let sun;
/** @type {THREE.Sprite} */ export let sunDisc;

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** render resolution: capped at 1.5x, and lowered on the fly when frames run slow (see engine.js) */
export const QUALITY = { max: 1.5, min: 1, pr: 1.5 };

export function initGfx(stage) {
  // large screens draw through the glow pass, which has its own anti-aliasing, so the canvas skips it
  renderer = new THREE.WebGLRenderer({ antialias: innerWidth < 720, powerPreference: 'high-performance' });
  QUALITY.max = QUALITY.pr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(QUALITY.pr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.tabIndex = 0;
  stage.appendChild(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'labels';
  stage.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, .3, 500);
  scene.background = canvasTex(4, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#93c6f1'); gr.addColorStop(.45, '#cfe6fb'); gr.addColorStop(.78, '#fbe8de'); gr.addColorStop(1, '#f8d8c8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog('#f7e3d9', 55, 140);
  hemi = new THREE.HemisphereLight('#ffffff', '#f1cdb8', 1.45); scene.add(hemi);
  sun = new THREE.DirectionalLight('#fff1df', 2.5);
  sun.position.set(22, 38, 16); sun.userData.off = sun.position.clone(); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 120 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .04;
  scene.add(sun, sun.target);
  sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.95)'); gr.addColorStop(.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), fog: false, toneMapped: false, depthWrite: false, transparent: true }));
  sunDisc.position.set(70, 52, -130); sunDisc.scale.setScalar(34); scene.add(sunDisc);
  initTextures();
}

/* ---- materials ---- */
export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...o });
export const CM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .65, ...o });
export const mat = {
  grass: M('#9ed67e'), grassDark: M('#86c867'), dirt: M('#e4b48b'), rock: M('#c99c86', { flatShading: true }),
  wood: M('#c98d5a'), wood2: M('#ad7244'), rope: M('#ecd8b8'), stone: M('#f4e5da'), cream: M('#fffaf4'),
  coral: M('#ec6a4e'), coralSoft: M('#f6a68f'), sun: M('#ffd166', { roughness: .7 }), navy: M('#2a3656'), white: M('#ffffff'),
  leaf: M('#7cc463', { flatShading: true }), leaf2: M('#9bd57a', { flatShading: true }), blossom: M('#f7a7a3', { flatShading: true }), blossom2: M('#fbc6bd', { flatShading: true }),
  maple: M('#d9472b', { flatShading: true }), maple2: M('#ef7d2d', { flatShading: true }), maple3: M('#f2b23a', { flatShading: true }),
  spruce: M('#3f8a5a', { flatShading: true }), spruce2: M('#4f9c68', { flatShading: true }),
  trunk: M('#a8724a'), dark: M('#3a4258', { roughness: .5 }), steel: M('#cfd6df', { metalness: .3, roughness: .4 }),
  curb: M('#eadfce'), inlay: M('#f4ece0'),
};
export const hitMat = new THREE.MeshBasicMaterial({ visible: false });
/** materials that glow at night (lamps, windows) */
export const lampMats = [];
export function mesh(geo, m, cast = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; return o; }
export function put(parent, geo, m, x, y, z, cast = true) { const o = mesh(geo, m, cast); o.position.set(x, y, z); parent.add(o); return o; }
export function addTo(parent, geo, m, x, y, z) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
export const dummy = new THREE.Object3D();

// Things that can be clicked or hovered (stations, props, pets, people), the ground you can click to walk,
// and the round and box obstacles that block walking.
export const stationHits = [];
export const walkMeshes = [];
/** @type {{x:number,z:number,r:number}[]} */
export const colliders = [];
/** @type {{x:number,z:number,c:number,s:number,hw:number,hd:number}[]} */
export const boxes = [];
/** townsfolk who walk around: soft round bodies Henry and the pets step around (updated every frame) */
/** @type {{x:number,z:number,r:number}[]} */
export const movers = [];

/* ---- shared textures ---- */
/** @type {THREE.CanvasTexture} */ export let heartTex;
/** @type {THREE.CanvasTexture} */ export let leafTex;
/** @type {THREE.CanvasTexture} */ export let sparkTex;
/** @type {THREE.CanvasTexture} */ export let puffTex;
/** @type {THREE.CanvasTexture} */ export let noteTex;
/** @type {THREE.CanvasTexture} */ export let blobTex;
/** @type {THREE.MeshBasicMaterial} */ export let blobMat;
/** @type {THREE.CanvasTexture} */ export let markTex;
/** @type {THREE.CanvasTexture} */ export let doneTex;
function initTextures() {
  heartTex = canvasTex(64, 64, (c) => { c.fillStyle = '#f2707a'; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 36, 6, 10, 22, 10); c.bezierCurveTo(28, 10, 32, 15, 32, 20); c.bezierCurveTo(32, 15, 36, 10, 42, 10); c.bezierCurveTo(58, 10, 60, 36, 32, 54); c.fill(); });
  leafTex = canvasTex(64, 64, (c) => { c.fillStyle = '#7cc463'; c.beginPath(); c.ellipse(32, 32, 12, 24, .6, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#5ea849'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 46); c.lineTo(44, 18); c.stroke(); });
  sparkTex = canvasTex(64, 64, (c) => { c.fillStyle = '#ffd166'; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 28, a = -Math.PI / 2 + i * Math.PI / 4; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.closePath(); c.fill(); });
  puffTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  noteTex = canvasTex(64, 64, (c) => { c.fillStyle = '#8b5cf6'; c.beginPath(); c.ellipse(22, 46, 10, 8, -.4, 0, Math.PI * 2); c.fill(); c.fillRect(29, 12, 5, 34); c.beginPath(); c.moveTo(34, 12); c.quadraticCurveTo(50, 18, 46, 32); c.quadraticCurveTo(44, 22, 34, 22); c.fill(); });
  blobTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(32,43,69,.3)'); gr.addColorStop(1, 'rgba(32,43,69,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  markTex = canvasTex(96, 96, (c) => { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(48, 48, 40, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke(); c.fillStyle = '#202b45'; c.font = `700 60px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 48, 52); });
  doneTex = canvasTex(96, 96, (c) => { c.fillStyle = '#2fb67c'; c.beginPath(); c.arc(48, 48, 40, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke(); c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(30, 50); c.lineTo(43, 63); c.lineTo(67, 36); c.stroke(); });
}

export function glyphTex(kind, color) {
  return canvasTex(128, 128, (c) => {
    c.fillStyle = '#ffffff'; rrPath(c, 4, 4, 120, 120, 32); c.fill();
    c.fillStyle = '#fbe3d8'; rrPath(c, 12, 12, 104, 104, 26); c.fill();
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
    if (kind === 'person') { c.beginPath(); c.arc(64, 50, 15, 0, 7); c.stroke(); c.beginPath(); c.moveTo(36, 96); c.quadraticCurveTo(38, 72, 64, 72); c.quadraticCurveTo(90, 72, 92, 96); c.stroke(); }
    if (kind === 'mail') { rrPath(c, 30, 40, 68, 48, 9); c.stroke(); c.beginPath(); c.moveTo(36, 48); c.lineTo(64, 68); c.lineTo(92, 48); c.stroke(); }
    if (kind === 'star') { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 32, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } c.closePath(); c.fill(); }
    if (kind === 'cup') { rrPath(c, 34, 54, 46, 38, 10); c.stroke(); c.beginPath(); c.arc(82, 72, 10, -Math.PI / 2, Math.PI / 2); c.stroke(); c.lineWidth = 6; for (const sx of [48, 64]) { c.beginPath(); c.moveTo(sx, 46); c.quadraticCurveTo(sx - 6, 38, sx, 32); c.quadraticCurveTo(sx + 6, 26, sx, 20); c.stroke(); } }
    if (kind === 'board') { rrPath(c, 28, 32, 72, 64, 10); c.stroke(); c.lineWidth = 6; for (const lx of [52, 76]) { c.beginPath(); c.moveTo(lx, 38); c.lineTo(lx, 90); c.stroke(); } c.fillRect(34, 44, 12, 9); c.fillRect(34, 59, 12, 9); c.fillRect(58, 44, 12, 9); c.fillRect(82, 44, 12, 9); }
    if (kind === 'train') { rrPath(c, 32, 28, 64, 64, 12); c.stroke(); c.beginPath(); c.moveTo(32, 55); c.lineTo(96, 55); c.stroke(); for (const sx of [48, 80]) { c.beginPath(); c.arc(sx, 71, 5, 0, 7); c.fill(); } c.beginPath(); c.moveTo(44, 96); c.lineTo(34, 106); c.moveTo(84, 96); c.lineTo(94, 106); c.stroke(); }
    if (kind === 'car') { c.beginPath(); c.moveTo(24, 78); c.lineTo(30, 57); c.lineTo(42, 50); c.lineTo(52, 35); c.lineTo(80, 35); c.lineTo(91, 50); c.lineTo(100, 57); c.lineTo(104, 78); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(34, 56); c.lineTo(94, 56); c.stroke(); for (const sx of [36, 92]) { c.beginPath(); c.arc(sx, 83, 7, 0, 7); c.fill(); } }
    if (kind === 'warehouse') { c.beginPath(); c.moveTo(25, 100); c.lineTo(25, 48); c.lineTo(64, 27); c.lineTo(103, 48); c.lineTo(103, 100); c.stroke(); c.strokeRect(42, 63, 44, 37); c.beginPath(); c.moveTo(42, 76); c.lineTo(86, 76); c.moveTo(42, 89); c.lineTo(86, 89); c.stroke(); }
  });
}
const loader = new THREE.TextureLoader();
export function loadTex(src) { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
