// The fourteen butterflies and moths of Claude.mp4, each as a flat, front-on, symmetric
// specimen: wing outlines, wing pattern, body, and the motif and palettes its grounds are
// built from. Coordinates are for the right half, in units: x 0 (body axis) to ~1 (wing tip),
// y down, thorax near (0, -0.05). Everything is mirrored for the left half.
//
// Each species is normalised to the same area and the same visual centre, so the figure sits
// still through the cuts the way Kevin's silhouette does; only the shape of the wings changes.
(() => {
  const W = 1080, H = 1080;

  // ---------- geometry helpers ----------
  // Catmull-Rom through closed control points, sampled densely.
  function smooth(pts, n = 8) {
    const out = [], L = pts.length;
    for (let i = 0; i < L; i++) {
      const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    return out;
  }
  // A scalloped margin from a to b: n little arcs bulging by d (sign picks the side).
  function scallop(a, b, n, d) {
    const out = [], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    for (let k = 0; k < n; k++) for (let j = 0; j < 5; j++) {
      const t = (k + j / 5) / n, bump = Math.sin(Math.PI * j / 5) * d;
      out.push([a[0] + dx * t + nx * bump, a[1] + dy * t + ny * bump]);
    }
    return out;
  }
  const path = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s ^= s << 13, s ^= s >>> 17, s ^= s << 5) >>> 0) / 4294967296; }

  // ---------- the specimens ----------
  // pattern ops, drawn in order inside one wing:
  //   ['fill', c]  ['edge', c, w]  ['blob', x, y, rx, ry, rot, c]  ['strip', pts, w, c]
  //   ['poly', pts, c]  ['veins', c, w, from]  ['sheen', x, y, r, c]  ['eye', x, y, r, [outer, iris, light]]
  //   ['flecks', seed, n, [x0, y0, x1, y1], size, c]
  // body: head r, thorax [rx, ry], abdomen [length, half-width], colours, bands, antenna polyline.
  const SPECIES = [
    {
      id: 'wasp', name: 'wasp moth', note: 'black, long narrow wings with pale-yellow windows, banded red / teal abdomen',
      seen: '0.00-1.50 s (plate, centre, fig. 9); last frame 20.4 s', light: false,
      fw: [[0.05, -0.09], [0.25, -0.26], [0.5, -0.43], [0.78, -0.61], [0.93, -0.69], [1.0, -0.64], [0.97, -0.53], [0.8, -0.38], [0.55, -0.2], [0.3, -0.05], [0.08, 0.05]],
      hw: [[0.06, -0.01], [0.22, -0.05], [0.4, -0.01], [0.51, 0.12], [0.48, 0.27], [0.36, 0.36], [0.2, 0.34], [0.07, 0.22]],
      hwOps: [['fill', '#e3cc63'], ['sheen', 0.05, 0.05, 0.25, 'rgba(60,50,20,.25)'], ['edge', '#24231f', 0.075], ['veins', '#24231f', 0.012]],
      fwOps: [['fill', '#25241f'],
        ['strip', [[0.12, -0.12], [0.46, -0.34]], 0.06, '#ead566'], ['strip', [[0.14, -0.04], [0.5, -0.26]], 0.06, '#ead566'], ['strip', [[0.18, 0.02], [0.5, -0.17]], 0.045, '#e3cc5c'],
        ['strip', [[0.6, -0.49], [0.8, -0.62]], 0.05, '#ead566'], ['strip', [[0.62, -0.41], [0.84, -0.55]], 0.05, '#ead566'], ['strip', [[0.67, -0.34], [0.86, -0.47]], 0.04, '#e3cc5c'],
        ['blob', 0.53, -0.38, 0.03, 0.03, 0, '#4f9c8a']],
      body: { head: 0.055, thorax: [0.075, 0.11], abd: [0.66, 0.07], c: '#2a2622', thoraxC: '#c4442c', bands: ['#c4442c', '#222019', '#7fb3a0', '#222019', '#c4442c', '#222019', '#7fb3a0', '#222019', '#c4442c'], ant: [[0.02, -0.2], [0.09, -0.36], [0.17, -0.55], [0.22, -0.66]], antW: 0.014 },
      motif: 'windows',
      grounds: [
        { bg: '#f1e6c0', layout: 'brick', size: 120, pal: ['#dcc15a', '#b8d3c6', '#d98a72'] },
        { bg: '#f2e9d2', layout: 'bands', size: 46, pal: ['#e9a28c', '#f2e9d2', '#a9cfc2', '#f2e9d2', '#d8c07a', '#f2e9d2'] },
        { bg: '#f5edd6', layout: 'grid', size: 96, pal: ['#e3ca6a', '#9cc4b6', '#e19a82'] },
      ],
    },
    {
      id: 'burnet', name: 'burnet moth', note: 'crimson wings, black net around red spots, black body with red tip',
      seen: '0.00-1.50 s (plate, fig. 3); 14.70-16.00 s (in the "5", several copies)', light: false,
      fw: [[0.05, -0.08], [0.25, -0.31], [0.5, -0.51], [0.7, -0.63], [0.83, -0.63], [0.87, -0.53], [0.79, -0.41], [0.56, -0.21], [0.3, -0.03], [0.08, 0.06]],
      hw: [[0.06, -0.01], [0.3, -0.07], [0.55, -0.03], [0.67, 0.09], [0.61, 0.22], [0.41, 0.27], [0.18, 0.23], [0.07, 0.14]],
      hwOps: [['fill', '#d8392c'], ['edge', '#201a19', 0.045]],
      fwOps: [['fill', '#221b1b'],
        ['blob', 0.2, -0.1, 0.09, 0.06, -0.6, '#d63a2d'], ['blob', 0.25, -0.22, 0.06, 0.05, -0.6, '#d63a2d'],
        ['blob', 0.42, -0.24, 0.08, 0.06, -0.6, '#d63a2d'], ['blob', 0.46, -0.37, 0.06, 0.05, -0.6, '#d63a2d'],
        ['blob', 0.63, -0.41, 0.07, 0.055, -0.6, '#d63a2d'], ['blob', 0.7, -0.54, 0.06, 0.05, -0.6, '#d63a2d'], ['blob', 0.78, -0.5, 0.04, 0.035, 0, '#c7342a']],
      body: { head: 0.06, thorax: [0.08, 0.1], abd: [0.42, 0.075], c: '#1d1b1b', thoraxC: '#262224', bands: ['#1d1b1b', '#1d1b1b', '#1d1b1b', '#1d1b1b', '#c23a2c', '#c23a2c'], ant: [[0.02, -0.2], [0.1, -0.36], [0.2, -0.48]], antW: 0.022, club: 0.03 },
      motif: 'rings',
      grounds: [
        { bg: '#f3e4d8', layout: 'brick', size: 100, pal: ['#e8988a', '#f3e4d8', '#c97a6f'] },
        { bg: '#efe8dc', layout: 'diag', size: 80, pal: ['#e4867a', '#efe8dc', '#9b8b86'] },
        { bg: '#f6eee4', layout: 'scatter', size: 130, pal: ['#f0bdb2', '#f6eee4', '#dc9a8e'] },
      ],
    },
    {
      id: 'hawk', name: 'red-olive hawk moth', note: 'swept triangular wings with scalloped margins, olive with crimson costa and border, pink body',
      seen: '0.00-1.50 s (plate, fig. 1)', light: true,
      fw: [[0.06, -0.11], [0.3, -0.36], [0.55, -0.56], [0.78, -0.72], [0.9, -0.75], ...scallop([0.91, -0.73], [0.62, -0.08], 7, -0.025), [0.48, -0.0], [0.25, 0.04], [0.08, 0.05]],
      hw: [[0.07, 0.01], [0.3, 0.01], [0.5, 0.09], ...scallop([0.56, 0.16], [0.36, 0.33], 4, -0.02), [0.2, 0.32], [0.08, 0.2]],
      hwOps: [['fill', '#d8606a'], ['sheen', 0.06, 0.06, 0.32, 'rgba(120,110,50,.55)'], ['edge', '#a33a45', 0.03]],
      fwOps: [['fill', '#aa9b4c'], ['blob', 0.45, -0.3, 0.2, 0.08, -0.6, '#8a7e3c'], ['blob', 0.25, -0.12, 0.12, 0.05, -0.6, '#c4b46a'],
        ['strip', [[0.05, -0.12], [0.5, -0.47], [0.9, -0.74]], 0.06, '#c8404b'], ['edge', '#c8404b', 0.065], ['veins', 'rgba(90,80,40,.5)', 0.008]],
      body: { head: 0.065, thorax: [0.1, 0.13], abd: [0.55, 0.095], c: '#c84a52', thoraxC: '#c55058', bands: ['#c84a52', '#a8a058', '#c84a52', '#d66a70', '#c84a52', '#a8a058', '#c84a52'], ant: [[0.03, -0.22], [0.13, -0.33], [0.26, -0.4]], antW: 0.016, antC: '#e6c8b6' },
      motif: 'scallops',
      grounds: [
        { bg: '#1b1810', layout: 'rows', size: 70, pal: ['#3a3420', '#5c2329', '#1b1810'] },
        { bg: '#f3e9dc', layout: 'rows', size: 64, pal: ['#ead0bf', '#d88e94', '#f3e9dc'] },
        { bg: '#1f1a1b', layout: 'chevrons', size: 90, pal: ['#55222a', '#3d3a22', '#1f1a1b'] },
      ],
    },
    {
      id: 'greenband', name: 'green-banded swallowtail', note: 'long pointed black wings crossed by a row of green to teal blocks',
      seen: '0.00-1.50 s (plate, large, left); 14.70-16.60 s ("5" and flying)', light: false,
      fw: [[0.05, -0.08], [0.3, -0.3], [0.6, -0.52], [0.92, -0.72], [1.0, -0.7], [0.97, -0.58], [0.8, -0.4], [0.56, -0.17], [0.32, -0.0], [0.08, 0.05]],
      hw: [[0.06, -0.0], [0.35, -0.0], [0.58, 0.08], ...scallop([0.66, 0.19], [0.3, 0.56], 6, -0.022), [0.14, 0.5], [0.06, 0.3]],
      hwOps: [['fill', '#232725'], ['poly', [[0.05, 0.04], [0.3, 0.06], [0.5, 0.16], [0.45, 0.26], [0.25, 0.2], [0.06, 0.15]], '#57b7a6'], ['edge', '#1c1f1d', 0.03]],
      fwOps: [['fill', '#262a28'],
        ...[[0.14, -0.03, 0.07, '#5fb9aa'], [0.25, -0.12, 0.068, '#6cc0a6'], [0.36, -0.2, 0.064, '#7ec59a'], [0.47, -0.29, 0.058, '#8cc78a'], [0.58, -0.38, 0.052, '#97c97c'], [0.68, -0.46, 0.045, '#a2cc72'], [0.77, -0.53, 0.037, '#a9cf6a'], [0.85, -0.6, 0.028, '#afd06a']]
          .map(([x, y, r, c]) => ['blob', x, y, r * 1.25, r * 0.85, -0.65, c])],
      body: { head: 0.055, thorax: [0.075, 0.11], abd: [0.5, 0.06], c: '#262826', thoraxC: '#2e3431', bands: ['#262826', '#3a403c'], ant: [[0.02, -0.2], [0.1, -0.38], [0.18, -0.55]], antW: 0.013, club: 0.022 },
      motif: 'blocks',
      grounds: [
        { bg: '#e6f0e2', layout: 'rows', size: 70, pal: ['#a7d9bb', '#c1e2a6', '#e6f0e2'] },
        { bg: '#eef0e4', layout: 'diag', size: 90, pal: ['#93d0c3', '#bfe0a6', '#eef0e4'] },
        { bg: '#f2f4ea', layout: 'grid', size: 60, pal: ['#b6dfc6', '#cfe6b2', '#f2f4ea'] },
      ],
    },
    {
      id: 'blue', name: 'common blue', note: 'rounded powder-blue wings, darker veins, thin dark border and white fringe',
      seen: '0.50-1.50 s (plate, fig. 10); 14.70-16.80 s ("5" and flying)', light: true,
      fw: [[0.04, -0.06], [0.25, -0.31], [0.5, -0.51], [0.7, -0.61], [0.81, -0.57], [0.83, -0.4], [0.71, -0.12], [0.45, 0.03], [0.2, 0.05], [0.06, 0.04]],
      hw: [[0.05, 0.02], [0.3, 0.0], [0.55, 0.06], [0.7, 0.2], [0.67, 0.38], [0.48, 0.5], [0.25, 0.5], [0.1, 0.35]],
      hwOps: [['fill', '#6d9db4'], ['sheen', 0.05, 0.05, 0.4, 'rgba(60,95,120,.6)'], ['veins', '#4a7084', 0.01], ['edge', '#f1efe6', 0.022], ['edge', '#34495a', 0.012]],
      fwOps: [['fill', '#72a2b8'], ['sheen', 0.05, -0.05, 0.45, 'rgba(60,95,120,.6)'], ['veins', '#4a7084', 0.01], ['blob', 0.42, -0.24, 0.02, 0.035, -0.6, '#34495a'], ['edge', '#f1efe6', 0.022], ['edge', '#34495a', 0.012]],
      body: { head: 0.05, thorax: [0.065, 0.1], abd: [0.42, 0.05], c: '#3d4a52', thoraxC: '#5f8193', bands: ['#3d4a52', '#56707e'], ant: [[0.02, -0.18], [0.1, -0.36], [0.17, -0.52]], antW: 0.01, club: 0.02, antC: '#2a3238' },
      motif: 'scales',
      grounds: [
        { bg: '#0b151c', layout: 'scales', size: 46, pal: ['#15283a', '#24485c', '#0b151c'] },
        { bg: '#e7f0f3', layout: 'grid', size: 36, pal: ['#7fb4c9', '#e7f0f3', '#a9cdd9'] },
        { bg: '#0b141b', layout: 'scales', size: 70, pal: ['#1a3546', '#122634', '#0b141b'] },
      ],
    },
    {
      id: 'darkspot', name: 'dark day-flying moth', note: 'blue-black wings with a teal sheen, orange blocks and a red bar, scalloped hindwing, orange-tipped body',
      seen: '0.00-1.50 s (plate, fig. 24, top left); 14.70-15.80 s (bottom of the "5")', light: false,
      fw: [[0.05, -0.08], [0.3, -0.37], [0.6, -0.61], [0.82, -0.71], [0.93, -0.61], [0.89, -0.4], [0.74, -0.16], [0.5, 0.0], [0.25, 0.05], [0.07, 0.05]],
      hw: [[0.06, 0.02], [0.35, 0.0], [0.62, 0.1], ...scallop([0.72, 0.27], [0.32, 0.6], 7, -0.025), [0.14, 0.5], [0.06, 0.3]],
      hwOps: [['fill', '#1d2628'], ['sheen', 0.08, 0.08, 0.5, 'rgba(60,110,110,.55)'], ['edge', '#161c1d', 0.04], ['flecks', 7, 6, [0.35, 0.35, 0.6, 0.5], 0.018, '#e0a03c']],
      fwOps: [['fill', '#1f2a2b'], ['sheen', 0.05, -0.05, 0.45, 'rgba(55,100,95,.6)'],
        ['poly', [[0.38, -0.36], [0.5, -0.4], [0.56, -0.3], [0.5, -0.22], [0.4, -0.25]], '#c8362a'],
        ['blob', 0.64, -0.57, 0.04, 0.025, -0.5, '#e3a23c'], ['blob', 0.72, -0.53, 0.035, 0.024, -0.5, '#e3a23c'], ['blob', 0.69, -0.46, 0.03, 0.02, -0.5, '#e3a23c'], ['blob', 0.6, -0.48, 0.025, 0.018, -0.5, '#d88c34']],
      body: { head: 0.055, thorax: [0.08, 0.12], abd: [0.55, 0.075], c: '#2b2b28', thoraxC: '#2f3a38', bands: ['#2b2b28', '#4a4a42', '#2b2b28', '#4a4a42', '#2b2b28', '#4a4a42', '#e08a30'], ant: [[0.02, -0.2], [0.09, -0.38], [0.14, -0.55]], antW: 0.014 },
      motif: 'orange',
      grounds: [
        { bg: '#f3e6cf', layout: 'brick', size: 110, pal: ['#efb46a', '#e8887a', '#f3e6cf'] },
        { bg: '#efe8da', layout: 'bands', size: 54, pal: ['#a9c3bd', '#efe8da', '#efe8da', '#efbb7a', '#efe8da', '#efe8da'] },
        { bg: '#f6ecd8', layout: 'grid', size: 70, pal: ['#ecbb7c', '#e7a093', '#f6ecd8'] },
      ],
    },
    {
      id: 'clearwing', name: 'clearwing moth', note: 'narrow glassy grey wings with dark borders and veins, dark tip, metallic green body with a red band',
      seen: '0.00-1.50 s (plate, top centre); 14.70-16.80 s ("5" and flying)', light: true,
      fw: [[0.05, -0.08], [0.3, -0.34], [0.6, -0.57], [0.85, -0.69], [0.95, -0.63], [0.9, -0.48], [0.62, -0.26], [0.34, -0.05], [0.08, 0.05]],
      hw: [[0.06, -0.0], [0.3, -0.05], [0.55, -0.07], [0.69, -0.01], [0.63, 0.11], [0.38, 0.18], [0.12, 0.17]],
      hwOps: [['fill', '#dddad0'], ['veins', '#55554d', 0.008], ['edge', '#4a3a28', 0.022]],
      fwOps: [['fill', '#e2ded3'], ['veins', '#55554d', 0.008], ['blob', 0.87, -0.63, 0.1, 0.07, -0.5, '#4a3826'], ['blob', 0.74, -0.56, 0.05, 0.03, -0.5, '#efe1b4'],
        ['strip', [[0.5, -0.44], [0.55, -0.33]], 0.03, '#4a3826'], ['edge', '#4a3a28', 0.025]],
      body: { head: 0.05, thorax: [0.065, 0.1], abd: [0.4, 0.055], c: '#3e8a4e', thoraxC: '#2f6f3f', bands: ['#3e8a4e', '#357a44', '#c43a2a', '#3e8a4e', '#357a44', '#3e8a4e'], ant: [[0.02, -0.18], [0.07, -0.34], [0.1, -0.5]], antW: 0.012, antC: '#2b2e28' },
      motif: 'cells',
      grounds: [
        { bg: '#0f1a17', layout: 'lattice', size: 80, pal: ['#22382f', '#1f4a36', '#0f1a17'] },
        { bg: '#111a16', layout: 'rays', size: 24, pal: ['#24362c', '#2a2440', '#111a16'] },
        { bg: '#0f1412', layout: 'lattice', size: 120, pal: ['#203a36', '#4a2222', '#0f1412'] },
      ],
    },
    {
      id: 'glasswing', name: 'pale eyed satyr', note: 'translucent cream wings with tan veins, hindwing flushed red at the edge with a dark eyespot',
      seen: '0.70-1.50 s (plate, right edge); 14.70-17.60 s ("5" and flying)', light: true,
      fw: [[0.05, -0.07], [0.25, -0.37], [0.5, -0.59], [0.68, -0.67], [0.79, -0.61], [0.81, -0.42], [0.71, -0.18], [0.45, -0.02], [0.2, 0.04], [0.06, 0.04]],
      hw: [[0.05, 0.02], [0.35, 0.0], [0.62, 0.06], [0.82, 0.18], [0.86, 0.34], [0.71, 0.5], [0.45, 0.6], [0.22, 0.55], [0.08, 0.35]],
      hwOps: [['fill', '#ecdfc6'], ['veins', '#b39a74', 0.01], ['poly', [[0.2, 0.62], [0.35, 0.4], [0.6, 0.32], [0.86, 0.24], [0.95, 0.4], [0.7, 0.6], [0.4, 0.7]], '#d8615a'],
        ['poly', [[0.3, 0.52], [0.5, 0.4], [0.75, 0.33], [0.8, 0.42], [0.55, 0.52]], '#e48a72'], ['eye', 0.62, 0.43, 0.075, ['#1d1a1a', '#5a6f80', '#f4efe6']], ['edge', '#a87a5a', 0.012]],
      fwOps: [['fill', '#eee3cc'], ['veins', '#b39a74', 0.01], ['strip', [[0.62, -0.62], [0.8, -0.4], [0.72, -0.2]], 0.012, '#b39a74'], ['edge', '#a88d68', 0.012]],
      body: { head: 0.045, thorax: [0.06, 0.1], abd: [0.42, 0.045], c: '#8d7650', thoraxC: '#7a6444', bands: ['#8d7650', '#a68c62'], ant: [[0.02, -0.17], [0.1, -0.34], [0.16, -0.48]], antW: 0.009, club: 0.016 },
      motif: 'eyes',
      grounds: [
        { bg: '#2c1d1d', layout: 'brick', size: 110, pal: ['#4a2a2a', '#3a4a5a', '#2c1d1d'] },
        { bg: '#1e2226', layout: 'scatter', size: 150, pal: ['#4d2628', '#34404d', '#1e2226'] },
        { bg: '#251a17', layout: 'rays', size: 18, pal: ['#4a3826', '#5a2a26', '#251a17'] },
      ],
    },
    {
      id: 'lime', name: 'lime swallowtail', note: 'black wings chequered with cream-yellow spots and bands, red and blue eyespots on the hindwing',
      seen: '1.20-1.50 s (plate, bottom right corner); 14.70-16.60 s (largest in the "5")', light: false,
      fw: [[0.05, -0.08], [0.3, -0.41], [0.55, -0.61], [0.8, -0.71], [0.93, -0.63], [0.9, -0.42], [0.76, -0.16], [0.52, 0.0], [0.25, 0.05], [0.07, 0.05]],
      hw: [[0.06, 0.02], [0.35, 0.02], [0.6, 0.12], ...scallop([0.72, 0.3], [0.36, 0.66], 7, -0.025), [0.18, 0.6], [0.08, 0.38]],
      hwOps: [['fill', '#23221e'], ['poly', [[0.07, 0.08], [0.35, 0.08], [0.6, 0.18], [0.62, 0.3], [0.45, 0.33], [0.25, 0.3], [0.08, 0.24]], '#ece0a0'],
        ['flecks', 3, 7, [0.25, 0.45, 0.62, 0.55], 0.026, '#ece0a0'], ['eye', 0.21, 0.5, 0.055, ['#d4552c', '#23221e', '#5a7fb0']], ['blob', 0.48, 0.4, 0.04, 0.03, 0, '#5a7fb0']],
      fwOps: [['fill', '#262520'],
        ...[[0.2, -0.04, 0.06], [0.3, -0.12, 0.055], [0.4, -0.2, 0.05], [0.5, -0.28, 0.05], [0.58, -0.36, 0.045], [0.66, -0.44, 0.04], [0.73, -0.52, 0.035]].map(([x, y, r]) => ['blob', x, y, r * 1.2, r * 0.8, -0.65, '#efe3a2']),
        ['flecks', 11, 14, [0.12, -0.35, 0.45, -0.12], 0.022, '#e6d68e'], ['flecks', 12, 9, [0.65, -0.62, 0.85, -0.3], 0.02, '#efe3a2']],
      body: { head: 0.055, thorax: [0.075, 0.11], abd: [0.5, 0.06], c: '#2a2822', thoraxC: '#3a372c', bands: ['#2a2822', '#cfc38a', '#2a2822'], ant: [[0.02, -0.2], [0.1, -0.38], [0.18, -0.52]], antW: 0.012, club: 0.022 },
      motif: 'commas',
      grounds: [
        { bg: '#f3edd0', layout: 'scatter', size: 90, pal: ['#e0cb76', '#f3edd0', '#e7a07a'] },
        { bg: '#f5efd9', layout: 'checker', size: 54, pal: ['#e8d898', '#f5efd9', '#e9b48e'] },
        { bg: '#efe7c8', layout: 'rows', size: 60, pal: ['#d9c26c', '#e7a07a', '#efe7c8'] },
      ],
    },
    {
      id: 'oleander', name: 'oleander hawk moth', note: 'narrow swept-back moss-green wings with wavy pink-cream bands, long banded body',
      seen: '14.70-15.80 s (top of the "5")', light: false,
      fw: [[0.06, -0.11], [0.3, -0.31], [0.6, -0.53], [0.88, -0.71], [0.98, -0.71], [0.95, -0.6], [0.78, -0.4], [0.55, -0.15], [0.3, 0.02], [0.08, 0.06]],
      hw: [[0.07, 0.02], [0.25, 0.0], [0.42, 0.06], [0.48, 0.16], [0.4, 0.25], [0.22, 0.25], [0.08, 0.17]],
      hwOps: [['fill', '#4a5a34'], ['strip', [[0.12, 0.2], [0.3, 0.2], [0.44, 0.14]], 0.03, '#cdbf98'], ['edge', '#3a462a', 0.02]],
      fwOps: [['fill', '#677f4a'], ['blob', 0.4, -0.18, 0.14, 0.07, -0.6, '#3f5a33'], ['blob', 0.72, -0.5, 0.12, 0.06, -0.6, '#3f5a33'],
        ['strip', [[0.18, -0.24], [0.26, -0.12], [0.36, 0.0]], 0.03, '#e2c9b4'], ['strip', [[0.5, -0.47], [0.56, -0.32], [0.66, -0.22]], 0.03, '#e2c9b4'],
        ['strip', [[0.12, -0.09], [0.5, -0.36], [0.92, -0.67]], 0.015, '#efdccd'], ['blob', 0.86, -0.66, 0.06, 0.03, -0.6, '#8a5e6a'], ['edge', '#4e6338', 0.02]],
      body: { head: 0.06, thorax: [0.09, 0.13], abd: [0.68, 0.08], c: '#5f7a46', thoraxC: '#55703f', bands: ['#5f7a46', '#d9c8a8', '#5f7a46', '#4a6236', '#5f7a46', '#d9c8a8', '#5f7a46'], ant: [[0.03, -0.22], [0.1, -0.32], [0.2, -0.38]], antW: 0.014, antC: '#d9c8a8' },
      motif: 'waves',
      grounds: [
        { bg: '#e9efdc', layout: 'waves', size: 40, pal: ['#c4d4ab', '#ecd6c9', '#e9efdc'] },
        { bg: '#f1ebe0', layout: 'waves', size: 70, pal: ['#b9cb9e', '#f1ebe0', '#e6cfc0'] },
        { bg: '#e3ead6', layout: 'scatter', size: 120, pal: ['#c3d3a8', '#d9c7b8', '#e3ead6'] },
      ],
    },
    {
      id: 'redslate', name: 'red-banded slate', note: 'slate-black wings with a blue sheen and broad crimson bands',
      seen: '14.70-16.30 s (top right of the "5", then flies into the lens)', light: false,
      fw: [[0.05, -0.08], [0.3, -0.41], [0.58, -0.65], [0.8, -0.75], [0.91, -0.67], [0.87, -0.42], [0.72, -0.14], [0.5, 0.02], [0.25, 0.05], [0.07, 0.05]],
      hw: [[0.06, 0.02], [0.38, 0.0], [0.66, 0.12], [0.79, 0.3], [0.71, 0.5], [0.48, 0.61], [0.25, 0.57], [0.1, 0.38]],
      hwOps: [['fill', '#363b3f'], ['sheen', 0.06, 0.06, 0.45, 'rgba(70,110,125,.6)'], ['poly', [[0.08, 0.14], [0.4, 0.14], [0.72, 0.3], [0.7, 0.42], [0.38, 0.32], [0.1, 0.3]], '#c4302a'], ['edge', '#2a2e31', 0.035]],
      fwOps: [['fill', '#3a3f43'], ['sheen', 0.05, -0.05, 0.4, 'rgba(70,110,125,.6)'],
        ['poly', [[0.26, -0.36], [0.44, -0.5], [0.58, -0.28], [0.5, 0.0], [0.34, 0.03], [0.4, -0.18]], '#c8302a'],
        ['poly', [[0.64, -0.64], [0.74, -0.68], [0.8, -0.5], [0.72, -0.45]], '#c8302a'], ['edge', '#2c3034', 0.03]],
      body: { head: 0.055, thorax: [0.08, 0.12], abd: [0.5, 0.065], c: '#3a3530', thoraxC: '#4a4038', bands: ['#3a3530', '#5a4a3c'], ant: [[0.02, -0.2], [0.1, -0.38], [0.17, -0.55]], antW: 0.012, club: 0.02 },
      motif: 'bars',
      grounds: [
        { bg: '#f1e4de', layout: 'chevrons', size: 90, pal: ['#e79c90', '#c4ccd0', '#f1e4de'] },
        { bg: '#eae6e2', layout: 'diag', size: 100, pal: ['#e6a79c', '#b6c4ca', '#eae6e2'] },
        { bg: '#f3ebe3', layout: 'bands', size: 60, pal: ['#e3958a', '#f3ebe3', '#f3ebe3', '#bfc9ce', '#f3ebe3', '#f3ebe3'] },
      ],
    },
    {
      id: 'sulphur', name: 'dogface sulphur', note: 'lemon-yellow wings, black forewing border notched in a "dog face", orange hindwing spot',
      seen: '14.70-17.30 s ("5" and flying, several copies)', light: true,
      fw: [[0.05, -0.07], [0.3, -0.39], [0.55, -0.59], [0.75, -0.67], [0.81, -0.58], [0.79, -0.38], [0.68, -0.14], [0.45, 0.0], [0.2, 0.04], [0.06, 0.04]],
      hw: [[0.05, 0.02], [0.35, 0.0], [0.6, 0.1], [0.72, 0.26], [0.65, 0.46], [0.42, 0.55], [0.2, 0.5], [0.08, 0.32]],
      hwOps: [['fill', '#eec634'], ['sheen', 0.05, 0.05, 0.35, 'rgba(200,140,30,.35)'], ['blob', 0.38, 0.24, 0.045, 0.035, 0, '#e0892e'], ['edge', '#5a4a26', 0.02]],
      fwOps: [['fill', '#f0ca38'],
        ['poly', [[0.4, -0.62], [0.82, -0.7], [0.86, -0.3], [0.66, -0.06], [0.55, -0.12], [0.62, -0.26], [0.52, -0.3], [0.56, -0.42], [0.46, -0.48]], '#4d3f22'],
        ['blob', 0.62, -0.38, 0.04, 0.05, -0.4, '#f0ca38'], ['blob', 0.36, -0.28, 0.035, 0.035, 0, '#4d3f22']],
      body: { head: 0.05, thorax: [0.065, 0.1], abd: [0.44, 0.05], c: '#4a4632', thoraxC: '#5a5638', bands: ['#4a4632', '#d8b84a'], ant: [[0.02, -0.18], [0.09, -0.34], [0.15, -0.5]], antW: 0.01, club: 0.018, antC: '#c7586a' },
      motif: 'lobes',
      grounds: [
        { bg: '#181a30', layout: 'brick', size: 100, pal: ['#262a4c', '#3a2f55', '#181a30'] },
        { bg: '#1a2030', layout: 'grid', size: 50, pal: ['#2b3552', '#1a2030', '#3a3360'] },
        { bg: '#17182a', layout: 'diag', size: 70, pal: ['#2a2c4e', '#33305a', '#17182a'] },
      ],
    },
    {
      id: 'heliconius', name: 'postman longwing', note: 'long black wings, a scarlet forewing patch, a yellow hindwing bar',
      seen: '14.70-16.00 s (middle and bottom of the "5", two copies)', light: false,
      fw: [[0.05, -0.07], [0.25, -0.33], [0.5, -0.53], [0.72, -0.63], [0.87, -0.59], [0.89, -0.45], [0.75, -0.26], [0.5, -0.08], [0.25, 0.03], [0.06, 0.04]],
      hw: [[0.05, 0.02], [0.3, 0.0], [0.55, 0.06], [0.68, 0.18], [0.62, 0.32], [0.42, 0.38], [0.2, 0.34], [0.07, 0.2]],
      hwOps: [['fill', '#1f1e1c'], ['strip', [[0.1, 0.08], [0.3, 0.1], [0.5, 0.16], [0.6, 0.2]], 0.045, '#e5d043'], ['edge', '#1a1918', 0.02]],
      fwOps: [['fill', '#211f1d'], ['poly', [[0.42, -0.44], [0.58, -0.56], [0.72, -0.52], [0.74, -0.38], [0.62, -0.3], [0.48, -0.28], [0.44, -0.36]], '#d32a2a'],
        ['blob', 0.66, -0.56, 0.03, 0.025, 0, '#d32a2a'], ['strip', [[0.08, -0.03], [0.22, -0.12], [0.36, -0.2]], 0.014, '#e5d043']],
      body: { head: 0.05, thorax: [0.065, 0.1], abd: [0.48, 0.05], c: '#262522', thoraxC: '#2e2c28', bands: ['#262522', '#e5d043', '#262522', '#262522'], ant: [[0.02, -0.18], [0.11, -0.38], [0.2, -0.56]], antW: 0.011, club: 0.02 },
      motif: 'patch',
      grounds: [
        { bg: '#f4ece0', layout: 'brick', size: 120, pal: ['#eb9a90', '#efdc8a', '#f4ece0'] },
        { bg: '#efe9d8', layout: 'bands', size: 44, pal: ['#eadb94', '#efe9d8', '#efe9d8', '#ebaba1', '#efe9d8', '#efe9d8'] },
        { bg: '#f6efe4', layout: 'scatter', size: 100, pal: ['#eeaaa0', '#efdf98', '#f6efe4'] },
      ],
    },
    {
      id: 'creamfleck', name: 'small cream-flecked swallowtail', note: 'small; olive-black wings marbled with cream, short tails',
      seen: '14.70-16.00 s (small, lower left of the "5", partly hidden)', light: false,
      fw: [[0.05, -0.08], [0.3, -0.39], [0.58, -0.61], [0.84, -0.71], [0.93, -0.63], [0.87, -0.42], [0.7, -0.18], [0.48, -0.02], [0.22, 0.04], [0.07, 0.05]],
      hw: [[0.06, 0.02], [0.35, 0.02], [0.55, 0.12], [0.63, 0.3], [0.54, 0.47], [0.47, 0.52], [0.46, 0.76], [0.4, 0.79], [0.37, 0.56], [0.24, 0.56], [0.1, 0.42]],
      hwOps: [['fill', '#2e2c22'], ['poly', [[0.07, 0.07], [0.35, 0.08], [0.5, 0.16], [0.42, 0.26], [0.2, 0.24], [0.08, 0.18]], '#e3dba8'], ['flecks', 21, 10, [0.15, 0.3, 0.55, 0.5], 0.03, '#d9cf98']],
      fwOps: [['fill', '#2e2c22'], ['flecks', 22, 26, [0.1, -0.6, 0.85, -0.05], 0.034, '#e3dba8'], ['strip', [[0.1, -0.06], [0.45, -0.3], [0.8, -0.6]], 0.02, '#d9cf98']],
      body: { head: 0.05, thorax: [0.07, 0.1], abd: [0.46, 0.055], c: '#2e2c22', thoraxC: '#3a372a', bands: ['#2e2c22', '#a8a07a'], ant: [[0.02, -0.18], [0.1, -0.35], [0.17, -0.5]], antW: 0.011, club: 0.02 },
      motif: 'flecks',
      grounds: [
        { bg: '#efe8d0', layout: 'scatter', size: 70, pal: ['#d8cf9e', '#c8c39a', '#efe8d0'] },
        { bg: '#f2edd8', layout: 'bands', size: 36, pal: ['#d6d0a8', '#f2edd8', '#f2edd8', '#f2edd8'] },
        { bg: '#ece4c6', layout: 'grid', size: 64, pal: ['#d4ca96', '#ece4c6', '#c9c09a'] },
      ],
    },
  ];

  // ---------- drawing one specimen ----------
  // The negative print (Kevin's value swap): dark wing colour becomes pale paper, pale markings
  // become ink, the bright accents stay. A dark specimen can then stand on a dark ground.
  let NEG = false;
  const NEG_LIGHT = '#eee5cf', NEG_DARK = '#25221d';
  function C(c) {
    if (!NEG || c[0] !== '#') return c;
    const n = parseInt(c.slice(1), 16), L = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return L < 80 ? NEG_LIGHT : L > 175 ? NEG_DARK : c;
  }
  function wingOps(ctx, pts, ops, sp) {
    const p = path(smooth(pts));
    ctx.save(); ctx.clip(p);
    for (const op of ops) {
      const [k] = op;
      if (NEG && k === 'sheen') continue;
      if (k === 'fill') { ctx.fillStyle = C(op[1]); ctx.fill(p); }
      else if (k === 'edge') { ctx.strokeStyle = C(op[1]); ctx.lineWidth = op[2] * 2; ctx.lineJoin = 'round'; ctx.stroke(p); }
      else if (k === 'blob') { ctx.fillStyle = C(op[6]); ctx.beginPath(); ctx.ellipse(op[1], op[2], op[3], op[4], op[5], 0, 7); ctx.fill(); }
      else if (k === 'strip') { ctx.strokeStyle = C(op[3]); ctx.lineWidth = op[2]; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); op[1].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      else if (k === 'poly') { ctx.fillStyle = C(op[2]); ctx.fill(path(smooth(op[1], 6))); }
      else if (k === 'sheen') { const g = ctx.createRadialGradient(op[1], op[2], 0, op[1], op[2], op[3]); g.addColorStop(0, op[4]); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill(p); }
      else if (k === 'eye') { const [x, y, r, c] = op.slice(1); [[r, c[0]], [r * 0.62, c[1]], [r * 0.2, c[2]]].forEach(([rr, cc], i) => { ctx.fillStyle = C(cc); ctx.beginPath(); ctx.arc(x - (i === 2 ? r * 0.15 : 0), y - (i === 2 ? r * 0.15 : 0), rr, 0, 7); ctx.fill(); }); }
      else if (k === 'veins') {        // from the wing root out to every few outline points
        const s = smooth(pts), base = pts[0];
        ctx.strokeStyle = C(op[1]); ctx.lineWidth = op[2]; ctx.lineCap = 'round';
        const from = op[3] || [base[0] + 0.02, base[1] + 0.02];
        for (let i = 6; i < s.length - 4; i += Math.max(4, Math.floor(s.length / 11))) {
          const [x, y] = s[i]; ctx.beginPath(); ctx.moveTo(from[0], from[1]);
          ctx.quadraticCurveTo((from[0] + x) / 2 + (y - from[1]) * 0.08, (from[1] + y) / 2 - (x - from[0]) * 0.08, x, y); ctx.stroke();
        }
      } else if (k === 'flecks') {
        const r = rng(op[1]), [x0, y0, x1, y1] = op[3];
        ctx.fillStyle = C(op[5]);
        for (let i = 0; i < op[2]; i++) {
          const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = op[4] * (0.6 + r() * 0.8);
          ctx.beginPath(); ctx.ellipse(x, y, s * (1 + r()), s * 0.7, r() * 3, 0, 7); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function bodyParts(sp) {
    const b = sp.body, headY = -0.05 - b.thorax[1] - b.head * 0.6;
    const abdY0 = -0.05 + b.thorax[1] * 0.7;
    return { headY, abdY0, abdC: abdY0 + b.abd[0] / 2 };
  }
  function drawBody(ctx, sp, maskOnly) {
    const b = sp.body, { headY, abdY0, abdC } = bodyParts(sp);
    const fill = (c) => (ctx.fillStyle = maskOnly ? '#000' : C(c));
    // antennae (both sides)
    for (const side of [1, -1]) {
      ctx.strokeStyle = maskOnly ? '#000' : C(b.antC || b.c); ctx.lineWidth = b.antW; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, headY);
      b.ant.forEach(([x, y]) => ctx.lineTo(x * side, y + headY + 0.17));
      ctx.stroke();
      if (b.club) { const [x, y] = b.ant[b.ant.length - 1]; fill(b.antC || b.c); ctx.beginPath(); ctx.ellipse(x * side, y + headY + 0.17, b.club, b.club * 1.4, side * 0.5, 0, 7); ctx.fill(); }
    }
    // abdomen with bands
    const abd = new Path2D(); abd.ellipse(0, abdC, b.abd[1], b.abd[0] / 2, 0, 0, 7);
    fill(b.c); ctx.fill(abd);
    if (!maskOnly && b.bands) {
      ctx.save(); ctx.clip(abd);
      const n = b.bands.length, h = b.abd[0] / n;
      b.bands.forEach((c, i) => { ctx.fillStyle = C(c); ctx.fillRect(-1, abdY0 + i * h, 2, h * 0.92); });
      const g = ctx.createLinearGradient(-b.abd[1], 0, b.abd[1], 0);
      g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.45, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = g; ctx.fillRect(-1, abdY0, 2, b.abd[0]);
      ctx.restore();
    }
    fill(b.thoraxC || b.c); ctx.beginPath(); ctx.ellipse(0, -0.05, b.thorax[0], b.thorax[1], 0, 0, 7); ctx.fill();
    fill(b.c); ctx.beginPath(); ctx.arc(0, headY, b.head, 0, 7); ctx.fill();
  }

  // Draw the specimen in unit space; transform already set. maskOnly: solid black silhouette.
  function drawUnits(ctx, sp, maskOnly) {
    for (const side of [1, -1]) {
      ctx.save(); ctx.scale(side, 1);
      if (maskOnly) { ctx.fillStyle = '#000'; ctx.fill(path(smooth(sp.hw))); ctx.fill(path(smooth(sp.fw))); }
      else { wingOps(ctx, sp.hw, sp.hwOps, sp); wingOps(ctx, sp.fw, sp.fwOps, sp); }
      ctx.restore();
    }
    drawBody(ctx, sp, maskOnly);
  }

  // ---------- normalise: same area, same visual centre ----------
  const TARGET_AREA = 0.29 * W * H, MAX_W = 990, MAX_H = 900, CY = 545;
  function measure(sp) {
    const S = 2000, s0 = 600, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.setTransform(s0, 0, 0, s0, S / 2, S / 2); drawUnits(g, sp, true);
    const d = g.getImageData(0, 0, S, S).data;
    let n = 0, sy = 0, x0 = S, x1 = 0, y0 = S, y1 = 0;
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 127) {
      n++; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const area = n * 4 / (s0 * s0), cy = (sy / n - S / 2) / s0;
    return { area, cy, w: (x1 - x0) / s0, top: (y0 - S / 2) / s0, bot: (y1 - S / 2) / s0 };
  }
  function layout(sp) {
    if (sp.T) return sp.T;
    const m = measure(sp);
    let s = Math.sqrt(TARGET_AREA / m.area);
    s = Math.min(s, MAX_W / m.w, MAX_H / (m.bot - m.top));
    let ty = CY - m.cy * s;
    ty = Math.min(Math.max(ty, 60 - m.top * s), 1020 - m.bot * s);   // keep it on the sheet
    return (sp.T = { s, tx: W / 2, ty, cx: W / 2, cy: ty - 0.05 * s, m });
  }
  function setT(ctx, sp) { const T = layout(sp); ctx.setTransform(T.s, 0, 0, T.s, T.tx, T.ty); }

  const maskCache = new Map();
  function mask(sp) {          // the silhouette as an alpha canvas, 1080 px
    if (maskCache.has(sp.id)) return maskCache.get(sp.id);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); setT(g, sp); drawUnits(g, sp, true);
    maskCache.set(sp.id, c);
    return c;
  }
  function flat(ctx, sp, neg = false) {     // the specimen in its own colours, transparent outside
    NEG = neg; ctx.save(); setT(ctx, sp); drawUnits(ctx, sp, false); ctx.restore(); NEG = false;
  }

  window.Species = { SPECIES, byId: Object.fromEntries(SPECIES.map((s) => [s.id, s])), mask, flat, layout, smooth, path, rng };
})();
