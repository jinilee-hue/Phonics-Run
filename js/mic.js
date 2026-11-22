/* Phonics Puzzle (copied from Eye Catch) — microphone. Opened once at START (permission asked then) and kept running, with a 1 s ring buffer:
 * a child often shouts the word WHILE hitting the button, so a listen started by the button also gets the last
 * 0.7 s before it. One utterance is kept in memory, judged and dropped — nothing is recorded to disk. With a phonics-api
 * key on the device it is sent once to the company server (js/phonics-api.js; the server does not store audio),
 * otherwise only the on-device recogniser (js/stt.js) hears it. Energy voice detector like Phonics Match's (core/mic.ts).
 */
(function () {
  'use strict';
  const Mic = { state: 'off', stream: null, node: null, sr: 48000 };   // off | asking | on | denied | none
  const FRAME_S = 0.02, PRE_S = 0.7, RING_S = 1.2;
  let ring = [], listeners = new Set(), floor = 0.004;
  const WORKLET = `class EcCap extends AudioWorkletProcessor {
    constructor(o) { super(); this.n = o.processorOptions.frame; this.b = new Float32Array(this.n); this.i = 0; }
    process(inputs) { const c = inputs[0] && inputs[0][0];
      if (c) for (let k = 0; k < c.length; k++) { this.b[this.i++] = c[k]; if (this.i === this.n) { this.port.postMessage(this.b.slice(0)); this.i = 0; } }
      return true; } }
  registerProcessor('ec-cap', EcCap);`;

  Mic.supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext && typeof AudioWorkletNode !== 'undefined';

  /** ask once; resolves to the state ('on' | 'denied' | 'none') */
  Mic.open = async function (ctx) {
    if (Mic.state === 'on') return 'on';
    if (!Mic.supported() || !ctx) { Mic.state = 'none'; return Mic.state; }
    Mic.state = 'asking';
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (ctx.state === 'suspended') await ctx.resume();
      Mic.sr = ctx.sampleRate;
      const F = Math.round(ctx.sampleRate * FRAME_S);
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'ec-cap', { processorOptions: { frame: F }, numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      const sink = ctx.createGain(); sink.gain.value = 0;
      src.connect(node); node.connect(sink); sink.connect(ctx.destination);
      node.port.onmessage = (e) => {
        const f = e.data;
        let s = 0; for (let k = 0; k < f.length; k++) s += f[k] * f[k];
        const rms = Math.sqrt(s / f.length);
        ring.push({ f, rms });
        if (ring.length > RING_S / FRAME_S) ring.shift();
        if (!Sound.talking && rms < Math.max(0.01, floor * 3.2)) floor = rms < floor ? floor * 0.8 + rms * 0.2 : floor * 0.995 + rms * 0.005;
        listeners.forEach(fn => fn(f, rms));
      };
      Mic.stream = stream; Mic.node = node; Mic.state = 'on';
      stream.getAudioTracks().forEach(t => t.addEventListener('ended', () => { Mic.state = 'none'; }));
    } catch (e) {
      const n = e && e.name;
      Mic.state = (n === 'NotAllowedError' || n === 'SecurityError') ? 'denied' : 'none';
      console.warn('mic:', n || e);
    }
    return Mic.state;
  };

  /**
   * One utterance, starting with the last PRE_S seconds. opts: waitMs (no voice by then -> silence), maxMs, endMs,
   * onLevel(0..1), aborted(). Resolves {kind:'speech', pcm, sr} | {kind:'silence'} | {kind:'aborted'} | {kind:'nomic'}
   */
  Mic.listen = function (o = {}) {
    if (Mic.state !== 'on') return Promise.resolve({ kind: 'nomic' });
    const waitMs = o.waitMs ?? 4500, maxMs = o.maxMs ?? 3500, endMs = o.endMs ?? 800;   // a child's "mush… room" pause fits
    return new Promise(resolve => {
      const frames = ring.slice(-Math.round(PRE_S / FRAME_S));    // the lead-in
      let start = -1, last = -1, run = 0, voiced = 0, done = false, n = 0;
      const live0 = frames.length;
      const thr = () => Math.max(0.012, floor * 3.2);
      const judge = (i) => {
        const on = frames[i].rms > thr();
        if (start < 0) {
          run = on ? run + 1 : 0;
          if (run >= 4) { start = i - 3; last = i; voiced = run; }
        } else if (on) { voiced++; last = i; }
      };
      for (let i = 0; i < frames.length; i++) judge(i);
      const finish = (r) => { if (done) return; done = true; listeners.delete(fn); clearInterval(poll); o.onLevel && o.onLevel(0); resolve(r); };
      const utter = () => {
        const a = Math.max(0, start - 12), b = Math.min(frames.length, last + 10);
        const F = frames[0].f.length, pcm = new Float32Array((b - a) * F);
        for (let i = a; i < b; i++) pcm.set(frames[i].f, (i - a) * F);
        return { kind: 'speech', pcm, sr: Mic.sr, voicedMs: voiced * 20 };
      };
      const fn = (f, rms) => {
        if (done) return;
        frames.push({ f, rms }); n++;
        const i = frames.length - 1;
        judge(i);
        o.onLevel && o.onLevel(Math.min(1, Math.sqrt(rms / 0.15)));
        if (start < 0) { if (n * 20 >= waitMs) finish({ kind: 'silence' }); return; }
        const quiet = (i - last) * 20, long = (i - Math.max(start, live0 - 1)) * 20;
        // a blip (the button's own sound, a knock) is not the answer: forget it and keep waiting for the word,
        // instead of ending the turn's listen on it
        if (quiet >= endMs && voiced < 10 && n * 20 < waitMs) { start = -1; run = 0; voiced = 0; return; }
        if (quiet >= endMs || long >= maxMs) finish(voiced >= 8 ? utter() : { kind: 'silence' });
      };
      listeners.add(fn);
      const poll = setInterval(() => { if (o.aborted && o.aborted()) finish({ kind: 'aborted' }); }, 100);
    });
  };

  /** any-rate mono PCM -> 16 kHz, peak-normalised, 0.25 s of silence each side (what whisper likes) */
  Mic.prepare = async function (pcm, sr) {
    let out = pcm;
    if (sr !== 16000) {
      const len = Math.max(1, Math.ceil(pcm.length * 16000 / sr));
      const oc = new OfflineAudioContext(1, len, 16000);
      const b = oc.createBuffer(1, pcm.length, sr); b.copyToChannel(new Float32Array(pcm), 0);
      const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
      out = (await oc.startRendering()).getChannelData(0);
    }
    let peak = 0; for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
    const g = peak > 0.001 ? Math.min(8, 0.9 / peak) : 1, pad = 4000;
    const r = new Float32Array(out.length + pad * 2);
    for (let i = 0; i < out.length; i++) r[pad + i] = out[i] * g;
    return r;
  };

  window.Mic = Mic;
})();
