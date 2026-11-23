// The five worlds' terrain and props, after the user's references (2026-11-23): the intro video's FOREST (round trees, a
// giant tree, red / purple mushrooms, green and blue pipes, a waterfall, a checkered start, a rainbow), CANDY (a wafer
// path between candy-cane rails, frosting fields, a chocolate river and chocolate hills, cakes, cupcakes, a gingerbread
// house, giant candy canes, swirl lollipops, gumdrops), SNOW (ice cliffs with icicles — some rainbow — snowy pines, log
// cabins with smoking chimneys, snowmen with scarves, ice bridges, a snow tunnel, crystals, falling snow), the DESERT
// OASIS (dunes, pyramids, cacti, palms, stone arches, tents, a pool with lily pads, signposts) and SPACE (planets with
// rings, galaxies, asteroid platforms, glowing star bridges, crystals, glowing mushrooms).
// The course runs into the screen (-z); the path is PATH_W wide round x = 0; the ground blocks are wider (props stand
// beside the path).
import * as THREE from 'three';
import * as E from './env.js';
import * as C from './critters.js';
const { V, rr, rnd, std, shade, canvasTex, blob, RoundedBoxGeometry } = E;

export const PATH_W = 4.8, GROUND_W = 16;
// side view (user 2026-11-23: "뒤모습 보이며 달리는거랑 옆으로 달리는거랑 두가지 버전"): the camera stands at +x looking across
// the course, so scenery goes on the far side (-x) only — anything on the near side would stand in front of the lens
export let SIDE = false;
export function setSide(v) { SIDE = !!v; }
const SIDES = () => (SIDE ? [-1] : [-1, 1]);
const far = x => (SIDE ? -Math.abs(x) : x);
const cache = {};
const once = (k, f) => (cache[k] ||= f());
const pick = a => a[(rnd() * a.length) | 0];
const gloss = (c, x = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, ...x });
const mat = (c, r = 0.6, x = {}) => std(c, r, x);
const E3 = (rx, ry, rz, m, seg = 24) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), m); o.scale.set(rx, ry, rz); return o; };
function stripeTex(a, b, n = 6, diag = true) {
  return once('st' + a + b + n + diag, () => {
    const t = canvasTex(128, 128, g => {
      g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b;
      for (let i = -2; i < n * 2; i++) { g.beginPath(); const x = i * 128 / n; if (diag) { g.moveTo(x, 0); g.lineTo(x + 64 / n, 0); g.lineTo(x + 64 / n + 128, 128); g.lineTo(x + 128, 128); } else { g.rect(0, x, 128, 64 / n); } g.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

// ---------------------------------------------------------------- path surfaces (a strip on the ground block's top)
function pathTex(theme) {
  return once('path' + theme, () => {
    const t = canvasTex(256, 256, g => {
      const S = 256;
      if (theme === 'candy') {                                      // wafer: a golden grid of little squares
        g.fillStyle = '#e8b46a'; g.fillRect(0, 0, S, S);
        for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) {
          const gr = g.createLinearGradient(x, y, x + 32, y + 32); gr.addColorStop(0, '#f6d394'); gr.addColorStop(1, '#d49a4e');
          g.fillStyle = gr; g.fillRect(x + 4, y + 4, 24, 24);
        }
      } else if (theme === 'snow') {                                // packed snow with footprints
        g.fillStyle = '#eef5ff'; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(150,180,220,${0.05 + Math.random() * 0.08})`; g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, 10 + Math.random() * 18, 6 + Math.random() * 10, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
      } else if (theme === 'desert') {                              // light sand with stepping stones
        g.fillStyle = '#f8dca0'; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 9; i++) { g.fillStyle = '#e8c385'; g.beginPath(); g.ellipse(40 + (i % 3) * 88 + Math.random() * 20, 40 + ((i / 3) | 0) * 88 + Math.random() * 20, 30, 22, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
        for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(180,130,60,${Math.random() * 0.12})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
      } else if (theme === 'space') {                               // a glowing star road
        const gr = g.createLinearGradient(0, 0, S, 0); gr.addColorStop(0, '#5b3fd6'); gr.addColorStop(0.5, '#8b6cff'); gr.addColorStop(1, '#5b3fd6');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, Math.random() * 2.6, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(160,240,255,.9)'; g.lineWidth = 8; g.strokeRect(-4, -10, 16, S + 20); g.strokeRect(S - 12, -10, 16, S + 20);
      } else {                                                       // forest: a dirt path with pebbles and grass tufts at its edges
        g.fillStyle = '#e3bd86'; g.fillRect(0, 0, S, S);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,100,50,${0.12 + Math.random() * 0.15})`; g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#6bcb4c'; for (let y = 0; y < S; y += 10) { g.beginPath(); g.ellipse(0, y, 10 + Math.random() * 8, 7, 0, 0, Math.PI * 2); g.ellipse(S, y, 10 + Math.random() * 8, 7, 0, 0, Math.PI * 2); g.fill(); }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}
function checkerTex() {
  return once('checker', () => { const t = canvasTex(128, 128, g => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#3a3a4a' : '#f6f6f6'; g.fillRect(x * 32, y * 32, 32, 32); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
}

// ---------------------------------------------------------------- the ground under the path: one wide block per segment
/** a block from z = -d0 to -d1 at height `top`, PATH_W of path in the middle and props on both sides */
export function ground(parent, d0, d1, top, theme, { checker = false, props = true } = {}) {
  const len = d1 - d0, zc = -(d0 + d1) / 2, h = theme === 'space' ? 3.2 : 6;
  const g = E.island(parent, GROUND_W, len, h);
  g.position.set(0, top, zc);
  // under the block: icicles (snow), chocolate drips (candy), a rocky bottom (space)
  if (theme === 'snow') icicles(g, len, h);
  if (theme === 'space') { g.children[0].scale.y = 0.6; g.children[0].position.y = -0.55 - h * 0.3; asteroidBottom(g, len); }
  // the path strip
  const pm = new THREE.MeshStandardMaterial({ map: (checker ? checkerTex() : pathTex(theme)).clone(), roughness: theme === 'space' ? 0.35 : 0.8,
    ...(theme === 'space' ? { emissive: 0x6d5fd6, emissiveIntensity: 0.55, emissiveMap: pathTex(theme) } : {}) });
  pm.map.needsUpdate = true; pm.map.wrapS = pm.map.wrapT = THREE.RepeatWrapping; pm.map.repeat.set(checker ? 1.2 : 1, len / PATH_W * (checker ? 1.2 : 1));
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W, len), pm);
  strip.rotation.x = -Math.PI / 2; strip.position.y = 0.035; strip.receiveShadow = true; g.add(strip);   // (the cap's rounded top is at +0.015)
  rails(g, len, theme);
  if (props) sideProps(g, len, theme);
  return g;
}
function icicles(g, len, h) {
  const ice = new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.15, transmission: 0, clearcoat: 1, transparent: true, opacity: 0.9 });
  const rainbow = [0xff8fb8, 0xffd36b, 0x8ef0a0, 0x7fcfff, 0xc39bff];
  for (let z = -len / 2 + 0.6; z < len / 2 - 0.4; z += rr(0.5, 1.1)) {
    for (const x of [-GROUND_W / 2 + 0.25, GROUND_W / 2 - 0.25]) {
      if (rnd() < 0.3) continue;
      const L = rr(0.6, 1.8), m = rnd() < 0.25 ? gloss(pick(rainbow), { transparent: true, opacity: 0.9 }) : ice;
      const c = new THREE.Mesh(new THREE.ConeGeometry(rr(0.09, 0.18), L, 8), m); c.rotation.x = Math.PI; c.position.set(x, -0.75 - L / 2, z); g.add(c);
    }
  }
  for (let x = -GROUND_W / 2 + 0.6; x < GROUND_W / 2; x += rr(0.5, 1.2)) {           // along the front edge
    if (rnd() < 0.35) continue;
    const L = rr(0.5, 1.6), m = rnd() < 0.3 ? gloss(pick(rainbow), { transparent: true, opacity: 0.9 }) : ice;
    const c = new THREE.Mesh(new THREE.ConeGeometry(rr(0.08, 0.16), L, 8), m); c.rotation.x = Math.PI; c.position.set(x, -0.75 - L / 2, len / 2 - 0.25); g.add(c);
  }
  void h;
}
function asteroidBottom(g, len) {
  const m = std(0x3a3058, 0.9, { flatShading: true });
  for (let z = -len / 2 + 1; z < len / 2; z += rr(2, 3.5)) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(1.4, 2.6), 0), m); r.position.set(rr(-4, 4), -3.2 - rr(0, 1.2), z); r.scale.y = rr(0.7, 1.1); g.add(r);
  }
}
/** the path's edges: candy-cane rails (candy), snow banks (snow), stone kerbs (desert), glow rails (space), flowers (forest) */
function rails(g, len, theme) {
  const X = PATH_W / 2 + 0.18;
  if (theme === 'candy') {
    const t = stripeTex('#ffffff', '#ff4f5e', 5).clone(); t.needsUpdate = true; t.repeat.set(len * 1.2, 1);
    const m = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1 });
    for (const x of [-X, X]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len - 0.4, 16), m); r.rotation.x = Math.PI / 2; r.position.set(x, 0.2, 0); g.add(r); }
  } else if (theme === 'snow') {
    const m = std(0xffffff, 0.9);
    for (const x of [-X - 0.1, X + 0.1]) for (let z = -len / 2 + 0.6; z < len / 2 - 0.3; z += 0.9) { const b = E3(rr(0.4, 0.55), rr(0.22, 0.32), 0.55, m, 14); b.position.set(x, 0.05, z); g.add(b); }
  } else if (theme === 'desert') {
    const m = std(0xd09a5e, 0.85);
    for (const x of [-X, X]) for (let z = -len / 2 + 0.5; z < len / 2 - 0.3; z += 1.1) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.9, 2, 0.1), m); b.position.set(x, 0.12, z); b.rotation.y = rr(-0.1, 0.1); g.add(b); }
  } else if (theme === 'space') {
    const m = new THREE.MeshBasicMaterial({ color: 0x9ff2ff, toneMapped: false });
    for (const x of [-X, X]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len - 0.4, 8), m); r.rotation.x = Math.PI / 2; r.position.set(x, 0.12, 0); g.add(r); }
  } else {
    const cols = [0xff7fae, 0xffffff, 0xffd447, 0xb79bff];
    for (const x of [-X, X]) for (let z = -len / 2 + 0.6; z < len / 2 - 0.3; z += rr(0.8, 1.4)) {
      const f = new THREE.Group(); f.position.set(x + rr(-0.15, 0.15), 0, z);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 5), std(0x3f9a3a)); stem.position.y = 0.14; f.add(stem);
      const head = E3(0.09, 0.06, 0.09, std(pick(cols), 0.5), 10); head.position.y = 0.3; f.add(head);
      g.add(f);
    }
  }
}

// ---------------------------------------------------------------- props beside the path (on the ground block)
function sideProps(g, len, theme) {
  for (const side of SIDES()) {
    for (let z = -len / 2 + rr(1, 2.5); z < len / 2 - 1; z += rr(3.2, 5.2)) {
      const x = side * rr(PATH_W / 2 + 1.4, GROUND_W / 2 - 1.2);
      prop(g, x, z, theme, side);
    }
  }
}
function prop(g, x, z, theme, side) {
  const k = rnd();
  if (theme === 'forest') {
    if (k < 0.4) E.tree(g, x, z, rr(0.9, 1.3));
    else if (k < 0.65) mushroom(g, x, z, rr(0.6, 1.1));
    else if (k < 0.8) pipe(g, x, z, rr(0.8, 1.1));
    else if (k < 0.92) E.bush(g, x, z, rr(0.9, 1.2));
    else rock(g, x, z, 0xb8b2a8);
  } else if (theme === 'candy') {
    if (k < 0.3) E.candyTree(g, x, z, rr(0.9, 1.2), 0);
    else if (k < 0.5) cake(g, x, z, rr(0.8, 1.1));
    else if (k < 0.68) { const c = new THREE.Group(); c.position.set(x, 0, z); E.cupcake(c, rr(1.0, 1.4)); g.add(shade(c)); }
    else if (k < 0.82) candyCane(g, x, z, rr(1, 1.5), side);
    else E.bush(g, x, z, rr(1, 1.3));
  } else if (theme === 'snow') {
    if (k < 0.45) pine(g, x, z, rr(0.9, 1.4));
    else if (k < 0.65) snowman(g, x, z, rr(0.8, 1.05), side);
    else if (k < 0.8) crystal(g, x, z, 0x9fe6ff);
    else E3Prop(g, x, z, std(0xffffff, 0.9), rr(0.6, 0.9));
  } else if (theme === 'desert') {
    if (k < 0.35) cactus(g, x, z, rr(0.8, 1.3));
    else if (k < 0.6) palm(g, x, z, rr(0.9, 1.25));
    else if (k < 0.75) rock(g, x, z, 0xd39a5a);
    else if (k < 0.88) signpost(g, x, z, side);
    else { const b = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.7, 0.9, 2, 0.15), std(0xdca468, 0.85)); b.position.set(x, 0.35, z); b.rotation.y = rr(0, 1); g.add(shade(b)); }
  } else {
    if (k < 0.4) crystal(g, x, z, pick([0x9ff2ff, 0xd9a6ff, 0xff9fe0]));
    else if (k < 0.7) glowShroom(g, x, z, rr(0.7, 1.1));
    else rock(g, x, z, 0x6a5c94);
  }
}
function E3Prop(g, x, z, m, s) { const b = E3(s, s * 0.6, s, m, 16); b.position.set(x, s * 0.2, z); g.add(shade(b)); }
function rock(g, x, z, c) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(0.35, 0.6), 1), std(c, 0.85, { flatShading: true })); r.position.set(x, 0.2, z); r.scale.y = 0.7; r.rotation.set(rr(0, 3), rr(0, 3), 0); g.add(shade(r)); }

// ---- forest
const spotsTex = c => once('spots' + c, () => canvasTex(256, 128, g => { g.fillStyle = c; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff';
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * 256, 10 + Math.random() * 60, 8 + Math.random() * 10, 6 + Math.random() * 8, 0, 0, Math.PI * 2); g.fill(); } }));
export function mushroom(g, x, z, s, colour) {
  const m = new THREE.Group(); m.position.set(x, 0, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 0.7 * s, 16), std(0xfff3dc, 0.7)); stem.position.y = 0.35 * s; m.add(stem);
  const col = colour || pick(['#ff4a4a', '#ff4a4a', '#a767ff', '#ff7fb0']);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), gloss(0xffffff, { map: spotsTex(col) }));
  cap.scale.y = 0.72; cap.position.y = 0.66 * s; m.add(cap);
  g.add(shade(m)); return m;
}
function pipe(g, x, z, s) {
  const c = pick([0x3cc45a, 0x3fa6ff]), m = gloss(c);
  const p = new THREE.Group(); p.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 1.0 * s, 24), m); body.position.y = 0.5 * s; p.add(body);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * s, 0.52 * s, 0.3 * s, 24), m); lip.position.y = 1.05 * s; p.add(lip);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4 * s, 24), std(0x0e3a18)); hole.rotation.x = -Math.PI / 2; hole.position.y = 1.205 * s; p.add(hole);
  g.add(shade(p));
}
// ---- candy
function cake(g, x, z, s) {
  const c = new THREE.Group(); c.position.set(x, 0, z);
  const layers = [[0x6c3a20, 0.32], [0xf6e6d0, 0.08], [0x8a4a26, 0.3]];
  let y = 0;
  for (const [col, hh] of layers) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 0.9 * s, hh * s, 32), std(col, 0.7)); l.position.y = (y + hh / 2) * s; c.add(l); y += hh; }
  const ice = gloss(0xfff6fb);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.93 * s, 0.93 * s, 0.08 * s, 32), ice); top.position.y = y * s; c.add(top);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.07 * s, rr(0.08, 0.2) * s, 4, 8), ice); d.position.set(Math.cos(a) * 0.9 * s, (y - 0.1) * s, Math.sin(a) * 0.9 * s); c.add(d); }
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 16, 12), gloss(0xff3b5c)); cherry.position.y = (y + 0.13) * s; c.add(cherry);
  g.add(shade(c));
}
export function candyCane(g, x, z, s, side = 1) {
  const t = stripeTex('#ffffff', '#ff3b4e', 4).clone(); t.needsUpdate = true; t.repeat.set(3, 1);
  const m = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1 });
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = side > 0 ? Math.PI * 0.85 : Math.PI * 0.15;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.16 * s, 2.4 * s, 16), m); stick.position.y = 1.2 * s; c.add(stick);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.45 * s, 0.16 * s, 12, 24, Math.PI), m); hook.position.set(0.45 * s, 2.4 * s, 0); c.add(hook);
  g.add(shade(c));
}
function gingerHouse(g, x, z, s) {
  const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = rr(-0.4, 0.4);
  const ginger = std(0xb8743a, 0.8), ice = gloss(0xfffaf4);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4 * s, 1.8 * s, 2 * s, 3, 0.1), ginger); body.position.y = 0.9 * s; h.add(body);
  for (const sx of [-1, 1]) { const roof = new THREE.Mesh(new RoundedBoxGeometry(1.55 * s, 0.16 * s, 2.3 * s, 2, 0.06), ice); roof.position.set(sx * 0.62 * s, 2.25 * s, 0); roof.rotation.z = -sx * 0.68; h.add(roof); }
  const gable = new THREE.Mesh(new THREE.ConeGeometry(1.35 * s, 1.0 * s, 4, 1), ginger); gable.rotation.y = Math.PI / 4; gable.scale.z = 0.72; gable.position.y = 2.2 * s; h.add(gable);
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.6 * s, 0.95 * s, 0.1, 2, 0.08), std(0x6c3a20)); door.position.set(0, 0.48 * s, 1.01 * s); h.add(door);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new RoundedBoxGeometry(0.45 * s, 0.45 * s, 0.08, 2, 0.06), gloss(0xffe9a8)); w.position.set(sx * 0.75 * s, 1.15 * s, 1.01 * s); h.add(w); }
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.25 * s, 24), new THREE.MeshStandardMaterial({ map: E.swirlTex2('#ff4f5e', '#ffffff') })); swirl.position.set(0, 1.95 * s, 1.02 * s); h.add(swirl);
  g.add(shade(h));
}
function chocHill(g, x, z, s) {
  const choc = gloss(0x5a2e1a, { roughness: 0.35 }), cream = gloss(0xfff3e6);
  const hill = E3(3.5 * s, 2.6 * s, 3.2 * s, choc, 28); hill.position.set(x, 0, z); g.add(hill);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, 0.75), cream); cap.scale.set(3.55 * s, 2.65 * s, 3.25 * s); cap.position.set(x, 0, z); g.add(cap);
}
// ---- snow
export function pine(g, x, z, s) {
  const t = new THREE.Group(); t.position.set(x, 0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.6 * s, 8), std(0x7a4e2c)); trunk.position.y = 0.3 * s; t.add(trunk);
  const green = std(0x2f8a57, 0.8), snow = std(0xffffff, 0.9);
  [[0.95, 0.5, 1.0], [0.75, 1.15, 0.85], [0.52, 1.75, 0.7]].forEach(([r, y, h]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 14), green); c.position.y = (y + h / 2) * s; t.add(c);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.82 * s, h * 0.55 * s, 14), snow); cap.position.y = (y + h * 0.72) * s; t.add(cap);
  });
  g.add(shade(t)); return t;
}
function snowman(g, x, z, s, side) {
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = -side * 0.5;
  const snow = std(0xffffff, 0.85);
  const b1 = E3(0.6 * s, 0.55 * s, 0.6 * s, snow, 20); b1.position.y = 0.5 * s; m.add(b1);
  const b2 = E3(0.42 * s, 0.4 * s, 0.42 * s, snow, 20); b2.position.y = 1.25 * s; m.add(b2);
  for (const ex of [-0.13, 0.13]) { const e = E3(0.045 * s, 0.05 * s, 0.03 * s, std(0x1b1430), 8); e.position.set(ex * s, 1.35 * s, 0.38 * s); m.add(e); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.25 * s, 10), std(0xff8a2a)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.25 * s, 0.5 * s); m.add(nose);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.34 * s, 0.08 * s, 8, 24), std(pick([0xff4f6d, 0x4f8fff, 0xffc83a]), 0.7)); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.98 * s; m.add(scarf);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.6 * s, 5), std(0x6b4226)); arm.position.set(sx * 0.6 * s, 1.15 * s, 0); arm.rotation.z = sx * 1.0; m.add(arm); }
  g.add(shade(m));
}
function cabin(g, x, z, s) {
  const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = rr(-0.4, 0.4);
  const logTex = once('logs', () => { const t = canvasTex(64, 64, c => { for (let i = 0; i < 4; i++) { const gr = c.createLinearGradient(0, i * 16, 0, i * 16 + 16); gr.addColorStop(0, '#b0743c'); gr.addColorStop(0.5, '#8a5428'); gr.addColorStop(1, '#5e3616'); c.fillStyle = gr; c.fillRect(0, i * 16, 64, 16); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t; });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.6 * s, 1.8 * s, 2.2 * s, 2, 0.12), new THREE.MeshStandardMaterial({ map: logTex, roughness: 0.85 })); body.position.y = 0.9 * s; h.add(body);
  const snow = std(0xffffff, 0.9);
  for (const sx of [-1, 1]) { const roof = new THREE.Mesh(new RoundedBoxGeometry(1.75 * s, 0.3 * s, 2.6 * s, 3, 0.12), snow); roof.position.set(sx * 0.68 * s, 2.25 * s, 0); roof.rotation.z = -sx * 0.62; h.add(roof); }
  const chim = new THREE.Mesh(new RoundedBoxGeometry(0.4 * s, 0.9 * s, 0.4 * s, 2, 0.06), std(0xa8533a)); chim.position.set(0.7 * s, 2.7 * s, -0.4 * s); h.add(chim);
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.6 * s, 1.0 * s, 0.08, 2, 0.06), std(0x5e3616)); door.position.set(0, 0.5 * s, 1.11 * s); h.add(door);
  const win = new THREE.Mesh(new RoundedBoxGeometry(0.5 * s, 0.45 * s, 0.08, 2, 0.06), new THREE.MeshStandardMaterial({ color: 0xffe7a0, emissive: 0xffc860, emissiveIntensity: 0.6 })); win.position.set(0.8 * s, 1.1 * s, 1.11 * s); h.add(win);
  const smoke = new THREE.Group(); smoke.position.set(0.7 * s, 3.3 * s, -0.4 * s); smoke.name = 'smoke';
  for (let i = 0; i < 3; i++) { const p = E3(0.16 + i * 0.06, 0.14 + i * 0.05, 0.16 + i * 0.06, std(0xffffff, 1, { transparent: true, opacity: 0.8 }), 10); p.position.set(i * 0.12, i * 0.38, 0); smoke.add(p); }
  h.add(smoke);
  g.add(shade(h)); return h;
}
function crystal(g, x, z, c) {
  const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.15, flatShading: true, transparent: true, opacity: 0.92 });
  const gg = new THREE.Group(); gg.position.set(x, 0, z);
  for (let i = 0; i < 3; i++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), m); const h = rr(0.8, 1.6); cr.scale.set(1, h / 0.5, 1); cr.position.set(rr(-0.25, 0.25), h / 2, rr(-0.2, 0.2)); cr.rotation.set(rr(-0.25, 0.25), rr(0, 3), rr(-0.3, 0.3)); gg.add(cr); }
  g.add(gg);
}
// ---- desert
function cactus(g, x, z, s) {
  const m = std(0x4fae55, 0.6), c = new THREE.Group(); c.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * s, 1.4 * s, 6, 14), m); body.position.y = 0.95 * s; c.add(body);
  for (const sx of [-1, 1]) {
    if (rnd() < 0.25) continue;
    const y = rr(0.8, 1.2) * s;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * s, 0.35 * s, 4, 10), m); arm.rotation.z = Math.PI / 2; arm.position.set(sx * 0.42 * s, y, 0); c.add(arm);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * s, 0.45 * s, 4, 10), m); up.position.set(sx * 0.62 * s, y + 0.3 * s, 0); c.add(up);
  }
  if (rnd() < 0.5) { const f = E3(0.1 * s, 0.07 * s, 0.1 * s, std(0xff6fae, 0.5), 10); f.position.y = 1.9 * s; c.add(f); }
  g.add(shade(c));
}
export function palm(g, x, z, s) {
  const p = new THREE.Group(); p.position.set(x, 0, z);
  const bark = std(0xa8763e, 0.85), lean = rr(-0.15, 0.15);
  for (let i = 0; i < 7; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.19 * s, 0.42 * s, 10), bark); seg.position.set(lean * i * 0.4 * s, (0.21 + i * 0.4) * s, 0); seg.rotation.z = -lean; p.add(seg); }
  const top = V(lean * 2.8 * s, 2.85 * s, 0), leaf = std(0x3fae4a, 0.6);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, l = E3(0.85 * s, 0.07 * s, 0.24 * s, leaf, 14);
    l.position.set(top.x + Math.cos(a) * 0.7 * s, top.y - 0.15 * s, Math.sin(a) * 0.7 * s); l.rotation.set(0, -a, -0.45); p.add(l);
  }
  for (let i = 0; i < 3; i++) { const c = E3(0.12 * s, 0.12 * s, 0.12 * s, std(0x7a4e22), 10); c.position.set(top.x + Math.cos(i * 2.1) * 0.15 * s, top.y - 0.25 * s, Math.sin(i * 2.1) * 0.15 * s); p.add(c); }
  g.add(shade(p)); return p;
}
function signpost(g, x, z, side) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = side * 0.3;
  const wood = std(0x9c6438, 0.8);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.4, 8), wood); post.position.y = 0.7; s.add(post);
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.3, 0.08, 2, 0.04), wood); board.position.set(0.15, 1.15, 0.05); s.add(board);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 3), wood); tip.rotation.z = -Math.PI / 2; tip.position.set(0.68, 1.15, 0.05); s.add(tip);
  g.add(shade(s));
}
function arch(g, x, z, s) {
  const st = std(0xd59a5e, 0.85), a = new THREE.Group(); a.position.set(x, 0, z); a.rotation.y = rr(-0.5, 0.5);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.8 * s, 0.75 * s, 0.8 * s, 2, 0.12), st); b.position.set(sx * 1.1 * s + rr(-0.05, 0.05), (0.38 + i * 0.75) * s, 0); a.add(b); }
  const top = new THREE.Mesh(new RoundedBoxGeometry(3.2 * s, 0.6 * s, 0.9 * s, 2, 0.12), st); top.position.y = 2.55 * s; top.rotation.z = rr(-0.05, 0.05); a.add(top);
  g.add(shade(a));
}
function tent(g, x, z, s) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rr(0, 6);
  const tx = stripeTex('#f4e2c0', pick(['#e86a8a', '#7a9cf0', '#f0b44a']), 6, false).clone(); tx.needsUpdate = true; tx.rotation = Math.PI / 2;
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.2 * s, 1.5 * s, 4, 1), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 })); c.position.y = 0.75 * s; t.add(c);
  const door = new THREE.Mesh(new THREE.ConeGeometry(0.4 * s, 0.9 * s, 3, 1), std(0x5e3616)); door.position.set(0, 0.45 * s, 0.62 * s); t.add(door);
  g.add(shade(t));
}
// ---- space
function glowShroom(g, x, z, s) {
  const m = new THREE.Group(); m.position.set(x, 0, z);
  const c = pick([0x7ff0ff, 0xff8fe0, 0xb6ff8f]);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.7 * s, 10), std(0xe8e0ff, 0.6)); stem.position.y = 0.35 * s; m.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.4 }));
  cap.scale.y = 0.7; cap.position.y = 0.68 * s; m.add(cap);
  g.add(m);
}
function planetTex(a, b) {
  return once('pl' + a + b, () => canvasTex(256, 128, g => { for (let y = 0; y < 128; y += 8) { g.fillStyle = (y / 8) % 2 ? a : b; g.fillRect(0, y, 256, 8 + Math.sin(y) * 3); } }));
}
function planet(parent, x, y, z, r, a, b, ring) {
  const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.z = rr(-0.4, 0.4);
  p.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), new THREE.MeshStandardMaterial({ map: planetTex(a, b), roughness: 0.6, emissive: 0x2a1a4a, emissiveIntensity: 0.4, fog: false })));
  if (ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.35, r * 2.0, 64), new THREE.MeshStandardMaterial({ color: ring, side: THREE.DoubleSide, transparent: true, opacity: 0.8, roughness: 0.5, fog: false })); rg.rotation.x = Math.PI / 2.3; p.add(rg); }
  parent.add(p); return p;
}
function galaxy(parent, x, y, z, s, hue) {
  const t = once('gal' + hue, () => canvasTex(256, 256, g => {
    g.translate(128, 128);
    for (let i = 0; i < 1600; i++) { const arm = i % 2, t = Math.random(), a = t * 7 + arm * Math.PI + (Math.random() - 0.5) * 0.6, r = t * 118;
      g.fillStyle = `hsla(${hue + Math.random() * 40},90%,${70 + Math.random() * 25}%,${0.5 * (1 - t) + 0.1})`; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r * 0.55, Math.random() * 2 + 0.5, 0, Math.PI * 2); g.fill(); }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(1, 'rgba(255,220,240,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
  }));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sp.scale.set(s, s, 1); sp.position.set(x, y, z); parent.add(sp);
}

// ---------------------------------------------------------------- big things far beside the course
// the land beside the course (user 2026-11-23: "맵에 배경들 어울리게 — 집이 나오는게 좀 어색해": things stood on nothing):
// a field on each side at FIELD_Y, a little lower than the path, rolling gently away from it, coloured per world;
// its inner edge drops as a cliff where the course has a gap. Scenery stands ON it.
const FIELD_Y = -1.0;
const FIELD = {
  forest: { top: [0x6bcb4c, 0x86d65c, 0x5cb945], side: [0x8a5a30, 0x6a4020] },
  candy: { top: [0xffb5d6, 0xffc7e0, 0xffa6cc], side: [0x6c3a20, 0x4a2414] },
  snow: { top: [0xf4f9ff, 0xffffff, 0xe2eefb], side: [0x9cc8ee, 0x6aa6dc] },
  desert: { top: [0xf0c072, 0xf6d08c, 0xe4b062], side: [0xc68650, 0xa86a36] },
};
function field(parent, theme, dEnd) {
  const F = FIELD[theme]; if (!F) return;
  const L = dEnd + 140, z0 = 40, W = 90, segX = 36, segZ = Math.round(L / 3);
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(W, L, segX, segZ); geo.rotateX(-Math.PI / 2);
    const p = geo.getAttribute('position'), col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color(F.top[0]), b = new THREE.Color(F.top[1]), d = new THREE.Color(F.top[2]);
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i) + side * (GROUND_W / 2 + W / 2), z = p.getZ(i) + z0 - L / 2;   // world x, z
      const lx = Math.abs(wx) - GROUND_W / 2;                                    // lx: 0 at the course's edge → W away
      const h = fieldY(wx, z) - FIELD_Y;                                         // flat by the course, rolling further out
      p.setY(i, h);
      const t = 0.5 + 0.5 * Math.sin(z * 0.21 + lx * 0.17);
      c.copy(a).lerp(t > 0.5 ? b : d, Math.abs(t - 0.5) * 1.2); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: theme === 'snow' ? 0.6 : 0.9 }));
    m.position.set(side * (GROUND_W / 2 + W / 2), FIELD_Y, z0 - L / 2); m.receiveShadow = true; parent.add(m);
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, L), new THREE.MeshStandardMaterial({ color: F.side[0], roughness: 0.9 }));
    cliff.position.set(side * (GROUND_W / 2 + 0.6), FIELD_Y - 4, z0 - L / 2); parent.add(cliff);
  }
}
/** the field's height at (x, z) for something standing there (the same sum as above) */
function fieldY(x, z) {
  const lx = Math.abs(x) - GROUND_W / 2, rise = Math.min(1, Math.max(0, (lx - 6) / 18));
  return FIELD_Y + rise * (1.4 * Math.sin(z * 0.11 + lx * 0.07) + 1.1 * Math.sin(z * 0.05 - lx * 0.13) + 0.6 * Math.sin(lx * 0.31 + z * 0.19) + 1.2);
}
const onField = (parent, x, z) => { const g = new THREE.Group(); g.position.set(x, fieldY(x, z) - 0.05, z); parent.add(g); return g; };

// animal friends and little set pieces (critters.js) at the near edge of the fields, alternating sides, facing the course
// and the camera; birds / butterflies / saucers circle above. Returns the spots taken so the scenery keeps clear of them.
const FRIENDS = {
  forest: { ground: [[() => C.bunny(), 1.5, 2], [() => C.bunny(0xe0bf94), 1.5, 1], [() => C.pond(), 1.15, 0, 2.2]], fly: [() => C.bird(pick([0x5aa8ff, 0xff8a5a, 0xffd447])), 1.6, 3], flutter: [() => C.butterfly(pick([0xff8cc6, 0x7fd8ff, 0xffd447]), pick([0xffffff, 0xffd447, 0xc59bff])), 1.8, 5] },
  candy: { ground: [[() => C.gummyBear(pick([0xff5f7e, 0x5fd08a, 0xffb43a, 0xa77cff, 0x4fb6ff])), 1.4, 3], [() => C.gumballMachine(), 1.25, 0, 1.2]], flutter: [() => C.butterfly(pick([0xff8cbf, 0xae8cff, 0x63d9ad]), pick([0xffd447, 0xffffff, 0x6fbcff])), 1.8, 5] },
  snow: { ground: [[() => C.penguin(pick([0xff4f6d, 0x4f8fff, 0xffc83a, 0x3fcf9c])), 1.5, 3], [() => C.polarBear(), 1.45, 1], [() => C.igloo(), 1.0, 0, 2.4]] },
  desert: { ground: [[() => C.camel(), 1.3, 1, 1.2], [() => C.meerkats(3), 1.45, 0, 1.3]] },
  space: { rock: [[() => C.alien(pick([0x7be86a, 0xc59bff, 0x6fd8ff])), 1.5, 2], [() => C.rocket(), 1.0, 0, 1]], fly: [() => C.ufo(), 1.6, 3] },
};
function friends(parent, theme, dEnd) {
  const F = FRIENDS[theme], spots = []; if (!F) return spots;
  const faceYaw = side => (SIDE ? Math.PI / 2 + rr(-0.35, 0.35) : -side * rr(0.45, 0.85));   // toward the course and the camera
  let n = 0;
  for (let d = 4; d < dEnd + 6; d += rr(12, 17), n++) {
    const side = SIDE ? -1 : (n % 2 ? 1 : -1), list = F.ground || F.rock, [make, s, crowd = 0, big = 0] = list[n % list.length];
    const x = side * (rr(9.8, 11.2) + big), z = -d;
    let g;
    if (F.rock) { g = C.spaceRock(1.3 + 0.8 * crowd * 0.5 + big * 0.4); g.position.set(x + side * 1.6, rr(-0.6, 1.0), z); g.userData.cr = { k: 'float', y0: g.position.y, yaw: 0, w: 1 }; parent.add(g); }
    else g = onField(parent, x, z);
    const yaw = faceYaw(side);
    for (let i = 0; i <= crowd; i++) {                                                     // a little crowd of friends
      const o = make(), off = crowd ? (i - crowd / 2) * 1.25 : 0;
      o.scale.setScalar(s * (i && crowd ? rr(0.8, 0.95) : 1)); o.rotation.y = yaw + rr(-0.25, 0.25);
      o.position.set(Math.cos(yaw) * off, 0, -Math.sin(yaw) * off + (crowd ? rr(-0.4, 0.4) : 0));
      if (crowd && !F.rock) o.position.y = fieldY(x + o.position.x, z + o.position.z) - fieldY(x, z);
      g.add(o);
    }
    spots.push([g.position.x, z, 1.4 + crowd * 0.6 + big * 1.4]);
  }
  for (const key of ['fly', 'flutter']) {                                              // birds / butterflies / saucers
    if (!F[key]) continue;
    const [make, s, count] = F[key];
    for (let i = 0; i < count; i++) {
      const o = make(), side = SIDE ? -1 : (i % 2 ? 1 : -1), c = o.userData.cr;
      o.scale.setScalar(s);
      const d = rr(8, dEnd - 4);
      Object.assign(c, key === 'fly' ? { cx: side * rr(12, 16), cy: theme === 'space' ? rr(3.5, 7) : rr(4.5, 7.5), cz: -d, r: rr(3, 5) }
        : { cx: side * rr(9.8, 12), cy: FIELD_Y + rr(1.3, 2.1), cz: -d });
      parent.add(o);
    }
  }
  return spots;
}

export function backdrop(parent, theme, dEnd) {
  const zs = []; for (let d = -10; d < dEnd + 30; d += rr(9, 13)) zs.push(-d);
  field(parent, theme, dEnd);
  const spots = friends(parent, theme, dEnd), busy = (x, z) => spots.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + 2.2);
  if (theme === 'forest') {
    for (const z of zs) for (const side of SIDES()) {
      const x = side * rr(12, 22); if (busy(x, z)) continue; const g = onField(parent, x, z), k = rnd();
      if (k < 0.4) { E.tree(g, 0, 0, rr(1.6, 2.4)); E.bush(g, rr(1.2, 2), rr(-1, 1), rr(1, 1.4)); }
      else if (k < 0.62) { mushroom(g, 0, 0, rr(1.6, 2.6)); mushroom(g, rr(1.4, 2.2), rr(-1, 1), rr(0.8, 1.2)); }
      else if (k < 0.8) pipe(g, 0, 0, rr(1.4, 2)); else { E.tree(g, 0, 0, rr(1.3, 1.8)); E.tree(g, rr(-2.5, -1.5), rr(-1.5, 1.5), rr(1.1, 1.5)); }
    }
    waterfall(parent, far(15), fieldY(15, -38) - 0.2, -38); waterfall(parent, -16, fieldY(16, -84) - 0.2, -84);
  } else if (theme === 'candy') {
    // the chocolate river runs along the far field; chocolate hills, giant sweets and gumdrops stand on the frosting
    const river = new THREE.Mesh(new THREE.PlaneGeometry(9, dEnd + 120), gloss(0x5a2e1a, { roughness: 0.18, clearcoat: 1 }));
    river.rotation.x = -Math.PI / 2; river.position.set(-19, FIELD_Y + 0.06, -dEnd / 2 + 20); river.name = 'river'; parent.add(river);
    for (const z of zs) for (const side of SIDES()) {
      const x = side * (side < 0 ? rr(25, 34) : rr(12, 22)); if (busy(x, z)) continue; const g = onField(parent, x, z), k = rnd();
      if (k < 0.3) chocHill(g, rr(-2, 2), 0, rr(0.9, 1.4));
      else if (k < 0.5) { const c = new THREE.Group(); E.lollipop(c, rr(2.4, 3.2)); g.add(shade(c)); }
      else if (k < 0.68) { const c = new THREE.Group(); E.cupcake(c, rr(2.2, 3)); g.add(shade(c)); }
      else if (k < 0.82) candyCane(g, 0, 0, rr(2.2, 3), side);
      else E.bush(g, 0, 0, rr(2, 2.8));                                          // a heap of gumdrops
    }
    if (!SIDE) for (const z of zs.filter((_, i) => i % 2)) { const x = rr(-16, -12); if (busy(x, z)) continue; const g = onField(parent, x, z); E.bush(g, 0, 0, rr(1.4, 1.8)); }   // gumdrops by the river
  } else if (theme === 'snow') {
    for (const z of zs) for (const side of SIDES()) {
      const x = side * rr(12, 22); if (busy(x, z)) continue; const g = onField(parent, x, z), k = rnd();
      if (k < 0.3) cabin(g, 0, 0, rr(1.1, 1.4)); else if (k < 0.75) { pine(g, 0, 0, rr(1.8, 2.6)); pine(g, rr(-2.5, 2.5), rr(-2, 2), rr(1.4, 2)); } else snowman(g, 0, 0, rr(1.4, 1.8), side);
    }
    for (let d = 20; d < dEnd + 80; d += rr(26, 40)) for (const side of [-1, 1]) mountain(parent, far(side * rr(42, 65)), -d - 30, rr(14, 24));
  } else if (theme === 'desert') {
    for (const z of zs) for (const side of SIDES()) {
      const x = side * rr(12, 22); if (busy(x, z)) continue; const g = onField(parent, x, z), k = rnd();
      if (k < 0.3) arch(g, 0, 0, rr(1.2, 1.6)); else if (k < 0.55) { palm(g, 0, 0, rr(1.4, 1.8)); palm(g, 1.5, 1, rr(1.1, 1.5)); } else if (k < 0.75) tent(g, 0, 0, rr(1.2, 1.6)); else { cactus(g, 0, 0, rr(1.5, 2)); cactus(g, rr(1.2, 2), rr(-1, 1), rr(0.9, 1.3)); }
    }
    for (let d = 25; d < dEnd + 80; d += rr(30, 45)) for (const side of [-1, 1]) pyramid(parent, far(side * rr(45, 70)), -d - 30, rr(14, 22));
    oasis(parent, -15, fieldY(-15, -60) + 0.05, -60);
  } else {
    const cols = [['#e8a25e', '#c4743c', 0xf2d6a8], ['#8f7cff', '#6a54d8', null], ['#ff8fbf', '#d9609a', 0xffc8e0], ['#7fd0ff', '#4a9be0', null], ['#ffd36b', '#e8a02a', 0xfff0c0]];
    let k = 0;
    for (let d = 10; d < dEnd + 40; d += rr(18, 28)) { const [a, b, ring] = cols[k++ % cols.length]; planet(parent, far((k % 2 ? -1 : 1) * rr(24, 40)), rr(6, 20), -d, rr(3, 7), a, b, ring); }
    for (let d = 20; d < dEnd + 60; d += rr(30, 45)) galaxy(parent, SIDE ? rr(-70, -40) : rr(-50, 50), rr(18, 40), SIDE ? -d : -d - 60, rr(30, 50), (d * 7) % 360);
    for (const z of zs) for (const side of SIDES()) { const x = side * rr(10, 24); if (busy(x, z)) continue; const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(0.8, 2.2), 0), std(0x5e508a, 0.9, { flatShading: true })); r.position.set(x, rr(-3, 8), z); r.rotation.set(rr(0, 3), rr(0, 3), 0); r.userData.spin = rr(-0.3, 0.3); r.name = 'asteroid'; parent.add(r); }
  }
}
function mountain(parent, x, z, s) {
  const m = new THREE.Group(); m.position.set(x, FIELD_Y - 1, z);
  const body = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.3, 7, 1), std(0x9cc0e8, 0.9, { flatShading: true })); body.position.y = s * 0.65; m.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(s * 0.45, s * 0.6, 7, 1), std(0xffffff, 0.9, { flatShading: true })); cap.position.y = s * 1.3 - s * 0.3 + 0.01; m.add(cap);
  parent.add(m);
}
function pyramid(parent, x, z, s) {
  const p = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.95, 4, 1), std(0xe8bc7a, 0.9, { flatShading: true })); p.rotation.y = Math.PI / 4; p.position.set(x, s * 0.475 + FIELD_Y - 0.5, z); parent.add(p);
}
function oasis(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), gloss(0x3ec6e8, { roughness: 0.1 })); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.7; g.add(pool);
  for (let i = 0; i < 4; i++) { const lp = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16, 0.3, Math.PI * 1.8), std(0x5fc96a)); lp.rotation.x = -Math.PI / 2; lp.position.set(rr(-3, 3), 0.02, rr(-2, 2)); g.add(lp); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rock(g, Math.cos(a) * 4.7, Math.sin(a) * 3.3, 0xc68650); }
  palm(g, -4, -2.5, 1.6); palm(g, 3.5, -3, 1.4); palm(g, 4.6, 1.5, 1.2);
  parent.add(g);
}
function waterfall(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const cliff = new THREE.Mesh(new RoundedBoxGeometry(6, 9, 4, 3, 0.6), std(0x8e6a48, 0.9)); cliff.position.y = 2.5; g.add(cliff);
  const capM = std(0x6bcb4c, 0.8); const cap = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.6, 4.4, 3, 0.25), capM); cap.position.y = 7.1; g.add(cap);
  const t = once('fall', () => { const tx = canvasTex(64, 256, c => { c.fillStyle = '#7fd4ff'; c.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(Math.random() * 64, Math.random() * 256, 3, 20 + Math.random() * 40); } }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx; });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 8.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.92 })); water.position.set(-0.5, 2.6, 2.05); water.name = 'falls'; g.add(water);
  for (let i = 0; i < 6; i++) { const f = E3(rr(0.4, 0.7), 0.3, 0.4, std(0xffffff, 1, { transparent: true, opacity: 0.85 }), 10); f.position.set(-0.5 + rr(-1.2, 1.2), -1.8, 2.3 + rr(0, 0.5)); g.add(f); }
  parent.add(shade(g, false, true));
}

// ---------------------------------------------------------------- a rainbow over the start (forest; the intro video's title)
export function rainbow(parent, z) {
  const cols = [0xff5a5a, 0xff9a3c, 0xffe05a, 0x6fdc6a, 0x4fb3ff, 0x8a6cff];
  const g = new THREE.Group(); g.position.set(SIDE ? -26 : 0, -2, z); if (SIDE) g.rotation.y = Math.PI / 2;
  cols.forEach((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(15 - i * 0.9, 0.48, 10, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, fog: false })); g.add(r); });
  parent.add(g); return g;
}

// ---------------------------------------------------------------- under the course
export function below(parent, theme, dEnd) {
  if (theme === 'candy') {                                     // a chocolate sea under the gaps
    const choc = new THREE.Mesh(new THREE.PlaneGeometry(200, dEnd + 120), gloss(0x5a2e1a, { roughness: 0.2 }));
    choc.rotation.x = -Math.PI / 2; choc.position.set(0, -7, -dEnd / 2); parent.add(choc);
  } else if (theme !== 'space') clouds(parent, dEnd, true);
  if (theme !== 'space') clouds(parent, dEnd, false);
}
/** clouds for a course running into the screen: a sea far below, and puffy ones high up off to the sides */
function clouds(parent, dEnd, sea) {
  const puffs = [];
  const cloud = (x, y, z, s, n = 6) => {
    for (let i = 0; i < n; i++) {
      const a = i / (n - 1) - 0.5, r = s * (0.5 + 0.5 * Math.cos(a * Math.PI)) * rr(0.82, 1.08);
      puffs.push(new THREE.Matrix4().compose(V(x + a * s * 2.5, y + r * 0.32, z + rr(-0.3, 0.3) * s), new THREE.Quaternion(), V(r, r * 0.8, r)));
    }
    puffs.push(new THREE.Matrix4().compose(V(x, y + s * 0.05, z), new THREE.Quaternion(), V(s * 1.45, s * 0.38, s * 0.62)));
  };
  if (sea) for (let d = -30; d < dEnd + 60; d += rr(6, 10)) for (let x = -70; x < 70; x += rr(14, 22)) cloud(x + rr(-4, 4), rr(-19, -14), -d, rr(5, 9), 5);
  else for (let d = -20; d < dEnd + 80; d += rr(14, 22)) for (const side of [-1, 1]) cloud(far(side * rr(24, 60)), rr(14, 32), -d - rr(0, 30), rr(4, 8));
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: E.TH.cloud[0], roughness: 1, emissive: E.TH.cloud[1], emissiveIntensity: E.TH.cloud[2] }), puffs.length);
  puffs.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
  parent.add(im);
}

// ---------------------------------------------------------------- platforms you jump on
/** a step / bridge between the ground blocks, in the world's style; local y = 0 is the top, w (x) × d (z) */
export function step(parent, w, d, theme) {
  const g = new THREE.Group();
  if (theme === 'snow') {                                      // an ice bridge
    const m = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.88 });
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.7, d, 3, 0.2), m); b.position.y = -0.35; g.add(b);
    const s = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, 0.22, d + 0.1, 3, 0.1), std(0xffffff, 0.9)); s.position.y = -0.02; s.scale.set(0.92, 1, 0.9); g.add(s);
    for (let x = -w / 2 + 0.3; x < w / 2; x += 0.45) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, rr(0.4, 0.9), 8), m); c.rotation.x = Math.PI; c.position.set(x, -0.9, d / 2 - 0.15); g.add(c); }
  } else if (theme === 'candy') {                              // a slice of layer cake
    const layers = [[0x6c3a20, 0.3], [0xf6e6d0, 0.08], [0x8a4a26, 0.3]];
    let y = -0.68;
    for (const [c, h] of layers) { const l = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), std(c, 0.7)); l.position.y = y + h / 2; g.add(l); y += h; }
    const ice = new THREE.Mesh(new RoundedBoxGeometry(w + 0.08, 0.12, d + 0.08, 2, 0.05), gloss(0xffb5d6)); ice.position.y = -0.04; g.add(ice);
  } else if (theme === 'desert') {                             // a sandstone block
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.9, d, 3, 0.18), std(0xdca468, 0.85)); b.position.y = -0.45; g.add(b);
  } else if (theme === 'space') {                              // a glowing star platform
    const b = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(w, d) / 2, Math.max(w, d) / 2 * 0.8, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x8b6cff, emissive: 0x6d5fd6, emissiveIntensity: 0.8, roughness: 0.3 }));
    b.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); b.position.y = -0.25; g.add(b);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, d) / 2, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0x9ff2ff, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.scale.set(w / Math.max(w, d), d / Math.max(w, d), 1); g.add(rim);
  } else {                                                     // forest: a mossy log raft / stone
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.8, d, 3, 0.25), std(0x9a8f84, 0.85)); b.position.y = -0.4; g.add(b);
    const moss = new THREE.Mesh(new RoundedBoxGeometry(w + 0.06, 0.2, d + 0.06, 3, 0.09), std(0x6bcb4c, 0.8)); moss.position.y = -0.04; g.add(moss);
  }
  parent.add(shade(g));
  return g;
}
/** a moving platform: the step + something that carries it (a balloon in forest / candy, a magic carpet's tassels in the
 *  desert, a UFO ring in space, nothing on an ice floe) */
export function lift(parent, w, d, theme) {
  const g = new THREE.Group();
  if (theme === 'desert') {                                    // a flying carpet
    const t = stripeTex('#c8324a', '#f0b44a', 8, false).clone(); t.needsUpdate = true;
    const c = new THREE.Mesh(new RoundedBoxGeometry(w, 0.12, d, 2, 0.05), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); c.position.y = -0.06; g.add(c);
    for (const sx of [-1, 1]) for (let z = -d / 2; z <= d / 2; z += 0.35) { const ts = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), std(0xf0b44a)); ts.position.set(sx * (w / 2 + 0.05), -0.12, z); ts.rotation.z = sx * 1.6; g.add(ts); }
  } else {
    g.add(step(new THREE.Group(), w, d, theme));
    if (theme === 'space') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, d) * 0.62, 0.12, 10, 48), new THREE.MeshStandardMaterial({ color: 0xc8c8e8, metalness: 0.6, roughness: 0.3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -0.4; g.add(ring);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe066 : 0x7ff0ff, toneMapped: false })); l.position.set(Math.cos(a) * Math.max(w, d) * 0.62, -0.4, Math.sin(a) * Math.max(w, d) * 0.62); g.add(l); }
    } else if (theme === 'forest' || theme === 'candy') {
      const bal = E.liftBalloon(new THREE.Group(), w, ...(theme === 'candy' ? ['#ff8fbf', '#ffffff'] : ['#ffd34d', '#4fb3ff']));
      bal.children.filter(c => c.type === 'Group' && c.children.length === 1).forEach(c => bal.remove(c));   // (keep only the envelope + ropes)
      g.add(bal);
    }
  }
  parent.add(shade(g));
  return g;
}
/** a bouncy thing (forest: a big red mushroom; candy: a jelly drum) — local y = 0 is its top */
export function bouncer(parent, theme) {
  if (theme === 'candy') return E.bouncePad(parent);
  const g = new THREE.Group();
  const m = mushroom(g, 0, 0, 1.4, '#ff4a4a'); m.position.y = -1.32;
  const cap = m.children[1]; cap.name = 'jelly';
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------- falling snow (snow world), carried with the camera
export const snowfall = (() => {
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([rr(-30, 30), rr(-5, 25), rr(-40, 10)], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.25, map: tex, transparent: true, depthWrite: false }));
  p.frustumCulled = false; p.visible = false; E.scene.add(p);
  return p;
})();
export function updateWorld(dt, T, root, camPos) {
  if (snowfall.visible) {
    const a = snowfall.geometry.getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * 1.6, x = a.getX(i) + Math.sin(T + i) * dt * 0.3;
      if (y < -5) y += 30;
      a.setXYZ(i, x, y, a.getZ(i));
    }
    a.needsUpdate = true;
    snowfall.position.set(camPos.x, camPos.y - 5, camPos.z - 12);
  }
  if (root && !root.userData.anim) {                           // (collected once per level, not searched every frame)
    const a = root.userData.anim = []; root.traverse(o => { if (o.name === 'falls' || o.name === 'asteroid' || o.name === 'smoke' || o.userData.cr) a.push(o); });
  }
  for (const o of root?.userData.anim || []) {
    if (o.userData.cr) C.updateCritter(o, T);
    else if (o.name === 'falls') o.material.map.offset.y -= dt * 1.2;
    else if (o.name === 'asteroid') { o.rotation.x += dt * o.userData.spin; o.rotation.y += dt * o.userData.spin * 0.7; }
    else { for (const p of o.children) { p.position.y = (p.position.y + dt * 0.4) % 1.2; p.material.opacity = 0.8 * (1 - p.position.y / 1.2); } }
  }
}

// ---------------------------------------------------------------- the start pad, one per world (user 2026-11-23: "맵 모드에 맞게
// 출발 지점도 디자인 같은 무드로"): forest = a grassy ring with a log rim and a checkered start strip, candy = a round layer
// cake with frosting and a candy-cane rim, snow = an ice rink with a rim of snowballs, desert = a sandstone plaza with a
// sun mosaic and a stone-block rim, space = the neon pad. Local y = 0 is the top; arrows on top point down the course.
function padTex(theme) {
  return once('pad' + theme, () => canvasTex(1024, 1024, g => {
    const S = 1024, c = S / 2;
    const ring = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); };
    const arrows = (col, y0) => { g.fillStyle = col; for (let i = 0; i < 2; i++) { const y = y0 - i * 60; g.beginPath(); g.moveTo(c - 70, y + 40); g.lineTo(c, y - 20); g.lineTo(c + 70, y + 40); g.lineTo(c + 70, y + 80); g.lineTo(c, y + 20); g.lineTo(c - 70, y + 80); g.closePath(); g.fill(); } };
    if (theme === 'forest') {
      const gr = g.createRadialGradient(c, c, 40, c, c, c); gr.addColorStop(0, '#8fdc63'); gr.addColorStop(1, '#5fbd45');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(40,110,30,${0.15 + Math.random() * 0.2})`; g.lineWidth = 3; const x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.random() * 6 - 3, y - 10 - Math.random() * 8); g.stroke(); }
      ring(c * 0.62, 'rgba(255,255,255,.5)', 14);
      const cols = ['#ff7fae', '#ffffff', '#ffd447', '#b79bff'];
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = c * 0.78; g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe066'; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 4, 0, Math.PI * 2); g.fill(); }
      for (let y = 0; y < 3; y++) for (let x = 0; x < 10; x++) { g.fillStyle = (x + y) % 2 ? '#2b2b3a' : '#f6f6f6'; g.fillRect(c - 250 + x * 50, 60 + y * 50, 50, 50); }   // the start strip (far side)
      arrows('rgba(255,255,255,.85)', c + 40);
    } else if (theme === 'candy') {
      g.fillStyle = '#ffb5d6'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; g.fillStyle = '#fff3f8'; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86, 46, 0, Math.PI * 2); g.fill(); }   // whipped-cream dollops
      ring(c * 0.55, '#ff8fbf', 18); ring(c * 0.3, '#fff3f8', 30);
      const sp = ['#ff7fb0', '#7fd8ff', '#ffe066', '#9cf0a8', '#c59bff', '#ffffff'];
      for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * c * 0.78; g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(Math.random() * 3); g.fillStyle = sp[i % sp.length]; g.beginPath(); g.roundRect(-11, -4, 22, 8, 4); g.fill(); g.restore(); }
      arrows('#ff5f9e', c + 40);
    } else if (theme === 'snow') {
      const gr = g.createRadialGradient(c, c, 30, c, c, c); gr.addColorStop(0, '#e8f6ff'); gr.addColorStop(0.75, '#bfe3fb'); gr.addColorStop(1, '#a9d6f6');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4;
      for (let i = 0; i < 30; i++) { g.beginPath(); const a = Math.random() * 6.28; g.arc(c + Math.cos(a) * 200, c + Math.sin(a) * 200, 120 + Math.random() * 200, a, a + 0.8 + Math.random()); g.stroke(); }   // skate marks
      const flake = (x, y, r) => { g.save(); g.translate(x, y); g.strokeStyle = '#ffffff'; g.lineWidth = r / 6; g.lineCap = 'round'; for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, r); g.moveTo(0, r * 0.55); g.lineTo(r * 0.25, r * 0.75); g.moveTo(0, r * 0.55); g.lineTo(-r * 0.25, r * 0.75); g.stroke(); } g.restore(); };
      flake(c, c, 120); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; flake(c + Math.cos(a) * c * 0.7, c + Math.sin(a) * c * 0.7, 40); }
      ring(c * 0.5, 'rgba(110,190,240,.55)', 10);
      arrows('rgba(80,160,230,.75)', c - 170);
    } else {                                                                     // desert
      g.fillStyle = '#e8bf82'; g.fillRect(0, 0, S, S);
      for (let ri = 0; ri < 7; ri++) {                                           // stone tiles in rings
        const r0 = 70 + ri * 62, n = 8 + ri * 7;
        for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2 - 0.02;
          g.fillStyle = ['#f0cf96', '#e2b678', '#f5d9a6'][(k + ri) % 3]; g.beginPath(); g.arc(c, c, r0 + 56, a0, a1); g.arc(c, c, r0, a1, a0, true); g.closePath(); g.fill(); }
      }
      g.fillStyle = '#f2a93b'; g.beginPath(); g.arc(c, c, 60, 0, Math.PI * 2); g.fill();          // the sun in the middle
      g.fillStyle = '#ffd36b'; for (let k = 0; k < 12; k++) { g.save(); g.translate(c, c); g.rotate(k / 12 * Math.PI * 2); g.beginPath(); g.moveTo(-18, -70); g.lineTo(0, -120); g.lineTo(18, -70); g.fill(); g.restore(); }
      arrows('#c77a2e', c - 190);
    }
  }));
}
export function startPad(parent, R, theme) {
  if (theme === 'space') return E.stage(parent, R);
  const g = new THREE.Group();
  const side = { forest: 0x8a5a30, candy: 0x6c3a20, snow: 0x8fc8f0, desert: 0xc68650 }[theme];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.94, 1.5, 72), std(side, 0.8)); body.position.y = -0.76;
  const top = new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 72), new THREE.MeshStandardMaterial({ map: padTex(theme), roughness: theme === 'snow' ? 0.25 : 0.7 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.004;
  g.add(shade(body, false, true), shade(top, false, true));
  if (theme === 'candy') {                                                       // a cake: a cream layer, frosting drips, a candy-cane rim
    const cream = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.985, R * 0.97, 0.18, 72), std(0xf6e6d0, 0.6)); cream.position.y = -0.7; g.add(cream);
    const ice = gloss(0xffb5d6);
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, rr(0.15, 0.45), 4, 8), ice); d.position.set(Math.cos(a) * (R + 0.02), -0.28 - rr(0, 0.12), Math.sin(a) * (R + 0.02)); g.add(d); }
    const t = stripeTex('#ffffff', '#ff3b4e', 4).clone(); t.needsUpdate = true; t.repeat.set(40, 1);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.24, 14, 120), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.06; g.add(rim);
  } else if (theme === 'forest') {                                               // a log ring with grass tufts
    const logT = once('bark', () => { const t = canvasTex(256, 32, c => { c.fillStyle = '#8a5a30'; c.fillRect(0, 0, 256, 32); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(60,30,10,${Math.random() * 0.4})`; c.fillRect(Math.random() * 256, Math.random() * 32, 10 + Math.random() * 20, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.3, 14, 120), new THREE.MeshStandardMaterial({ map: logT, roughness: 0.85 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.08; g.add(rim);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const b = E3(0.28, 0.2, 0.28, std(0x5cb945, 0.8), 10); b.position.set(Math.cos(a) * (R + 0.15), 0.25, Math.sin(a) * (R + 0.15)); g.add(b); }
  } else if (theme === 'snow') {                                                 // snowballs round the rink
    const snow = std(0xffffff, 0.85);
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; const b = E3(rr(0.32, 0.42), rr(0.26, 0.34), rr(0.32, 0.42), snow, 14); b.position.set(Math.cos(a) * R, 0.1, Math.sin(a) * R); g.add(b); }
    const ice = new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, L = rr(0.4, 1.0); const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, L, 8), ice); c.rotation.x = Math.PI; c.position.set(Math.cos(a) * R * 0.96, -1.5 - L / 2, Math.sin(a) * R * 0.96); g.add(c); }
  } else {                                                                       // sandstone blocks round the plaza, two little palms
    const st = std(0xd59a5e, 0.85);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const b = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.42, 0.5, 2, 0.1), st); b.position.set(Math.cos(a) * R, 0.15, Math.sin(a) * R); b.rotation.y = -a + Math.PI / 2; g.add(b); }
    for (const [x, z] of [[-R * 0.72, R * 0.45], [R * 0.75, R * 0.4]]) { const p = palm(g, x, z, 0.85); p.position.y = 0.0; }
  }
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------- the goal gate, dressed for each world (user 2026-11-23:
// "문들도 맵 무드에 맞게"): the same size and swirl as before, a frame made of the world's own stuff, a swirl in the
// world's colours and its own ornament on top (it lights up and spins faster once all the pictures are in — game.js)
const GATE_SWIRL = {
  forest: [[0.36, 0.86, 0.42], [1.0, 0.86, 0.3]],
  candy: [[1.0, 0.36, 0.86], [0.32, 0.88, 1.0]],
  snow: [[0.36, 0.8, 1.0], [0.84, 0.78, 1.0]],
  desert: [[0.12, 0.8, 0.76], [1.0, 0.74, 0.28]],
  space: [[0.62, 0.34, 1.0], [0.3, 0.95, 1.0]],
};
export function gate(parent, theme) {
  const g = new THREE.Group(), R = 2.7, H = 2.6;
  const star = new THREE.Group(); star.position.y = H + R + 1.0;
  const starM = (GATE_FRAME[theme] || GATE_FRAME.forest)(g, R, H, star);
  g.add(star); shade(g, true, true);
  const U = E.portal(g, R - 0.6, H, ...(GATE_SWIRL[theme] || GATE_SWIRL.candy));
  parent.add(g);
  return { group: g, U, star, starM, H, R };
}
const along = (R, H, a, r = R) => [Math.cos(a) * r, H + Math.sin(a) * r];   // a point on the arch at angle a (0 right → π left)
function chubbyStar(m, r = 0.55) {
  const geo = once('gstar', () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? 0.5 : 1; i ? s.lineTo(Math.cos(a) * q, Math.sin(a) * q) : s.moveTo(Math.cos(a) * q, Math.sin(a) * q); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 5, curveSegments: 4 }); g.center(); return g;
  });
  const o = new THREE.Mesh(geo, m); o.scale.setScalar(r); return o;
}
/** voussoirs: n blocks round the arch; mk(i) → a mesh whose local x runs along the arch and local y outward */
function blocksRound(g, R, H, n, mk) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (i + 0.5) / n, b = mk(i, a); const [x, y] = along(R, H, a);
    b.position.set(x, y, 0); b.rotation.z = a - Math.PI / 2; g.add(b);
  }
}
const GATE_FRAME = {
  // FOREST: two tree trunks with roots and ivy, a log arch overgrown with leaves and flowers, mushrooms at the feet
  forest(g, R, H, top) {
    const barkV = once('barkV', () => { const t = canvasTex(64, 128, c => { c.fillStyle = '#93602f'; c.fillRect(0, 0, 64, 128); for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(70,36,12,${0.25 + Math.random() * 0.35})`; c.fillRect(Math.random() * 64, Math.random() * 128, 3 + Math.random() * 3, 20 + Math.random() * 50); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; });
    const bark = new THREE.MeshStandardMaterial({ map: barkV, roughness: 0.85 });
    const logT = barkV.clone(); logT.needsUpdate = true; logT.rotation = Math.PI / 2; logT.repeat.set(1, 12);
    const leafM = [std(0x4fb83e, 0.75), std(0x6fcf4c, 0.75), std(0x3fa23a, 0.75)];
    for (const sx of [-1, 1]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, H + 0.3, 20), bark); trunk.position.set(sx * R, (H + 0.3) / 2 - 0.05, 0); g.add(trunk);
      for (let i = 0; i < 5; i++) {                                                  // roots spreading into the ground
        const a = i / 5 * Math.PI * 2 + 0.3, root = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 4, 10), bark);
        root.position.set(sx * R + Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62); root.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); g.add(root);
      }
      for (let i = 0; i < 11; i++) {                                                 // ivy spiralling up the trunk
        const a = i * 1.15 + (sx > 0 ? 0 : 1.6), y = 0.35 + i * 0.21, rad = 0.6 - y * 0.05;
        const l = E3(0.17, 0.11, 0.08, leafM[i % 3], 10); l.position.set(sx * R + Math.cos(a) * rad, y, Math.sin(a) * rad); l.rotation.set(0, -a, 0.6); g.add(l);
      }
      mushroom(g, sx * (R + 1.05), 0.55, 0.75, sx < 0 ? '#ff4a4a' : '#a767ff'); mushroom(g, sx * (R + 0.6), 1.05, 0.48, '#ff7fb0');
    }
    const log = new THREE.Mesh(new THREE.TorusGeometry(R, 0.42, 16, 60, Math.PI), new THREE.MeshStandardMaterial({ map: logT, roughness: 0.85 })); log.position.y = H; g.add(log);
    for (let i = 0; i < 9; i++) {                                                    // leafy clumps over the log
      const a = Math.PI * (i + 0.5) / 9 + rr(-0.05, 0.05), [x, y] = along(R, H, a, R + rr(0.12, 0.3));
      for (let k = 0; k < 2; k++) { const l = E3(rr(0.42, 0.6), rr(0.34, 0.46), rr(0.4, 0.55), leafM[(i + k) % 3], 16); l.position.set(x + rr(-0.15, 0.15), y + rr(-0.1, 0.15), k ? -0.2 : 0.22); g.add(l); }
    }
    const pet = [std(0xff8fc0, 0.5), std(0xffffff, 0.5), std(0xffd447, 0.5)], mid = std(0xffc21f, 0.45);
    for (let i = 0; i < 8; i++) {                                                    // little flowers on the leaves (front)
      const a = Math.PI * (i + 0.5) / 8 + rr(-0.08, 0.08), [x, y] = along(R, H, a, R + rr(0.3, 0.55)), f = new THREE.Group();
      f.position.set(x, y, 0.62); f.rotation.z = rr(0, 1);
      for (let k = 0; k < 5; k++) { const p = E3(0.1, 0.065, 0.04, pet[i % 3], 8); const b = k / 5 * Math.PI * 2; p.position.set(Math.cos(b) * 0.1, Math.sin(b) * 0.1, 0); p.rotation.z = b; f.add(p); }
      const c = E3(0.06, 0.06, 0.05, mid, 8); c.position.z = 0.03; f.add(c); g.add(f);
    }
    const crown = E3(0.75, 0.42, 0.6, leafM[1], 18); crown.position.y = H + R + 0.38; g.add(crown);   // a leafy nest for the star
    const starM = new THREE.MeshPhysicalMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.15, roughness: 0.3, clearcoat: 1 });
    top.add(chubbyStar(starM, 0.58));
    return starM;
  },
  // CANDY: candy-cane columns on chocolate bases, a glazed pink donut arch with sprinkles and cream pearls, a lollipop
  candy(g, R, H, top) {
    const t = stripeTex('#ffffff', '#ff3b4e', 4).clone(); t.needsUpdate = true; t.repeat.set(2, 2.2);
    const cane = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1 });
    const choc = gloss(0x6c3a20, { roughness: 0.35 }), cream = gloss(0xfffaf4);
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, H, 28), cane); col.position.set(sx * R, H / 2, 0); g.add(col);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.86, 0.42, 28), choc); base.position.set(sx * R, 0.21, 0); g.add(base);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, rr(0.06, 0.18), 4, 8), cream); d.position.set(sx * R + Math.cos(a) * 0.8, 0.36, Math.sin(a) * 0.8); g.add(d); }
      const gum = new THREE.Group(); E.bush(gum, 0, 0, 0.55); gum.position.set(sx * (R + 1.0), 0, 0.5); g.add(gum);
    }
    const glaze = E.candyM(0xff8cc6);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(R, 0.56, 20, 72, Math.PI), glaze); arch.position.y = H; g.add(arch);
    const dough = new THREE.Mesh(new THREE.TorusGeometry(R, 0.5, 16, 72, Math.PI), std(0xe0a060, 0.7)); dough.position.set(0, H, -0.12); g.add(dough);
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const a = rr(0.08, Math.PI - 0.08), tu = rr(-0.2, 2.2), r = 0.58, rad = R + Math.cos(tu) * r;
      pts.push([Math.cos(a) * rad, H + Math.sin(a) * rad, Math.sin(tu) * r]);
    }
    g.add(E.sprinkleMesh(pts, 1.6));
    for (let i = 0; i < 17; i++) { const [x, y] = along(R, H, Math.PI * (i + 0.5) / 17, R + 0.56); const p = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), cream); p.position.set(x, y, 0.18); g.add(p); }
    const face = new THREE.MeshStandardMaterial({ map: E.swirlTex2('#ff5f9e', '#ffffff'), emissive: 0x9a7a88, emissiveMap: E.swirlTex2('#ff5f9e', '#ffffff'), emissiveIntensity: 0.15, roughness: 0.25 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 36), [E.candyM(0xff8cbf), face, face]); disc.rotation.x = Math.PI / 2; disc.position.y = 0.2; top.add(disc);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), std(0xfffaf2, 0.35)); stick.position.y = -0.55; top.add(stick);
    return face;
  },
  // SNOW: stacked ice blocks, an ice-block arch under a snow cap with icicles, snow heaps at the feet, a snowflake
  snow(g, R, H, top) {
    const ice = [gloss(0xc9ecff, { transparent: true, opacity: 0.94 }), gloss(0xa9dcff, { transparent: true, opacity: 0.94 })];
    const snow = std(0xffffff, 0.85);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new RoundedBoxGeometry(1.2, H / 3 - 0.04, 1.2, 3, 0.14), ice[(i + (sx > 0)) % 2]); b.position.set(sx * R + rr(-0.05, 0.05), (i + 0.5) * H / 3, 0); b.rotation.y = rr(-0.08, 0.08); g.add(b); }
      for (let k = 0; k < 4; k++) { const h = E3(rr(0.45, 0.75), rr(0.3, 0.45), rr(0.45, 0.7), snow, 14); h.position.set(sx * (R + rr(0.3, 1.1)), 0.05, rr(-0.6, 0.7)); g.add(h); }
    }
    blocksRound(g, R, H, 9, i => new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.0, 1.2, 3, 0.14), ice[i % 2]));
    for (let i = 0; i < 12; i++) {                                                   // the snow cap on top of the arch
      const a = Math.PI * (0.1 + 0.8 * i / 11), [x, y] = along(R, H, a, R + 0.5); const c = E3(rr(0.42, 0.55), 0.24, 0.66, snow, 14);
      c.position.set(x, y, 0); c.rotation.z = a - Math.PI / 2; g.add(c);
    }
    const icM = new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 13; i++) {                                                   // icicles under the arch's front edge
      const a = Math.PI * (0.12 + 0.76 * i / 12), [x, y] = along(R, H, a, R - 0.46), L = rr(0.25, 0.6) * (0.6 + 0.4 * Math.sin(a));
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, L, 8), icM); c.rotation.x = Math.PI; c.position.set(x, y - L / 2, 0.45); g.add(c);
    }
    const starM = new THREE.MeshPhysicalMaterial({ color: 0xeaf7ff, emissive: 0x58c8ff, emissiveIntensity: 0.15, roughness: 0.15, clearcoat: 1 });
    for (let i = 0; i < 6; i++) {
      const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 3;
      const bar = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.66, 0.13, 2, 0.05), starM); bar.position.y = 0.33; arm.add(bar);
      for (const sx of [-1, 1]) { const tw = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.26, 0.1, 2, 0.04), starM); tw.position.set(sx * 0.09, 0.44, 0); tw.rotation.z = -sx * 0.85; arm.add(tw); }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), starM); tip.position.y = 0.68; arm.add(tip);
      top.add(arm);
    }
    top.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), starM));
    return starM;
  },
  // DESERT: sandstone pillars with turquoise and gold bands, a striped stone arch with a turquoise keystone, clay pots, a sun
  desert(g, R, H, top) {
    const sand = std(0xe8c38a, 0.8), terra = std(0xc8643c, 0.8), turq = gloss(0x22b8a8, { roughness: 0.3 }), gold = gloss(0xffc83a, { roughness: 0.25, metalness: 0.3 });
    for (const sx of [-1, 1]) {
      const plinth = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.45, 1.55, 2, 0.1), sand); plinth.position.set(sx * R, 0.22, 0); g.add(plinth);
      const col = new THREE.Mesh(new RoundedBoxGeometry(1.15, H - 0.6, 1.15, 2, 0.12), sand); col.position.set(sx * R, 0.45 + (H - 0.6) / 2 - 0.1, 0); g.add(col);
      for (const y of [0.9, 1.65]) { const band = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.16, 1.22, 2, 0.05), y > 1 ? gold : turq); band.position.set(sx * R, y, 0); g.add(band); }
      const cap = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.3, 1.5, 2, 0.1), turq); cap.position.set(sx * R, H - 0.1, 0); g.add(cap);
      const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.32, 0.02], [0.42, 0.25], [0.38, 0.5], [0.22, 0.66], [0.24, 0.75], [0, 0.75]].map(([r, y]) => new THREE.Vector2(r, y)), 20), terra);
      pot.position.set(sx * (R + 1.15), 0, 0.55); g.add(pot);
      const plant = new THREE.Group(); plant.position.set(sx * (R + 1.15), 0.68, 0.55); cactus(plant, 0, 0, 0.42); g.add(plant);
    }
    blocksRound(g, R, H, 11, i => new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.0, 1.2, 2, 0.1), i === 5 ? turq : i % 2 ? terra : sand));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20), gold); disc.rotation.x = Math.PI / 2; const [kx, ky] = along(R, H, Math.PI / 2); disc.position.set(kx, ky, 0.64); g.add(disc);
    const starM = new THREE.MeshPhysicalMaterial({ color: 0xffc83a, emissive: 0xff9a00, emissiveIntensity: 0.15, roughness: 0.25, clearcoat: 1 });
    const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32), starM); sun.rotation.x = Math.PI / 2; top.add(sun);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 32), turq); ring.position.z = 0.1; top.add(ring);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), starM); r.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0); r.rotation.z = a - Math.PI / 2; top.add(r); }
    return starM;
  },
  // SPACE: a metal arch with neon tubes and running lights, pillars ringed with glowing bands, a ringed planet on top
  space(g, R, H, top) {
    const metal = std(0x4a4f8f, 0.32, { metalness: 0.55 }), dark = std(0x262a5a, 0.4, { metalness: 0.4 });
    const neon = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.3 });
    const cyan = neon(0x6ff3ff), pink = neon(0xff7fe0);
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, H, 24), metal); col.position.set(sx * R, H / 2, 0); g.add(col);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.3, 28), dark); foot.position.set(sx * R, 0.15, 0); g.add(foot);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 40), cyan); glow.rotation.x = Math.PI / 2; glow.position.set(sx * R, 0.3, 0); g.add(glow);
      for (const y of [0.8, 1.45, 2.1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 32), sx < 0 ? pink : cyan); b.rotation.x = Math.PI / 2; b.position.set(sx * R, y, 0); g.add(b); }
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(R, 0.45, 18, 72, Math.PI), metal); arch.position.y = H; g.add(arch);
    for (const [r, m] of [[R - 0.42, cyan], [R + 0.42, pink]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 72, Math.PI), m); t.position.set(0, H, 0.3); g.add(t); }
    const lights = [neon(0xfff27a), neon(0x6ff3ff), neon(0xff7fe0)];
    for (let i = 0; i < 13; i++) { const [x, y] = along(R, H, Math.PI * (i + 0.5) / 13); const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), lights[i % 3]); l.position.set(x, y, 0.44); g.add(l); }
    const starM = new THREE.MeshPhysicalMaterial({ color: 0xffd36b, emissive: 0xffa000, emissiveIntensity: 0.15, roughness: 0.3, clearcoat: 1 });
    const planetM = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), starM); top.add(planetM);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 10, 48), cyan); ring.rotation.x = Math.PI / 2 - 0.4; ring.scale.z = 0.5; top.add(ring);
    return starM;
  },
};
