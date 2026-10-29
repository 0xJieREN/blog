// A pattern series: the same silhouette in a new world on every beat cut.
// Each tile: draw the ground edge to edge, then the figure with the same motif treated another
// way (value swapped, filled vs outlined, heavier vs finer). Never outline the figure.
// Order the tiles so the figure alternates light / dark and warm / cool, runs of at most three.
(() => {
  const M = window.Media;
  const { region, paper, crayon, stipple, line, hatch, hatchShape, poly, scatter } = M;

  const TILES = [
    { name: 'tartan', draw(ctx) {           // motif continues through the edge, value swapped
      const grid = (col, w, a) => { for (let x = 60; x < 1080; x += 150) { line(ctx, [[x, -10], [x + 4, 1090]], { color: col, w, alpha: a, seed: x, rough: true }); line(ctx, [[-10, x], [1090, x - 3]], { color: col, w, alpha: a, seed: x + 7, rough: true }); } };
      paper(ctx, '#d8c79c'); crayon(ctx, '#b49a62', { seed: 1, alpha: 0.35 });
      hatch(ctx, { color: '#5b4a2e', gap: 9, angle: 0.02, w: 0.8, alpha: 0.35, dash: 60, seed: 2 });
      hatch(ctx, { color: '#5b4a2e', gap: 9, angle: 1.59, w: 0.8, alpha: 0.35, dash: 60, seed: 3 });
      grid('#2c56a8', 9, 0.9);
      region(ctx, true, () => {
        paper(ctx, '#23345e'); crayon(ctx, '#1b2a55', { seed: 4, alpha: 0.6, w: 4 });
        hatch(ctx, { color: '#0f1734', gap: 6, angle: 0.02, w: 1, alpha: 0.5, dash: 50, seed: 5 });
        hatch(ctx, { color: '#0f1734', gap: 6, angle: 1.59, w: 1, alpha: 0.5, dash: 50, seed: 6 });
        grid('#3d6fd0', 9, 0.8);
      });
    } },
    { name: 'spirals', draw(ctx) {          // same scatter seed inside and out: spirals change colour as they cross
      const spirals = (col, w) => scatter(ctx, { dx: 170, jitter: 0.5, brick: true, seed: 11 }, (x, y, r) =>
        line(ctx, M.spiral(x, y, 52 + r() * 22, 2.4, r() * 6), { color: col, w, seed: 3 + r() * 99, wobble: 1.6, rough: true }));
      paper(ctx, '#a3abb4'); crayon(ctx, '#7e8894', { seed: 12, alpha: 0.4 }); stipple(ctx, '#e8ecef', { seed: 13, density: 26000, alpha: 0.5 });
      spirals('#1f4f97', 15);
      region(ctx, true, () => {
        paper(ctx, '#c8d6e4'); crayon(ctx, '#e9eff5', { seed: 14, alpha: 0.5 });
        spirals('#f7f8f6', 13);
      });
    } },
    { name: 'shingles', draw(ctx) {         // same rows, ground outlined, figure dark and cross-hatched
      const rows = (fill, stroke, hatchCol) => { for (let row = 0, y = -20; y < 1120; y += 44, row++) for (let x = (row % 2) * 33 - 40; x < 1120; x += 66) {
        const p = M.scale(x, y, 64, 48), path = poly(p);
        if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
        if (hatchCol) { hatchShape(ctx, path, { color: hatchCol, gap: 4, angle: 0.7, w: 0.9, alpha: 0.7, seed: x * 3 + y }); hatchShape(ctx, path, { color: hatchCol, gap: 5, angle: 2.3, w: 0.8, alpha: 0.5, seed: x + y * 3 }); }
        line(ctx, p, { color: stroke, w: 1.6, seed: x * 7 + y, wobble: 0.8 });
      } };
      paper(ctx, '#d79690'); crayon(ctx, '#e7aaa3', { seed: 21, alpha: 0.35 });
      rows(null, '#5a3430', null);
      region(ctx, true, () => { paper(ctx, '#4a3836'); rows('#4a3836', '#e2b2ac', '#1e1514'); });
    } },
    { name: 'oak', draw(ctx) {              // form swap: filled leaves outside, outlined leaves inside
      paper(ctx, '#3e7d6c'); crayon(ctx, '#2f6a5b', { seed: 31, alpha: 0.5 });
      scatter(ctx, { dx: 150, dy: 170, jitter: 0.35, brick: true, seed: 32 }, (x, y, r) => {
        const p = M.leaf(x, y, 120, -1.3 + (r() - 0.5) * 0.5);
        line(ctx, p, { color: '#1f4f42', fill: '#1f4f42', w: 1.2, seed: x + y, close: true });
        line(ctx, [p[0], p[30]], { color: '#8fb8a8', w: 1.4, seed: x });
      });
      region(ctx, true, () => {
        paper(ctx, '#ece5d3');
        scatter(ctx, { dx: 140, dy: 160, jitter: 0.4, seed: 33 }, (x, y, r) => {
          const p = M.leaf(x, y, 110, -1.4 + (r() - 0.5) * 0.7);
          line(ctx, p, { color: '#2c6b5a', w: 1.6, seed: x * 3 + y, close: true });
          line(ctx, [p[0], p[30]], { color: '#2c6b5a', w: 1.2, seed: y });
          for (let k = 6; k < 28; k += 5) {
            const mid = [M.lerp(p[0][0], p[30][0], k / 30), M.lerp(p[0][1], p[30][1], k / 30)];
            line(ctx, [mid, p[k]], { color: '#2c6b5a', w: 0.9, seed: k + x });
          }
        });
      });
    } },
    { name: 'meander', draw(ctx) {          // same grid, ground in a fine pen, figure heavy and hatched
      const keys = (w, col) => { for (let y = -30; y < 1100; y += 64) for (let x = -30; x < 1100; x += 64) line(ctx, M.meander(x, y, 52), { color: col, w, seed: x * 13 + y, wobble: 0.6, rough: w > 4 }); };
      paper(ctx, '#f1ece0', 0.8);
      keys(1.3, '#2a2a2a');
      region(ctx, true, () => {
        paper(ctx, '#ece6d8', 0.8);
        hatch(ctx, { color: '#222', gap: 3.2, angle: 0.75, w: 1, alpha: 0.35, seed: 41 });
        keys(9, '#1d1d1d');
      });
    } },
    { name: 'seeds', draw(ctx) {            // dark pods outside, pale seeds inside, and one small bee
      const seeds = (fill, edge, hi, seed, sz) => scatter(ctx, { dx: 58, dy: 50, jitter: 0.5, brick: true, seed }, (x, y, r) => {
        const a = -1.2 + (r() - 0.5) * 0.8, p = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2; const rx = sz * (1 + 0.25 * Math.cos(t)), ry = sz * 0.55; p.push([x + Math.cos(a) * Math.cos(t) * rx - Math.sin(a) * Math.sin(t) * ry, y + Math.sin(a) * Math.cos(t) * rx + Math.cos(a) * Math.sin(t) * ry]); }
        line(ctx, p, { color: edge, fill, w: 1.4, seed: x + y, close: true, wobble: 0.6 });
        line(ctx, p.slice(3, 9), { color: hi, w: 2.2, seed: y, wobble: 0.4 });
      });
      paper(ctx, '#56593f'); crayon(ctx, '#434630', { seed: 51, alpha: 0.5 });
      seeds('#25261c', '#1a1b12', '#7d8063', 52, 20);
      region(ctx, true, () => { paper(ctx, '#9b9c8c'); seeds('#cfcfc3', '#3b3c30', '#ffffff', 53, 19); });
      // the accent: one tiny thing only the second look finds
      const bx = 612, by = 790;
      ctx.fillStyle = '#e8b730'; ctx.beginPath(); ctx.ellipse(bx, by, 9, 6, 0.4, 0, 7); ctx.fill();
      line(ctx, [[bx - 4, by - 5], [bx - 1, by + 6]], { color: '#222', w: 2 }); line(ctx, [[bx + 2, by - 6], [bx + 5, by + 4]], { color: '#222', w: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(bx - 3, by - 9, 6, 3.5, -0.5, 0, 7); ctx.fill();
    } },
    { name: 'grain', draw(ctx) {            // the same planks, ground pale, figure dark and dense
      const planks = (col, gapK, w) => { for (let x = 0; x < 1080; x += 120) {
        line(ctx, [[x, -10], [x + 2, 1090]], { color: col, w: w * 1.4, seed: x });
        for (let k = 1; k < 120 / gapK; k++) {
          const p = [], ph = x * 0.13 + k, knot = 300 + ((x * 7) % 500);
          for (let y = -10; y <= 1090; y += 20) p.push([x + k * gapK + Math.sin(y * 0.01 + ph) * 3 + 14 * Math.exp(-((y - knot) ** 2) / 900) * Math.sin(k), y]);
          line(ctx, p, { color: col, w, alpha: 0.7, seed: x + k, wobble: 0.5 });
        }
      } };
      paper(ctx, '#cdd6dc'); planks('#8f979e', 26, 1.1);
      region(ctx, true, () => { paper(ctx, '#6a6e72'); planks('#393c40', 7, 1.5); });
    } },
    { name: 'lattice', draw(ctx) {          // the last tile carries the one red thing
      const ogee = (col, w) => { for (let cx = -90; cx < 1200; cx += 180) for (let side of [-1, 1]) {
        const p = []; for (let y = -20; y <= 1100; y += 12) p.push([cx + side * 90 * Math.cos(y / 180 * Math.PI), y]);
        line(ctx, p, { color: col, w, seed: cx * side + 5, wobble: 0.7 });
      } };
      paper(ctx, '#2e6a3a');
      hatch(ctx, { color: '#163d1f', gap: 5, angle: 0.6, w: 1, alpha: 0.6, dash: 70, seed: 61 });
      hatch(ctx, { color: '#163d1f', gap: 6, angle: 2.4, w: 1, alpha: 0.5, dash: 70, seed: 62 });
      ogee('#eef0e6', 10); ogee('#2e6a3a', 3);  // a double line: wide pale stroke, thin ground-colour stroke down its middle
      for (let cx = 0; cx < 1200; cx += 180) for (let y = 90; y < 1100; y += 180) { ctx.fillStyle = '#123a1c'; ctx.beginPath(); ctx.arc(cx, y, 11, 0, 7); ctx.fill(); }
      region(ctx, true, () => {
        paper(ctx, '#b4cbe3');
        hatch(ctx, { color: '#5d8fc9', gap: 5, angle: 0.6, w: 1, alpha: 0.6, dash: 60, seed: 63 });
        hatch(ctx, { color: '#5d8fc9', gap: 7, angle: 2.4, w: 1, alpha: 0.4, dash: 60, seed: 64 });
        ogee('#f5f5f0', 10);
        line(ctx, [[560, 190], [585, 260], [566, 330], [590, 400], [575, 470]], { color: '#b8382a', w: 2, seed: 65 });
      });
      line(ctx, [[592, 712], [622, 704], [628, 736], [598, 744]], { color: '#8a2218', fill: '#c4402e', w: 1.5, close: true, seed: 66 });
    } },
  ];

  // Cut times: from js/beats.js (scripts/beat_grid.py) when present, else one tile a second.
  const B = window.BEATS;
  const CUTS = B && B.cuts ? B.cuts : TILES.map((_, i) => i).concat(TILES.length);
  const N = CUTS.length - 1;
  if (N > TILES.length) console.warn(`${N} cuts but ${TILES.length} tiles: tiles repeat`);
  const DURATION = CUTS[N];

  function tileAt(t) { let i = 0; while (i < N - 1 && t >= CUTS[i + 1]) i++; return i; }

  function frame(canvas, t) {
    const ctx = canvas.getContext('2d'), i = tileAt(t);
    ctx.drawImage(M.tileBitmap(TILES[i % TILES.length], i % TILES.length), 0, 0, canvas.width, canvas.height);
  }

  window.Film = { TILES, CUTS, DURATION, frame, tileAt };
})();
