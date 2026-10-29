// Check a pattern series before rendering it: lay every tile out as one wall, and measure each
// tile against what Kevin's self-portraits do.
//
//   node series_check.cjs --project <dir> [--out wall.png] [--cols 5] [--w 300]
//
// Prints per tile: figure and ground luminance (0-255) and the gap between them, which side is
// lighter, and the dominant hue; then warnings:
//   - gap under 70: the silhouette won't read at a glance (Kevin's 20 tiles: 78-116, never less)
//   - figure equally light 4+ tiles in a row: the cuts stop feeling like cuts (his runs are <= 3)
//   - neighbouring tiles with nearly the same colours: two cuts that look like one
// Looks at the cached tile bitmaps, so it needs window.Film.TILES and window.Media (series template).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => { const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(' ')]; }));
const PROJECT = path.resolve(args.project || '.');
const OUT = path.resolve(args.out || path.join(PROJECT, 'wall.png'));
const COLS = +(args.cols || 5), TW = +(args.w || 300);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(PROJECT, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.Film && window.Media);
  const res = await page.evaluate(({ cols, tw }) => {
    const { TILES } = window.Film, M = window.Media, probe = document.createElement('canvas').getContext('2d');
    // sample points well inside the figure and well outside it (25 px from the edge)
    const inside = (x, y) => probe.isPointInPath(M.figure(), x, y);
    const fig = [], gnd = [];
    for (let y = 6; y < 1080; y += 12) for (let x = 6; x < 1080; x += 12) {
      const k = [[0, 0], [25, 0], [-25, 0], [0, 25], [0, -25]].map(([dx, dy]) => inside(x + dx, y + dy));
      if (k.every(Boolean)) fig.push([x, y]); else if (!k.some(Boolean)) gnd.push([x, y]);
    }
    const rows = Math.ceil(TILES.length / cols), wall = document.createElement('canvas');
    wall.width = cols * (tw + 6); wall.height = rows * (tw + 6);
    const g = wall.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, wall.width, wall.height);
    const stats = TILES.map((tile, i) => {
      const c = M.tileBitmap(tile, i), d = c.getContext('2d').getImageData(0, 0, 1080, 1080).data;
      const mean = (pts) => { let r = 0, gg = 0, b = 0; for (const [x, y] of pts) { const o = (y * 1080 + x) * 4; r += d[o]; gg += d[o + 1]; b += d[o + 2]; } return [r, gg, b].map((v) => v / pts.length); };
      const f = mean(fig), gr = mean(gnd), lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      const x = (i % cols) * (tw + 6), y = Math.floor(i / cols) * (tw + 6);
      g.drawImage(c, x, y, tw, tw); g.fillStyle = '#fff'; g.fillRect(x, y + tw - 22, tw, 22);
      g.fillStyle = '#222'; g.font = '14px sans-serif'; g.fillText(`${i + 1} ${tile.name || ''}`, x + 6, y + tw - 6);
      return { name: tile.name || '', fig: f, gnd: gr, lf: lum(f), lg: lum(gr) };
    });
    return { stats, wall: wall.toDataURL('image/png') };
  }, { cols: COLS, tw: TW });
  await browser.close();
  fs.writeFileSync(OUT, Buffer.from(res.wall.split(',')[1], 'base64'));

  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const warn = [];
  let run = 0;
  res.stats.forEach((s, i) => {
    const gap = Math.abs(s.lf - s.lg), side = s.lf > s.lg ? 'light figure' : 'dark figure';
    console.log(`${String(i + 1).padStart(2)} ${s.name.padEnd(14)} figure ${hex(s.fig)} ${s.lf.toFixed(0).padStart(3)}  ground ${hex(s.gnd)} ${s.lg.toFixed(0).padStart(3)}  gap ${gap.toFixed(0).padStart(3)}  ${side}`);
    if (gap < 70) warn.push(`${i + 1} ${s.name}: figure/ground gap ${gap.toFixed(0)} (< 70) - the silhouette won't read`);
    const prev = res.stats[i - 1];
    run = prev && (prev.lf > prev.lg) === (s.lf > s.lg) ? run + 1 : 1;
    if (run === 4) warn.push(`${i - 2}-${i + 1}: ${side} four times running - alternate`);
    if (prev) {
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (dist(prev.fig, s.fig) + dist(prev.gnd, s.gnd) < 60) warn.push(`${i}-${i + 1}: nearly the same colours - the cut will barely register`);
    }
  });
  console.log(warn.length ? '\nwarnings:\n  ' + warn.join('\n  ') : '\nno warnings');
  console.log('wall:', OUT);
})();
