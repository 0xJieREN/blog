// Ten print and craft treatments. Each one re-makes a flat picture (ground + specimen in
// plain colours) as a hand medium by sampling its colours: tesserae, cross-stitch, halftone
// dots, engraved lines, gouges, gouache dabs, satin stitch, wing scales, stipple, screenprint.
// It runs twice per tile, once for the ground and once inside the butterfly, with different
// settings (finer inside, another direction), so the figure appears with no outline at all:
// Kevin's "one motif, two treatments".
(() => {
  const W = 1080, H = 1080, TAU = Math.PI * 2, PAPER = [242, 235, 219], INK = [26, 23, 20];
  const { rng } = window.Species;

  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const jit = (c, r, k) => { const d = (r() - 0.5) * k; return [c[0] + d, c[1] + d, c[2] + d]; };

  function sampler(data) {
    return (x, y) => {
      const xi = Math.min(W - 1, Math.max(0, x | 0)), yi = Math.min(H - 1, Math.max(0, y | 0)), o = (yi * W + xi) * 4;
      return [data[o], data[o + 1], data[o + 2]];
    };
  }
  // direction field: inside, out from the wing root like the veins; outside, a set angle with a slow wave
  function dirOf(I, inside, base) {
    return (x, y) => inside ? Math.atan2(y - I.T.cy, x - I.T.cx) : base + Math.sin(y * 0.006 + x * 0.002) * 0.25;
  }
  function dash(g, x, y, a, len, w, c) {
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
  }
  const filtered = (g, F, f) => { g.save(); g.filter = f; g.drawImage(F, 0, 0); g.restore(); };

  const CRAFTS = {
    // screenprint: flat inks, a key layer printed slightly off register, uneven ink density
    screen(g, I, inside, r) {
      g.drawImage(I.F, 0, 0);
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = inside ? 0.3 : 0.2;
      g.drawImage(I.F, inside ? -5 : 4, inside ? 4 : -3); g.restore();
      for (let i = 0; i < 140; i++) {           // ink mottle, faint
        const x = r() * W, y = r() * H, rr = 30 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, r() < 0.5 ? 'rgba(255,250,235,.06)' : 'rgba(20,15,10,.04)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      g.lineCap = 'round';                        // dry squeegee: the ink skips in short pale streaks
      for (let i = 0; i < (inside ? 9000 : 12000); i++) {
        const x = r() * W, y = r() * H, c = I.at(x, y);
        dash(g, x, y, inside ? -0.08 : 0.04, 4 + r() * 16, 0.8 + r() * 1.6, css(mix(c, PAPER, 0.55), 0.18 + r() * 0.3));
      }
      if (!inside) {                              // a fine line screen on the ground
        g.lineCap = 'butt';
        for (let k = -H; k < W; k += 7) { g.strokeStyle = 'rgba(30,20,10,.06)'; g.lineWidth = 2; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); }
      }
    },
    // linocut: flat colour, then the gouges: pale strokes carved out of every dark area
    lino(g, I, inside, r) {
      g.drawImage(I.F, 0, 0);
      const dir = dirOf(I, inside, 0), n = inside ? 16000 : 22000;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H, c = I.at(x, y), L = lum(c), a = dir(x, y) + (r() - 0.5) * 0.35;
        if (L < 120) dash(g, x, y, a, (inside ? 7 : 11) + r() * 10, 1.2 + r() * 1.8, css(mix(c, PAPER, 0.62), 0.8));
        else if (r() < 0.35) dash(g, x, y, a + 1.57, 3 + r() * 6, 1 + r(), css(mix(c, INK, 0.45), 0.55));
      }
    },
    // mosaic: small square tesserae in the sampled colour, grout between
    mosaic(g, I, inside, r) {
      filtered(g, I.F, 'brightness(0.55) saturate(0.7)');
      const s = inside ? 12 : 19, gap = inside ? 2 : 2.6;
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        const c = jit(I.at(x + s / 2, y + s / 2), r, 18), j = () => (r() - 0.5) * 2.2;
        g.fillStyle = css(c); g.beginPath();
        g.moveTo(x + gap / 2 + j(), y + gap / 2 + j()); g.lineTo(x + s - gap / 2 + j(), y + gap / 2 + j());
        g.lineTo(x + s - gap / 2 + j(), y + s - gap / 2 + j()); g.lineTo(x + gap / 2 + j(), y + s - gap / 2 + j()); g.closePath(); g.fill();
      }
    },
    // cross-stitch: linen ground left bare where it is plain, every cell of the figure stitched
    stitch(g, I, inside, r) {
      const bg = I.bg, s = inside ? 9 : 12;
      if (inside) filtered(g, I.F, 'brightness(0.62)');
      else {
        g.fillStyle = css(bg); g.fillRect(0, 0, W, H);
        for (let k = 0; k < W; k += 3) { g.fillStyle = css(mix(bg, INK, 0.06 + 0.04 * (k % 2))); g.fillRect(k, 0, 1, H); g.fillRect(0, k, W, 1); }
      }
      g.lineCap = 'round';
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        const c = I.at(x + s / 2, y + s / 2);
        if (!inside && Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]) < 30) continue;
        const cc = jit(c, r, 10), p = 1.4;
        g.strokeStyle = css(mix(cc, INK, 0.25)); g.lineWidth = s * 0.36;
        g.beginPath(); g.moveTo(x + p, y + p); g.lineTo(x + s - p, y + s - p); g.stroke();
        g.strokeStyle = css(cc); g.lineWidth = s * 0.34;
        g.beginPath(); g.moveTo(x + s - p, y + p); g.lineTo(x + p, y + s - p); g.stroke();
        g.strokeStyle = css(mix(cc, [255, 255, 255], 0.35), 0.6); g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x + s - p - 1, y + p + 1); g.lineTo(x + p + 1, y + s - p - 1); g.stroke();
      }
    },
    // halftone / riso: a pale tint of each colour, dots of the full colour sized by its darkness
    halftone(g, I, inside, r) {
      filtered(g, I.F, 'brightness(1.18) saturate(0.85)');
      const s = inside ? 8 : 12, a = inside ? 0.26 : 0.79, ca = Math.cos(a), sa = Math.sin(a);
      for (let v = -780; v < 780; v += s) for (let u = -780; u < 780; u += s) {
        const x = 540 + u * ca - v * sa, y = 540 + u * sa + v * ca;
        if (x < -s || y < -s || x > W + s || y > H + s) continue;
        const c = I.at(x, y), d = 1 - lum(c) / 255, rr = s * 0.5 * Math.sqrt(0.18 + 0.95 * d) * 1.1;
        g.fillStyle = css(mix(c, INK, 0.12 + 0.2 * d)); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      }
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.16; g.drawImage(g.canvas, 3, -2); g.restore();
    },
    // engraving: parallel lines that swell where the picture is dark; rings around the body inside
    engrave(g, I, inside, r) {
      g.fillStyle = css(PAPER); g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.35; g.drawImage(I.F, 0, 0); g.restore();
      const gap = inside ? 5 : 7, step = 3; g.lineCap = 'round';
      const seg = (x0, y0, x1, y1) => {
        const c = I.at((x0 + x1) / 2, (y0 + y1) / 2), d = Math.pow(1 - lum(c) / 255, 0.85);
        g.strokeStyle = css(mix(c, INK, 0.35)); g.lineWidth = 0.35 + gap * 1.12 * d;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      };
      if (inside) {
        for (let rad = gap; rad < 760; rad += gap) {
          const n = Math.ceil(TAU * rad / step);
          for (let i = 0; i < n; i++) {
            const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, wv = Math.sin(a0 * 6) * 2;
            seg(I.T.cx + Math.cos(a0) * (rad + wv), I.T.cy + Math.sin(a0) * (rad + wv) * 0.85, I.T.cx + Math.cos(a1) * (rad + wv), I.T.cy + Math.sin(a1) * (rad + wv) * 0.85);
          }
        }
      } else {
        for (let y = -10; y < H + 10; y += gap) for (let x = 0; x < W; x += step) {
          const w0 = Math.sin(x * 0.01 + y * 0.003) * 3, w1 = Math.sin((x + step) * 0.01 + y * 0.003) * 3;
          seg(x, y + w0, x + step, y + w1);
        }
      }
    },
    // gouache: overlapping opaque dabs
    dabs(g, I, inside, r) {
      g.drawImage(I.F, 0, 0);
      const dir = dirOf(I, inside, -0.6), n = inside ? 26000 : 36000;
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H, c = jit(I.at(x, y), r, 22), a = dir(x, y) + (r() - 0.5) * 0.6;
        const rx = inside ? 4 + r() * 4 : 7 + r() * 6;
        g.fillStyle = css(c, 0.85); g.beginPath(); g.ellipse(x, y, rx, rx * 0.42, a, 0, TAU); g.fill();
      }
    },
    // satin stitch: long parallel threads with a sheen along each
    satin(g, I, inside, r) {
      filtered(g, I.F, 'brightness(0.85)');
      const dir = dirOf(I, inside, 0.02), n = inside ? 30000 : 34000;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H, c = jit(I.at(x, y), r, 14), a = dir(x, y) + (r() - 0.5) * 0.08;
        const len = inside ? 12 + r() * 14 : 20 + r() * 22, w = inside ? 2.4 : 3.2;
        dash(g, x, y, a, len, w, css(c, 0.95));
        dash(g, x + Math.cos(a + 1.57) * 0.6, y + Math.sin(a + 1.57) * 0.6, a, len * 0.8, 0.8, css(mix(c, [255, 255, 255], 0.35), 0.35));
      }
    },
    // wing scales: overlapping rounded scales, row over row, like a real wing under a lens
    scales(g, I, inside, r) {
      filtered(g, I.F, 'brightness(0.7)');
      const s = inside ? 11 : 20;
      for (let y = -s, row = 0; y < H + s; y += s * 0.5, row++) for (let x = -s + (row % 2) * s / 2; x < W + s; x += s) {
        const c = jit(I.at(x, y + s * 0.3), r, 16);
        g.fillStyle = css(c); g.strokeStyle = css(mix(c, INK, 0.4)); g.lineWidth = 1;
        g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.5, y + s * 0.2); g.arc(x, y + s * 0.2, s * 0.5, Math.PI, 0, true); g.lineTo(x + s * 0.5, y); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = css(mix(c, [255, 255, 255], 0.25), 0.35);
        g.beginPath(); g.moveTo(x - s * 0.2, y + s * 0.1); g.lineTo(x - s * 0.2, y + s * 0.4); g.stroke();
      }
    },
    // stipple: dots, more of them where the picture is darker
    stipple(g, I, inside, r) {
      const n = inside ? 160000 : 300000;
      g.fillStyle = css(mix(PAPER, I.at(540, 540), 0.0)); g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.5; filtered(g, I.F, 'brightness(1.25) saturate(0.7)'); g.restore();
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H, c = I.at(x, y), d = 1 - lum(c) / 255;
        if (r() > 0.12 + 0.95 * d * d + 0.25 * d) continue;
        const s = (inside ? 1.6 : 2.1) + r() * 1.4;
        g.fillStyle = css(mix(c, INK, 0.18)); g.fillRect(x, y, s, s);
      }
    },
  };

  // Clip a drawing to the figure (inside) or the ground, with the mask's soft edge.
  function pass(ctx, mask, inside, fn) {
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const g = t.getContext('2d'); fn(g);
    g.globalCompositeOperation = inside ? 'destination-in' : 'destination-out'; g.drawImage(mask, 0, 0);
    ctx.drawImage(t, 0, 0);
  }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  // One finished tile: ground and specimen flat, then the craft over each.
  // neg: the negative print, pale specimen on its ground turned dark (same hues, values inverted).
  const NEG_FILTER = 'invert(1) hue-rotate(180deg) saturate(0.85)';
  function tile(ctx, sp, v, craft, seed, neg = false) {
    const T = window.Species.layout(sp), mask = window.Species.mask(sp);
    const F = document.createElement('canvas'); F.width = W; F.height = H;
    const fg = F.getContext('2d');
    let bg = hex(sp.grounds[v].bg);
    if (neg) {
      const G = document.createElement('canvas'); G.width = W; G.height = H;
      window.Grounds.draw(G.getContext('2d'), sp, v, T);
      fg.filter = NEG_FILTER; fg.drawImage(G, 0, 0); fg.filter = 'none';
      const one = document.createElement('canvas'); one.width = one.height = 1;
      const og = one.getContext('2d'); og.filter = NEG_FILTER; og.fillStyle = sp.grounds[v].bg; og.fillRect(0, 0, 1, 1);
      const px = document.createElement('canvas'); px.width = px.height = 1; const pg = px.getContext('2d'); pg.drawImage(one, 0, 0);
      bg = [...pg.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    } else window.Grounds.draw(fg, sp, v, T);
    window.Species.flat(fg, sp, neg);
    const I = { F, T, at: sampler(fg.getImageData(0, 0, W, H).data), bg };
    pass(ctx, mask, false, (g) => CRAFTS[craft](g, I, false, rng(seed)));
    pass(ctx, mask, true, (g) => CRAFTS[craft](g, I, true, rng(seed + 1)));
  }

  window.Crafts = { CRAFTS, tile, mix, css, lum };
})();
