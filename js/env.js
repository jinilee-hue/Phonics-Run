// The world's look, taken from the Word Mashup 3D world mock-up (phonics-wordmashup-3D src/worldb/main.ts, 10-27):
// the blue sky dome, the sea of clouds, floating grass islands with a dirt body, chevron slabs (pink / blue / yellow),
// lumpy trees, yellow fences, striped hot-air balloons, the neon stage and the striped gate with its swirling portal.
// Here the pieces are builders so a side-scrolling course can be laid out with them (level.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------------------------------------------------------------- utilities
let seed = 11;
export const setSeed = s => { seed = s; };
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const rr = (a, b) => a + (b - a) * rnd();
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const C = hex => new THREE.Color(hex);
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const clamp = THREE.MathUtils.clamp;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function std(color, rough = 0.6, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
}
export function shade(o, cast = true, receive = true) {
  o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } });
  return o;
}
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/** canvas texture that is drawn again once the web font has loaded */
export const redraws = [];
export function liveTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const run = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g); t.needsUpdate = true; };
  run(); redraws.push(run);
  return t;
}
/** vertical colour gradient baked into vertex colours (stops: [t 0..1 from y0 to y1, hex]) */
export function colorByY(geo, y0, y1, stops) {
  const pos = geo.getAttribute('position'), col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const cs = stops.map(([t, h]) => [t, C(h)]);
  for (let i = 0; i < pos.count; i++) {
    const t = clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1);
    let k = 0;
    while (k < cs.length - 2 && cs[k + 1][0] < t) k++;
    const [ta, ca] = cs[k], [tb, cb] = cs[k + 1];
    c.copy(ca).lerp(cb, clamp((t - ta) / (tb - ta || 1), 0, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
/** lumpy sphere (tree tops, bushes) */
export function blob(r, wob = 0.07) {
  const g = new THREE.SphereGeometry(r, 28, 20), p = g.getAttribute('position'), v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + wob * Math.sin(v.x / r * 3.1 + 1.3) * Math.cos(v.z / r * 2.7) + wob * 0.6 * Math.sin(v.y / r * 4.3);
    v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export function roundRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
export function shapeUV(g, x0, y0, w, h) {
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / w, (p.getY(i) - y0) / h);
  return g;
}

// ---------------------------------------------------------------- renderer, scene, camera, light
export const host = document.getElementById('stage3d');
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.96;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fdcff, 70, 260);
export const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 1200);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

const hemi = new THREE.HemisphereLight(0xd3efff, 0xf0d2b0, 0.95);
export const sun = new THREE.DirectionalLight(0xfff0db, 2.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 2, far: 120 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
sun.shadow.radius = 3;
scene.add(hemi, sun, sun.target);
/** keep the shadow box on the part of the course that is on screen */
export function sunFollow(x, y) {
  sun.position.set(x - 16, y + 34, 26);
  sun.target.position.set(x + 2, y - 2, -2);
}

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.35, 1.1);
composer.addPass(bloom);
composer.addPass(new OutputPass());

export function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
}

// ---------------------------------------------------------------- sky (stays for every level)
export const sky = (() => {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { cTop: { value: C(0x0a86e2) }, cMid: { value: C(0x1bb7f1) }, cLow: { value: C(0xa8eaff) } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 cTop, cMid, cLow; varying vec3 vD;
      void main() {
        float h = vD.y;
        vec3 c = mix(cLow, cMid, smoothstep(-0.06, 0.16, h));
        c = mix(c, cTop, smoothstep(0.16, 0.72, h));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 20), m);
  s.renderOrder = -100; s.frustumCulled = false;
  scene.add(s);
  return s;
})();

// ---------------------------------------------------------------- textures
function chevronTex(base, mark, edge, rows = 2) {
  return canvasTex(256, 256 * rows, g => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256 * rows);
    g.fillStyle = mark;
    for (let i = 0; i < rows; i++) {
      const y = i * 256 + 70;
      g.beginPath(); g.moveTo(44, y + 80); g.lineTo(128, y); g.lineTo(212, y + 80); g.lineTo(212, y + 128);
      g.lineTo(128, y + 48); g.lineTo(44, y + 128); g.closePath(); g.fill();
    }
    g.strokeStyle = edge; g.lineWidth = 14; g.strokeRect(7, 7, 242, 256 * rows - 14);
  });
}
export const TEX = {
  pink: chevronTex('#ff6aa9', '#ffb5d3', '#e54c8f', 1),
  blue: chevronTex('#36a2f2', '#a3dbff', '#2483d6', 1),
  yellow: chevronTex('#ffc93a', '#fff0a6', '#f0a81e', 1),
};
export const SLAB_SIDE = { pink: 0xe5508f, blue: 0x2a86d9, yellow: 0xf0a81e };

// ---------------------------------------------------------------- builders (all take the parent group to add to)
/** chevron slab, chevrons pointing +x (the way the course runs); local y = 0 is the top */
export function slab(parent, len, color, { depth = 3, h = 0.7 } = {}) {
  const g = new THREE.Group();
  const geo = new RoundedBoxGeometry(depth, h, len, 3, Math.min(0.26, h / 2 - 0.01));
  const tex = TEX[color].clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, Math.max(1, Math.round(len / depth))); tex.needsUpdate = true;
  const sideM = std(SLAB_SIDE[color], 0.55), topM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
  const m = shade(new THREE.Mesh(geo, [sideM, sideM, topM, sideM, sideM, sideM]));
  m.rotation.y = -Math.PI / 2; m.position.y = -h / 2;
  g.add(m);
  parent.add(g);
  return g;
}
/** floating dirt island with a grass cap; local y = 0 is the walkable top, the cap is w x d */
export function island(parent, w, d, h, grass = 0x5ec53f) {
  const g = new THREE.Group();
  const dirtGeo = colorByY(new RoundedBoxGeometry(w - 0.4, h, d - 0.4, 3, 0.5), -h / 2, h / 2, [[0, 0x7d4a2b], [0.55, 0xa96b3c], [0.9, 0xc98b4f], [1, 0xd99d5c]]);
  const dirt = new THREE.Mesh(dirtGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  dirt.position.y = -0.55 - h / 2;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w, 0.75, d, 3, 0.32), std(grass, 0.75));
  top.position.y = -0.36;
  g.add(shade(dirt), shade(top));
  parent.add(g);
  return g;
}
export function tree(parent, x, z, s = 1, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.0 * s, 10), std(0x8a5a30, 0.85));
  trunk.position.y = 0.5 * s;
  const leaf = std(rnd() < 0.5 ? 0x45b13c : 0x5fc94a, 0.72);
  const top = new THREE.Mesh(blob(0.82 * s), leaf); top.position.y = 1.5 * s;
  g.add(trunk, top);
  if (rnd() < 0.55) { const t2 = new THREE.Mesh(blob(0.52 * s), leaf); t2.position.set(0.5 * s, 1.15 * s, 0.15 * s); g.add(t2); }
  parent.add(shade(g));
  return g;
}
export function bush(parent, x, z, s = 1, y = 0) {
  const leaf = std(rnd() < 0.5 ? 0x4fbb3f : 0x67cf4c, 0.75);
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(blob(0.42 * s * rr(0.8, 1.1)), leaf);
    b.position.set((i - 1) * 0.42 * s, 0.22 * s + (i === 1 ? 0.12 * s : 0), rr(-0.1, 0.1));
    g.add(b);
  }
  parent.add(shade(g));
  return g;
}
export const fenceMat = std(0xffc226, 0.42);
const postGeo = new THREE.CapsuleGeometry(0.12, 0.72, 4, 12);
export function fence(parent, a, b) {
  const g = new THREE.Group(), len = a.distanceTo(b), n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, i / (n - 1));
    const post = new THREE.Mesh(postGeo, fenceMat); post.position.set(p.x, p.y + 0.48, p.z); g.add(post);
  }
  for (const hy of [0.42, 0.78]) {
    const rail = new THREE.Mesh(new RoundedBoxGeometry(len, 0.17, 0.17, 2, 0.07), fenceMat);
    rail.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + hy, (a.z + b.z) / 2);
    rail.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    rail.rotation.z = Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z));
    g.add(rail);
  }
  parent.add(shade(g, true, false));
  return g;
}
function envelope(s, a, b) {
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / 30;
    let r = Math.cos(t), yy = Math.sin(t);
    if (yy < 0) { r *= 1 + 0.55 * yy; yy *= 1.3; }
    pts.push(new THREE.Vector2(Math.max(r, 0.0001) * 1.6 * s, yy * 1.6 * s));
  }
  const tex = canvasTex(512, 32, gg => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? b : a; gg.fillRect(i * 64, 0, 64, 32); } });
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42 }));
}
function rope(p0, p1, r, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p0.distanceTo(p1), 5), mat);
  m.position.copy(p0).lerp(p1, 0.5); m.lookAt(p1); m.rotateX(Math.PI / 2);
  return m;
}
export const balloons = [];
export function balloon(parent, x, y, z, a, b, prop = false, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const basket = new THREE.Mesh(new RoundedBoxGeometry(0.75 * s, 0.55 * s, 0.75 * s, 2, 0.12 * s), std(0xa86b3a, 0.8));
  basket.position.y = -3.6 * s;
  g.add(envelope(s, a, b), basket);
  const ropeM = std(0x7a5232, 0.9);
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(rope(V(dx * 0.3 * s, -3.35 * s, dz * 0.3 * s), V(dx * 0.32 * s, -2.05 * s, dz * 0.32 * s), 0.025 * s, ropeM));
  if (prop) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.5 * s, 8), std(0x6b6b7a, 0.5));
    hub.position.y = 1.85 * s;
    const blades = new THREE.Group(); blades.position.y = 2.1 * s; blades.name = 'prop';
    for (const r of [0, Math.PI]) { const bl = new THREE.Mesh(new RoundedBoxGeometry(1.5 * s, 0.05 * s, 0.22 * s, 1, 0.02), std(0xffe066, 0.5)); bl.position.x = Math.cos(r) * 0.75 * s; blades.add(bl); }
    g.add(hub, blades);
  }
  g.userData.bob = rr(0, 6.28);
  parent.add(shade(g, true, false));
  balloons.push(g);
  return g;
}
/** a balloon lifting a yellow pad (a moving platform); local y = 0 is the pad top */
export function liftBalloon(parent, w, a, b) {
  const g = new THREE.Group();
  const pad = slab(g, w, 'yellow', { depth: 2.4, h: 0.5 });
  void pad;
  const s = 0.82, env = envelope(s, a, b); env.position.y = 4.9;
  const ropeM = std(0x7a5232, 0.9);
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.add(rope(V(dx * (w / 2 - 0.25), 0.02, dz * 0.95), V(dx * 0.55, 4.9 - 1.75, dz * 0.4), 0.03, ropeM));
  g.add(env);
  parent.add(shade(g, true, true));
  return g;
}

// ---------------------------------------------------------------- the neon stage (start pad)
function stageTex(neon) {
  return canvasTex(1024, 1024, g => {
    const S = 1024, c = S / 2;
    if (neon) { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); }
    else {
      const gr = g.createRadialGradient(c, c, 30, c, c, c);
      gr.addColorStop(0, '#2f3a86'); gr.addColorStop(0.7, '#1d235f'); gr.addColorStop(1, '#161b4b');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(90, 205, 255, 0.2)'; g.lineWidth = 2;
      for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    }
    const ring = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); };
    g.shadowColor = neon ? 'transparent' : 'rgba(255, 90, 220, .6)'; g.shadowBlur = neon ? 0 : 18;
    ring(S * 0.4, '#ff52d9', 11); ring(S * 0.33, '#4ae8ff', 7); ring(S * 0.2, '#ff52d9', 7); ring(S * 0.47, 'rgba(74, 232, 255, .8)', 4);
    const chev = (x, y, ang, col, n) => {
      g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const o = i * 46 - (n - 1) * 23;
        g.beginPath(); g.moveTo(o - 18, -38); g.lineTo(o + 18, 0); g.lineTo(o - 18, 38); g.lineTo(o - 34, 38); g.lineTo(o + 2, 0); g.lineTo(o - 34, -38); g.closePath(); g.fill();
      }
      g.restore();
    };
    chev(S * 0.84, c, 0, '#8dff6a', 2);              // right >> (the way to go)
    chev(S * 0.16, c, 0, '#ffd93b', 2);              // left  >>
    chev(c, S * 0.87, -Math.PI / 2, '#8dff6a', 1);
    chev(c, S * 0.12, Math.PI / 2, '#ff6ad6', 1);
  });
}
let stageMaps = null;
export function stage(parent, R) {
  stageMaps ??= [stageTex(false), stageTex(true)];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.94, 1.5, 96), std(0x1a1f57, 0.5));
  body.position.y = -0.76;
  const top = new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 96), new THREE.MeshStandardMaterial({
    map: stageMaps[0], emissiveMap: stageMaps[1], emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.32, metalness: 0.05,
  }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.002;
  const rimGeo = new THREE.TorusGeometry(R, 0.36, 20, 160);
  const p = rimGeo.getAttribute('position'), col = new Float32Array(p.count * 3), ca = C(0xff74b8), cb = C(0x3ea8ff), cc = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const t = smooth(-0.7, 0.7, p.getX(i) / R); cc.copy(ca).lerp(cb, t); col.set([cc.r, cc.g, cc.b], i * 3); }
  rimGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38 }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.05;
  g.add(shade(body, false, true), shade(top, false, true), shade(rim, true, true));
  parent.add(g);
  return g;
}

/** a signpost with a text board (purple board like the world's "Word Mashup" sign) */
export function sign(parent, lines) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new RoundedBoxGeometry(3.2, 1.9, 0.3, 3, 0.18), std(0x7c4dff, 0.45));
  board.position.y = 2.7;
  const text = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.75), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: liveTex(512, 300, g2 => {
    g2.textAlign = 'center'; g2.lineJoin = 'round';
    lines.forEach(([s, size, fill], i) => {
      g2.font = `800 ${size}px "Baloo 2", "Arial Rounded MT Bold", sans-serif`;
      const y = lines.length === 1 ? 200 : 120 + i * 130;
      g2.lineWidth = 16; g2.strokeStyle = '#3a1c7a'; g2.strokeText(s, 256, y); g2.fillStyle = fill; g2.fillText(s, 256, y);
    });
  }) }));
  text.position.set(0, 2.7, 0.16);
  for (const x of [-1.1, 1.1]) { const post = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 1.9, 4, 10), fenceMat); post.position.set(x, 0.95, 0); g.add(post); }
  g.add(board, text);
  parent.add(shade(g, true, false));
  return g;
}

// ---------------------------------------------------------------- the gate (arch + swirling portal)
export function gate(parent) {
  const g = new THREE.Group();
  const R = 2.7, tube = 0.5, H = 2.6;
  const stripe = canvasTex(1024, 64, gg => { const cols = ['#ff8fc8', '#c79bff']; for (let i = 0; i < 16; i++) { gg.fillStyle = cols[i % 2]; gg.fillRect(i * 64, 0, 64, 64); } });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 18, 72, Math.PI), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.4 }));
  arch.position.y = H;
  const pm = std(0xff7fbf, 0.45);
  const pL = new THREE.Mesh(new RoundedBoxGeometry(1.15, H, 1.15, 3, 0.22), pm), pR = pL.clone();
  pL.position.set(-R, H / 2, 0); pR.position.set(R, H / 2, 0);
  const capM = std(0xffd23f, 0.4);
  for (const x of [-R, R]) { const cap = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.32, 1.4, 2, 0.11), capM); cap.position.set(x, 0.16, 0); g.add(cap); }
  const starM = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffb300, emissiveIntensity: 0.15, roughness: 0.3, flatShading: true });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), starM);
  star.position.y = H + R + tube + 0.42;
  g.add(arch, pL, pR, star);
  const w = R - 0.6;
  const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(w, H); sh.absarc(0, H, w, 0, Math.PI, false); sh.lineTo(-w, 0);
  const pg = shapeUV(new THREE.ShapeGeometry(sh, 32), -w, 0, 2 * w, H + w);
  const U = { uT: { value: 0 }, uFlash: { value: 0 }, uOpen: { value: 0 } };
  const portal = new THREE.Mesh(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uFlash, uOpen; varying vec2 vUv;
      void main() {
        vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y * 1.5 - 0.62);
        float r = length(p), a = atan(p.y, p.x);
        float sw = sin(a * 3.0 + r * 9.0 - uT * (0.8 + 2.4 * uOpen));
        vec3 c = mix(vec3(1.0, 0.36, 0.86), vec3(0.32, 0.88, 1.0), 0.5 + 0.5 * sw);
        c = mix(c, vec3(1.0, 0.97, 1.0), smoothstep(0.55, 0.0, r) * 0.75);
        vec3 shut = mix(vec3(0.36, 0.33, 0.62), vec3(0.5, 0.52, 0.78), 0.5 + 0.5 * sw);   // closed: a slow dim swirl
        c = mix(shut, c * (1.25 + uFlash * 2.0), uOpen);
        gl_FragColor = vec4(c, mix(0.72, 0.9, uOpen));
      }`,
  }));
  portal.position.z = 0.05;
  g.add(portal);
  parent.add(shade(g, true, true));
  return { group: g, U, star, starM, H, R };
}

// ---------------------------------------------------------------- clouds and far islands around a course
export function cloudLayer(parent, x0, x1) {
  const puffs = [];
  const cloud = (x, y, z, s, n = 7) => {
    for (let i = 0; i < n; i++) {
      const a = i / (n - 1) - 0.5;
      const r = s * (0.5 + 0.5 * Math.cos(a * Math.PI)) * rr(0.82, 1.08);
      const p = V(x + a * s * 2.5 + rr(-0.15, 0.15) * s, y + r * 0.32 + rr(-0.08, 0.08) * s, z + rr(-0.3, 0.3) * s);
      puffs.push(new THREE.Matrix4().compose(p, new THREE.Quaternion(), V(r, r * 0.8, r)));
    }
    puffs.push(new THREE.Matrix4().compose(V(x, y + s * 0.05, z), new THREE.Quaternion(), V(s * 1.45, s * 0.38, s * 0.62)));
  };
  // sea of clouds under the course
  for (let x = x0 - 60; x < x1 + 60; x += rr(7, 12)) {
    cloud(x, rr(-19, -15), rr(-12, 4), rr(5, 9), 5);
    cloud(x + rr(-4, 4), rr(-18, -12), rr(-70, -20), rr(6, 12), 5);
  }
  // clouds behind and above the course
  for (let x = x0 - 40; x < x1 + 40; x += rr(14, 22)) {
    cloud(x, rr(4, 13), rr(-26, -14), rr(2.2, 3.6));
    cloud(x + rr(-6, 6), rr(14, 30), rr(-90, -55), rr(6, 10));
  }
  // a few low clouds in front, below the course (depth)
  for (let x = x0 - 10; x < x1 + 10; x += rr(22, 34)) cloud(x, rr(-9.5, -7.5), rr(5, 8), rr(1.8, 2.6), 5);
  const geo = new THREE.SphereGeometry(1, 24, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xc7d3ff, emissiveIntensity: 0.2 });
  const im = new THREE.InstancedMesh(geo, mat, puffs.length);
  puffs.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = false;
  parent.add(im);
  return im;
}
export function farIslands(parent, x0, x1) {
  for (let x = x0 - 30; x < x1 + 30; x += rr(13, 19)) {
    const w = rr(7, 11), d = rr(6, 8), h = rr(5, 7);
    const g = island(parent, w, d, h);
    g.position.set(x + rr(-3, 3), rr(-4, 9), rr(-75, -32));
    for (let i = 0; i < 3; i++) tree(g, rr(-w / 2 + 1.2, w / 2 - 1.2), rr(-d / 2 + 1.2, d / 2 - 1.2), rr(0.8, 1.2));
  }
  const cols = [['#ff6fa8', '#ffd34d'], ['#7ed96b', '#a57bff'], ['#ff5a5f', '#fff1d6'], ['#4fb3ff', '#ffd34d'], ['#ff8fc8', '#ffffff'], ['#ffd34d', '#6fd16b']];
  let k = 0;
  for (let x = x0 - 10; x < x1 + 20; x += rr(22, 30)) {
    const [a, b] = cols[k++ % cols.length];
    balloon(parent, x, rr(8, 14), rr(-40, -18), a, b, rnd() < 0.4, rr(0.9, 1.2));
  }
}

// ---------------------------------------------------------------- sparkles (a few pooled bursts)
const sparkTex = canvasTex(64, 64, g => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,250,200,.9)'); gr.addColorStop(1, 'rgba(255,240,160,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
export { sparkTex };
class Sparks {
  constructor(n = 70) {
    this.n = n; this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = 0;
    this.mat = new THREE.PointsMaterial({ size: 0.4, map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff3a0, toneMapped: false });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(g, this.mat); this.pts.visible = false; this.pts.frustumCulled = false; scene.add(this.pts);
  }
  burst(at, color = 0xfff3a0, power = 1) {
    this.mat.color.set(color);
    for (let i = 0; i < this.n; i++) {
      const d = V(rr(-1, 1), rr(-0.6, 1.2), rr(-1, 1)).normalize().multiplyScalar(rr(2.5, 7) * power);
      this.pos.set([at.x, at.y, at.z], i * 3); this.vel.set([d.x, d.y, d.z], i * 3);
    }
    this.life = 1; this.pts.visible = true;
  }
  update(dt) {
    if (this.life <= 0) return;
    this.life -= dt / 1.1;
    for (let i = 0; i < this.n; i++) {
      this.vel[i * 3 + 1] -= 6 * dt;
      for (let k = 0; k < 3; k++) { this.vel[i * 3 + k] *= 1 - 1.6 * dt; this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt; }
    }
    this.pts.geometry.getAttribute('position').needsUpdate = true;
    this.mat.opacity = Math.max(0, this.life);
    this.mat.size = 0.4 * (0.6 + 0.4 * this.life);
    if (this.life <= 0) this.pts.visible = false;
  }
}
const sparkPool = [new Sparks(), new Sparks(), new Sparks(), new Sparks()];
let sparkNext = 0;
export function burst(at, color, power) { sparkPool[sparkNext++ % sparkPool.length].burst(at, color, power); }
export function updateSparks(dt) { for (const s of sparkPool) s.update(dt); }

// ---------------------------------------------------------------- dust puffs (running, landing)
const dustTex = canvasTex(64, 64, g => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const dust = [];
for (let i = 0; i < 28; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, color: 0xfff6e8 }));
  s.visible = false; s.userData = { life: 0, vx: 0, vy: 0, size: 1 };
  scene.add(s); dust.push(s);
}
let dustNext = 0;
export function puff(x, y, z, vx = 0, vy = 0.6, size = 0.5) {
  const s = dust[dustNext++ % dust.length];
  s.position.set(x, y, z); s.visible = true;
  Object.assign(s.userData, { life: 1, vx, vy, size });
}
export function updateDust(dt) {
  for (const s of dust) {
    const u = s.userData;
    if (u.life <= 0) continue;
    u.life -= dt / 0.45;
    s.position.x += u.vx * dt; s.position.y += u.vy * dt;
    u.vx *= 1 - 3 * dt;
    const k = Math.max(0, u.life);
    s.scale.setScalar(u.size * (1.6 - 0.9 * k));
    s.material.opacity = 0.85 * k;
    if (u.life <= 0) s.visible = false;
  }
}

export { RoundedBoxGeometry };
