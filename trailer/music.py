# Procedural trailer score + sound design, synced to trailer/edl.py. No samples: everything is synthesised here.
#   python trailer/music.py [out.wav]      (default .tmp/trailer/score.wav, 48 kHz stereo 24-bit)
# Act I: wind, sub drone, sparse piano. Braam at the compound reveal. Act II: 100 BPM low-string ostinato, clock tick,
# kick building in, suit-game sound beds (water roar, bulb buzz, fire, gunfire). Act III: taiko eighths, braams,
# string tremolo, riser into a hard silence, heartbeat, title impact, piano motif over the end card.
import sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile
sys.path.insert(0, os.path.dirname(__file__))
from edl import *

SR = 48000
N = int(TOTAL * SR)
rng = np.random.default_rng(7)
buses = {k: np.zeros((2, N), np.float32) for k in ('music', 'perc', 'sfx', 'verb')}   # 'verb' gets the reverb send

def at(t): return int(round(t * SR))
def tt(d): return np.arange(int(d * SR)) / SR
def add(bus, t0, x, gain=1.0, pan=0.0, send=0.0):
    """mix mono/stereo x into bus at t0 (s); pan -1..1; send = extra amount to the reverb bus"""
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414])
    i = at(t0)
    if i >= N: return
    j = min(N, i + x.shape[1]); x = x[:, :j - i] * gain
    if i < 0: x = x[:, -i:]; i = 0
    buses[bus][:, i:j] += x
    if send: buses['verb'][:, i:j] += x * send
def env(n, a, d, sus_end=None):
    """attack a s then exponential decay with time-constant d s"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e
def fade(x, fi, fo):
    n = len(x); e = np.ones(n)
    a, b = int(fi * SR), int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** 2
    if b: e[-b:] = np.linspace(1, 0, b) ** 2
    return x * e
def lp(x, fc, order=2):
    b, a = signal.butter(order, min(.99, fc / (SR / 2)), 'low'); return signal.lfilter(b, a, x)
def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(.99, hi / (SR / 2))], 'band'); return signal.lfilter(b, a, x)
def sweep_lp(x, f0, f1, curve=2.0):
    """time-varying one-pole-ish lowpass by blocks (cheap filter sweep)"""
    out = np.zeros_like(x); B = 1024; zi = None
    nb = (len(x) + B - 1) // B
    for k in range(nb):
        f = f0 + (f1 - f0) * (k / max(1, nb - 1)) ** curve
        b, a = signal.butter(2, min(.99, max(20, f) / (SR / 2)), 'low')
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[k * B:(k + 1) * B], zi = signal.lfilter(b, a, x[k * B:(k + 1) * B], zi=zi)
    return out
def saw(f, n, ph=0.0):
    p = (np.cumsum(np.broadcast_to(f, (n,)) / SR) + ph) % 1.0; return 2 * p - 1
def noise(n): return rng.standard_normal(n)
def hz(note):   # 'A2' → Hz
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    n, acc = note[0], 0; rest = note[1:]
    if rest[0] in '#b': acc = 1 if rest[0] == '#' else -1; rest = rest[1:]
    return 440 * 2 ** ((names[n] + acc + (int(rest) - 4) * 12) / 12)

# ───────────── instruments ─────────────
def piano(f, d=4.0, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k, a in enumerate([1, .55, .32, .18, .12, .07, .05]):
        fk = f * (k + 1) * np.sqrt(1 + .0004 * (k + 1) ** 2)
        x += a * np.sin(2 * np.pi * fk * t + rng.random() * 6) * np.exp(-t * (0.6 + k * .9))
    x *= np.minimum(1, t / .004)
    x += noise(n) * np.exp(-t * 60) * .04   # hammer
    return x * vel * .32
def braam(f, d=4.0, bright=2400):
    n = int(d * SR); x = np.zeros(n)
    for m, a in [(1, 1), (2, .6), (1.5, .45), (.5, .8)]:
        for det in (-.12, .0, .13):
            x += a * saw(f * m * 2 ** (det / 12), n, rng.random())
    x = np.tanh(x * .35)
    x = sweep_lp(x, bright, 160, .7)
    t = np.arange(n) / SR
    e = np.minimum(1, t / .06) * (0.35 + .65 * np.exp(-t / 1.1)) * np.minimum(1, (d - t) / 1.2)
    sub = np.sin(2 * np.pi * f * .5 * t) * np.exp(-t / 1.8)
    return (x * e * .5 + sub * .5) * .9
def impact(d=3.0, f0=90, f1=28, body=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .9)
    crack = hp(noise(n), 800) * np.exp(-t * 28) * .6
    rumble = lp(noise(n), 140) * np.exp(-t / 1.4) * 1.4
    return np.tanh((boom * 1.2 * body + crack + rumble) * 1.2) * .9
def taiko(vel=1.0, f=62):
    n = int(.9 * SR); t = np.arange(n) / SR
    ff = f * (1 + .6 * np.exp(-t * 30))
    x = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / .22) + lp(noise(n), 900) * np.exp(-t * 35) * .5
    return np.tanh(x * 1.5) * vel * .7
def kick(vel=1.0):
    n = int(.5 * SR); t = np.arange(n) / SR
    ff = 48 + 110 * np.exp(-t * 38)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / .16) * 2) * vel * .8 + hp(noise(n), 3000) * np.exp(-t * 200) * .15 * vel
def snare(vel=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR
    return (bp(noise(n), 900, 7000) * np.exp(-t / .09) * .8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05) * .5) * vel * .55
def tick(vel=1.0, f=2600):
    n = int(.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 160) + hp(noise(n), 4000) * np.exp(-t * 300) * .5) * vel * .35
def string_note(f, d, vel=1.0, stac=True):
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(saw(f * 2 ** (det / 12), n, rng.random()) for det in (-.08, 0, .09)) / 3
    x = lp(x, 900 if stac else 1800)
    e = np.minimum(1, t / .012) * (np.exp(-t / .11) if stac else np.minimum(1, (d - t) / .3))
    return x * e * vel * .5
def tremolo(f, d, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(saw(f * 2 ** (det / 12), n, rng.random()) for det in (-.1, 0, .1)) / 3
    x = lp(x, 3500) * (.6 + .4 * np.sin(2 * np.pi * 13 * t) ** 2)
    return fade(x, d * .6, .05) * vel * .22
def riser(d, f0=200, f1=3200, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR; k = t / d
    nz = noise(n); out = np.zeros(n); B = 2048
    for i in range(0, n, B):
        c = f0 * (f1 / f0) ** (k[i] ** 1.6)
        out[i:i + B] = bp(nz[i:i + B], c * .7, c * 1.4, 1)
    tone = sum(np.sin(2 * np.pi * np.cumsum(f0 * m * (f1 / f0 / 4) ** (k ** 2)) / SR) for m in (.5, .75, 1)) * .12
    return (out * 1.4 + tone) * k ** 2.2 * vel
def whoosh(d=1.2, rev=False):
    x = riser(d, 300, 6000, 1.0) * .7
    return x[::-1] if rev else x
def drone(d, f=55, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for m, a in [(1, 1), (2, .5), (3, .18), (1.5, .3)]:
        x += a * (sum(saw(f * m * 2 ** (det / 12), n, rng.random()) for det in (-.06, .07)) / 2)
    lfo = 260 + 180 * (.5 + .5 * np.sin(2 * np.pi * t / 9))
    out = np.zeros(n); B = 4096
    for i in range(0, n, B): out[i:i + B] = lp(x[i:i + B], lfo[i])
    out += np.sin(2 * np.pi * f * .5 * t) * .6
    return fade(out, 3, 3) * vel * .28
def wind(d, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = bp(noise(n), 180, 900, 2) * (.55 + .45 * np.sin(2 * np.pi * t / 6.3 + 1) * np.sin(2 * np.pi * t / 2.9))
    x2 = bp(noise(n), 1500, 4000, 2) * .15 * (.5 + .5 * np.sin(2 * np.pi * t / 4.1))
    return fade(x + x2, 2, 1.5) * vel * .5
def crow():
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 620 + 180 * np.sin(np.pi * t / .42) - 260 * t
    x = saw(f, n) * (np.sin(np.pi * t / .42) ** .6)
    return bp(x, 500, 3000) * .22
def gunshot(vel=1.0):
    n = int(.7 * SR); t = np.arange(n) / SR
    crack = noise(n) * np.exp(-t * 90)
    body = lp(noise(n), 1200) * np.exp(-t * 14) * .8
    thump = np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 60)) * t) * np.exp(-t * 18)
    tail = bp(noise(n), 300, 2500) * np.exp(-t * 4.5) * .25   # slap off the buildings
    return np.tanh((crack + body + thump + tail) * 1.6) * vel * .55
def water(d, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = lp(noise(n), 1800) * .7 + bp(noise(n), 2500, 9000) * .25
    x *= .8 + .2 * lp(noise(n), 6) * 8
    return fade(x, .08, .3) * vel * .6
def buzz(d, vel=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = lp(saw(100, n), 2500) * .5 + np.sin(2 * np.pi * 50 * t) * .4
    flick = (lp(noise(n), 20) > -0.02).astype(float)
    return fade(x * (.5 + .5 * flick), .02, .2) * vel * .18
def fire(d, vel=1.0):
    n = int(d * SR); x = lp(noise(n), 400) * .9
    pops = np.zeros(n); idx = rng.integers(0, n, int(d * 26))
    pops[idx] = rng.random(len(idx)) * 2 - 1
    x += hp(signal.lfilter([1], [1, -.6], pops), 1500) * 2.5
    return fade(x, .1, .4) * vel * .45
def heartbeat(vel=1.0):
    n = int(.9 * SR); t = np.arange(n) / SR
    one = lambda tt0, a: np.where(t > tt0, np.sin(2 * np.pi * 52 * (t - tt0)) * np.exp(-(t - tt0) / .09) * a, 0)
    return lp(one(0, 1) + one(.26, .7), 200) * vel * 1.2
def glitch(d=.6, vel=1.0):
    n = int(d * SR); x = noise(n); t = np.arange(n) / SR
    x = np.round(x * 3) / 3 * (rng.random(n // 400 + 1).repeat(400)[:n] > .45)
    x += np.sign(np.sin(2 * np.pi * rng.choice([180, 360, 720, 1440]) * t)) * .3 * (rng.random(n // 900 + 1).repeat(900)[:n] > .6)
    return hp(x, 300) * vel * .25
def cardflick(vel=1.0):
    n = int(.12 * SR); t = np.arange(n) / SR
    return hp(noise(n), 2500) * np.exp(-t * 60) * vel * .4 + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 90) * .15 * vel

# ───────────── ACT I (0 – 31) ─────────────
add('music', 0, wind(31.2, 1.0), .9, 0)
add('music', 2.5, drone(29, 55, 1.0), 1.0, 0, .3)
for t0, p in [(2.9, -.6), (7.5, .5), (21.5, -.3), (22.1, -.2)]: add('sfx', t0, crow(), .6, p, .5)
motif = [(3.0, 'A4'), (5.4, 'E5'), (7.8, 'C5'), (10.5, 'B4'), (12.9, 'A4'), (15.5, 'E5'), (17.9, 'F5'), (20.5, 'E5'), (22.9, 'C5'), (24.5, 'B4'), (26.1, 'A4')]
for t0, nt in motif:
    add('music', t0, piano(hz(nt), 4.5, .9), 1, rng.uniform(-.3, .3), .9)
    add('music', t0, piano(hz(nt) / 2, 4.5, .4), 1, 0, .6)
add('music', 15.5, tremolo(hz('A3'), 13, .5), 1, -.4, .5)
add('music', 15.5, tremolo(hz('E4'), 13, .4), 1, .4, .5)
add('sfx', 15.5, lp(noise(int(5 * SR)), 120) * np.sin(np.pi * np.arange(int(5 * SR)) / (5 * SR)) * .5, 1, 0, .2)   # the airship's engine drone passing over
add('music', 28.5 - 2.5, riser(2.5, 120, 2200, 1.0), .8, 0, .4)                   # into the black card…
add('music', 28.5, piano(hz('A3'), 3, .7), 1, 0, 1.0)
add('music', 29.0, riser(2.0, 300, 5000, .9), .9, 0, .3)                          # … and into the braam
# compound reveal
add('perc', 31.0, impact(4, 90, 26), 1.3, 0, .5)
add('music', 31.0, braam(hz('A1'), 5.2), 1.25, 0, .5)
add('music', 33.2, braam(hz('F1'), 3.0, 1600), .8, 0, .5)
add('perc', 36.0, impact(2.5, 120, 35, .8), 1.1, 0, .4)
add('music', 35.2, whoosh(.8, True), .7, 0, .2)

# ───────────── ACT II (36.4 – 76) ─────────────
A2 = 73.6
nbeats = int(round((A2 - PULSE) / BEAT))
pattern = ['A1', 'A1', 'A2', 'A1', 'C2', 'A1', 'G1', 'E1']       # 8 eighths per bar-half
for b in range(nbeats * 2):                                       # eighth notes
    t0 = PULSE + b * BEAT / 2
    if 58.0 <= t0 < 60.4: continue                                # the black card breathes
    nt = pattern[b % 8]; bar = b // 16
    if b // 32 % 2 == 1 and b % 8 in (4, 5): nt = 'D2' if nt != 'A1' else nt
    v = .6 + .25 * min(1, (t0 - PULSE) / 20) + (.15 if b % 2 == 0 else 0)
    add('music', t0, string_note(hz(nt), .28, v), 1, -.25, .1)
    add('music', t0, string_note(hz(nt) * 2, .22, v * .45), 1, .3, .1)
for b in range(nbeats):
    t0 = PULSE + b * BEAT
    if 58.0 <= t0 < 60.4: continue
    add('perc', t0, tick(.8 if b % 4 == 0 else .5), 1, .5, .1)
    if t0 >= 47.2: add('perc', t0, kick(.9 if b % 4 == 0 else .65), 1, 0, .05)
    if t0 >= 54.4 and b % 2 == 1: add('perc', t0, snare(.6), 1, 0, .25)
    if t0 >= 63.4 and b % 4 == 3: add('perc', t0 + BEAT / 2, taiko(.6), 1, -.2, .3)
# pads over Act II, chord per 2.4 s bar: Am | F | C | G …
chords = [['A2', 'E3', 'C4'], ['F2', 'C3', 'A3'], ['C3', 'G3', 'E4'], ['G2', 'D3', 'B3']]
for i, t0 in enumerate(np.arange(PULSE, A2, 2.4)):
    if 58.0 <= t0 < 60.4: continue
    for k, nt in enumerate(chords[i % 4]):
        add('music', t0, string_note(hz(nt), 2.5, .35 + .1 * (t0 > 54), stac=False), 1, (k - 1) * .5, .6)
# Act II braams on the big changes
for t0, nt in [(47.2, 'A1'), (54.4, 'F1'), (60.4, 'A1'), (70.6, 'C2')]: add('music', t0, braam(hz(nt), 2.6, 1800), .75, 0, .4)
# the black text card at 58: hit, silence, a heartbeat, a hit back in
add('perc', 58.0, impact(2.2, 100, 30, .9), 1.0, 0, .5)
add('sfx', 59.2, heartbeat(1), 1, 0, .2)
add('music', 59.4, riser(1.0, 400, 6000), .8, 0, .2)
add('perc', 60.4, impact(2, 110, 32, .9), 1.1, 0, .4)
# game beds
add('sfx', 36.4, lp(water(4.8, 1.0), 900), .5, -.1, .3)                    # ♦4 flood
for t0 in np.arange(36.6, 41.0, .37): add('sfx', t0, lp(noise(int(.5 * SR)), 900) * env(int(.5 * SR), .01, .15), .5, rng.uniform(-.7, .7), .4)   # jets
add('sfx', 41.2, lp(water(2.4, .5), 700), .35, 0, .3)
add('sfx', 41.9, buzz(1.7, 1.0), 1, .1, .3)                        # the bulb comes on
add('sfx', 41.85, tick(1.4, 900), 1.2, 0, .3)                       # breaker clunk
add('sfx', 47.2, lp(noise(int(4.2 * SR)), 200) * .25, 1, 0, .8)     # pit wind
add('sfx', 60.4, fire(3.0, 1.0), 1, 0, .3)
for a, b in GUNFIRE[:2]:
    t0 = a
    while t0 < b:
        burst = rng.integers(3, 8)
        for k in range(burst): add('sfx', t0 + k * .085, gunshot(rng.uniform(.7, 1)), .9, rng.uniform(-.2, .2), .35)
        t0 += burst * .085 + rng.uniform(.25, .7)
add('music', 73.6, string_note(hz('A1'), 2.4, .8, False), 1, 0, .6)
add('perc', 73.6, impact(2.4, 80, 28), 1.1, 0, .6)
add('music', 74.0, riser(2.0, 150, 7000, 1.2), 1.0, 0, .3)
add('perc', 75.4, tick(1.0, 1800), 1, 0, .1); add('perc', 75.7, tick(1.0, 1800), 1, 0, .1)

# ───────────── ACT III (76 – 88) ─────────────
add('perc', MONT, impact(3, 120, 30), 1.4, 0, .5)
add('music', MONT, braam(hz('A1'), 4.8, 3000), 1.0, 0, .4)
add('music', MONT + 4.8, braam(hz('F1'), 2.4, 3000), 1.0, 0, .4)
add('music', MONT + 7.2, braam(hz('C2'), 2.4, 3200), 1.0, 0, .4)
add('music', MONT + 9.6, braam(hz('E1'), 2.4, 3600), 1.1, 0, .4)
add('music', MONT, tremolo(hz('A4'), 12, .8), 1, -.4, .4); add('music', MONT, tremolo(hz('E5'), 12, .7), 1, .4, .4)
for b in range(int((DARK - MONT) / (BEAT / 2))):
    t0 = MONT + b * BEAT / 2
    add('perc', t0, taiko(.9 if b % 2 == 0 else .6, 58 if b % 4 == 0 else 70), 1, rng.uniform(-.3, .3), .3)
    if b % 2 == 0: add('perc', t0, kick(.9), 1, 0, 0)
    add('music', t0, string_note(hz(pattern[b % 8]), .25, .9), 1, -.2, .1)
for b in range(16):                                              # 16ths over the last 2.4 s
    add('perc', STROBE[0] + b * BEAT / 4, snare(.35 + b * .04), 1, 0, .2)
for t0, _ in FLASH_CARDS: add('sfx', t0, cardflick(1), 1, rng.uniform(-.5, .5), .3)
for i in range(12): add('sfx', STROBE[0] + i * .2, cardflick(.8), 1, (-1) ** i * .4, .3)
for a, b in GUNFIRE[2:]:
    for k in range(int((b - a) / .085)): add('sfx', a + k * .085, gunshot(.8), .7, .1, .3)
add('sfx', 80.8 + .6 * 0 + 0, water(.3, .8), .6)
add('perc', 83.2, impact(2, 110, 30), 1.2, 0, .4)
add('music', DARK - 3.0, riser(3.0, 200, 9000, 1.4), 1.0, 0, .3)

# ───────────── silence · heartbeat · title ─────────────
add('sfx', 89.0, heartbeat(1.1), 1.2, 0, .3)
add('sfx', 90.0, heartbeat(.9), 1.1, 0, .3)
add('music', 89.8, wind(9, .6), .7, 0, .2)
add('music', 89.8, drone(14.2, 55, .8), 1, 0, .3)
add('music', TITLE - 1.6, whoosh(1.6, True), .9, 0, .3)
add('perc', TITLE, impact(5, 70, 24, 1.2), 1.5, 0, .7)
add('music', TITLE, braam(hz('A1'), 6.4, 1400), 1.2, 0, .6)
add('sfx', TITLE - .05, glitch(.5), 1, 0, .1); add('sfx', TITLE + .6, glitch(.25), .7, .3, .1)
for t0, nt in [(TITLE + 2.4, 'A4'), (TITLE + 3.6, 'E5'), (TITLE + 4.8, 'C5'), (END + 1.4, 'B4'), (END + 2.6, 'A4')]:
    add('music', t0, piano(hz(nt), 4.5, .8), 1, 0, 1.0)
add('perc', END, impact(4, 60, 22, 1.0), 1.1, 0, .8)
add('sfx', END + .4, tick(1.0, 2600), 1, 0, .4); add('sfx', END + 1.0, tick(.8, 2600), 1, 0, .4)

# ───────────── mix ─────────────
def reverb_ir(d=3.2, pre=.02):
    n = int(d * SR); t = np.arange(n) / SR
    ir = np.stack([noise(n), noise(n)]) * np.exp(-t / (d / 6.5))
    ir = np.stack([lp(hp(c, 120), 6000) for c in ir]); ir[:, :int(pre * SR)] = 0
    return ir / np.abs(ir).sum(axis=1, keepdims=True) * 18
ir = reverb_ir()
verb = np.stack([signal.fftconvolve(buses['verb'][c], ir[c])[:N] for c in range(2)])
mix = buses['music'] * .9 + buses['perc'] * 1.0 + buses['sfx'] * .85 + verb * .55
mix = np.stack([hp(c, 22) for c in mix])
# act dynamics (trailer arc): quiet Act I, Act II climbing, Act III and the title at full level
auto = np.interp(np.arange(N) / SR, [0, 28, 30.9, 31.0, 36.3, 36.4, 58, 73.5, 76, 88, 89, 92.3, 92.4, 98.7, 98.8, TOTAL],
                 [.32, .36, .42, 1.0, .9, .55, .72, .82, 1.0, 1.0, .5, .5, 1.0, .75, .9, .8])
mix *= auto.astype(np.float32)
# dead air on the hard cut: silence until the heartbeat
i0, i1 = at(DARK), at(88.95); mix[:, i0:i1] *= np.linspace(1, 0, i1 - i0) ** 8 * 0
# glue + limiter: soft knee, then peak-normalise to −1 dBFS
mix = mix / (np.percentile(np.abs(mix[:, at(76):at(88)]), 99.9) + 1e-9) * .8   # the climax sets the level
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))
mix[:, :at(.02)] *= np.linspace(0, 1, at(.02)); mix[:, -at(1.5):] *= np.linspace(1, 0, at(1.5)) ** 2
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '.tmp', 'trailer', 'score.wav')
pcm = (mix.T * (2 ** 31 - 1)).astype(np.int32)
wavfile.write(out, SR, pcm)
print('wrote', out, f'{TOTAL:.1f}s')
