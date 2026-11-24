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
  o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive && !c.userData.noRecv; } });   // noRecv: soft stacked shapes
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

export const hemi = new THREE.HemisphereLight(0xd3efff, 0xf0d2b0, 0.95);
export const sun = new THREE.DirectionalLight(0xfff0db, 2.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 2, far: 120 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
sun.shadow.radius = 3;
scene.add(hemi, sun, sun.target);
/** keep the shadow box on the part of the course that is on screen */
export function sunFollow(x, y, z = 0) {
  sun.position.set(x - 14, y + 34, z + 16);
  sun.target.position.set(x, y - 2, z - 8);
}

// the scene is drawn into the composer's texture, which has no anti-aliasing of its own — the canvas's `antialias` does not
// reach it, so every outline came out as a jagged dark staircase (user 2026-11-24: "모든 오브젝트 테두리에 검은색 선처럼
// 깨져보이는거"). A multisampled target smooths them again — as many samples as the GPU gives, up to 8 ("테두리 최대한 부드럽게").
export const MSAA = Math.min(8, renderer.capabilities.maxSamples || 4);
export const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: MSAA }));
composer.setSize(innerWidth, innerHeight);
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

// ---------------------------------------------------------------- themes: one look per level (user 2026-11-23: "level별 맵이 다양했으면")
// meadow = the Word Mashup world as it was · candy = a sunset candy land · night = a starry crystal night.
export const THEMES = {
  forest: {
    sky: [0x3d97e8, 0x8fd0f5, 0xf4f0dc], fog: [0xdcefff, 45, 210], hemi: [0xd6ebff, 0x7fae6a, 1.0], sun: [0xffe4bf, 2.9],
    shadow: 0.6, env: 0.28, exposure: 0.95, bloom: [0, 9], grass: 0x6bcb4c, grassGlow: 0, dirt: [0x7a4a2a, 0x9c6438, 0xbb8250, 0xcf9a62],
    tree: 'round', fence: { color: 0xc58a4e }, cloud: [0xffffff, 0xd6e6ff, 0.2], path: 0xe3bd86,
    balloons: [['#ff6fa8', '#ffd34d'], ['#7ed96b', '#a57bff'], ['#4fb3ff', '#ffd34d']], cardGlow: 0.14, playerLight: 0, stars: false,
  },
  candy: {
    sky: [0x5aa6f0, 0xb6dcff, 0xffd6ea], fog: [0xffe2f0, 55, 210], hemi: [0xffe8f2, 0xc98aa8, 1.0], sun: [0xffe2c8, 2.75],
    shadow: 0.6, env: 0.6, exposure: 0.97, bloom: [0, 9], grass: 0xffb5d6, grassGlow: 0, dirt: [0x4a2414, 0x6c3a20, 0x8a5230, 0xf3e2cc],
    tree: 'candy', fence: { color: 0xffffff, stripes: '#ff4f5e' }, cloud: [0xffe4f1, 0xff9cc8, 0.35], path: 0xe8b46a,
    frostings: [0xffb5d6, 0xffd0e6, 0xf6c8ff], balloons: [['#ff6fa8', '#fff3c4'], ['#ffb347', '#ffffff'], ['#a57bff', '#ffd6f0']],
    cardGlow: 0.18, playerLight: 0, stars: false,
  },
  snow: {
    // the reference still (user's snow map): warm sun, blue-lavender shade on the snow, a pink horizon, light shadows
    sky: [0x4a93e6, 0xa9d2fa, 0xf6e0ee], fog: [0xe9edfa, 40, 200], hemi: [0xc9dcff, 0x7c9ce4, 1.0], sun: [0xffd9b0, 2.75],
    shadow: 0.55, env: 0.3, exposure: 0.92, bloom: [0, 9], grass: 0xf7fbff, grassGlow: 0, dirt: [0x4f8fd6, 0x76b2ec, 0xa6d6fb, 0xd2ecff],
    tree: 'pine', fence: { color: 0xf4f9ff }, cloud: [0xffffff, 0xd8e6ff, 0.25], path: 0xe6f0fb,
    balloons: null, cardGlow: 0.14, playerLight: 0, stars: false, snowfall: true,
  },
  desert: {
    sky: [0x4f9be6, 0xbfe0f5, 0xffe0b4], fog: [0xf8e2bc, 45, 220], hemi: [0xfff0dc, 0xc08a52, 0.95], sun: [0xffd6a0, 3.0],
    shadow: 0.62, env: 0.28, exposure: 0.95, bloom: [0, 9], grass: 0xf0c072, grassGlow: 0, dirt: [0xa86a36, 0xc68650, 0xdca468, 0xebbd7e],
    tree: 'palm', fence: { color: 0xd9a86a }, cloud: [0xfff6e6, 0xffd8a8, 0.25], path: 0xf8dca0,
    balloons: null, cardGlow: 0.14, playerLight: 0, stars: false,
  },
  space: {
    sky: [0x08052a, 0x24125a, 0x5a2c8c], fog: [0x1c1450, 50, 260], hemi: [0xbcaaff, 0x3a2a72, 0.95], sun: [0xe6dcff, 2.0],
    shadow: 0.7, env: 0.4, exposure: 1.04, bloom: [0, 9], grass: 0x9c8ec4, grassGlow: 0, dirt: [0x2e2648, 0x463a6a, 0x5e508a, 0x7c6eaa],
    tree: 'crystal', fence: { color: 0x8af4ff, glow: 0x2fc8ff }, cloud: [0xc4c0ff, 0x6a5fd0, 0.4], path: 0x6d5fd6,
    balloons: null, cardGlow: 0.3, playerLight: 10, stars: true, lowGravity: true,
  },
};
export let TH = THEMES.forest;
// stars + a crescent moon (night only); they ride with the camera like the sky dome
export const nightSky = (() => {
  const g = new THREE.Group(); g.visible = false; g.renderOrder = -90;
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * 500, y * 500, Math.sin(a) * r * 500], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(64, 64, c => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(220,230,255,.8)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  stars.frustumCulled = false;
  const moonTex = canvasTex(256, 256, c => {
    const gr = c.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(255,246,210,.5)'); gr.addColorStop(1, 'rgba(255,246,210,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#fff6d6'; c.beginPath(); c.arc(128, 128, 62, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(156, 108, 56, 0, Math.PI * 2); c.fill();
  });
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  moon.scale.setScalar(70); moon.position.set(-150, 230, -380);
  g.add(stars, moon);
  scene.add(g);
  return g;
})();
export const playerLight = new THREE.PointLight(0xffe2c4, 0, 9, 1.6);
scene.add(playerLight);
/** sky, fog, light, bloom and the materials the builders use, for a level's theme */
export function applyTheme(name) {
  TH = THEMES[name] || THEMES.forest;
  const u = sky.material.uniforms;
  u.cTop.value.set(TH.sky[0]); u.cMid.value.set(TH.sky[1]); u.cLow.value.set(TH.sky[2]);
  scene.fog.color.set(TH.fog[0]); scene.fog.near = TH.fog[1]; scene.fog.far = TH.fog[2];
  hemi.color.set(TH.hemi[0]); hemi.groundColor.set(TH.hemi[1]); hemi.intensity = TH.hemi[2];
  sun.color.set(TH.sun[0]); sun.intensity = TH.sun[1];
  scene.environmentIntensity = TH.env;
  renderer.toneMappingExposure = TH.exposure;
  bloom.strength = TH.bloom[0]; bloom.threshold = TH.bloom[1]; bloom.enabled = TH.bloom[0] > 0;
  nightSky.visible = TH.stars;
  playerLight.intensity = TH.playerLight;
  document.body.style.background = '#' + new THREE.Color(TH.sky[1]).getHexString();
  sun.shadow.intensity = TH.shadow ?? 1;
}

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
export function island(parent, w, d, h, grass = TH.frostings ? TH.frostings[(rnd() * TH.frostings.length) | 0] : TH.grass) {
  const g = new THREE.Group(), D = TH.dirt;
  const dirtGeo = colorByY(new RoundedBoxGeometry(w - 0.4, h, d - 0.4, 3, 0.5), -h / 2, h / 2, [[0, D[0]], [0.55, D[1]], [0.9, D[2]], [1, D[3]]]);
  const dirt = new THREE.Mesh(dirtGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  dirt.position.y = -0.55 - h / 2;
  const top = new THREE.Mesh(new RoundedBoxGeometry(w, 0.75, d, 3, 0.32), std(grass, TH.tree === 'candy' ? 0.45 : 0.75, TH.grassGlow ? { emissive: grass, emissiveIntensity: TH.grassGlow } : {}));
  top.position.y = -0.36;
  g.add(shade(dirt), shade(top));
  if (TH.tree === 'candy') {                                   // frosting drips over the cookie edge (front)
    const dm = std(grass, 0.45);
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.4; x += rr(0.8, 1.3)) {
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, rr(0.15, 0.55), 4, 10), dm);
      drip.position.set(x, -0.62 - rr(0, 0.15), d / 2 - 0.06); g.add(shade(drip));
    }
    sprinkles(g, w, d);
  }
  parent.add(g);
  return g;
}
const candyTex = {};
function swirlTex(a, b) {
  const k = a + b;
  return (candyTex[k] ||= canvasTex(256, 256, c => {
    c.fillStyle = b; c.fillRect(0, 0, 256, 256);
    c.translate(128, 128); c.strokeStyle = a; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath();
    for (let t = 0; t < 26; t += 0.08) { const r = t * 4.6; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
    c.stroke();
  }));
}
// ---- candy land (user 2026-11-23: "사탕들도 귀엽게 조금 더 입체감 있게, 파스텔 톤, 토핑 바른 것들도"): glossy pastel candy
export const PASTEL = [0xff8cbf, 0x63d9ad, 0xae8cff, 0xffd447, 0xff9c66, 0x6fbcff];   // candy: a step stronger than the pastel icing ground
export const SPRINKLE = [0xff7fb0, 0x7fd8ff, 0xffe066, 0x9cf0a8, 0xc59bff, 0xffffff];
// a softer clearcoat than before (1 / 0.08): at grazing angles a full clearcoat shows the dim environment instead of the
// pastel, which drew a dark line round every sweet (user 2026-11-24 "사탕맵만 … 검은색 라인이 들어간거처럼")
export const candyM = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 0.45, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
export const softM = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) });
let sprinkleGeo = null;
/** colourful sprinkles scattered over a surface: pts = [[x, y, z, nx, ny, nz]] (instanced) */
export function sprinkleMesh(pts, scale = 1) {
  sprinkleGeo ||= new THREE.CapsuleGeometry(0.022, 0.07, 3, 6);
  const m = new THREE.InstancedMesh(sprinkleGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), pts.length);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), M = new THREE.Matrix4(), S = V(scale, scale, scale);
  pts.forEach((p, i) => {
    e.set(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3)); q.setFromEuler(e);
    M.compose(V(p[0], p[1], p[2]), q, S); m.setMatrixAt(i, M);
    m.setColorAt(i, c.set(SPRINKLE[(rnd() * SPRINKLE.length) | 0]));
  });
  m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  return m;
}
/** sprinkles on an island's icing: behind the path and along the front edge (the path itself stays clear) */
function sprinkles(g, w, d) {
  const pts = [], n = Math.round(w * 4);
  for (let i = 0; i < n; i++) {
    const front = rnd() < 0.3, z = front ? rr(d / 2 - 0.55, d / 2 - 0.1) : rr(-d / 2 + 0.3, -0.1);
    pts.push([rr(-w / 2 + 0.3, w / 2 - 0.3), 0.03, z]);
  }
  g.add(sprinkleMesh(pts));
}
export function swirlTex2(a, b) {
  const k = 'p' + a + b;
  return (candyTex[k] ||= canvasTex(256, 256, c => {
    c.fillStyle = b; c.fillRect(0, 0, 256, 256);
    c.translate(128, 128);
    for (let arm = 0; arm < 3; arm++) {                         // three soft swirl arms
      c.strokeStyle = a; c.lineWidth = 20; c.lineCap = 'round'; c.beginPath();
      for (let t = 0; t < 1; t += 0.01) { const ang = t * 7 + arm * 2.094, r = 8 + t * 118; c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
      c.stroke();
    }
  }));
}
export function lollipop(g, s) {
  const [a, b] = [['#ff7fb4', '#ffffff'], ['#3fcf9c', '#ffffff'], ['#9d74ff', '#fff3b8'], ['#ff8f52', '#fff8ec'], ['#4ea8ff', '#ffe0ef']][(rnd() * 5) | 0];
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.065 * s, 0.065 * s, 1.75 * s, 12), std(0xfffaf2, 0.35));
  stick.position.y = 0.88 * s; g.add(stick);
  // a domed candy disc (thicker in the middle, rounded rim) with the swirl on both faces, glossy
  const prof = [[0, 0.17], [0.3, 0.16], [0.55, 0.12], [0.7, 0.06], [0.74, 0], [0.7, -0.06], [0.55, -0.12], [0.3, -0.16], [0, -0.17]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * s, y * s)), 48);
  const p = geo.getAttribute('position'), uv = geo.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (0.74 * s) * 0.5 + 0.5, p.getZ(i) / (0.74 * s) * 0.5 + 0.5);
  const m = new THREE.MeshPhysicalMaterial({ map: swirlTex2(a, b), roughness: 0.2, clearcoat: 0.45, clearcoatRoughness: 0.2 });
  const disc = new THREE.Mesh(geo, m); disc.rotation.x = Math.PI / 2; disc.position.y = 2.0 * s; g.add(disc);
  // a ribbon bow where the stick meets the candy
  const bowM = softM(PASTEL[(rnd() * PASTEL.length) | 0]);
  for (const sx of [-1, 1]) { const loop = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 16, 12), bowM); loop.scale.set(1.3, 0.75, 0.55); loop.position.set(sx * 0.2 * s, 1.27 * s, 0.05 * s); loop.rotation.z = sx * 0.35; g.add(loop); }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 12, 10), bowM); knot.position.set(0, 1.27 * s, 0.08 * s); g.add(knot);
}
export function cupcake(g, s) {
  // a ridged paper cup, a three-tier swirl of icing, sprinkles and a cherry
  const cupGeo = new THREE.CylinderGeometry(0.62 * s, 0.46 * s, 0.7 * s, 36, 1);
  const cp = cupGeo.getAttribute('position');
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), a = Math.atan2(z, x), k = 1 + 0.045 * Math.cos(a * 18); cp.setX(i, x * k); cp.setZ(i, z * k); }
  cupGeo.computeVertexNormals();
  const cup = new THREE.Mesh(cupGeo, softM(PASTEL[(rnd() * PASTEL.length) | 0])); cup.position.y = 0.35 * s; g.add(cup);
  const icing = candyM([0xfff6fb, 0xffa3cb, 0x8fe6c4, 0xc8b0ff][(rnd() * 4) | 0]);
  // the icing rings take no shadows: each ring's shadow on the one below drew a dark broken line in the crease
  // (user 2026-11-24 "아직도 테두리가 검은색 선처럼 깨져서 나와"); rounder rings too
  [[0.66, 0.2, 0.82], [0.5, 0.18, 1.05], [0.32, 0.15, 1.25]].forEach(([r, t, y]) => { const tor = new THREE.Mesh(new THREE.TorusGeometry(r * s, t * s, 24, 56), icing); tor.rotation.x = Math.PI / 2; tor.position.y = y * s; tor.userData.noRecv = true; g.add(tor); });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.32 * s, 20), icing); tip.position.y = 1.45 * s; tip.userData.noRecv = true; g.add(tip);
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 20, 14), candyM(0xff5c8a)); cherry.position.y = 1.66 * s; g.add(cherry);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.24 * s, 6), std(0x6bbf6b, 0.6)); stem.position.set(0.05 * s, 1.84 * s, 0); stem.rotation.z = -0.4; g.add(stem);
  const pts = [];
  for (let i = 0; i < 26; i++) { const a = rr(0, 6.28), lvl = (rnd() * 3) | 0, R = [0.7, 0.55, 0.36][lvl] * s, Y = [0.9, 1.13, 1.32][lvl] * s; pts.push([Math.cos(a) * R, Y, Math.sin(a) * R]); }
  g.add(sprinkleMesh(pts, s));
}
export function donut(g, s) {
  // a big donut standing on its edge: a golden ring, pastel glaze on the front with sprinkles
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62 * s, 0.32 * s, 24, 48), softM(0xf0b46c)); g.add(ring);
  const glazeGeo = new THREE.TorusGeometry(0.62 * s, 0.335 * s, 24, 48), gp = glazeGeo.getAttribute('position');
  for (let i = 0; i < gp.count; i++) { if (gp.getZ(i) < -0.02 * s) gp.setZ(i, -0.02 * s + (gp.getZ(i) + 0.02 * s) * 0.15); }
  glazeGeo.computeVertexNormals();
  const glaze = new THREE.Mesh(glazeGeo, candyM(PASTEL[(rnd() * PASTEL.length) | 0])); glaze.position.z = 0.03 * s; g.add(glaze);
  const pts = [];
  for (let i = 0; i < 34; i++) { const a = rr(0, 6.28), r = rr(0.42, 0.84) * s; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.33 * s]); }
  g.add(sprinkleMesh(pts, s));
  g.position.y += 0.94 * s; g.rotation.y = rr(-0.3, 0.3); g.rotation.z = rr(-0.15, 0.15);
}
export function cottonCandy(g, s) {
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 1.5 * s, 10), std(0xfffaf2, 0.35)); stick.position.y = 0.75 * s; g.add(stick);
  const c = [0xffb3d8, 0x9fcdff, 0xc9adff, 0x9de8c8][(rnd() * 4) | 0];   // as strong as the pink one
  const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: c, emissiveIntensity: 0.1 });
  [[0, 1.95, 0, 0.72], [0.42, 1.68, 0.12, 0.48], [-0.4, 1.72, 0.06, 0.5], [0.05, 2.4, -0.05, 0.42]].forEach(([x, y, z, r]) => { const b = new THREE.Mesh(blob(r * s, 0.14), m); b.position.set(x * s, y * s, z * s); g.add(b); });
}
export function candyTree(parent, x, z, s, y) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const k = rnd();
  if (k < 0.34) lollipop(g, s);
  else if (k < 0.56) cupcake(g, s * 1.05);
  else if (k < 0.76) donut(g, s * 0.95);
  else cottonCandy(g, s);
  parent.add(shade(g));
  return g;
}
export function crystalTree(parent, x, z, s, y) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 * s, 0), std(0x3a2f6e, 0.8, { flatShading: true }));
  rock.scale.y = 0.55; rock.position.y = 0.15 * s; g.add(rock);
  const cols = [0x7df4ff, 0xc39bff, 0xff9be0];
  const n = 3 + ((rnd() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const c = cols[(rnd() * cols.length) | 0], h = rr(0.9, 1.9) * s;
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 });
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 * s, 0), m);
    cr.scale.set(1, h / (0.56 * s), 1);
    cr.position.set(rr(-0.35, 0.35) * s, h / 2 + 0.1 * s, rr(-0.25, 0.25) * s);
    cr.rotation.set(rr(-0.25, 0.25), rr(0, 3), rr(-0.3, 0.3));
    g.add(cr);
  }
  parent.add(shade(g, true, false));
  return g;
}
let treeLeafM = null;
export function tree(parent, x, z, s = 1, y = 0) {
  if (TH.tree === 'candy') return candyTree(parent, x, z, s, y);
  if (TH.tree === 'crystal') return crystalTree(parent, x, z, s, y);
  const g = new THREE.Group(); g.position.set(x, y, z);
  // several kinds, not one round tree everywhere (user 2026-11-24 "첫번째 맵에 나무들도 모양이 좀 다양하게"): 0 the round
  // tree · 1 a tall slim poplar · 2 a cloud tree (three puffs on a forked trunk) · 3 an apple tree · 4 a birch (white trunk,
  // light leaves) · 5 a green pine. The canopy is shaded in its vertex colours: darker underneath, sunlit on top.
  const kind = (rnd() * 6) | 0;
  // more detail (user 2026-11-24 "좀더 나무 모양이 디테일 했으면 … 그냥 덩어리로 뭉쳐있는 느낌"): every leafy crown is a cluster
  // of leaf clumps (a big core, rounded clumps round it, small tufts on top) merged into one mesh, shaded dark inside and
  // underneath, sunlit on top, each clump a slightly different green; trunks flare at the roots and fork into branches
  const greens = [0x45b13c, 0x5fc94a, 0x3e9f48, 0x6fd04e], gcol = kind === 4 ? 0x86d65a : kind === 5 ? 0x2f9a4e : greens[(rnd() * greens.length) | 0];
  const base = C(gcol), dark = base.clone().multiplyScalar(0.55), light = base.clone().lerp(C(0xe2f58a), 0.4);
  const leaf = treeLeafM ||= std(0xffffff, 0.72, { vertexColors: true });
  const trunkM = kind === 4 ? std(0xf2ede4, 0.7) : std(0x8a5a30, 0.85);
  const trunk = (h, r0 = 0.12, r1 = 0.18) => {
    const prof = [[r1 * 1.7, 0], [r1 * 1.15, 0.06], [r1, 0.16], [(r0 + r1) / 2, h * 0.55], [r0, h], [0, h]].map(([r, y0]) => new THREE.Vector2(r * s, y0 * s));
    const t0 = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), trunkM); g.add(t0); return t0;
  };
  const branch = (x0, y0, x1, y1, z1, r) => { const a = new THREE.Vector3(x0 * s, y0 * s, 0), b = new THREE.Vector3(x1 * s, y1 * s, z1 * s), d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7 * s, r * s, d.length(), 8), trunkM); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m); };
  // clumps [[x, y, z, r]] (in units of s) → one shaded mesh
  const crown = cl => {
    let y0 = Infinity, y1 = -Infinity; for (const [, cy, , r] of cl) { y0 = Math.min(y0, cy - r); y1 = Math.max(y1, cy + r); }
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const [cx, cy, cz, r] of cl) {
      const geo = blob(r * s, 0.11).toNonIndexed(), p = geo.getAttribute('position'), n = geo.getAttribute('normal'), tint = rr(-0.06, 0.06);
      for (let i = 0; i < p.count; i++) {
        const wx = p.getX(i) + cx * s, wy = p.getY(i) + cy * s, wz = p.getZ(i) + cz * s, k = clamp((wy / s - y0) / (y1 - y0), 0, 1);
        c.copy(k < 0.45 ? dark.clone().lerp(base, k / 0.45) : base.clone().lerp(light, (k - 0.45) / 0.55));
        const up = Math.max(0, n.getY(i)); c.lerp(light, up * 0.25); c.offsetHSL(tint * 0.1, 0, tint);   // tops of clumps catch the sun
        pos.push(wx, wy, wz); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, leaf); g.add(m); return m;
  };
  const ring = (n, cy, R, r, dy = 0.1, ph = rr(0, 6)) => Array.from({ length: n }, (_, i) => { const a = ph + i / n * Math.PI * 2; return [Math.cos(a) * R, cy + (i % 2 ? dy : -dy), Math.sin(a) * R, r * rr(0.85, 1.1)]; });
  let clumps = null;
  if (kind === 0 || kind === 3) {                      // the round tree / the apple tree: a dome of clumps on a forked trunk
    trunk(1.1, 0.12, 0.19); branch(0, 0.95, -0.32, 1.35, 0.05, 0.08); branch(0, 1.0, 0.3, 1.4, -0.05, 0.07);
    clumps = [[0, 1.6, 0, 0.6], ...ring(6, 1.45, 0.55, 0.42), ...ring(4, 1.95, 0.3, 0.36), [0, 2.2, 0, 0.3]];
    crown(clumps);
    if (kind === 3) {                                  // apples hang on the outside of the clumps, with a stem and a leaf
      const apple = std(0xff3b3b, 0.35), stem = std(0x5a3418, 0.8), lf = std(0x5cc44a, 0.6);
      for (let i = 0; i < 10; i++) {
        const [cx, cy, cz, r] = clumps[1 + ((rnd() * 10) | 0)], a = rr(0, 6.28), e = rr(-0.6, 0.5), d = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
        const ap = new THREE.Group(); ap.position.set((cx + d.x * r * 0.98) * s, (cy + d.y * r * 0.98) * s, (cz + d.z * r * 0.98) * s);
        const b0 = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 14, 10), apple); b0.scale.set(1, 0.9, 1); ap.add(b0);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.01 * s, 0.06 * s, 5), stem); st.position.y = 0.09 * s; ap.add(st);
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), lf); l2.scale.set(1.6, 0.4, 0.8); l2.position.set(0.035 * s, 0.11 * s, 0); l2.rotation.z = 0.5; ap.add(l2);
        g.add(ap);
      }
    }
  } else if (kind === 1) {                             // a tall poplar: clumps stacked into a slim flame
    trunk(1.0, 0.1, 0.15);
    clumps = []; for (let i = 0; i < 6; i++) { const y0 = 1.15 + i * 0.32, w = 0.42 * Math.sin(Math.PI * (i + 0.8) / 7.2) + 0.12; clumps.push([rr(-0.06, 0.06), y0, rr(-0.06, 0.06), w], ...ring(3, y0 + 0.08, w * 0.55, w * 0.6, 0.05)); }
    crown(clumps);
  } else if (kind === 2) {                             // a cloud tree: three clumpy puffs on a forked trunk
    trunk(1.1); branch(0, 1.0, -0.6, 1.62, 0, 0.08); branch(0, 1.0, 0.62, 1.66, 0.05, 0.08);
    const puffC = (x0, y0, z0, r) => [[x0, y0, z0, r * 0.75], ...ring(5, y0 - 0.05, r * 0.55, r * 0.5, 0.06).map(([a, b, c2, d]) => [a + x0, b, c2 + z0, d]), [x0, y0 + r * 0.45, z0, r * 0.45]];
    crown([...puffC(-0.6, 1.8, 0, 0.62), ...puffC(0.62, 1.85, 0.05, 0.64), ...puffC(0, 2.3, -0.05, 0.7)]);
  } else if (kind === 4) {                             // a birch: white trunk with dark marks, light clumps scattered up it
    trunk(1.6, 0.08, 0.13);
    const mark = std(0x3a332c, 0.8); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.03 * s, 0.02 * s), mark); const a = rr(0, 6.28); m.position.set(Math.cos(a) * 0.1 * s, rr(0.25, 1.4) * s, Math.sin(a) * 0.1 * s); m.rotation.y = -a; g.add(m); }
    crown([[0, 1.85, 0, 0.42], ...ring(5, 1.7, 0.38, 0.32, 0.12), ...ring(3, 2.2, 0.22, 0.3), [0, 2.45, 0, 0.24]]);
  } else {                                             // a green pine: drooping tiers
    trunk(0.6, 0.12, 0.16);
    [[0.85, 0.85], [0.7, 1.3], [0.54, 1.72], [0.38, 2.1], [0.22, 2.42]].forEach(([r, y0]) => {
      const cone = new THREE.ConeGeometry(r * s, 0.7 * s, 28, 1), cp = cone.getAttribute('position'), ph = rr(0, 6);
      for (let i = 0; i < cp.count; i++) if (cp.getY(i) < 0) { const a = Math.atan2(cp.getZ(i), cp.getX(i)); cp.setY(i, cp.getY(i) - 0.06 * s * (0.5 + 0.5 * Math.sin(a * 9 + ph))); }
      cone.computeVertexNormals();
      const m = new THREE.Mesh(colorByY(cone, -0.4 * s, 0.35 * s, [[0, dark], [0.5, base], [1, light]]), leaf); m.position.y = y0 * s; g.add(m);
    });
  }
  parent.add(shade(g));
  return g;
}
// a gumdrop: wide flat base, round shoulders, a soft peak; sugar = a speckle texture + a soft sheen
const gumGeo = () => (gumGeo.g ||= (() => { const pts = [[0, 0], [0.4, 0], [0.43, 0.05], [0.42, 0.16], [0.36, 0.32], [0.26, 0.45], [0.14, 0.53], [0.05, 0.57], [0, 0.58]];
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 36); })());
const sugarTex = () => (sugarTex.t ||= (() => { const t = canvasTex(256, 256, g => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { const v = 200 + Math.random() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; })());
const gumMats = {};
const gumM = c => (gumMats[c] ||= new THREE.MeshPhysicalMaterial({ color: c, map: sugarTex(), roughness: 0.62, sheen: 0.8, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.45 }));
const stripeTex = (a, b) => (stripeTex[a + b] ||= (() => { const t = canvasTex(128, 128, g => { g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b;
  for (let i = 0; i < 6; i++) { g.save(); g.translate(64, 64); g.rotate(i / 6 * Math.PI * 2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, 10, 64, -6); g.lineTo(64, 14); g.quadraticCurveTo(34, 22, 0, 0); g.fill(); g.restore(); } }); return t; })());
/** a round sweet with pinwheel stripes in a clear pleated wrapper twisted at both ends (along x) */
function wrappedSweet(s) {
  const g = new THREE.Group(), [a, b] = [['#ff5c8a', '#ffffff'], ['#3fcf9c', '#ffffff'], ['#9d74ff', '#fff3b8'], ['#ffb02e', '#ffffff']][(rnd() * 4) | 0];
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 32, 20), new THREE.MeshPhysicalMaterial({ map: stripeTex(a, b), roughness: 0.25, clearcoat: 0.45, clearcoatRoughness: 0.2 }));
  body.scale.set(1, 0.72, 1); body.rotation.x = Math.PI / 2; g.add(body);
  const wrapM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(a), roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  for (const sx of [-1, 1]) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.1 * s, 12), wrapM); neck.rotation.z = Math.PI / 2; neck.position.x = sx * 0.34 * s; g.add(neck);
    // the pleated fan: a cone whose rim waves in and out
    const fan = new THREE.ConeGeometry(0.24 * s, 0.3 * s, 36, 1, true), fp = fan.getAttribute('position');
    for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), y = fp.getY(i); if (y < 0) { const a2 = Math.atan2(z, x), k = 1 + 0.18 * Math.sin(a2 * 9); fp.setX(i, x * k); fp.setZ(i, z * k); } }
    fan.computeVertexNormals();
    const f = new THREE.Mesh(fan, wrapM); f.rotation.z = sx * Math.PI / 2; f.position.x = sx * 0.52 * s; g.add(f);
  }
  return g;
}
/** a ring donut lying flat: golden dough, glaze on top with a wavy edge, sprinkles */
export function donutFlat(g, s) {
  const dough = new THREE.Mesh(new THREE.TorusGeometry(0.5 * s, 0.26 * s, 20, 40), softM(0xe9a95e)); dough.rotation.x = Math.PI / 2; dough.position.y = 0.26 * s; g.add(dough);
  const geo = new THREE.TorusGeometry(0.5 * s, 0.27 * s, 20, 40), p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const zz = p.getZ(i), a = Math.atan2(p.getY(i), p.getX(i)), lim = 0.02 * s - 0.07 * s * (0.5 + 0.5 * Math.sin(a * 9)); if (zz < lim) p.setZ(i, lim + (zz - lim) * 0.12); }
  geo.computeVertexNormals();
  const glaze = new THREE.Mesh(geo, candyM(PASTEL[(rnd() * PASTEL.length) | 0])); glaze.rotation.x = -Math.PI / 2; glaze.position.y = 0.27 * s; g.add(glaze);
  const pts = []; for (let i = 0; i < 30; i++) { const a = rr(0, 6.28), r = rr(0.32, 0.68) * s; pts.push([Math.cos(a) * r, 0.5 * s, Math.sin(a) * r]); }
  g.add(sprinkleMesh(pts, s));
}
/** a croissant: tapered rolls bent into a crescent, golden with darker creases */
export function croissant(g, s) {
  const m = softM(0xe7a34e), dark = softM(0xb8702c), N = 7;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), a = (t - 0.5) * 2.1, r = (0.34 - 0.2 * Math.abs(t - 0.5) * 2) * s;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), i % 2 ? dark : m); seg.scale.set(r * 0.9, r, r * 1.05);
    seg.position.set(Math.sin(a) * 0.7 * s, r * 0.95, -Math.cos(a) * 0.7 * s + 0.7 * s); seg.rotation.y = -a; g.add(seg);
  }
}
/** a stack of macarons: two domed shells with a cream filling, in pastel colours */
export function macarons(g, s) {
  const n = 2 + ((rnd() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const c = PASTEL[(rnd() * PASTEL.length) | 0], y = i * 0.42 * s, shell = softM(c);
    for (const up of [0, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell); h.scale.y = 0.4; if (!up) h.rotation.x = Math.PI; h.position.y = y + (up ? 0.24 : 0.17) * s; g.add(h);
      const foot = new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.035 * s, 6, 28), shell); foot.rotation.x = Math.PI / 2; foot.position.y = y + (up ? 0.235 : 0.175) * s; g.add(foot); }
    const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.37 * s, 0.37 * s, 0.07 * s, 28), softM(0xfff6ea)); cream.position.y = y + 0.205 * s; g.add(cream);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 0.01, 28), shell); bottom.position.y = y + 0.005; if (i === 0) g.add(bottom);
  }
}
/** a big chocolate-chip cookie standing up on its edge, leaning back a little */
export function cookie(g, s) {
  const c = new THREE.Group(); c.position.y = 0.72 * s; c.rotation.x = -0.25;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * s, 0.75 * s, 0.16 * s, 32), softM(0xdda05a)); body.rotation.x = Math.PI / 2; c.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74 * s, 0.08 * s, 8, 36), softM(0xc98a46)); c.add(rim);
  const chip = std(0x4a2814, 0.5);
  for (let i = 0; i < 11; i++) { const a = rr(0, 6.28), r = rr(0, 0.6) * s; for (const sz of [-1, 1]) { const ch = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 8, 6), chip); ch.scale.set(1, 0.8, 0.6); ch.position.set(Math.cos(a) * r, Math.sin(a) * r, sz * 0.085 * s); c.add(ch); } }
  g.add(c);
}
export function bush(parent, x, z, s = 1, y = 0) {
  if (TH.tree === 'candy') {                                   // a little heap of sweets: gumdrops of different sizes + a wrapped sweet
    // (user 2026-11-24 "사탕 젤리 등도 좀더 형태가 명확했으면", "크기도 크고 작고"): classic gumdrops — flat base, rounded
    // shoulders, a soft peak — coated in sparkly sugar; a peppermint-striped sweet in a pleated wrapper twisted at both ends
    const g = new THREE.Group(); g.position.set(x, y, z);
    const n = 2 + ((rnd() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const c = PASTEL[(rnd() * PASTEL.length) | 0], m = gumM(c), k = s * [1.25, 0.8, 0.6][i] * rr(0.9, 1.1);
      const d = new THREE.Mesh(gumGeo(), m); d.scale.setScalar(k); d.position.set([0, 0.62, -0.5][i] * s, 0, [0, 0.25, 0.3][i] * s); d.rotation.y = rr(0, 6); g.add(d);
    }
    if (rnd() < 0.75) { const w = wrappedSweet(s * rr(0.8, 1.1)); w.position.set(-0.75 * s, 0.22 * s, 0.45 * s); w.rotation.y = rr(-0.5, 0.5); g.add(w); }   // beside the heap, not hiding it
    parent.add(shade(g)); return g;
  }
  if (TH.tree === 'crystal') {                                 // glowing orbs in the grass
    const g = new THREE.Group(); g.position.set(x, y, z);
    for (let i = 0; i < 3; i++) {
      const c = [0xfff3a0, 0x9ff7ff, 0xffb8ec][i];
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 14, 10), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
      o.position.set((i - 1) * 0.45 * s, rr(0.15, 0.5) * s, rr(-0.2, 0.2)); g.add(o);
    }
    parent.add(g); return g;
  }
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
const fenceMats = {};
function themeFenceMat() {
  const f = TH.fence, k = JSON.stringify(f);
  if (fenceMats[k]) return fenceMats[k];
  if (f.stripes) {                                             // candy cane
    const t = canvasTex(64, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = f.stripes; for (let i = -64; i < 128; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 14, 0); c.lineTo(i + 14 + 64, 64); c.lineTo(i + 64, 64); c.fill(); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
    return (fenceMats[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }));
  }
  return (fenceMats[k] = f.glow ? std(f.color, 0.35, { emissive: f.glow, emissiveIntensity: 0.9 }) : (f.color === 0xffc226 ? fenceMat : std(f.color, 0.42)));
}
const postGeo = new THREE.CapsuleGeometry(0.12, 0.72, 4, 12);
export function fence(parent, a, b) {
  const fenceMat = themeFenceMat();
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
  const glow = TH.stars ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 } : {};
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, ...glow }));
}
function rope(p0, p1, r, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p0.distanceTo(p1), 5), mat);
  m.position.copy(p0).lerp(p1, 0.5); m.lookAt(p1); m.rotateX(Math.PI / 2);
  return m;
}
export const balloons = [];
const lanternProf = [[0, -0.62], [0.22, -0.62], [0.46, -0.42], [0.56, -0.08], [0.54, 0.2], [0.42, 0.48], [0.2, 0.62], [0, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
export function lantern(parent, x, y, z, color, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const body = new THREE.Mesh(new THREE.LatheGeometry(lanternProf, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.6 }));
  const capM = std(0x4a2f6e, 0.6);
  for (const yy of [-0.64, 0.64]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16), capM); cap.position.y = yy; g.add(cap); }
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.4, 6), std(0xffc83a, 0.5)); tassel.position.y = -0.9;
  g.add(body, tassel);
  g.userData.bob = rr(0, 6.28);
  parent.add(g); balloons.push(g);
  return g;
}
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
  // the ropes end ON the balloon (user 2026-11-24 "열기구 풍선과 선이 붙어 있지 않아 선이 떠있어서"): they used to stop in the
  // air beside the narrow bottom tip. Now they meet a load ring at the envelope's mouth, where its radius is rA
  const yA = -1.3 * s, prof = env.geometry.parameters.points;
  let rA = 0.3; for (let i = 1; i < prof.length; i++) if (prof[i - 1].y <= yA && prof[i].y >= yA) { const k = (yA - prof[i - 1].y) / (prof[i].y - prof[i - 1].y); rA = prof[i - 1].x + (prof[i].x - prof[i - 1].x) * k; break; }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rA * 0.98, 0.06, 8, 32), std(0xc98a3a, 0.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 4.9 + yA; g.add(ring);
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const n = Math.SQRT1_2; g.add(rope(V(dx * (w / 2 - 0.25), 0.02, dz * 0.95), V(dx * rA * n, 4.9 + yA, dz * rA * n), 0.03, ropeM)); }
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
  const U = portal(g, R - 0.6, H);
  parent.add(shade(g, true, true));
  return { group: g, U, star, starM, H, R };
}
/** the swirl filling a gate's opening (a box w*2 wide, H tall, under a half circle); colours A → B (rgb 0..1) when awake,
 *  a dim greyed version of them while asleep */
export function portal(g, w, H, A = [1.0, 0.36, 0.86], B = [0.32, 0.88, 1.0]) {
  const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(w, H); sh.absarc(0, H, w, 0, Math.PI, false); sh.lineTo(-w, 0);
  const pg = shapeUV(new THREE.ShapeGeometry(sh, 32), -w, 0, 2 * w, H + w);
  const U = { uT: { value: 0 }, uFlash: { value: 0 }, uOpen: { value: 0 }, uA: { value: new THREE.Vector3(...A) }, uB: { value: new THREE.Vector3(...B) } };
  const m = new THREE.Mesh(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uFlash, uOpen; uniform vec3 uA, uB; varying vec2 vUv;
      void main() {
        vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y * 1.5 - 0.62);
        float r = length(p), a = atan(p.y, p.x);
        float sw = sin(a * 3.0 + r * 9.0 - uT * (0.8 + 2.4 * uOpen));
        vec3 c = mix(uA, uB, 0.5 + 0.5 * sw);
        c = mix(c, vec3(1.0, 0.97, 1.0), smoothstep(0.55, 0.0, r) * 0.75);
        vec3 sa = mix(vec3(0.36, 0.33, 0.62), uA, 0.3) * 0.9, sb = mix(vec3(0.5, 0.52, 0.78), uB, 0.3);
        vec3 shut = mix(sa, sb, 0.5 + 0.5 * sw);                                     // closed: a slow dim swirl
        c = mix(shut, c * (1.25 + uFlash * 2.0), uOpen);
        gl_FragColor = vec4(c, mix(0.72, 0.9, uOpen));
      }`,
  }));
  m.position.z = 0.05; m.castShadow = false;
  g.add(m);
  return U;
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
  const mat = new THREE.MeshStandardMaterial({ color: TH.cloud[0], roughness: 1, emissive: TH.cloud[1], emissiveIntensity: TH.cloud[2] });
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
  let k = 0;
  if (!TH.balloons) {                                          // night: floating paper lanterns, near and far
    const lc = [0xffb347, 0xff7fb0, 0x9ff0ff, 0xffe27a];
    for (let x = x0 - 10; x < x1 + 20; x += rr(7, 12)) lantern(parent, x, rr(5, 13), rr(-34, -10), lc[k++ % lc.length], rr(0.7, 1.2));
    return;
  }
  for (let x = x0 - 10; x < x1 + 20; x += rr(22, 30)) {
    const [a, b] = TH.balloons[k++ % TH.balloons.length];
    balloon(parent, x, rr(8, 14), rr(-40, -18), a, b, rnd() < 0.4, rr(0.9, 1.2));
  }
}

// ---------------------------------------------------------------- level gadgets
/** candy land: a jelly drum that bounces the runner high; local y = 0 is the drum top */
export function bouncePad(parent) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.5, 32), std(0xffffff, 0.35, { color: new THREE.Color(0x7b5cff) }));
  base.position.y = -0.3;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 40), std(0xffc93a, 0.35));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.05;
  const jelly = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xff5fae, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transmission: 0, sheen: 0.4, emissive: 0xff2f8f, emissiveIntensity: 0.15 }));
  jelly.scale.y = 0.42; jelly.position.y = -0.08; jelly.name = 'jelly';
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  shine.scale.set(1.4, 0.5, 0.8); shine.position.set(-0.32, 0.22, 0.4);
  g.add(base, ring, jelly, shine);
  parent.add(shade(g));
  return g;
}
/** night: a puffy cloud you can stand on (it sinks while you do); local y = 0 is its top */
export function cloudPad(parent, w) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xfff6fb, roughness: 1, emissive: 0xffb8e6, emissiveIntensity: 0.6 });   // brighter and pinker than the sky's clouds: it reads as a step
  const n = Math.max(3, Math.round(w / 0.8));
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5, r = 0.55 + 0.25 * Math.sin(t * Math.PI);
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), m);
    b.scale.set(r, r * 0.62, r * 1.1); b.position.set(-w / 2 + 0.45 + t * (w - 0.9), -r * 0.55, rr(-0.2, 0.2)); g.add(b);
  }
  const flat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), m); flat.scale.set(w / 1.0 - 0.1, 1, 1.9); flat.position.y = -0.2; g.add(flat);
  parent.add(shade(g, true, true));
  return g;
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
