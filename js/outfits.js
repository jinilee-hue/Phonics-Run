// Things Tata can wear (user 2026-11-23: "캐릭터 꾸미는게 너무 부실해 — 파닉스 매치 참고해서 보완"): Phonics Match's dress room
// as the model — one item per body slot, bought with coins, tapped to wear / take off. Each item is a small clay model
// built here once and used twice: worn on Tata (tata.js places it) and rendered as the shop card's picture (icons3d.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const ITEMS = [
  { id: 'gradcap', slot: 'head', name: 'Grad Cap', price: 0 },
  { id: 'bow', slot: 'head', name: 'Ribbon', price: 20 },
  { id: 'roundglasses', slot: 'face', name: 'Glasses', price: 25 },
  { id: 'bowtie', slot: 'neck', name: 'Bow Tie', price: 30 },
  { id: 'party', slot: 'head', name: 'Party Hat', price: 40 },
  { id: 'starglasses', slot: 'face', name: 'Star Glasses', price: 45 },
  { id: 'shades', slot: 'face', name: 'Sunglasses', price: 50 },
  { id: 'flowers', slot: 'head', name: 'Flowers', price: 55 },
  { id: 'scarf', slot: 'neck', name: 'Scarf', price: 60 },
  { id: 'bunny', slot: 'head', name: 'Bunny Ears', price: 70 },
  { id: 'cape', slot: 'back', name: 'Cape', price: 80 },
  { id: 'goldshoes', slot: 'feet', name: 'Gold Shoes', price: 90 },
  { id: 'wings', slot: 'back', name: 'Wings', price: 100 },
  { id: 'crown', slot: 'head', name: 'Crown', price: 120 },
];
export const itemById = id => ITEMS.find(i => i.id === id);
/** head items that sit on the crown of the head hide Tata's tuft */
export const HIDES_TUFT = new Set(['gradcap', 'party']);

// ---------------------------------------------------------------- materials (soft clay / candy gloss)
const clay = (c, rough = 0.55) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, specularIntensity: 0.4 });
const gloss = (c, extra = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, ...extra });
const gold = () => new THREE.MeshPhysicalMaterial({ color: 0xffc83a, roughness: 0.24, metalness: 0.6, clearcoat: 1 });
const E = (rx, ry, rz, m, seg = 24) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), m); o.scale.set(rx, ry, rz); return o; };
const texCache = {};
function dotsTex(base, dot, n = 7) {
  const k = base + dot + n;
  if (texCache[k]) return texCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); g.fillStyle = dot;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.beginPath(); g.arc((x + (y % 2) * 0.5) * 128 / n, (y + 0.5) * 128 / n, 128 / n / 4.2, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (texCache[k] = t);
}
function stripeTex(cols, horizontal = true) {
  const k = cols.join() + horizontal;
  if (texCache[k]) return texCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const n = cols.length * 2;
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; horizontal ? g.fillRect(0, i * 128 / n, 128, 128 / n + 1) : g.fillRect(i * 128 / n, 0, 128 / n + 1, 128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (texCache[k] = t);
}
function starShape(R = 1, rIn = 0.52, rTip = 0.24, rIn2 = 0.12) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? rIn : R; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const p = pts[i], a = p.clone().lerp(pts[(i + 9) % 10], i % 2 ? rIn2 : rTip), b = p.clone().lerp(pts[(i + 1) % 10], i % 2 ? rIn2 : rTip);
    i ? s.lineTo(a.x, a.y) : s.moveTo(a.x, a.y);
    s.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  return s;
}
const ext = (shape, depth, bevel) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 18 });

// ---------------------------------------------------------------- builders (units = Tata's: her head is 1.1 wide)
// Each returns a Group in its own frame; tata.js says where it goes.
const B = {
  // head (origin = where it touches the head top)
  gradcap() {
    const g = new THREE.Group(), navy = clay(0x23285a, 0.6);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 36), navy); cap.position.y = 0.06; g.add(cap);
    const board = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.05, 0.72, 3, 0.02), navy); board.position.y = 0.16; board.rotation.y = Math.PI / 4; g.add(board);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), gold()); btn.position.y = 0.2; g.add(btn);
    const cordPts = [new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0.2, 0.2, 0.06), new THREE.Vector3(0.36, 0.17, 0.1), new THREE.Vector3(0.38, 0.03, 0.1)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 20, 0.012, 6), gold()));
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 12), gold()); tassel.position.set(0.38, -0.02, 0.1); g.add(tassel);
    return g;
  },
  bow() {
    // a pink polka-dot ribbon (sits on the side of the head)
    const g = new THREE.Group(), m = clay(0xffffff, 0.45); m.map = dotsTex('#ff7fb0', '#ffffff', 6); m.map.repeat.set(2, 1);
    for (const s of [-1, 1]) { const loop = E(0.17, 0.12, 0.08, m); loop.position.x = s * 0.15; loop.rotation.z = s * 0.25; g.add(loop);
      const tail = E(0.05, 0.12, 0.04, m); tail.position.set(s * 0.06, -0.12, 0); tail.rotation.z = s * 0.35; g.add(tail); }
    g.add(E(0.06, 0.07, 0.065, m));
    return g;
  },
  party() {
    const g = new THREE.Group();
    const m = clay(0xffffff, 0.45); m.map = stripeTex(['#7fc8ff', '#ffe066', '#ff8fbf', '#9ae8c6'], true); m.map.repeat.set(1, 1);
    m.map = m.map.clone(); m.map.needsUpdate = true; m.map.rotation = -0.5;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.52, 40, 1, true), m); cone.position.y = 0.26; m.side = THREE.DoubleSide; g.add(cone);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), clay(0xff6f9f)); pom.position.y = 0.53; g.add(pom);
    const fluff = clay(0xffffff, 0.8);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const p = E(0.055, 0.045, 0.055, fluff, 12); p.position.set(Math.cos(a) * 0.215, 0.01, Math.sin(a) * 0.215); g.add(p); }
    return g;
  },
  flowers() {
    // a ring of flowers round the head (rx, rz = the head's size where it sits)
    const g = new THREE.Group(), rx = 0.445, rz = 0.37, cols = [0xff8fbf, 0xffd447, 0xb79bff, 0xff9c66, 0x7fd0ff];
    const leafM = clay(0x5fc96a), mid = clay(0xffe27a, 0.4);
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 + (i / N) * Math.PI * 2, x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      const f = new THREE.Group(); f.position.set(x, 0, z); f.lookAt(x * 2, 0.35, z * 2);
      const pm = clay(cols[i % cols.length], 0.5);
      g.add(f);
      for (let k = 0; k < 5; k++) { const pa = k / 5 * Math.PI * 2; const p = E(0.05, 0.05, 0.022, pm, 14); p.position.set(Math.cos(pa) * 0.05, Math.sin(pa) * 0.05, 0); f.add(p); }
      const c = E(0.032, 0.032, 0.03, mid, 12); c.position.z = 0.015; f.add(c);
      const leaf = E(0.05, 0.022, 0.012, leafM, 10); leaf.position.set(0.075, -0.035, -0.01); leaf.rotation.z = -0.5; f.add(leaf);
    }
    const vine = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), leafM); vine.rotation.x = Math.PI / 2; vine.scale.set(rx, rz, 1); g.add(vine);
    return g;
  },
  bunny() {
    // a white headband over the head with two tall ears (pink inside); origin = the head centre's top
    const g = new THREE.Group(), white = clay(0xffffff, 0.6), pink = clay(0xffa6c4, 0.6);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 10, 48, Math.PI), clay(0xff8fbf, 0.4));
    band.scale.set(0.565, 0.455, 1); band.position.y = -0.455; g.add(band);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(s * 0.3, -0.1, 0); ear.rotation.z = -s * 0.35;   // clear of Tata's tuft
      const outer = E(0.085, 0.27, 0.05, white); outer.position.y = 0.25; ear.add(outer);
      const inner = E(0.05, 0.2, 0.02, pink); inner.position.set(0, 0.25, 0.035); ear.add(inner);
      g.add(ear);
    }
    return g;
  },
  crown() {
    const g = new THREE.Group(), au = gold();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 32, 1, true), au); band.material.side = THREE.DoubleSide; g.add(band);
    const gems = [0xff3f79, 0x2f7bff, 0x37d39b];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 10), au); spike.position.set(Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2); g.add(spike);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), au); ball.position.set(Math.sin(a) * 0.2, 0.17, Math.cos(a) * 0.2); g.add(ball);
      if (i % 2 === 0) { const gem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), gloss(gems[i / 2])); gem.position.set(Math.sin(a) * 0.215, 0.0, Math.cos(a) * 0.215); gem.scale.z = 0.6; gem.lookAt(0, 0, 0); g.add(gem); }
    }
    return g;
  },
  // face (origin = between the eyes; lenses at x ±0.2, turned a little round the face)
  roundglasses() {
    const g = new THREE.Group(), fm = clay(0x8a5a32, 0.4), lens = gloss(0xffffff, { transparent: true, opacity: 0.18 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0, -0.03); e.rotation.y = s * 0.3;
      e.add(new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.02, 10, 40), fm));
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), lens); l.position.z = 0.005; e.add(l);
      g.add(e);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 16, Math.PI), fm); bridge.position.set(0, 0.03, 0.01); g.add(bridge);
    return g;
  },
  starglasses() {
    const g = new THREE.Group(), fm = gloss(0xff6fb5), lens = gloss(0xd9c4ff, { transparent: true, opacity: 0.55 });
    const outer = starShape(1), hole = starShape(0.74, 0.38);
    const ring = new THREE.Shape(outer.getPoints(12)); ring.holes.push(new THREE.Path(hole.getPoints(12).reverse()));
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0.01, -0.03); e.rotation.y = s * 0.3;
      const f = new THREE.Mesh(ext(ring, 0.02, 0.012), fm); f.scale.setScalar(0.17); f.position.z = -0.005; e.add(f);
      const l = new THREE.Mesh(new THREE.ShapeGeometry(hole, 12), lens); l.scale.setScalar(0.17); l.position.z = 0.004; e.add(l);
      g.add(e);
    }
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8), fm); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, 0.04, 0.0); g.add(bridge);
    return g;
  },
  shades() {
    const g = new THREE.Group(), frame = gloss(0xff4fa3), lens = new THREE.MeshPhysicalMaterial({ color: 0x241038, roughness: 0.08, clearcoat: 1 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0, -0.03); e.rotation.y = s * 0.3;
      e.add(new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.28, 0.05, 4, 0.1), frame));
      const l = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.21, 0.03, 4, 0.08), lens); l.position.z = 0.02; e.add(l);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); sh.position.set(0.06, 0.05, 0.037); e.add(sh);
      g.add(e);
    }
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), frame); bridge.rotation.z = Math.PI / 2; bridge.position.y = 0.035; g.add(bridge);
    return g;
  },
  // neck (origin = the front of the collar's V)
  bowtie() {
    const g = new THREE.Group(), m = clay(0xffffff, 0.45); m.map = dotsTex('#ff4f6d', '#ffffff', 5);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 24), m);
      wing.rotation.z = s * Math.PI / 2; wing.position.x = s * 0.1; wing.scale.set(1, 1, 0.55); g.add(wing);
      const tip = E(0.05, 0.1, 0.055, m); tip.position.x = s * 0.19; g.add(tip);
    }
    g.add(E(0.05, 0.055, 0.05, m));
    return g;
  },
  scarf() {
    // a striped knit scarf round the neck with one end hanging at the front
    const g = new THREE.Group(), m = clay(0xffffff, 0.75); m.map = stripeTex(['#ff6f8f', '#ffe066', '#6fc6ff'], false); m.map.repeat.set(6, 1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 14, 48), m); ring.rotation.x = Math.PI / 2 + 0.12; ring.scale.set(1, 0.86, 1); g.add(ring);
    const end = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.32, 0.06, 3, 0.03), m); end.position.set(0.13, -0.14, 0.34); end.rotation.set(0.25, 0, 0.18); g.add(end);
    const fr = clay(0xff6f8f, 0.8);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.05, 3, 6), fr); f.position.set(0.085 + i * 0.03 + 0.06 * 0.18, -0.33, 0.39); f.rotation.z = 0.18; g.add(f); }
    return g;
  },
  // back (origin = between the shoulder blades)
  cape() {
    const g = new THREE.Group(), capeM = clay(0xe8304a, 0.6); capeM.side = THREE.DoubleSide;
    const geo = new THREE.PlaneGeometry(1, 1, 12, 12), cp = geo.getAttribute('position');
    for (let i = 0; i < cp.count; i++) {
      const u = cp.getX(i), v = cp.getY(i) + 0.5, w = 0.82 + (0.4 - 0.82) * v;
      cp.setXYZ(i, u * w, -0.66 * (1 - v), -(0.4 + (0.06 - 0.4) * v) + 0.32 * (u * 2) ** 2 * (0.35 + (0.15 - 0.35) * v) * w);
    }
    geo.computeVertexNormals();
    const cape = new THREE.Mesh(geo, capeM); cape.name = 'cloth';
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.34, 4, 10), gold()); bar.rotation.z = Math.PI / 2; bar.position.z = -0.06;
    g.add(cape, bar);
    return g;
  },
  wings() {
    // two small white angel wings, each a fan of rounded feathers, tips lilac
    const g = new THREE.Group(), w = clay(0xffffff, 0.7), tip = clay(0xe3d6ff, 0.7);
    for (const s of [-1, 1]) {
      const wing = new THREE.Group(); wing.position.set(s * 0.1, 0, 0); wing.rotation.set(0, s * 0.45, s * 0.25); wing.name = s < 0 ? 'wingL' : 'wingR';
      for (let k = 0; k < 5; k++) {
        const len = 0.36 - k * 0.045, a = 0.25 - k * 0.32;
        const f = E(len / 2, 0.06, 0.03, k === 4 ? tip : w, 16);
        f.position.set(s * (Math.cos(a) * len / 2 + 0.04), Math.sin(a) * len / 2 + 0.05, -k * 0.008);
        f.rotation.z = s * a; wing.add(f);
      }
      g.add(wing);
    }
    return g;
  },
  // feet: the shoes turn gold (tata.js swaps the material); this is only the shop picture
  goldshoes() {
    const geo = new THREE.SphereGeometry(1, 40, 28), p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < -0.45) y = -0.45 - (y + 0.45) * 0.2;
      p.setXYZ(i, x * 0.85 * (z > 0 ? 1 + 0.1 * z : 1), y * 0.62, z * 1.15);
    }
    geo.computeVertexNormals();
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xffc23a, roughness: 0.25, metalness: 0.55, clearcoat: 1 })));
    const sole = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), clay(0xfff4dc)); sole.scale.set(0.9, 0.12, 1.22); sole.position.y = -0.3; g.add(sole);
    g.scale.setScalar(0.25);
    return g;
  },
};
/** a fresh model of an item (its own frame) */
export function buildItem(id) {
  const g = B[id](); g.name = id;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
/** how the shop picture is framed: yaw / pitch for the render */
export const ICON_VIEW = {
  gradcap: { yaw: 0.3, pitch: 0.35 }, bow: { yaw: -0.2, pitch: 0.1 }, party: { yaw: 0.2, pitch: 0.15 }, flowers: { yaw: 0, pitch: 0.75 },
  bunny: { yaw: -0.25, pitch: 0.05 }, crown: { yaw: 0.2, pitch: 0.35 }, roundglasses: { yaw: -0.2, pitch: 0.05 }, starglasses: { yaw: -0.2, pitch: 0.05 },
  shades: { yaw: -0.25, pitch: 0.05 }, bowtie: { yaw: -0.25, pitch: 0.1 }, scarf: { yaw: 0.25, pitch: 0.45 }, cape: { yaw: Math.PI - 0.5, pitch: 0.1 },
  wings: { yaw: Math.PI - 0.35, pitch: 0.1 }, goldshoes: { yaw: -0.75, pitch: 0.4 },
};
