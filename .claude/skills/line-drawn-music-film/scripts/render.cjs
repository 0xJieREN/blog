// Render a line-drawn film project to mp4.
// Every frame is drawn by <project>/index.html?render=1 in headless Chromium (window.__frame(t)),
// saved as PNG, then encoded once with the audio, so quality never jumps between chunks.
//
//   node render.cjs --project <dir> --audio audio/x.mp3 [--out out/film.mp4] [--fps 24]
//                   [--workers 3] [--from 0] [--to <s>] [--size 1080] [--crf 20]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => { const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(' ')]; }));
const PROJECT = path.resolve(args.project || '.');
const AUDIO = args.audio ? path.resolve(PROJECT, args.audio) : null;
const FPS = +(args.fps || 24), WORKERS = +(args.workers || Math.max(1, Math.min(4, os.cpus().length - 1)));
const SIZE = +(args.size || 1080), CRF = String(args.crf || 20);
const OUT = path.resolve(PROJECT, args.out || 'out/film.mp4');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'film-'));
const PAGE = 'file://' + path.join(PROJECT, 'index.html') + '?render=1';

const run = (argv) => new Promise((res, rej) => spawn('ffmpeg', argv, { stdio: ['ignore', 'ignore', 'inherit'] }).on('exit', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res())));

async function renderRange(browser, w, f0, f1) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__frame);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate((t) => { window.__frame(t); return document.querySelector('canvas').toDataURL('image/png'); }, f / FPS);
    fs.writeFileSync(path.join(TMP, `${String(f).padStart(6, '0')}.png`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if ((f - f0) % 240 === 0) console.log(`worker ${w}: ${f - f0}/${f1 - f0} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const probe = await browser.newPage();
  await probe.goto(PAGE);
  await probe.waitForFunction(() => window.__frame);
  const duration = await probe.evaluate(() => window.__duration);
  await probe.close();
  const from = +(args.from || 0), to = Math.min(duration, +(args.to || duration));
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS), per = Math.ceil((F1 - F0) / WORKERS);
  console.log(`rendering ${F1 - F0} frames (${from}s to ${to.toFixed(2)}s) with ${WORKERS} workers`);
  await Promise.all(Array.from({ length: WORKERS }, (_, w) => renderRange(browser, w, F0 + w * per, Math.min(F1, F0 + (w + 1) * per))));
  await browser.close();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const video = ['-framerate', String(FPS), '-start_number', String(F0), '-i', path.join(TMP, '%06d.png')];
  const audio = AUDIO ? ['-ss', String(from), '-t', String(to - from), '-i', AUDIO] : [];
  const map = AUDIO ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest'] : [];
  await run(['-v', 'error', '-y', ...video, ...audio, ...map, '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('wrote', OUT);
})();
