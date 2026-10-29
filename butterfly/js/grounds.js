// The ground behind each butterfly: built from that butterfly's own wing motif and colours,
// in the opposite value (dark specimen -> pale ground, pale specimen -> dark ground), so figure
// and ground read as two halves of one print. Drawn flat here; the craft pass turns it into
// stitches, dots, gouges, tesserae...
(() => {
  const W = 1080, H = 1080, TAU = Math.PI * 2;
  const { rng } = window.Species;

  function blob(g, x, y, rx, ry, a, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), a, 0, TAU); g.fill(); }
  function rrect(g, x, y, w, h, r, a, c) {
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, r); g.fill(); g.restore();
  }
  // a hand-wobbly closed shape from a function of angle
  function organic(g, x, y, s, a, c, r, k = 0.25) {
    const ph = r() * 9, pts = [];
    for (let i = 0; i < 24; i++) { const t = i / 24 * TAU, rr = s * (1 + k * Math.sin(t * 3 + ph) * 0.6 + k * Math.sin(t * 5 + ph * 2) * 0.4); pts.push([x + Math.cos(t + a) * rr * 1.3, y + Math.sin(t + a) * rr * 0.8]); }
    g.fillStyle = c; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill();
  }

  // ---------- one element of each species' motif, centred at (x, y), size s ----------
  const MOTIF = {
    windows(g, x, y, s, a, P) {            // the wasp moth's yellow windows, three bars and a teal dot
      for (let k = -1; k <= 1; k++) rrect(g, x + Math.cos(a + 1.57) * k * s * 0.2, y + Math.sin(a + 1.57) * k * s * 0.2, s * 0.62, s * 0.12, s * 0.06, a, P[0]);
      blob(g, x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.06, s * 0.06, 0, P[1]);
    },
    rings(g, x, y, s, a, P) { blob(g, x, y, s * 0.34, s * 0.3, a, P[2]); blob(g, x, y, s * 0.24, s * 0.2, a, P[0]); },
    scallops(g, x, y, s, a, P) {           // one scalloped wing-edge scale: olive with a crimson rim
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = P[1]; g.beginPath(); g.arc(0, 0, s * 0.52, 0, Math.PI); g.closePath(); g.fill();
      g.fillStyle = P[0]; g.beginPath(); g.arc(0, 0, s * 0.4, 0, Math.PI); g.closePath(); g.fill();
      g.restore();
    },
    blocks(g, x, y, s, a, P) { rrect(g, x, y, s * 0.7, s * 0.42, s * 0.2, a, P[0]); rrect(g, x + s * 0.5, y, s * 0.2, s * 0.24, s * 0.1, a, P[1]); },
    scales(g, x, y, s, a, P) { g.fillStyle = P[0]; g.beginPath(); g.arc(x, y, s * 0.5, 0, Math.PI); g.closePath(); g.fill(); },
    orange(g, x, y, s, a, P) {
      [[-0.2, -0.12], [0.12, -0.18], [0.0, 0.14]].forEach(([dx, dy], i) => rrect(g, x + dx * s, y + dy * s, s * 0.2, s * 0.15, s * 0.03, a + i * 0.2, P[0]));
      blob(g, x + s * 0.3, y + s * 0.2, s * 0.08, s * 0.08, 0, P[1]);
    },
    cells(g, x, y, s, a, P) {
      g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = P[0]; g.lineWidth = s * 0.05; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(s * 0.3, 0); g.lineTo(0, s * 0.45); g.lineTo(-s * 0.3, 0); g.closePath(); g.stroke();
      g.restore(); blob(g, x, y, s * 0.06, s * 0.06, 0, P[1]);
    },
    eyes(g, x, y, s, a, P) { blob(g, x, y, s * 0.36, s * 0.3, a, P[0]); blob(g, x, y, s * 0.2, s * 0.2, 0, P[1]); blob(g, x - s * 0.05, y - s * 0.05, s * 0.05, s * 0.05, 0, P[2]); },
    commas(g, x, y, s, a, P, r) {          // the lime swallowtail's cream commas
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = P[0]; g.beginPath();
      g.arc(0, 0, s * 0.22, -0.3, Math.PI + 0.9); g.quadraticCurveTo(-s * 0.35, s * 0.4, s * 0.1, s * 0.5); g.quadraticCurveTo(-s * 0.05, s * 0.2, s * 0.21, 0); g.fill();
      g.restore(); blob(g, x + s * 0.35, y - s * 0.3, s * 0.06, s * 0.06, 0, P[2]);
    },
    waves(g, x, y, s, a, P, r) { organic(g, x, y, s * 0.35, a, P[0], r, 0.4); organic(g, x + s * 0.25, y + s * 0.1, s * 0.15, a, P[1], r, 0.3); },
    bars(g, x, y, s, a, P) { rrect(g, x, y, s * 0.8, s * 0.22, s * 0.04, a - 0.7, P[0]); rrect(g, x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.08, s * 0.03, a - 0.7, P[1]); },
    lobes(g, x, y, s, a, P, r) { organic(g, x, y, s * 0.3, a, P[0], r, 0.3); blob(g, x + s * 0.06, y - s * 0.04, s * 0.06, s * 0.06, 0, P[1]); },
    patch(g, x, y, s, a, P, r) { organic(g, x - s * 0.1, y - s * 0.1, s * 0.25, a, P[0], r, 0.35); rrect(g, x + s * 0.12, y + s * 0.25, s * 0.5, s * 0.08, s * 0.04, a + 0.15, P[1]); },
    flecks(g, x, y, s, a, P, r) { organic(g, x, y, s * 0.22, a, P[0], r, 0.5); organic(g, x + s * 0.3, y - s * 0.2, s * 0.1, a, P[1], r, 0.5); },
  };

  // ---------- layouts ----------
  function cells(s, brick, fn) {
    let row = 0;
    for (let y = -s; y < H + s; y += s, row++) for (let x = -s + (brick && row % 2 ? s / 2 : 0); x < W + s; x += s) fn(x, y, row);
  }
  function draw(g, sp, v, T) {
    const G = sp.grounds[v], P = G.pal, s = G.size, r = rng(17 + v * 101 + sp.id.length * 7), m = MOTIF[sp.motif];
    g.fillStyle = G.bg; g.fillRect(0, 0, W, H);
    const L = G.layout;
    if (L === 'grid') cells(s, false, (x, y) => m(g, x + s / 2, y + s / 2, s * 0.9, 0, P, r));
    else if (L === 'brick') cells(s, true, (x, y, row) => m(g, x + s / 2, y + s / 2, s * 0.9, row % 2 ? Math.PI : 0, P, r));
    else if (L === 'diag') cells(s, true, (x, y, row) => m(g, x + s / 2, y + s / 2, s * 0.85, Math.PI / 4 + (row % 2) * Math.PI / 2, P, r));
    else if (L === 'scatter') cells(s, true, (x, y) => m(g, x + s / 2 + (r() - 0.5) * s * 0.5, y + s / 2 + (r() - 0.5) * s * 0.5, s * (0.75 + r() * 0.4), r() * TAU, P, r));
    else if (L === 'rows') cells(s, true, (x, y, row) => m(g, x + s / 2, y + s / 2, s * 0.95, 0, row % 3 === 2 ? [P[1], P[0], P[2]] : P, r));
    else if (L === 'bands') {
      let i = 0;
      for (let y = -s; y < H + s; y += s, i++) {
        g.fillStyle = P[i % P.length]; g.beginPath(); g.moveTo(-10, y);
        for (let x = -10; x <= W + 10; x += 30) g.lineTo(x, y + Math.sin(x * 0.011 + i) * 3);
        for (let x = W + 10; x >= -10; x -= 30) g.lineTo(x, y + s + Math.sin(x * 0.011 + i + 1) * 3);
        g.closePath(); g.fill();
      }
    } else if (L === 'chevrons') {
      for (let y = -s, i = 0; y < H + s; y += s, i++) {
        g.strokeStyle = P[i % 2]; g.lineWidth = s * (i % 2 ? 0.16 : 0.34); g.lineJoin = 'miter';
        g.beginPath(); for (let x = -s, k = 0; x <= W + s; x += s / 2, k++) g.lineTo(x, y + (k % 2 ? s * 0.3 : 0)); g.stroke();
      }
    } else if (L === 'checker') {
      cells(s, false, (x, y, row) => { if ((Math.round(x / s) + row) % 2) { g.fillStyle = P[0]; g.fillRect(x, y, s, s); } else if (r() < 0.3) blob(g, x + s / 2, y + s / 2, s * 0.12, s * 0.12, 0, P[2]); });
    } else if (L === 'scales') {
      for (let y = -s, row = 0; y < H + s; y += s * 0.55, row++) for (let x = -s + (row % 2) * s / 2; x < W + s; x += s) {
        g.fillStyle = (row + Math.round(x / s)) % 4 === 0 ? P[1] : P[0]; g.strokeStyle = P[1]; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, s * 0.5, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
      }
    } else if (L === 'lattice') {
      g.strokeStyle = P[0]; g.lineWidth = s * 0.07;
      for (let k = -H; k < W + H; k += s) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H * 0.7, H); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H * 0.7, H); g.stroke(); }
      for (let k = -H; k < W + H; k += s) for (let y = 0; y < H + s; y += s / 0.7 / 2) blob(g, k + y * 0.7 % s, y, s * 0.08, s * 0.08, 0, P[1]);
    } else if (L === 'rays') {             // the wing veins carried out across the sheet
      const n = s * 3;
      g.strokeStyle = P[0]; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU; g.lineWidth = 3 + (i % 3 === 0 ? 3 : 0);
        g.beginPath(); g.moveTo(T.cx, T.cy); g.lineTo(T.cx + Math.cos(a) * 1600, T.cy + Math.sin(a) * 1600); g.stroke();
      }
      g.strokeStyle = P[1]; g.lineWidth = 2;
      for (let rr = 120; rr < 1600; rr += 70) { g.beginPath(); g.arc(T.cx, T.cy, rr, 0, TAU); g.stroke(); }
    } else if (L === 'waves') {
      for (let y = -s, i = 0; y < H + s; y += s, i++) {
        g.strokeStyle = P[i % 2]; g.lineWidth = s * 0.42; g.lineCap = 'round';
        g.beginPath(); for (let x = -20; x <= W + 20; x += 10) g.lineTo(x, y + Math.sin(x * 0.012 + i * 1.3) * s * 0.35 + Math.sin(x * 0.031 + i) * s * 0.1); g.stroke();
      }
    }
  }

  window.Grounds = { draw, MOTIF };
})();
