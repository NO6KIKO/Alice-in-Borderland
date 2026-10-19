# List or extract members of a remote ZIP with HTTP Range requests (no full download).
#   python tools/zip_remote.py list <url> [filter]
#   python tools/zip_remote.py get <url> <prefix> <out_dir>      — fetch every member whose name starts with <prefix>
import os, struct, sys, urllib.request, zlib

def rng(url, a, b):
    req = urllib.request.Request(url, headers={'Range': f'bytes={a}-{b}'})
    with urllib.request.urlopen(req, timeout=120) as r: return r.read()

def size(url):
    with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=60) as r: return int(r.headers['Content-Length'])

def entries(url):
    n = size(url); tail = rng(url, max(0, n - 70000), n - 1)
    i = tail.rfind(b'PK\x05\x06'); cd_size, cd_off = struct.unpack('<II', tail[i + 12:i + 20]); count = struct.unpack('<H', tail[i + 10:i + 12])[0]
    j = tail.rfind(b'PK\x06\x06')   # ZIP64 end record
    if j >= 0: count, cd_size, cd_off = struct.unpack('<QQQ', tail[j + 32:j + 56])
    cd = rng(url, cd_off, cd_off + cd_size - 1); out = []; p = 0
    while p < len(cd) and cd[p:p + 4] == b'PK\x01\x02':
        meth, = struct.unpack('<H', cd[p + 10:p + 12]); csz, usz = struct.unpack('<II', cd[p + 20:p + 28])
        nl, el, cl = struct.unpack('<HHH', cd[p + 28:p + 34]); off, = struct.unpack('<I', cd[p + 42:p + 46])
        name = cd[p + 46:p + 46 + nl].decode('utf-8', 'replace'); ex = cd[p + 46 + nl:p + 46 + nl + el]
        q = 0
        while q + 4 <= len(ex):   # ZIP64 extra field
            hid, hsz = struct.unpack('<HH', ex[q:q + 4]); body = ex[q + 4:q + 4 + hsz]
            if hid == 1:
                k = 0
                if usz == 0xFFFFFFFF: usz, = struct.unpack('<Q', body[k:k + 8]); k += 8
                if csz == 0xFFFFFFFF: csz, = struct.unpack('<Q', body[k:k + 8]); k += 8
                if off == 0xFFFFFFFF: off, = struct.unpack('<Q', body[k:k + 8]); k += 8
            q += 4 + hsz
        out.append((name, meth, csz, usz, off)); p += 46 + nl + el + cl
    return out

def fetch(url, e, out_dir, tries=5):
    name, meth, csz, usz, off = e
    dst = os.path.join(out_dir, name)
    if os.path.exists(dst) and os.path.getsize(dst) == usz: return   # resume: already have it
    for k in range(tries):
        try: return _fetch(url, e, out_dir)
        except OSError:
            if k == tries - 1: raise
            import time; time.sleep(1 + k * 2)

def _fetch(url, e, out_dir):
    name, meth, csz, usz, off = e
    h = rng(url, off, off + 29); nl, el = struct.unpack('<HH', h[26:30])
    data = rng(url, off + 30 + nl + el, off + 30 + nl + el + csz - 1) if csz else b''
    raw = zlib.decompress(data, -15) if meth == 8 else data
    dst = os.path.join(out_dir, name); os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, 'wb').write(raw)

if __name__ == '__main__':
    cmd, url = sys.argv[1], sys.argv[2]
    es = entries(url)
    if cmd == 'list':
        f = sys.argv[3] if len(sys.argv) > 3 else ''
        sel = [e for e in es if f in e[0]]
        for e in sel[:200]: print(f'{e[2] / 1e6:9.2f} MB  {e[0]}')
        print(len(es), 'entries;', len(sel), 'match;', f'{sum(e[2] for e in sel) / 1e6:.1f} MB compressed')
    else:
        pre, out_dir = sys.argv[3], sys.argv[4]
        sel = [e for e in es if e[0].startswith(pre) and not e[0].endswith('/')]
        print('fetching', len(sel), 'members,', f'{sum(e[2] for e in sel) / 1e6:.1f} MB', flush=True)
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(8) as ex: list(ex.map(lambda e: fetch(url, e, out_dir), sel))   # members are small: fetch 8 at a time
        print('done')
