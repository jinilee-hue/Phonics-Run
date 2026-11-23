// Courses. Lesson pack FP.K.U1L1 (/m/): 18 m-words to collect, 9 other pictures to jump over.
// Units: the runner is ~2 tall, runs 7.2/s, a full jump rises 3.4 and carries ~6 on the flat.
// Parts: ['stage', cx, R] start pad · ['g', x0, x1, top] grass island · ['s', x0, x1, top, colour] chevron slab (jump up
// through it) · ['lift', cx, top, axis, amp, period, w] balloon lift · ['end', x0, x1, top, gateX] gate island.
// ['bounce', x, groundTop] jelly drum (candy) · ['cloud', x0, x1, top] cloud that sinks while stood on (night).
// Each level has a theme (env.js THEMES): 1 meadow · 2 candy sunset · 3 starry night.
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
    id: 1, theme: 'meadow',
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
    // candy sunset: two jelly drums bounce Tata up to a frosting plateau and a high slab (no other way across)
    id: 2, theme: 'candy',
    parts: [
      ['stage', 0, 4.8],
      ['g', 5.1, 20, 0],
      ['g', 24, 42, 0],
      ['bounce', 39.5, 0],
      ['g', 44, 56, 5.0],
      ['s', 59, 63, 3.2, 'pink'],
      ['lift', 67.5, 2.4, 'y', 1.4, 4.2, 3],
      ['g', 72, 86, 1.6],
      ['g', 89.5, 96.5, 0.6],
      ['bounce', 94.6, 0.6],
      ['s', 99.5, 104.5, 6.0, 'blue'],
      ['g', 107.5, 119, 1.6],
      ['lift', 125, 1.6, 'x', 2.2, 5.0, 3.2],
      ['g', 131, 141, 2.6],
      ['end', 144.5, 161, 2.6, 153],
    ],
    items: [
      ['row', 8, 11, 1.0, 4], ['c', 'meat', 14.5, on(0)],
      ['arc', 20.3, 23.7, 1.2, 2.2, 4],
      ['c', 'lid', 30, on(0)], ['arc', 27.6, 32.4, 1.5, 2.6, 5],
      ['arc', 39.8, 45.2, 2.2, 5.6, 5],
      ['c', 'mat', 50, on(5.0)], ['row', 52, 54.5, 6.0, 3],
      ['arc', 56.3, 58.7, 5.6, 1.2, 3],
      ['c', 'ten', 76.5, on(1.6)], ['arc', 74.1, 78.9, 3.1, 2.6, 5],
      ['c', 'mitt', 82, on(1.6)],
      ['c', 'mouse', 91.5, on(0.6)],
      ['arc', 94.8, 99.6, 2.6, 5.0, 4],
      ['c', 'mug', 102, on(6.0)],
      ['row', 108.5, 110, 2.6, 2], ['c', 'heart', 112.5, on(1.6)], ['arc', 110.1, 114.9, 3.1, 2.6, 5],
      ['c', 'mail', 136, on(2.6)], ['row', 137.5, 139.5, 3.6, 3],
      ['arc', 141.3, 144.2, 3.6, 2.0, 3],
    ],
  },
  {
    // starry night: crystal islands, glowing lanterns, and cloud bridges that sink while you stand on them
    id: 3, theme: 'night',
    parts: [
      ['stage', 0, 4.8],
      ['g', 5.1, 18, 0],
      ['cloud', 21.5, 24.7, 1.0],
      ['cloud', 27.5, 30.7, 1.8],
      ['g', 34, 50, 1.4],
      ['lift', 54.5, 1.6, 'y', 1.6, 4.0, 3],
      ['g', 59.5, 72, 2.6],
      ['cloud', 75.5, 78.7, 3.4],
      ['cloud', 81.5, 84.7, 3.0],
      ['cloud', 87.5, 90.7, 2.6],
      ['g', 93.5, 108, 1.6],
      ['lift', 114.5, 2.0, 'x', 2.4, 5.5, 3.2],
      ['g', 121.5, 137, 2.6],
      ['s', 140.5, 144, 4.0, 'yellow'],
      ['s', 147.5, 151, 4.0, 'blue'],
      ['g', 154.5, 169, 2.0],
      ['end', 172.5, 189, 3.0, 181],
    ],
    items: [
      ['row', 8.5, 10.5, 1.0, 3], ['c', 'monkey', 12.5, on(0)],
      ['arc', 18.3, 21.2, 1.2, 1.8, 3],
      ['c', 'mushroom', 29.1, on(1.8)],
      ['arc', 30.9, 33.8, 2.4, 1.8, 3],
      ['c', 'fox', 39, on(1.4)], ['arc', 36.6, 41.4, 2.9, 2.6, 5],
      ['c', 'gift', 45.5, on(1.4)], ['arc', 43.1, 47.9, 2.9, 2.6, 5],
      ['c', 'mirror', 66, on(2.6)], ['row', 68.5, 71, 3.6, 3],
      ['row', 76, 78.2, 4.6, 3], ['row', 82, 84.2, 4.2, 3], ['row', 88, 90.2, 3.8, 3],
      ['c', 'kite', 98.5, on(1.6)], ['arc', 96.1, 100.9, 3.1, 2.6, 5],
      ['c', 'match', 104, on(1.6)],
      ['c', 'mice', 125.5, on(2.6)],
      ['c', 'doll', 130.5, on(2.6)], ['arc', 128.1, 132.9, 4.1, 2.6, 5],
      ['c', 'mouth', 142.25, on(4.0)],
      ['arc', 144.3, 147.2, 5.0, 1.6, 3],
      ['c', 'gate', 159, on(2.0)], ['arc', 156.6, 161.4, 3.5, 2.6, 5],
      ['c', 'mask', 165, on(2.0)],
      ['arc', 169.3, 172.2, 3.2, 2.0, 3],
    ],
  },
];

/** build a level's world; returns platforms, items, gate and bounds */
export function buildLevel(L) {
  E.applyTheme(L.theme);
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
      plats.push({ x0: cx - w / 2, x1: cx + w / 2, top, oneWay: true, moving: true, lift: { cx, top, axis, amp, period, w, obj: g }, dx: 0, dy: 0 });
    } else if (kind === 'bounce') {
      const [, x, gtop] = p;
      const g = E.bouncePad(root); g.position.set(x, gtop + 0.5, 0);
      plats.push({ x0: x - 0.85, x1: x + 0.85, top: gtop + 0.5, oneWay: true, bounce: { obj: g, t: 9 } });
    } else if (kind === 'cloud') {
      const [, x0, x1, top] = p;
      const g = E.cloudPad(root, x1 - x0); g.position.set((x0 + x1) / 2, top, 0);
      plats.push({ x0, x1, top, oneWay: true, moving: true, sink: { base: top, cur: 0, max: 3.2, down: 1.3, up: 0.9, obj: g }, dx: 0, dy: 0 });
    }
    minTop = Math.min(minTop, kind === 'lift' ? p[2] - p[4] : kind === 'stage' ? 0 : kind === 'bounce' ? p[2] : kind === 'cloud' ? p[3] - 3.2 : p[3]);
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

/** move the balloon lifts (time T) and the sinking clouds (standOn = the platform the runner stands on); each moving
 *  platform keeps its frame delta for whoever stands on it. Jelly drums wobble after a bounce. */
export function updateLifts(plats, T, dt = 1 / 60, standOn = null) {
  for (const p of plats) {
    if (p.bounce) {
      const b = p.bounce; b.t += dt;
      const k = Math.exp(-b.t * 5) * Math.sin(b.t * 28);
      const j = b.obj.getObjectByName('jelly'); if (j) { j.scale.set(1 + 0.12 * k, 0.42 * (1 - 0.45 * k), 1 + 0.12 * k); }
      continue;
    }
    if (p.sink) {
      const f = p.sink, oy = p.top;
      f.cur = Math.min(f.max, Math.max(0, f.cur + (standOn === p ? f.down : -f.up) * dt));
      p.top = f.base - f.cur; p.dx = 0; p.dy = p.top - oy;
      f.obj.position.y = p.top + Math.sin(T * 1.7 + f.base) * 0.03;
      f.obj.scale.y = standOn === p ? 0.9 : 1;
      continue;
    }
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
