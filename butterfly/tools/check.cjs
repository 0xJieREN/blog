// Wall of every tile plus figure / ground contrast per tile (each tile's own silhouette).
//   node tools/check.cjs [--out wall.png] [--cols 7] [--w 300] [--only 0,5,9]
// Warns when the figure/ground luminance gap is under 70 (Kevin's tiles: 78-116) or the figure
// is equally light four tiles running.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((a) => { const [k, ...v] = a.trim().split(/\s+/); return [k, v.join(' ')]; }));
const PROJECT = path.resolve(__dirname, '..');
const OUT = path.resolve(args.out || path.join(PROJECT, 'out', 'wall.png'));
const COLS = +(args.cols || 7), TW = +(args.w || 300);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  p.on('pageerror', (e) => console.error('pageerror', e.message));
  await p.goto('file://' + path.join(PROJECT, 'index.html') + '?render=1');
  await p.waitForFunction(() => window.Film);
  const res = await p.evaluate(({ cols, tw, only }) => {
    const { TILES } = window.Film, M = window.Media;
    const ids = only ? only.split(',').map(Number) : TILES.map((_, i) => i);
    const rows = Math.ceil(ids.length / cols), wall = document.createElement('canvas');
    wall.width = cols * (tw + 6); wall.height = rows * (tw + 6);
    const g = wall.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, wall.width, wall.height);
    const stats = ids.map((i, k) => {
      const tile = TILES[i], t0 = performance.now(), c = M.tileBitmap(tile, i), ms = performance.now() - t0;
      const d = c.getContext('2d').getImageData(0, 0, 1080, 1080).data;
      const m = Species.mask(Species.byId[tile.id]).getContext('2d').getImageData(0, 0, 1080, 1080).data;
      let f = [0, 0], gr = [0, 0];
      for (let y = 4; y < 1080; y += 8) for (let x = 4; x < 1080; x += 8) {
        const o = (y * 1080 + x) * 4, L = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
        if (m[o + 3] > 250) { f[0] += L; f[1]++; } else if (m[o + 3] < 5) { gr[0] += L; gr[1]++; }
      }
      const x = (k % cols) * (tw + 6), y = Math.floor(k / cols) * (tw + 6);
      g.drawImage(c, x, y, tw, tw); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, y + tw - 20, tw, 20);
      g.fillStyle = '#222'; g.font = '13px sans-serif'; g.fillText(`${i + 1} ${tile.name}`, x + 5, y + tw - 6);
      return { i, name: tile.name, lf: f[0] / f[1], lg: gr[0] / gr[1], ms };
    });
    return { stats, wall: wall.toDataURL('image/png') };
  }, { cols: COLS, tw: TW, only: args.only });
  await b.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(res.wall.split(',')[1], 'base64'));
  const warn = []; let run = 0, prev = null;
  for (const s of res.stats) {
    const gap = Math.abs(s.lf - s.lg), light = s.lf > s.lg;
    console.log(`${String(s.i + 1).padStart(2)} ${s.name.padEnd(22)} figure ${s.lf.toFixed(0).padStart(3)} ground ${s.lg.toFixed(0).padStart(3)} gap ${gap.toFixed(0).padStart(3)} ${light ? 'light' : 'dark '} ${s.ms.toFixed(0)}ms`);
    if (gap < 70) warn.push(`${s.i + 1} ${s.name}: gap ${gap.toFixed(0)}`);
    run = prev !== null && prev === light ? run + 1 : 1; prev = light;
    if (run === 4) warn.push(`${s.i + 1}: four ${light ? 'light' : 'dark'} figures running`);
  }
  console.log(warn.length ? 'warnings:\n  ' + warn.join('\n  ') : 'no warnings');
  console.log('wall:', OUT);
})();
