// Render the film to an mp4: every frame is drawn by index.html in headless Chromium,
// saved as a PNG, then encoded once (one encoder, so quality never jumps between chunks).
//
//   node render.cjs [--out aria.mp4] [--fps 24] [--workers 3] [--from 0] [--to <seconds>] [--size 1080] [--crf 20]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => a.trim().split(/\s+/)));
const FPS = +(args.fps || 24), WORKERS = +(args.workers || 3), SIZE = +(args.size || 1080), CRF = String(args.crf || 20);
const AUDIO = 'audio/aria-excerpt.mp3';
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
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const url = await page.evaluate((t) => { window.__frame(t); return document.getElementById('c').toDataURL('image/png'); }, f / FPS);
    fs.writeFileSync(path.join(TMP, `${String(f).padStart(6, '0')}.png`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if ((f - f0) % 240 === 0) console.log(`worker ${w}: frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await page.close();
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
  await Promise.all(Array.from({ length: WORKERS }, (_, w) => renderRange(browser, w, F0 + w * per, Math.min(F1, F0 + (w + 1) * per))));
  await browser.close();

  await ffmpeg(['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(F0), '-i', path.join(TMP, '%06d.png'),
    '-ss', String(from), '-t', String(to - from), '-i', path.join(HERE, AUDIO),
    '-map', '0:v', '-map', '1:a', '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest', '-movflags', '+faststart', OUT]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('wrote', OUT);
})();
