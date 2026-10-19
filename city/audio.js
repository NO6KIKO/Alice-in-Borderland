// Procedural ambience (WebAudio, no files): wind bed, daytime birds / night insects, and — near the Shibuya
// hunt — gunfire bursts synced to the muzzle flash plus a distant car alarm; underground, the ♦4 storm-water tank (water
// roar, mains hum, bulb buzz, breaker clicks, door creaks, the shutter slam, electrocution). Starts on the first user gesture.
export function createAudio() {
  let ac = null, master, wind, windGain, isDay = true, birdsT = 0, bugsT = 0, alarmT = 0, underK = 0, dr = null;
  const noiseBuf = (sec) => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  function start() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
    // wind: looping noise through a slowly swept low-pass
    wind = ac.createBufferSource(); wind.buffer = noiseBuf(4); wind.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .7;
    const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = .07; lfoG.gain.value = 220; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    windGain = ac.createGain(); windGain.gain.value = .22; wind.connect(lp).connect(windGain).connect(master); wind.start();
  }
  addEventListener('pointerdown', start, { once: true }); addEventListener('keydown', start, { once: true });

  function chirp(t0, f0, f1, dur, vol) {   // one bird syllable
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * .2); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .02);
  }
  function cricket(t0, vol) {
    for (let k = 0; k < 3; k++) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 4300 + Math.random() * 300; const t = t0 + k * .05; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.linearRampToValueAtTime(0, t + .035); o.connect(g).connect(master); o.start(t); o.stop(t + .04); }
  }
  function shot(vol, pan) {   // gunshot: sharp noise crack + low thump, distance-filtered
    const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuf(.4);
    const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 900 + vol * 5000;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .35);
    const p = ac.createStereoPanner(); p.pan.value = pan;
    src.connect(bp).connect(g).connect(p).connect(master); src.start(t);
    const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .2);
    og.gain.setValueAtTime(vol * .8, t); og.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(og).connect(p); o.start(t); o.stop(t + .3);
  }
  function alarm(vol) {   // two-tone car alarm pulse
    const t = ac.currentTime;
    for (let k = 0; k < 6; k++) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = k % 2 ? 950 : 1250; const tt = t + k * .25; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(vol, tt + .01); g.gain.linearRampToValueAtTime(0, tt + .22); o.connect(g).connect(master); o.start(tt); o.stop(tt + .24); }
  }
  function drainNodes() {   // looping beds for the drain, created on first use
    if (dr) return dr;
    const loop = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(3); s.loop = true; const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(bf).connect(g).connect(master); s.start(); return g; };
    const hum = ac.createGain(); hum.gain.value = 0; hum.connect(master);
    for (const [f, a] of [[50, 1], [100, .55], [150, .25]]) { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = a; o.connect(g).connect(hum); o.start(); }   // Tokyo mains: 50 Hz
    const buzz = ac.createGain(); buzz.gain.value = 0; buzz.connect(master);
    { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; o.connect(lp).connect(buzz); o.start(); }
    return (dr = { roar: loop('bandpass', 1100, .6), hiss: loop('highpass', 3500, .5), rumble: loop('lowpass', 170, .7), hum, buzz });
  }
  const burst = (dur, type, f, vol, t = ac.currentTime) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(dur + .05); const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(bf).connect(g).connect(master); s.start(t); };
  const thump = (f0, f1, dur, vol, t = ac.currentTime) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02); };
  const ok = () => ac && ac.state === 'running';
  return {
    setDay(d) { isDay = d; },
    // ♦4 drain: k = how far underground the camera is (0..1), water level 0..1, jets 0..1, bulb lit and in earshot 0/1
    drain(k, level, jets, lit) {
      underK = k; if (!ok() || (!dr && k < .01)) return;   // nodes only once the drain is first heard
      const d = drainNodes(), s = ac.currentTime;
      d.roar.gain.setTargetAtTime(k * jets * .32, s, .3); d.hiss.gain.setTargetAtTime(k * jets * .05, s, .3);
      d.rumble.gain.setTargetAtTime(k * (.05 + jets * .28 * (1 - level * .4)), s, .4);
      d.hum.gain.setTargetAtTime(k * .016, s, .5); d.buzz.gain.setTargetAtTime(k * lit * .01, s, .08);
    },
    click() { if (!ok()) return; burst(.03, 'highpass', 2500, .35); thump(140, 60, .09, .3); },   // knife switch
    clunk() { if (!ok()) return; thump(70, 32, .7, .9); burst(.9, 'lowpass', 500, .5); },   // shutter slamming down
    creak() {   // heavy steel door: a groaning hinge, then the latch
      if (!ok()) return; const t = ac.currentTime, o = ac.createOscillator(), bf = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(92, t); o.frequency.linearRampToValueAtTime(58, t + 1.6); bf.type = 'bandpass'; bf.frequency.value = 420; bf.Q.value = 7;
      lfo.frequency.value = 9; lg.gain.value = .05; lfo.connect(lg).connect(g.gain); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.12, t + .15); g.gain.linearRampToValueAtTime(.0001, t + 1.7);
      o.connect(bf).connect(g).connect(master); o.start(t); o.stop(t + 1.8); lfo.start(t); lfo.stop(t + 1.8); thump(90, 45, .25, .35, t + 1.7);
    },
    zap() {   // the electrodes go live: crackles over a loud mains buzz
      if (!ok()) return; const t = ac.currentTime;
      for (let i = 0; i < 26; i++) burst(.02 + Math.random() * .05, 'highpass', 1800 + Math.random() * 3000, .5 + Math.random() * .4, t + Math.random() * 1.4);
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = 50; g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.6); o.connect(g).connect(master); o.start(t); o.stop(t + 1.7);
    },
    chime() { if (!ok()) return; const t = ac.currentTime; for (const [f, d] of [[660, 0], [880, .18], [1320, .36]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.12, t + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d + .9); o.connect(g).connect(master); o.start(t + d); o.stop(t + d + 1); } },
    // camera, hunt centre (THREE.Vector3), shooting flag from the hunt scene
    update(dt, cam, centre, firing) {
      if (!ac || ac.state !== 'running') { if (ac && ac.state === 'suspended') ac.resume(); return; }
      windGain.gain.value = (.14 + Math.min(.25, Math.max(0, cam.position.y) / 400)) * (1 - underK * .95);   // windier up high, none underground
      const t = ac.currentTime;
      if (isDay && underK < .5 && (birdsT -= dt) < 0) { birdsT = 1.5 + Math.random() * 5; const f = 2400 + Math.random() * 1800; for (let k = 0; k < 2 + Math.random() * 4; k++) chirp(t + k * .12, f, f * (.7 + Math.random() * .6), .09, .025); }
      if (!isDay && underK < .5 && (bugsT -= dt) < 0) { bugsT = .35 + Math.random() * .5; cricket(t, .012); }
      const d = centre ? cam.position.distanceTo(centre) : 1e9;
      if (d < 700) {
        const vol = Math.min(.9, 30 / Math.max(15, d)), pan = Math.max(-1, Math.min(1, (centre.x - cam.position.x) / Math.max(30, d)));
        if (firing) shot(vol, pan);
        if ((alarmT -= dt) < 0) { alarmT = 6 + Math.random() * 8; alarm(vol * .12); }
      }
    },
  };
}
