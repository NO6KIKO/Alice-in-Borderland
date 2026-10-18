"""Run many Tripo jobs with a concurrency cap and automatic retry on rate limits (error 2000).

  python tools/tripo_queue.py tools/jobs.json [--max 3]

jobs.json: [{"kind": "model", "out": "models/props/x.glb", "prompt": "...", "neg": "...", "faces": 12000},
            {"kind": "person", "out": "models/people/x.glb", "prompt": "...", "neg": "...", "anims": ["run", ...]}]
Jobs whose output already exists are skipped. Reads TRIPO_API_KEY like tools/tripo.py.
"""
import json, os, sys, time, threading
sys.path.insert(0, os.path.dirname(__file__))
import tripo as T

MODEL = 'v3.1-20260211'


def submit(path, body):
    for attempt in range(40):
        try:
            return T.call('POST', path, body)['task_id']
        except SystemExit as e:
            if '2000' in str(e) or 'limit' in str(e).lower():
                time.sleep(20 + attempt * 5); continue
            raise


def wait(tid):
    while True:
        try:
            d = T.call('GET', f'/tasks/{tid}')
        except SystemExit:
            time.sleep(10); continue
        if d.get('status') in ('success', 'failed', 'cancelled', 'banned', 'expired'):
            if d['status'] != 'success':
                raise RuntimeError(f'task {tid} {d["status"]}')
            return d
        time.sleep(6)


def fetch(d, out):
    T.download(d['output']['model_url'], out)
    if d['output'].get('rendered_image_url'):
        T.download(d['output']['rendered_image_url'], os.path.splitext(out)[0] + '_preview.png')


def run(job):
    out = job['out']
    body = {'prompt': job['prompt'], 'model': MODEL, 'texture': True, 'pbr': True, 'texture_quality': 'detailed',
            'face_limit': job.get('faces', 20000), 'auto_size': True}
    if job.get('neg'): body['negative_prompt'] = job['neg']
    if job['kind'] == 'model':
        fetch(wait(submit('/generation/text-to-model', body)), out)
        return
    base = os.path.splitext(out)[0]
    gid = submit('/generation/text-to-model', body); d = wait(gid); fetch(d, base + '_tpose.glb')
    rid = submit('/animations/rig', {'input': gid, 'model': 'v1.0-20240301', 'rig_type': 'biped', 'out_format': 'glb'}); wait(rid)
    names = job['anims'][:5]
    aid = submit('/animations/retarget', {'input': rid, 'animations': [f'preset:biped:{n}' for n in names], 'out_format': 'glb', 'animate_in_place': True})
    T.download(wait(aid)['output']['model_url'], out)


def main():
    jobs = json.load(open(sys.argv[1], encoding='utf-8'))
    cap = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 3
    sem = threading.Semaphore(cap); lock = threading.Lock(); threads = []

    def work(j):
        with sem:
            try:
                run(j); msg = 'done'
            except BaseException as e:
                msg = f'FAILED {e}'
            with lock:
                print(f'{j["out"]}: {msg}', flush=True)

    for j in jobs:
        if os.path.exists(j['out']):
            continue
        t = threading.Thread(target=work, args=(j,)); t.start(); threads.append(t); time.sleep(1)
    for t in threads: t.join()
    print('ALLDONE', flush=True)


if __name__ == '__main__':
    if not T.KEY.startswith('tsk_'):
        sys.exit('Set TRIPO_API_KEY')
    main()
