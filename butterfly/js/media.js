// Hand media for a pattern series: one silhouette, a different world in every tile.
// Everything is drawn once per tile into a cached canvas, so every frame of a tile is identical
// (no boiling), and everything is seeded, so a re-render gives the same picture.
//
// A tile draws the whole sheet edge to edge, then draws again inside the figure with the same
// motif treated differently (lighter/darker, filled/outlined, finer/heavier). The figure is
// never outlined: its edge is only the change between the two treatments.
(() => {
  const W = 1080, H = 1080;

  // ---------- randomness (seeded, never per frame) ----------
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => ((s ^= s << 13, s ^= s >>> 17, s ^= s << 5) >>> 0) / 4294967296;
  }
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- the figure ----------
  // Measured from Kevin's self-portraits (1080 px): head circle centre (540, 376), r 210, top at
  // y 166; neck 230 wide at y ~600 with a short fillet; shoulders widen to 850 by y ~1000 and
  // leave the bottom of the frame. It covers ~39% of the sheet. Keep it pixel-identical in every
  // tile: the eye reads it as the one constant, and every cut becomes "same someone, new world".
  const SHOULDER = [[655, 552], [658, 600], [686, 626], [722, 646], [770, 686], [808, 726], [839, 766],
    [865, 806], [890, 846], [915, 886], [936, 926], [956, 966], [964, 1006], [965, 1046], [965, 1100]];
  function figurePoints() {
    // up the left shoulder, over the head from where it meets the neck, down the right shoulder
    const cx = 540, cy = 376, r = 210, a0 = Math.asin((552 - cy) / r), head = [];
    for (let i = 0; i <= 90; i++) {
      const a = Math.PI - a0 + (i / 90) * (Math.PI + 2 * a0);
      head.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const left = [...SHOULDER].reverse().map(([x, y]) => [W - x, y]);
    return [...left.slice(0, -1), ...head, ...SHOULDER.slice(1)];
  }
  let FIG = null;
  function figure() {
    if (FIG) return FIG;
    const pts = figurePoints(), path = new Path2D();
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    return (FIG = path);
  }
  // Draw fn clipped to the figure (inside = true) or to the ground around it.
  function region(ctx, inside, fn) {
    ctx.save();
    const p = new Path2D();
    if (!inside) p.rect(-10, -10, W + 20, H + 20);
    p.addPath(figure());
    ctx.clip(p, inside ? 'nonzero' : 'evenodd');
    fn();
    ctx.restore();
  }
  const inFigure = (ctx, x, y) => ctx.isPointInPath(figure(), x, y);

  // ---------- paper, grain, washes ----------
  let grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r() * 18;
    }
    g.putImageData(img, 0, 0);
    return (grainTile = c);
  }
  // Flat ground plus faint tooth. amount 0-1.
  function paper(ctx, color, amount = 1) {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = amount; ctx.fillStyle = ctx.createPattern(grain(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // Crayon / pastel wash: thousands of short soft strokes in one direction, paper showing through.
  function crayon(ctx, color, o = {}) {
    const r = rng(o.seed || 1), n = o.density ?? 9000, ang = o.angle ?? -0.5, len = o.len ?? 26;
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 60) - 30, y = r() * (H + 60) - 30, a = ang + (r() - 0.5) * 0.5, l = len * (0.5 + r());
      ctx.globalAlpha = (o.alpha ?? 0.5) * (0.4 + 0.6 * r());
      ctx.lineWidth = (o.w ?? 3) * (0.6 + r() * 0.8);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.restore();
  }
  // Stipple: dots, like a sponge or a risograph screen.
  function stipple(ctx, color, o = {}) {
    const r = rng(o.seed || 2), n = o.density ?? 20000;
    ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = (o.alpha ?? 0.6) * r();
      const s = (o.size ?? 1.6) * (0.5 + r());
      ctx.fillRect(r() * W, r() * H, s, s);
    }
    ctx.restore();
  }

  // Paper tooth over the finished tile: tiny light and dark specks knocked into every colour, the
  // way crayon and ink skip on rough paper. It is what stops the tiles looking like vector art.
  function tooth(ctx, amount = 1) {
    const r = rng(99);
    ctx.save();
    for (let i = 0; i < 60000 * amount; i++) {
      const x = r() * W, y = r() * H, s = 0.8 + r() * 1.8;
      ctx.globalAlpha = 0.05 + r() * 0.12;
      ctx.fillStyle = r() < 0.6 ? '#fffdf6' : '#1a1712';
      ctx.fillRect(x, y, s * (1 + r() * 2), s);
    }
    ctx.restore();
  }

  // ---------- pen and pencil ----------
  // A hand line: resampled, with a slow seeded wobble and a slightly uneven width.
  function line(ctx, pts, o = {}) {
    const r = rng(o.seed || 3), wob = o.wobble ?? 1.2, out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
      for (let k = 0; k < n; k++) out.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
    }
    out.push(pts[pts.length - 1]);
    const ph = r() * 9;
    ctx.save(); ctx.strokeStyle = o.color || '#222'; ctx.lineWidth = o.w ?? 2; ctx.globalAlpha = o.alpha ?? 1;
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
    out.forEach(([x, y], i) => {
      const dx = Math.sin(i * 0.31 + ph) * wob, dy = Math.cos(i * 0.27 + ph * 1.3) * wob;
      i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy);
    });
    if (o.close) ctx.closePath();
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.w !== 0) ctx.stroke();
    if (o.rough && o.w) {          // dry-brush / crayon edge: a few thinner, offset, fainter passes
      for (let k = 0; k < 3; k++) {
        ctx.lineWidth = o.w * 0.35; ctx.globalAlpha = (o.alpha ?? 1) * 0.5;
        const off = (k - 1) * o.w * 0.45;
        ctx.beginPath();
        out.forEach(([x, y], i) => {
          const dx = Math.sin(i * 0.53 + ph + k) * o.w * 0.25 + off, dy = Math.cos(i * 0.47 + k) * o.w * 0.25 - off;
          i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy);
        });
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Parallel hatching over the whole sheet (clip it with region()). gap in px, angle in radians.
  function hatch(ctx, o = {}) {
    const r = rng(o.seed || 4), gap = o.gap ?? 7, a = o.angle ?? 0.8, d = Math.hypot(W, H);
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    ctx.save(); ctx.strokeStyle = o.color || '#222'; ctx.lineCap = 'round';
    for (let s = -d / 2; s < d / 2; s += gap * (0.75 + r() * 0.5)) {
      const seg = o.dash ?? d;                     // dash < d gives broken, sketchy hatching
      for (let t = -d / 2; t < d / 2; t += seg + (o.dash ? r() * seg * 0.6 : 0)) {
        const cx = 540 + nx * s, cy = 540 + ny * s;
        ctx.globalAlpha = (o.alpha ?? 0.8) * (0.6 + 0.4 * r());
        ctx.lineWidth = (o.w ?? 1.2) * (0.7 + r() * 0.6);
        ctx.beginPath(); ctx.moveTo(cx + ux * t, cy + uy * t); ctx.lineTo(cx + ux * (t + seg * 0.92), cy + uy * (t + seg * 0.92)); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Hatch inside an arbitrary small shape (a leaf, a scale) without touching the outside.
  function hatchShape(ctx, path, o) { ctx.save(); ctx.clip(path); hatch(ctx, o); ctx.restore(); }
  function poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; }

  // ---------- placement ----------
  // Scatter a motif over the sheet on a jittered grid. fn(x, y, r, i) draws one; r is a seeded
  // random function for that motif. Rows can be offset (brick) for a woven look.
  function scatter(ctx, o, fn) {
    const r = rng(o.seed || 5), sx = o.dx ?? 90, sy = o.dy ?? sx, j = o.jitter ?? 0.3;
    let i = 0;
    for (let row = -1, y = -sy; y < H + sy; y += sy, row++) {
      for (let x = -sx + (o.brick && row % 2 ? sx / 2 : 0); x < W + sx; x += sx) {
        fn(x + (r() - 0.5) * j * sx, y + (r() - 0.5) * j * sy, rng(1000 + i), i++);
      }
    }
  }

  // ---------- motifs ----------
  function spiral(cx, cy, R, turns = 2.6, a0 = 0) {
    const p = [];
    for (let i = 0; i <= 90; i++) { const k = i / 90, a = a0 + k * turns * Math.PI * 2; p.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]); }
    return p;
  }
  function leaf(cx, cy, L, a, lobes = 4) {
    const p = [], ux = Math.cos(a), uy = Math.sin(a);
    for (let i = 0; i <= 60; i++) {
      const k = i / 60, side = i <= 30 ? 1 : -1, t = i <= 30 ? k * 2 : 2 - k * 2;
      const wv = Math.sin(t * Math.PI) * L * 0.32 * (1 + 0.22 * Math.sin(t * Math.PI * lobes * 2));
      const along = t * L - L / 2;
      p.push([cx + ux * along - uy * wv * side, cy + uy * along + ux * wv * side]);
    }
    return p;
  }
  function scale(cx, cy, w, h) { // one roof shingle / fish scale, round at the bottom
    const p = [[cx - w / 2, cy - h * 0.3]];
    for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; p.push([cx + Math.cos(a) * w / 2, cy - h * 0.3 + Math.sin(a) * h]); }
    p.push([cx + w / 2, cy - h * 0.3]);
    return p;
  }
  // One Greek-key (meander) cell of size s, as a single polyline.
  function meander(x, y, s) {
    const u = s / 5;
    return [[x, y + 5 * u], [x, y], [x + 5 * u, y], [x + 5 * u, y + 4 * u], [x + 2 * u, y + 4 * u], [x + 2 * u, y + 2 * u], [x + 3 * u, y + 2 * u]];
  }

  // ---------- one cached bitmap per tile ----------
  const cache = new Map();
  function tileBitmap(tile, i) {
    if (cache.has(i)) return cache.get(i);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    tile.draw(g);
    if (tile.tooth !== 0) tooth(g, tile.tooth ?? 1);
    cache.set(i, c);
    return c;
  }

  window.Media = { W, H, rng, lerp, figure, region, inFigure, paper, grain, tooth, crayon, stipple, line, hatch, hatchShape, poly, scatter, spiral, leaf, scale, meander, tileBitmap };
})();
