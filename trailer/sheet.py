# Contact sheet of planning frames: python trailer/sheet.py <dir> <out.jpg> [prefix…]  (rows = shots, columns = k)
import sys, glob, os, re
from PIL import Image, ImageDraw
d, out, pre = sys.argv[1], sys.argv[2], sys.argv[3:]
fs = sorted(f for f in glob.glob(os.path.join(d, '*.jpg')) if not pre or any(os.path.basename(f).startswith(p) for p in pre))
rows = {}
for f in fs:
    m = re.match(r'(.+)_(\d+)\.jpg$', os.path.basename(f))
    if m: rows.setdefault(m.group(1), {})[int(m.group(2))] = f
W, H = 480, 204
cols = max(len(v) for v in rows.values())
im = Image.new('RGB', (W * cols, H * len(rows)), (20, 20, 20)); g = ImageDraw.Draw(im)
for r, (k, v) in enumerate(rows.items()):
    for c, f in sorted(v.items()):
        im.paste(Image.open(f).resize((W, H)), (c * W, r * H))
    g.text((6, r * H + 4), k, fill=(255, 230, 0))
im.save(out, quality=82)
