// Procedural ambience (WebAudio, no files): wind bed, daytime birds / night insects, and — near the Shibuya
// hunt — gunfire bursts synced to the muzzle flash plus a distant car alarm. Starts on the first user gesture.
export function createAudio() {
  let ac = null, master, wind, windGain, isDay = true, birdsT = 0, bugsT = 0, alarmT = 0;
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
  return {
    setDay(d) { isDay = d; },
    // camera, hunt centre (THREE.Vector3), shooting flag from the hunt scene
    update(dt, cam, centre, firing) {
      if (!ac || ac.state !== 'running') { if (ac && ac.state === 'suspended') ac.resume(); return; }
      windGain.gain.value = .14 + Math.min(.25, cam.position.y / 400);   // windier up high
      const t = ac.currentTime;
      if (isDay && (birdsT -= dt) < 0) { birdsT = 1.5 + Math.random() * 5; const f = 2400 + Math.random() * 1800; for (let k = 0; k < 2 + Math.random() * 4; k++) chirp(t + k * .12, f, f * (.7 + Math.random() * .6), .09, .025); }
      if (!isDay && (bugsT -= dt) < 0) { bugsT = .35 + Math.random() * .5; cricket(t, .012); }
      const d = centre ? cam.position.distanceTo(centre) : 1e9;
      if (d < 700) {
        const vol = Math.min(.9, 30 / Math.max(15, d)), pan = Math.max(-1, Math.min(1, (centre.x - cam.position.x) / Math.max(30, d)));
        if (firing) shot(vol, pan);
        if ((alarmT -= dt) < 0) { alarmT = 6 + Math.random() * 8; alarm(vol * .12); }
      }
    },
  };
}
