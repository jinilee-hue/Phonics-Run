// Sound: lesson-pack word clips + the letter sound /m/, tutor lines (EN t:* / KO k:*, the one tutor voice of the phonics
// games — tools/build_voice.py → js/voice.js + assets/voice), the background loop (tools/make_bgm.py → assets/audio/bgm.mp3)
// and small synthesized effects. One AudioContext, made on the first touch / key. Every voice clip has a safety timer
// (clip length + 0.8 s) so nothing waits forever (phonics-kit rule). The language toggle switches tutor lines only.
const MUTE_KEY = 'phonics-run.muted', LANG_KEY = 'phonics-run.lang';
const A = {
  ctx: null, master: null, sfxBus: null, voiceBus: null, bgmBus: null,
  muted: false, lang: 'ko', talking: 0, listening: false,
};
try { A.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* storage blocked */ }
try { A.lang = localStorage.getItem(LANG_KEY) || 'ko'; } catch (e) { /* first visit: Korean */ }
window.Sound = A;              // js/mic.js reads Sound.talking (no noise-floor learning while the tutor talks)

let VOICE = null;              // { clips: { key: [file, start, gain, dur] } } once js/voice.js exists
const voiceReady = import('./voice.js').then(m => { VOICE = m.VOICE; }).catch(() => { VOICE = null; });

export function unlock() {
  if (!A.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 1; A.master.connect(A.ctx.destination);
    A.sfxBus = A.ctx.createGain(); A.sfxBus.gain.value = 0.55; A.sfxBus.connect(A.master);
    A.voiceBus = A.ctx.createGain(); A.voiceBus.gain.value = 1.0; A.voiceBus.connect(A.master);
    A.bgmBus = A.ctx.createGain(); A.bgmBus.gain.value = 0; A.bgmBus.connect(A.master);
  }
  if (A.ctx.state === 'suspended') A.ctx.resume();
}
export const ctx = () => A.ctx;
export const isMuted = () => A.muted;
export function setMuted(m) {
  A.muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) { /* ignore */ }
  if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 1, A.ctx.currentTime, 0.03);
}
export const lang = () => A.lang;
export function setLang(l) { A.lang = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- clips
const buffers = {}, loading = {};
async function clipInfo(key) {
  await voiceReady;
  const c = VOICE?.clips?.[key];
  return c ? { url: `assets/voice/${c[0]}`, start: c[1], gain: c[2], dur: c[3] } : null;
}
function loadUrl(url) {
  if (buffers[url]) return Promise.resolve(buffers[url]);
  if (!loading[url]) {
    loading[url] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => {
        const go = () => A.ctx.decodeAudioData(b, res, rej);
        if (A.ctx) go(); else { const iv = setInterval(() => { if (A.ctx) { clearInterval(iv); go(); } }, 200); }
      }))
      .then(buf => (buffers[url] = buf)).catch(() => null);
  }
  return loading[url];
}
export async function preload(keys) { for (const k of keys) { const c = await clipInfo(k); if (c) loadUrl(c.url); } }

let voice = null, voiceSeq = 0;
export const voiceBusy = () => !!voice && A.ctx && A.ctx.currentTime < voice.end;
/** tutor line ('t:key' → 'k:key' in Korean), word 'w:moon', letter sound 's:m'. Cuts the clip before. Resolves at the end. */
export async function say(key) {
  if (!A.ctx) return;
  if (key.startsWith('t:') && A.lang === 'ko') key = 'k:' + key.slice(2);
  const my = ++voiceSeq, log = window.__voiceLog;
  log?.push([Math.round(performance.now()), key, 'ask']);
  const c = await clipInfo(key);
  if (!c || my !== voiceSeq) { log?.push([Math.round(performance.now()), key, c ? 'cut-before' : 'missing']); return; }
  const buf = await loadUrl(c.url);
  if (!buf || my !== voiceSeq) { log?.push([Math.round(performance.now()), key, buf ? 'cut-before' : 'no-buffer']); return; }
  stopVoice(true);
  const src = A.ctx.createBufferSource(); src.buffer = buf;
  const g = A.ctx.createGain(); g.gain.value = c.gain;
  src.connect(g); g.connect(A.voiceBus);
  const dur = c.dur || buf.duration - c.start;
  src.start(0, c.start, dur);
  voice = { src, end: A.ctx.currentTime + dur };
  A.talking++; duck();
  return new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; A.talking = Math.max(0, A.talking - 1); duck(); log?.push([Math.round(performance.now()), key, 'end']); res(); };
    const t = setTimeout(fin, (dur + 0.8) * 1000);
    src.onended = () => { clearTimeout(t); fin(); };
    src._fin = () => { clearTimeout(t); fin(); };
  });
}
/** several clips in a row: numbers are pauses in seconds */
let seqTok = 0;
export async function seq(list, gap = 0.06) {
  const tok = ++seqTok;
  for (const k of list) {
    if (tok !== seqTok) return;                       // stopped, or another sequence started
    if (typeof k === 'number') { await wait(k * 1000); continue; }
    await say(k);
    if (tok !== seqTok) return;
    await wait(gap * 1000);
  }
}
/** "/m/ /m/ moon" */
export const chant = w => seq(['s:m', 0.1, 's:m', 0.18, 'w:' + w], 0.04);
export function stopVoice(keepSeq) {
  if (!keepSeq) { voiceSeq++; seqTok++; }
  if (voice) { const v = voice; voice = null; try { v.src.onended = null; v.src.stop(); } catch (e) { /* ignore */ } v.src._fin?.(); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- music (quiet under the voice, almost off while listening)
let bgmSrc = null, bgmOn = false;
export async function music(on) {
  bgmOn = on;
  if (!A.ctx) return;
  if (on && !bgmSrc) {
    const buf = await loadUrl('assets/audio/bgm.mp3');
    if (!buf || bgmSrc || !bgmOn) { duck(); return; }
    bgmSrc = A.ctx.createBufferSource(); bgmSrc.buffer = buf; bgmSrc.loop = true;
    bgmSrc.loopStart = 0; bgmSrc.loopEnd = Math.min(24, buf.duration);     // 16 bars at 160 BPM (tools/make_bgm.py)
    bgmSrc.connect(A.bgmBus); bgmSrc.start();
  }
  duck();
}
export function setListening(v) { A.listening = v; duck(); }
function duck() {
  if (!A.ctx) return;
  const v = bgmOn ? (A.listening ? 0.006 : A.talking ? 0.05 : 0.14) : 0;
  A.bgmBus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.12);
}

// ---------------------------------------------------------------- effects
function env(g, t0, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function tone(type, f0, f1, dur, peak = 0.3, delay = 0, a = 0.005) {
  if (!A.ctx) return;
  const t0 = A.ctx.currentTime + delay;
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.9);
  env(g, t0, a, peak, dur);
  o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, peak, f0, f1, delay = 0, q = 0.8) {
  if (!A.ctx) return;
  const t0 = A.ctx.currentTime + delay, n = Math.floor(A.ctx.sampleRate * dur);
  const b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = A.ctx.createBufferSource(); s.buffer = b;
  const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = A.ctx.createGain(); env(g, t0, 0.01, peak, dur);
  s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
}
export const sfx = {
  jump() { tone('square', 330, 760, 0.16, 0.09); tone('triangle', 330, 760, 0.16, 0.2); },
  coin() { tone('square', 988, 988, 0.07, 0.07); tone('triangle', 988, 988, 0.07, 0.18); tone('triangle', 1319, 1319, 0.22, 0.2, 0.065); },
  good() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.22, 0.22, i * 0.06)); noise(0.35, 0.05, 6000, 9000, 0.05, 2); },
  bad() { tone('sawtooth', 260, 150, 0.32, 0.12); tone('square', 196, 110, 0.32, 0.06, 0.02); },
  hurt() { tone('triangle', 620, 180, 0.4, 0.25); },
  fall() { tone('triangle', 900, 120, 0.7, 0.22); noise(0.6, 0.05, 2000, 300, 0.05); },
  land() { noise(0.09, 0.12, 380, 160, 0, 1.2); },
  locked() { tone('triangle', 392, 392, 0.12, 0.18); tone('triangle', 330, 330, 0.18, 0.18, 0.12); },
  open() { [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f * 1.003, 0.3, 0.18, i * 0.08)); },
  portal() { noise(1.0, 0.12, 300, 5000, 0, 1.4); [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, 0.5, 0.12, 0.15 + i * 0.09)); },
  clear() {
    const n = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.54], [1047, 0.66]];
    n.forEach(([f, d]) => { tone('square', f, f, 0.2, 0.05, d); tone('triangle', f, f, 0.24, 0.2, d); });
    tone('triangle', 1319, 1319, 0.7, 0.22, 0.8);
  },
  tap() { tone('triangle', 660, 880, 0.08, 0.12); },
  listen() { tone('sine', 880, 1175, 0.12, 0.14); },
  buy() { [659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, f, 0.18, 0.2, i * 0.05)); noise(0.3, 0.05, 5000, 9000, 0.1, 2); },
  nope() { tone('triangle', 300, 220, 0.2, 0.18); },
};
