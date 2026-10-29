// "la fille aux cheveux de lin", about 80 seconds.
// Debussy's prelude opens with one unaccompanied line. A pen draws that line as it is played,
// then the line bends itself into the profile of a girl and stays in the sky, pencilled in.
// She is at a piano in the fields, playing; every note rises out of the piano, runs along her
// hair and goes up to wait on that pencilled line. With the closing arpeggio the line is inked
// in, note by note, and it is her: the film begins with one line and ends with the same one.
// Everything moves slowly: long dissolves, slow cameras, motion that is continuous in t.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, seg, smooth, ease, clamp, lerp, rng } = Pen;
  const K = Kit, C = K.C, B = K.BARS;
  const DURATION = 81.2;
  const FLAX = '#efcf7e', ALFALFA = '#9b7fd1', DRESS = '#a8c6e6', SKY = '#f3c98b', BLUSH = '#f2a6a0';
  const HAIR_INK = '#8d6a35', WOOD = '#a9744c', WOOD_LID = '#c8955f', SHOE = '#c9786a';
  const mel = K.melody, low = K.notes.filter((n) => n.voice === 1);
  const between = (list, a, b) => list.filter((n) => n.t >= a - 0.01 && n.t < b - 0.01);
  // crayon inside the scaled-up scene keeps its wax the same size on the page
  let TEX = 1;
  const wax = (P, c, o) => crayon(P, c, Object.assign({ tex: TEX }, o));
  const fill = (ctx, P, color) => { ctx.fillStyle = color; ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  // a polyline resampled to n points evenly spaced along its length
  function resample(P, n) {
    const len = [0];
    for (let i = 1; i < P.length; i++) len.push(len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = len[len.length - 1], out = [];
    let j = 1;
    for (let i = 0; i < n; i++) {
      const d = (i / (n - 1)) * L;
      while (j < P.length - 1 && len[j] < d) j++;
      const k = clamp((d - len[j - 1]) / ((len[j] - len[j - 1]) || 1));
      out.push([lerp(P[j - 1][0], P[j][0], k), lerp(P[j - 1][1], P[j][1], k)]);
    }
    return out;
  }
  const at = (R, u) => R[clamp(Math.round(u * (R.length - 1)), 0, R.length - 1)];

  // ===================== her profile (head units: crown to chin is about 290) =====================
  // one drawing serves three times: her head in the film, the shape the opening line bends
  // into, and the line the notes draw in the sky at the end.
  const FACE = [[-112, 238], [-74, 206], [-66, 176], [-70, 140], [-90, 111], [-112, 94], [-106, 76], [-118, 64], [-112, 55], [-121, 48], [-118, 36], [-134, 26], [-112, -10], [-116, -32], [-112, -64], [-98, -100]];
  const OUTER = [[-92, -130], [-64, -160], [-14, -176], [44, -170], [96, -140], [130, -94], [146, -40], [152, 30], [158, 100], [170, 170], [192, 230], [226, 280], [262, 312], [278, 332], [252, 338]];
  const FRONT = [[212, 318], [168, 284], [128, 240], [96, 190], [70, 142], [46, 108], [26, 86]];
  const JAW = [[16, 50], [-6, 76], [-40, 98], [-80, 111]];
  const TEMPLE = [[-98, -100], [-70, -96], [-44, -72], [-22, -36], [-6, 10], [10, 52], [26, 86]];
  const LOCKS = [
    [[-40, -150], [40, -142], [96, -100], [118, -30], [124, 50], [134, 130], [156, 200], [190, 260], [230, 306]],
    [[-60, -118], [10, -122], [62, -86], [84, -20], [90, 60], [102, 140], [126, 210], [166, 270], [204, 310]],
    [[-66, -100], [-10, -96], [30, -56], [46, 10], [56, 80], [76, 150], [110, 220], [150, 280]],
  ];
  const EYE = [[-98, -12], [-88, -6], [-76, -5], [-66, -9]], BROW = [[-102, -36], [-88, -42], [-72, -40]];
  // behind the neck the hair ripples, like hair in a breeze
  const ripple = ([x, y]) => [x + 9 * clamp((y - 40) / 80) * clamp((x - 40) / 40) * Math.sin(y / 32), y];
  const PORTRAIT_HU = pts.curve(FACE.concat(OUTER, FRONT, JAW), 8).map(ripple);
  const PORTRAIT_HAIR_HU = pts.curve([TEMPLE[0]].concat(OUTER, FRONT), 8).map(ripple).concat(pts.curve(TEMPLE.slice().reverse(), 8));
  // where it hangs in the sky of the field (world units)
  const SKY_AT = ([x, y]) => [714 + 0.85 * x, 170 + 0.85 * y];
  const PORTRAIT = stroke(PORTRAIT_HU.map(SKY_AT), { seed: 300, wobble: 1, step: 2.5 });
  const PORTRAIT_GUIDE = stroke(PORTRAIT_HU.map(SKY_AT), { seed: 301, wobble: 1.4, step: 3 });
  const PORTRAIT_HAIR = PORTRAIT_HAIR_HU.map(SKY_AT);
  const PORTRAIT_LOCKS = group(LOCKS.map((l) => pts.curve(l, 8).map(ripple).map(SKY_AT)), { wobble: 0.6 });
  const PORTRAIT_EYE = group([pts.curve(EYE, 6).map(SKY_AT), pts.curve(BROW, 6).map(SKY_AT)].concat(
    [0.35, 0.6, 0.85].map((u) => { const [x, y] = at(pts.curve(EYE, 6), u); return [SKY_AT([x, y]), SKY_AT([x - 4, y + 9])]; })), { wobble: 0.3 });
  function portraitAt(u) {
    const L = clamp(u) * PORTRAIT.L;
    let lo = 0, hi = PORTRAIT.N - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PORTRAIT.len[m] < L) lo = m; else hi = m; }
    const k = clamp((L - PORTRAIT.len[lo]) / ((PORTRAIT.len[hi] - PORTRAIT.len[lo]) || 1));
    return [lerp(PORTRAIT.xs[lo], PORTRAIT.xs[hi], k), lerp(PORTRAIT.ys[lo], PORTRAIT.ys[hi], k)];
  }

  // ===================== shot 1: the pen draws the opening line =====================
  // height follows pitch; the pen moves right at a steady pace, so spacing is rhythm.
  // ghost notes (a weaker note right after another) don't steer the line.
  const LINE_NOTES = between(mel, 0, B[1]).filter((n, i, a) => i === 0 || n.t - a[i - 1].t > 0.15);
  const T0 = mel[0].t, LINE_END = B[1], PACE = 112;
  const lineY = (p) => 470 - (p - 68) * 16;
  const LINE = [];
  {
    let y = lineY(LINE_NOTES[0].pitch), j = 0;
    for (let tau = T0; tau <= LINE_END; tau += 1 / 48) {
      while (j + 1 < LINE_NOTES.length && LINE_NOTES[j + 1].t <= tau) j++;
      y += (lineY(LINE_NOTES[j].pitch) - y) * (1 - Math.exp(-(1 / 48) / 0.22));
      LINE.push([100 + PACE * (tau - T0), y + 4 * Math.sin(tau * 2.6)]);
    }
  }
  const lineAt = (tau) => LINE[clamp(Math.round((tau - T0) * 48), 0, LINE.length - 1)];
  const lineStroke = stroke(LINE, { seed: 42, wobble: 0.8, step: 2.5 });
  // each chord under the line leaves a soft wash of colour
  const WASH = [];
  for (const n of between(low, 7.4, B[1])) {
    if (WASH.length && n.t - WASH[WASH.length - 1].t < 0.5) continue;
    const [x] = lineAt(n.t);
    WASH.push({ t: n.t, x, y: 640 + (n.pitch % 7) * 12, r: 70 + (n.pitch % 5) * 14, c: [SKY, ALFALFA, BLUSH, FLAX, DRESS][WASH.length % 5] });
  }
  // how much of the stroke lies left of x: the ink ends exactly under the nib, even where the
  // line climbs steeply (revealing by time instead let the ink fall behind the pen there)
  function progAtX(s, x) {
    let lo = 0, hi = s.N - 1;
    if (x <= s.xs[0]) return 0;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s.xs[m] < x) lo = m; else hi = m; }
    const k = clamp((x - s.xs[lo]) / ((s.xs[hi] - s.xs[lo]) || 1));
    return clamp(lerp(s.len[lo], s.len[hi], k) / s.L);
  }
  function pen(ctx, x, y, lift) {
    ctx.save(); ctx.translate(x + lift * 50, y - lift * 80); ctx.rotate(-0.85);
    crayon([[14, -6], [180, -14], [180, 14], [14, 6]], '#c98f52', { dx: 2, dy: 0, seed: 7 });
    crayon([[6, -7], [22, -9], [22, 9], [6, 7]], '#b9b4aa', { dx: 0, dy: 0, seed: 8 });
    ctx.fillStyle = Pen.PAPER; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -6); ctx.lineTo(180, -14); ctx.lineTo(180, 14); ctx.lineTo(8, 6); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -9); ctx.lineTo(22, 9); ctx.moveTo(8, -6); ctx.lineTo(8, 6); ctx.stroke();
    ctx.restore();
  }
  // then the finished line bends, from its first note to its last, into her profile, landing
  // exactly where the pencilled profile hangs in the sky of the next shot
  const CAM1 = Math.max(540, lineAt(LINE_END)[0] - 240);
  const MORPH = [15.5, 20.6], N_MORPH = 700;
  const LINE_R = resample(LINE, N_MORPH);
  const PROFILE_R = resample(PORTRAIT_HU.map(SKY_AT).map(([x, y]) => [x + CAM1 - 560, y + 50]), N_MORPH);
  const lineLen = [0];
  for (let i = 1; i < LINE.length; i++) lineLen.push(lineLen[i - 1] + Math.hypot(LINE[i][0] - LINE[i - 1][0], LINE[i][1] - LINE[i - 1][1]));
  for (const n of LINE_NOTES) n.lu = lineLen[clamp(Math.round((n.t + 0.3 - T0) * 48), 0, LINE.length - 1)] / lineLen[lineLen.length - 1];
  const bend = (t, u) => smooth(clamp(((t - MORPH[0]) / (MORPH[1] - MORPH[0])) * 1.6 - u * 0.6));
  const bentAt = (t, u) => { const a = at(LINE_R, u), b = at(PROFILE_R, u), k = bend(t, u); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; };
  function shotLine(ctx, t, k) {
    const tt = Math.min(t, LINE_END), [px, py] = lineAt(Math.max(T0, tt));
    // the camera keeps the pen a little right of centre once it gets there
    K.camera(ctx, k, Math.max(540, px - 240), 520, 1);
    const washOut = 1 - seg(t, MORPH[0], MORPH[0] + 2.5);
    for (const w of WASH) {
      const g = ease(clamp((t - w.t) / 1.1)) * washOut;
      if (g > 0) crayonEllipse(w.x, w.y, w.r * (0.5 + 0.5 * g), w.r * 0.55 * (0.5 + 0.5 * g), w.c, { alpha: 0.3 * g, dx: 0, dy: 0, seed: (w.x | 0) });
    }
    if (t < MORPH[0]) ink(lineStroke, { prog: progAtX(lineStroke, px), w: 3.2 });
    else {
      // towards the cut the ink pales into pencil, the way the profile hangs in the next shot
      const S = stroke(LINE_R.map((_, i) => bentAt(t, i / (N_MORPH - 1))), { seed: 42, wobble: 0.8, step: 2.5 });
      const pale = seg(t, 21.6, 24.6);
      if (pale < 1) ink(S, { w: 3.2, alpha: 0.94 * (1 - pale) });
      if (pale > 0) guide(S, { alpha: 0.85 * pale });
    }
    const fade = 1 - seg(t, 19.6, 21.2);
    for (const n of LINE_NOTES) {
      if (n.t > tt) break;
      const [nx, ny] = t < MORPH[0] ? lineAt(n.t + 0.3) : bentAt(t, n.lu);
      K.noteGlyph(ctx, nx, ny, 0, Object.assign({}, n, { step: 4 }), 0.85 * (1 + 0.5 * Math.exp(-(t - n.t) / 0.09)), fade);
    }
    if (t > T0 - 0.5 && t < 17.5) pen(ctx, px, py, smooth(seg(t, 15.0, 16.4)) * 3 + (t < T0 ? (T0 - t) * 2 : 0));
  }

  // ===================== the girl at the piano (centimetres, ground at y = 0) =====================
  // she sits side-on, facing left, at a grand piano seen from the side
  const BODY = {
    bench: [[44, -50], [100, -50], [100, -44], [44, -44]],
    benchLegs: [[[50, -44], [50, 0]], [[94, -44], [94, 0]], [[56, -44], [56, -2]]],
    bodice: [[58, -101], [53, -93], [54, -85], [59, -72], [60, -64], [75, -64], [74, -80], [73, -92], [69, -101]],
    skirt: [[60, -68], [75, -66], [81, -50], [77, -44], [60, -41], [38, -38], [21, -40], [16, -48], [21, -57], [40, -59], [58, -60]],
    shinNear: [[19, -40], [17, -8], [25, -8], [28, -40]],
    shinFar: [[29, -40], [24, -9], [31, -9], [36, -40]],
    shoeNear: [[25, -8], [17, -8], [9, -4], [8, -1], [26, -1]],
    shoeFar: [[31, -9], [24, -9], [17, -5], [16, -2], [32, -2]],
    hem: [[16, -48], [21, -40], [38, -38], [60, -41], [77, -44]],
  };
  const limb = (C, w0, w1) => {
    const P = pts.curve(C, 8), side = (s) => P.map(([x, y], i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], m = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = lerp(w0, w1, i / (P.length - 1)) * s;
      return [x - (b[1] - a[1]) / m * w, y + (b[0] - a[0]) / m * w];
    });
    return { poly: side(1).concat(side(-1).reverse()), lines: [side(1), side(-1)] };
  };
  const ARM = limb([[64, -97], [58, -84], [53, -74], [38, -73], [23, -74]], 3.6, 2.6);
  const ARM_FAR = limb([[60, -96], [52, -76], [36, -75], [18, -75]], 3.4, 2.4);
  const SLEEVE = limb([[65, -98], [62, -91], [60, -87]], 4.4, 4.2);
  const bodyInk = group([
    BODY.bench.concat([BODY.bench[0]]), ...BODY.benchLegs,
    [[58, -101], [53, -93], [54, -85], [59, -72], [60, -64]], [[69, -101], [73, -92], [74, -80], [75, -64], [81, -50], [77, -44]],
    BODY.hem, [[21, -57], [40, -59], [58, -60]], [[16, -48], [21, -57]],
    [[19, -40], [17, -8]], [[28, -40], [25, -8]], BODY.shoeNear.concat([BODY.shoeNear[0]]),
  ], { wobble: 0.35 });
  const farInk = group([[[29, -40], [24, -9]], [[36, -40], [31, -9]], BODY.shoeFar.concat([BODY.shoeFar[0]])].concat(ARM_FAR.lines), { wobble: 0.35 });
  const armInk = group(ARM.lines.concat(SLEEVE.lines), { wobble: 0.3 });
  const PIANO = {
    body: [[-6, -100], [-184, -100], [-194, -96], [-199, -83], [-194, -70], [-184, -66], [-6, -66]],
    lid: [[-30, -100], [-78, -172], [-186, -138], [-196, -100]],
    keys: [[14, -73], [-6, -73], [-4, -77], [12, -77]],
    keybed: [[14, -73], [-6, -73], [-6, -65], [14, -65]],
    stand: [[-10, -100], [-22, -126], [-17, -127], [-6, -100]],
  };
  const pianoInk = group([
    PIANO.body.concat([PIANO.body[0]]), PIANO.lid, [[-116, -100], [-116, -160]],
    PIANO.keys.concat([PIANO.keys[0]]), PIANO.keybed.concat([PIANO.keybed[0]]), PIANO.stand,
    [[-12, -66], [-11, 0]], [[-18, -66], [-17, 0]], [[-180, -66], [-181, 0]], [[-186, -66], [-187, 0]],
    [[-2, -66], [-2, -6], [12, -6]], [[4, -66], [4, -9]],
  ], { wobble: 0.35 });
  const keyTicks = group(Array.from({ length: 9 }, (_, i) => { const x = 12 - i * 2.1; return [[x, -73], [x + 0.6, -76.6]]; }), { wobble: 0.05 });
  const r0 = rng(5);
  const SHADE = group(Array.from({ length: 34 }, (_, i) => { const x = -200 + i * 9 + r0() * 4 - (i > 22 ? -40 : 0), y = r0() * 3; return [[x, y + 1], [x + 7 + r0() * 3, y + 1]]; }), { wobble: 0.3 });

  // ---- her hair: fine strands between the hairline and the outline of the hair, falling down her
  // back to below the shoulders and lifted to the right by the breeze. The same shape as the profile.
  const OUTER_G = [[-98, -100]].concat(OUTER.slice(0, 9), [[178, 170], [204, 240], [238, 310], [272, 372], [296, 426]]);
  const INNER_G = TEMPLE.concat([[48, 140], [66, 200], [98, 262], [138, 322], [184, 380], [262, 438]]);
  const M = 48, OUT_R = resample(pts.curve(OUTER_G, 8), M), IN_R = resample(pts.curve(INNER_G, 8), M);
  const N_STRANDS = 56;
  function hairPt(f, i, t, wind) {
    const u = i / (M - 1), a = OUT_R[i], b = IN_R[i];
    let x = lerp(b[0], a[0], f), y = lerp(b[1], a[1], f);
    // each strand wanders a little on its own, so they don't look ruled
    const nx = -(OUT_R[Math.min(M - 1, i + 1)][1] - OUT_R[Math.max(0, i - 1)][1]), ny = OUT_R[Math.min(M - 1, i + 1)][0] - OUT_R[Math.max(0, i - 1)][0], nm = Math.hypot(nx, ny) || 1;
    const j = 3 * Math.sin(i * 0.45 + f * 17) * Math.min(1, u * 4);
    x += nx / nm * j; y += ny / nm * j;
    // the breeze: a wave that runs from root to tip, growing toward the tip
    const w = smooth(clamp((u - 0.28) / 0.72)), ph = Math.PI * 2 * 0.2 * t - 3.5 * u + f * 2.2;
    return [x + wind * w * (22 + 12 * Math.sin(ph)), y - wind * w * (10 + 6 * Math.sin(ph + 0.8))];
  }
  const strandPts = (f, t, wind) => Array.from({ length: M }, (_, i) => hairPt(f, i, t, wind));
  const FACE_FILL = FACE.slice(2).concat(TEMPLE.slice(1), [[52, 150], [60, 214], [-60, 214]]);
  const faceInk = group([pts.curve(FACE.slice(2), 8), pts.curve(JAW.slice().reverse(), 6)], { wobble: 0.4 });
  const HEAD = { x: 61, y: -101, s: 0.083, ox: -30, oy: 200 };
  // her head in centimetres, tilted about the base of the neck
  const headToCm = ([hx, hy], tilt) => {
    const dx = (hx - HEAD.ox) * HEAD.s, dy = (hy - HEAD.oy) * HEAD.s, c = Math.cos(tilt), s = Math.sin(tilt);
    return [HEAD.x + dx * c - dy * s, HEAD.y + dx * s + dy * c];
  };
  function head(ctx, t, o, R, S) {
    // S: screen pixels per head unit, for line widths
    const tilt = o.tilt || 0, wind = o.wind == null ? 1 : o.wind, px = (p) => p / S;
    const Wf = 3 * Math.pow(S / 1.16, 0.25);
    const tex0 = TEX; TEX = 1 / S;
    ctx.save(); ctx.translate(HEAD.x, HEAD.y); ctx.rotate(tilt); ctx.scale(HEAD.s, HEAD.s); ctx.translate(-HEAD.ox, -HEAD.oy);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fill(ctx, FACE_FILL, Pen.PAPER);
    inkGroup(faceInk, R(0, 0.5), { w: px(Wf) });
    wax(pts.ellipse(-70, 44, 20, 12, 0, 1), BLUSH, { prog: R(0.6, 0.8), alpha: 0.6, dx: 0, dy: 0 });
    // the hair: a soft flax colour, then the strands
    const hp = R(0.2, 1.2);
    if (hp > 0) {
      const outer = strandPts(1, t, wind), inner = strandPts(0, t, wind);
      wax(outer.concat(inner.slice().reverse()), FLAX, { prog: hp, dx: 0, dy: 0, alpha: 0.7, seed: 66 });
      const upto = Math.max(2, Math.round(M * clamp(hp * 1.3)));
      for (let k = 0; k < N_STRANDS; k++) {
        // strands end at slightly different lengths, so the ends of her hair are soft
        const f = k / (N_STRANDS - 1), P = strandPts(f, t, wind).slice(0, M - Math.floor(((k * 0.618034) % 1) * 7)), navy = k % 6 === 0;
        ctx.strokeStyle = navy ? Pen.INK : HAIR_INK; ctx.globalAlpha = navy ? 0.4 : 0.6;
        ctx.lineWidth = px(Math.max(0.55, (navy ? 1.0 : 0.85) * Math.pow(S / 1.16, 0.35)));
        ctx.beginPath(); for (let i = 0; i < Math.min(upto, P.length); i++) i ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]); ctx.stroke();
      }
      ctx.globalAlpha = 0.85; ctx.strokeStyle = Pen.INK; ctx.lineWidth = px(1.6 * Math.pow(S / 1.16, 0.3));
      for (const P of [outer, inner]) { ctx.beginPath(); for (let i = 0; i < upto; i++) i ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // eye and brow: closed while she plays; at the end she opens them and looks up
    const open = o.open || 0;
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = px(Wf * 0.7);
    const E = pts.curve(BROW, 6);
    if (R(0.55, 0.7) > 0) { ctx.beginPath(); E.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    if (R(0.55, 0.7) > 0) {
      const lid = pts.curve(EYE.map(([x, y], i) => [x, y - open * (i === 1 || i === 2 ? 10 : 2)]), 6);
      ctx.lineWidth = px(Wf * 0.8);
      ctx.beginPath(); lid.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      if (open > 0.1) {
        ctx.globalAlpha = clamp((open - 0.1) * 3); ctx.fillStyle = Pen.INK;
        ctx.beginPath(); ctx.ellipse(-90, -8, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-98, -12); ctx.quadraticCurveTo(-86, -2, -70, -8); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        ctx.lineWidth = px(Wf * 0.5);
        for (const u of [0.35, 0.6, 0.85]) { const [x, y] = at(lid, u); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 9); ctx.stroke(); }
      }
    }
    ctx.restore();
    TEX = tex0;
  }
  // where a point on strand f (u from root 0 to tip 1) is right now, in centimetres
  const strandCm = (f, u, t, o) => headToCm(hairPt(f, Math.round(u * (M - 1)), t, o.wind == null ? 1 : o.wind), o.tilt || 0);

  function scene(ctx, t, o) {
    // o: { x, y, s } places centimetre (0, 0) at world (x, y), s px per cm
    const R = (a, b) => seg(t, o.reveal + a, o.reveal + b);
    const W = 3 * Math.pow(o.s / 2.2, 0.25) / o.s;
    TEX = 1 / o.s;
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s, o.s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    inkGroup(SHADE, R(0.6, 1.2), { w: W * 0.6, alpha: 0.5 });
    // piano
    fill(ctx, PIANO.lid, Pen.PAPER); fill(ctx, PIANO.body, Pen.PAPER);
    wax(PIANO.lid, WOOD_LID, { prog: R(0.5, 1.1), alpha: 0.45, dx: 1.6, dy: -1.2, seed: 120 });
    wax(PIANO.body, WOOD, { prog: R(0.4, 1.0), alpha: 0.6, dx: 1.6, dy: -0.8, seed: 121 });
    wax(PIANO.keys, '#ffffff', { prog: R(0.6, 0.9), alpha: 0.95, dx: 0, dy: 0, seed: 122 });
    inkGroup(pianoInk, R(0, 0.9), { w: W });
    inkGroup(keyTicks, R(0.7, 0.9), { w: W * 0.5 });
    // far leg and far arm, behind her
    const p = K.press(t, 0), q = K.press(t, 1);
    if (R(0.4, 0.41) > 0) {
      fill(ctx, BODY.shinFar, Pen.PAPER); fill(ctx, ARM_FAR.poly, Pen.PAPER);
      wax(BODY.shoeFar, SHOE, { prog: R(0.6, 0.9), alpha: 0.6, dx: 0.5, dy: -0.4, seed: 130 });
      inkGroup(farInk, R(0.4, 0.9), { w: W * 0.8, alpha: 0.7 });
      ctx.fillStyle = Pen.PAPER; ctx.strokeStyle = Pen.INK; ctx.lineWidth = W * 0.7; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(13, -76.6 + 0.8 * q, 3.4, 1.9, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // bench, body, dress
    wax(BODY.bench, '#8a6a52', { prog: R(0.5, 0.9), alpha: 0.6, dx: 0.6, dy: -0.4, seed: 131 });
    if (R(0.3, 0.31) > 0) { fill(ctx, BODY.bodice, Pen.PAPER); fill(ctx, BODY.skirt, Pen.PAPER); fill(ctx, BODY.shinNear, Pen.PAPER); }
    wax(BODY.bodice, DRESS, { prog: R(0.5, 1.0), dx: 1.0, dy: -0.6, seed: 132 });
    wax(BODY.skirt, DRESS, { prog: R(0.5, 1.0), dx: 1.0, dy: -0.6, seed: 133 });
    wax(BODY.shoeNear, SHOE, { prog: R(0.6, 0.9), alpha: 0.8, dx: 0.5, dy: -0.4, seed: 134 });
    inkGroup(bodyInk, R(0.2, 0.9), { w: W });
    // head and hair
    head(ctx, t, o, R, o.s * HEAD.s);
    // near arm over everything, the hand dipping with each note of the tune
    if (R(0.6, 0.61) > 0) {
      fill(ctx, ARM.poly, Pen.PAPER);
      wax(SLEEVE.poly, DRESS, { prog: R(0.6, 1.0), dx: 0.6, dy: -0.4, seed: 135 });
      inkGroup(armInk, R(0.6, 1.0), { w: W * 0.9 });
      ctx.fillStyle = Pen.PAPER; ctx.strokeStyle = Pen.INK; ctx.lineWidth = W * 0.8;
      ctx.save(); ctx.translate(20, -74.4 + 0.9 * p); ctx.rotate(-0.12);
      ctx.beginPath(); ctx.ellipse(0, 0, 3.8, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); for (const fx of [-3, -1.2, 0.6]) { ctx.moveTo(fx, 1.4); ctx.lineTo(fx - 0.8, 3.2); } ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    TEX = 1;
  }

  // ===================== the field =====================
  const FLOWERS = low.filter((n) => n.t > B[2] - 1).map((n, i) => ({ t: n.t, x: -100 + ((i * 0.618034) % 1) * 1360, y: 660 + ((i * 0.754878) % 1) * 210, s: 0.7 + (n.pitch % 5) * 0.12, c: [ALFALFA, ALFALFA, C.pink, '#b79be0'][i % 4] }));
  const r = rng(11);
  const GRASS = Array.from({ length: 100 }, () => { const x = -200 + r() * 1500, y = 640 + r() * 250; return [[x, y], [x + (r() - 0.5) * 10, y - 18 - r() * 18]]; });
  const field = {
    horizon: stroke(pts.curve([[-300, 624], [-80, 620], [240, 596], [520, 612], [800, 590], [1160, 608], [1400, 600]], 10), { wobble: 1.4 }),
    hills: stroke(pts.curve([[-300, 636], [-80, 640], [300, 620], [640, 640], [1160, 625], [1400, 632]], 10), { wobble: 1.2 }),
    grass: group(GRASS, { wobble: 0.4 }),
  };
  function flower(ctx, f, t) {
    const k = ease(clamp((t - f.t) / 0.8));
    if (k <= 0) return;
    const s = f.s * k, sway = 2 * Math.sin(t * 0.9 + f.x);
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + sway, f.y - 20 * s, f.x + 2 + sway, f.y - 34 * s); ctx.stroke();
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; crayonEllipse(f.x + 2 + sway + Math.cos(a) * 8 * s, f.y - 40 * s + Math.sin(a) * 7 * s, 6 * s, 6 * s, f.c, { dx: 0, dy: 0, seed: (j + f.x) | 0 }); }
  }
  // o.near: flowers in front of the piano (lower on the page than its feet) are drawn later
  function fieldLayer(ctx, t, reveal, o = {}) {
    const R = (a, b) => seg(t, reveal + a, reveal + b);
    crayon([[-300, 618], [1400, 606], [1400, 900], [-300, 900]], C.green, { prog: R(0.3, 1.2), alpha: 0.34, dx: 0, dy: 0, seed: 71 });
    ink(field.horizon, { prog: R(0, 0.8), w: 3.2 });
    ink(field.hills, { prog: R(0.2, 1.0), w: 2 });
    if (o.flowers === false) return;
    inkGroup(field.grass, R(0.5, 1.5), { w: 1.8, alpha: 0.8 });
    for (const f of FLOWERS) if (o.near == null || f.y < o.near) flower(ctx, f, t);
  }
  const nearFlowers = (ctx, t, near) => { for (const f of FLOWERS) if (f.y >= near) flower(ctx, f, t); };

  // ===================== notes =====================
  // a smooth, monotone time warp (Fritsch-Carlson), so a note can take its time on the hair
  // without its speed ever jumping
  function warp(x, X, Y) {
    const d = [], m = [0];
    for (let i = 0; i < 3; i++) d.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
    for (let i = 1; i < 3; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(0);
    for (let i = 0; i < 3; i++) {
      if (!d[i]) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * d[i]; m[i + 1] = s * b * d[i]; }
    }
    const i = x < X[1] ? 0 : x < X[2] ? 1 : 2;
    const h = X[i + 1] - X[i], u = clamp((x - X[i]) / h), u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m[i + 1];
  }
  // higher notes ride the outer strands
  const strandOf = (n) => clamp((n.pitch - 60) / 20) * 0.9 + 0.05;
  // where note n is at time t: out of the piano, over her head, down one strand of her hair, off
  // its tip and up to dest. o.src is the range of x (cm) the notes leave the piano from.
  function flight(n, t, o, T, dest, split = [0.32, 0.66]) {
    const age = t - n.t;
    if (age >= T) return dest;
    const toW = ([x, y]) => [o.x + o.s * x, o.y + o.s * y];
    const f = strandOf(n), sx = lerp(o.src[0], o.src[1], (n.i * 0.618034) % 1);
    const tip = strandCm(f, 1, t, o);
    const Cm = [[sx, -104], [sx + 24, -138], [44, -146], strandCm(f, 0.12, t, o), strandCm(f, 0.4, t, o), strandCm(f, 0.7, t, o), tip, [tip[0] + 10, tip[1] - 16]];
    const Cw = Cm.map(toW); Cw.push(dest);
    const P = pts.curve(Cw, 6), len = [0];
    for (let i = 1; i < P.length; i++) len.push(len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = len[len.length - 1];
    const q = warp(age / T, [0, split[0], split[1], 1], [0, len[18] / L, len[36] / L, 1]) * L;
    let j = 1;
    while (j < P.length - 1 && len[j] < q) j++;
    const k = clamp((q - len[j - 1]) / ((len[j] - len[j - 1]) || 1));
    return [lerp(P[j - 1][0], P[j][0], k), lerp(P[j - 1][1], P[j][1], k)];
  }
  function glyph(ctx, n, x, y, t, scale, alpha) {
    const age = t - n.t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.18 * Math.sin(age * 0.8 + n.i * 1.7));
    K.noteGlyph(ctx, 0, 0, 0, Object.assign({}, n, { step: 4 }), scale * (0.65 + 0.35 * ease(age / 0.6)), alpha);
    ctx.restore();
  }
  // the notes that wait in the sky, each at its own place along the pencilled profile
  const SKY_NOTES = between(mel, B[2] - 0.3, 61.2), LATE_NOTES = between(mel, 61.2, DURATION);
  const r3 = rng(31);
  SKY_NOTES.forEach((n, i) => { n.u = (i + 0.5) / SKY_NOTES.length * 0.98; n.home = portraitAt(n.u); n.off = [(r3() - 0.5) * 26, (r3() - 0.5) * 20]; });
  // the closing arpeggio inks the line in, a little further with each note
  const JOIN = between(mel, B[5], B[6]);
  const joined = (t) => JOIN.reduce((a, n) => a + ease(clamp((t - n.t + 0.2) / 1.4)), 0) / JOIN.length;
  const T_WIDE = 10;
  function skyLine(ctx, t, pencil) {
    const j = joined(t), done = smooth(seg(t, B[6] + 0.2, B[6] + 2.4));
    if (pencil > 0) guide(PORTRAIT_GUIDE, { alpha: 0.7 * pencil * (1 - done) });
    if (done > 0) {
      crayon(PORTRAIT_HAIR, FLAX, { prog: done, alpha: 0.6, dx: 3, dy: -2, seed: 140 });
      inkGroup(PORTRAIT_LOCKS, done, { w: 1.4, color: HAIR_INK, alpha: 0.8 });
      inkGroup(PORTRAIT_EYE, seg(t, B[6] + 1.2, B[6] + 2.6), { w: 2.4 });
    }
    if (j > 0) ink(PORTRAIT, { prog: j, w: 3.2 });
  }
  function skyNotes(ctx, t, o) {
    const j = joined(t);
    for (const n of SKY_NOTES) {
      if (t < n.t) break;
      const free = 1 - ease(clamp((j - n.u) * 22));
      const home = [n.home[0] + (n.off[0] + 5 * Math.sin(0.5 * t + n.i)) * free, n.home[1] + (n.off[1] + 4 * Math.sin(0.4 * t + 2 * n.i)) * free];
      const [x, y] = flight(n, t, o, T_WIDE, home);
      // once the line has reached it, the note melts into the line
      const gone = Math.max(clamp((j - n.u) * 9), smooth(seg(t, B[6] + 0.5, B[6] + 2)));
      glyph(ctx, n, x, y, t, lerp(0.4, 0.55, free), clamp((t - n.t) / 0.4) * (1 - gone));
    }
    for (const n of LATE_NOTES) {
      const age = t - n.t;
      if (age < 0) break;
      if (age > T_WIDE) continue;
      const [x, y] = flight(n, t, o, T_WIDE, [o.x + 140 * o.s, o.y - 300 * o.s]);
      glyph(ctx, n, x, y, t, 0.55, clamp(age / 0.4) * clamp((T_WIDE * 0.65 - age) / 2));
    }
  }
  // closer views: the notes ride her hair and leave the frame, up toward the sky
  function hairNotes(ctx, t, o, scale) {
    const T = 12;
    for (const n of mel) {
      const age = t - n.t;
      if (age < 0) break;
      if (age > T) continue;
      const tip = strandCm(strandOf(n), 1, t, o);
      const [x, y] = flight(n, t, o, T, [o.x + o.s * (tip[0] + 40), o.y + o.s * (tip[1] - 70)], [0.34, 0.7]);
      glyph(ctx, n, x, y, t, scale, clamp(age / 0.4) * clamp((T - age) / 2));
    }
  }

  // ===================== the shots =====================
  const WIDE = { x: 560, y: 730, s: 2.2, reveal: B[2] - 1.4, src: [-60, -170], tilt: 0.05, wind: 0.8 };
  const MID = { x: 440, y: 940, s: 5, reveal: -10, src: [-30, -90], tilt: 0.05, wind: 0.9 };
  const CLOSE = { x: -510, y: 1970, s: 14, reveal: -10, src: [24, 30], tilt: 0.05, wind: 1 };
  const sky = (ctx, a, seed) => crayon([[-300, -300], [1400, -300], [1400, 640], [-300, 640]], SKY, { alpha: a, dx: 0, dy: 0, seed });

  // 2: wide: a girl at a piano in the fields, her profile pencilled in the sky above
  function shotWide(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [560, 470, 1.0], [580, 450, 0.98], B[2], B[3]);
    K.camera(ctx, k, cx, cy, z);
    sky(ctx, 0.2, 76);
    fieldLayer(ctx, t, B[2] - 1.4, { near: 735 });
    skyLine(ctx, t, 1);
    scene(ctx, t, WIDE);
    nearFlowers(ctx, t, 735);
    skyNotes(ctx, t, WIDE);
  }
  // 3: closer: her hands on the keys, the notes rising out of the piano and over her
  function shotMid(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [540, 540, 1.0], [555, 530, 1.04], B[3] - 1.2, B[4]);
    K.camera(ctx, k, cx, cy, z);
    sky(ctx, 0.2, 77);
    fieldLayer(ctx, t, -10, { flowers: false });
    scene(ctx, t, MID);
    hairNotes(ctx, t, MID, 0.9);
  }
  // 4: the theme comes back; close on her profile, every note running down her hair
  function shotClose(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [540, 540, 1.0], [530, 525, 1.05], B[4] - 1.2, B[5]);
    K.camera(ctx, k, cx, cy, z);
    crayon([[-300, -300], [1400, -300], [1400, 1400], [-300, 1400]], SKY, { alpha: 0.18, dx: 0, dy: 0, seed: 78 });
    scene(ctx, t, CLOSE);
    hairNotes(ctx, t, CLOSE, 1);
  }
  // 5: wide again: with the closing arpeggio the line is inked in through the notes and it is
  // her; she lifts her head and opens her eyes to it
  function shotSky(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [580, 460, 1.0], [620, 400, 0.92], B[5] - 1.2, B[6] + 2);
    K.camera(ctx, k, cx, cy, z);
    sky(ctx, 0.2 + 0.16 * smooth(seg(t, B[5], B[6] + 2)), 79);
    fieldLayer(ctx, t, -10, { near: 735 });
    skyLine(ctx, t, 1);
    const up = smooth(seg(t, B[6] - 0.6, B[6] + 2.2));
    scene(ctx, t, Object.assign({}, WIDE, { reveal: -10, tilt: lerp(0.05, -0.16, up), open: 0.8 * up, wind: lerp(0.8, 0.45, seg(t, B[6], DURATION)) }));
    nearFlowers(ctx, t, 735);
    skyNotes(ctx, t, WIDE);
  }

  const frame = K.film([
    { start: -1, draw: shotLine, caption: 'one line, early in the morning,' },
    { start: B[2], draw: shotWide, caption: 'a girl at a piano, out in the fields,' },
    { start: B[3], draw: shotMid, caption: 'each note went up on the wind,' },
    { start: B[4], draw: shotClose, caption: 'along her flaxen hair,' },
    { start: B[5], draw: shotSky, caption: 'and one by one, they drew her.' },
  ], {
    duration: DURATION, strip: null, dissolve: 1.2,
    final: { at: 75.6, title: 'la fille aux cheveux de lin.', size: 54, credit: 'Claude Debussy, Preludes I, no. 8 (abridged)   /   Luis Kolodin, piano (CC BY-SA 4.0)' },
  });

  window.Film = { frame, DURATION };
})();
