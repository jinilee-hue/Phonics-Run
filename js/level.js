// Courses. Lesson pack FP.K.U1L1 (/m/): 18 m-words to collect, 9 other pictures to jump over or go round.
// Five worlds (user 2026-11-23, references + the intro video): 1 forest · 2 candy · 3 snow · 4 desert oasis · 5 space.
// The course runs INTO the screen (user: "영상처럼 뒤에서 따라가기"): distance d along the course = -z. The path is
// worlds.js PATH_W wide round x = 0; lanes x = -1.4 / 0 / 1.4.
// Parts: ['stage', d, R] start pad · ['g', d0, d1, top] ground · ['step', d0, d1, top, x, w] a step / bridge (jump onto it;
// from below you pass through) · ['lift', dc, top, axis, amp, period, w, len] moving platform (axis x | y | z) ·
// ['bounce', d, x, groundTop] mushroom / jelly drum · ['end', d0, d1, top] the gate's ground (gate near its far end).
// Items: ['c', word, d, x] card standing on whatever is below (or ['c', word, d, x, y]) · ['row', d0, d1, x, y, n] coins ·
// ['arc', d0, d1, x, y0, rise, n] coins on an arc · ['ring', d, x, yc, ry, rz, n] coins round an upright oval — its top
// needs a jump (user 2026-11-24 "동전들도 위아래 타원형으로 되어있어서 점프를 해야 먹을수 있게").
import * as THREE from 'three';
import * as E from './env.js';
import * as W from './worlds.js';
import { makeCard, makeCoin } from './items.js';

export const M_WORDS = ['moon', 'map', 'milk', 'mop', 'man', 'meat', 'mat', 'mitt', 'mouse', 'mug', 'mail',
  'monkey', 'mushroom', 'mirror', 'match', 'mice', 'mouth', 'mask'];
export const OTHER_WORDS = ['egg', 'lid', 'ten', 'heart', 'fox', 'gift', 'kite', 'gate', 'doll'];
// expected sounds per word (lesson pack FP.K.U1L1 + the server's G2P, phonics-kit cache/ph) — PhonicsAPI.judge's table
export const PHON = {"moon":["m","uw","n"],"map":["m","ae","p"],"milk":["m","ih","l","k"],"mop":["m","aa","p"],"man":["m","ae","n"],"meat":["m","iy","t"],"mat":["m","ae","t"],"mitt":["m","ih","t"],"mouse":["m","aw","s"],"mug":["m","ah","g"],"mail":["m","ey","l"],"mask":["m","ae","s","k"],"monkey":["m","ah","ng","k","iy"],"mushroom":["m","ah","sh","r","uw","m"],"mirror":["m","ih","r","er"],"match":["m","ae","ch"],"mice":["m","ay","s"],"mouth":["m","aw","dh"],"egg":["eh","g"],"lid":["l","ih","d"],"ten":["t","eh","n"],"heart":["hh","aa","r","t"],"fox":["f","aa","k","s"],"gift":["g","ih","f","t"],"kite":["k","ay","t"],"gate":["g","ey","t"],"doll":["d","aa","l"]};
const isM = w => M_WORDS.includes(w);
const L_ = -1.4, R_ = 1.4;

export const LEVELS = [
  {
    id: 1, theme: 'forest', name: 'Forest',
    parts: [
      ['stage', 0, 4.4], ['g', 4.2, 34, 0, { checker: true }], ['g', 37.5, 56, 0], ['g', 56, 70, 1.2], ['step', 73.5, 77, 1.8, 0, 3.4],
      ['g', 80.5, 94, 1.2], ['end', 97, 120, 1.2],
    ],
    items: [
      ['row', 8, 12, 0, 1.0, 5], ['c', 'moon', 16, L_], ['c', 'map', 26, R_], ['ring', 30.5, 0, 2.2, 1.2, 1.4, 8],
      ['arc', 34.5, 37, 0, 1.2, 2.2, 4],
      ['c', 'milk', 46, 0], ['ring', 52, R_, 2.2, 1.2, 1.4, 8],
      ['arc', 54.5, 57.5, L_, 1.4, 1.8, 3], ['c', 'mop', 64, L_],
      ['arc', 70.5, 73, 0, 2.6, 1.6, 3], ['arc', 77.3, 80, 0, 3.2, 1.6, 3],
      ['c', 'egg', 87, 0], ['arc', 84, 90, R_, 2.2, 2.0, 5],
      ['arc', 94.5, 96.5, 0, 2.4, 1.6, 3],
    ],
  },
  {
    id: 2, theme: 'candy', name: 'Candy',
    parts: [
      ['stage', 0, 4.4], ['g', 4.2, 26, 0], ['g', 29.5, 46, 0], ['bounce', 44, 0, 0], ['g', 48.5, 60, 4.6],
      ['g', 63, 76, 1.6], ['lift', 80.5, 1.6, 'x', 1.4, 4.6, 3, 3], ['g', 85, 98, 1.6], ['end', 101.5, 124, 1.6],
    ],
    items: [
      ['row', 8, 12, R_, 1.0, 4], ['c', 'man', 15, L_], ['c', 'lid', 22, R_],
      ['arc', 26.5, 29, 0, 1.2, 2.2, 4],
      ['c', 'meat', 36, 0], ['arc', 44, 49, 0, 2.4, 4.6, 4],
      ['c', 'mat', 54, R_], ['row', 55, 59, L_, 5.6, 3],
      ['c', 'ten', 70, 0], ['arc', 66, 74, R_, 2.6, 2.2, 5],
      ['arc', 76.5, 79, 0, 2.6, 1.6, 3], ['arc', 82, 84.5, 0, 2.6, 1.6, 3],
      ['ring', 91.5, 0, 3.8, 1.2, 1.5, 8],
    ],
  },
  {
    id: 3, theme: 'snow', name: 'Snow',
    parts: [
      ['stage', 0, 4.4], ['g', 4.2, 24, 0], ['step', 27.5, 33, 0.9, 0, 3.4], ['g', 36.5, 52, 1.2],
      ['lift', 57.5, 1.2, 'z', 1.8, 4.4, 3.2, 3.2], ['g', 63, 78, 1.6], ['step', 81.5, 85, 2.6, L_, 2.8], ['step', 88, 91.5, 3.4, R_, 2.8],
      ['g', 95, 108, 2.4], ['end', 111.5, 134, 2.4],
    ],
    items: [
      ['row', 8, 12, 0, 1.0, 4], ['c', 'mitt', 14, L_], ['c', 'heart', 20, R_],
      ['arc', 24.5, 27.5, 0, 1.2, 1.8, 3], ['arc', 33.3, 36.3, 0, 1.9, 1.8, 3],
      ['c', 'mouse', 42, R_], ['c', 'fox', 47, 0],
      ['arc', 52.5, 62.5, 0, 2.4, 2.6, 6],
      ['c', 'mug', 70, L_], ['ring', 74, R_, 2.8, 1.2, 1.4, 8],
      ['c', 'mail', 101, 0], ['arc', 97, 106, L_, 3.4, 2.2, 6],
    ],
  },
  {
    id: 4, theme: 'desert', name: 'Desert',
    parts: [
      ['stage', 0, 4.4], ['g', 4.2, 26, 0], ['g', 29.5, 44, 0.8], ['lift', 49, 0.8, 'x', 1.5, 4.2, 3, 3.2],
      ['g', 53.5, 68, 1.6], ['step', 71.5, 75, 2.6, 0, 3], ['step', 78, 81.5, 3.6, 0, 3], ['g', 85, 98, 2.4],
      ['lift', 102.5, 2.4, 'y', 1.4, 4.4, 3, 3], ['g', 107, 118, 2.4], ['end', 121.5, 144, 2.4],
    ],
    items: [
      ['row', 8, 12, L_, 1.0, 4], ['c', 'mask', 15, R_], ['c', 'gift', 21, 0],
      ['arc', 26.5, 29.5, 0, 1.4, 2, 3],
      ['c', 'monkey', 36, L_], ['c', 'kite', 40, R_],
      ['arc', 44.5, 53, 0, 2.2, 2.2, 5],
      ['c', 'mushroom', 61, 0], ['ring', 65, R_, 2.8, 1.2, 1.4, 8],
      ['arc', 68.5, 71, 0, 3, 1.6, 3], ['arc', 75.3, 78, 0, 4, 1.6, 3],
      ['c', 'mirror', 92, R_], ['arc', 88, 96, L_, 3.4, 2.2, 5],
      ['ring', 112.5, 0, 4.6, 1.2, 1.5, 8],
    ],
  },
  {
    id: 5, theme: 'space', name: 'Space', gravity: 0.72,
    parts: [
      ['stage', 0, 4.4], ['g', 4.2, 22, 0], ['step', 25.5, 31, 0.8, L_, 2.8], ['step', 34, 39.5, 1.6, R_, 2.8], ['g', 41, 56, 1.6],   // (long steps: the low gravity carries far)
      ['lift', 62, 1.6, 'z', 2, 4.4, 3.2, 3.2], ['g', 68, 82, 2.2], ['lift', 87.5, 2.2, 'x', 1.4, 4, 3, 3],
      ['g', 92.5, 106, 2.6], ['end', 110, 132, 2.6],
    ],
    items: [
      ['row', 8, 12, 0, 1.0, 4], ['c', 'match', 15, R_], ['c', 'gate', 19, L_],
      ['arc', 22.5, 25.5, L_, 1.2, 2.4, 3], ['arc', 31.3, 34, 0, 2, 2, 3],
      ['c', 'mice', 47, L_], ['c', 'doll', 51, R_], ['ring', 49, 0, 3.6, 1.4, 1.6, 8],
      ['arc', 56.5, 67.5, 0, 2.6, 3.2, 6],
      ['c', 'mouth', 76, 0], ['arc', 70, 80, R_, 3.2, 3.0, 6],
      ['ring', 99.5, L_, 4.6, 1.6, 1.8, 10],
    ],
  },
];

/** build a level's world; returns platforms, items, gate and bounds (z = -d).
 *  side = the side-view version: one lane (cards, coins and steps on the middle line — traps have to be jumped),
 *  sideways lifts move up and down instead, scenery only on the far side, the gate turned to face the camera */
export function buildLevel(L, side = false) {
  W.setSide(side);
  const X = x => (side ? 0 : x);
  E.applyTheme(L.theme);
  W.snowfall.visible = !!E.TH.snowfall;
  E.setSeed(100 + L.id * 7);
  E.balloons.length = 0;
  const root = new THREE.Group(); E.scene.add(root);
  const plats = [], items = [], th = L.theme, PH = W.PATH_W / 2;
  let gate = null, dMax = 0, minTop = 0;
  const box = (d0, d1, top, x0, x1, extra) => ({ x0, x1, zMin: -d1, zMax: -d0, top, ...extra });

  for (const p of L.parts) {
    const kind = p[0];
    if (kind === 'stage') {
      const [, d, R] = p;
      const st = W.startPad(root, R, th); st.position.set(0, 0, -d);
      const base = E.island(root, 2 * R + 1.4, 2 * R + 1.4, 4.2); base.position.set(0, -1.5, -d);
      plats.push(box(d - R + 0.3, d + R - 0.3, 0, -R + 0.3, R - 0.3, { solid: true, bottom: -6 }));
      if (th === 'forest') W.rainbow(root, -d - 34);
    } else if (kind === 'g' || kind === 'end') {
      const [, d0, d1, top, opt = {}] = p;
      W.ground(root, d0, d1, top, th, { checker: !!opt.checker || (kind === 'end' && th === 'forest') });
      plats.push(box(d0, d1, top, -PH, PH, { solid: true, bottom: top - 7 }));
      if (kind === 'end') {
        const gd = d1 - 6;
        const G = W.gate(root, th);
        // the portal faces where the camera is: +z behind Tata (back view), +x across the course (side view)
        const n = side ? { x: 1, z: 0 } : { x: 0, z: 1 };
        const gx = side ? -1.3 : 0;
        G.group.position.set(gx, top, -gd); if (side) G.group.rotation.y = Math.PI / 2;
        gate = { x: gx, z: -gd, nx: n.x, nz: n.z, top, ...G, open: 0 };
        dMax = d1 - 0.6;
      }
      minTop = Math.min(minTop, top);
    } else if (kind === 'step') {
      const [, d0, d1, top, x0 = 0, w = 3] = p, x = X(x0);
      const g = W.step(root, w, d1 - d0, th); g.position.set(x, top, -(d0 + d1) / 2);
      plats.push(box(d0, d1, top, x - w / 2, x + w / 2, { oneWay: true }));
      minTop = Math.min(minTop, top);
    } else if (kind === 'lift') {
      const [, dc, top, axis0, amp0, period, w, len] = p;
      const axis = side && axis0 === 'x' ? 'y' : axis0, amp = side && axis0 === 'x' ? Math.min(amp0, 1.2) : amp0;   // (sideways = into the screen in side view)
      const g = W.lift(root, w, len, th); g.position.set(0, top, -dc);
      plats.push({ x0: -w / 2, x1: w / 2, zMin: -dc - len / 2, zMax: -dc + len / 2, top, oneWay: true, moving: true, lift: { dc, top, axis, amp, period, w, len, obj: g }, dx: 0, dy: 0, dz: 0 });
      minTop = Math.min(minTop, top - (axis === 'y' ? amp : 0));
    } else if (kind === 'bounce') {
      const [, d, x0, gtop] = p, x = X(x0);
      const g = W.bouncer(root, th); g.position.set(x, gtop + 0.5, -d);
      plats.push({ x0: x - 0.85, x1: x + 0.85, zMin: -d - 0.85, zMax: -d + 0.85, top: gtop + 0.5, oneWay: true, bounce: { obj: g, t: 9 } });
    }
  }

  // side view: one lane, so a trap has to be jumped — one too close before a gap would send Tata into it. Such a trap
  // moves back to ≥ 7 before the edge (and ≥ 2.5 from any other card); in the back view it is passed on the side.
  let itemsIn = L.items;
  if (side) {
    const grounds = L.parts.filter(p => p[0] === 'g' || p[0] === 'end' || p[0] === 'step').map(p => [p[1], p[2]]);
    const cards = L.items.filter(it => it[0] === 'c');
    itemsIn = L.items.map(it => {
      if (it[0] !== 'c' || isM(it[1])) return it;
      const gr = grounds.find(([d0, d1]) => it[2] >= d0 && it[2] <= d1);
      if (!gr || gr[1] - it[2] >= 7) return it;
      for (let d = gr[1] - 7; d >= gr[0] + 2; d -= 0.5) {
        if (cards.every(c => c === it || Math.abs(c[2] - d) >= 2.5)) { const m = [...it]; m[2] = d; return m; }
      }
      return null;                                               // no room on that ground: left out in the side view
    }).filter(Boolean);
  }
  const topAt = (x, z) => { let best = 0; for (const p of plats) if (x >= p.x0 - 0.3 && x <= p.x1 + 0.3 && z >= p.zMin - 0.3 && z <= p.zMax + 0.3) best = Math.max(best, p.top); return best; };
  for (const it of itemsIn) {
    if (it[0] === 'c') { const [, w, d, x0, y] = it, x = X(x0); items.push(makeCard(root, w, isM(w), x, y ?? topAt(x, -d) + 1.15, -d)); }
    else if (it[0] === 'row') {
      const [, d0, d1, x0, y, n] = it, x = X(x0);
      for (let i = 0; i < n; i++) items.push(makeCoin(root, x, y, -(d0 + (d1 - d0) * (n > 1 ? i / (n - 1) : 0.5))));
    } else if (it[0] === 'arc') {
      const [, d0, d1, x0, y0, rise, n] = it, x = X(x0);
      for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5; items.push(makeCoin(root, x, y0 + rise * 4 * t * (1 - t), -(d0 + (d1 - d0) * t))); }
    } else if (it[0] === 'ring') {
      const [, d, x0, yc, ry, rz, n] = it, x = X(x0);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; items.push(makeCoin(root, x, yc + ry * Math.sin(a), -(d + rz * Math.cos(a)))); }
    }
  }

  if (side) for (const it of items) if (it.kind === 'card') it.face = Math.PI / 2;
  W.backdrop(root, th, dMax);
  W.below(root, th, dMax);

  const words = items.filter(i => i.kind === 'card' && i.m).map(i => i.word);
  return {
    L, root, plats, items, gate, dMax, minTop, words, gravity: L.gravity || 1, side,
    start: { x: 0, y: 0, z: 1.2 },
    dispose() { E.scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}

/** move the lifts (time T); each moving platform keeps its frame delta for whoever stands on it. Bouncers wobble. */
export function updateLifts(plats, T, dt = 1 / 60) {
  for (const p of plats) {
    if (p.bounce) {
      const b = p.bounce; b.t += dt;
      const k = Math.exp(-b.t * 5) * Math.sin(b.t * 28);
      const j = b.obj.getObjectByName('jelly'); if (j) { j.userData.base ||= j.scale.clone(); j.scale.set(j.userData.base.x * (1 + 0.12 * k), j.userData.base.y * (1 - 0.45 * k), j.userData.base.z * (1 + 0.12 * k)); }
      continue;
    }
    if (!p.lift) continue;
    const f = p.lift, s = Math.sin((T / f.period) * Math.PI * 2);
    const cx = f.axis === 'x' ? f.amp * s : 0, cz = -f.dc + (f.axis === 'z' ? f.amp * s : 0), top = f.top + (f.axis === 'y' ? f.amp * s : 0);
    const ox = (p.x0 + p.x1) / 2, oz = (p.zMin + p.zMax) / 2, oy = p.top;
    p.x0 = cx - f.w / 2; p.x1 = cx + f.w / 2; p.zMin = cz - f.len / 2; p.zMax = cz + f.len / 2; p.top = top;
    p.dx = cx - ox; p.dz = cz - oz; p.dy = top - oy;
    f.obj.position.set(cx, top, cz);
    f.obj.rotation.z = Math.sin(T * 1.3 + f.dc) * 0.015;
  }
}
