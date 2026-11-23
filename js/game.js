// Phonics Run — a side-scrolling platformer in the Word Mashup 3D world. Run right, jump the gaps, pick up the pictures
// that start with /m/ (lesson pack FP.K.U1L1), jump over the others, collect "m" coins. When every /m/ picture of the
// level is in the bag, the gate wakes up: say each word to it (phonics-api, on-device whisper as backup) and go through.
// Costs: a wrong picture = −1 heart and −2 coins, a fall = −1 heart (3 hearts). Coins go to the wallet → the SHOP
// (things for Tata to wear). First game of a visit: Tata's how-to demo (SKIP).
// ?level=N (1..3) · ?x=NN start there · ?nohint no demo · ?fake=ok,wrong… scripted speech verdicts · ?capture=1 tests step time
import * as THREE from 'three';
import * as E from './env.js';
import { Tata } from './tata.js';
import { LEVELS, buildLevel, updateLifts, PHON } from './level.js';
import { updateItems, takeCard, takeCoin } from './items.js';
import * as A from './audio.js';
import { ICON, refreshCoin } from './icons3d.js';

const qs = new URLSearchParams(location.search);
const CAPTURE = qs.get('capture') === '1';
const GAME_ID = 'phonics-run', SAVE_KEY = 'phonics-run.save';
const app = document.getElementById('app');
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- tuning
const PH = {
  run: 7.2, accG: 44, accA: 30, decG: 38, decA: 9, turn: 1.7,
  jumpV: 15.2, gUp: 34, gCut: 85, gDown: 46, maxFall: 24, bounceV: 21,
  coyote: 0.12, buffer: 0.15, hw: 0.42, h: 1.95,
};
const HEARTS = 3, TRAP_COST = 2, SAY_REWARD = 3;
const SHOP = [
  { id: 'shades', price: 15 }, { id: 'cape', price: 30 }, { id: 'crown', price: 45 }, { id: 'goldshoes', price: 60 },
];

// ---------------------------------------------------------------- state
const runner = new Tata(E.scene, { puff: E.puff });
const P = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, ground: null, facing: 1, coyote: 0, buffer: 0, inv: 0, lock: 0, hurt: 0 };
const G = {
  screen: 'title', idx: 0, lv: null, t: 0, hearts: HEARTS, coins: 0, got: [], said: [], lost: 0, wrong: 0, falls: 0,
  phase: 'play',            // play | dead | say | enter | done
  phaseT: 0, safe: { x: 0, y: 0 }, camY: 0, lockedAt: -9, taught: false,
  auto: null, autoJump: false, demoTok: 0, sayTok: 0, jumped: false, jumpTold: false, firstGood: true, ready: false,
};
const cam = { x: 0, y: 0, look: 1 };

// save: stars per level, wallet, shop (own key) + the shared phonics progress record
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* blocked */ }
  return Object.assign({ stars: {}, wallet: 0, owned: [], wear: [] }, s || {});
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
const unlocked = i => i === 0 || (save.stars[LEVELS[i - 1].id] || 0) > 0;
const outfit = () => Object.fromEntries(save.wear.map(k => [k, true]));
runner.setOutfit(outfit());

// ---------------------------------------------------------------- waiting on the game clock (works with ?capture=1 too)
const waiters = [];
const until = cond => new Promise(res => waiters.push({ cond, res }));
function runWaiters() { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].cond()) { const w = waiters.splice(i, 1)[0]; w.res(); } }

// ---------------------------------------------------------------- input
const keys = { left: false, right: false, jump: false };
let jumpEdge = false;
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump' };
const BTN = { left: 'bLeft', right: 'bRight', jump: 'bJump' };
function press(k, down) {
  if (G.auto) return;                       // the demo plays itself
  if (k === 'jump' && down && !keys.jump) jumpEdge = true;
  if (down) { G.lastInput = G.t; if (G.helping) { G.helping = false; pointHand(null); } }
  keys[k] = down;
  $(BTN[k]).classList.toggle('on', down);
}
addEventListener('keydown', e => {
  A.unlock();
  const k = KEYMAP[e.code];
  if (!k) { if (G.screen === 'title' && e.code === 'Enter') startLevel(G.idx); return; }
  e.preventDefault();
  if (e.repeat) return;
  if (G.screen === 'title' && k === 'jump') { startLevel(G.idx); return; }
  press(k, true);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) press(k, false); });
addEventListener('blur', () => { for (const k of ['left', 'right', 'jump']) press(k, false); });
for (const [id, k] of [['bLeft', 'left'], ['bRight', 'right'], ['bJump', 'jump']]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { A.unlock(); el.setPointerCapture(e.pointerId); press(k, true); e.preventDefault(); });
  const up = () => press(k, false);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
let greeted = false;
addEventListener('pointerdown', () => {
  A.unlock();
  if (!greeted && G.screen === 'title') { greeted = true; A.music(true); A.say('t:pressstart'); }
}, { capture: true });
addEventListener('contextmenu', e => e.preventDefault());

// ---------------------------------------------------------------- HUD
const HEART_SVG = on => `<img class="${on ? '' : 'lost'}" src="${on ? ICON.heartOn : ICON.heartOff}" alt="" draggable="false">`;
function drawHearts(popIdx = -1) {
  $('hearts').innerHTML = Array.from({ length: HEARTS }, (_, i) => HEART_SVG(i < G.hearts)).join('');
  if (popIdx >= 0) $('hearts').children[popIdx]?.classList.add('pop');
}
function drawSlots() {
  const words = G.lv.words;
  $('slots').innerHTML = words.map((_, i) => {
    const w = G.got[i];
    return `<div class="slot${w ? ' got' : ''}${w && G.said.includes(w) ? ' said' : ''}">${w ? `<img src="assets/words/${w}.png" alt="${w}">` : ''}</div>`;
  }).join('');
  $('slots').classList.toggle('done', G.got.length === words.length);
}
function drawCoins(bump, minus) {
  $('coins').textContent = G.coins;
  const c = $('coins').parentElement;
  if (bump || minus) { c.classList.remove('bump', 'minus'); void c.offsetWidth; c.classList.add(minus ? 'minus' : 'bump'); }
}
const STAR_SVG = on => `<img class="star${on ? ' on' : ''}" src="${on ? ICON.starOn : ICON.starOff}" alt="" draggable="false">`;
function toScreen(x, y, z = 0) {
  const v = new THREE.Vector3(x, y, z).project(E.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
}
function popText(html, cls, x, y) {
  const p = toScreen(x, y);
  const el = document.createElement('div');
  el.className = 'pop ' + cls; el.innerHTML = html;
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  $('pops').appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
const mWord = w => `<b>${w[0]}</b>${w.slice(1)}`;

// ---------------------------------------------------------------- level flow
function setScreen(s) { G.screen = s; app.dataset.screen = s; }
function load(idx) {
  G.lv?.dispose();
  G.idx = idx;
  G.lv = buildLevel(LEVELS[idx]);
  A.preload([...G.lv.items.filter(i => i.kind === 'card').map(i => 'w:' + i.word), 's:m']);
  resetRun();
}
function resetRun() {
  const L = G.lv;
  Object.assign(P, { x: L.start.x, y: L.start.y, vx: 0, vy: 0, grounded: true, ground: L.plats[0], facing: 1, coyote: 0, buffer: 0, inv: 0, lock: 0, hurt: 0 });
  const x0 = parseFloat(qs.get('x'));
  if (G.screen === 'play' && isFinite(x0) && !G.usedX) { G.usedX = true; P.x = x0; P.y = 12; P.grounded = false; }
  Object.assign(G, { lastInput: 0, lastHelp: -99, helping: false, hearts: HEARTS, coins: 0, got: [], said: [], lost: 0, wrong: 0, falls: 0, t: 0, phase: 'play', phaseT: 0,
    safe: { x: P.x, y: P.y }, camY: P.y, lockedAt: -9, firstGood: true, jumpTold: false, ready: false });
  cam.x = clampCamX(P.x + 2); cam.y = P.y; cam.look = 2;
  runner.root.position.set(P.x, P.y, 0); runner.root.scale.setScalar(1); runner.facing = 1; runner.yaw = 0.55; runner.flash = 0;
  if (L.gate) Object.assign(L.gate, { open: 0, opening: false, glow: 0 });
  $('lockHint').classList.remove('show');
  $('flash').style.opacity = 0;
  hideSay();
  drawHearts(); drawSlots(); drawCoins();
}
let micAsked = false;
function startLevel(idx) {
  if (!unlocked(idx) && !qs.has('level')) idx = continueLevel();
  A.unlock(); A.sfx.tap(); A.music(true); A.stopVoice();
  if (G.idx !== idx || !G.lv || G.lv.dirty) load(idx);
  G.lv.dirty = true;
  setScreen('play');
  resetRun();
  const go = () => {
    if (!G.taught && idx === 0 && !qs.has('nohint')) teachDemo();
    else A.seq(['s:m', 0.1, 's:m', 0.2, 't:howto']);
  };
  // the microphone is asked once, at START, before anything is said (the gate's say-it turn needs it; a "please allow"
  // line during the demo would cut the demo's lines); the on-device recogniser starts loading meanwhile
  if (!micAsked && window.Mic && !qs.has('fake')) {
    micAsked = true;
    window.STT?.preload();
    G.phase = 'wait';
    const lv = G.lv, ask = setTimeout(() => { if (Mic.state === 'asking') A.say('t:micask'); }, 1500);
    Promise.race([Mic.open(A.ctx()), wait(15000)]).then(() => {
      clearTimeout(ask);
      if (G.screen !== 'play' || G.lv !== lv || G.phase !== 'wait') return;
      A.stopVoice(); G.phase = 'play'; go();
    });
    return;
  }
  go();
}
function toTitle() {
  stopDemo(); G.sayTok++;
  A.stopVoice(); A.setListening(false);
  for (const k of ['left', 'right', 'jump']) press(k, false);
  setScreen('title');
  const c = continueLevel();
  if (G.lv.dirty || c !== G.idx) load(c); else resetRun();
  drawLevels();
}

// ---------------------------------------------------------------- first-game demo (phonics-kit rule 1): Tata plays a
// little while the tutor explains and a glove points at the buttons; no rewards, no record; SKIP ends it
function pointHand(id) {
  const h = $('hand');
  for (const b of ['bRight', 'bJump']) $(b).classList.remove('guide');
  if (!id) { h.classList.remove('show'); return; }
  const b = $(id), r = b.getBoundingClientRect();
  b.classList.add('guide');
  h.style.left = (r.left + r.width * 0.5) + 'px'; h.style.top = (r.top + r.height * 0.5) + 'px';   // the fingertip (CSS) on the button's middle
  h.classList.add('show');
}
async function teachDemo() {
  const tok = ++G.demoTok;
  const alive = () => tok === G.demoTok && G.screen === 'play';
  app.classList.add('guide');
  G.auto = { left: false, right: false, jump: false };
  const hold = (k, on) => { G.auto[k] = on; $(BTN[k]).classList.toggle('on', on); };
  await wait(400); if (!alive()) return;
  await A.say('t:hello'); if (!alive()) return;
  await A.seq(['s:m', 0.1, 's:m', 0.2, 't:howto']); if (!alive()) return;
  pointHand('bRight');
  await A.say('t:demo1'); if (!alive()) return;
  hold('right', true);
  await until(() => P.x > 20.2 || !alive()); if (!alive()) return;
  hold('right', false);
  await until(() => (Math.abs(P.vx) < 0.4 && !A.voiceBusy()) || !alive()); if (!alive()) return;
  pointHand('bJump');
  await A.say('t:demo2'); if (!alive()) return;
  hold('right', true);
  await until(() => P.x > 22.1 || !alive()); if (!alive()) return;
  G.autoJump = true; hold('jump', true);
  await until(() => P.vy < 0 || !alive()); hold('jump', false); if (!alive()) return;
  await until(() => (P.grounded && P.x > 28.6) || !alive()); hold('right', false); if (!alive()) return;
  pointHand(null);
  await until(() => Math.abs(P.vx) < 0.4 || !alive()); if (!alive()) return;
  await A.say('t:howto2'); if (!alive()) return;
  await A.say('t:tryit'); if (!alive()) return;
  endDemo();
}
function stopDemo() {
  if (!G.auto && !app.classList.contains('guide')) return;
  G.demoTok++; G.auto = null; G.autoJump = false;
  for (const k of ['left', 'right', 'jump']) $(BTN[k]).classList.remove('on');
  app.classList.remove('guide'); pointHand(null);
}
function endDemo() {
  stopDemo(); A.stopVoice();
  G.taught = true;
  load(G.idx); G.lv.dirty = true; resetRun();      // the demo gave nothing: a fresh course
}
$('skip').addEventListener('click', () => { A.sfx.tap(); endDemo(); });

// ---------------------------------------------------------------- hearts, coins, results
function hurt(kind) {
  G.hearts = Math.max(0, G.hearts - 1); G.lost++;
  drawHearts(G.hearts);
  if (kind === 'fall') G.falls++; else G.wrong++;
}
function gameOver() {
  G.phase = 'done';
  bank();
  setTimeout(() => { if (G.screen === 'play') { setScreen('over'); A.say('t:over'); } }, 700);
  record(false);
}
function bank() { save.wallet = (save.wallet || 0) + G.coins; writeSave(); }
function record(won) {
  try {
    window.PhonicsProgress?.played(GAME_ID, {
      level: LEVELS[G.idx].id, won, stars: won ? starsFor() : 0, words: G.got.length, said: G.said.length, coins: G.coins,
      wrong: G.wrong, falls: G.falls, time: Math.round(G.t * 10) / 10,
    }, { higher: ['said'], lower: ['wrong', 'falls'] });
    if (won) window.PhonicsProgress?.setLevel(GAME_ID, Math.min(LEVELS.length, LEVELS[G.idx].id + 1));
  } catch (e) { /* ignore */ }
}
const starsFor = () => Math.max(1, 3 - G.lost);
function levelClear() {
  G.phase = 'done';
  const stars = starsFor(), id = LEVELS[G.idx].id;
  save.stars[id] = Math.max(save.stars[id] || 0, stars);
  bank(); record(true);
  $('stars').innerHTML = [0, 1, 2].map(i => STAR_SVG(i < stars)).join('');
  $('gotList').innerHTML = G.got.map(w => `<img class="${G.said.includes(w) ? 'said' : ''}" src="assets/words/${w}.png" alt="${w}">`).join('');
  $('coinsEnd').textContent = G.coins;
  $('cNext').hidden = G.idx >= LEVELS.length - 1;
  const g = G.lv.gate;
  Object.assign(P, { x: g.x, y: g.top, vx: 0, vy: 0, grounded: true, facing: 1 });
  runner.root.scale.setScalar(1);
  setScreen('clear');
  A.sfx.clear();
  const last = LEVELS.every((L, i) => (save.stars[L.id] || 0) > 0 || i === G.idx) && G.idx === LEVELS.length - 1;
  setTimeout(() => A.say(last ? 't:allclear' : 't:clear'), 900);
}

// ---------------------------------------------------------------- physics (fixed small steps)
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
function clampCamX(x) { const L = G.lv; return Math.min(Math.max(x, L.xMin + 6.5), L.xMax - 6.5); }

function physics(dt, control) {
  const L = G.lv, hw = PH.hw, K = G.auto || keys;
  const dir = control && P.lock <= 0 ? (K.right ? 1 : 0) - (K.left ? 1 : 0) : 0;
  if (dir) P.facing = dir;
  let acc = P.grounded ? (dir ? PH.accG : PH.decG) : (dir ? PH.accA : PH.decA);
  if (dir && P.vx * dir < 0) acc *= PH.turn;
  P.vx = approach(P.vx, dir * PH.run, acc * dt);
  // jump (coyote time + buffer)
  P.coyote = P.grounded ? PH.coyote : P.coyote - dt;
  const edge = G.auto ? G.autoJump : jumpEdge;
  if (control && edge) { P.buffer = PH.buffer; if (G.auto) G.autoJump = false; else jumpEdge = false; } else P.buffer -= dt;
  if (control && P.buffer > 0 && P.coyote > 0 && P.lock <= 0) {
    P.vy = PH.jumpV; P.grounded = false; P.ground = null; P.coyote = 0; P.buffer = 0;
    runner.jumped(); A.sfx.jump();
    E.puff(P.x - P.facing * 0.2, P.y + 0.05, 0.15, -P.facing * 1.5, 0.4, 0.5);
  }
  if (P.vy <= 0) P.boost = false;
  const g = P.vy > 0 ? ((K.jump && control) || P.boost ? PH.gUp : PH.gCut) : PH.gDown;
  P.vy = Math.max(-PH.maxFall, P.vy - g * dt);
  // horizontal, blocked by island sides
  let nx = P.x + P.vx * dt;
  for (const p of L.plats) {
    if (!p.solid) continue;
    if (P.y < p.top - 0.05 && P.y + PH.h > p.bottom && nx + hw > p.x0 && nx - hw < p.x1) {
      if (P.x <= p.x0 - hw + 1e-3 || (P.x < (p.x0 + p.x1) / 2 && P.x - hw < p.x0)) nx = p.x0 - hw;
      else nx = p.x1 + hw;
      P.vx = 0;
    }
  }
  P.x = Math.min(Math.max(nx, L.xMin), L.xMax);
  // vertical: land on tops (slabs and lifts only from above)
  const wasGrounded = P.grounded, impact = -P.vy;
  let ny = P.y + P.vy * dt, land = null;
  if (P.vy <= 0) {
    for (const p of L.plats) {
      if (P.x + hw * 0.9 <= p.x0 || P.x - hw * 0.9 >= p.x1) continue;
      const tol = p.bounce ? 0.62 : 0.06 + Math.abs(p.dy || 0);     // a drum is also stepped onto from the side
      if (P.y >= p.top - tol && ny <= p.top + 1e-4 && (!land || p.top > land.top)) land = p;
    }
  }
  if (land && land.bounce) {                                    // jelly drum: boing — up high, no need to hold jump
    ny = land.top; P.vy = PH.bounceV; P.boost = true; P.grounded = false; P.ground = null; P.coyote = 0;
    land.bounce.t = 0; runner.jumped(); A.sfx.boing();
    E.puff(P.x, ny + 0.1, 0.3, 0, 1.2, 0.7);
  } else if (land) {
    ny = land.top; P.vy = 0; P.grounded = true; P.ground = land;
    if (!wasGrounded) { runner.landed(impact, P.x, ny); if (impact > 6) A.sfx.land(); }
  } else { P.grounded = false; P.ground = null; }
  P.y = ny;
  if (P.grounded && !P.ground.moving && P.x > P.ground.x0 + 1.2 && P.x < P.ground.x1 - 1.2) G.safe = { x: P.x, y: P.ground.top };
}

// ---------------------------------------------------------------- items
function touchItems() {
  const L = G.lv;
  for (const it of L.items) {
    if (it.state !== 'idle') continue;
    if (it.kind === 'coin') {
      if (Math.abs(it.x - P.x) < PH.hw + 0.3 && it.y > P.y - 0.25 && it.y < P.y + PH.h + 0.25) {
        takeCoin(it); G.coins++; drawCoins(true); A.sfx.coin();
      }
      continue;
    }
    const cy = it.root.position.y;
    const dx = Math.max(Math.abs(it.x - P.x) - PH.hw, 0);
    const dy = cy < P.y ? P.y - cy : cy > P.y + PH.h ? cy - (P.y + PH.h) : 0;
    const reach = it.m ? 0.78 : 0.5;            // forgiving: easy to take the /m/ ones, easy to jump over the others
    if (dx * dx + dy * dy < reach * reach) {
      if (it.m) {
        takeCard(it); G.got.push(it.word); drawSlots();
        A.sfx.good(); popText(mWord(it.word), '', it.x, cy + 1.1);
        const all = G.got.length === L.words.length;
        if (G.firstGood && !G.auto) { G.firstGood = false; A.seq(['w:' + it.word, 0.1, 't:' + pick(['good1', 'good2', 'good3'])]); }
        else A.say('w:' + it.word);
        if (all) wakeGate();
      } else if (P.inv <= 0) {
        takeCard(it); hurt('wrong');
        const lostC = Math.min(TRAP_COST, G.coins); G.coins -= lostC; drawCoins(false, lostC > 0);
        A.sfx.bad(); A.seq(['w:' + it.word, 0.1, 't:oops']);
        popText(it.word, 'bad', it.x, cy + 1.1);
        if (lostC) popText(`−${lostC}`, 'minus', P.x, P.y + 2.6);
        P.vx = (P.x < it.x ? -1 : 1) * 6.5; P.vy = 8.5; P.grounded = false; P.ground = null;
        P.inv = 1.4; P.lock = 0.35; P.hurt = 0.5; runner.flash = 1.4;
        if (G.hearts <= 0) gameOver();
      }
      continue;
    }
    // say the word as the runner comes up to it (listen, then decide)
    const ahead = (it.x - P.x) * P.facing;
    if (ahead > -0.5 && ahead < 5.2 && Math.abs(cy - (P.y + 1)) < 4.5 && G.t - it.spoken > 9 && !A.voiceBusy()) {
      it.spoken = G.t; it.pulse = 0.5; A.say('w:' + it.word);
    }
  }
}

// hands off for 8 s → the glove shows the run button again with the line (again every 15 s at most; phonics-kit '막힘 없음')
function idleHelp() {
  if (G.auto || qs.has('nohint')) return;
  if (G.t - (G.lastInput ?? 0) > 8 && G.t - (G.lastHelp ?? -99) > 15 && !A.voiceBusy() && Math.abs(P.vx) < 0.3) {
    G.lastHelp = G.t; G.helping = true;
    pointHand('bRight'); A.say('t:demo1');
    setTimeout(() => { if (G.helping) { G.helping = false; pointHand(null); } }, 3500);
  }
}

// ---------------------------------------------------------------- the gate: asleep → awake (all pictures) → say-it → open
function wakeGate() {
  const g = G.lv.gate; if (!g) return;
  G.ready = true;
  setTimeout(() => { A.sfx.open(); if (G.phase === 'play' && !G.auto) A.say('t:allgot'); }, 1100);
}
function updateGate(dt) {
  const g = G.lv.gate; if (!g) return;
  g.glow = Math.min(G.ready ? 0.4 : 0, (g.glow || 0) + dt);                   // awake: a brighter swirl, still closed
  if (g.opening) g.open = Math.min(1, g.open + dt / 1.0);
  g.U.uOpen.value = Math.max(g.glow, g.open); g.U.uT.value = G.t;
  g.starM.emissiveIntensity = 0.15 + 0.85 * Math.max(g.glow, g.open);
  g.star.rotation.y += dt * (0.6 + 1.8 * Math.max(g.glow, g.open));
  const near = Math.abs(P.x - g.x) < 1.4 && P.grounded && P.ground && Math.abs(P.ground.top - g.top) < 0.01;
  const hint = $('lockHint');
  if (G.phase === 'play' && near && !G.auto) {
    if (G.ready) { sayTurn(); }
    else if (G.t - G.lockedAt > 3) {
      G.lockedAt = G.t; A.sfx.locked(); A.say('t:locked');
      const s = $('slots'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
      $('lockSlots').innerHTML = '<i></i>'.repeat(G.lv.words.length - G.got.length);
      hint.classList.add('show');
    }
  }
  if (hint.classList.contains('show')) {
    if (G.t - G.lockedAt > 2.6 || G.ready) hint.classList.remove('show');
    const p = toScreen(g.x, g.top + g.H + 0.5, -1.7);
    hint.style.left = p.x + 'px'; hint.style.top = p.y + 'px';
  }
}
function openAndEnter() {
  const g = G.lv.gate;
  g.opening = true; A.sfx.open();
  setTimeout(() => { if (G.phase === 'say' || G.phase === 'play') { G.phase = 'enter'; G.phaseT = 0; A.sfx.portal(); } }, 1100);
}
function enterGate(dt) {
  const g = G.lv.gate;
  G.phaseT += dt;
  const t = G.phaseT;
  if (t < 0.45) {
    const dx = g.x - P.x;
    P.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 5);
    P.vx = Math.abs(dx) > 0.05 ? Math.sign(dx) * 5 : 0;
    runner.root.position.set(P.x, P.y, 0);
  } else {
    const u = Math.min(1, (t - 0.45) / 0.75);
    P.vx = 0;
    runner.root.position.set(P.x, P.y + Math.sin(u * Math.PI) * 1.4 + u * 0.6, -1.7 * Math.min(1, u * 1.3));
    runner.root.scale.setScalar(Math.max(0.001, 1 - E.smooth(0.45, 1, u)));
    g.U.uFlash.value = E.smooth(0.3, 1, u);
    $('flash').style.opacity = String(0.85 * E.smooth(0.55, 1, u));
  }
  if (t > 1.55) { $('flash').style.opacity = 0; g.U.uFlash.value = 0; levelClear(); }
}

// ---------------------------------------------------------------- say-it turn at the gate (phonics-kit rules 2–6):
// each collected word: "/m/ /m/ moon" → the child says it → ok = +3 coins. JUMP skips a word (no coins). Two wrong
// tries → "Good try!" and on. Silence → once per level the JUMP guide. Can't judge (no mic, no key + no on-device
// recogniser) → the turn is skipped, no coins. phonics-api first; its verdict is final.
const fakes = (qs.get('fake') || '').split(',').filter(Boolean);
const canSpeak = () => qs.has('fake') || (window.Mic && Mic.state === 'on' && ((window.PhonicsAPI && PhonicsAPI.usable()) || (window.STT && STT.state !== 'error')));
async function sayTurn() {
  if (G.phase !== 'play') return;
  G.phase = 'say';
  const tok = ++G.sayTok, alive = () => tok === G.sayTok && G.screen === 'play';
  P.vx = 0; P.facing = 1;
  for (const k of ['left', 'right', 'jump']) press(k, false);
  if (!canSpeak()) { openAndEnter(); return; }               // can't judge: straight through, no say-it coins (rule 5)
  app.classList.add('saying');
  await A.say('t:gate'); if (!alive()) return;
  showSayDots();
  for (let i = 0; i < G.got.length; i++) {
    const w = G.got[i];
    G.jumped = false;
    showSayCard(w, i);
    await wait(350); if (!alive()) return;
    await chant(w); if (!alive()) return;
    if (i === 0) { await A.say('t:sayit'); if (!alive()) return; }
    let v = null;
    for (let t = 0; t < 2 && !G.jumped; t++) {
      v = await listenOnce(w, t);
      if (!alive()) return;
      if (G.jumped || v === 'ok' || v === null) break;
      if (v === 'silence' && !G.jumpTold) { G.jumpTold = true; $('sayJump').classList.add('pulse'); await A.say('t:jump'); if (!alive() || G.jumped) break; }
      if (t === 0) { await A.say(v === 'silence' ? 't:sayit' : 't:again'); if (!alive() || G.jumped) break; await chant(w); if (!alive()) return; }
    }
    $('sayJump').classList.remove('pulse');
    if (G.jumped) { markDot(i, 'skip'); continue; }
    if (v === null) { markDot(i, 'skip'); break; }            // the recogniser can't judge: stop asking, no coins
    if (v === 'ok') {
      G.said.push(w); drawSlots(); markDot(i, 'ok');
      $('sayMic').className = 'smic ok'; A.sfx.good();
      G.coins += SAY_REWARD; drawCoins(true);
      popText(`+${SAY_REWARD}`, 'plus', P.x, P.y + 2.8);
      E.burst(new THREE.Vector3(G.lv.gate.x, G.lv.gate.top + 2.2, -1.2), 0xfff3a0, 0.8);
      G.lv.gate.glow = Math.min(0.95, 0.4 + 0.55 * (G.said.length / G.got.length));
      await A.say('t:' + pick(['great1', 'great2', 'great3'])); if (!alive()) return;
    } else {
      markDot(i, 'skip');
      await A.say('t:goodtry'); if (!alive()) return;
    }
  }
  hideSay();
  if (!alive()) return;
  A.say('t:open');
  openAndEnter();
}
async function chant(w) {
  const word = $('sayWord'), m = word.querySelector('b');
  const hop = el => { if (!el) return; el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); };
  hop(m); setTimeout(() => hop(m), 520); setTimeout(() => hop(word), 1050);
  await A.chant(w);
}
/** one listen: 'ok' | 'wrong' | 'unclear' | 'silence' | null (no recogniser) */
async function listenOnce(w, t) {
  const mic = $('sayMic');
  mic.className = 'smic listen'; A.sfx.listen(); A.setListening(true);
  try {
    if (qs.has('fake')) { await wait(700); mic.className = 'smic think'; await wait(300); return fakes.length ? fakes.shift() : 'ok'; }
    const r = await Mic.listen({ waitMs: t ? 5000 : 4500, onLevel: v => mic.style.setProperty('--lv', v.toFixed(2)), aborted: () => G.jumped || G.screen !== 'play' });
    if (r.kind === 'aborted') return 'unclear';
    if (r.kind === 'nomic') return null;
    if (r.kind === 'silence') return 'silence';
    mic.className = 'smic think';
    const pcm = await Mic.prepare(r.pcm, r.sr);
    return await judgeSpeech(pcm, w);
  } finally { A.setListening(false); if (mic.className !== 'smic ok') mic.className = 'smic'; }
}
/** the company phonics-api first (key on this device) — its verdict stands; the on-device whisper only when it can't judge */
async function judgeSpeech(pcm16k, target) {
  const rv = G.got.filter(x => x !== target).concat(['egg', 'lid', 'ten']);
  if (window.PhonicsAPI && PhonicsAPI.usable()) {
    const r = await PhonicsAPI.analyze(PhonicsAPI.encodeWav(pcm16k, 16000), target);
    if (r.ok) {
      const j = PhonicsAPI.judge(r.data, target, rv, PHON);
      if (qs.has('debug')) console.log('phonics-api', target, j);
      return j.verdict === 'ok' ? 'ok' : j.verdict === 'wrong' ? 'wrong' : 'unclear';
    }
  }
  return window.STT ? STT.judge(pcm16k, target, rv) : null;
}
const JUMP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12 12.2) scale(1.12) translate(-12 -12)"><circle cx="15.4" cy="4.1" r="2.45" fill="currentColor" stroke="none"/><path d="M14.1 7.1 11.2 12"/><path d="M13.6 8.3 18.3 6.2"/><path d="M13.6 8.3 9.3 6.5"/><path d="M11.2 12 14.8 13.5 13 16.5"/><path d="M11.2 12 8 14.3 5 12.9"/><path d="M7.8 20.9h9.8"/></g></svg>';
$('sayJump').innerHTML = JUMP_SVG;
$('sayJump').addEventListener('click', () => { if (G.phase !== 'say' || G.jumped) return; A.sfx.tap(); G.jumped = true; A.stopVoice(); });
$('sayListen').addEventListener('click', () => { if (G.phase === 'say' && !A.voiceBusy() && $('sayMic').className !== 'smic listen') chant($('sayWord').dataset.w); });
function showSayCard(w, i) {
  $('sayImg').src = `assets/words/${w}.png`;
  $('sayWord').innerHTML = mWord(w); $('sayWord').dataset.w = w;
  $('sayMic').className = 'smic';
  const s = $('say'); s.classList.remove('in'); void s.offsetWidth; s.classList.add('show', 'in');
  void i;
}
function showSayDots() { $('sayDots').innerHTML = G.got.map(() => '<i></i>').join(''); }
function markDot(i, k) { $('sayDots').children[i]?.classList.add(k); }
function hideSay() { $('say').classList.remove('show', 'in'); app.classList.remove('saying'); }

// ---------------------------------------------------------------- camera
function updateCamera(dt) {
  const L = G.lv;
  cam.look += (P.facing * 2.2 - cam.look) * E.damp(1.6, dt);
  cam.x += (clampCamX(P.x + cam.look) - cam.x) * E.damp(5, dt);
  if (P.grounded) G.camY = P.y;
  if (P.y > G.camY + 3.2) G.camY = P.y - 3.2;
  if (G.phase === 'play' && P.y < G.camY - 3 && P.y > L.minTop - 1) G.camY = Math.max(P.y + 1, L.minTop);
  cam.y += (G.camY - cam.y) * E.damp(G.screen === 'title' || G.screen === 'shop' ? 20 : 3.2, dt);
  const asp = innerWidth / innerHeight, far = Math.min(1.5, Math.max(1, 1.6 / asp));
  let cx = cam.x, cy = cam.y;
  if (G.screen === 'title' || G.screen === 'shop') {
    // title: close on Tata (left of centre), the LEVEL sign on the right; shop: Tata on the left, the shelf on the right
    const shop = G.screen === 'shop';
    cx = P.x + (shop ? 2.1 : 1.7); cy = P.y;
    E.camera.position.set(cx, cy + (shop ? 1.8 : 2.1), (shop ? 7.6 : 10.5) * far);
    E.camera.lookAt(cx, cy + (shop ? 1.15 : 1.3), 0);
  } else {
    E.camera.position.set(cx - 1.0, cy + 4.0, 17 * far);
    E.camera.lookAt(cx + 0.5, cy + 1.7, 0);
  }
  E.sky.position.copy(E.camera.position);
  E.sunFollow(cx, cy);
}

// ---------------------------------------------------------------- frame
function tick(dt) {
  G.t += dt;
  const L = G.lv;
  updateLifts(L.plats, G.t, dt, P.grounded ? P.ground : null);
  if (P.grounded && P.ground?.moving && G.phase !== 'enter') { P.x += P.ground.dx; P.y += P.ground.dy; }
  E.playerLight.position.set(P.x + 0.6, P.y + 2.6, 2.4);
  const playing = G.screen === 'play';
  if (playing && G.phase === 'play') {
    const n = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < n; i++) physics(dt / n, true);
    jumpEdge = false;
    P.inv -= dt; P.lock -= dt; P.hurt -= dt;
    touchItems();
    idleHelp();
    if (P.y < L.minTop - 9) { G.phase = 'dead'; G.phaseT = 0; A.sfx.fall(); if (!G.auto) { hurt('fall'); A.say('t:fall'); } }
  } else if (playing && G.phase === 'dead') {
    G.phaseT += dt;
    P.vy = Math.max(-PH.maxFall, P.vy - PH.gDown * dt); P.y += P.vy * dt;
    if (G.phaseT > 0.9) {
      if (G.hearts <= 0) gameOver();
      else {
        Object.assign(P, { x: G.safe.x, y: G.safe.y + 0.02, vx: 0, vy: 0, grounded: false, ground: null, inv: 1.6, lock: 0.2 });
        runner.flash = 1.6; G.camY = G.safe.y; G.phase = 'play';
      }
    }
  } else if (playing && G.phase === 'enter') {
    enterGate(dt);
  } else {
    physics(dt, false);           // say turn, done, title, shop, results: stand
  }
  if (G.phase !== 'enter') runner.root.position.set(P.x, P.y, 0);
  const still = P.grounded && Math.abs(P.vx) < 0.3;
  const mode = G.phase === 'enter' ? 'enter' : P.hurt > 0 ? 'hurt' : G.screen === 'clear' ? 'cheer'
    : G.phase === 'say' ? 'idle' : still ? (G.screen === 'title' || G.screen === 'shop' ? 'title' : 'idle') : 'play';
  runner.update(dt, { vx: P.vx, vy: P.vy, grounded: P.grounded || G.phase === 'enter', facing: P.facing, max: PH.run, mode });
  if (playing || G.screen === 'clear') updateGate(dt);
  updateItems(L.items, dt, G.t);
  E.updateSparks(dt);
  E.updateDust(dt);
  for (const b of E.balloons) {
    b.position.y += Math.sin(G.t * 0.7 + b.userData.bob) * 0.004;
    const pr = b.getObjectByName('prop'); if (pr) pr.rotation.y += dt * 9;
  }
  runWaiters();
  updateCamera(dt);
  E.composer.render(dt);
}

// ---------------------------------------------------------------- title: levels, language, phonics-api key, shop
// levels are not picked (launcher rule "레벨: 고르지 않고 잘하면 자동으로"): START continues with the first level not yet
// cleared; with all cleared, the one with the fewest stars. The row only shows progress.
function continueLevel() {
  const open = LEVELS.findIndex(L => !(save.stars[L.id] > 0));
  if (open >= 0) return open;
  let best = 0; LEVELS.forEach((L, i) => { if (save.stars[L.id] < save.stars[LEVELS[best].id]) best = i; });
  return best;
}
function drawLevels() {
  $('levels').innerHTML = LEVELS.map((L, i) => {
    const st = save.stars[L.id] || 0, open = unlocked(i);
    return `<div class="lv${open ? '' : ' lock'}${i === G.idx ? ' sel' : ''}" aria-label="Level ${L.id}"><b>${L.id}</b><span class="st">${[0, 1, 2].map(k => STAR_SVG(k < st)).join('')}</span></div>`;
  }).join('');
  $('walletTitle').textContent = save.wallet || 0;
}
const lt = $('btnLang');
const showLang = () => { lt.dataset.l = A.lang(); lt.setAttribute('aria-pressed', A.lang() === 'ko'); lt.querySelectorAll('.flag').forEach(f => f.classList.toggle('on', f.dataset.l === A.lang())); };
showLang();
lt.addEventListener('click', () => { A.unlock(); A.setLang(A.lang() === 'ko' ? 'en' : 'ko'); showLang(); A.sfx.tap(); A.stopVoice(); A.say('t:pressstart'); });
const keyBtn = $('btnKey');
const showApi = () => { keyBtn.dataset.api = window.PhonicsAPI ? PhonicsAPI.status() : 'off'; };
keyBtn.addEventListener('click', async () => { A.unlock(); A.sfx.tap(); if (window.PhonicsAPI) { await PhonicsAPI.keyDialog(); showApi(); } });
if (window.PhonicsAPI) { PhonicsAPI.init().then(showApi); addEventListener('phonicsapi:status', showApi); }

// shop: coins from every game → things for Tata to wear (a reward has to be spendable)
const ITEM_SVG = Object.fromEntries(SHOP.map(it => [it.id, `<img src="${ICON[it.id]}" alt="" draggable="false">`]));
function drawShop() {
  $('wallet').textContent = save.wallet || 0;
  $('items').innerHTML = SHOP.map(it => {
    const own = save.owned.includes(it.id), on = save.wear.includes(it.id), can = (save.wallet || 0) >= it.price;
    return `<button class="item${own ? ' own' : ''}${on ? ' on' : ''}${!own && !can ? ' poor' : ''}" data-id="${it.id}" aria-label="${it.id}">
      <span class="pic">${ITEM_SVG[it.id]}</span>
      ${own ? `<span class="tick">${on ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>`
        : `<span class="price"><i class="coin-ic"><b>m</b></i>${it.price}</span>`}
    </button>`;
  }).join('');
  for (const b of $('items').children) b.addEventListener('click', () => shopTap(b.dataset.id, b));
}
function shopTap(id, el) {
  const it = SHOP.find(s => s.id === id);
  if (save.owned.includes(id)) {
    save.wear = save.wear.includes(id) ? save.wear.filter(k => k !== id) : [...save.wear, id];
    A.sfx.tap();
  } else if ((save.wallet || 0) >= it.price) {
    save.wallet -= it.price; save.owned.push(id); save.wear.push(id);
    A.sfx.buy(); A.say('t:buy');
    E.burst(new THREE.Vector3(P.x, P.y + 1.4, 0.4), 0xfff3a0, 0.8);
  } else {
    A.sfx.nope(); A.say('t:nocoin');
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    return;
  }
  writeSave(); runner.setOutfit(outfit()); drawShop(); drawLevels();
}
$('btnShop').addEventListener('click', () => { A.unlock(); A.sfx.tap(); drawShop(); setScreen('shop'); A.say('t:shop'); });
$('shopClose').addEventListener('click', () => { A.sfx.tap(); setScreen('title'); drawLevels(); });

$('btnStart').addEventListener('click', () => startLevel(G.idx));
$('btnExit').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('btnSound').addEventListener('click', () => { A.unlock(); A.setMuted(!A.isMuted()); app.classList.toggle('muted', A.isMuted()); A.sfx.tap(); });
app.classList.toggle('muted', A.isMuted());
$('cHome').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('oHome').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('cAgain').addEventListener('click', () => startLevel(G.idx));
$('oAgain').addEventListener('click', () => startLevel(G.idx));
$('cNext').addEventListener('click', () => { const n = Math.min(LEVELS.length - 1, G.idx + 1); load(n); startLevel(n); });
addEventListener('resize', () => { E.onResize(); if (G.auto) pointHand($('bJump').classList.contains('guide') ? 'bJump' : $('bRight').classList.contains('guide') ? 'bRight' : null); });

// ---------------------------------------------------------------- 3D pictures in the page
$('hand').innerHTML = '<img src="assets/img/hand.webp" alt="" draggable="false">';   // the hint glove of every phonics game (same file)
document.querySelector('.bigheart').innerHTML = `<img src="${ICON.broken}" alt="" draggable="false">`;

// ---------------------------------------------------------------- boot
const qLevel = parseInt(qs.get('level'), 10);
load(isFinite(qLevel) ? Math.min(LEVELS.length, Math.max(1, qLevel)) - 1 : continueLevel());
drawLevels();
if (qs.has('nohint')) G.taught = true;
if (qs.has('play')) startLevel(G.idx);

const fontsReady = Promise.race([document.fonts?.load('800 100px "Baloo 2"').then(() => undefined) ?? Promise.resolve(), new Promise(r => setTimeout(r, 2500))]);
window.PR = {
  step: dt => tick(dt), press, start: i => startLevel(i ?? G.idx), toTitle, skip: () => endDemo(),
  teleport(x, y) { P.x = x; P.y = y; P.vx = 0; P.vy = 0; P.grounded = false; G.camY = y; cam.x = clampCamX(x + 2); cam.y = y; },
  give(n) { save.wallet = (save.wallet || 0) + n; writeSave(); drawLevels(); },
  unlockAll() { for (const L of LEVELS) save.stars[L.id] = save.stars[L.id] || 1; drawLevels(); },   // tests
  shop: () => $('btnShop').click(), buy: id => shopTap(id, document.body),
  get state() { return { screen: G.screen, phase: G.phase, x: P.x, y: P.y, vx: P.vx, vy: P.vy, grounded: P.grounded, hearts: G.hearts, coins: G.coins, got: [...G.got], said: [...G.said], words: G.lv.words, wallet: save.wallet, wear: [...save.wear], demo: !!G.auto, t: G.t }; },
  screenAt: (x, y, z) => toScreen(x, y, z),
  ready: fontsReady.then(() => new Promise(r => setTimeout(r, 300))),
};
fontsReady.then(() => {
  for (const f of E.redraws) f();
  refreshCoin();
  if (!CAPTURE) {
    let last = performance.now();
    const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
});
