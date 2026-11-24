// Things Tata can wear (user 2026-11-23: "캐릭터 꾸미는게 너무 부실해 — 파닉스 매치 참고해서 보완"): Phonics Match's dress room
// as the model — one item per body slot, bought with coins, tapped to wear / take off. Each item is a small clay model
// built here once and used twice: worn on Tata (tata.js places it) and rendered as the shop card's picture (icons3d.js).
// 2026-11-24 (user: "리본 같은 거 파닉스 매치처럼 디테일하게", gold shoes "신발인지도 모르겠어 — 진짜 운동화로"): every item
// rebuilt after Match's item art (Phonics-Match/public/art/item_*.webp) — organic parts are ONE smooth SDF lump each
// (sdf.js; stacked balls showed creases), polka dots are little discs laid onto that surface, and the shoes are sneakers.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SDF, mesh as sdfMesh } from './sdf.js';

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
  { id: 'goldshoes', slot: 'feet', name: 'Sneakers', price: 90 },   // (id kept: saves hold the owned ids)
  { id: 'wings', slot: 'back', name: 'Wings', price: 100 },
  { id: 'crown', slot: 'head', name: 'Crown', price: 120 },
];
export const itemById = id => ITEMS.find(i => i.id === id);
/** head items that sit on the crown of the head hide Tata's tuft */
export const HIDES_TUFT = new Set(['gradcap', 'party']);

// ---------------------------------------------------------------- small math + caches
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));
const { smin, smax } = SDF;
const TAU = Math.PI * 2;
// meshed shapes are built once and shared by the shop picture and the worn copy (and both shoes)
const geoCache = new Map();
const memo = (k, fn) => { if (!geoCache.has(k)) geoCache.set(k, fn()); return geoCache.get(k); };

/** 2D distance to a polygon [[x, y], …] (negative inside) */
function sdPoly(px, py, P) {
  let d = (px - P[0][0]) ** 2 + (py - P[0][1]) ** 2, s = 1;
  for (let i = 0, j = P.length - 1; i < P.length; j = i, i++) {
    const ex = P[j][0] - P[i][0], ey = P[j][1] - P[i][1], wx = px - P[i][0], wy = py - P[i][1];
    const h = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), bx = wx - ex * h, by = wy - ey * h;
    d = Math.min(d, bx * bx + by * by);
    const c1 = py >= P[i][1], c2 = py < P[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
/** a puffy slab over the 2D shape d2 < 0: t thick (each side) in the middle, its rim a w × t half-ellipse */
function pillow(d2, z, w, t) {
  const px = d2 + w;
  if (px <= 0) return Math.abs(z) - t;
  const ax = px / w, az = z / t, k0 = Math.hypot(ax, az), k1 = Math.hypot(ax / w, az / t);
  return k0 * (k0 - 1) / k1;
}
/** distance from (y, z) to a polyline [[y, z], …] */
function distLine(y, z, P) {
  let d = 1e9;
  for (let i = 1; i < P.length; i++) {
    const ay = P[i - 1][0], az = P[i - 1][1], by = P[i][0] - ay, bz = P[i][1] - az;
    const h = clamp(((y - ay) * by + (z - az) * bz) / (by * by + bz * bz), 0, 1);
    d = Math.min(d, Math.hypot(y - ay - by * h, z - az - bz * h));
  }
  return d;
}
const _g = [0, 0, 0];
function gradAt(f, x, y, z, e = 0.001) {
  const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1; _g[0] = gx / l; _g[1] = gy / l; _g[2] = gz / l; return _g;
}
/** march from p along dir to the surface of f; the hit [x, y, z] or null */
function hitSurf(f, p, dir, maxT = 1.5) {
  for (let t = 0, i = 0; i < 300 && t < maxT; i++) {
    const x = p[0] + dir[0] * t, y = p[1] + dir[1] * t, z = p[2] + dir[2] * t, d = f(x, y, z);
    if (d < 2e-4) return [x, y, z];
    t += Math.max(d * 0.6, 2e-4);
  }
  return null;
}
/** an SDF lump as a mesh geometry (cached by key); opts.color = vertex colours */
const lump = (key, f, box, h, opts) => memo(key, () => sdfMesh(f, box, h, opts));
/** painted polka dots: little discs laid onto the surface of f at pts (one geometry) */
function dotDecals(f, pts, r, seg = 12, lift = 0.0012) {
  const P = [], N = [], I = [], t = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  const put = (x, y, z) => {
    for (let k = 0; k < 3; k++) { const d = f(x, y, z), g = gradAt(f, x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d; }
    const g = gradAt(f, x, y, z);
    P.push(x + g[0] * lift, y + g[1] * lift, z + g[2] * lift); N.push(g[0], g[1], g[2]);
  };
  for (const [x, y, z] of pts) {
    const g = gradAt(f, x, y, z); n.set(g[0], g[1], g[2]);
    t.set(0, 1, 0); if (Math.abs(n.y) > 0.9) t.set(1, 0, 0);
    t.cross(n).normalize(); b.crossVectors(n, t);
    const base = P.length / 3;
    put(x, y, z);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * TAU, c = Math.cos(a) * r, s = Math.sin(a) * r;
      put(x + t.x * c + b.x * s, y + t.y * c + b.y * s, z + t.z * c + b.z * s);
    }
    for (let k = 0; k < seg; k++) I.push(base, base + 1 + k, base + 1 + ((k + 1) % seg));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setIndex(I); geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
/** dot sites: a staggered (polka) grid in x-y, symmetric about x = 0, dropped onto the front (+z) and back faces of f */
function dotGrid(f, box, step, { skip, minN = 0.3, sides = [1, -1], oy = 0 } = {}) {
  const [x0, y0, z0, x1, y1, z1] = box, out = [], rowH = step * 0.866;
  for (let j = Math.floor((y0 - oy) / rowH); oy + j * rowH <= y1; j++) {
    const y = oy + j * rowH, off = (Math.abs(j) % 2) * 0.5;
    for (let i = Math.floor(x0 / step) - 1; (i + off) * step <= x1; i++) {
      const x = (i + off) * step;
      if (x < x0) continue;
      for (const s of sides) {
        const h = hitSurf(f, [x, y, s > 0 ? z1 : z0], [0, 0, -s], z1 - z0);
        if (!h || (skip && skip(h[0], h[1], h[2]))) continue;
        if (gradAt(f, h[0], h[1], h[2])[2] * s < minN) continue;
        out.push(h);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- materials (soft clay / candy gloss)
const clay = (c, rough = 0.55) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, specularIntensity: 0.4 });
const soft = (c, rough = 0.42) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, specularIntensity: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.45 });
const gloss = (c, extra = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, ...extra });
const gold = () => new THREE.MeshPhysicalMaterial({ color: 0xffc83a, roughness: 0.24, metalness: 0.6, clearcoat: 1 });
const vcol = (rough = 0.45) => { const m = soft(0xffffff, rough); m.vertexColors = true; return m; };
/** a decal's material: drawn over the surface it lies on */
const onTop = m => { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; return m; };
const shineM = (op = 0.8) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false });
const E = (rx, ry, rz, m, seg = 24) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), m); o.scale.set(rx, ry, rz); return o; };
const lin = hex => new THREE.Color(hex);   // (linear components, for vertex colours)
const texCache = {};
function canvasTex(key, S, draw) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (texCache[key] = t);
}
/** staggered polka dots (n × n per tile, n even so it tiles) */
const dotsTex = (base, dot, n = 4) => canvasTex(`dots${base}${dot}${n}`, 256, (g, S) => {
  g.fillStyle = base; g.fillRect(0, 0, S, S); g.fillStyle = dot;
  for (let y = 0; y < n; y++) for (let x = -1; x <= n; x++) {
    g.beginPath(); g.arc((x + (y % 2) * 0.5 + 0.25) * S / n, (y + 0.5) * S / n, S / n * 0.2, 0, TAU); g.fill();
  }
});
/** stripes: bands of cols along x (vertical stripes) or y (horizontal) */
const stripeTex = (cols, horizontal = true) => canvasTex(`str${cols.join()}${horizontal}`, 128, (g, S) => {
  const n = cols.length;
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i]; horizontal ? g.fillRect(0, i * S / n, S, S / n + 1) : g.fillRect(i * S / n, 0, S / n + 1, S); }
});
/** a knit (rows of little V stitches) as a bump map */
const knitTex = () => canvasTex('knit', 64, g => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
    g.fillStyle = '#c0c0c0'; g.beginPath(); g.ellipse(x + 2.4, y + 4, 1.8, 3.4, -0.5, 0, TAU); g.ellipse(x + 5.6, y + 4, 1.8, 3.4, 0.5, 0, TAU); g.fill();
  }
});
/** party-hat stripes that spiral round a lathe (u = round, v = up): 3 turns, pink · blue · yellow · blue */
const spiralTex = () => canvasTex('spiral', 256, (g, S) => {
  const im = g.createImageData(S, S), C = [[255, 140, 182], [116, 196, 255], [255, 216, 84], [116, 196, 255]];
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const u = (px + 0.25 + sx * 0.5) / S, v = 1 - (py + 0.25 + sy * 0.5) / S, ph = (3 * u + 2.2 * v) * 4, c = C[((Math.floor(ph) % 4) + 4) % 4];
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    const k = (py * S + px) * 4; im.data[k] = acc[0] / 4; im.data[k + 1] = acc[1] / 4; im.data[k + 2] = acc[2] / 4; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
});
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
function roundRect(w, h, r, topW = w) {   // (a trapezoid when topW ≠ w: the top edge topW wide)
  const s = new THREE.Shape(), a = w / 2, t = topW / 2, b = h / 2;
  s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.quadraticCurveTo(a, -b, a, -b + r);
  s.lineTo(t, b - r); s.quadraticCurveTo(t, b, t - r, b); s.lineTo(-t + r, b);
  s.quadraticCurveTo(-t, b, -t, b - r); s.lineTo(-a, -b + r); s.quadraticCurveTo(-a, -b, -a + r, -b);
  return s;
}
const ext = (shape, depth, bevel, curveSegments = 18) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments });
const tube = (pts, r, m, closed = false, seg = 24) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, r, 8, closed), m);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- the face frame (for the glasses' temples)
// mirrors tata.js: the head is an ellipsoid HA × HB × HC round the head centre and the glasses sit at onHead(g, 0, 0.075, 0.14)
const HEAD = [0.549, 0.442, 0.455], FACE_Y = 0.075, FACE_LIFT = 0.14;
const headZ = (x, y) => HEAD[2] * Math.sqrt(Math.max(0, 1 - (x / HEAD[0]) ** 2 - (y / HEAD[1]) ** 2));
const headToFace = (() => {
  const [, b, c] = HEAD, u = Math.sqrt(1 - (FACE_Y / b) ** 2), dzdy = -c * FACE_Y / (b * b * u);
  const n = V(0, -dzdy, 1).normalize(), pos = V(0, FACE_Y, c * u).addScaledVector(n, FACE_LIFT);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n).invert();
  return (x, y, z) => V(x, y, z).sub(pos).applyQuaternion(q);
})();
/** glasses arms: from the hinges at (±xh, yh, zh) back to the side of the head, with a little hinge block */
function temples(g, mat, xh, yh, zh, r = 0.013) {
  for (const s of [-1, 1]) {
    const a = V(s * xh, yh, zh), hx = 0.455, hy = 0.06, e = headToFace(s * hx, hy, headZ(hx, hy) - 0.012);   // (level with the hinge)
    const m1 = V(s * (xh + 0.025), yh + 0.005, zh - 0.06), m2 = a.clone().lerp(e, 0.62); m2.x += s * 0.018;
    g.add(tube([a, m1, m2, e], r, mat, false, 16));
    const hinge = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.04, 0.05, 2, 0.014), mat); hinge.position.set(s * (xh - 0.006), yh, zh + 0.006); g.add(hinge);
  }
}
/** a lens shine: a soft curved streak and a dot, upper left */
function lensShine(e, R, z, op = 0.75) {
  const arc = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, R * 0.07, 6, 18, 1.05), shineM(op)); arc.rotation.z = 1.75; arc.scale.z = 0.3; arc.position.z = z; e.add(arc);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(R * 0.09, 12), shineM(op)); dot.position.set(-R * 0.18, R * 0.62, z); e.add(dot);
}

// ---------------------------------------------------------------- the ribbon (Match's item_bow): two puffy loops with folds
// running into a round knot, two tails with a V-notch, pink with cream polka dots. Knot at the origin, front +z.
const RIB_TAIL = [[0.0, -0.005], [0.06, -0.02], [0.18, -0.245], [0.122, -0.222], [0.092, -0.282]];
function ribbonF(x, y, z) {
  const ax = Math.abs(x);
  if (ax > 0.33 || y > 0.18 || y < -0.33 || Math.abs(z) > 0.1) return 0.03;
  // loop: fat at the outer end, pinched at the knot; two soft folds fanning out from the knot
  const lo = SDF.roundCone(ax, y, 0, 0.03, 0.004, 0, 0.172, 0.03, 0, 0.042, 0.106);
  let d = pillow(lo, z, 0.08, 0.026 + 0.034 * sstep(0.02, 0.18, ax));
  const th = Math.atan2(y - 0.004, ax - 0.03), rho = Math.hypot(ax - 0.03, y - 0.004);
  d += 0.009 * sstep(0.035, 0.08, rho) * (1 - sstep(0.15, 0.26, rho)) * (bump(th, 0.42, 0.1) + bump(th, -0.26, 0.1));
  // tails (behind the knot), the ends curling a little forward
  const tl = sdPoly(ax, y, RIB_TAIL) - 0.008, zc = -0.024 + 0.02 * sstep(-0.06, -0.28, y);
  return Math.min(d, pillow(tl, z - zc, 0.026, 0.014));
}
function ribbonKnotF(x, y, z) {
  let d = SDF.roundBox(x, y, z, 0, 0.004, 0.024, 0.052, 0.064, 0.042, 0.04);
  return d + 0.004 * sstep(0.0, 0.04, z) * (bump(x, -0.02, 0.007) + bump(x, 0.02, 0.007));   // soft gathers
}
function ribbon(small = false, pink = 0xff8db5, knotC = 0xf7779f, dotC = 0xfff3e2) {   // small: a coarser mesh (the sneakers' bow)
  const g = new THREE.Group(), k = small ? 'S' : '';
  const box = [-0.31, -0.31, -0.07, 0.31, 0.16, 0.075];
  g.add(new THREE.Mesh(lump('ribbon' + k, ribbonF, box, small ? 0.018 : 0.0095), soft(pink)));
  g.add(new THREE.Mesh(lump('ribbonKnot' + k, ribbonKnotF, [-0.065, -0.075, -0.035, 0.065, 0.085, 0.085], small ? 0.013 : 0.0065), soft(knotC)));
  const dots = memo('ribbonDots', () => dotDecals(ribbonF,
    dotGrid(ribbonF, box, 0.05, { oy: 0.03, skip: (x, y) => Math.abs(x) < 0.058 && y > -0.075 && y < 0.085 }), 0.0118));
  g.add(new THREE.Mesh(dots, onTop(soft(dotC))));
  return g;
}

// ---------------------------------------------------------------- the bow tie (Match's item_bowtie): red, cream dots, pinched knot
const BT_WING = [[0.035, 0.03], [0.19, 0.086], [0.207, 0], [0.19, -0.086], [0.035, -0.03]];
function bowtieF(x, y, z) {
  const ax = Math.abs(x);
  if (ax > 0.26 || Math.abs(y) > 0.14 || Math.abs(z) > 0.08) return 0.03;
  const d2 = sdPoly(ax, y, BT_WING) - 0.02;
  let d = pillow(d2, z, 0.06, 0.022 + 0.026 * sstep(0.03, 0.17, ax));
  const th = Math.atan2(y, ax - 0.02), rho = Math.hypot(ax - 0.02, y);
  return d + 0.008 * sstep(0.03, 0.07, rho) * (1 - sstep(0.15, 0.24, rho)) * (bump(th, 0.34, 0.1) + bump(th, -0.34, 0.1));
}
function bowtieKnotF(x, y, z) {
  return SDF.roundBox(x, y, z, 0, 0, 0.014, 0.046, 0.058, 0.04, 0.03) + 0.0035 * sstep(0, 0.04, z) * (bump(y, -0.022, 0.007) + bump(y, 0.022, 0.007));
}

// ---------------------------------------------------------------- party hat pieces
function brimF(x, y, z) {   // a fluffy cloud ring (13 puffs on a soft core)
  const R = 0.212, y0 = 0.02, N = 13, rho = Math.hypot(x, z);
  if (Math.abs(rho - R) > 0.09 || Math.abs(y - y0) > 0.09) return 0.04;
  const a = Math.atan2(z, x), k = Math.round(a / (TAU / N));
  let d = Math.hypot(rho - R, y - y0) - 0.033;
  for (let j = k - 1; j <= k + 1; j++) {
    const aj = j * TAU / N, v = (((j % N) + N) % N) % 3;
    d = smin(d, SDF.sphere(x, y, z, Math.cos(aj) * R, y0 + (v - 1) * 0.004, Math.sin(aj) * R, 0.044 + v * 0.003), 0.026);
  }
  return d;
}
const pompomF = (x, y, z) => SDF.sphere(x, y, z, 0, 0, 0, 0.06) + 0.0045 * Math.sin(57 * x + 1) * Math.sin(57 * y + 2) * Math.sin(57 * z + 3) + 0.0025 * Math.sin(101 * x + 2) * Math.sin(97 * z);

// ---------------------------------------------------------------- crown: one gold lump — a band, five points with ball tips
const CR = 0.215, CR_TOP = 0.235;
// one point's outline in (arc length round the band, height): scooped sides up to the tip
const CR_PT = (() => {
  const L = CR * TAU / 5, P = [[-L / 2, 0.0], [-L / 2, 0.07]];
  for (let i = 1; i <= 8; i++) { const t = i / 8, s = -L / 2 + t * L / 2; P.push([s, 0.07 + (CR_TOP - 0.07) * Math.pow(t, 1.6)]); }
  for (let i = 7; i >= 0; i--) { const t = i / 8, s = L / 2 - t * L / 2; P.push([s, 0.07 + (CR_TOP - 0.07) * Math.pow(t, 1.6)]); }
  P.push([L / 2, 0.0]); return P;
})();
function crownF(x, y, z) {
  const rho = Math.hypot(x, z), q = rho - CR;
  if (Math.abs(q) > 0.07 || y < -0.07 || y > 0.31) return 0.03;
  const a = Math.atan2(x, z), sec = TAU / 5, k = Math.round(a / sec);   // point k's middle at angle k·sec (one at the front)
  const band = SDF.extrude(Math.abs(q) - 0.024, y, -0.04, 0.062, 0.017);
  // the point: its outline as a curved slab round the band, edges rounded
  const r = 0.011, wx = sdPoly(CR * (a - k * sec), y, CR_PT) + r, wy = Math.abs(q) - 0.015 + r;
  const wall = Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) + Math.min(Math.max(wx, wy), 0) - r;
  let d = smin(band, wall, 0.02);
  d = smin(d, Math.hypot(q, y - 0.085) - 0.01, 0.01);                                          // a rim along the band's top
  const ak = k * sec;
  return smin(d, SDF.sphere(x, y, z, Math.sin(ak) * CR, CR_TOP + 0.022, Math.cos(ak) * CR, 0.03), 0.014);
}

// ---------------------------------------------------------------- grad cap tassel
function tasselF(x, y, z) {
  let d = SDF.roundCone(x, y, z, 0, -0.012, 0, 0, -0.108, 0, 0.017, 0.031);
  return d + 0.004 * (0.5 + 0.5 * Math.cos(Math.atan2(z, x) * 14)) * sstep(-0.025, -0.05, y);
}

// ---------------------------------------------------------------- flower crown: a five-petal flower (unit size, faces +z)
function flowerF(x, y, z) {
  const rho = Math.hypot(x, y), th = Math.atan2(y, x);
  if (rho > 1.15) return rho - 1.1;
  const rp = 0.5 + 0.5 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.7);
  let d = pillow((rho - rp) * 0.75, z - 0.2 * rho * rho, 0.16, 0.1 - 0.03 * rho);
  const m = th / (TAU / 5), fm = m - Math.floor(m);
  return d + 0.06 * bump(Math.abs(fm - 0.5) * (TAU / 5) * rho, 0, 0.055) * sstep(0.2, 0.5, rho);   // the line between two petals
}
function leafGeo() {
  return memo('leaf', () => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.035, 0.03, 0.075, 0); s.quadraticCurveTo(0.035, -0.03, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 7 });
    g.translate(0, 0, -0.0015); return g;
  });
}

// ---------------------------------------------------------------- bunny ear (+y up the ear, the hollow facing +z)
const earScoop = (x, y, zz) => SDF.ellipsoid(x, y, zz, 0, 0.29, 0.044, 0.056, 0.2, 0.03);
function earF(x, y, z) {
  const zz = z + 0.07 * (y / 0.5) ** 2;   // the tip leans back
  const outer = smin(SDF.ellipsoid(x, y, zz, 0, 0.275, 0, 0.088, 0.245, 0.042), SDF.capsule(x, y, zz, 0, -0.05, 0, 0, 0.1, 0, 0.04), 0.06);
  return smax(outer, -earScoop(x, y, zz), 0.014);
}

// ---------------------------------------------------------------- wings: rounded feathers, white with lilac tips
/** a plump wing (x out from the back, y up, z thickness): shoulder bar + body + four feather lobes, smoothly joined */
function wingF(x, y, z) {
  let d = SDF.capsule(x, y, z, -0.02, 0.09, 0, 0.33, 0.2, 0, 0.078);                       // the round leading edge
  d = SDF.smin(d, SDF.ellipsoid(x, y, z, 0.16, 0.05, 0, 0.2, 0.15, 0.075), 0.05);           // the full body
  const lobes = [[0.04, 0.05, -1.55, 0.2, 0.06], [0.13, 0.08, -1.35, 0.25, 0.062], [0.22, 0.12, -1.12, 0.28, 0.06], [0.31, 0.16, -0.85, 0.26, 0.055]];
  for (const [ax, ay, ang, L, r] of lobes) d = SDF.smin(d, SDF.capsule(x, y, z, ax, ay, 0, ax + Math.cos(ang) * L, ay + Math.sin(ang) * L, 0, r), 0.035);
  return d;
}
function featherGeo(L, W, tint) {
  return memo(`feather${L}_${W}_${tint}`, () => {
    const s = new THREE.Shape(), r = W / 2;
    s.moveTo(0, -r * 0.7); s.quadraticCurveTo(L * 0.45, -r * 1.06, L - r, -r);
    s.absarc(L - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    s.quadraticCurveTo(L * 0.45, r * 1.06, 0, r * 0.7); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.008, bevelSegments: 2, curveSegments: 7 });
    geo.translate(0, 0, -0.004);
    const p = geo.getAttribute('position'), col = new Float32Array(p.count * 3), w = lin(0xfbf8ff), li = lin(0xbfa3ff), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(w).lerp(li, tint * sstep(0.35, 1, p.getX(i) / L)); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  });
}

// ---------------------------------------------------------------- sneakers (Match's item_shoes): blue high-tops, cream sole and
// toe cap, laces through eyelets, a tongue, a padded ankle collar and a little polka-dot bow. Frame = the ankle: the leg axis
// at the origin, toe +z, the ground at y = SN_G.
const SN_G = -0.155;
const snSpring = z => 0.03 * sstep(0.16, 0.37, z) ** 2;   // the toe turns up a little
function snFoot(x, z) {   // footprint: a squarish oval, wider at the toe
  const w = 0.163 + 0.04 * sstep(-0.12, 0.2, z), L = 0.272, p = 2.6;
  return (Math.pow(Math.pow(Math.abs(x) / w, p) + Math.pow(Math.abs(z - 0.064) / L, p), 1 / p) - 1) * 0.17;
}
const snSoleF = (x, y, z) => SDF.extrude(snFoot(x, z) - 0.006, y - snSpring(z), SN_G, SN_G + 0.056, 0.02);
function snUpperF(x, y, z) {
  if (Math.abs(x) > 0.25 || y > 0.16 || z > 0.38 || z < -0.26) return 0.03;
  const yy = y - snSpring(z);
  const toe = SDF.ellipsoid(x, yy, z, 0, SN_G + 0.06, 0.16, 0.176, 0.112, 0.165);
  const mid = SDF.ellipsoid(x, yy, z, 0, SN_G + 0.06, -0.005, 0.174, 0.165, 0.21);
  const heel = SDF.ellipsoid(x, yy, z, 0, SN_G + 0.075, -0.095, 0.156, 0.15, 0.1);
  // the ankle shaft narrows upward; its top (and the padded collar) slopes, higher at the heel
  const rr = Math.hypot(x, (z + 0.03) * 1.04), yt = y + 0.12 * (z + 0.03);
  const shaft = SDF.extrude(rr - 0.166 + 0.016 * sstep(-0.06, 0.06, yt), yt, SN_G + 0.04, 0.07, 0.026);
  let d = smin(smin(toe, mid, 0.06), smin(heel, shaft, 0.05), 0.05);
  d = Math.max(d, SN_G + 0.035 - yy);                               // ends inside the sole
  d = smax(d, -Math.max(rr - 0.116, -(yt + 0.02)), 0.012);          // the opening for the leg (Tata's leg is 0.112 round)
  return smin(d, Math.hypot(rr - 0.138, yt - 0.072) - 0.027, 0.016); // padded collar
}
function snCapF(x, y, z) {
  const yy = y - snSpring(z);
  const e = SDF.ellipsoid(x, yy, z, 0, SN_G + 0.06, 0.16, 0.184, 0.12, 0.173);
  return smax(smax(e, 0.212 - z + 0.42 * Math.max(0, yy - SN_G - 0.06), 0.012), SN_G + 0.035 - yy, 0.005);
}
let SN_TONGUE = null;   // the tongue's centre line [[y, z], …], found on the upper's front (sneaker())
// a soft flap: a rounded outline (front view) cut from a thin slab that follows the centre line
const snTongueF = (x, y, z) => smax(SDF.rrect(x, y - 0.05, 0.05, 0.085, 0.04), distLine(y, z, SN_TONGUE) - 0.011, 0.008);

// ---------------------------------------------------------------- builders (units = Tata's: her head is 1.1 wide)
// Each returns a Group in its own frame; tata.js says where it goes.
const B = {
  // head (origin = where it touches the head top)
  gradcap() {
    const g = new THREE.Group(), navy = soft(0x2c2d66, 0.55), au = gold();
    // cap: a soft skull cap with a rolled lower rim, the board on top
    const prof = [[0.27, -0.012], [0.292, -0.004], [0.296, 0.012], [0.286, 0.03], [0.279, 0.08], [0.27, 0.13], [0.2, 0.145], [0, 0.145]].map(([r, y]) => new THREE.Vector2(r, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), navy));
    const board = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.055, 0.76, 4, 0.024), navy); board.position.y = 0.168; board.rotation.y = Math.PI / 4; g.add(board);
    const btn = E(0.042, 0.022, 0.042, navy, 20); btn.position.y = 0.197; g.add(btn);
    // golden cord from the button over the board's edge, hanging down to the tassel (on the right)
    const cord = [V(0, 0.205, 0), V(0.2, 0.2, 0.05), V(0.38, 0.199, 0.075), V(0.455, 0.193, 0.08), V(0.468, 0.15, 0.08), V(0.468, 0.07, 0.08)];
    g.add(tube(cord, 0.011, au, false, 32));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.026, 16), au); cap.position.set(0.468, 0.062, 0.08); g.add(cap);
    const ts = new THREE.Mesh(lump('tassel', tasselF, [-0.045, -0.15, -0.045, 0.045, 0.012, 0.045], 0.004),
      new THREE.MeshPhysicalMaterial({ color: 0xf6a623, roughness: 0.45, metalness: 0.25, clearcoat: 0.4 }));
    ts.position.set(0.468, 0.06, 0.08); g.add(ts);
    return g;
  },
  bow() { return ribbon(); },
  party() {
    const g = new THREE.Group(), m = soft(0xffffff, 0.45); m.map = spiralTex();
    const prof = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(Math.max(0.004, 0.205 * (1 - t) * (1 + 0.1 * Math.sin(Math.PI * t))), 0.02 + 0.48 * t)); }
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), m));
    g.add(new THREE.Mesh(lump('brim', brimF, [-0.29, -0.05, -0.29, 0.29, 0.09, 0.29], 0.011), clay(0xfff6e6, 0.85)));
    const pom = new THREE.Mesh(lump('pompom', pompomF, [-0.075, -0.075, -0.075, 0.075, 0.075, 0.075], 0.0062), clay(0xff74a6, 0.8)); pom.position.y = 0.52; g.add(pom);
    return g;
  },
  flowers() {
    // a ring of five-petal flowers round the top of the head (a tiara, above the brows), big and small in turn, little leaves
    // between. Laid ON the head: tata.js wears it at head (0, 0.27, -0.01) turned -0.12 round x, so the spots are worked out on
    // the head ellipsoid and brought into this frame.
    const g = new THREE.Group(), N = 11, X = V(1, 0, 0);
    const onRing = (a, lift) => {
      const y = 0.357 + 0.028 * Math.sin(a), k = Math.sqrt(1 - (y / HEAD[1]) ** 2), x = Math.cos(a) * HEAD[0] * k, z = Math.sin(a) * HEAD[2] * k;
      const n = V(x / HEAD[0] ** 2, y / HEAD[1] ** 2, z / HEAD[2] ** 2).normalize();
      return [V(x, y, z).addScaledVector(n, lift).sub(V(0, 0.27, -0.01)).applyAxisAngle(X, 0.12), n.applyAxisAngle(X, 0.12)];
    };
    const cols = [0xff8db8, 0xb49bff, 0xffa95a, 0x78c4ff, 0xff7e9e, 0xc8a2ff, 0xffb547, 0x86d3ff, 0xff9bc6, 0xa88cff, 0xff9f6b];
    const pg = lump('flower', flowerF, [-1.1, -1.1, -0.18, 1.1, 1.1, 0.42], 0.1), mid = soft(0xffcf3d, 0.5), leafM = soft(0x5dbb5a, 0.5);
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 + (i / N) * TAU, sc = i % 2 ? 0.06 : 0.076, [p, n] = onRing(a, 0.011);
      const f = new THREE.Group(); f.position.copy(p); f.lookAt(p.clone().add(n)); g.add(f);
      const pm = new THREE.Mesh(pg, soft(cols[i], 0.5)); pm.scale.setScalar(sc); pm.rotation.z = i * 0.9; f.add(pm);
      const c = E(0.3 * sc, 0.3 * sc, 0.2 * sc, mid, 16); c.position.z = 0.11 * sc; f.add(c);
      // two leaves where this flower meets the next, along the ring
      const [lp, ln] = onRing(a + Math.PI / N, 0.006), l = new THREE.Group(); l.position.copy(lp); l.lookAt(lp.clone().add(ln)); g.add(l);
      for (const s of [-1, 1]) { const lf = new THREE.Mesh(leafGeo(), leafM); lf.rotation.z = s > 0 ? 0.3 : Math.PI - 0.3; lf.position.x = s * 0.006; l.add(lf); }
    }
    const vine = []; for (let i = 0; i < 48; i++) vine.push(onRing(Math.PI / 2 + (i / 48) * TAU, 0.004)[0]);
    g.add(tube(vine, 0.01, leafM, true, 96));
    return g;
  },
  bunny() {
    // a pink headband over the head with two tall ears (cream, pink inside); origin = the head centre's top
    const g = new THREE.Group(), [ha, hb] = HEAD, band = [];
    // the band sits a little forward of the tuft's root (it ran through it, and its middle vanished — user 2026-11-24
    // "머리끈이 분홍색 가운데가 끊겼는데 이어줘"), hugging the head's cross-section there (z = 0.15 from the head centre)
    const bz = 0.13, k = Math.sqrt(1 - ((bz + 0.02) / HEAD[2]) ** 2);
    for (let i = 0; i <= 28; i++) { const t = Math.PI * (0.03 + 0.94 * i / 28); band.push(V(Math.cos(t) * (ha * k + 0.018), Math.sin(t) * (hb * k + 0.018) - 0.455, bz)); }
    g.add(tube(band, 0.036, soft(0xff86b4, 0.4), false, 64));
    for (const p of [band[0], band[28]]) { const c = E(0.036, 0.036, 0.036, soft(0xff86b4, 0.4), 16); c.position.copy(p); g.add(c); }
    const cream = lin(0xfff4e6), pink = lin(0xffa0c0);
    const eg = lump('ear', earF, [-0.11, -0.1, -0.12, 0.11, 0.54, 0.08], 0.0105, {
      color: (x, y, z, out) => { const k = sstep(0.006, 0.0005, earScoop(x, y, z + 0.07 * (y / 0.5) ** 2)), c = cream.clone().lerp(pink, k); out[0] = c.r; out[1] = c.g; out[2] = c.b; },
    });
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(eg, vcol(0.55)); ear.position.set(s * 0.29, -0.075, 0.005); ear.rotation.set(0, s * 0.12, -s * 0.3);   // clear of Tata's tuft
      g.add(ear);
    }
    return g;
  },
  crown() {
    const g = new THREE.Group(), au = gold();
    g.add(new THREE.Mesh(lump('crown', crownF, [-0.27, -0.06, -0.27, 0.27, 0.3, 0.27], 0.0095), au));
    const gems = [0xff3f79, 0x34c759, 0x3d7bff, 0xff3f79, 0x3d7bff];
    for (let k = 0; k < 5; k++) {
      const a = k * TAU / 5, j = new THREE.Group(); j.position.set(Math.sin(a) * (CR + 0.024), 0.012, Math.cos(a) * (CR + 0.024)); j.rotation.y = a; g.add(j);
      const gem = E(0.026, 0.026, 0.014, gloss(gems[k], { roughness: 0.12 }), 20); j.add(gem);
      j.add(new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.006, 8, 24), au));
    }
    return g;
  },
  // face (origin = between the eyes; lenses at x ±0.2, turned a little round the face)
  roundglasses() {
    const g = new THREE.Group(), fm = soft(0x8b5634, 0.4), lens = gloss(0xfff2f7, { transparent: true, opacity: 0.3, depthWrite: false });
    const ring = new THREE.Shape(); ring.absarc(0, 0, 0.168, 0, TAU, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.128, 0, TAU, true); ring.holes.push(hole);
    const rg = ext(ring, 0.012, 0.011, 40);
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0, -0.03); e.rotation.y = s * 0.3; g.add(e);
      e.add(new THREE.Mesh(rg, fm));
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 40), lens); l.position.z = 0.006; e.add(l);
      lensShine(e, 0.13, 0.009);
    }
    g.add(tube([V(-0.055, 0.035, 0.018), V(-0.03, 0.06, 0.03), V(0.03, 0.06, 0.03), V(0.055, 0.035, 0.018)], 0.016, fm, false, 16));
    temples(g, fm, 0.36, 0.01, -0.085);
    return g;
  },
  starglasses() {
    const g = new THREE.Group(), fm = gloss(0xff6fb5, { roughness: 0.3 }), lens = gloss(0xc9b0ff, { transparent: true, opacity: 0.82 });
    const outer = starShape(1, 0.56, 0.3, 0.16), hole = starShape(0.68, 0.36, 0.3, 0.14);
    const ring = new THREE.Shape(outer.getPoints(8)); ring.holes.push(new THREE.Path(hole.getPoints(8).reverse()));
    const rg = ext(ring, 0.09, 0.075, 8), S = 0.19;
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0.01, -0.03); e.rotation.y = s * 0.3; g.add(e);
      const f = new THREE.Mesh(rg, fm); f.scale.setScalar(S); f.position.z = -0.008; e.add(f);
      const l = new THREE.Mesh(new THREE.ShapeGeometry(hole, 14), lens); l.scale.setScalar(S); l.position.z = 0.0; e.add(l);
      lensShine(e, 0.1, 0.003, 0.7);
    }
    g.add(tube([V(-0.06, 0.04, 0.012), V(-0.03, 0.062, 0.022), V(0.03, 0.062, 0.022), V(0.06, 0.04, 0.012)], 0.018, fm, false, 16));
    temples(g, fm, 0.37, 0.03, -0.085, 0.014);
    return g;
  },
  shades() {
    const g = new THREE.Group(), frame = gloss(0xff4fa3, { roughness: 0.3 });
    const ring = roundRect(0.33, 0.26, 0.09, 0.35); ring.holes.push(new THREE.Path(roundRect(0.255, 0.19, 0.065, 0.275).getPoints(10).reverse()));
    const rg = ext(ring, 0.016, 0.012, 10);
    const lg = memo('shadeLens', () => {   // dark plum at the top to a lighter violet below
      const geo = new THREE.ShapeGeometry(roundRect(0.255, 0.19, 0.065, 0.275), 10), p = geo.getAttribute('position'), col = new Float32Array(p.count * 3);
      const top = lin(0x1e0b33), bot = lin(0x6a3d97), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) { c.copy(bot).lerp(top, sstep(-0.1, 0.08, p.getY(i))); col.set([c.r, c.g, c.b], i * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
    });
    const lensM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(s * 0.2, 0, -0.03); e.rotation.y = s * 0.3; g.add(e);
      e.add(new THREE.Mesh(rg, frame));
      const l = new THREE.Mesh(lg, lensM); l.position.z = 0.008; e.add(l);
      for (const [x, w] of [[-0.035, 0.035], [0.025, 0.016]]) {   // two slanted shine streaks
        const st = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.15), shineM(0.42)); st.position.set(x, 0.01, 0.011); st.rotation.z = -0.6; e.add(st);
      }
    }
    g.add(tube([V(-0.05, 0.05, 0.012), V(0, 0.062, 0.02), V(0.05, 0.05, 0.012)], 0.02, frame, false, 12));
    temples(g, frame, 0.37, 0.05, -0.09, 0.015);
    return g;
  },
  // neck (origin = the front of the collar's V)
  bowtie() {
    const g = new THREE.Group(), box = [-0.25, -0.13, -0.07, 0.25, 0.13, 0.075], dotM = onTop(soft(0xfff1dc));
    g.add(new THREE.Mesh(lump('bowtie', bowtieF, box, 0.0085), soft(0xef3b45, 0.4)));
    g.add(new THREE.Mesh(lump('bowtieKnot', bowtieKnotF, [-0.06, -0.07, -0.04, 0.06, 0.07, 0.07], 0.005), soft(0xe12f3c, 0.4)));
    g.add(new THREE.Mesh(memo('bowtieDots', () => dotDecals(bowtieF, dotGrid(bowtieF, box, 0.048, { oy: 0.012, skip: (x, y) => Math.abs(x) < 0.055 }), 0.0115)), dotM));
    g.add(new THREE.Mesh(memo('bowtieKnotDots', () => dotDecals(bowtieKnotF, [[-0.018, 0.022, 0.07], [0.02, -0.018, 0.07]].map(p => hitSurf(bowtieKnotF, p, [0, 0, -1])), 0.0105)), dotM));
    return g;
  },
  scarf() {
    // a chunky striped knit scarf round the neck, knotted at the front with two fringed ends hanging (on the left: the P stays)
    const g = new THREE.Group(), knit = knitTex(), cols = ['#ff6f8f', '#ffe27a', '#6fc6ff'];
    const ringM = clay(0xffffff, 0.8); ringM.map = stripeTex(cols, false).clone(); ringM.map.needsUpdate = true; ringM.map.repeat.set(9, 1);
    ringM.bumpMap = knit.clone(); ringM.bumpMap.needsUpdate = true; ringM.bumpMap.repeat.set(11, 1); ringM.bumpScale = 2.5;
    // a soft squarish band (a superellipse section), not a round tube: wound cloth, not a swim ring
    const prof = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * TAU, c = Math.cos(a), s = Math.sin(a); prof.push(new THREE.Vector2(0.37 + 0.085 * Math.sign(c) * Math.abs(c) ** 0.6, -0.11 * Math.sign(s) * Math.abs(s) ** 0.6)); }   // wide and full: it lies over the collar, below the chin
    const rg = new THREE.LatheGeometry(prof, 72, Math.PI), rp = rg.getAttribute('position');
    for (let i = 0; i < rp.count; i++) {   // a little uneven, as wound cloth is
      const x = rp.getX(i), z = rp.getZ(i), a = Math.atan2(x, z), k = 1 + 0.035 * Math.sin(2 * a + 1) + 0.02 * Math.sin(5 * a);
      rp.setXYZ(i, x * k, rp.getY(i) + 0.012 * Math.sin(3 * a + 0.5), z * k);
    }
    rg.computeVertexNormals();
    const ring = new THREE.Mesh(rg, ringM); ring.rotation.x = 0.12; ring.scale.set(1, 1, 0.95); g.add(ring);
    const endM = clay(0xffffff, 0.8); endM.map = stripeTex(cols, true).clone(); endM.map.needsUpdate = true; endM.map.repeat.set(1, 2);
    endM.bumpMap = knit.clone(); endM.bumpMap.needsUpdate = true; endM.bumpMap.repeat.set(2, 5); endM.bumpScale = 2.5;
    const knot = E(0.095, 0.085, 0.06, endM, 24); knot.position.set(-0.13, -0.05, 0.42); knot.rotation.z = 0.3; g.add(knot);
    const fr = cols.map(c => clay(new THREE.Color(c).getHex(), 0.85));
    for (const [x, len, w, rz, rx] of [[-0.135, 0.3, 0.118, -0.1, -0.12], [-0.06, 0.22, 0.108, 0.13, -0.06]]) {
      const geo = new RoundedBoxGeometry(w, len, 0.034, 3, 0.015), p = geo.getAttribute('position'), uv = geo.getAttribute('uv');
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / len + 0.5);   // stripes across the end
      const end = new THREE.Mesh(geo, endM); end.position.set(x, -0.05 - len / 2 + 0.02, 0.43 + (x < -0.1 ? 0 : 0.012)); end.rotation.set(rx, 0, rz); g.add(end);
      for (let k = 0; k < 5; k++) {
        const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 3, 8), fr[k % 3]); t.position.set((k - 2) * (w - 0.025) / 4, -len / 2 - 0.022, 0); end.add(t);
      }
    }
    return g;
  },
  // back (origin = between the shoulder blades)
  cape() {
    const g = new THREE.Group(), m = clay(0xffffff, 0.68); m.map = dotsTex('#f8789f', '#fff1dc', 4); m.side = THREE.DoubleSide;   // (cloth: no gloss)
    // a sheet: the top follows the shoulders (round the neck), the hem flares out with soft folds and a wavy edge
    const NU = 30, NV = 18, pos = [], uv = [], idx = [];
    // It wraps round the back on ellipses about the body's axis (z = 0.25 here) that widen going down: at the top inside the
    // collar, just outside the shirt (tata.js: its back is an ellipse ~0.36 × 0.28 there), at the hem a bell clear of the bottom.
    for (let j = 0; j <= NV; j++) {
      const v = j / NV, k = Math.pow(v, 0.6), rx = 0.38 + 0.225 * k, rz = 0.3 + 0.17 * k, phiMax = 0.75 + 0.35 * sstep(0, 0.35, v);
      for (let i = 0; i <= NU; i++) {
        const u = i / NU - 0.5, phi = u * 2 * phiMax, sn = Math.sin(phi), cs = Math.cos(phi);
        const fold = Math.cos(u * TAU * 3.5) * (0.25 * sstep(0, 0.15, v) + 0.75 * v * v);   // folds from the collar, deepening to the wavy hem
        const out = 0.05 * fold;
        const p = V(rx * sn + sn * out, 0.022 - 0.682 * v + 0.045 * fold * v * v * v, 0.25 - rz * cs - cs * out);   // (top edge inside the collar)
        pos.push(p.x, p.y, p.z); uv.push(p.x * 3.2, p.y * 3.2);
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const cape = new THREE.Mesh(geo, m); cape.name = 'cloth'; g.add(cape);
    // a rolled collar round the back of the neck, a gold button at each end
    const cm = clay(0xffffff, 0.6); cm.map = m.map.clone(); cm.map.needsUpdate = true; cm.map.repeat.set(10, 2);
    const col = []; for (let i = 0; i <= 16; i++) { const a = -1.15 + 2.3 * i / 16; col.push(V(0.335 * Math.sin(a), 0.03 + 0.012 * Math.cos(a), 0.25 - 0.3 * Math.cos(a))); }
    const roll = tube(col, 0.042, cm, false, 48); roll.scale.y = 0.72; g.add(roll);   // (a soft flattened roll)
    for (const p of [col[0], col[16]]) { const b = E(0.03, 0.03, 0.03, gold(), 16); b.position.set(p.x, p.y * 0.72, p.z); g.add(b); }
    return g;
  },
  wings() {
    // plump cartoon wings (user 2026-11-24 "날개가 납작하지않고 통통한 날개로 볼륨감 살아있게"): each wing is ONE soft lump —
    // a round shoulder bar, a full body and four fat feather lobes fanning down, blended together so it puffs out on both
    // sides — white, turning lilac toward the lobe tips. Flat extruded feathers before.
    const g = new THREE.Group(), white = lin(0xfdfbff), lil = lin(0xc9b2ff);
    const geo = lump('wingPuff', wingF, [-0.12, -0.36, -0.13, 0.6, 0.32, 0.13], 0.0085, {
      color: (x, y, z, out) => { const k = sstep(0.02, -0.24, y - 0.25 * x), c = white.clone().lerp(lil, 0.85 * k); out[0] = c.r; out[1] = c.g; out[2] = c.b; },
    });
    for (const s of [-1, 1]) {
      const wing = new THREE.Group(); wing.position.set(s * 0.1, 0, 0); wing.rotation.set(0, s * 0.45, s * 0.25); wing.name = s < 0 ? 'wingL' : 'wingR';
      const m = new THREE.Mesh(geo, vcol(0.55)); m.scale.x = s; wing.add(m); g.add(wing);
    }
    return g;
  },
  // feet (frame = the ankle; tata.js puts one on each foot in place of Tata's own shoes)
  goldshoes() {
    const g = new THREE.Group(), blue = soft(0x4aa8f0, 0.5), cream = soft(0xfff1dc, 0.55), lace = soft(0xffffff, 0.45);
    g.add(new THREE.Mesh(lump('snSole', snSoleF, [-0.24, -0.18, -0.25, 0.24, -0.07, 0.38], 0.013), cream));
    g.add(new THREE.Mesh(lump('snUpper', snUpperF, [-0.22, -0.16, -0.24, 0.22, 0.14, 0.36], 0.011), blue));
    g.add(new THREE.Mesh(lump('snCap', snCapF, [-0.21, -0.14, 0.15, 0.21, 0.06, 0.37], 0.01), cream));
    // the tongue: a soft flap down the front and up out of the collar; laces cross over it between three pairs of eyelets
    if (!SN_TONGUE) {
      const z = y => hitSurf(snUpperF, [0, y, 0.6], [0, 0, -1])[2];
      SN_TONGUE = [[-0.04, z(-0.03) + 0.004], [-0.005, z(-0.005) + 0.008], [0.03, z(0.03) + 0.01], [0.065, z(0.065) + 0.012], [0.1, z(0.065) + 0.008], [0.15, z(0.065) - 0.004]];
    }
    g.add(new THREE.Mesh(lump('snTongue', snTongueF, [-0.07, -0.08, 0.03, 0.07, 0.17, 0.33], 0.009), soft(0x67b9f5, 0.5)));
    const eye = [];
    for (const y of [-0.014, 0.015, 0.043]) for (const s of [-1, 1]) {
      const h = hitSurf(snUpperF, [s * 0.076, y, 0.6], [0, 0, -1]), n = gradAt(snUpperF, ...h).slice();
      const p = V(...h).addScaledVector(V(...n), 0.003);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0052, 6, 14), gloss(0xf3eee4, { roughness: 0.3 })); r.position.copy(p); r.lookAt(p.clone().add(V(...n))); g.add(r);
      eye.push(p);
    }
    const lz = y => {   // the tongue's front (its centre line, z at height y)
      const T = SN_TONGUE; let i = 1; while (i < T.length - 1 && T[i][0] < y) i++;
      return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * clamp((y - T[i - 1][0]) / (T[i][0] - T[i - 1][0]), 0, 1) + 0.011;
    };
    const over = (a, b) => { const m = a.clone().lerp(b, 0.5); m.z = Math.max(m.z, lz(m.y) + 0.016); return [a, m, b]; };
    g.add(tube(over(eye[0], eye[1]), 0.0085, lace, false, 10));
    for (let i = 0; i < 2; i++) {
      g.add(tube(over(eye[i * 2], eye[i * 2 + 3]), 0.0085, lace, false, 12));
      g.add(tube(over(eye[i * 2 + 1], eye[i * 2 + 2]), 0.0085, lace, false, 12));
    }
    // lace bow on top: two flat loops out to the sides and two ends hanging down the tongue
    const top = eye[4].clone().lerp(eye[5], 0.5); top.y += 0.008; top.z = lz(top.y) + 0.012;
    for (const s of [-1, 1]) {
      g.add(tube([top, V(s * 0.03, top.y + 0.026, top.z + 0.004), V(s * 0.068, top.y + 0.016, top.z - 0.002), V(s * 0.07, top.y - 0.008, top.z - 0.004), V(s * 0.032, top.y - 0.008, top.z + 0.002)], 0.0085, lace, true, 24));
      g.add(tube([top, V(s * 0.016, top.y - 0.03, lz(top.y - 0.03) + 0.008), V(s * 0.03, top.y - 0.062, lz(top.y - 0.062) + 0.008)], 0.0085, lace, false, 10));
    }
    const knot = E(0.013, 0.013, 0.011, lace, 12); knot.position.copy(top); g.add(knot);
    // (no polka-dot bow on the side any more — user 2026-11-24 "운동화에 신발에 리본은 과한거 같아")
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
  gradcap: { yaw: 0.3, pitch: 0.35 }, bow: { yaw: -0.15, pitch: 0.08 }, party: { yaw: 0.2, pitch: 0.12 }, flowers: { yaw: 0, pitch: 0.5 },
  bunny: { yaw: -0.25, pitch: 0.05 }, crown: { yaw: 0.15, pitch: 0.28 }, roundglasses: { yaw: -0.15, pitch: 0.05 }, starglasses: { yaw: -0.15, pitch: 0.05 },
  shades: { yaw: -0.2, pitch: 0.05 }, bowtie: { yaw: -0.2, pitch: 0.1 }, scarf: { yaw: 0.25, pitch: 0.2 }, cape: { yaw: 0.6, pitch: 0.3 },
  wings: { yaw: Math.PI - 0.3, pitch: 0.1 }, goldshoes: { yaw: -1.05, pitch: 0.3 },
};
