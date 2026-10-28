// Music kit: the pieces that tie a line-drawn film to a score.
// Needs engine.js (window.Pen), fonts.js and score.js (window.SCORE from align_score.py).
//
//   Kit.beatAt(t)                 continuous beat index (bar * beatsPerBar + beat)
//   Kit.press(t, voice)           0..1 pulse right after each note of a voice (hands, flames)
//   Kit.path(points, wander)      a path for a staff to follow
//   Kit.staff / Kit.riders        a five-line staff along a path, and the notes travelling on it
//   Kit.keys(ctx, t, opt)         a top-down keyboard that lights the keys being played
//   Kit.ground(ctx, t, opt)       the bass line laid down as stepping stones, one per bar
//   Kit.eye / Kit.pendulum        small reusable characters' parts
//   Kit.film(shots, opt)          shots cut on bar lines with a soft dissolve, plus captions,
//                                 a bass strip and a closing card; returns frame(canvas, t)
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, hatch, text, write, seg, smooth, ease, clamp, lerp, noise, rng } = Pen;
  const SC = window.SCORE, BEATS = SC.beats, BARS = SC.bars, BPB = BEATS[0].length - 1;

  const C = {
    yellow: '#f2b33d', orange: '#ee7d33', teal: '#2f9d8e', red: '#d9493c', pink: '#f19c9c', brown: '#b5703c',
    blue: '#6683cf', green: '#5ea65a', skin: '#f3d9c4', stone: '#a7a097', soil: '#c9a27a', sky: '#8592d6', glow: '255,196,92',
  };
  // one colour per letter name, so a pitch always looks the same
  const LETTER_COLOR = [C.teal, C.blue, C.green, C.red, C.yellow, C.orange, C.pink]; // C D E F G A B
  // letter name of each pitch class; SCORE.spelling = 'flat' writes black keys as flats (Db, Eb, Gb...)
  const LETTER = SC.spelling === 'flat' ? [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6] : [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

  // ---------- musical time ----------
  function beatAt(t) {
    if (t < BEATS[0][0]) return (t - BEATS[0][0]) / (BEATS[0][1] - BEATS[0][0]);
    let k = 0;
    while (k < BEATS.length - 1 && t >= BEATS[k + 1][0]) k++;
    const row = BEATS[k];
    for (let j = 0; j < BPB; j++) if (t < row[j + 1] || j === BPB - 1) return k * BPB + j + (t - row[j]) / (row[j + 1] - row[j]);
  }
  const barLen = (k) => (BEATS[k][BPB] - BEATS[k][0]) / BPB;
  const notes = SC.notes.map(([t, pitch, dur, voice, bar, beat], i) => ({
    t, pitch, dur, voice, bar, beat, i,
    color: LETTER_COLOR[LETTER[pitch % 12]],
    // diatonic step on a treble staff, 0 = E4 (bottom line), 4 = B4 (middle line)
    step: Math.floor(pitch / 12 - 1) * 7 + LETTER[pitch % 12] - 30,
    len: dur * barLen(Math.min(bar, BEATS.length - 1)),
  }));
  const melody = notes.filter((n) => n.voice === 0);
  function press(t, voice) {
    let v = 0;
    for (const n of notes) if (n.voice === voice && t >= n.t && t - n.t < 0.6) v = Math.max(v, Math.exp(-(t - n.t) / 0.14));
    return v;
  }

  // ---------- staff and notes ----------
  let SP = 13, SPEED = 250; // staff spacing; notes travel at a constant speed, so spacing = rhythm
  function path(points, wander = 16) {
    const s = stroke(points, { wobble: 0, step: 4 });
    s.wander = wander;
    return s;
  }
  function at(P, d) {
    d = clamp(d, 0, P.L);
    let lo = 0, hi = P.N - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.len[m] <= d) lo = m; else hi = m; }
    const k = (d - P.len[lo]) / (P.len[hi] - P.len[lo] || 1);
    let nx = lerp(P.nx[lo], P.nx[hi], k), ny = lerp(P.ny[lo], P.ny[hi], k);
    if (ny > 0) { nx = -nx; ny = -ny; } // "up" on the staff is always up the screen
    const w = P.wander * Math.sin(d / 120 + 0.6) + 0.3 * P.wander * Math.sin(d / 43);
    return [lerp(P.xs[lo], P.xs[hi], k) + nx * w, lerp(P.ys[lo], P.ys[hi], k) + ny * w, nx, ny];
  }
  // the staff is drawn out by the first note as it travels (unless full: true)
  function staff(ctx, P, t, o = {}) {
    const lead = o.full ? P.L : clamp(SPEED * (t - melody[0].t) - (o.offset || 0) + 40, 0, P.L);
    if (lead <= 0) return;
    ctx.save();
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = o.w || 1.4; ctx.lineCap = 'round';
    for (let l = -2; l <= 2; l++) {
      ctx.beginPath();
      for (let d = 0; d <= lead; d += 8) {
        const [x, y, nx, ny] = at(P, d), off = l * SP + 0.4 * noise(d / 50 + Pen.clock * 0.6, l + 9);
        ctx.globalAlpha = 0.5 * Math.min(1, d / 60, (P.L - d) / 90) * (o.alpha == null ? 1 : o.alpha);
        d ? ctx.lineTo(x + nx * off, y + ny * off) : ctx.moveTo(x + nx * off, y + ny * off);
        if (d % 48 === 0) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + nx * off, y + ny * off); }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // born: the source is on screen, so notes pop where they start; offset: arc length already
  // travelled before this path begins (for paths whose source is off screen)
  function riders(ctx, P, t, o = {}) {
    const offset = o.offset || 0, scale = o.scale || 1, list = o.voice == null ? melody : notes.filter((n) => n.voice === o.voice);
    for (const n of list) {
      if (t < n.t) break;
      const d = SPEED * (t - n.t) - offset;
      if (d < -20 || d > P.L) continue;
      const [x, y, nx, ny] = at(P, Math.max(0, d));
      const fade = Math.min(1, (P.L - d) / 90) * (o.born ? 1 : clamp((d + 20) / 60));
      const pop = o.born && t - n.t < 0.5 ? 1 + 0.6 * Math.exp(-(t - n.t) / 0.09) : 1;
      if (o.born && t - n.t < 0.35) burst(ctx, x, y, t - n.t);
      noteGlyph(ctx, x, y, Math.atan2(-nx, ny), n, scale * pop, fade, nx, ny);
    }
  }
  function burst(ctx, x, y, age) {
    const k = age / 0.35;
    ctx.save(); ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = Pen.INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.3, r0 = 14 + 16 * k, r1 = r0 + 8;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }
  // height from pitch; hollow / stem / flags from length; ornaments drawn small
  function noteGlyph(ctx, x, y, ang, n, scale, alpha, nx = 0, ny = -1) {
    if (alpha <= 0) return;
    const off = (n.step - 4) * SP / 2;
    ctx.save();
    ctx.translate(x + nx * off, y + ny * off); ctx.rotate(ang);
    const grace = n.dur < 0.15, s = scale * (grace ? 0.66 : 1), rx = 7.4 * s, ry = 5.4 * s;
    ctx.globalAlpha = alpha; ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    for (let L = 10; L <= n.step; L += 2) { const yy = -(L - n.step) * SP / 2; ctx.beginPath(); ctx.moveTo(-rx * 1.7, yy); ctx.lineTo(rx * 1.7, yy); ctx.stroke(); }
    for (let L = -2; L >= n.step; L -= 2) { const yy = -(L - n.step) * SP / 2; ctx.beginPath(); ctx.moveTo(-rx * 1.7, yy); ctx.lineTo(rx * 1.7, yy); ctx.stroke(); }
    const hollow = n.dur >= 1.5;
    if (!hollow) crayon(pts.ellipse(0, 0, rx * 1.05, ry * 1.05, 0, 1).map(([a, b]) => [a * 0.95 + b * 0.3, b - a * 0.3]), n.color, { alpha: 0.95 * alpha, dx: 1.5, dy: -1, seed: 7 + n.i });
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, -0.32, 0, Math.PI * 2); ctx.stroke();
    if (hollow) crayon(pts.ellipse(0, 0, rx * 0.5, ry * 0.5, 0, 1), n.color, { alpha: 0.9 * alpha, dx: 0, dy: 0, seed: 7 + n.i });
    const up = n.step < 4, sx = up ? rx * 0.92 : -rx * 0.92, sy = (up ? -1 : 1) * 3.3 * SP * s;
    ctx.beginPath(); ctx.moveTo(sx, up ? -1 : 1); ctx.lineTo(sx, sy); ctx.stroke();
    const flags = n.dur <= 0.26 ? 2 : n.dur <= 0.5 ? 1 : 0;
    for (let f = 0; f < flags; f++) {
      const fy = sy + (up ? 1 : -1) * f * 6 * s;
      ctx.beginPath(); ctx.moveTo(sx, fy); ctx.quadraticCurveTo(sx + 9 * s, fy + (up ? 7 : -7) * s, sx + 7 * s, fy + (up ? 16 : -16) * s); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function clef(ctx, P, alpha = 1) {
    const [x, y, nx, ny] = at(P, 26), S = SP * 7.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(-nx, ny)); ctx.scale(S, S);
    ctx.globalAlpha = alpha; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4 / S; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of window.FONTS.clef) { ctx.beginPath(); for (let i = 0; i < s.length; i += 2) i ? ctx.lineTo(s[i], s[i + 1] + 0.05) : ctx.moveTo(s[i], s[i + 1] + 0.05); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------- a keyboard from above ----------
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  function keys(ctx, t, o) {
    const K = Object.assign({ lo: 48, hi: 74, x0: -10, y0: 380, len: 400, width: 1100, tilt: -0.06, t0: 0, cx: 540, cy: 520 }, o);
    if (!K.cache) {
      let whites = 0;
      for (let q = K.lo; q <= K.hi; q++) if (WHITE.includes(q % 12)) whites++;
      K.w = K.width / whites;
      K.rect = (p) => {
        let n = 0;
        for (let q = K.lo; q < p; q++) if (WHITE.includes(q % 12)) n++;
        return WHITE.includes(p % 12) ? { x: K.x0 + n * K.w, w: K.w, black: false, len: K.len } : { x: K.x0 + n * K.w - K.w * 0.3, w: K.w * 0.6, black: true, len: K.len * 0.62 };
      };
      K.white = []; K.black = [];
      for (let q = K.lo; q <= K.hi; q++) { const r = K.rect(q); (r.black ? K.black : K.white).push([q, r, stroke(pts.rect(r.x, K.y0, r.x + r.w, K.y0 + r.len), { wobble: 1.1 })]); }
      K.rail = group([[[-20, K.y0 - 40], [K.width, K.y0 - 40]], [[-20, K.y0 - 4], [K.width, K.y0 - 4]]]);
      K.hands = [null, null];
      K.cache = true;
      Object.assign(o, K);
    }
    const R = (a, b) => seg(t, K.t0 - 0.2 + a, K.t0 - 0.2 + b);
    const sounding = (q) => {
      let v = 0, col = null;
      for (const n of notes) if (n.pitch === q && t >= n.t - 0.02 && t < n.t + n.len + 0.25) {
        const a = clamp((t - n.t + 0.02) / 0.06) * (1 - seg(t, n.t + n.len, n.t + n.len + 0.25));
        if (a > v) { v = a; col = n.color; }
      }
      return [v, col];
    };
    ctx.save(); ctx.translate(K.cx, K.cy); ctx.rotate(K.tilt); ctx.translate(-K.cx, -K.cy);
    crayon([[-20, K.y0 - 40], [K.width, K.y0 - 40], [K.width, K.y0 - 4], [-20, K.y0 - 4]], C.brown, { prog: R(0.1, 0.4), dx: 3, dy: -2 });
    inkGroup(K.rail, R(0, 0.25));
    K.white.forEach(([q, r, s], i) => {
      const [v, col] = sounding(q);
      if (v > 0) crayon(pts.rect(r.x + 3, K.y0 + 4, r.x + r.w - 3, K.y0 + r.len - 4), col, { alpha: 0.9 * v, dx: 2, dy: 2, seed: q });
      ink(s, { prog: R(0.05 + i * 0.012, 0.3 + i * 0.012), w: 2.6 });
    });
    K.black.forEach(([q, r], i) => {
      const [v, col] = sounding(q);
      ctx.globalAlpha = R(0.3 + i * 0.012, 0.4 + i * 0.012); ctx.fillStyle = Pen.INK; ctx.fillRect(r.x, K.y0, r.w, r.len); ctx.globalAlpha = 1;
      if (v > 0) crayon(pts.rect(r.x + 4, K.y0 + 4, r.x + r.w - 4, K.y0 + r.len - 6), col, { alpha: v, dx: 1, dy: 1, seed: q });
    });
    // hands follow the voices; sleeves come in from the bottom of the frame
    for (const voice of [1, 0]) {
      let cur = null;
      for (const n of notes) if (n.voice === voice && n.t <= t + 0.12 && (!cur || n.t > cur.t)) cur = n;
      const ha = R(0.4, 0.7);
      if (!cur || ha <= 0 || cur.pitch < K.lo || cur.pitch > K.hi) continue;
      const r = K.rect(cur.pitch), target = r.x + r.w / 2;
      K.hands[voice] = K.hands[voice] == null || Math.abs(K.hands[voice] - target) > 400 ? target : lerp(K.hands[voice], target, 0.35);
      const push = press(t, voice);
      ctx.save(); ctx.globalAlpha = ha; ctx.translate(K.hands[voice], K.y0 + K.len * 0.86 + push * 6);
      hand(ctx, push, o.sleeve || C.red, voice);
      ctx.restore();
    }
    ctx.restore();
    // melody notes rise off their keys, a piano roll read upwards
    for (const n of melody) {
      if (t < n.t || t - n.t > 3 || n.pitch < K.lo || n.pitch > K.hi) continue;
      const r = K.rect(n.pitch), age = t - n.t, kx = r.x + r.w / 2, ky = K.y0 - 60;
      const x = K.cx + (kx - K.cx) * Math.cos(K.tilt) - (ky - K.cy) * Math.sin(K.tilt);
      const y0 = K.cy + (kx - K.cx) * Math.sin(K.tilt) + (ky - K.cy) * Math.cos(K.tilt), y = y0 - age * 120;
      noteGlyph(ctx, x, y, 0, Object.assign({}, n, { step: 4 }), 1.7 * (1 + 0.5 * Math.exp(-age / 0.09)), clamp((y + 40) / 120));
      if (age < 0.35) burst(ctx, x, y0, age);
    }
  }
  // a mitten-like hand with four short fingers; the second one reaches to press
  function hand(ctx, push, sleeve, seed) {
    const palm = pts.curve([[-44, 10], [-40, -22], [-20, -36], [0, -40], [22, -36], [42, -20], [46, 12], [30, 40], [-30, 40], [-44, 10]], 5);
    crayon([[-40, 30], [40, 30], [44, 260], [-44, 260]], sleeve, { dx: 3, dy: 0, seed: 95 + seed });
    crayon(palm, C.skin, { dx: 2, dy: -2, seed: 90 + seed, alpha: 1 });
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); palm.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    [[-28, -26, -48], [-9, -36, -62 - push * 8], [10, -36, -54], [29, -28, -46]].forEach(([x, y0, y1], j) => {
      crayon([[x - 8, y0 + 4], [x - 8, y1 + 6], [x + 8, y1 + 6], [x + 8, y0 + 4]], C.skin, { dx: 0, dy: 0, alpha: 1, seed: 92 + j });
      ctx.beginPath(); ctx.moveTo(x - 8, y0); ctx.lineTo(x - 8, y1 + 8); ctx.quadraticCurveTo(x, y1 - 2, x + 8, y1 + 8); ctx.lineTo(x + 8, y0); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(-40, 34); ctx.lineTo(-44, 260); ctx.moveTo(40, 34); ctx.lineTo(44, 260); ctx.moveTo(-42, 52); ctx.lineTo(42, 52); ctx.stroke();
  }

  // ---------- the bass as stepping stones ----------
  // o: { t0, names: ['G', ...], contour: [7, ...], current: index landing at t0, floor: 250 }
  function ground(ctx, t, o) {
    const G = o, FLOOR = G.floor || 250, n = G.names.length;
    const stone = (i) => [140 + i * (800 / (n - 1)), 720 - G.contour[i] * 36];
    if (!G.cache) {
      const r = rng(9);
      G.floorG = group([[[-20, FLOOR], [1100, FLOOR + 2]], [[-20, FLOOR + 12], [1100, FLOOR + 12]]]);
      G.soil = [[-20, FLOOR + 12], [1100, FLOOR + 12], [1100, 900], [-20, 900]];
      G.strata = group(Array.from({ length: 34 }, () => { const x = r() * 1080, y = FLOOR + 40 + r() * 600, l = 20 + r() * 60; return [[x, y], [x + l, y + (r() - 0.5) * 4]]; }), { wobble: 0.8 });
      G.pebbles = group(Array.from({ length: 18 }, () => pts.ellipse(r() * 1080, FLOOR + 60 + r() * 560, 5 + r() * 6, 4 + r() * 3, r() * 6, 1.04)), { wobble: 0.5 });
      G.stones = G.names.map((_, i) => { const [x, y] = stone(i); return stroke(pts.ellipse(x, y, 54, 42, -2.4 + i, 1.06), { wobble: 2 }); });
      G.pathG = group(G.names.slice(1).map((_, i) => [stone(i), stone(i + 1)]), { wobble: 1.5 });
      G.letters = G.names.map((s, i) => { const [x, y] = stone(i); return text(s, 'tech', x, y + 16, 44, { align: 'center' }); });
      G.cache = true;
    }
    const t0 = G.t0, R = (a, b) => seg(t, t0 - 0.2 + a, t0 - 0.2 + b);
    crayon(G.soil, C.soil, { prog: R(0, 0.5), alpha: 0.32, dx: 0, dy: 0, seed: 71 });
    inkGroup(G.floorG, R(0, 0.3), { w: 3.2 });
    inkGroup(G.strata, R(0.2, 0.7), { w: 1.6, alpha: 0.7 });
    inkGroup(G.pebbles, R(0.3, 0.7), { w: 1.8 });
    inkGroup(G.pathG, R(0.3, 0.8), { w: 1.6, color: Pen.GUIDE, alpha: 0.9 });
    G.names.forEach((_, i) => {
      const [x, y] = stone(i);
      if (i < G.current) {
        crayon(pts.ellipse(x, y, 54, 42, 0, 1), C.stone, { prog: R(0.1 + i * 0.06, 0.35 + i * 0.06), dx: 5, dy: -3, seed: 80 + i });
        ink(G.stones[i], { prog: R(0.05 + i * 0.06, 0.3 + i * 0.06), w: 3 });
        write(G.letters[i], R(0.3 + i * 0.06, 0.5 + i * 0.06), { w: 2.8 });
      } else if (i === G.current) {
        // lands on the downbeat, with a little dust
        const fall = ease(clamp((t - t0 + 0.05) / 0.32)), yy = lerp(y - 260, y, fall) - 10 * Math.sin(Math.PI * clamp((t - t0 - 0.27) / 0.22));
        if (t <= t0 - 0.05) return;
        crayonEllipse(x, yy, 64, 52, C.orange, { alpha: 0.55 * seg(t, t0 + 0.25, t0 + 0.5) * (1 - seg(t, t0 + 1.5, t0 + 3)), dx: 0, dy: 0, seed: 88 });
        crayon(pts.ellipse(x, yy, 54, 42, 0, 1), C.stone, { dx: 5, dy: -3, seed: 85 });
        ctx.save(); ctx.translate(0, yy - y); ink(G.stones[i], { w: 3 }); write(G.letters[i], 1, { w: 2.8 }); ctx.restore();
        const d = clamp((t - t0 - 0.27) / 0.5);
        if (d > 0 && d < 1) {
          ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2; ctx.globalAlpha = 1 - d;
          for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + s * (60 + d * 30), y + 30 - j * 12); ctx.lineTo(x + s * (74 + d * 44), y + 26 - j * 16); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      } else {
        // bars still to come are already pencilled in
        guide(G.stones[i], { prog: R(0.5, 0.8), alpha: 0.9 });
        write(G.letters[i], R(0.6, 0.9), { w: 1.6, color: Pen.GUIDE, alpha: 0.9 });
      }
    });
  }

  // ---------- small characters' parts ----------
  function eye(ctx, x, y, r, open, look = [0, 0]) {
    if (open < 0.1) {
      ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.8, 0.35, Math.PI - 0.35); ctx.stroke();
      return;
    }
    const lid = y - r + (1 - open) * r * 1.7;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    crayon(pts.ellipse(x, y, r, r, 0, 1), C.yellow, { dx: 1.5, dy: -1, alpha: 0.85 });
    ctx.fillStyle = Pen.INK;
    const px = x + look[0] * r * 0.25, py = y + look[1] * r * 0.25;
    ctx.beginPath(); ctx.arc(px, py, r * 0.66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Pen.PAPER;
    ctx.beginPath(); ctx.arc(px - r * 0.25, py - r * 0.27, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + r * 0.22, py + r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    if (open < 1) { ctx.fillStyle = Pen.PAPER; ctx.fillRect(x - r - 2, y - r - 2, 2 * r + 4, lid - (y - r) + 2); }
    ctx.restore();
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    if (open < 1) { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - r * 1.05, lid + 1); ctx.quadraticCurveTo(x, lid + r * 0.28, x + r * 1.05, lid + 1); ctx.stroke(); }
  }
  // swings through the middle on every beat
  function pendulum(ctx, x, y, len, r, b) {
    const a = 0.34 * Math.sin(Math.PI * b), bx = x + Math.sin(a) * len, by = y + Math.cos(a) * len;
    ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.2, r * 0.24); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();
    crayonEllipse(bx, by, r, r, C.yellow, { dx: r * 0.2, dy: -r * 0.1 });
    ctx.lineWidth = Math.max(2.4, r * 0.18); ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ---------- paper ----------
  let grain = null, marginGrad = null;
  function paper(ctx) {
    ctx.fillStyle = Pen.PAPER; ctx.fillRect(0, 0, 1080, 1080);
    if (!grain) {
      grain = document.createElement('canvas'); grain.width = grain.height = 1080;
      const g = grain.getContext('2d'), r = rng(3);
      for (let i = 0; i < 26000; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(120,100,70,0.05)' : 'rgba(255,255,255,0.10)';
        g.fillRect(r() * 1080, r() * 1080, 1 + r() * 2, 1 + r() * 2);
      }
      for (let i = 0; i < 14; i++) {
        const x = r() * 1080, y = r() * 1080, rad = 80 + r() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(150,120,80,0.035)'); gr.addColorStop(1, 'rgba(150,120,80,0)');
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    ctx.drawImage(grain, 0, 0);
  }
  // keeps the bottom of the sheet clear for the caption
  function margin(ctx) {
    if (!marginGrad) { marginGrad = ctx.createLinearGradient(0, 892, 0, 935); marginGrad.addColorStop(0, 'rgba(244,239,228,0)'); marginGrad.addColorStop(1, 'rgba(244,239,228,0.92)'); }
    ctx.fillStyle = marginGrad; ctx.fillRect(0, 892, 1080, 188);
  }

  // ---------- the film: shots, captions, bass strip, closing card ----------
  // shots: [{ start: seconds, draw(ctx, t, k), caption?: string }]
  // opt:   { duration, dissolve, strip: { names, contour } | null, final: { at, title, size, credit } }
  function film(shots, opt) {
    const DISSOLVE = opt.dissolve == null ? 0.22 : opt.dissolve;
    const caps = shots.map((s) => text(s.caption || '', 'tech', 540, 1026, 42, { align: 'center' }));
    const fin = opt.final && [text(opt.final.title, 'tech', 540, 1010, opt.final.size || 86, { align: 'center' }), text(opt.final.credit || '', 'tech', 540, 1054, 18, { align: 'center' })];
    let stripG = null, off = null;

    function strip(ctx, t) {
      const S = opt.strip;
      if (!S) return;
      const P = S.contour.map((v, i) => [540 + (i - (S.contour.length - 1) / 2) * 46, 946 - v * 4.4]);
      if (!stripG) stripG = { links: P.slice(1).map((q, i) => stroke([P[i], q], { wobble: 0.3, step: 2 })), names: S.names.map((n, i) => text(n, 'tech', P[i][0], 980, 18, { align: 'center', wobble: 0.2 })) };
      const a = opt.final ? 1 - seg(t, opt.final.at - 0.4, opt.final.at) : 1;
      if (a <= 0) return;
      let cur = -1;
      for (let i = 0; i < P.length; i++) if (t >= BARS[i] - 0.02) cur = i;
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i <= cur; i++) {
        const [x, y] = P[i], age = t - BARS[i];
        if (i > 0) ink(stripG.links[i - 1], { prog: clamp(age / 0.25), w: 1.6, alpha: 0.75 * a });
        if (i === cur) crayonEllipse(x, y, 10, 10, C.orange, { alpha: 0.9 * a, dx: 1, dy: -1, seed: 100 + i });
        ctx.fillStyle = Pen.INK; ctx.beginPath(); ctx.arc(x, y, 3.2 * (1 + 0.8 * Math.exp(-age / 0.12)), 0, Math.PI * 2); ctx.fill();
      }
      if (cur >= 0) write(stripG.names[cur], 1, { w: 1.8, alpha: 0.9 * a });
      ctx.restore();
    }
    function captions(ctx, t, i) {
      const s = shots[i];
      if (s.caption) {
        const t0 = Math.max(0, s.start) + 0.1, next = i + 1 < shots.length ? shots[i + 1].start - 0.1 : (opt.final ? opt.final.at : 1e9);
        write(caps[i], clamp((t - t0) / Math.max(0.8, s.caption.length / 16)), { alpha: 0.95 * clamp((next - t) / 0.3), w: 2.9 });
      }
      if (fin) {
        write(fin[0], seg(t, opt.final.at, opt.final.at + 0.9), { w: 3.6 });
        write(fin[1], seg(t, opt.final.at + 0.7, opt.final.at + 1.5), { w: 1.6, alpha: 0.85 });
      }
    }
    function drawShot(canvas, i, t) {
      const ctx = canvas.getContext('2d'), k = canvas.width / 1080;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      Pen.begin(ctx, t);
      paper(ctx);
      shots[i].draw(ctx, t, k);
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
    }
    return function frame(canvas, t) {
      let i = 0;
      while (i < shots.length - 1 && t >= shots[i + 1].start) i++;
      drawShot(canvas, i, t);
      const ctx = canvas.getContext('2d'), k = canvas.width / 1080;
      // soft cut: the next shot fades in just ahead of its downbeat
      if (i < shots.length - 1 && t > shots[i + 1].start - DISSOLVE) {
        if (!off || off.width !== canvas.width) { off = document.createElement('canvas'); off.width = off.height = canvas.width; }
        drawShot(off, i + 1, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = smooth((t - shots[i + 1].start + DISSOLVE) / DISSOLVE);
        ctx.drawImage(off, 0, 0);
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(k, 0, 0, k, 0, 0);
      Pen.begin(ctx, t);
      margin(ctx);
      strip(ctx, t);
      captions(ctx, t, i);
    };
  }

  // world camera: centre (cx, cy) at zoom z
  function camera(ctx, k, cx, cy, z) { ctx.setTransform(k * z, 0, 0, k * z, k * (540 - cx * z), k * (540 - cy * z)); }
  const camLerp = (t, a, b, k0, k1, ez = smooth) => { const k = ez(seg(t, k0, k1)); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), k))]; };

  window.Kit = {
    C, BARS, BEATS, notes, melody, beatAt, press,
    path, at, staff, riders, noteGlyph, clef, burst, keys, hand, ground, eye, pendulum,
    paper, margin, film, camera, camLerp,
    set spacing(v) { SP = v; }, set speed(v) { SPEED = v; }, get speed() { return SPEED; },
  };
})();
