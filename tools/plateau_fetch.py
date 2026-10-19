# Download PLATEAU CityGML files listed by the data catalog API into .tmp/plateau/<ward>/ (resumable, skips
# complete files). Usage: python tools/plateau_fetch.py <api-json> <ward-name> <type> <mesh> [<mesh> ...]
import json, os, sys, urllib.request

api, ward, typ, meshes = sys.argv[1], sys.argv[2], sys.argv[3], set(sys.argv[4:])
d = json.load(open(api, encoding='utf-8'))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.tmp', 'plateau', ward)
os.makedirs(out, exist_ok=True)
for c in d['cities']:
    if c['cityName'] != ward: continue
    for f in c['files'].get(typ, []):
        if f['code'] not in meshes: continue
        dst = os.path.join(out, os.path.basename(f['url']))
        if os.path.exists(dst) and os.path.getsize(dst) == f['fileSize']:
            print('have', dst); continue
        print('get', f['url'], f"{f['fileSize'] / 1e6:.0f} MB", flush=True)
        tmp = dst + '.part'
        with urllib.request.urlopen(f['url'], timeout=120) as r, open(tmp, 'wb') as w:
            while True:
                b = r.read(1 << 20)
                if not b: break
                w.write(b)
        os.replace(tmp, dst); print('ok', dst, os.path.getsize(dst), flush=True)
