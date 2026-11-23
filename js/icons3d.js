// UI icons as real 3D renders (user 2026-11-23: "그래픽 2d로 된것도 다 3d 스타일로 바꿔야함"): hearts, the m coin, stars,
// a padlock, the shop items and a cracked heart are small three.js models rendered once into PNG data
// URLs (a second, throw-away WebGL context) and used as <img> / CSS variables by the page.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    x.font = '800 168px "Baloo 2", "Arial Rounded MT Bold", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#e48f0c'; x.fillText('m', 132, 116); x.fillStyle = '#fff7c8'; x.fillText('m', 126, 108);
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
// ---- shop items
function shades() {
  const g = new THREE.Group(), frame = glossy(0xff4fa3), lens = new THREE.MeshPhysicalMaterial({ color: 0x2a1240, roughness: 0.08, clearcoat: 1 });
  for (const x of [-0.85, 0.85]) {
    const f = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.1, 0.22, 4, 0.35), frame); f.position.x = x;
    const l = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.82, 0.12, 4, 0.28), lens); l.position.set(x, 0, 0.1);
    g.add(f, l, shine(x + 0.25, 0.22, 0.2, 0.12, 0.07));
  }
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), frame); bridge.rotation.z = Math.PI / 2; bridge.position.y = 0.18; g.add(bridge);
  return g;
}
function cape() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1, 12, 12), p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5, w = 0.9 + 0.9 * (1 - v);
    p.setXYZ(i, u * w, -1.8 * (1 - v), -0.35 * (u * 2) ** 2 + 0.12 * Math.sin(u * 9) * (1 - v));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, glossy(0xe8304a, { side: THREE.DoubleSide, roughness: 0.45, clearcoat: 0.3 }));
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.9, 4, 10), glossy(0xffc83a, { metalness: 0.3 })); bar.rotation.z = Math.PI / 2; bar.position.z = 0.05;
  g.add(m, bar); g.rotation.x = -0.25;
  return g;
}
function crown() {
  const g = new THREE.Group(), gold = new THREE.MeshPhysicalMaterial({ color: 0xffc83a, roughness: 0.22, metalness: 0.6, clearcoat: 1 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, 0.55, 40, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
  const gems = [0xff3f79, 0x2f7bff, 0x37d39b];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.62, 12), gold); sp.position.set(Math.sin(a), 0.56, Math.cos(a)); g.add(sp);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), gold); b.position.set(Math.sin(a), 0.92, Math.cos(a)); g.add(b);
    if (i % 2 === 0) { const gem = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), glossy(gems[i / 2])); gem.position.set(Math.sin(a) * 1.04, 0, Math.cos(a) * 1.04); g.add(gem); }
  }
  g.rotation.x = 0.35;
  return g;
}
function goldShoe() {
  // Tata's shoe in gold: a puffy toe, a white sole, the opening for the foot
  const geo = new THREE.SphereGeometry(1, 40, 28), p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -0.45) y = -0.45 - (y + 0.45) * 0.2;
    p.setXYZ(i, x * 0.85 * (z > 0 ? 1 + 0.1 * z : 1), y * 0.62, z * 1.15);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xffc23a, roughness: 0.25, metalness: 0.55, clearcoat: 1 })));
  const sole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), matte(0xfff4dc)); sole.scale.set(0.9, 0.12, 1.22); sole.position.y = -0.3; g.add(sole);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), matte(0x8a5a10)); hole.rotation.x = -Math.PI / 2 + 0.25; hole.position.set(0, 0.6, -0.35); hole.scale.set(1, 1.25, 1); g.add(hole);
  g.add(shine(-0.3, 0.42, 0.75, 0.2, 0.08));
  g.rotation.set(0.4, -0.75, 0);
  return g;
}

/** render everything (call again after the web font has loaded: the coin's "m") */
export function renderIcons() {
  const I = {
    heartOn: shot(heart(true)), heartOff: shot(heart(false)),
    coin: shot(coin(), { yaw: -0.45, pitch: -0.15 }),
    starOn: shot(star(true), { pitch: -0.12 }), starOff: shot(star(false), { pitch: -0.12 }),
    lock: shot(padlock(), { yaw: -0.35, pitch: -0.15 }),
    shades: shot(shades(), { yaw: -0.35, pitch: -0.12 }), cape: shot(cape(), { yaw: -0.4 }), crown: shot(crown(), { yaw: 0.2 }), goldshoes: shot(goldShoe()),
  };
  I.broken = shot(crackedHeart());
  const root = document.documentElement.style;
  root.setProperty('--ic-coin', `url("${I.coin}")`);
  root.setProperty('--ic-lock', `url("${I.lock}")`);
  return I;
}
export const ICON = renderIcons();
export function refreshCoin() { ICON.coin = shot(coin(), { yaw: -0.45, pitch: -0.15 }); document.documentElement.style.setProperty('--ic-coin', `url("${ICON.coin}")`); }
