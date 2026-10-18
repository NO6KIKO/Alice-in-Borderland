"""Tiny Tripo v3 API client for this project.

The secret key (tsk_...) is read from the TRIPO_API_KEY environment variable — never stored in files.

  python tools/tripo.py balance
  python tools/tripo.py text  <out.glb> "<prompt>" [--neg "..."] [--faces 60000]
  python tools/tripo.py rig   <out.glb> <source_task_id>            # biped skeleton (rig v1.0: 90+ presets)
  python tools/tripo.py anim  <out.glb> <rig_task_id> idle walk run  # retarget presets (in place) into one GLB
  python tools/tripo.py task  <task_id>                              # show status / output
"""
import json, os, sys, time, urllib.request, urllib.error

BASE = os.environ.get('TRIPO_BASE', 'https://openapi.tripo3d.ai/v3')
KEY = os.environ.get('TRIPO_API_KEY', '')


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'},
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.load(r)
    except urllib.error.HTTPError as e:
        res = json.loads(e.read() or b'{}')
    if res.get('code') != 0:
        sys.exit(f"Tripo error {res.get('code')}: {res.get('message')} — {res.get('suggestion', '')}")
    return res['data']


def wait(task_id):
    while True:
        d = call('GET', f'/tasks/{task_id}')
        print(f"\r{task_id}  {d.get('status')}  {d.get('progress', 0)}%   ", end='', flush=True)
        if d.get('status') in ('success', 'failed', 'cancelled', 'banned', 'expired'):
            print()
            if d['status'] != 'success':
                sys.exit(f'task ended: {d}')
            return d
        time.sleep(4)


def download(url, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r, open(out, 'wb') as f:
        f.write(r.read())
    print(f'saved {out}  ({os.path.getsize(out) / 1e6:.1f} MB)')


def finish(d, out):
    o = d.get('output', {})
    print('credits:', d.get('credits_consumed'), ' task:', d['task_id'])
    download(o['model_url'], out)
    if o.get('rendered_image_url'):
        download(o['rendered_image_url'], os.path.splitext(out)[0] + '_preview.png')


def main():
    if not KEY.startswith('tsk_'):
        sys.exit('Set TRIPO_API_KEY to your Tripo secret key (starts with tsk_).')
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == 'balance':
        print(call('GET', '/account/balance'))
    elif cmd == 'task':
        print(json.dumps(call('GET', f'/tasks/{a[1]}'), indent=2))
    elif cmd == 'text':
        out, prompt = a[1], a[2]
        neg = a[a.index('--neg') + 1] if '--neg' in a else None
        faces = int(a[a.index('--faces') + 1]) if '--faces' in a else 60000
        body = {'prompt': prompt, 'model': 'v3.1-20260211', 'texture': True, 'pbr': True,
                'texture_quality': 'detailed', 'face_limit': faces, 'auto_size': True}
        if neg:
            body['negative_prompt'] = neg
        tid = call('POST', '/generation/text-to-model', body)['task_id']
        finish(wait(tid), out)
    elif cmd == 'rig':
        out, src = a[1], a[2]
        tid = call('POST', '/animations/rig', {'input': src, 'model': 'v1.0-20240301', 'rig_type': 'biped', 'out_format': 'glb'})['task_id']
        finish(wait(tid), out)
    elif cmd == 'anim':
        out, src, names = a[1], a[2], a[3:]
        tid = call('POST', '/animations/retarget', {'input': src, 'animations': [f'preset:biped:{n}' for n in names], 'out_format': 'glb', 'animate_in_place': True})['task_id']
        finish(wait(tid), out)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
