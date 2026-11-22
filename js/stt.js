/* Phonics Puzzle (copied from Eye Catch) — on-device speech recognition (whisper tiny.en on ONNX Runtime WASM in a worker): the BACKUP judge.
 * The company phonics-api judges first when this device has a key (js/phonics-api.js, game.js judgeSpeech).
 * The worker is Phonics Match's built sttWorker (js/stt-worker.js; source: Phonics-Match src/core/sttWorker.ts +
 * sttCheck.ts): it loads the model from ./stt/models and the runtime from ./stt/ort — nothing comes from outside and
 * the child's audio never leaves the page. Needs http(s): from file:// there is no worker, and the game lets the
 * player tap the picture instead.
 *
 * judge(pcm16k, target, rivals) -> 'ok' | 'wrong' | 'unclear' | null (no recogniser)
 *   ok      = the worker's reading check passes, or the target scores best of all the pictures on the table
 *   wrong   = it heard another picture's word (exactly, or that word clearly beats the target)
 *   unclear = speech, but neither
 */
(function () {
  'use strict';
  const STT = { state: 'off', progress: 0, last: null };
  let worker = null, seq = 0;
  const waiting = new Map(), readyFns = [];

  STT.preload = function () {
    if (worker || STT.state === 'error') return;
    if (location.protocol === 'file:' || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') { STT.state = 'error'; return; }
    try { worker = new Worker('js/stt-worker.js', { type: 'module' }); } catch (e) { STT.state = 'error'; return; }
    STT.state = 'loading';
    worker.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'ready') { STT.state = 'ready'; readyFns.splice(0).forEach(f => f(true)); }
      else if (d.type === 'error') { STT.state = 'error'; console.warn('stt load failed', d.error); readyFns.splice(0).forEach(f => f(false)); }
      else if (d.type === 'progress') { STT.progress = d.total ? d.loaded / d.total : 0; }
      else if (d.type === 'checked') { const f = waiting.get(d.id); waiting.delete(d.id); f && f(d.error ? null : d.r); }
    };
    worker.onerror = (e) => { STT.state = 'error'; console.warn('stt worker', e.message); readyFns.splice(0).forEach(f => f(false)); };
    worker.postMessage({ type: 'load', base: new URL('./', location.href).href, model: 'onnx-community/whisper-tiny.en' });
  };
  STT.whenReady = function (ms) {
    if (STT.state === 'ready') return Promise.resolve(true);
    if (STT.state !== 'loading') return Promise.resolve(false);
    return new Promise(res => { const t = setTimeout(() => res(false), ms); readyFns.push(ok => { clearTimeout(t); res(ok); }); });
  };
  function check(audio, target, alts, rivals, ms = 12000) {
    if (!worker || STT.state !== 'ready') return Promise.resolve(null);
    const id = ++seq, a = new Float32Array(audio);
    return new Promise(res => {
      waiting.set(id, res);
      worker.postMessage({ type: 'check', id, audio: a, target, alts, rivals }, [a.buffer]);
      setTimeout(() => { if (waiting.delete(id)) res(null); }, ms);
    });
  }
  const words = s => (String(s).toLowerCase().match(/[a-z]+/g) || []);
  const SAME = { meat: ['meet'], mitt: ['mit', 'mitts'], mouse: ['mouses'], mice: [], mail: ['mails', 'male'], mask: ['masks'], mat: ['mats', 'matt'], match: ['matches'], mouth: ['mouths'], man: ['men'], monkey: ['monkeys'], mushroom: ['mushrooms'], mirror: ['mirrors', 'mira', 'mirra', 'miro', 'mirro'], moon: ['moons'], milk: ['milks'], mug: ['mugs', 'muck', 'mugg'], map: ['maps'], mop: ['mops'],
    mat: ['matt', 'mats'], mail: ['male', 'mails'], mask: ['masks'], match: ['matches'], mice: ['mise'], mouth: ['mouths'] };
  const said = (w, text) => { const ws = words(text); return ws.includes(w) || (SAME[w] || []).some(x => ws.includes(x)); };

  STT.judge = async function (pcm16k, target, rivals) {
    if (STT.state === 'loading') await STT.whenReady(20000);
    if (STT.state !== 'ready') return null;
    const r = await check(pcm16k, target, SAME[target] || [], rivals);
    STT.last = r && { target, ...r };
    if (!r) return 'unclear';
    if (said(target, r.text)) return 'ok';
    const other = rivals.find(w => said(w, r.text));
    if (other) return 'wrong';
    // a hum ("Mmm…") is not a word: whisper scores it close to the short m-words (mop, mouse)
    if (/^\s*(h?m+|um+)[\s,.!?]*$/i.test(r.text || '')) return 'unclear';
    // Phonics Match's rule (r.ok) lets a rival with ANOTHER first sound win by up to 2; here every picture starts
    // with m, so the target itself must score best (tools/qa/stt_check.py: the mitt clip passed for mop at +1.2)
    if (r.ok && r.rgap < -0.3) return 'ok';
    if (r.pNo < 0.35 && r.sT > -6.5 && r.rgap < -1.5 && r.gap < 6) return 'ok';           // the target clearly beats every picture
    const best = Object.entries(r.rv || {}).sort((a, b) => b[1] - a[1])[0];
    if (best && r.pNo < 0.35 && best[1] > r.sT + 2 && best[1] > -7.5) return 'wrong';     // another picture, clearly
    return 'unclear';
  };
  window.STT = STT;
})();
