// A tiny pen-and-crayon kit. Everything on the sheet is drawn through these few calls:
// ink() for ballpoint lines, guide() for pale construction lines, crayon() for waxy fills,
// write() for handwriting, all revealed progressively and redrawn every frame.
(function () {
  const INK = '#27368c';
  const GUIDE = '#93acdf';
  const PAPER = '#f4efe4';

  // ---------- randomness ----------
  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return (n >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth 1D value noise in [-1, 1]
  function noise(x, seed) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = hash(i * 374761 + seed * 668265), b = hash((i + 1) * 374761 + seed * 668265);
    return (a + (b - a) * u) * 2 - 1;
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  // ---------- geometry ----------
  // A stroke is a resampled polyline with a fixed hand wobble baked in.
  let seedCounter = 1;
  function stroke(pts, opt = {}) {
    const seed = opt.seed != null ? opt.seed : seedCounter++;
    const step = opt.step || 3;
    const wob = opt.wobble != null ? opt.wobble : 1.4;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / step));
      for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    out.push(pts[pts.length - 1].slice());
    const N = out.length, len = new Float32Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
    for (let i = 1; i < N; i++) len[i] = len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
    for (let i = 0; i < N; i++) {
      const a = out[Math.max(0, i - 1)], b = out[Math.min(N - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / m; ny[i] = dx / m;
    }
    const xs = new Float32Array(N), ys = new Float32Array(N);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < N; i++) {
      const o = wob * (noise(len[i] / 90, seed) + 0.35 * noise(len[i] / 23, seed + 9));
      xs[i] = out[i][0] + nx[i] * o; ys[i] = out[i][1] + ny[i] * o;
      x0 = Math.min(x0, xs[i]); y0 = Math.min(y0, ys[i]); x1 = Math.max(x1, xs[i]); y1 = Math.max(y1, ys[i]);
    }
    return { xs, ys, nx, ny, len, L: len[N - 1], N, seed, box: [x0, y0, x1, y1] };
  }

  const pts = {
    line: (x0, y0, x1, y1) => [[x0, y0], [x1, y1]],
    // circles overshoot a little, like a hand closing a loop
    ellipse(cx, cy, rx, ry, a0 = -Math.PI / 2, turn = 1.06, rot = 0) {
      const n = Math.max(16, Math.ceil(Math.max(rx, ry) * 0.6)), out = [];
      for (let i = 0; i <= n * turn; i++) {
        const a = a0 + (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      return out;
    },
    arc(cx, cy, rx, ry, a0, a1) {
      const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 6)), out = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      return out;
    },
    rect: (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 - 2]],
    // Catmull-Rom through control points
    curve(c, per = 10) {
      const out = [];
      for (let i = 0; i < c.length - 1; i++) {
        const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
        for (let k = 0; k < per; k++) {
          const t = k / per, t2 = t * t, t3 = t2 * t;
          out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
      }
      out.push(c[c.length - 1].slice());
      return out;
    },
  };

  // ---------- drawing ----------
  let ctx = null, frameVariant = 0;
  function begin(c, variant) { ctx = c; frameVariant = variant; }
  // skip anything whose box lands outside the canvas under the current transform
  function offscreen(b) {
    const m = ctx.getTransform(), W = ctx.canvas.width, H = ctx.canvas.height;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) {
      const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
    return x1 < -20 || y1 < -20 || x0 > W + 20 || y0 > H + 20;
  }

  // Ballpoint line. prog reveals it along its length; boil re-jitters it on twos.
  function ink(s, o = {}) {
    const prog = o.prog == null ? 1 : o.prog;
    if (prog <= 0 || offscreen(s.box)) return;
    const w = o.w || 3.2, boil = o.boil != null ? o.boil : 0.55;
    const end = prog * s.L, v = frameVariant;
    ctx.strokeStyle = o.color || INK;
    ctx.globalAlpha = o.alpha == null ? 0.94 : o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const X = (i) => s.xs[i] + s.nx[i] * boil * noise(s.len[i] / 30 + v * 17.3, s.seed + 3);
    const Y = (i) => s.ys[i] + s.ny[i] * boil * noise(s.len[i] / 30 + v * 17.3, s.seed + 3);
    const CH = 7;
    for (let i = 0; i < s.N - 1 && s.len[i] < end; i += CH) {
      const mid = s.len[Math.min(s.N - 1, i + (CH >> 1))];
      // pressure: thicker in the middle of a stroke, slightly thinner at the ends
      const taper = Math.min(1, (mid + 4) / 14, (s.L - mid + 4) / 14);
      ctx.lineWidth = w * (0.82 + 0.3 * noise(mid / 60, s.seed + 5)) * (0.55 + 0.45 * taper);
      ctx.beginPath(); ctx.moveTo(X(i), Y(i));
      let j = i + 1;
      for (; j <= Math.min(s.N - 1, i + CH); j++) {
        if (s.len[j] > end) {
          const k = (end - s.len[j - 1]) / (s.len[j] - s.len[j - 1] || 1);
          ctx.lineTo(lerp(X(j - 1), X(j), k), lerp(Y(j - 1), Y(j), k));
          break;
        }
        ctx.lineTo(X(j), Y(j));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const guide = (s, o = {}) => ink(s, Object.assign({ w: 1.3, color: GUIDE, alpha: 0.85, boil: 0.25 }, o));

  // A group of strokes revealed one after another, by total length.
  function group(list, opt = {}) {
    const g = list.map((p) => (p.xs ? p : stroke(p, opt)));
    g.L = g.reduce((a, s) => a + s.L, 0);
    return g;
  }
  function inkGroup(g, prog, o) {
    if (prog <= 0) return;
    let left = prog * g.L;
    for (const s of g) {
      if (left <= 0) break;
      ink(s, Object.assign({}, o, { prog: Math.min(1, left / s.L) }));
      left -= s.L;
    }
  }

  // ---------- crayon ----------
  const patterns = {};
  function crayonTile(color, variant) {
    const S = 220, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), r = rng(hashStr(color) + variant * 101);
    g.strokeStyle = color; g.lineCap = 'round';
    for (let i = 0; i < 1500; i++) {
      const x = r() * S, y = r() * S, a = -0.6 + (r() - 0.5) * 0.7, l = 5 + r() * 14;
      g.globalAlpha = 0.25 + r() * 0.45; g.lineWidth = 1.2 + r() * 2.6;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
      }
    }
    // paper tooth: knock little holes out of the wax
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) {
      g.globalAlpha = 0.5 + r() * 0.5;
      g.fillRect(r() * S, r() * S, 0.8 + r() * 1.6, 0.8 + r() * 1.2);
    }
    return c;
  }
  function hashStr(s) { let h = 7; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function pattern(color) {
    const v = frameVariant;
    const key = color + v;
    if (!patterns[key]) patterns[key] = ctx.createPattern(crayonTile(color, v), 'repeat');
    return patterns[key];
  }
  // Fill a polygon with crayon. prog sweeps the scribble in from one side.
  // The fill is nudged off the ink outline, the way crayon never quite meets the pen line.
  function crayon(poly, color, o = {}) {
    const prog = o.prog == null ? 1 : o.prog;
    if (prog <= 0) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (offscreen([x0 - 20, y0 - 20, x1 + 20, y1 + 20])) return;
    const dx = o.dx != null ? o.dx : 5, dy = o.dy != null ? o.dy : -3, seed = o.seed || 11;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 0.9 : o.alpha;
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const j = 2.2 * noise(i * 0.7 + frameVariant * 3, seed);
      i ? ctx.lineTo(x + dx + j, y + dy + j) : ctx.moveTo(x + dx + j, y + dy + j);
    });
    ctx.closePath();
    ctx.clip();
    if (prog < 1) {
      // ragged scribble front
      const fx = x0 + (x1 - x0 + 40) * prog;
      ctx.beginPath(); ctx.moveTo(x0 - 30, y0 - 30);
      for (let y = y0 - 30; y <= y1 + 30; y += 9) ctx.lineTo(fx + 14 * noise(y / 13, seed + 1), y);
      ctx.lineTo(x0 - 30, y1 + 30); ctx.closePath(); ctx.clip();
    }
    const pat = pattern(color);
    pat.setTransform(new DOMMatrix().translate(seed % 97, (seed * 7) % 89));
    ctx.fillStyle = pat;
    ctx.fillRect(x0 - 30, y0 - 30, x1 - x0 + 60, y1 - y0 + 60);
    ctx.restore();
  }
  const crayonEllipse = (cx, cy, rx, ry, color, o) => crayon(pts.ellipse(cx, cy, rx, ry, 0, 1), color, o);

  // Short parallel pen strokes inside a polygon (shading).
  function hatch(poly, o = {}) {
    const ang = o.angle != null ? o.angle : -1.0, gap = o.gap || 9, r = rng(o.seed || 5);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const ca = Math.cos(ang), sa = Math.sin(ang), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 5, out = [];
    for (let d = -R; d <= R; d += gap) {
      let run = null;
      for (let u = -R; u <= R; u += 2) {
        const x = cx + ca * u - sa * d, y = cy + sa * u + ca * d;
        if (inside(x, y)) { if (!run) run = [[x, y]]; else run[1] = [x, y]; }
        else if (run) { if (run[1]) out.push(run); run = null; }
      }
      if (run && run[1]) out.push(run);
    }
    // shorten randomly so it reads as hand hatching
    return out.map(([a, b]) => {
      const k0 = (o.ragged || 0.15) * r(), k1 = 1 - (o.ragged || 0.15) * r();
      return [[lerp(a[0], b[0], k0), lerp(a[1], b[1], k0)], [lerp(a[0], b[0], k1), lerp(a[1], b[1], k1)]];
    });
  }

  // ---------- handwriting ----------
  // Lay out text in a single-stroke font; returns a group revealed in writing order.
  function text(str, font, x, y, size, o = {}) {
    const F = window.FONTS[font], s = size / 1000, r = rng(o.seed || hashStr(str));
    let w = 0;
    for (const ch of str) w += (F[ch] || F[' '])[0] * s * (o.track || 1);
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const strokes = [];
    for (const ch of str) {
      const [adv, gl] = F[ch] || F[' '];
      const jy = (r() - 0.5) * size * 0.05, rot = (r() - 0.5) * 0.06;
      for (const g of gl) {
        const p = [];
        for (let i = 0; i < g.length; i += 2) {
          const gx = g[i] * s, gy = g[i + 1] * s;
          p.push([cx + gx * Math.cos(rot) - gy * Math.sin(rot), y + jy + gx * Math.sin(rot) + gy * Math.cos(rot)]);
        }
        strokes.push(stroke(p, { step: 2.5, wobble: o.wobble != null ? o.wobble : 0.5 }));
      }
      cx += adv * s * (o.track || 1);
    }
    const g = group(strokes);
    g.width = w;
    return g;
  }
  const write = (g, prog, o = {}) => inkGroup(g, prog, Object.assign({ w: o.w || 2.6, boil: 0.35 }, o));

  window.Pen = {
    INK, GUIDE, PAPER, hash, rng, noise, clamp, lerp, smooth, ease, seg,
    stroke, pts, group, begin, ink, guide, inkGroup, crayon, crayonEllipse, hatch, text, write,
    get ctx() { return ctx; }, get variant() { return frameVariant; },
  };
})();
