# Extract the glTF binaries from 3D Tiles 1.0 .b3dm files (header 28 bytes + feature table + batch table + glb).
# Usage: python tools/b3dm_extract.py <in_dir> <out_dir>   — also writes each tile's batch table JSON next to it.
import json, os, struct, sys

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
n = 0
for f in sorted(os.listdir(src)):
    if not f.endswith('.b3dm'):
        continue
    b = open(os.path.join(src, f), 'rb').read()
    magic, ver, total, ftj, ftb, btj, btb = struct.unpack('<4sIIIIII', b[:28])
    assert magic == b'b3dm', f
    o = 28
    ft = json.loads(b[o:o + ftj] or b'{}'); o += ftj + ftb
    bt = json.loads(b[o:o + btj] or b'{}'); o += btj + btb
    base = f[:-5]
    open(os.path.join(dst, base + '.glb'), 'wb').write(b[o:total])
    json.dump({'featureTable': ft, 'batchTable': bt}, open(os.path.join(dst, base + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    n += 1
print('extracted', n)
