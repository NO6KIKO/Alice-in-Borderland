# The editor: assembles the rendered shots (.tmp/trailer/frames/<id>/NNNNN.jpg) per trailer/edl.py — dissolves, fades,
# card flashes, the card strobe, hit flashes, titles, 2.39:1 letterbox — and pipes the picture into ffmpeg with the score.
#   python trailer/edit.py [out.mp4] [--from S --to S] [--stills t1,t2,…]   (stills: review JPEGs instead of a video)
import sys, os, subprocess, math, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from edl import *

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FR = os.path.join(ROOT, '.tmp', 'trailer', 'frames')
W, H, PH = 1920, 1080, 816
PY = (H - PH) // 2
args = sys.argv[1:]
def opt(k, d=None):
    if k in args: i = args.index(k); v = args[i + 1]; del args[i:i + 2]; return v
    return d
T_FROM, T_TO, STILLS = float(opt('--from', 0)), float(opt('--to', TOTAL)), opt('--stills')
OUT = args[0] if args else os.path.join(ROOT, '.tmp', 'trailer', 'borderland_trailer.mp4')

SERIF = 'C:/Windows/Fonts/NotoSerifSC-VF.ttf'
SANS = 'C:/Windows/Fonts/bahnschrift.ttf'
def font(path, size, var):
    f = ImageFont.truetype(path, size); f.set_variation_by_name(var); return f

# ───────────── sources ─────────────
@functools.lru_cache(maxsize=64)
def nframes(shot): return len(os.listdir(os.path.join(FR, shot))) if os.path.isdir(os.path.join(FR, shot)) else 0
_cache = {}
def src(shot, st):
    """frame of shot at source time st (s) as float32 816×1920×3 in 0..1"""
    n = nframes(shot)
    if not n: return np.zeros((PH, W, 3), np.float32)
    i = min(n, max(1, int(round(st * FPS)) + 1))
    k = (shot, i)
    if k not in _cache:
        if len(_cache) > 40: _cache.clear()
        _cache[k] = np.asarray(Image.open(os.path.join(FR, shot, f'{i:05d}.jpg')).convert('RGB'), np.float32) / 255
    return _cache[k]

@functools.lru_cache(maxsize=16)
def card_img(name, h):
    im = Image.open(os.path.join(ROOT, 'cards', name + '.webp')).convert('RGBA')
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def card_frame(name, k, seed):
    """a court card on a dark red-black ground, slowly zooming (k 0..1 over its time on screen)"""
    r = np.random.default_rng(seed)
    bg = Image.new('RGB', (W, PH), (8, 4, 4))
    g = np.zeros((PH, W, 3), np.float32)
    yy, xx = np.mgrid[0:PH, 0:W]; d = np.hypot((xx - W / 2) / W, (yy - PH / 2) / PH)
    g[..., 0] = np.clip(.16 - d * .25, 0, 1); g[..., 1] = g[..., 0] * .15; g[..., 2] = g[..., 0] * .12
    c = card_img(name, 760)
    s = 1.0 + .08 * k; c2 = c.resize((round(c.width * s), round(c.height * s)), Image.BILINEAR).rotate(r.uniform(-4, 4), Image.BICUBIC, expand=True)
    layer = Image.new('RGBA', (W, PH)); layer.paste(c2, ((W - c2.width) // 2 + int(r.uniform(-30, 30)), (PH - c2.height) // 2), c2)
    a = np.asarray(layer, np.float32) / 255
    return g * (1 - a[..., 3:]) + a[..., :3] * a[..., 3:]

# ───────────── text layers (RGBA, cached) ─────────────
def tracked(draw, xy, text, f, fill, track):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill); x += draw.textlength(ch, font=f) + track
def text_w(draw, text, f, track): return sum(draw.textlength(ch, font=f) + track for ch in text) - track

@functools.lru_cache(maxsize=32)
def layer_card(main, sub, dy=0):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    fm, fs = font(SERIF, 64, b'Medium'), font(SANS, 24, b'Light')
    wm = text_w(d, main, fm, 10); tracked(d, ((W - wm) / 2, H / 2 - 62 + dy), main, fm, (236, 232, 226, 255), 10)
    ws = text_w(d, sub, fs, 9); tracked(d, ((W - ws) / 2, H / 2 + 34 + dy), sub, fs, (170, 176, 182, 255), 9)
    glow = im.filter(ImageFilter.GaussianBlur(14)); out = Image.alpha_composite(Image.new('RGBA', (W, H)), glow); out.putalpha(Image.eval(out.getchannel('A'), lambda v: v * .5)); out = Image.alpha_composite(out, im)
    return np.asarray(out, np.float32) / 255

@functools.lru_cache(maxsize=32)
def layer_label(main, sub):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    fm, fs = font(SERIF, 40, b'SemiBold'), font(SANS, 17, b'Regular')
    x, y = 110, PY + PH - 132
    red = main[0] in '♦♥'
    d.rectangle([x - 24, y + 6, x - 20, y + 86], fill=(196, 30, 40, 255) if red else (230, 230, 230, 255))
    d.text((x, y), main[0], font=fm, fill=(214, 36, 44, 255) if red else (238, 238, 238, 255))
    tracked(d, (x + d.textlength(main[0], font=fm) + 6, y), main[1:], fm, (238, 234, 228, 255), 4)
    tracked(d, (x + 2, y + 60), sub, fs, (180, 186, 190, 255), 7)
    sh = im.filter(ImageFilter.GaussianBlur(6)); sh = Image.merge('RGBA', (*[Image.new('L', (W, H), 0)] * 3, sh.getchannel('A').point(lambda v: v * .7)))
    return np.asarray(Image.alpha_composite(sh, im), np.float32) / 255

@functools.lru_cache(maxsize=4)
def layer_title():
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    fm, fe, fs = font(SERIF, 150, b'Bold'), font(SANS, 34, b'Light'), font(SANS, 16, b'Light')
    t = '弥留之国'; wm = text_w(d, t, fm, 34); tracked(d, ((W - wm) / 2, H / 2 - 150), t, fm, (244, 240, 234, 255), 34)
    e = 'BORDERLAND'; we = text_w(d, e, fe, 26); tracked(d, ((W - we) / 2, H / 2 + 52), e, fe, (226, 50, 56, 255), 26)
    s = 'IN-ENGINE FOOTAGE'; ws = text_w(d, s, fs, 8); tracked(d, ((W - ws) / 2, PY + PH - 46), s, fs, (150, 150, 150, 255), 8)
    for xx in (W / 2 - we / 2 - 70, W / 2 + we / 2 + 40): d.line([(xx, H / 2 + 74), (xx + 30, H / 2 + 74)], fill=(226, 50, 56, 255), width=2)
    glow = im.filter(ImageFilter.GaussianBlur(22)); glow.putalpha(glow.getchannel('A').point(lambda v: v * .55))
    sa = im.getchannel('A').filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(10)).point(lambda v: min(255, v * 1.6))
    shadow = Image.merge('RGBA', (*[Image.new('L', (W, H), 8)] * 3, sa))   # dark halo: the red line must read over the white deck
    return np.asarray(Image.alpha_composite(Image.alpha_composite(shadow, glow), im), np.float32) / 255

@functools.lru_cache(maxsize=4)
def layer_end(main, sub):
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im)
    fm, fs = font(SANS, 96, b'Light'), font(SERIF, 28, b'Regular')
    wm = text_w(d, main, fm, 30); tracked(d, ((W - wm) / 2, H / 2 - 92), main, fm, (240, 240, 240, 255), 30)
    ws = text_w(d, sub, fs, 8); tracked(d, ((W - ws) / 2, H / 2 + 40), sub, fs, (200, 60, 64, 255), 8)
    d.line([(W / 2 - 60, H / 2 + 18), (W / 2 + 60, H / 2 + 18)], fill=(200, 60, 64, 255), width=2)
    return np.asarray(im, np.float32) / 255

@functools.lru_cache(maxsize=1)
def title_band():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.exp(-((yy - (H / 2 - 20)) / 150) ** 2) * (0.45 + 0.55 * np.exp(-((xx - W / 2) / 700) ** 2))

def over(img, layer, a, dx=0):
    if a <= 0: return img
    L = layer if not dx else np.roll(layer, dx, axis=1)
    al = L[..., 3:] * a
    return img * (1 - al) + L[..., :3] * al

def smooth(k): k = min(1, max(0, k)); return k * k * (3 - 2 * k)

# ───────────── one frame ─────────────
def frame(t):
    pic = None
    act = [c for c in CLIPS if c[0] <= t < c[1]]
    if act:
        c0, c1, shot, inp, tr = act[-1]
        pic = src(shot, t - c0 + inp).copy()
        if tr == 'punch':   # slow push-in on the arena run
            k = smooth((t - c0) / (c1 - c0)); s = 1 + .14 * k
            hh, ww = int(PH / s), int(W / s); y0, x0 = (PH - hh) // 2, (W - ww) // 2
            pic = np.asarray(Image.fromarray((pic[y0:y0 + hh, x0:x0 + ww] * 255).astype(np.uint8)).resize((W, PH), Image.BILINEAR), np.float32) / 255
        if tr == 'fade': pic *= smooth((t - c0) / 1.4)
        if tr == 'x':        # dissolve from the previous clip, which runs on past its end
            prev = [c for c in CLIPS if abs(c[1] - c0) < 1e-6]
            if prev and t - c0 < .8:
                p0, p1, ps, pin, _ = prev[0]
                a = smooth((t - c0) / .8); pic = pic * a + src(ps, t - p0 + pin) * (1 - a)
        # fade out the last clip of a run when black follows
        nxt = [c for c in CLIPS if abs(c[0] - c1) < 1e-6]
        if not nxt and c1 - t < .5 and shot in ('a5_port', 'e1_tower'): pic *= smooth((c1 - t) / .5)
    if STROBE[0] <= t < STROBE[1]:
        i = int((t - STROBE[0]) / .2); k = ((t - STROBE[0]) % .2) / .2
        pic = card_frame(CARDS[i % 12], k, i)
        if k < .17: pic = pic * .5 + .5   # flash on each card
    for ft, name in FLASH_CARDS:
        if ft <= t < ft + 3 / FPS: pic = card_frame(name, (t - ft) * 10, int(ft * 10))
    img = np.zeros((H, W, 3), np.float32)
    if pic is not None:
        for h in HITS:     # white flash frames on the big hits
            if h <= t < h + 3 / FPS and not any(ft <= t < ft + 3 / FPS for ft, _ in FLASH_CARDS): pic = pic + (1 - pic) * (.75 if t - h < 1 / FPS else .3 if t - h < 2 / FPS else .1)
        img[PY:PY + PH] = pic
    # text
    for a0, a1, main, sub, sty in TEXT:
        if not (a0 <= t < a1): continue
        a = smooth((t - a0) / .45) * smooth((a1 - t) / .35)
        if sty == 'card': img = over(img, layer_card(main, sub), a)
        elif sty == 'lower': img = over(img, layer_card(main, sub, 250), a)
        elif sty == 'label': img = over(img, layer_label(main, sub), a)
        elif sty == 'end': img = over(img, layer_end(main, sub), a)
    if TITLE <= t < END:
        a = smooth((END - t) / .5); L = layer_title()
        img = img * (1 - .62 * a * smooth((t - TITLE) / .15) * title_band())[..., None]   # dark band so the title reads over the tower
        g = t - TITLE
        if g < .5 or .6 <= g < .75:   # glitch in: RGB split + jitter
            r = np.random.default_rng(int(t * 1000))
            if r.random() < .8:
                dx = int(r.integers(-26, 26))
                img = over(img, L * np.array([1, 0, 0, 1], np.float32), a * .9, dx)
                img = over(img, L * np.array([0, 1, 1, 1], np.float32), a * .9, -dx)
            else: img = over(img, L, a)
        else: img = over(img, L, a)
    return np.clip(img, 0, 1)

def to8(img): return (img * 255 + .5).astype(np.uint8)

if STILLS:
    d = os.path.join(ROOT, '.tmp', 'trailer', 'review'); os.makedirs(d, exist_ok=True)
    for s in STILLS.split(','):
        Image.fromarray(to8(frame(float(s)))).save(os.path.join(d, f't{float(s):06.2f}.jpg'), quality=88)
    print('stills in', d); sys.exit()

score = os.path.join(ROOT, '.tmp', 'trailer', 'score.wav')
n0, n1 = int(round(T_FROM * FPS)), int(round(T_TO * FPS))
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
       '-ss', f'{T_FROM}', '-t', f'{T_TO - T_FROM}', '-i', score,
       '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-tune', 'film',
       '-x264-params', 'aq-mode=3', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', '-shortest', OUT]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for n in range(n0, n1):
    p.stdin.write(to8(frame(n / FPS)).tobytes())
    if n % 150 == 0: print(f'{n / FPS:6.1f}s', flush=True)
p.stdin.close(); p.wait()
print('wrote', OUT)
