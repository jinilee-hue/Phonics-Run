// Tata (Phonics Land · Classmate Friends) as a code-built clay model, measured from the character sheet
// 공통이미지자료/01_Phonics_Friends Guide_v1/01_Classmate_Friends/Tata_Views.png (front figure 534 px tall → 2.05 units,
// 1 px = 0.00384 u) — user 2026-11-23: "대표 캐릭터들 준거를 3d 모델링으로" → Tata.
// Orange clay body, a five-lobe tuft, big white eyes, blue pillow nose, open smile, navy polo with a cream collar and hem
// and a white P, short orange legs in big teal shoes. root = the feet; the model faces +z.
// Same interface as the game expects: root, update(dt, st), jumped(), landed(v, x, y), flash.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

export const TATA_COLORS = {
  orange: 0xf8620a, navy: 0x161c40, cream: 0xf5e5d4, teal: 0x05868b, blue: 0x1c46d8, brow: 0x7a3812,
  pupil: 0x2a0e07, mouth: 0x8c2331, tongue: 0xef7e88, white: 0xfffaf2,
};
const K = TATA_COLORS;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);

function clay(color, rough = 0.62, sheen = 0.1, spec = 0.35) {
  // low specular + light sheen: the sky-blue world light and the env reflections otherwise wash the clay out
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: rough, metalness: 0, sheen, sheenRoughness: 0.6, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.15),
    specularIntensity: spec, envMapIntensity: 0.6,
  });
}
function ellipsoid(rx, ry, rz, mat, seg = 40) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), mat);
  m.scale.set(rx, ry, rz);
  return m;
}
/** a tuft lobe along +y: a short stalk from the root swelling into a round bulb centred at d (radius R) */
function lobe(R, d, mat) {
  const prof = [[0, -0.02], [0.72 * R, -0.02], [0.74 * R, 0.3 * d], [0.8 * R, 0.55 * d], [0.93 * R, d - 0.55 * R], [R, d], [0.87 * R, d + 0.5 * R], [0.5 * R, d + 0.87 * R], [0, d + R]];
  const pts = []; // smooth the profile a little (Catmull-Rom through the points)
  const c = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y)));
  for (const p of c.getPoints(28)) pts.push(new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
}

// ---------------------------------------------------------------- head surface (an ellipsoid, local to the head centre)
const HA = 0.549, HB = 0.442, HC = 0.455;
function headZ(x, y) {
  const u = 1 - (x / HA) ** 2 - (y / HB) ** 2;
  return HC * Math.sqrt(Math.max(0, u));
}
function headNormal(x, y) {
  const e = 0.002;
  const dzdx = (headZ(x + e, y) - headZ(x - e, y)) / (2 * e), dzdy = (headZ(x, y + e) - headZ(x, y - e)) / (2 * e);
  return new THREE.Vector3(-dzdx, -dzdy, 1).normalize();
}
/** put an object on the face at (x, y), pushed out by `lift` along the surface normal, +z turned to the normal */
function onHead(obj, x, y, lift = 0) {
  const n = headNormal(x, y);
  obj.position.set(x, y, headZ(x, y)).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return obj;
}
/** a flat 2D shape wrapped onto the face */
function headDecal(shape, mat, lift = 0.004, segs = 24) {
  // tessellate first: a big flat triangle across the mouth would sink under the curved face
  const g = new TessellateModifier(0.01, 12).modify(new THREE.ShapeGeometry(shape, segs)), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), n = headNormal(x, y);
    p.setXYZ(i, x + n.x * lift, y + n.y * lift, headZ(x, y) + n.z * lift);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
function headTube(pts2, r, mat, lift) {
  const pts = pts2.map(([x, y]) => { const n = headNormal(x, y); return new THREE.Vector3(x + n.x * lift, y + n.y * lift, headZ(x, y) + n.z * lift); });
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 10, false), mat);
  const g = new THREE.Group(); g.add(tube);
  for (const p of [pts[0], pts[pts.length - 1]]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); cap.position.copy(p); g.add(cap); }
  return g;
}

/** vertex colours graded by y (stops: [t 0..1 from y0 to y1, hex]) */
function colorByHeight(geo, y0, y1, stops) {
  const p = geo.getAttribute('position'), col = new Float32Array(p.count * 3), c = new THREE.Color();
  const cs = stops.map(([t, h]) => [t, new THREE.Color(h)]);
  for (let i = 0; i < p.count; i++) {
    const t = clamp((p.getY(i) - y0) / (y1 - y0), 0, 1);
    let k = 0; while (k < cs.length - 2 && cs[k + 1][0] < t) k++;
    const [ta, ca] = cs[k], [tb, cb] = cs[k + 1];
    c.copy(ca).lerp(cb, clamp((t - ta) / (tb - ta || 1), 0, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// ---------------------------------------------------------------- shirt surface (lathe, local to the torso = hem)
const SHIRT = [[0, -0.005], [0.405, -0.005], [0.432, 0.04], [0.445, 0.12], [0.445, 0.24], [0.44, 0.34], [0.425, 0.42], [0.39, 0.48], [0.31, 0.535], [0.16, 0.565], [0, 0.575]];   // square shoulders (sheet widths)
const SZ = 0.78;   // depth / width
function shirtR(y) {
  for (let i = 1; i < SHIRT.length; i++) {
    const [r0, y0] = SHIRT[i - 1], [r1, y1] = SHIRT[i];
    if (y <= y1) return lerp(r0, r1, clamp((y - y0) / (y1 - y0), 0, 1));
  }
  return 0;
}

export class Tata {
  constructor(scene, opts = {}) {
    this.puff = opts.puff || (() => {});
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);

    const orange = clay(K.orange), navy = clay(K.navy, 0.9, 0.04, 0.12), cream = clay(K.cream, 0.6, 0.06), teal = clay(K.teal, 0.55, 0.06),
      blue = clay(K.blue, 0.45, 0.3), brow = clay(K.brow, 0.6, 0.2);
    this.mats = { orange, navy, cream, teal, blue };

    // ---- pelvis (hip centre at the shirt hem) + legs + shoes
    this.pelvis = new THREE.Group(); this.pelvis.position.y = 0.36; this.model.add(this.pelvis);
    const bum = ellipsoid(0.375, 0.13, 0.29, orange); bum.position.y = -0.025; this.pelvis.add(bum);
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.21, -0.02, 0); this.pelvis.add(hip);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.112, 0.08, 8, 16), orange); leg.position.y = -0.1; hip.add(leg);
      const ankle = new THREE.Group(); ankle.position.y = -0.2; hip.add(ankle);
      // big teal shoe: an ellipsoid with a flattened sole, longer to the front
      const sg = new THREE.SphereGeometry(1, 40, 28), sp = sg.getAttribute('position');
      for (let i = 0; i < sp.count; i++) {
        let x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
        if (y < -0.45) y = -0.45 - (y + 0.45) * 0.2;              // flat sole
        const fw = z > 0 ? 1 + 0.08 * z : 1;                       // a little wider at the toe
        sp.setXYZ(i, x * 0.232 * fw, y * 0.135, z * 0.26);
      }
      sg.computeVertexNormals();
      const shoe = new THREE.Mesh(sg, teal); shoe.position.set(s * 0.03, -0.08, 0.06); ankle.add(shoe);
      (this.shoes ||= []).push(shoe);
      this.legs.push({ s, hip, ankle, prevC: 1 });
    }

    // ---- torso: navy polo shirt, cream collar + hem, white P
    this.torso = new THREE.Group(); this.torso.position.y = 0.0; this.pelvis.add(this.torso);
    const shirt = new THREE.Mesh(new THREE.LatheGeometry(SHIRT.map(([r, y]) => new THREE.Vector2(r, y)), 56), navy);
    shirt.scale.z = SZ; this.torso.add(shirt);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.413, 0.034, 12, 64), cream);
    hem.rotation.x = Math.PI / 2; hem.scale.set(1, SZ * 1.005, 1); hem.position.y = 0.012; this.torso.add(hem);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.05, 14, 56), cream);
    band.rotation.x = Math.PI / 2 - 0.05; band.scale.set(1, 0.86, 1); band.position.set(0, 0.51, 0.0); this.torso.add(band);
    // collar wings: rounded triangles hanging off the band on each side of the V, wrapped onto the shirt
    // (shape x = arc length round the shirt from the front centre, y = height on the torso)
    const wing = new THREE.Shape();
    wing.moveTo(0.035, 0.548); wing.lineTo(0.33, 0.505); wing.quadraticCurveTo(0.375, 0.5, 0.35, 0.465);
    wing.lineTo(0.215, 0.37); wing.quadraticCurveTo(0.19, 0.352, 0.168, 0.375); wing.lineTo(0.03, 0.51); wing.quadraticCurveTo(0.018, 0.53, 0.035, 0.548);
    const wingSrc = new TessellateModifier(0.02, 8).modify(new THREE.ExtrudeGeometry(wing, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 }));
    const wingMat = cream.clone(); wingMat.side = THREE.DoubleSide;
    for (const s of [-1, 1]) {
      const g = wingSrc.clone(), p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const ax = p.getX(i), y = p.getY(i), d = p.getZ(i);
        const r = shirtR(y), phi = s * ax / Math.max(r, 0.05), slope = (shirtR(y - 0.01) - shirtR(y + 0.01)) / 0.02;
        const n = new THREE.Vector3(Math.sin(phi), slope, Math.cos(phi) / SZ).normalize();
        p.setXYZ(i, Math.sin(phi) * r + n.x * (0.006 + d), y + n.y * (0.006 + d), Math.cos(phi) * r * SZ + n.z * (0.006 + d));
      }
      g.computeVertexNormals();
      this.torso.add(new THREE.Mesh(g, wingMat));
    }
    // the P (white, on the left chest = viewer's right)
    const pTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      // stem + bowl, with the little bar to the left at the top (the P mark on the sheet)
      g.beginPath(); g.roundRect(30, 22, 22, 86, 6); g.fill();
      g.beginPath(); g.roundRect(16, 22, 30, 20, 6); g.fill();
      g.lineWidth = 20; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(44, 32); g.lineTo(70, 32); g.arc(70, 52, 20, -Math.PI / 2, Math.PI / 2); g.lineTo(44, 72); g.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    })();
    {
      const y = 0.27, ang = 0.42, r = shirtR(y) + 0.004;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: pTex, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
      p.position.set(Math.sin(ang) * r, y, Math.cos(ang) * r * SZ);
      p.rotation.y = Math.atan2(Math.sin(ang), Math.cos(ang) * SZ) * 0.85;
      this.torso.add(p);
    }

    // ---- arms (orange, from the armholes), chubby mitten hands with a thumb
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.37, 0.4, 0.0); this.torso.add(sh);   // inside the armhole: the shirt covers the top
      // sheet: a short thick arm (shoulder 0.82 → wrist 0.6) and a BIG hand (0.25 tall) — four sausage fingers pressed
      // together (grooves, not beads) and a chunky thumb merged into the inner side
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.104, 0.1, 8, 16), orange); upper.position.y = -0.06; sh.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = -0.09; sh.add(elbow);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.108, 0.06, 8, 16), orange); fore.position.y = -0.03; elbow.add(fore);
      const hand = new THREE.Group(); hand.position.set(0, -0.04, 0); hand.rotation.y = Math.atan2(1, s); elbow.add(hand);
      const palm = ellipsoid(0.14, 0.1, 0.088, orange, 32); palm.position.y = -0.05; hand.add(palm);
      // fingers ~2.5x as long as thick, side by side, rounded tips (sheet)
      const fingerGeo = new THREE.CapsuleGeometry(0.042, 0.095, 8, 14);
      [[-0.084, 0.0], [-0.028, 0.012], [0.028, 0.008], [0.082, -0.014]].forEach(([fx, dl], i) => {
        const f = new THREE.Mesh(fingerGeo, orange);
        f.position.set(fx, -0.165 - dl, 0.0);
        f.rotation.set(0.24, 0, -fx * 0.8);              // curled toward the palm (inner-back): the back of the hand shows
        if (i === 3) f.scale.set(0.93, 0.86, 0.93);
        hand.add(f);
      });
      // thumb: on the inner-front edge (seen from the front at the inside, from the side in front), tip down and in
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.055, 8, 14), orange);
      thumb.position.set(-0.118, -0.075, 0.008); thumb.rotation.set(0.12, 0, -0.55); hand.add(thumb);   // inner-front edge, tip down and in (sheet side view: in front)
      this.arms.push({ s, sh, elbow });
    }

    // ---- head
    this.neck = new THREE.Group(); this.neck.position.y = 0.53; this.torso.add(this.neck);
    this.head = new THREE.Group(); this.head.position.y = 0.41; this.neck.add(this.head);
    const skull = ellipsoid(HA, HB, HC, orange, 64); this.head.add(skull);
    // tuft: five teardrop lobes fanned in the x-y plane from the crown
    this.tuft = new THREE.Group(); this.tuft.position.set(0, HB - 0.045, -0.02); this.head.add(this.tuft);
    // bulb centres measured on the sheet's close-up (head width 600 px = 1.1 u): centre (0, .27) R .094,
    // sides (±.19, .155) R .088, outers (±.25, .09) R .072 — relative to the root on the crown
    for (const [x, y, R, z] of [[0, 0.25, 0.112, 0], [-0.165, 0.135, 0.1, -0.005], [0.165, 0.135, 0.1, -0.005], [-0.18, 0.075, 0.064, -0.01], [0.18, 0.075, 0.064, -0.01]]) {
      const d = Math.hypot(x, y), ang = Math.atan2(x, y);
      const l = lobe(R, d, orange); l.rotation.z = -ang; l.position.set(0, 0, z); l.scale.z = x === 0 ? 1 : y > 0.1 ? 0.7 : 0.6;   // side view = one bulb, like the sheet
      this.tuft.add(l);
    }
    // eyes (user 2026-11-23: "더 귀엽고 사랑스럽게 — 매직블럭의 여우 눈처럼"): a white dome half in the face; a BIG iris, dark
    // brown at the rim, warm and lighter toward the bottom, a dark pupil; a big catch-light up-right + a small one low-left;
    // a dark upper lash line with a little flick at the outer corner; pink blush on the cheeks
    const whiteM = new THREE.MeshStandardMaterial({ color: K.white, roughness: 0.32 });
    const IRIS = 0.95, irisTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const body = g.createLinearGradient(0, 0, 0, 256); body.addColorStop(0, '#3a1a0b'); body.addColorStop(0.55, '#7a3c17'); body.addColorStop(1, '#c0702e');
      g.fillStyle = body; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
      const rim = g.createRadialGradient(128, 128, 96, 128, 128, 128); rim.addColorStop(0, 'rgba(30,12,4,0)'); rim.addColorStop(1, 'rgba(30,12,4,.9)');
      g.fillStyle = rim; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
      const pup = g.createRadialGradient(124, 118, 10, 124, 118, 62); pup.addColorStop(0, '#120502'); pup.addColorStop(0.85, '#1c0904'); pup.addColorStop(1, 'rgba(28,9,4,0)');
      g.fillStyle = pup; g.beginPath(); g.arc(124, 118, 62, 0, Math.PI * 2); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    })();
    const irisGeo = (() => {                                   // a cap round +z with a flat (front) UV: the iris disc painted on it
      const gg = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, IRIS).rotateX(Math.PI / 2);
      const p = gg.getAttribute('position'), uv = gg.getAttribute('uv'), R = Math.sin(IRIS);
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / R * 0.5 + 0.5, p.getY(i) / R * 0.5 + 0.5);
      return gg;
    })();
    const irisM = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.12, metalness: 0 });
    const hiM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lashM = clay(0x3a1a0b, 0.45, 0.05, 0.5);
    const EW = 0.142, EH = 0.162, ED = 0.09;
    this.eyes = [];
    for (const s of [-1, 1]) {
      const e = onHead(new THREE.Group(), s * 0.2, 0.075, -0.04);
      e.add(ellipsoid(EW, EH, ED, whiteM, 36));
      const unit = new THREE.Group(); unit.scale.set(EW * 1.012, EH * 1.012, ED * 1.012); e.add(unit);
      const look = new THREE.Group(); look.rotation.set(0.05, -s * 0.2, 0); unit.add(look);       // a little in and down
      look.add(new THREE.Mesh(irisGeo, irisM));
      const dot = (ax, ay, r) => {                             // a catch-light on the iris (unit-sphere space)
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), hiM); m.scale.z = 0.3;
        m.position.set(Math.sin(ax), Math.sin(ay), Math.sqrt(Math.max(0, 1 - Math.sin(ax) ** 2 - Math.sin(ay) ** 2)) * 1.015);
        look.add(m);
      };
      dot(0.36, 0.38, 0.29); dot(-0.34, -0.4, 0.11);
      // upper lash line round the top of the visible rim (where the dome leaves the face), thicker in the middle
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI * (0.06 + 0.88 * i / 20);
        pts.push(new THREE.Vector3(Math.cos(a) * EW * 0.94, Math.sin(a) * EH * 0.94, 0.036 + 0.014 * Math.sin(a)));
      }
      // (the fox's lid: a smooth dark line hugging the top, no separate lashes)
      const lash = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.021, 8, false), lashM);
      const ends = pts.filter((_, i) => i === 0 || i === pts.length - 1).map(p => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), lashM); c.position.copy(p); return c; });
      e.add(lash, ...ends);
      this.head.add(e); this.eyes.push(e);
    }
    // blush: soft pink on the cheeks, under and outside the eyes
    const blushTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,120,160,.7)'); gr.addColorStop(0.55, 'rgba(255,130,165,.35)'); gr.addColorStop(1, 'rgba(255,140,170,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const blushM = new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false });
    for (const s of [-1, 1]) {
      const cx = s * 0.33, cy = -0.1, r = 0.1, sh = new THREE.Shape(); sh.absellipse(cx, cy, r * 1.15, r, 0, Math.PI * 2);
      const m = headDecal(sh, blushM, 0.004, 32), uv = m.geometry.getAttribute('uv'), pp = m.geometry.getAttribute('position');
      for (let i = 0; i < pp.count; i++) uv.setXY(i, (pp.getX(i) - cx) / (2.3 * r) + 0.5, (pp.getY(i) - cy) / (2 * r) + 0.5);
      m.renderOrder = 2; this.head.add(m);
    }
    // eyebrows: brown clay arcs, outer ends lower
    for (const s of [-1, 1]) this.head.add(headTube([[s * 0.335, 0.255], [s * 0.27, 0.3], [s * 0.19, 0.315], [s * 0.115, 0.298]], 0.03, brow, 0.014));
    // nose: a blue pillow, a little below the eye line
    const nose = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.158, 0.16, 5, 0.07), blue);
    onHead(nose, 0, -0.035, 0.012); this.head.add(nose);
    // mouth, measured on the sheet close-up (head width 425 px = 1.1 u): top edge 0.142 below the head centre, just
    // under the nose; 0.337 wide, 0.2 deep; a wide U with steep sides and rounded corners; the top edge dips a little.
    // Inside: dark at the top (under the upper lip) to red lower down; a big pink tongue filling the lower half.
    const mw = 0.34, mh = 0.2, top0 = -0.13;
    const lowY = x => top0 - mh * Math.pow(Math.max(0, 1 - (2 * x / mw) ** 2), 0.31);          // = |sin|^0.62 with x = cos
    const ms = new THREE.Shape(), N = 96;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, x = (mw / 2) * Math.cos(th), sn = Math.sin(th);
      const y = sn < 0 ? top0 - mh * Math.pow(-sn, 0.62) : top0 + 0.016 * Math.pow(sn, 0.6) - 0.026 * sn * sn;
      i ? ms.lineTo(x, y) : ms.moveTo(x, y);
    }
    ms.closePath();
    const mouthM = new THREE.MeshBasicMaterial({ vertexColors: true });
    const tongueM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
    this.mouthOpen = new THREE.Group(); this.mouthO = new THREE.Group(); this.head.add(this.mouthOpen, this.mouthO);
    const inside = headDecal(ms, mouthM, 0.003);
    colorByHeight(inside.geometry, top0 - mh, top0, [[0, 0x9c2833], [0.55, 0x7c1c26], [1, 0x521018]]);
    this.mouthOpen.add(inside);
    // tongue: an arc on top, the mouth's own bottom (inset) below — it never pokes out of the mouth
    const tw = 0.112, tTop = top0 - 0.098, tR = 0.07, ts = new THREE.Shape();
    for (let i = 0; i <= 32; i++) {
      const x = -tw + (2 * tw * i) / 32;
      const y = Math.max(tTop - tR + tR * Math.sqrt(Math.max(0, 1 - (x / tw) ** 2)), lowY(x) + 0.012);
      i ? ts.lineTo(x, y) : ts.moveTo(x, y);
    }
    for (let i = 32; i >= 0; i--) { const x = -tw + (2 * tw * i) / 32; ts.lineTo(x * 0.999, lowY(x) + 0.011); }
    ts.closePath();
    const tongue = headDecal(ts, tongueM, 0.006);
    colorByHeight(tongue.geometry, top0 - mh, tTop, [[0, 0xe8606f], [1, 0xf58f9a]]);
    this.mouthOpen.add(tongue);
    // 'o' (hurt)
    const os = new THREE.Shape(); os.absellipse(0, top0 - 0.075, 0.062, 0.078, 0, Math.PI * 2);
    const oIn = headDecal(os, mouthM, 0.003); colorByHeight(oIn.geometry, top0 - 0.153, top0 + 0.003, [[0, 0x9c2833], [1, 0x521018]]); this.mouthO.add(oIn);
    const ot = new THREE.Shape(); ot.absellipse(0, top0 - 0.122, 0.036, 0.02, 0, Math.PI * 2);
    const oT = headDecal(ot, tongueM, 0.006); colorByHeight(oT.geometry, top0 - 0.15, top0 - 0.1, [[0, 0xe8606f], [1, 0xf58f9a]]); this.mouthO.add(oT);
    this.mouthO.visible = false;

    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    scene?.add(this.root);

    // ---- animation state
    this.phase = 0; this.air = 0; this.yaw = Math.PI / 2; this.facing = 1; this.jumpSide = 1; this.t = 0;
    this.land = 0; this.takeoff = 0; this.blinkIn = 2; this.blink = 0; this.cheer = 0; this.flash = 0; this.idleT = 0;
    this.tuftA = 0; this.tuftV = 0; this.prevBob = 0;
  }

  /** shop items: { shades, cape, crown, goldshoes } → shown / hidden (built the first time they are worn) */
  setOutfit(on = {}) {
    this.outfit ||= {};
    const make = id => {
      if (this.outfit[id]) return this.outfit[id];
      const g = new THREE.Group();
      if (id === 'shades') {
        // star-pink frames with dark lenses over the eyes
        const frameM = clay(0xff4fa3, 0.35, 0.05, 0.8), lensM = new THREE.MeshStandardMaterial({ color: 0x241038, roughness: 0.12, metalness: 0.3 });
        for (const sx of [-1, 1]) {
          const e = onHead(new THREE.Group(), sx * 0.2, 0.075, 0.085);
          const rim = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.28, 0.05, 4, 0.1), frameM);
          const lens = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.21, 0.03, 4, 0.08), lensM); lens.position.z = 0.02;
          const shine = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
          shine.position.set(0.06, 0.05, 0.037);
          e.add(rim, lens, shine); g.add(e);
        }
        const bridge = onHead(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), frameM), 0, 0.11, 0.11); bridge.rotateZ(Math.PI / 2); g.add(bridge);
        this.head.add(g);
      } else if (id === 'cape') {
        // red cape: a panel BEHIND the back (not round the waist — that reads as a skirt), gathered narrow at the neck
        // under a gold bar, wider and further back at the hem, the sides curving forward a little; flies back when running
        const capeM = clay(0xe8304a, 0.7, 0.2, 0.3); capeM.side = THREE.DoubleSide;
        const geo = new THREE.PlaneGeometry(1, 1, 12, 12), cp = geo.getAttribute('position');
        for (let i = 0; i < cp.count; i++) {
          const u = cp.getX(i), v = cp.getY(i) + 0.5;            // u -0.5..0.5 across, v 0 bottom .. 1 top
          const w = lerp(0.82, 0.4, v);                            // width: 0.82 at the hem, 0.4 at the neck
          const x = u * w, y = -0.66 * (1 - v);
          const z = -lerp(0.4, 0.06, v) + 0.32 * (u * 2) ** 2 * lerp(0.35, 0.15, v) * w;
          cp.setXYZ(i, x, y, z);
        }
        geo.computeVertexNormals();
        const cape = new THREE.Mesh(geo, capeM);
        const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.34, 4, 10), clay(0xffc83a, 0.4, 0.05, 0.6));
        bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.0, -0.06);
        g.add(cape, bar); g.position.set(0, 0.48, -0.25);
        this.torso.add(g); this.cape = g;
      } else if (id === 'crown') {
        const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.28, metalness: 0.65 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 32, 1, true), gold); band.material.side = THREE.DoubleSide;
        g.add(band);
        const gems = [0xff3f79, 0x2f7bff, 0x37d39b];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 10), gold); spike.position.set(Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2); g.add(spike);
          const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), gold); ball.position.set(Math.sin(a) * 0.2, 0.17, Math.cos(a) * 0.2); g.add(ball);
          if (i % 2 === 0) { const gem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), new THREE.MeshStandardMaterial({ color: gems[i / 2], roughness: 0.15, metalness: 0.1 })); gem.position.set(Math.sin(a) * 0.215, 0.0, Math.cos(a) * 0.215); gem.scale.z = 0.6; gem.lookAt(0, 0, 0); g.add(gem); }
        }
        g.position.set(0, HB - 0.02, -0.02); g.rotation.z = 0.1;
        this.head.add(g);
      } else if (id === 'goldshoes') {
        g.userData.gold = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.3, metalness: 0.55 });
      }
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      return (this.outfit[id] = g);
    };
    for (const id of ['shades', 'cape', 'crown', 'goldshoes']) {
      const want = !!on[id];
      if (!want && !this.outfit?.[id]) continue;
      const g = make(id);
      g.visible = want;
      if (id === 'goldshoes') for (const sh of this.shoes) sh.material = want ? g.userData.gold : this.mats.teal;
    }
  }

  jumped() { this.takeoff = 0.14; this.jumpSide = -this.jumpSide; this.tuftV -= 6; }
  landed(v, x, y) {
    this.land = 0.2 * clamp(v / 14, 0.45, 1);
    this.tuftV += clamp(v, 0, 20) * 0.9;
    const n = v > 9 ? 4 : 2;
    for (let i = 0; i < n; i++) this.puff(x + (i % 2 ? 0.4 : -0.4), y + 0.08, 0.15, (i % 2 ? 1 : -1) * (1.2 + Math.random()), 0.5, 0.55);
  }

  /** st: { vx, vy, grounded, facing, max, mode: play | idle | title | hurt | cheer | enter } */
  update(dt, st) {
    this.t += dt;
    const s = clamp(Math.abs(st.vx) / st.max, 0, 1);
    const moving = st.grounded && s > 0.04;
    if (moving) this.phase += dt * (6 + 12.5 * s);
    this.air += ((st.grounded ? 0 : 1) - this.air) * damp(st.grounded ? 22 : 12, dt);
    const air = this.air, rising = clamp(st.vy / 8, -1, 1), lead = this.jumpSide;

    if (st.facing) this.facing = st.facing;
    let wantYaw = this.facing * (Math.PI / 2 - 0.5);
    if (st.mode === 'idle') { this.idleT += dt; if (this.idleT > 0.6) wantYaw = this.facing * 0.5; }
    else if (st.mode === 'title') { this.idleT += dt; wantYaw = 0.28; }
    else this.idleT = 0;
    if (st.mode === 'enter') wantYaw = Math.PI;
    if (st.mode === 'cheer') wantYaw = 0;
    if (st.mode === 'pose') wantYaw = st.yaw ?? 0;
    let dy = wantYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += st.mode === 'pose' ? dy : dy * damp(st.mode === 'idle' || st.mode === 'title' ? 5 : 14, dt);
    this.root.rotation.y = this.yaw;

    // ---- legs: short, so the swing is from the hip; the shoe stays near level, toe up as it lands
    const amp = 0.2 + 0.85 * s;
    for (const L of this.legs) {
      const ph = this.phase + (L.s > 0 ? Math.PI : 0), sn = Math.sin(ph), cs = Math.cos(ph);
      let th = moving ? -amp * sn : 0;
      let an = moving ? -th * 0.55 - 0.3 * s * Math.max(0, cs) * 0.6 : 0;
      let lift = moving ? 0.07 * s * Math.max(0, Math.cos(ph + 0.3)) : 0;     // foot up while it swings forward
      const isLead = L.s === lead;
      const thA = rising > 0 ? (isLead ? -1.0 : 0.55) : (isLead ? -0.45 : 0.1);
      const anA = rising > 0 ? (isLead ? 0.35 : -0.25) : 0.15;
      L.hip.rotation.x = lerp(th, thA, air);
      L.hip.rotation.z = lerp(0, L.s * 0.12, air);
      L.ankle.rotation.x = lerp(an, anA, air);
      L.hip.position.y = -0.02 + lerp(lift, rising > 0 && isLead ? 0.06 : 0.02, air);
      if (moving && s > 0.55 && L.prevC > 0 && cs <= 0) {
        const p = L.ankle.getWorldPosition(tmp);
        this.puff(p.x - this.facing * 0.15, this.root.position.y + 0.06, p.z, -this.facing * (1 + Math.random()), 0.45, 0.42);
      }
      L.prevC = cs;
    }

    // ---- arms: pump opposite the legs, elbows bent
    for (const A of this.arms) {
      const ph = this.phase + (A.s > 0 ? Math.PI : 0), sn = Math.sin(ph);
      let shx = moving ? (1.05 * s + 0.1) * sn - 0.15 * s : 0.03 + 0.03 * Math.sin(this.idleT * 2.4);
      let shz = A.s * (moving ? 0.36 + 0.1 * s : 0.5);     // sheet: arms hang ~30° out, hands beside the hem
      let el = moving ? -(0.45 + 0.3 * s) : -0.1;
      const isUp = A.s === -lead;
      const shxA = rising > 0 ? (isUp ? -2.7 : 0.6) : -0.5;
      const shzA = rising > 0 ? A.s * (isUp ? 0.25 : 0.5) : A.s * (1.35 + 0.12 * Math.sin(this.t * 20));
      const elA = rising > 0 ? (isUp ? -0.2 : -0.6) : -0.35;
      A.sh.rotation.x = lerp(shx, shxA, air);
      A.sh.rotation.z = lerp(shz, shzA, air);
      A.elbow.rotation.x = lerp(el, elA, air);
      A.elbow.rotation.z = 0;
    }

    // ---- body: a bouncy chibi run
    const bob = moving ? -0.07 * s * Math.cos(2 * this.phase) + 0.045 * s : 0.012 * Math.sin(this.idleT * 2.4);
    this.pelvis.position.y = 0.36 + bob + air * 0.03;
    this.pelvis.rotation.y = moving ? -0.1 * s * Math.sin(this.phase) : 0;
    this.torso.rotation.x = lerp(moving ? 0.06 + 0.16 * s : 0.0, rising > 0 ? 0.06 : -0.06, air);
    this.torso.rotation.y = moving ? 0.16 * s * Math.sin(this.phase) : 0;
    this.torso.rotation.z = moving ? 0.04 * s * Math.sin(this.phase) : 0;
    this.neck.rotation.x = -this.torso.rotation.x * 0.5 + (moving ? 0.035 * Math.cos(2 * this.phase) : 0);
    this.neck.rotation.y = -this.torso.rotation.y * 0.6;
    this.head.rotation.y = lerp(this.head.rotation.y, st.mode === 'idle' ? -this.facing * 0.22 : 0, damp(4, dt));
    if (this.cape?.visible) {
      const fly = moving ? 0.25 + 0.75 * s : air > 0.5 ? (rising > 0 ? 0.2 : 0.9) : 0.08;
      this.capeA = lerp(this.capeA || 0, fly, damp(6, dt));
      this.cape.rotation.x = -this.capeA * 0.9 - (moving ? 0.06 * Math.sin(this.t * 14) * s : 0.02 * Math.sin(this.t * 2));
    }
    // tuft: a spring that lags the bounce
    const bobV = (bob - this.prevBob) / Math.max(dt, 1e-3); this.prevBob = bob;
    this.tuftV += (-this.tuftA * 70 - this.tuftV * 7 - bobV * 2.2) * dt;
    this.tuftA = clamp(this.tuftA + this.tuftV * dt * 0.02, -0.35, 0.35);
    this.tuft.rotation.x = this.tuftA * 0.8 - (moving ? 0.12 * s : 0);
    this.tuft.scale.set(1, 1 - this.tuftA * 0.4, 1);

    let sy = 1;
    if (this.takeoff > 0) { this.takeoff -= dt; sy = 1 + 0.12 * Math.sin((1 - this.takeoff / 0.14) * Math.PI); }
    if (this.land > 0) { const T = 0.2; this.land -= dt; sy = 1 - 0.22 * Math.sin(clamp(1 - this.land / T, 0, 1) * Math.PI); }
    const sxz = 1 / Math.sqrt(sy);
    this.model.scale.set(sxz, sy, sxz);

    if (st.mode === 'hurt') {
      for (const A of this.arms) { A.sh.rotation.x = -2.4; A.sh.rotation.z = A.s * 0.7; A.elbow.rotation.x = -0.3; }
      this.torso.rotation.x = -0.2;
    }
    if (st.mode === 'title') {
      const w = this.idleT % 4.2;
      if (w > 1.2 && w < 3.0) {
        const k = Math.min(1, (w - 1.2) / 0.25, (3.0 - w) / 0.25), A = this.arms[1];
        A.sh.rotation.z = lerp(A.sh.rotation.z, 2.5, k); A.sh.rotation.x = lerp(A.sh.rotation.x, -0.2, k);
        A.elbow.rotation.x = lerp(A.elbow.rotation.x, -0.3, k);
        A.elbow.rotation.z = k * (0.4 + 0.4 * Math.sin(w * 11));
      }
    }
    if (st.mode === 'cheer') {
      this.cheer += dt;
      const c = Math.sin(this.cheer * 9);
      for (const A of this.arms) { A.sh.rotation.x = -2.8 + 0.15 * c; A.sh.rotation.z = A.s * (0.5 + 0.12 * c); A.elbow.rotation.x = -0.2; }
      this.model.position.y = Math.max(0, Math.sin(this.cheer * 6)) * 0.5;
    } else { this.cheer = 0; this.model.position.y = 0; }

    // blink + mouth (open smile; a small 'o' when hurt)
    this.blinkIn -= dt;
    if (this.blinkIn < 0) { this.blink = 0.13; this.blinkIn = 2.2 + Math.random() * 2.2; }
    if (this.blink > 0) this.blink -= dt;
    const ey = this.blink > 0 && st.mode !== 'pose' ? 0.1 : 1;
    for (const e of this.eyes) e.scale.y += (ey - e.scale.y) * damp(30, dt);
    const hurt = st.mode === 'hurt';
    this.mouthOpen.visible = !hurt; this.mouthO.visible = hurt;

    if (this.flash > 0) { this.flash -= dt; this.model.visible = Math.floor(this.flash * 14) % 2 === 0 || this.flash <= 0; }
    else this.model.visible = true;
  }
}
const tmp = new THREE.Vector3();
