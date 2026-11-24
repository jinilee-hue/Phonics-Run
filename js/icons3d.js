// UI icons as real 3D renders (user 2026-11-23: "그래픽 2d로 된것도 다 3d 스타일로 바꿔야함"): hearts, the m coin, stars,
// a padlock, the shop items and a cracked heart are small three.js models rendered once into PNG data
// URLs (a second, throw-away WebGL context) and used as <img> / CSS variables by the page.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ITEMS, buildItem, ICON_VIEW } from './outfits.js';

const S = 256;
const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(S, S, false);
r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cff0, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xfff0f8, 1.1); rim.position.set(3, 1, -2); scene.add(rim);
const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);

const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0, ...extra });
const matte = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

/** render one object, framed to fill the icon (pad = margin), and return a PNG data URL */
function shot(obj, { pad = 1.12, yaw = 0, pitch = 0, dist = 6 } = {}) {
  const holder = new THREE.Group(); holder.add(obj); holder.rotation.set(pitch, yaw, 0); scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const half = Math.max(sz.x, sz.y) / 2 * pad;
  cam.position.set(c.x, c.y, c.z + dist); cam.lookAt(c);
  cam.fov = 2 * Math.atan(half / dist) * 180 / Math.PI; cam.updateProjectionMatrix();
  r.setClearColor(0x000000, 0); r.clear(); r.render(scene, cam);
  const url = canvas.toDataURL('image/png');
  scene.remove(holder);
  holder.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  return url;
}

const ext = (shape, depth, bevel) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 24 });
  g.center(); return g;
};
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(-0.35, -0.7, -1.1, -0.25, -1.1, 0.3);
  s.bezierCurveTo(-1.1, 0.85, -0.55, 1.08, -0.25, 0.95);
  s.bezierCurveTo(-0.1, 0.88, 0, 0.75, 0, 0.62);
  s.bezierCurveTo(0, 0.75, 0.1, 0.88, 0.25, 0.95);
  s.bezierCurveTo(0.55, 1.08, 1.1, 0.85, 1.1, 0.3);
  s.bezierCurveTo(1.1, -0.25, 0.35, -0.7, 0, -1.0);
  return s;
}
/** a chubby star with ROUNDED tips and inner corners (user: "별 라운드 둥글게") */
function starShape(n = 5, R = 1, rIn = 0.56, rTip = 0.26, rIn2 = 0.12) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? rIn : R; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const s = new THREE.Shape(), N = pts.length;
  for (let i = 0; i < N; i++) {
    const p = pts[i], prev = pts[(i + N - 1) % N], next = pts[(i + 1) % N], k = i % 2 ? rIn2 : rTip;
    const a = p.clone().lerp(prev, k), b = p.clone().lerp(next, k);
    i ? s.lineTo(a.x, a.y) : s.moveTo(a.x, a.y);
    s.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  s.closePath();
  return s;
}
const shine = (x, y, z, sx = 0.22, sy = 0.11) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  m.scale.set(sx, sy, 0.04); m.position.set(x, y, z); m.rotation.z = 0.5; return m;
};

function heart(on) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(ext(heartShape(), 0.38, 0.22), on ? glossy(0xff4f8b) : matte(0xddd5ee)));
  if (on) g.add(shine(-0.48, 0.48, 0.42));
  return g;
}
function crackedHeart() {
  // two halves split along a zigzag crack, pushed apart and tilted
  const zig = [[0, 0.62], [-0.12, 0.36], [0.1, 0.1], [-0.1, -0.18], [0.07, -0.5], [0, -1.0]];
  const half = sgn => {
    const s = new THREE.Shape(); s.moveTo(0, 0.62);
    for (const [x, y] of zig.slice(1)) s.lineTo(x, y);
    s.bezierCurveTo(sgn * 0.35, -0.7, sgn * 1.1, -0.25, sgn * 1.1, 0.3);
    s.bezierCurveTo(sgn * 1.1, 0.85, sgn * 0.55, 1.08, sgn * 0.25, 0.95);
    s.bezierCurveTo(sgn * 0.1, 0.88, 0, 0.75, 0, 0.62);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 5, curveSegments: 24 });
    g.translate(0, 0, -0.19);
    const m = new THREE.Mesh(g, matte(0xd9d0ea)); m.position.x = sgn * 0.14; m.rotation.z = -sgn * 0.14;
    return m;
  };
  const g = new THREE.Group(); g.add(half(-1), half(1));
  return g;
}
function coin() {
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const gr = x.createRadialGradient(108, 96, 12, 128, 128, 128); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(0.55, '#ffd23f'); gr.addColorStop(1, '#f2a516');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#e48f0c'; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.stroke();
    // the m centred by its own ink, like the coins in the course (items.js)
    x.font = '800 168px "Baloo 2", "Arial Rounded MT Bold", sans-serif'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    const mm = x.measureText('m'), mx = 128 - (mm.actualBoundingBoxRight - mm.actualBoundingBoxLeft) / 2, my = 128 + (mm.actualBoundingBoxAscent - mm.actualBoundingBoxDescent) / 2;
    x.fillStyle = '#e48f0c'; x.fillText('m', mx + 3, my + 4); x.fillStyle = '#fff7c8'; x.fillText('m', mx - 1, my - 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t;
  })();
  const side = new THREE.MeshPhysicalMaterial({ color: 0xf5b21e, roughness: 0.3, metalness: 0.35, clearcoat: 0.6, emissive: 0x5a3000, emissiveIntensity: 0.25 });
  const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, metalness: 0.2, clearcoat: 0.8, emissive: 0xffc23a, emissiveIntensity: 0.12 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.26, 48).rotateX(Math.PI / 2), [side, face, face]);
  const g = new THREE.Group(); g.add(m);
  return g;
}
function star(on) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(starShape(), { depth: 0.26, bevelEnabled: true, bevelThickness: 0.26, bevelSize: 0.16, bevelSegments: 8, curveSegments: 20 }); geo.center();
  g.add(new THREE.Mesh(geo, on ? glossy(0xffc83a, { metalness: 0.25, emissive: 0x5a3800, emissiveIntensity: 0.2 }) : matte(0xe6e0f4)));
  if (on) g.add(shine(-0.32, 0.42, 0.36, 0.18, 0.08));
  return g;
}
function padlock() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.2, 0.6, 4, 0.22), glossy(0xb9add8, { roughness: 0.4 }));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.13, 14, 32, Math.PI), matte(0x9a8fbd, { metalness: 0.4, roughness: 0.35 }));
  shackle.position.y = 0.55;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), matte(0x5d5482)); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.02, 0.31);
  g.add(body, shackle, hole);
  return g;
}
/** render everything (call again after the web font has loaded: the coin's "m") */
export function renderIcons() {
  const I = {
    heartOn: shot(heart(true)), heartOff: shot(heart(false)),
    coin: shot(coin(), { yaw: -0.45, pitch: -0.15 }),
    starOn: shot(star(true), { pitch: -0.12 }), starOff: shot(star(false), { pitch: -0.12 }),
    lock: shot(padlock(), { yaw: -0.35, pitch: -0.15 }),
  };
  I.broken = shot(crackedHeart());
  for (const it of ITEMS) I[it.id] = shot(buildItem(it.id), { pad: 1.08, ...ICON_VIEW[it.id] });
  const root = document.documentElement.style;
  root.setProperty('--ic-coin', `url("${I.coin}")`);
  root.setProperty('--ic-lock', `url("${I.lock}")`);
  return I;
}
export const ICON = renderIcons();
export function refreshCoin() { ICON.coin = shot(coin(), { yaw: -0.45, pitch: -0.15 }); document.documentElement.style.setProperty('--ic-coin', `url("${ICON.coin}")`); }
