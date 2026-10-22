// Offline trailer recorder: headless Chrome on the real GPU, driven over the DevTools protocol.
//   node trailer/rec.mjs shots <id> [<id> …] [--scale 2] [--out .tmp/trailer/frames]   render shots frame by frame
//   node trailer/rec.mjs peek [<id> …]                                                start / middle / end stills of shots
//   node trailer/rec.mjs eval <js expression>                                         print a value from the loaded game
//   node trailer/rec.mjs stills <file.json>                                             planning stills [{name,p,l,tod,fov}]
// Needs the local server on 127.0.0.1:8765 (tools/launch.ps1 -NoBrowser or the preview). Frames: <out>/<id>/00001.jpg
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333, W = 1920, H = 816;
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const SCALE = +opt('--scale', 1.5), OUT = path.resolve(ROOT, opt('--out', '.tmp/trailer/frames'));
const [mode, ...rest] = argv;

try { await fetch('http://127.0.0.1:8765/trailer/rec.html'); } catch (e) { console.error('server not running on 127.0.0.1:8765'); process.exit(2); }
const prof = path.join(ROOT, '.tmp', 'chrome-rec'); fs.mkdirSync(prof, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--force_high_performance_gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--disable-gpu-watchdog', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--mute-audio', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill(); } catch (e) {} });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0; const waiting = new Map();
async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const pg = l.find((t) => t.type === 'page'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch (e) {}
    await sleep(250);
  }
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') console.error('[page]', d.params.args.map((a) => a.value ?? a.description).join(' ')); else if (d.method === 'Runtime.exceptionThrown') console.error('[page exc]', d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text); };
}
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; waiting.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 600000 });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  if (r.error) throw new Error(JSON.stringify(r.error));
  return r.result.result.value;
}
const writeJpeg = (file, dataURL) => fs.writeFileSync(file, Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64'));

await connect();
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8765/trailer/rec.html' });
await sleep(1500);
const t0 = Date.now();
await until(async () => { try { return await ev('!!window.__rec'); } catch (e) { return false; } });
async function until(f) { for (;;) { if (await f()) return; await sleep(500); } }
// the game loop only advances when stepped: keep it ticking while the city loads
const pump = setInterval(() => { ws.send(JSON.stringify({ id: ++seq, method: 'Runtime.evaluate', params: { expression: 'window.__clock && __clock.step(33)' } })); }, 120);
const info = await ev('__rec.ready()');
clearInterval(pump); await sleep(300);
console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(info));

if (mode === 'stills') {
  const list = JSON.parse(fs.readFileSync(rest[0], 'utf8')), dir = path.resolve(ROOT, '.tmp/trailer/stills'); fs.mkdirSync(dir, { recursive: true });
  for (const s of list) {
    const d = await ev(`__rec.still(${JSON.stringify(s.p)}, ${JSON.stringify(s.l)}, ${JSON.stringify({ tod: s.tod || 'day', fov: s.fov || 36, warm: s.warm || 2500 })})`);
    writeJpeg(path.join(dir, s.name + '.jpg'), d); console.log('still', s.name);
  }
} else if (mode === 'peek') {   // contact frames of shots: .tmp/trailer/peek/<id>_<k>.jpg
  const dir = path.resolve(ROOT, '.tmp/trailer/peek'); fs.mkdirSync(dir, { recursive: true });
  const ids = rest.length ? rest : await ev('__rec.shots');
  for (const id of ids) { const fr = await ev(`__rec.peek(${JSON.stringify(id)})`); fr.forEach((d, i) => writeJpeg(path.join(dir, `${id}_${i}.jpg`), d)); console.log('peek', id); }
} else if (mode === 'eval') {
  console.log(JSON.stringify(await ev(rest.join(' ')), null, 1));
} else if (mode === 'shots') {
  const ids = rest.length ? rest : await ev('__rec.shots');
  for (const id of ids) {
    const dir = path.join(OUT, id), want = (await ev(`__rec.info(${JSON.stringify(id)})`)).frames;
    if (!argv.includes('--force') && fs.existsSync(dir) && fs.readdirSync(dir).length === want) { console.log('shot', id, 'done already'); continue; }
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = await ev(`__rec.begin(${JSON.stringify(id)})`), ts = Date.now();
    for (let i = 1; i <= n; i++) writeJpeg(path.join(dir, String(i).padStart(5, '0') + '.jpg'), await ev(`__rec.frame(${W}, ${H})`));
    console.log('shot', id, n, 'frames', ((Date.now() - ts) / n).toFixed(0), 'ms/frame');
  }
}
ws.close(); chrome.kill(); process.exit(0);
