(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const A = {
    ctx: null, master: null, muted: false, vol: 0.7,
    hum: null, humGain: null, humFilt: null,
    vent: null, ventGain: null,
    turb: null, turbGain: null,
    buzz: null, buzzGain: null,
    ring: null, ringGain: null, ringTimer: null,
    klax: null, klaxGain: null,
    started: false
  };

  function noiseBuffer(ctx, secs, brown) {
    const n = Math.floor(ctx.sampleRate * secs);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return b;
  }

  function start() {
    if (A.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.started = true;
    const c = A.ctx;

    A.master = c.createGain();
    A.master.gain.value = A.muted ? 0 : A.vol;
    A.master.connect(c.destination);

    A.humGain = c.createGain(); A.humGain.gain.value = 0;
    A.humFilt = c.createBiquadFilter();
    A.humFilt.type = 'lowpass'; A.humFilt.frequency.value = 420; A.humFilt.Q.value = 0.8;
    A.humGain.connect(A.humFilt); A.humFilt.connect(A.master);
    A.hum = [];
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator();
      o.type = i < 2 ? 'sawtooth' : 'sine';
      o.frequency.value = 59 + i * 0.7;
      const g = c.createGain();
      g.gain.value = i < 2 ? 0.16 : 0.09;
      o.connect(g); g.connect(A.humGain);
      o.start();
      A.hum.push({ o: o, g: g });
    }

    const vb = noiseBuffer(c, 3, true);
    A.vent = c.createBufferSource();
    A.vent.buffer = vb; A.vent.loop = true;
    const vf = c.createBiquadFilter();
    vf.type = 'lowpass'; vf.frequency.value = 380;
    A.ventGain = c.createGain(); A.ventGain.gain.value = 0.10;
    A.vent.connect(vf); vf.connect(A.ventGain); A.ventGain.connect(A.master);
    A.vent.start();

    A.turb = c.createOscillator();
    A.turb.type = 'sawtooth';
    A.turb.frequency.value = 214;
    A.turbGain = c.createGain(); A.turbGain.gain.value = 0;
    const tf = c.createBiquadFilter();
    tf.type = 'lowpass'; tf.frequency.value = 900;
    A.turb.connect(tf); tf.connect(A.turbGain); A.turbGain.connect(A.master);
    A.turb.start();

    A.buzz = c.createOscillator();
    A.buzz.type = 'square';
    A.buzz.frequency.value = 320;
    A.buzzGain = c.createGain(); A.buzzGain.gain.value = 0;
    const bf = c.createBiquadFilter();
    bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 1.4;
    A.buzz.connect(bf); bf.connect(A.buzzGain); A.buzzGain.connect(A.master);
    A.buzz.start();

    A.klax = c.createOscillator();
    A.klax.type = 'sawtooth';
    A.klax.frequency.value = 440;
    A.klaxGain = c.createGain(); A.klaxGain.gain.value = 0;
    A.klax.connect(A.klaxGain); A.klaxGain.connect(A.master);
    A.klax.start();

    for (const k in SFX) decodeSfx(SFX[k]);
  }

  function ping(freq, dur, type, gain, slideTo) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime;
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain === undefined ? 0.2 : gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function burst(dur, freq, gain) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, dur + 0.05, false);
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq || 1400;
    const g = c.createGain();
    g.gain.setValueAtTime(gain === undefined ? 0.3 : gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  const click = () => ping(2100, 0.035, 'square', 0.055);
  const camSwitch = () => burst(0.16, 5200, 0.14);

  // ---- sampled sfx --------------------------------------------------------
  // Fetched at load, decoded once the context exists. Everything here degrades
  // to synthesis if the file never arrives — opening index.html off the disk
  // gives fetch() nothing to work with.
  const SFX = { torch: { url: 'assets/flashlight-switch.mp3', bytes: null, buf: null, off: 0 } };

  // mp3 carries encoder padding, so the decoded buffer starts with silence that
  // varies by browser. Finding the transient ourselves keeps the press instant.
  function headOffset(b) {
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      if (Math.abs(d[i]) > 0.002) return Math.max(0, i / b.sampleRate - 0.002);
    }
    return 0;
  }

  function decodeSfx(s) {
    if (!A.ctx || !s.bytes || s.buf) return;
    const bytes = s.bytes;
    s.bytes = null;
    A.ctx.decodeAudioData(bytes, (b) => { s.buf = b; s.off = headOffset(b); }, () => {});
  }

  function loadSfx() {
    if (typeof fetch !== 'function') return;
    for (const k in SFX) {
      const s = SFX[k];
      fetch(s.url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => { if (b) { s.bytes = b; decodeSfx(s); } }, () => {});
    }
  }

  function sample(s, gain, rate) {
    if (!A.ctx || !s.buf) return false;
    const c = A.ctx;
    const src = c.createBufferSource();
    src.buffer = s.buf;
    src.playbackRate.value = rate || 1;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(A.master);
    src.start(c.currentTime, s.off);
    return true;
  }

  // A mechanical click is a noise transient shaped by the resonance of the thing
  // that made it — no oscillator, or it comes out as a beep. freq/q are the body
  // it rings in, hp cuts the rumble, at delays it against the rest.
  function clack(freq, q, dur, gain, hp, at) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime + (at || 0);
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, dur + 0.02, false);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const cut = c.createBiquadFilter();
    cut.type = 'highpass'; cut.frequency.value = hp || 200;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    s.connect(bp); bp.connect(cut); cut.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // A recording of a real switch. Gain 0.55 puts it about 5 dB over the
  // synthesised version it replaced; switching off runs a touch slow and soft,
  // the way a sprung slide sounds coming back. Fallback is the old three-part
  // synthesis: the thumb slide leaving its detent, the contact landing, and the
  // plastic case taking it.
  function torch(on) {
    if (sample(SFX.torch, on ? 0.55 : 0.48, on ? 1 : 0.94)) return;
    clack(3100, 1.8, 0.014, 0.34, 1200, 0);
    clack(on ? 1450 : 1180, 7, 0.042, 0.40, 320, 0.013);
    clack(430, 2.4, 0.075, 0.13, 130, 0.017);
  }

  // ---- handling things on the desk ----------------------------------------
  // Sheets coming off a pile is not one sound: it is a dozen edges letting go of
  // each other within a tenth of a second, all of them bright and none of them
  // pitched. Randomising is the whole effect.
  function paper() {
    for (let i = 0; i < 8; i++) {
      clack(2400 + Math.random() * 3400, 0.7, 0.018 + Math.random() * 0.03,
        0.05 + Math.random() * 0.055, 1300, Math.random() * 0.15);
    }
    clack(680, 1.1, 0.09, 0.045, 300, 0.03);
  }

  // A hand closing on the barrel and lifting it clear: skin and cloth first,
  // which is dull and broad, then the thing leaving the surface.
  function grab() {
    clack(500, 0.6, 0.075, 0.15, 150, 0);
    clack(1600, 0.5, 0.045, 0.075, 520, 0.032);
    clack(250, 1.5, 0.055, 0.10, 105, 0.085);
  }

  function setDown() {
    clack(300, 1.8, 0.06, 0.22, 120, 0);
    clack(1250, 0.8, 0.028, 0.085, 500, 0.005);
  }

  // A mouthful of cold coffee. The resonance climbs as you swallow, and it starts
  // higher the emptier the mug is — less liquid, shorter air column. `frac` is
  // how full it was, so the last sip sounds like the last sip.
  function sip(frac) {
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = noiseBuffer(c, 0.45, false);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 9;
    const f0 = 300 + 430 * (1 - Math.min(Math.max(frac, 0), 1));
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.linearRampToValueAtTime(f0 * 1.9, t + 0.24);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.05);
    g.gain.setValueAtTime(0.15, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.29);
    s.connect(bp); bp.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + 0.46);
    clack(320, 1.6, 0.05, 0.09, 130, 0.33);   // and back down on the desk
  }

  function trip() {
    burst(0.34, 240, 0.55);
    ping(70, 0.5, 'sine', 0.35, 42);
  }

  function siKlaxon() {
    if (!A.klaxGain) return;
    const t = A.ctx.currentTime;
    A.klaxGain.gain.cancelScheduledValues(t);
    A.klaxGain.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 8; i++) {
      A.klax.frequency.setValueAtTime(392, t + i * 0.62);
      A.klax.frequency.exponentialRampToValueAtTime(620, t + i * 0.62 + 0.3);
      A.klaxGain.gain.setValueAtTime(0.16, t + i * 0.62);
      A.klaxGain.gain.setValueAtTime(0.0001, t + i * 0.62 + 0.34);
    }
  }

  function buzzer(on) {
    if (!A.buzzGain) return;
    const t = A.ctx.currentTime;
    A.buzzGain.gain.cancelScheduledValues(t);
    A.buzzGain.gain.setTargetAtTime(on ? 0.10 : 0, t, 0.02);
  }
  const stopBuzzer = () => buzzer(false);

  function startRing() {
    if (!A.ctx || A.ringTimer) return;
    const beat = () => {
      ping(1050, 0.11, 'sine', 0.12);
      setTimeout(() => ping(1050, 0.11, 'sine', 0.12), 130);
    };
    beat();
    A.ringTimer = setInterval(beat, 1400);
  }
  function stopRing() {
    if (A.ringTimer) { clearInterval(A.ringTimer); A.ringTimer = null; }
  }

  let prevTrip = false, prevSi = false, prevAlarm = -1;

  function update(p, dt) {
    if (!A.ctx || !p) return;
    const t = A.ctx.currentTime;
    const running = p.th.pumps.filter((q) => q.w > 300).length;
    const frac = p.th.pumps.reduce((a, q) => a + q.w, 0) / (4 * 4830);
    A.humGain.gain.setTargetAtTime(0.30 * frac, t, 0.35);
    A.humFilt.frequency.setTargetAtTime(240 + 320 * frac, t, 0.4);
    for (let i = 0; i < A.hum.length; i++) {
      A.hum[i].o.frequency.setTargetAtTime(52 + 8 * frac + i * 0.7, t, 0.6);
    }

    const acOk = p.elec.busA !== 'dead' || p.elec.busB !== 'dead';
    A.ventGain.gain.setTargetAtTime(acOk ? 0.10 : 0.012, t, 1.2);

    const turbing = !p.sec.turbTripped && p.th.turbValve > 0.01;
    A.turbGain.gain.setTargetAtTime(turbing ? 0.05 : 0, t, turbing ? 1.5 : 22);
    A.turb.frequency.setTargetAtTime(turbing ? 190 + 40 * p.th.turbValve : 30, t, turbing ? 2 : 20);

    if (p.trip.tripped && !prevTrip) trip();
    prevTrip = p.trip.tripped;
    if (p.si.on && !prevSi) siKlaxon();
    prevSi = p.si.on;

    const unacked = DH.Plant.ALARMS.some((a) => p.alarms[a.id].st === 1);
    if (unacked !== (prevAlarm === 1)) { buzzer(unacked); prevAlarm = unacked ? 1 : 0; }

    if (p.phone.ringing && !DH.Phone.isOpen()) startRing(); else stopRing();
  }

  // The hum, ventilation and turbine are only ever driven from update(), which
  // runs while a shift does. Leaving one has to take the room down explicitly or
  // it keeps running under the menu. The klaxon needs more than its gain zeroed:
  // siKlaxon() schedules eight bursts up to five seconds ahead, and those events
  // survive anything short of cancelling them.
  function silence() {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    for (const g of [A.humGain, A.ventGain, A.turbGain, A.buzzGain, A.klaxGain]) {
      if (!g) continue;
      const v = g.gain.value;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(v, t);
      g.gain.setTargetAtTime(0, t, 0.04);
    }
    if (A.klax) A.klax.frequency.cancelScheduledValues(t);
    stopRing();
    prevTrip = false; prevSi = false; prevAlarm = -1;
  }

  function setMuted(m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : A.vol, A.ctx.currentTime, 0.05);
    if (m) stopRing();
  }

  loadSfx();

  DH.Audio = {
    start, update, click, camSwitch, torch, paper, grab, setDown, sip,
    trip, buzzer, stopBuzzer, startRing, stopRing,
    silence, setMuted, isMuted: () => A.muted, ping, burst,
    // where each continuous bed is headed, in the order silence() takes them down
    levels: () => [A.humGain, A.ventGain, A.turbGain, A.buzzGain, A.klaxGain].map((g) => (g ? g.gain.value : 0))
  };
})();
