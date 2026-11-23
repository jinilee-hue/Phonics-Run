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
import * as W from './worlds.js';
import { updateItems, takeCard, takeCoin } from './items.js';
import * as A from './audio.js';
import { ICON, refreshCoin } from './icons3d.js';
import { ITEMS, itemById } from './outfits.js';

const qs = new URLSearchParams(location.search);
const CAPTURE = qs.get('capture') === '1';
const GAME_ID = 'phonics-run', SAVE_KEY = 'phonics-run.save', COURSE = 'worlds5';   // bump COURSE when the levels are redesigned
const app = document.getElementById('app');
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[(Math.random() * a.length) | 0];

// ---------------------------------------------------------------- tuning
const PH = {
  run: 6.6, accG: 40, accA: 26, decG: 36, decA: 8,
  jumpV: 15.2, gUp: 34, gCut: 85, gDown: 46, maxFall: 24, bounceV: 21,
  coyote: 0.12, buffer: 0.15, hw: 0.42, h: 1.95,
};
const PATH_HALF = W.PATH_W / 2;
// two versions (user 2026-11-23: "뒤모습 보이며 달리는거랑 옆으로 달리는거랑 두가지 버전"): 'back' = behind Tata, the course runs
// into the screen, a stick; 'side' = from the side, the course runs to the right, ← → buttons. ?view=side|back, else the
// title's toggle (remembered on this device).
const VIEW_KEY = 'phonics-run.view';
let VIEW = (() => { const q = new URLSearchParams(location.search).get('view'); if (q === 'side' || q === 'back') return q; try { return localStorage.getItem(VIEW_KEY) || 'back'; } catch (e) { return 'back'; } })();
const SIDE = () => VIEW === 'side';
const HEARTS = 3, TRAP_COST = 2, SAY_REWARD = 3;

// ---------------------------------------------------------------- state
const runner = new Tata(E.scene, { puff: E.puff });
const P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: Math.PI, grounded: true, ground: null, coyote: 0, buffer: 0, inv: 0, lock: 0, hurt: 0 };
const G = {
  screen: 'title', idx: 0, lv: null, t: 0, hearts: HEARTS, coins: 0, got: [], said: [], lost: 0, wrong: 0, falls: 0,
  phase: 'play',            // play | dead | say | enter | done
  phaseT: 0, safe: { x: 0, y: 0, z: 0 }, camY: 0, lockedAt: -9, taught: false,
  auto: null, autoJump: false, demoTok: 0, sayTok: 0, jumped: false, jumpTold: false, firstGood: true, ready: false,
};
const cam = { pos: new THREE.Vector3(0, 5, 10), look: new THREE.Vector3(0, 1, -6) };

// save: stars per level, wallet, shop (own key) + the shared phonics progress record
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* blocked */ }
  s = Object.assign({ stars: {}, wallet: 0, owned: [], worn: {} }, s || {});
  if (Array.isArray(s.wear)) { for (const id of s.wear) { const it = itemById(id); if (it) s.worn[it.slot] = id; } delete s.wear; }   // (old save: a list)
  for (const it of ITEMS) if (it.price === 0 && !s.owned.includes(it.id)) s.owned.push(it.id);                  // the free one
  // the courses changed (3 levels → 5 worlds): old stars meant other maps — start the worlds afresh (coins, clothes stay).
  // (user: "맵은 두군데 끝나믄 모든 레벨을 다 깼다고 하는데" — the old 1–3 stars made it start at world 4)
  if (s.course !== COURSE) { s.stars = {}; s.course = COURSE; try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  return s;
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
const unlocked = i => i === 0 || (save.stars[LEVELS[i - 1].id] || 0) > 0;
const outfit = () => Object.fromEntries(Object.values(save.worn).map(k => [k, true]));
runner.setOutfit(outfit());

// ---------------------------------------------------------------- waiting on the game clock (works with ?capture=1 too)
const waiters = [];
const until = cond => new Promise(res => waiters.push({ cond, res }));
function runWaiters() { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].cond()) { const w = waiters.splice(i, 1)[0]; w.res(); } }

// ---------------------------------------------------------------- input: a joystick (or arrows / WASD) moves, the jump button (or Space / Z) jumps
// (user: "영상처럼 뒤에서 따라가기" — the video's left stick + A button)
const keys = { up: false, down: false, left: false, right: false, jump: false };
const joy = { x: 0, z: 0, on: false };
let jumpEdge = false;
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', KeyZ: 'jump' };
const keyOf = code => { const k = KEYMAP[code]; return SIDE() && k === 'up' ? 'jump' : SIDE() && k === 'down' ? null : k; };   // side view: ↑ / W jump
function inputActive() { G.lastInput = G.t; if (G.helping) { G.helping = false; pointHand(null); } }
function press(k, down) {
  if (G.auto) return;                       // the demo plays itself
  if (k === 'jump' && down && !keys.jump) jumpEdge = true;
  if (down) inputActive();
  keys[k] = down;
  if (k === 'jump') $('bJump').classList.toggle('on', down);
  if (k === 'left' || k === 'right') $(k === 'left' ? 'bLeft' : 'bRight').classList.toggle('on', down);
}
/** the move direction, x right / z toward the camera, length ≤ 1 */
function inputVec() {
  const K = G.auto || keys;
  let x = 0, z = 0;
  if (G.auto) { x = G.auto.x || 0; z = G.auto.z || 0; }
  else if (SIDE()) { z = (K.left ? 1 : 0) - (K.right ? 1 : 0); }          // → = along the course (-z)
  else if (joy.on) { x = joy.x; z = joy.z; }
  else { x = (K.right ? 1 : 0) - (K.left ? 1 : 0); z = (K.down ? 1 : 0) - (K.up ? 1 : 0); }
  if (SIDE()) x = 0;
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  return { x, z };
}
addEventListener('keydown', e => {
  A.unlock();
  const k = keyOf(e.code);
  if (!k) { if (G.screen === 'title' && e.code === 'Enter') startLevel(G.idx); return; }
  e.preventDefault();
  if (e.repeat) return;
  if (G.screen === 'title' && k === 'jump') { startLevel(G.idx); return; }
  press(k, true);
});
addEventListener('keyup', e => { const k = keyOf(e.code); if (k) press(k, false); });
addEventListener('blur', () => { for (const k of Object.keys(keys)) press(k, false); joy.on = false; drawJoy(); });
for (const [id, k] of [['bJump', 'jump'], ['bLeft', 'left'], ['bRight', 'right']]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { A.unlock(); el.setPointerCapture(e.pointerId); press(k, true); e.preventDefault(); });
  const up = () => press(k, false);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
// the stick: drag the knob anywhere inside the ring (it springs back when let go)
function drawJoy() { $('knob').style.transform = `translate(${joy.x * 34}%, ${joy.z * 34}%)`; $('joy').classList.toggle('on', joy.on); }
{
  const el = $('joy');
  const move = e => {
    const r = el.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / (R * 0.62), z = (e.clientY - r.top - R) / (R * 0.62);
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    if (l < 0.12) { x = 0; z = 0; }
    joy.x = x; joy.z = z; drawJoy();
  };
  el.addEventListener('pointerdown', e => { if (G.auto) return; A.unlock(); el.setPointerCapture(e.pointerId); joy.on = true; inputActive(); move(e); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (joy.on) move(e); });
  const end = () => { joy.on = false; joy.x = 0; joy.z = 0; drawJoy(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
}
let greeted = false;
addEventListener('pointerdown', () => {
  A.unlock();
  if (!greeted && G.screen === 'title') { greeted = true; A.music(true); A.say('t:pressstart'); }
}, { capture: true });
addEventListener('contextmenu', e => e.preventDefault());

// ---------------------------------------------------------------- HUD
const HEART_SVG = on => `<img class="${on ? '' : 'lost'}" src="${on ? ICON.heartOn : ICON.heartOff}" alt="" draggable="false">`;
function drawHearts(lostIdx = -1) {
  // only the hearts left (user: "위에 빈 하트 있는건 삭제해줘"); a heart just lost breaks and fades out, then is gone
  // (it used to get the class 'pop' — the floating word's class — and jumped out of the pill)
  const n = G.hearts + (lostIdx >= 0 ? 1 : 0);
  $('hearts').innerHTML = Array.from({ length: n }, (_, i) => `<img class="${i === lostIdx ? 'gone' : ''}" src="${ICON.heartOn}" alt="" draggable="false">`).join('');
  if (lostIdx >= 0) setTimeout(() => { if (G.hearts < n) drawHearts(); }, 650);
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
function popText(html, cls, x, y, z = 0) {
  const p = toScreen(x, y, z);
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
  G.lv = buildLevel(LEVELS[idx], SIDE());
  // build every shader of the new world now (a new kind of object coming into view first otherwise stalls a frame)
  try { E.renderer.compile(E.scene, E.camera); } catch (e) { /* compile later, on first draw */ }
  A.preload([...G.lv.items.filter(i => i.kind === 'card').map(i => 'w:' + i.word), 's:m']);
  resetRun();
}
function resetRun() {
  const L = G.lv;
  Object.assign(P, { x: L.start.x, y: L.start.y, z: L.start.z, vx: 0, vy: 0, vz: 0, yaw: Math.PI, grounded: true, ground: L.plats[0], coyote: 0, buffer: 0, inv: 0, lock: 0, hurt: 0 });
  const d0 = parseFloat(qs.get('d'));                         // ?d=60: start 60 along the course (tests)
  if (G.screen === 'play' && isFinite(d0) && !G.usedX) { G.usedX = true; P.z = -d0; P.y = 12; P.grounded = false; }
  Object.assign(G, { cheerT: 0, ent: null, lastInput: 0, lastHelp: -99, helping: false, hearts: HEARTS, coins: 0, got: [], said: [], lost: 0, wrong: 0, falls: 0, t: 0, phase: 'play', phaseT: 0,
    safe: { x: P.x, y: P.y, z: P.z }, camY: P.y, lockedAt: -9, firstGood: true, jumpTold: false, ready: false });
  cam.snap = true;
  runner.root.position.set(P.x, P.y, P.z); runner.root.scale.setScalar(1); runner.yaw = 0.3; runner.flash = 0;
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
  for (const k of Object.keys(keys)) press(k, false);
  setScreen('title');
  const c = continueLevel();
  if (G.lv.dirty || c !== G.idx) load(c); else resetRun();
  drawLevels();
}

// ---------------------------------------------------------------- first-game demo (phonics-kit rule 1): Tata plays a
// little while the tutor explains and a glove points at the buttons; no rewards, no record; SKIP ends it
function pointHand(id) {
  const h = $('hand');
  for (const b of ['joy', 'bJump', 'bRight']) $(b).classList.remove('guide');
  h.classList.toggle('push', id === 'joy');
  if (!id) { h.classList.remove('show'); return; }
  const b = $(id === 'joy' ? 'knob' : id), r = b.getBoundingClientRect();
  $(id).classList.add('guide');
  h.style.left = (r.left + r.width * 0.5) + 'px'; h.style.top = (r.top + r.height * 0.5) + 'px';   // the fingertip (CSS) on the knob / button
  h.classList.add('show');
}
async function teachDemo() {
  const tok = ++G.demoTok;
  const alive = () => tok === G.demoTok && G.screen === 'play';
  app.classList.add('guide');
  G.auto = { x: 0, z: 0, jump: false };
  const stick = (x, z) => { G.auto.x = x; G.auto.z = z; joy.x = x; joy.z = z; drawJoy(); };
  const jumpBtn = on => { G.auto.jump = on; $('bJump').classList.toggle('on', on); };
  const d = () => -P.z;
  await wait(400); if (!alive()) return;
  await A.say('t:hello'); if (!alive()) return;
  await A.seq(['s:m', 0.1, 's:m', 0.2, 't:howto']); if (!alive()) return;
  pointHand(SIDE() ? 'bRight' : 'joy');
  await A.say('t:demo1'); if (!alive()) return;
  stick(SIDE() ? 0 : -0.35, -1);                               // run up and a little left: to the moon card
  await until(() => d() > 15.6 || !alive()); if (!alive()) return;
  stick(SIDE() ? 0 : 0.3, -1);
  await until(() => d() > 20 || !alive()); if (!alive()) return;
  stick(0, 0);
  await until(() => (Math.hypot(P.vx, P.vz) < 0.4 && !A.voiceBusy()) || !alive()); if (!alive()) return;
  pointHand('bJump');
  await A.say('t:demo2'); if (!alive()) return;
  stick(0, -1);
  await until(() => d() > 32.6 || !alive()); if (!alive()) return;
  G.autoJump = true; jumpBtn(true);
  await until(() => P.vy < 0 || !alive()); jumpBtn(false); if (!alive()) return;
  await until(() => (P.grounded && d() > 39.5) || !alive()); stick(0, 0); if (!alive()) return;
  pointHand(null);
  await until(() => Math.hypot(P.vx, P.vz) < 0.4 || !alive()); if (!alive()) return;
  await A.say('t:howto2'); if (!alive()) return;
  await A.say('t:tryit'); if (!alive()) return;
  endDemo();
}
function stopDemo() {
  if (!G.auto && !app.classList.contains('guide')) return;
  G.demoTok++; G.auto = null; G.autoJump = false;
  $('bJump').classList.remove('on'); joy.x = 0; joy.z = 0; drawJoy();
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
  Object.assign(P, { x: g.x + g.nx * 2.2, y: g.top, z: g.z + g.nz * 2.2, vx: 0, vy: 0, vz: 0, grounded: true });
  runner.root.scale.setScalar(1); runner.root.position.set(P.x, P.y, P.z); G.ent = null;
  setScreen('clear');
  A.sfx.clear();
  const last = LEVELS.every((L, i) => (save.stars[L.id] || 0) > 0 || i === G.idx) && G.idx === LEVELS.length - 1;
  setTimeout(() => A.say(last ? 't:allclear' : 't:clear'), 900);
}

// ---------------------------------------------------------------- physics (fixed small steps) — x right, z toward the camera
const inside = (p, x, z, m) => x > p.x0 - m && x < p.x1 + m && z > p.zMin - m && z < p.zMax + m;
function physics(dt, control) {
  const L = G.lv, r = PH.hw, K = G.auto || keys, grav = L.gravity || 1;
  const v = control && P.lock <= 0 ? inputVec() : { x: 0, z: 0 }, moving = Math.hypot(v.x, v.z) > 0.05;
  if (moving) P.yaw = SIDE() ? (v.z < 0 ? Math.PI - 0.55 : 0.55) : Math.atan2(v.x, v.z);   // side: a little toward the camera
  // run: the velocity turns toward the stick
  const acc = P.grounded ? (moving ? PH.accG : PH.decG) : (moving ? PH.accA : PH.decA);
  let dvx = v.x * PH.run - P.vx, dvz = v.z * PH.run - P.vz;
  const dl = Math.hypot(dvx, dvz), st = acc * dt;
  if (dl > st) { dvx *= st / dl; dvz *= st / dl; }
  P.vx += dvx; P.vz += dvz;
  // jump (coyote time + buffer)
  P.coyote = P.grounded ? PH.coyote : P.coyote - dt;
  const edge = G.auto ? G.autoJump : jumpEdge;
  if (control && edge) { P.buffer = PH.buffer; if (G.auto) G.autoJump = false; else jumpEdge = false; } else P.buffer -= dt;
  if (control && P.buffer > 0 && P.coyote > 0 && P.lock <= 0) {
    P.vy = PH.jumpV; P.grounded = false; P.ground = null; P.coyote = 0; P.buffer = 0;
    runner.jumped(); A.sfx.jump();
    E.puff(P.x, P.y + 0.05, P.z + 0.3, 0, 0.4, 0.5);
  }
  if (P.vy <= 0) P.boost = false;
  const g = (P.vy > 0 ? ((K.jump && control) || P.boost ? PH.gUp : PH.gCut) : PH.gDown) * grav;
  P.vy = Math.max(-PH.maxFall, P.vy - g * dt);
  // across: the ground blocks' sides stop Tata (she has to jump up onto a higher one); the path's edges are rails
  let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  for (const p of L.plats) {
    if (!p.solid || !(P.y < p.top - 0.05 && P.y + PH.h > p.bottom) || !inside(p, nx, nz, r)) continue;
    const pen = [[nx + r - p.x0, 'x0'], [p.x1 - (nx - r), 'x1'], [nz + r - p.zMin, 'z0'], [p.zMax - (nz - r), 'z1']].sort((a, b) => a[0] - b[0])[0][1];
    if (pen === 'x0') { nx = p.x0 - r; P.vx = 0; } else if (pen === 'x1') { nx = p.x1 + r; P.vx = 0; }
    else if (pen === 'z0') { nz = p.zMin - r; P.vz = 0; } else { nz = p.zMax + r; P.vz = 0; }
  }
  nx = SIDE() ? 0 : Math.min(Math.max(nx, -PATH_HALF + r), PATH_HALF - r);
  nz = Math.min(nz, L.start.z + 3);
  P.x = nx; P.z = Math.max(nz, -L.dMax);
  // down: land on tops (steps, lifts and bouncers only from above)
  const wasGrounded = P.grounded, impact = -P.vy;
  let ny = P.y + P.vy * dt, land = null;
  if (P.vy <= 0) {
    for (const p of L.plats) {
      if (!inside(p, P.x, P.z, r * 0.6)) continue;
      const tol = p.bounce ? 0.62 : 0.06 + Math.abs(p.dy || 0);
      if (P.y >= p.top - tol && ny <= p.top + 1e-4 && (!land || p.top > land.top)) land = p;
    }
  }
  if (land && land.bounce) {                                    // mushroom / jelly drum: boing — up high
    ny = land.top; P.vy = PH.bounceV; P.boost = true; P.grounded = false; P.ground = null; P.coyote = 0;
    land.bounce.t = 0; runner.jumped(); A.sfx.boing();
    E.puff(P.x, ny + 0.1, P.z, 0, 1.2, 0.7);
  } else if (land) {
    ny = land.top; P.vy = 0; P.grounded = true; P.ground = land;
    if (!wasGrounded) { runner.landed(impact, P.x, ny); if (impact > 6) A.sfx.land(); }
  } else { P.grounded = false; P.ground = null; }
  P.y = ny;
  if (P.grounded && !P.ground.moving && inside(P.ground, P.x, P.z, -1.0)) G.safe = { x: P.x, y: P.ground.top, z: P.z };
}

// ---------------------------------------------------------------- items
function touchItems() {
  const L = G.lv;
  for (const it of L.items) {
    if (it.state !== 'idle') continue;
    if (it.kind === 'coin') {
      if (Math.hypot(SIDE() ? 0 : it.x - P.x, it.z - P.z) < PH.hw + 0.35 && it.y > P.y - 0.25 && it.y < P.y + PH.h + 0.25) {
        takeCoin(it); G.coins++; drawCoins(true); A.sfx.coin();
      }
      continue;
    }
    const cy = it.root.position.y;
    const dx = Math.max(Math.hypot(SIDE() ? 0 : it.x - P.x, it.z - P.z) - PH.hw, 0);
    const dy = cy < P.y ? P.y - cy : cy > P.y + PH.h ? cy - (P.y + PH.h) : 0;
    const reach = it.m ? 0.78 : 0.5;            // forgiving: easy to take the /m/ ones, easy to jump over the others
    if (dx * dx + dy * dy < reach * reach) {
      if (it.m) {
        takeCard(it); G.got.push(it.word); drawSlots();
        A.sfx.good(); popText(mWord(it.word), '', it.x, cy + 1.1, it.z);
        const all = G.got.length === L.words.length;
        if (G.firstGood && !G.auto) { G.firstGood = false; A.seq(['w:' + it.word, 0.1, 't:' + pick(['good1', 'good2', 'good3'])]); }
        else A.say('w:' + it.word);
        if (all) wakeGate();
      } else if (P.inv <= 0) {
        takeCard(it); hurt('wrong');
        const lostC = Math.min(TRAP_COST, G.coins); G.coins -= lostC; drawCoins(false, lostC > 0);
        A.sfx.bad(); A.seq(['w:' + it.word, 0.1, 't:oops']);
        popText(it.word, 'bad', it.x, cy + 1.1, it.z);
        if (lostC) popText(`−${lostC}`, 'minus', P.x, P.y + 2.6, P.z);
        P.vz = 6.5; P.vx = (P.x < it.x ? -1 : 1) * 2; P.vy = 8.5; P.grounded = false; P.ground = null;   // bounced back toward the camera
        P.inv = 1.4; P.lock = 0.35; P.hurt = 0.5; runner.flash = 1.4;
        if (G.hearts <= 0) gameOver();
      }
      continue;
    }
    // say the word as the runner comes up to it (listen, then decide)
    const ahead = P.z - it.z;
    if (ahead > -0.5 && ahead < 6.5 && (SIDE() || Math.abs(it.x - P.x) < 3.2) && Math.abs(cy - (P.y + 1)) < 4.5 && G.t - it.spoken > 9 && !A.voiceBusy()) {
      it.spoken = G.t; it.pulse = 0.5; A.say('w:' + it.word);
    }
  }
}

// hands off for 8 s → the glove shows the run button again with the line (again every 15 s at most; phonics-kit '막힘 없음')
function idleHelp() {
  if (G.auto || qs.has('nohint')) return;
  if (G.t - (G.lastInput ?? 0) > 8 && G.t - (G.lastHelp ?? -99) > 15 && !A.voiceBusy() && Math.hypot(P.vx, P.vz) < 0.3) {
    G.lastHelp = G.t; G.helping = true;
    pointHand(SIDE() ? 'bRight' : 'joy'); A.say('t:demo1');
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
  const near = (SIDE() ? Math.abs(P.z - g.z) < 1.4 : Math.abs(P.x - g.x) < 2.2 && Math.abs(P.z - (g.z + 1.2)) < 1.6) && P.grounded && P.ground && Math.abs(P.ground.top - g.top) < 0.01;
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
    const p = toScreen(g.x, g.top + g.H + 0.5, g.z);
    hint.style.left = p.x + 'px'; hint.style.top = p.y + 'px';
  }
}
function openAndEnter() {
  const g = G.lv.gate;
  g.opening = true; A.sfx.open();
  G.cheerT = 0.85;                                             // a happy hop while the swirl opens
  setTimeout(() => { if (G.phase === 'say' || G.phase === 'play') { G.phase = 'enter'; G.phaseT = 0; G.ent = null; } }, 1150);
}
/** into the gate (user: "문이 열렸을때 자연스럽게 뛰어서 들어가게"): turn toward the portal while starting to run, run up to
 *  just in front of it, jump, dive through the swirl (Tata shrinks into it, sparkles, a flash) → the result card */
function enterGate(dt) {
  const g = G.lv.gate, n = { x: g.nx, z: g.nz };               // the portal's facing (toward the camera)
  const st = G.ent ||= { stage: 'run', t: 0, y: 0, yaw: runner.yaw, spd: 0, burst: false };
  st.t += dt; G.phaseT += dt;
  let sp = 0, vy = 0, grounded = true, scale = 1;
  const tx = g.x + n.x * 1.1, tz = g.z + n.z * 1.1;           // the take-off spot in front of the swirl
  const depth = () => (P.x - g.x) * n.x + (P.z - g.z) * n.z;   // how far in front of the portal plane
  if (st.stage === 'run') {
    const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
    st.spd = Math.min(5.2, st.spd + 14 * dt);
    const step = Math.min(d, st.spd * dt);
    if (d > 1e-4) { P.x += (dx / d) * step; P.z += (dz / d) * step; st.yaw = Math.atan2(dx, dz); }
    sp = st.spd;
    if (d < 0.04) {
      st.stage = 'jump'; st.t = 0; st.x0 = P.x; st.z0 = P.z; st.yaw = Math.atan2(-n.x, -n.z);   // turn to the portal
      runner.jumped(); A.sfx.jump(); A.sfx.portal();
      E.puff(P.x, P.y + 0.05, P.z, 0, 0.6, 0.6);
    }
  } else if (st.stage === 'jump') {
    const T = 0.7, u = Math.min(1, st.t / T), k = E.smooth(0, 1, u);
    st.y = 4 * 1.35 * u * (1 - u) + 0.5 * u;
    P.x = st.x0 + (g.x - n.x * 0.9 - st.x0) * k; P.z = st.z0 + (g.z - n.z * 0.9 - st.z0) * k;
    vy = 9 * (1 - 2 * u); grounded = false; sp = 3;
    scale = 1 - E.smooth(0.25, -0.85, depth()) * 0.999;
    if (!st.burst && depth() < 0.1) { st.burst = true; E.burst(new THREE.Vector3(g.x + n.x * 0.2, g.top + 2.0, g.z + n.z * 0.2), 0xffd6ff, 1.1); }
    g.U.uFlash.value = E.smooth(0.35, 1, u);
    $('flash').style.opacity = String(0.85 * E.smooth(0.7, 1, u));
    if (u >= 1) { st.stage = 'gone'; st.t = 0; }
  } else {
    scale = 0.001;
    if (st.t > 0.3) { $('flash').style.opacity = 0; g.U.uFlash.value = 0; levelClear(); return; }
  }
  P.vx = 0; P.vz = 0;
  runner.root.position.set(P.x, P.y + st.y, P.z);
  runner.root.scale.setScalar(Math.max(0.001, scale));
  runner.update(dt, { vx: sp, vy, grounded, facing: 1, max: PH.run, mode: 'steer', yaw: st.yaw });
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
  P.vx = 0; P.vz = 0; P.yaw = Math.atan2(-G.lv.gate.nx, -G.lv.gate.nz);
  for (const k of Object.keys(keys)) press(k, false);
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
  $('sayMic').className = 'smic';
  const box = $('say'); box.classList.remove('in'); void box.offsetWidth; box.classList.add('show', 'in');   // visible first: then it can be measured
  const sw = $('sayWord');
  sw.innerHTML = mWord(w); sw.dataset.w = w; sw.style.fontSize = '';
  // one line always (user: "단어가 두줄로 되지 않게 해"): shrink a long word (mushroom, monkey) to the card's width
  const maxW = sw.parentElement.clientWidth * 0.9;
  for (let k = 0; k < 12 && sw.scrollWidth > maxW; k++) sw.style.fontSize = (parseFloat(getComputedStyle(sw).fontSize) * 0.92) + 'px';
  void i;
}
function showSayDots() { $('sayDots').innerHTML = G.got.map(() => '<i></i>').join(''); }
function markDot(i, k) { $('sayDots').children[i]?.classList.add(k); }
function hideSay() { $('say').classList.remove('show', 'in'); app.classList.remove('saying'); }

// ---------------------------------------------------------------- camera: behind Tata, a little above, looking down the course
// (user: "영상처럼 뒤에서 따라가기"); the title and the dress room look at her from the front
function updateCamera(dt) {
  const L = G.lv;
  if (P.grounded) G.camY = P.y;
  if (P.y > G.camY + 3.2) G.camY = P.y - 3.2;
  if (G.phase === 'play' && P.y < G.camY - 3 && P.y > L.minTop - 1) G.camY = Math.max(P.y + 1, L.minTop);
  const asp = innerWidth / innerHeight, far = Math.min(1.45, Math.max(1, 1.5 / asp));
  E.camera.fov = !SIDE() && (G.screen === 'play' || G.screen === 'clear' || G.screen === 'over') ? 50 : 34; E.camera.updateProjectionMatrix();
  if (G.screen === 'shop') {
    // dress room: Tata alone in the window on the left, filling it (the view is shifted so she is at its centre)
    const w = $('dWin').getBoundingClientRect(), fit = Math.max(1, (innerHeight * 0.62) / Math.max(1, w.height));
    E.camera.position.set(P.x, P.y + 1.45, P.z + 6.6 * fit);
    E.camera.lookAt(P.x, P.y + 1.2, P.z);
    if (w.width) E.camera.setViewOffset(innerWidth, innerHeight, innerWidth / 2 - (w.left + w.width / 2), innerHeight / 2 - (w.top + w.height * 0.53), innerWidth, innerHeight);
  } else if (G.screen === 'title') {
    // title: Tata on the start pad facing us, the course (and the forest's rainbow) behind her
    E.camera.position.set(P.x + 1.2, P.y + 2.2, P.z + 9.5 * far);
    E.camera.lookAt(P.x + 0.4, P.y + 1.9, P.z - 2);
    cam.snap = true;
  } else if (SIDE()) {
    // from the side, a little behind, the course running to the right; look ahead the way Tata runs
    const fwd = P.yaw > Math.PI / 2 ? 1 : -1;                  // 1 = along the course (-z)
    cam.ahead = (cam.ahead ?? 2.2) + (fwd * 2.2 - (cam.ahead ?? 2.2)) * E.damp(1.6, dt);
    const cz = Math.min(L.start.z - 4.5, Math.max(-L.dMax + 6.5, P.z - cam.ahead));
    const want = new THREE.Vector3(17 * far, G.camY + 4.0, cz + 1.0), look = new THREE.Vector3(0, G.camY + 1.7, cz - 0.5);
    if (G.screen === 'clear') { want.set(P.x + 6.5, P.y + 2.4, P.z); look.set(P.x, P.y + 1.3, P.z); }
    if (cam.snap) { cam.pos.copy(want); cam.look.copy(look); cam.snap = false; }
    const k = E.damp(G.screen === 'clear' ? 3 : 5, dt);
    cam.pos.lerp(want, k); cam.look.lerp(look, k);
    E.camera.position.copy(cam.pos); E.camera.lookAt(cam.look);
  } else {
    const want = new THREE.Vector3(P.x * 0.55, G.camY + 4.1, P.z + 7.6 * far);
    const look = new THREE.Vector3(P.x * 0.75, G.camY + 1.3, P.z - 7);
    if (G.screen === 'clear') { want.set(P.x, P.y + 2.4, P.z + 6.5); look.set(P.x, P.y + 1.3, P.z); }
    if (cam.snap) { cam.pos.copy(want); cam.look.copy(look); cam.snap = false; }
    const k = E.damp(G.phase === 'enter' ? 3 : 6, dt);
    cam.pos.lerp(want, k); cam.look.lerp(look, k);
    E.camera.position.copy(cam.pos); E.camera.lookAt(cam.look);
  }
  // the say-it turn: the picture slides down a little so Tata stands under the big word card (centre)
  cam.shift = (cam.shift || 0) + ((G.phase === 'say' && G.screen === 'play' ? (SIDE() ? -0.17 : 0) : 0) - (cam.shift || 0)) * E.damp(4, dt);
  if (G.screen !== 'shop') {
    if (Math.abs(cam.shift) > 0.002) E.camera.setViewOffset(innerWidth, innerHeight, 0, cam.shift * innerHeight, innerWidth, innerHeight);
    else if (E.camera.view?.enabled) E.camera.clearViewOffset();
  }
  E.sky.position.copy(E.camera.position);
  E.sunFollow(P.x, P.y, P.z);
}

// ---------------------------------------------------------------- frame
function tick(dt) {
  G.t += dt;
  const L = G.lv;
  updateLifts(L.plats, G.t, dt, P.grounded ? P.ground : null);
  if (P.grounded && P.ground?.moving && G.phase !== 'enter') { P.x += P.ground.dx; P.y += P.ground.dy; P.z += P.ground.dz; }
  E.playerLight.position.set(P.x + 0.6, P.y + 2.6, P.z + 2.4);
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
        Object.assign(P, { x: G.safe.x, y: G.safe.y + 0.02, z: G.safe.z, vx: 0, vy: 0, vz: 0, grounded: false, ground: null, inv: 1.6, lock: 0.2 });
        runner.flash = 1.6; G.camY = G.safe.y; G.phase = 'play';
      }
    }
  } else if (playing && G.phase === 'enter') {
    enterGate(dt);
  } else {
    if ((G.screen === 'title' || G.screen === 'shop') && (P.y < -1 || !isFinite(P.y) || !isFinite(P.x))) {
      Object.assign(P, { x: L.start.x, y: L.start.y, z: L.start.z, vx: 0, vy: 0, vz: 0, grounded: true, ground: L.plats[0] }); G.camY = P.y;
    }
    physics(dt, false);           // say turn, done, title, shop, results: stand
  }
  if (G.phase !== 'enter') {                                  // (entering the gate, enterGate drives Tata itself)
    runner.root.position.set(P.x, P.y, P.z);
    if (G.cheerT > 0) G.cheerT -= dt;
    const sp = Math.hypot(P.vx, P.vz), still = P.grounded && sp < 0.3;
    const mode = P.hurt > 0 ? 'hurt' : G.screen === 'clear' || G.cheerT > 0 ? 'cheer'
      : G.phase === 'say' ? 'idle' : still ? (G.screen === 'title' || G.screen === 'shop' ? 'title' : 'idle') : 'play';
    if (G.screen === 'shop' && !(G.cheerT > 0)) runner.update(dt, { vx: 0, vy: 0, grounded: true, facing: 1, max: PH.run, mode: 'steer', yaw: G.shopYaw });
    else runner.update(dt, { vx: sp, vy: P.vy, grounded: P.grounded, facing: 1, max: PH.run, mode, yaw: P.yaw, idleYaw: SIDE() ? Math.PI / 2 - 0.25 : 0.35 });
  }
  if (playing || G.screen === 'clear') updateGate(dt);
  updateItems(L.items, dt, G.t);
  E.updateSparks(dt);
  E.updateDust(dt);
  for (const b of E.balloons) {
    b.position.y += Math.sin(G.t * 0.7 + b.userData.bob) * 0.004;
    const pr = b.getObjectByName('prop'); if (pr) pr.rotation.y += dt * 9;
  }
  runWaiters();
  W.updateWorld(dt, G.t, L.root, E.camera.position);
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

// the view toggle (title only): two picture buttons, behind / side
function showView() { app.dataset.view = VIEW; for (const b of document.querySelectorAll('#viewTog button')) b.classList.toggle('on', b.dataset.v === VIEW); }
for (const b of document.querySelectorAll('#viewTog button')) b.addEventListener('click', () => {
  if (b.dataset.v === VIEW) return;
  A.unlock(); A.sfx.tap(); VIEW = b.dataset.v; try { localStorage.setItem(VIEW_KEY, VIEW); } catch (e) { /* ignore */ }
  showView(); load(G.idx);
});
showView();

// dress room (Phonics Match's): coins → things for Tata to wear (a reward has to be spendable). One item per body part;
// tap an owned one to wear / take it off. Tata stands in the window: drag to turn her all the way round (360°).
const HANGER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.2a1.9 1.9 0 1 1 1.9-1.9c0 1-.8 1.5-1.9 2.1v1.4l8.3 5.4a1.2 1.2 0 0 1-.7 2.2H4.4a1.2 1.2 0 0 1-.7-2.2L12 8.8"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19.5 7"/></svg>';
let shopFrom = 'title';
function drawShop() {
  $('wallet').textContent = save.wallet || 0;
  $('items').innerHTML = ITEMS.map(it => {
    const own = save.owned.includes(it.id), on = save.worn[it.slot] === it.id, can = (save.wallet || 0) >= it.price;
    const tag = on ? `<span class="tag worn">${CHECK}</span>` : own ? `<span class="tag own">${HANGER}</span>`
      : `<span class="tag price"><i class="coin-ic"><b>m</b></i>${it.price}</span>`;
    return `<button class="item${own ? ' own' : ''}${on ? ' on' : ''}${!own && !can ? ' poor' : ''}" data-id="${it.id}" aria-label="${it.name}">
      <span class="pic"><img src="${ICON[it.id]}" alt="" draggable="false"></span>${tag}</button>`;
  }).join('');
  for (const b of $('items').children) b.addEventListener('click', () => shopTap(b.dataset.id, b));
}
function shopTap(id, el) {
  const it = itemById(id);
  let pop = null;
  if (save.owned.includes(id)) {
    if (save.worn[it.slot] === id) { delete save.worn[it.slot]; A.sfx.tap(); }
    else { save.worn[it.slot] = id; pop = id; A.sfx.buy(); G.cheerT = 0.7; if (Math.random() < 0.5) A.say('t:buy'); }
  } else if ((save.wallet || 0) >= it.price) {
    save.wallet -= it.price; save.owned.push(id); save.worn[it.slot] = id; pop = id;
    A.sfx.buy(); A.say('t:buy'); G.cheerT = 0.9;
    E.burst(new THREE.Vector3(P.x, P.y + 1.6, 0.6), 0xfff3a0, 0.8);
  } else {
    A.sfx.nope(); A.say('t:nocoin');
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    return;
  }
  writeSave(); runner.setOutfit(outfit(), pop); drawShop(); drawLevels();
}
function openShop(from) {
  A.unlock(); A.sfx.tap(); shopFrom = from;
  if (from === 'clear') { Object.assign(P, { x: G.lv.start.x, y: 0, z: G.lv.start.z, vx: 0, vy: 0, vz: 0, grounded: true, ground: G.lv.plats[0] }); runner.root.scale.setScalar(1); }
  G.shopYaw = 0.35; drawShop(); setScreen('shop'); A.say('t:shop');
}
$('btnShop').addEventListener('click', () => openShop('title'));
$('cDress').addEventListener('click', () => openShop('clear'));
$('shopClose').addEventListener('click', () => {
  A.sfx.tap();
  if (shopFrom === 'clear') toTitle(); else { setScreen('title'); drawLevels(); }
});
// drag in the window turns Tata (no snapping back — like Match's dress room); a tap makes her hop
{
  const win = $('dWin'); let drag = null;
  win.addEventListener('pointerdown', e => { drag = { x: e.clientX, y0: G.shopYaw, moved: 0 }; win.setPointerCapture(e.pointerId); e.preventDefault(); });
  win.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); G.shopYaw = drag.y0 + dx * 0.012; });
  const end = () => { if (drag && drag.moved < 6) { G.cheerT = 0.6; A.sfx.tap(); } drag = null; };
  win.addEventListener('pointerup', end); win.addEventListener('pointercancel', end);
}

$('btnStart').addEventListener('click', () => startLevel(G.idx));
$('btnExit').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('btnSound').addEventListener('click', () => { A.unlock(); A.setMuted(!A.isMuted()); app.classList.toggle('muted', A.isMuted()); A.sfx.tap(); });
app.classList.toggle('muted', A.isMuted());
$('cHome').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('oHome').addEventListener('click', () => { A.sfx.tap(); toTitle(); });
$('cAgain').addEventListener('click', () => startLevel(G.idx));
$('oAgain').addEventListener('click', () => startLevel(G.idx));
$('cNext').addEventListener('click', () => { const n = Math.min(LEVELS.length - 1, G.idx + 1); load(n); startLevel(n); });
addEventListener('resize', () => { E.onResize(); if (G.auto) pointHand($('bJump').classList.contains('guide') ? 'bJump' : $('joy').classList.contains('guide') ? 'joy' : null); });

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
  teleport(d, y, x = 0) { P.x = x; P.y = y; P.z = -d; P.vx = 0; P.vy = 0; P.vz = 0; P.grounded = false; G.camY = y; cam.snap = true; },
  move: (x, z) => { joy.on = x !== 0 || z !== 0; joy.x = x; joy.z = z; drawJoy(); },
  give(n) { save.wallet = (save.wallet || 0) + n; writeSave(); drawLevels(); },
  env: E, tata: runner, get P() { return P; }, get lv() { return G.lv; }, get G() { return G; },   // tests
  sayCard: w => { app.classList.add('saying'); showSayCard(w, 0); const r = $('sayWord').getBoundingClientRect(); return { h: r.height, w: r.width, card: $('sayWord').parentElement.clientWidth, font: getComputedStyle($('sayWord')).fontSize }; },
  unlockAll() { for (const L of LEVELS) save.stars[L.id] = save.stars[L.id] || 1; drawLevels(); },   // tests
  load: i => { load(i); drawLevels(); },   // tests: a world on the title
  shop: () => $('btnShop').click(), buy: id => shopTap(id, document.body), turn: y => { G.shopYaw = y; },
  get state() { return { screen: G.screen, phase: G.phase, x: P.x, y: P.y, z: P.z, d: -P.z, vx: P.vx, vy: P.vy, grounded: P.grounded, hearts: G.hearts, coins: G.coins, got: [...G.got], said: [...G.said], words: G.lv.words, wallet: save.wallet, worn: { ...save.worn }, demo: !!G.auto, t: G.t }; },
  screenAt: (x, y, z) => toScreen(x, y, z),
  ready: fontsReady.then(() => new Promise(r => setTimeout(r, 300))),
};
fontsReady.then(() => {
  for (const f of E.redraws) f();
  refreshCoin();
  if (!CAPTURE) {
    let last = performance.now();
    // one bad frame must never stop the game (user: "멈추는 에러도 있는걸"): the error is logged and the loop goes on
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      try { tick(dt); } catch (e) { console.error('frame error', e); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
});
