// Quick look: draw a few moments of the film and tile them into one image.
// Seconds per frame instead of minutes per render, so check every change this way first.
//
//   node stills.cjs --project <dir> --out stills.png --t "2.5 6.5 11 14.2 19.5 23.2 28.5 34"
const { chromium } = require('playwright');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => { const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(' ')]; }));
const PROJECT = path.resolve(args.project || '.');
const OUT = path.resolve(args.out || 'stills.png');
const TIMES = (args.t || '1 5 10 15 20 25 30').split(/[\s,]+/).filter(Boolean).map(Number);
const COLS = +(args.cols || 4), W = +(args.w || 480);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
  await page.goto('file://' + path.join(PROJECT, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.__frame);
  const urls = [];
  for (const t of TIMES) urls.push(await page.evaluate((t) => { window.__frame(t); return document.querySelector('canvas').toDataURL('image/png'); }, t));
  // tile in the page itself, so no image library is needed
  const sheet = await page.evaluate(async ({ urls, times, cols, w }) => {
    const rows = Math.ceil(urls.length / cols), c = document.createElement('canvas');
    c.width = cols * (w + 6); c.height = rows * (w + 6);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < urls.length; i++) {
      const img = new Image(); img.src = urls[i]; await img.decode();
      const x = (i % cols) * (w + 6), y = Math.floor(i / cols) * (w + 6);
      g.drawImage(img, x, y, w, w);
      g.fillStyle = '#c00'; g.font = '16px sans-serif'; g.fillText(times[i] + 's', x + 6, y + 20);
    }
    return c.toDataURL('image/png');
  }, { urls, times: TIMES, cols: COLS, w: W });
  require('fs').writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
  await browser.close();
  console.log('wrote', OUT);
})();
