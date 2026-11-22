// Courses. Lesson pack FP.K.U1L1 (/m/): 18 m-words to collect, 9 other pictures to jump over.
// Units: the runner is ~2 tall, runs 7.2/s, a full jump rises 3.4 and carries ~6 on the flat.
// Parts: ['stage', cx, R] start pad · ['g', x0, x1, top] grass island · ['s', x0, x1, top, colour] chevron slab (jump up
// through it) · ['lift', cx, top, axis, amp, period, w] balloon lift · ['end', x0, x1, top, gateX] gate island.
// Items: ['c', word, x, y] card (centre) · ['row', x0, x1, y, n] coins · ['arc', x0, x1, y0, rise, n] coins on an arc.
import * as THREE from 'three';
import * as E from './env.js';
import { makeCard, makeCoin } from './items.js';

export const M_WORDS = ['moon', 'map', 'milk', 'mop', 'man', 'meat', 'mat', 'mitt', 'mouse', 'mug', 'mail',
  'monkey', 'mushroom', 'mirror', 'match', 'mice', 'mouth', 'mask'];
export const OTHER_WORDS = ['egg', 'lid', 'ten', 'heart', 'fox', 'gift', 'kite', 'gate', 'doll'];
// expected sounds per word (lesson pack FP.K.U1L1 + the server's G2P, phonics-kit cache/ph) — PhonicsAPI.judge's table
export const PHON = {"moon":["m","uw","n"],"map":["m","ae","p"],"milk":["m","ih","l","k"],"mop":["m","aa","p"],"man":["m","ae","n"],"meat":["m","iy","t"],"mat":["m","ae","t"],"mitt":["m","ih","t"],"mouse":["m","aw","s"],"mug":["m","ah","g"],"mail":["m","ey","l"],"mask":["m","ae","s","k"],"monkey":["m","ah","ng","k","iy"],"mushroom":["m","ah","sh","r","uw","m"],"mirror":["m","ih","r","er"],"match":["m","ae","ch"],"mice":["m","ay","s"],"mouth":["m","aw","dh"],"egg":["eh","g"],"lid":["l","ih","d"],"ten":["t","eh","n"],"heart":["hh","aa","r","t"],"fox":["f","aa","k","s"],"gift":["g","ih","f","t"],"kite":["k","ay","t"],"gate":["g","ey","t"],"doll":["d","aa","l"]};
const isM = w => M_WORDS.includes(w);

const on = top => top + 1.15;            // a card's centre when it stands on a surface at `top`

export const LEVELS = [
  {
    id: 1,
    parts: [
      ['stage', 0, 4.8],
      ['g', 5.1, 24, 0],          // joins the start pad (a 0.5 seam you can walk over)
      ['g', 28, 41, 0],
      ['s', 32.5, 36.5, 3.0, 'pink'],
      ['g', 45, 61, 1.2],
      ['s', 64.5, 68.5, 2.6, 'blue'],
      ['s', 72, 76, 3.8, 'yellow'],
      ['g', 79.5, 95, 1.2],
      ['end', 98.5, 115, 2.2, 107],
    ],
    items: [
      ['row', 9.5, 13.5, 1.0, 5], ['c', 'moon', 18, on(0)],
      ['arc', 24.3, 27.7, 1.2, 2.2, 4],
      ['c', 'map', 34.5, on(3.0)], ['row', 37.5, 39.5, 1.0, 3],
      ['arc', 41.3, 44.7, 1.4, 2.4, 4],
      ['c', 'egg', 51, on(1.2)], ['arc', 48.6, 53.4, 2.7, 2.6, 5],
      ['c', 'milk', 57, on(1.2)],
      ['arc', 61.3, 64.2, 2.4, 2.0, 3], ['arc', 68.8, 71.7, 3.4, 2.0, 3],
      ['c', 'mop', 74, on(3.8)],
      ['row', 82, 86, 2.2, 5], ['c', 'man', 89, on(1.2)],
      ['arc', 95.3, 98.2, 2.4, 2.2, 3],
    ],
  },
  {
    id: 2,
    parts: [
      ['stage', 0, 4.8],
      ['g', 5.1, 21, 0],
      ['g', 25, 38, 0],
      ['s', 41.5, 45.5, 1.8, 'pink'],
      ['s', 48.5, 52.5, 3.4, 'blue'],
      ['lift', 57.5, 2.4, 'y', 1.4, 4.2, 3],
      ['g', 62.5, 76, 1.6],
      ['g', 79.5, 85.5, 0.6],
      ['lift', 92, 1.4, 'x', 2.2, 5.0, 3.2],
      ['g', 99, 113, 1.6],
      ['s', 106, 110, 4.4, 'yellow'],
      ['g', 117, 129, 2.6],
      ['end', 132.5, 149, 2.6, 141],
    ],
    items: [
      ['row', 9, 12, 1.0, 4], ['c', 'meat', 15.5, on(0)],
      ['arc', 21.3, 24.7, 1.2, 2.2, 4],
      ['c', 'lid', 31, on(0)], ['arc', 28.6, 33.4, 1.5, 2.6, 5],
      ['arc', 38.3, 41.2, 1.4, 2.0, 3],
      ['c', 'mat', 50.5, on(3.4)],
      ['c', 'ten', 67, on(1.6)], ['arc', 64.6, 69.4, 3.1, 2.6, 5],
      ['c', 'mitt', 72, on(1.6)],
      ['c', 'mouse', 82.5, on(0.6)],
      ['row', 99.5, 101.5, 2.6, 3],
      ['c', 'heart', 103, on(1.6)],
      ['c', 'mug', 108, on(4.4)],
      ['arc', 113.3, 116.7, 2.8, 2.2, 4],
      ['c', 'mail', 123, on(2.6)], ['row', 125, 127.5, 3.6, 3],
      ['arc', 129.3, 132.2, 3.6, 2.0, 3],
    ],
  },
  {
    id: 3,
    parts: [
      ['stage', 0, 4.8],
      ['g', 5.1, 19, 0],
      ['s', 22.5, 26, 1.4, 'yellow'],
      ['s', 29.5, 33, 2.8, 'pink'],
      ['g', 36.5, 53, 1.4],
      ['lift', 57.5, 1.6, 'y', 1.6, 4.0, 3],
      ['g', 62.5, 75, 2.6],
      ['s', 78.5, 82, 3.8, 'blue'],
      ['s', 85.5, 89, 3.0, 'pink'],
      ['g', 92.5, 107, 1.6],
      ['lift', 113.5, 2.0, 'x', 2.4, 5.5, 3.2],
      ['g', 120.5, 136, 2.6],
      ['s', 139.5, 143, 4.0, 'yellow'],
      ['s', 146.5, 150, 4.0, 'blue'],
      ['g', 153.5, 168, 2.0],
      ['end', 171.5, 188, 3.0, 180],
    ],
    items: [
      ['row', 8.5, 10.5, 1.0, 3], ['c', 'monkey', 13, on(0)],
      ['arc', 19.3, 22.2, 1.2, 2.0, 3], ['arc', 26.3, 29.2, 2.6, 2.0, 3],
      ['c', 'mushroom', 31.25, on(2.8)],
      ['c', 'fox', 41, on(1.4)], ['arc', 38.6, 43.4, 2.9, 2.6, 5],
      ['c', 'gift', 48, on(1.4)], ['arc', 45.6, 50.4, 2.9, 2.6, 5],
      ['c', 'mirror', 68.5, on(2.6)], ['row', 70.5, 73, 3.6, 3],
      ['arc', 75.3, 78.2, 3.6, 2.0, 3],
      ['c', 'kite', 97, on(1.6)], ['arc', 94.6, 99.4, 3.1, 2.6, 5],
      ['c', 'match', 103, on(1.6)],
      ['c', 'mice', 124.5, on(2.6)],
      ['c', 'doll', 129.5, on(2.6)], ['arc', 127.1, 131.9, 4.1, 2.6, 5],
      ['c', 'mouth', 141.25, on(4.0)],
      ['arc', 143.3, 146.2, 5.0, 1.6, 3],
      ['c', 'gate', 158, on(2.0)], ['arc', 155.6, 160.4, 3.5, 2.6, 5],
      ['c', 'mask', 164, on(2.0)],
      ['arc', 168.3, 171.2, 3.2, 2.0, 3],
    ],
  },
];

/** build a level's world; returns platforms, items, gate and bounds */
export function buildLevel(L) {
  E.setSeed(100 + L.id * 7);
  E.balloons.length = 0;
  const root = new THREE.Group(); E.scene.add(root);
  const plats = [], items = [];
  let gate = null, xMin = -4.4, xMax = 0, minTop = 0;

  const ISL_Z = -1.2, ISL_D = 5.6;
  const decorate = (x0, x1, top, trees = true, withFence = false) => {
    const w = x1 - x0;
    if (trees) {
      const n = Math.max(1, Math.round(w / 5.5));
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + 0.5) * (w / n) + E.rr(-0.8, 0.8);
        E.tree(root, x, ISL_Z - E.rr(1.9, 2.6), E.rr(0.85, 1.25), top);
      }
      if (w > 9) E.bush(root, x0 + E.rr(1.5, w - 1.5), ISL_Z - 1.3, E.rr(0.8, 1.1), top);
    }
    if (withFence) E.fence(root, E.V(x0 + 0.8, top, ISL_Z - ISL_D / 2 + 0.45), E.V(x1 - 0.8, top, ISL_Z - ISL_D / 2 + 0.45));
  };

  for (const p of L.parts) {
    const kind = p[0];
    if (kind === 'stage') {
      const [, cx, R] = p;
      const st = E.stage(root, R); st.position.set(cx, 0, ISL_Z);
      const base = E.island(root, 2 * R + 1.4, 2 * R + 0.6, 4.2); base.position.set(cx, -1.5, ISL_Z);
      const sg = E.sign(root, [[`LEVEL ${L.id}`, 64, '#ffffff'], ['Mm', 132, '#ffd84a']]);
      sg.position.set(cx + 2.3, 0, ISL_Z - 2.5); sg.rotation.y = -0.22;
      plats.push({ x0: cx - R + 0.2, x1: cx + R - 0.2, top: 0, bottom: -6, solid: true });
      xMin = cx - R + 0.6;
    } else if (kind === 'g' || kind === 'end') {
      const [, x0, x1, top] = p;
      const h = E.rr(4.5, 6.5);
      const isl = E.island(root, x1 - x0, ISL_D, h); isl.position.set((x0 + x1) / 2, top, ISL_Z);
      plats.push({ x0, x1, top, bottom: top - h - 1.1, solid: true });
      if (kind === 'end') {
        const gx = p[4];
        const G = E.gate(root); G.group.position.set(gx, top, ISL_Z - 0.9);
        gate = { x: gx, top, ...G, open: 0 };
        E.tree(root, gx - 5.2, ISL_Z - 2.2, 1.2, top); E.tree(root, gx + 5.0, ISL_Z - 2.4, 1.15, top);
        E.tree(root, x0 + 1.6, ISL_Z - 2.5, 0.9, top); E.tree(root, x1 - 1.4, ISL_Z - 2.0, 1.0, top);
        E.fence(root, E.V(x0 + 0.8, top, ISL_Z - ISL_D / 2 + 0.45), E.V(gx - 3.6, top, ISL_Z - ISL_D / 2 + 0.45));
        E.fence(root, E.V(gx + 3.6, top, ISL_Z - ISL_D / 2 + 0.45), E.V(x1 - 0.8, top, ISL_Z - ISL_D / 2 + 0.45));
        xMax = x1 - 0.6;
      } else decorate(x0, x1, top, true, (x1 - x0) > 13);
    } else if (kind === 's') {
      const [, x0, x1, top, col] = p;
      const g = E.slab(root, x1 - x0, col); g.position.set((x0 + x1) / 2, top, 0);
      plats.push({ x0, x1, top, oneWay: true });
    } else if (kind === 'lift') {
      const [, cx, top, axis, amp, period, w] = p;
      const cols = [['#ff6fa8', '#ffd34d'], ['#4fb3ff', '#ffffff'], ['#7ed96b', '#a57bff']];
      const [a, b] = cols[plats.length % cols.length];
      const g = E.liftBalloon(root, w, a, b); g.position.set(cx, top, 0);
      plats.push({ x0: cx - w / 2, x1: cx + w / 2, top, oneWay: true, lift: { cx, top, axis, amp, period, w, obj: g }, dx: 0, dy: 0 });
    }
    minTop = Math.min(minTop, p[0] === 'lift' ? p[2] - p[4] : p[0] === 'stage' ? 0 : p[3]);
  }

  for (const it of L.items) {
    if (it[0] === 'c') items.push(makeCard(root, it[1], isM(it[1]), it[2], it[3]));
    else if (it[0] === 'row') {
      const [, x0, x1, y, n] = it;
      for (let i = 0; i < n; i++) items.push(makeCoin(root, x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : 0.5), y));
    } else if (it[0] === 'arc') {
      const [, x0, x1, y0, rise, n] = it;
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0.5;
        items.push(makeCoin(root, x0 + (x1 - x0) * t, y0 + rise * 4 * t * (1 - t)));
      }
    }
  }

  E.cloudLayer(root, xMin, xMax);
  E.farIslands(root, xMin, xMax);

  const words = items.filter(i => i.kind === 'card' && i.m).map(i => i.word);
  return {
    L, root, plats, items, gate, xMin, xMax, minTop, words,
    start: { x: xMin + 1.8, y: 0 },
    dispose() {
      E.scene.remove(root);
      root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
      });
    },
  };
}

/** move the balloon lifts (time T); each platform keeps its frame delta for whoever stands on it */
export function updateLifts(plats, T) {
  for (const p of plats) {
    if (!p.lift) continue;
    const f = p.lift, s = Math.sin((T / f.period) * Math.PI * 2);
    const cx = f.cx + (f.axis === 'x' ? f.amp * s : 0);
    const top = f.top + (f.axis === 'y' ? f.amp * s : 0);
    const ox = (p.x0 + p.x1) / 2, oy = p.top;
    p.x0 = cx - f.w / 2; p.x1 = cx + f.w / 2; p.top = top;
    p.dx = cx - ox; p.dy = top - oy;
    f.obj.position.set(cx, top, 0);
    f.obj.rotation.z = Math.sin(T * 1.3 + f.cx) * 0.015;
  }
}
