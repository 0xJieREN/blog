// Render the film to an mp4: every frame is drawn by index.html in headless Chromium,
// piped into ffmpeg, then muxed with the recording.
//
//   node render.cjs [--out aria.mp4] [--fps 24] [--workers 3] [--from 0] [--to <seconds>] [--size 1080] [--crf 25]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)));
const FPS = +(args.fps || 24), WORKERS = +(args.workers || 3), SIZE = +(args.size || 1080), CRF = String(args.crf || 25);
const OUT = path.resolve(args.out || 'aria.mp4');
const HERE = __dirname;
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aria-'));

function ffmpeg(argv) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'inherit'] });
    p.on('exit', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res()));
  });
}

async function renderRange(browser, w, f0, f1) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(HERE, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.__frame);
  const seg = path.join(TMP, `seg${w}.mp4`);
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS), '-i', '-',
    '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'animation', '-pix_fmt', 'yuv420p', seg],
  { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('exit', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate((t) => { window.__frame(t); return document.getElementById('c').toDataURL('image/png'); }, f / FPS);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if ((f - f0) % 240 === 0) console.log(`worker ${w}: frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await done;
  await page.close();
  return seg;
}

(async () => {
  const browser = await chromium.launch();
  const probe = await browser.newPage();
  await probe.goto('file://' + path.join(HERE, 'index.html') + '?render=1');
  await probe.waitForFunction(() => window.__frame);
  const duration = await probe.evaluate(() => window.__duration);
  await probe.close();
  const from = +(args.from || 0), to = Math.min(duration, +(args.to || duration));
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS), per = Math.ceil((F1 - F0) / WORKERS);
  console.log(`rendering ${F1 - F0} frames (${from}s to ${to.toFixed(2)}s) with ${WORKERS} workers`);
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, w) => renderRange(browser, w, F0 + w * per, Math.min(F1, F0 + (w + 1) * per))));
  await browser.close();

  const list = path.join(TMP, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  await ffmpeg(['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(from), '-t', String(to - from),
    '-i', path.join(HERE, 'audio/aria.mp3'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-af', 'apad', '-shortest', '-movflags', '+faststart', OUT]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('wrote', OUT);
})();
