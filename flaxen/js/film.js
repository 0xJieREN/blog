// "la fille aux cheveux de lin", about 80 seconds.
// Debussy's prelude opens with one unaccompanied line. A pen draws that line as it is played;
// the chords bring colour under it; the line becomes her hair; the tune drifts off on the wind
// while a lark climbs with the middle phrase; the theme comes back to her; the closing
// arpeggio lifts the sun and the whole sky turns gold.
// Everything moves slowly: long dissolves, slow cameras, motion that is continuous in t.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, text, write, seg, smooth, ease, clamp, lerp, noise, rng } = Pen;
  const K = Kit, C = K.C, B = K.BARS;
  const DURATION = 81.2;
  const FLAX = '#efcf7e', FLAX_DEEP = '#d9ae55', ALFALFA = '#9b7fd1', DRESS = '#a8c6e6', SKY = '#f3c98b', BLUSH = '#f2a6a0';
  const mel = K.melody, low = K.notes.filter((n) => n.voice === 1);
  const between = (list, a, b) => list.filter((n) => n.t >= a - 0.01 && n.t < b - 0.01);

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
  const strands = [-15, -8, 8, 15].map((o, i) => stroke(LINE.map(([x, y], j) => [x, y + o * (0.6 + 0.4 * Math.sin(j / 30 + i))]), { seed: 50 + i, wobble: 1, step: 3 }));
  // each chord under the line leaves a soft wash of colour
  const WASH = [];
  for (const n of between(low, 7.4, B[1])) {
    if (WASH.length && n.t - WASH[WASH.length - 1].t < 0.5) continue;
    const [x] = lineAt(n.t);
    WASH.push({ t: n.t, x, y: 640 + (n.pitch % 7) * 12, r: 70 + (n.pitch % 5) * 14, c: [SKY, ALFALFA, BLUSH, FLAX, DRESS][WASH.length % 5] });
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
  function shotLine(ctx, t, k) {
    const tt = Math.min(t, LINE_END), [px, py] = lineAt(Math.max(T0, tt));
    // the camera keeps the pen a little right of centre once it gets there
    K.camera(ctx, k, Math.max(540, px - 240), 520, 1);
    for (const w of WASH) {
      const g = ease(clamp((t - w.t) / 1.1));
      if (g > 0) crayonEllipse(w.x, w.y, w.r * (0.5 + 0.5 * g), w.r * 0.55 * (0.5 + 0.5 * g), w.c, { alpha: 0.3 * g, dx: 0, dy: 0, seed: (w.x | 0) });
    }
    const hair = seg(t, 12.8, 15.0);
    if (hair > 0) {
      const band = LINE.map(([x, y]) => [x, y - 17]).concat(LINE.map(([x, y]) => [x, y + 17]).reverse());
      crayon(band, FLAX, { prog: hair, dx: 3, dy: -2, alpha: 0.75, seed: 61 });
      strands.forEach((s, i) => ink(s, { prog: seg(t, 12.8 + i * 0.15, 14.8 + i * 0.05), w: 1.4, alpha: 0.7 }));
    }
    ink(lineStroke, { prog: clamp((tt - T0) / (LINE_END - T0)), w: 3.2 });
    for (const n of LINE_NOTES) {
      if (n.t > tt) break;
      const [nx, ny] = lineAt(n.t + 0.3);
      K.noteGlyph(ctx, nx, ny, 0, Object.assign({}, n, { step: 4 }), 0.85 * (1 + 0.5 * Math.exp(-(t - n.t) / 0.09)), 1);
    }
    if (t > T0 - 0.5) pen(ctx, px, py, smooth(seg(t, 13.6, 15.0)) + (t < T0 ? (T0 - t) * 2 : 0));
  }

  // ===================== the girl =====================
  // 3/4 view, facing a little left. Local units: the face is about 210 x 250.
  const G = {
    face: stroke(pts.curve([[-100, -50], [-106, 20], [-90, 82], [-50, 118], [-10, 130], [40, 116], [86, 70], [102, 0], [100, -60]], 8), { wobble: 1.2 }),
    lids: [[-52, 6], [26, 4]].map(([x, y]) => stroke(pts.arc(x, y, 17, 11, 0.25, Math.PI - 0.25), { wobble: 0.3 })),
    lashes: group([[-52, 6], [26, 4]].flatMap(([x, y]) => [0.6, 1.5, 2.4].map((a) => [[x + Math.cos(a) * 17, y + Math.sin(a) * 11], [x + Math.cos(a) * 23, y + Math.sin(a) * 16]])), { wobble: 0.2 }),
    brows: group([pts.arc(-54, -26, 20, 6, Math.PI + 0.4, 2 * Math.PI - 0.3), pts.arc(26, -28, 18, 6, Math.PI + 0.3, 2 * Math.PI - 0.4)], { wobble: 0.3 }),
    nose: stroke(pts.curve([[-18, 30], [-24, 46], [-14, 50]]), { wobble: 0.3 }),
    smile: stroke(pts.curve([[-30, 78], [-14, 86], [4, 79]]), { wobble: 0.3 }),
    neck: group([[[-36, 118], [-40, 178]], [[34, 112], [40, 172]]]),
    shoulders: group([pts.curve([[-40, 176], [-120, 196], [-176, 236], [-200, 330], [-204, 420]]), pts.curve([[40, 172], [118, 190], [176, 232], [200, 330], [204, 420]]),
      pts.curve([[-40, 176], [-20, 200], [0, 206], [20, 200], [40, 172]])]),
    dress: [[-40, 178], [40, 172], [118, 190], [176, 232], [200, 330], [204, 430], [-204, 430], [-200, 330], [-176, 236], [-120, 196]],
    collar: [[-40, 178], [-20, 202], [0, 208], [20, 202], [40, 172], [10, 190], [-10, 192]],
  };

  // ---- hair: about seventy fine strands, each growing from the parting, following the shape
  // of the head, and only then falling: over the shoulder on the face side, and behind her,
  // lifted by the breeze, on the other. So the hair and the head are one shape.
  const SKULL = { cx: 0, cy: -16, rx: 116, ry: 150 };
  const rim = (phi, k = 1) => [SKULL.cx + Math.cos(phi) * SKULL.rx * k, SKULL.cy + Math.sin(phi) * SKULL.ry * k];
  const partAt = (f) => [-6 + 3 * f, lerp(-166, -116, f)];
  const HAIR_INK = '#8d6a35';
  const r2 = rng(23);
  const STRANDS = [];
  // [side, f in 0..1 (0 = outermost, 1 = along the hairline), exit angle on the head, tail angle, tail length]
  for (let k = 0; k < 26; k++) { const f = k / 25; STRANDS.push({ side: -1, f, exit: lerp(-2.05, -3.18, f), a0: lerp(1.66, 1.74, r2()), len: 230 + 90 * r2(), ph: 0.4 + f * 1.6, amp: 7, curl: -0.25 - 0.2 * r2() }); }
  for (let k = 0; k < 46; k++) { const f = k / 45; STRANDS.push({ side: 1, f, exit: lerp(-1.15, 0.72, f), a0: lerp(0.62, 1.38, f) + (r2() - 0.5) * 0.1, len: lerp(430, 360, f) + 50 * r2(), ph: f * 2.4, amp: lerp(30, 20, f), curl: 0.18 + 0.2 * r2() }); }
  // the part of a strand that lies on the head: from the parting, bowed out to the rim
  for (const st of STRANDS) {
    const P = partAt(st.f), E = rim(st.exit, 1.02), mid = (Math.atan2(P[1] - SKULL.cy, P[0]) + st.exit) / 2;
    const Cc = rim(st.side < 0 ? lerp(-1.75, -2.6, st.f) : lerp(-1.3, -0.4, st.f), lerp(1.06, 0.9, st.f));
    st.head = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; st.head.push([(1 - u) * (1 - u) * P[0] + 2 * u * (1 - u) * Cc[0] + u * u * E[0], (1 - u) * (1 - u) * P[1] + 2 * u * (1 - u) * Cc[1] + u * u * E[1]]); }
  }
  // the part that hangs free, moving with the breeze; neighbouring strands move together
  function strandTail(st, t, wind) {
    const N = 30, out = [];
    let [x, y] = st.head[st.head.length - 1];
    for (let i = 0; i <= N; i++) {
      const s = i / N, a = st.a0 + (0.08 + 0.2 * s) * Math.sin(s * 6 + st.ph) + st.curl * Math.pow(s, 3);
      if (i) { x += Math.cos(a) * st.len / N; y += Math.sin(a) * st.len / N; }
      const sway = st.amp * wind * Math.pow(s, 1.6) * Math.sin(Math.PI * 2 * 0.22 * t - 3 * s + st.ph);
      out.push([x - Math.sin(a) * sway, y + Math.cos(a) * sway]);
    }
    return out;
  }
  // the crown: between the outline of the head and the hairline traced by the innermost strands
  const innerL = STRANDS.find((x) => x.side < 0 && x.f === 1).head, innerR = STRANDS.find((x) => x.side > 0 && x.f === 1).head;
  const CROWN = [];
  for (let phi = -3.18; phi <= 0.72; phi += 0.05) CROWN.push(rim(phi, 1.02));
  CROWN.push(...innerR.slice().reverse(), ...innerL);
  function polyline(ctx, P, upto) {
    const n = Math.max(2, Math.round(P.length * upto));
    ctx.beginPath(); for (let i = 0; i < n; i++) i ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]); ctx.stroke();
  }
  // soft colour underneath, then the strands themselves
  function drawStrands(ctx, list, part, t, wind, R, s) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const paths = list.map((st) => (part === 'head' ? st.head : strandTail(st, t, st.side < 0 ? wind * 0.5 : wind)));
    ctx.strokeStyle = FLAX; ctx.globalAlpha = 0.16; ctx.lineWidth = 16;
    paths.forEach((P, i) => { const pr = R(0.25 + list[i].f * 0.3, 1.1 + list[i].f * 0.3); if (pr > 0) polyline(ctx, P, pr); });
    const thin = 1 / Math.pow(s, 0.7);
    paths.forEach((P, i) => {
      const st = list[i], pr = R(0.25 + st.f * 0.3, 1.1 + st.f * 0.3);
      if (pr <= 0) return;
      const edge = st.f === 0 || st.f === 1, navy = edge || (Math.round(st.f * 45) % 5 === 0);
      // on the head the strands crowd together, so draw them lighter there
      const onHead = part === 'head', dark = edge && !(onHead && st.f === 1 && st.side > 0);
      ctx.strokeStyle = dark || (navy && !onHead) ? Pen.INK : HAIR_INK;
      ctx.globalAlpha = dark ? 0.8 : onHead ? 0.42 : navy ? 0.45 : 0.65;
      ctx.lineWidth = (dark ? 1.7 : onHead ? 0.8 : navy ? 1.1 : 0.9) * thin;
      polyline(ctx, P, pr);
    });
    ctx.globalAlpha = 1;
  }
  // where her mouth is, for notes to come from
  const mouthOf = (o) => [o.x + o.s * -14, o.y + o.s * 82];
  function girl(ctx, t, o) {
    const R = (a, b) => seg(t, o.reveal + a, o.reveal + b);
    const wind = o.wind == null ? 1 : o.wind;
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s, o.s);
    const W = 3 / Math.sqrt(o.s);
    const back = STRANDS.filter((x) => x.side > 0), front = STRANDS.filter((x) => x.side < 0);
    drawStrands(ctx, back, 'tail', t, wind, R, o.s);
    crayon(G.dress, DRESS, { prog: R(0.5, 1.0), dx: 5, dy: -3, seed: 64 });
    crayon(G.collar, Pen.PAPER, { prog: R(0.7, 1.0), dx: 0, dy: 0, alpha: 1, seed: 65 });
    inkGroup(G.shoulders, R(0.4, 0.8), { w: W * 0.9 });
    inkGroup(G.neck, R(0.3, 0.5), { w: W * 0.8 });
    // face: paper first, so the hair behind it stays behind
    ctx.fillStyle = Pen.PAPER; ctx.beginPath(); ctx.ellipse(0, 10, 104, 124, 0, 0, Math.PI * 2); ctx.fill();
    ink(G.face, { prog: R(0, 0.5), w: W });
    crayonEllipse(-66, 52, 20, 12, BLUSH, { prog: R(0.6, 0.8), alpha: 0.7, dx: 0, dy: 0 });
    crayonEllipse(46, 50, 16, 10, BLUSH, { prog: R(0.6, 0.8), alpha: 0.6, dx: 0, dy: 0 });
    ink(G.nose, { prog: R(0.5, 0.6), w: W * 0.8 });
    inkGroup(G.brows, R(0.55, 0.7), { w: W * 0.7, alpha: 0.8 });
    if (o.open) {
      K.eye(ctx, -50, 4, 15, o.open, o.look || [-0.3, -0.8]);
      K.eye(ctx, 26, 2, 14, o.open, o.look || [-0.3, -0.8]);
    } else {
      G.lids.forEach((l) => ink(l, { prog: R(0.5, 0.7), w: W }));
      inkGroup(G.lashes, R(0.6, 0.75), { w: W * 0.6 });
    }
    // singing: the mouth opens a little with each note of the tune
    const sing = o.sing ? K.press(t, 0) : 0;
    ink(G.smile, { prog: R(0.6, 0.75), w: W * 0.8 });
    if (sing > 0.05) {
      // humming: the smile parts a little with each note
      ctx.strokeStyle = Pen.INK; ctx.lineWidth = W * 0.7; ctx.globalAlpha = Math.min(1, sing * 1.5);
      ctx.beginPath(); ctx.moveTo(-26, 81); ctx.quadraticCurveTo(-14, 82 + 9 * sing, 0, 81); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // the hair on the head, the parting, and the strands that fall in front of her shoulder
    crayon(CROWN, FLAX, { prog: R(0.2, 0.8), dx: 2, dy: -1, alpha: 0.75, seed: 66 });
    drawStrands(ctx, back, 'head', t, wind, R, o.s);
    drawStrands(ctx, front, 'head', t, wind, R, o.s);
    drawStrands(ctx, front, 'tail', t, wind, R, o.s);
    // a sprig of alfalfa behind her ear
    for (let j = 0; j < 5; j++) crayonEllipse(104 + Math.cos(j * 1.26) * 9, -78 + Math.sin(j * 1.26) * 8, 7, 7, ALFALFA, { prog: R(0.9, 1.1), dx: 0, dy: 0, seed: 70 + j });
    ctx.restore();
  }

  // ===================== notes on the wind =====================
  // each note leaves from its source when it is played, already at a height set by its pitch,
  // then drifts like a seed: steady wind, slow lift, a little sway and spin. All smooth in t.
  function drift(ctx, list, t, src, o = {}) {
    const life = o.life || 6, wind = o.wind || 70, lift = o.lift == null ? 16 : o.lift, scale = o.scale || 1, ps = o.pitchScale == null ? 7 : o.pitchScale;
    for (const n of list) {
      const age = t - n.t;
      if (age < 0 || age > life) continue;
      const [sx0, sy0] = typeof src === 'function' ? src(n) : src;
      const sx = sx0 + (o.ox || 0), sy = sy0 + (o.oy || 0);
      const ph = n.i * 1.7, ease0 = 1 - Math.exp(-age / 0.4);
      const x = sx + wind * age * ease0 + 16 * Math.sin(age * 0.9 + ph);
      const y = sy - (n.pitch - 66) * ps * ease0 - lift * age - 9 * Math.sin(age * 1.3 + ph * 0.7);
      const a = clamp(age / 0.35) * clamp((life - age) / 1.6);
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.22 * Math.sin(age * 0.8 + ph));
      K.noteGlyph(ctx, 0, 0, 0, Object.assign({}, n, { step: 4 }), scale * (0.65 + 0.35 * ease(age / 0.5)), a);
      ctx.restore();
    }
  }

  // ===================== the field =====================
  const FLOWERS = low.filter((n) => n.t > B[2] - 1).map((n, i) => ({ t: n.t, x: 30 + ((i * 397) % 1040), y: 660 + ((i * 131) % 210), s: 0.7 + (n.pitch % 5) * 0.12, c: [ALFALFA, ALFALFA, C.pink, '#b79be0'][i % 4] }));
  const r = rng(11);
  const GRASS = Array.from({ length: 80 }, () => { const x = -40 + r() * 1160, y = 640 + r() * 250; return [[x, y], [x + (r() - 0.5) * 10, y - 18 - r() * 18]]; });
  const CLOUD = [[-90, 20], [-80, -10], [-50, -28], [-16, -20], [10, -44], [50, -40], [70, -14], [96, -6], [100, 20], [-90, 20]];
  const field = {
    horizon: stroke(pts.curve([[-80, 620], [240, 596], [520, 612], [800, 590], [1160, 608]], 10), { wobble: 1.4 }),
    hills: stroke(pts.curve([[-80, 640], [300, 620], [640, 640], [1160, 625]], 10), { wobble: 1.2 }),
    grass: group(GRASS, { wobble: 0.4 }),
    clouds: [[220, 200, 1.0], [700, 150, 1.3], [960, 260, 0.8]].map(([x, y, s]) => {
      const p = pts.curve(CLOUD.map(([a, b]) => [a * s, b * s]), 6);
      return { x, y, poly: p, line: stroke(p, { wobble: 1 }) };
    }),
  };
  function flower(ctx, f, t) {
    const k = ease(clamp((t - f.t) / 0.8));
    if (k <= 0) return;
    const s = f.s * k, sway = 2 * Math.sin(t * 0.9 + f.x);
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + sway, f.y - 20 * s, f.x + 2 + sway, f.y - 34 * s); ctx.stroke();
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; crayonEllipse(f.x + 2 + sway + Math.cos(a) * 8 * s, f.y - 40 * s + Math.sin(a) * 7 * s, 6 * s, 6 * s, f.c, { dx: 0, dy: 0, seed: (j + f.x) | 0 }); }
  }
  function fieldLayer(ctx, t, reveal, o = {}) {
    const R = (a, b) => seg(t, reveal + a, reveal + b);
    field.clouds.forEach((c, i) => {
      ctx.save(); ctx.translate(c.x + 6 * t * (o.cloudDrift == null ? 1 : o.cloudDrift) - 200, c.y);
      crayon(c.poly, '#ffffff', { prog: R(0.3 + i * 0.2, 1.2 + i * 0.2), alpha: 0.7, dx: 3, dy: -2, seed: 90 + i });
      ink(c.line, { prog: R(0.2 + i * 0.2, 1.0 + i * 0.2), w: 2, alpha: 0.75 });
      ctx.restore();
    });
    crayon([[-80, 618], [1160, 606], [1160, 900], [-80, 900]], C.green, { prog: R(0.3, 1.2), alpha: 0.34, dx: 0, dy: 0, seed: 71 });
    ink(field.horizon, { prog: R(0, 0.8), w: 3.2 });
    ink(field.hills, { prog: R(0.2, 1.0), w: 2 });
    inkGroup(field.grass, R(0.5, 1.5), { w: 1.8, alpha: 0.8 });
    for (const f of FLOWERS) flower(ctx, f, t);
  }
  function sun(ctx, x, y, rad, t, rays, glow) {
    if (glow > 0) {
      const g = ctx.createRadialGradient(x, y, rad * 0.5, x, y, rad * 4);
      g.addColorStop(0, `rgba(${C.glow},${0.35 * glow})`); g.addColorStop(1, `rgba(${C.glow},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad * 4, y - rad * 4, rad * 8, rad * 8);
    }
    crayonEllipse(x, y, rad, rad, C.yellow, { dx: 9, dy: -6, seed: 81 });
    crayonEllipse(x, y, rad * 0.55, rad * 0.55, C.orange, { dx: 4, dy: -3, seed: 82, alpha: 0.8 });
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - 3, y + 2, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.6;
    const n = Math.floor(rays), part = rays - n;
    for (let i = 0; i < Math.ceil(rays); i++) {
      const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.27 + 0.02 * Math.sin(t * 0.9 + i);
      const r0 = rad + 18, r1 = rad + 18 + (30 + (i % 3) * 10) * (i < n ? 1 : part);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
    }
  }
  // a lark from the side: one wing beating, a little tail, flying left to right
  function lark(ctx, x, y, t, s) {
    const flap = Math.sin(t * Math.PI * 2 * 1.8);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = pts.curve([[-26, 0], [-14, -10], [8, -10], [22, -4], [30, 0], [22, 6], [4, 10], [-16, 8], [-26, 0]], 5);
    const tail = [[-24, 0], [-46, -8], [-44, 4], [-22, 4]];
    const wing = pts.curve([[-8, -6], [0, -16 - 30 * flap], [-16, -26 - 40 * flap], [-30, -18 - 34 * flap], [-14, -8], [-8, -6]], 5);
    crayon(tail, '#b8895a', { dx: 1, dy: -1, seed: 403 });
    crayon(body, '#c99a68', { dx: 2, dy: -1, seed: 401 });
    crayon(wing, '#a8784a', { dx: 1, dy: -1, seed: 402 });
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of [tail, body, wing]) { ctx.beginPath(); p.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(30, -1); ctx.lineTo(40, 1); ctx.lineTo(29, 3); ctx.stroke();
    ctx.fillStyle = Pen.INK; ctx.beginPath(); ctx.arc(20, -3, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ===================== the shots =====================
  const CLOSE = { x: 470, y: 470, s: 1.05, reveal: B[1] - 1.2 };

  // 2: her face, eyes closed, singing; the tune leaves her on the wind
  function shotFace(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [560, 540, 1.0], [520, 520, 1.08], B[1] - 1, B[2]);
    K.camera(ctx, k, cx, cy, z);
    crayon([[-100, -100], [1200, -100], [1200, 1200], [-100, 1200]], SKY, { alpha: 0.16 * seg(t, B[1] - 1, B[1] + 2), dx: 0, dy: 0, seed: 75 });
    girl(ctx, t, Object.assign({}, CLOSE, { sing: true }));
    drift(ctx, between(mel, B[1] - 2, B[2] + 1), t, mouthOf(CLOSE), { life: 6.5, wind: -60, lift: 36, pitchScale: 7, ox: -125, oy: -20 });
  }

  // 3: the field at dawn; a flower opens for each note of the harmony
  const FIELD_GIRL = { x: 360, y: 520, s: 0.4, reveal: B[1] - 1.2 };
  function shotField(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [500, 560, 1.08], [600, 540, 1.0], B[2] - 1.2, B[3]);
    K.camera(ctx, k, cx, cy, z);
    crayon([[-100, -100], [1200, -100], [1200, 640], [-100, 640]], SKY, { alpha: 0.2, dx: 0, dy: 0, seed: 76 });
    fieldLayer(ctx, t, B[2] - 1.2);
    girl(ctx, t, Object.assign({}, FIELD_GIRL, { sing: true, wind: 0.8 }));
    drift(ctx, between(mel, B[2] - 2, B[3] + 1), t, mouthOf(FIELD_GIRL), { life: 6.5, wind: -34, scale: 0.6, pitchScale: 4, lift: 24, ox: -24 });
  }

  // 4: a lark climbs with the middle phrase and comes back down with it
  const LARK_NOTES = between(mel, B[3], B[4]);
  function larkPos(t) {
    // height follows the tune: from each note on, the bird eases toward that note's height,
    // so it glides rather than jumps; it crosses the sky over the phrase
    let y = 620;
    for (const n of LARK_NOTES) {
      if (n.t > t) break;
      const target = 560 - (n.pitch - 62) * 22, next = LARK_NOTES.find((m) => m.t > n.t);
      const until = Math.min(t, next ? next.t : t);
      y += (target - y) * (1 - Math.exp(-(until - n.t) / 0.7));
    }
    const x = lerp(500, 900, smooth(seg(t, B[3] - 0.5, B[4] + 0.5)));
    return [x, y + 6 * Math.sin(t * 1.4)];
  }
  function shotLark(ctx, t, k) {
    const [lx, ly] = larkPos(t);
    const [cx, cy, z] = K.camLerp(t, [540, 560, 1.0], [600, 440, 1.0], B[3] - 1.2, B[4]);
    K.camera(ctx, k, cx, cy, z);
    crayon([[-100, -300], [1200, -300], [1200, 640], [-100, 640]], SKY, { alpha: 0.24, dx: 0, dy: 0, seed: 77 });
    fieldLayer(ctx, t, -10, { cloudDrift: 1 });
    girl(ctx, t, Object.assign({}, FIELD_GIRL, { open: 1, look: [0.5, -0.8], wind: 0.8 }));
    drift(ctx, LARK_NOTES, t, (n) => { const p = larkPos(n.t); return [p[0] + 30, p[1]]; }, { life: 5, wind: 40, lift: 4, scale: 0.8, pitchScale: 0 });
    lark(ctx, lx, ly, t, 1.5);
  }

  // 5: the theme comes back to her; she opens her eyes; warm light rises from the right
  function shotReturn(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [540, 520, 1.12], [500, 500, 1.0], B[4] - 1.2, B[5]);
    K.camera(ctx, k, cx, cy, z);
    const warm = seg(t, B[4], B[5]);
    const g = ctx.createRadialGradient(1050, 120, 40, 1050, 120, 900);
    g.addColorStop(0, `rgba(${C.glow},${0.45 * warm})`); g.addColorStop(1, `rgba(${C.glow},0)`);
    ctx.fillStyle = g; ctx.fillRect(-200, -200, 1500, 1500);
    crayon([[-100, -100], [1200, -100], [1200, 1200], [-100, 1200]], SKY, { alpha: 0.18, dx: 0, dy: 0, seed: 78 });
    const open = 0.72 * smooth(seg(t, B[4] + 0.6, B[4] + 2.2));
    girl(ctx, t, Object.assign({}, CLOSE, { sing: true, open: open > 0.05 ? open : 0, look: [0.6, -0.7], wind: 1.15 }));
    drift(ctx, between(mel, B[4] - 2, B[5] + 1), t, mouthOf(CLOSE), { life: 6.5, wind: -62, lift: 38, pitchScale: 7, ox: -125, oy: -20 });
  }

  // 6: the closing arpeggio lifts the sun, note by note; at the top chord the sky turns gold
  const RISE = between(mel, B[5], B[6]);
  function sunY(t) {
    let k = 0;
    for (const n of RISE) k += ease(clamp((t - n.t) / 0.8));
    return lerp(760, 330, k / RISE.length);
  }
  const CLIMAX = RISE.reduce((a, n) => (n.pitch > a.pitch ? n : a), RISE[0]);
  const TOP_CHORD = between(low, CLIMAX.t, B[6]).slice(-1)[0] || CLIMAX;
  function shotSunrise(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [560, 520, 1.0], [540, 500, 0.96], B[5] - 1.2, B[6]);
    K.camera(ctx, k, cx, cy, z);
    const gold = seg(t, TOP_CHORD.t - 0.2, TOP_CHORD.t + 2.5);
    crayon([[-100, -100], [1200, -100], [1200, 640], [-100, 640]], SKY, { alpha: 0.22 + 0.3 * gold, dx: 0, dy: 0, seed: 79 });
    crayon([[-100, -100], [1200, -100], [1200, 640], [-100, 640]], C.yellow, { alpha: 0.28 * gold, dx: 0, dy: 0, seed: 80 });
    ctx.save(); ctx.beginPath(); ctx.rect(-100, -100, 1300, 718); ctx.clip();
    let rays = 0;
    for (const n of RISE) rays += 1.2 * ease(clamp((t - n.t) / 0.6));
    sun(ctx, 720, sunY(t), 108, t, rays, 0.3 + gold);
    ctx.restore();
    fieldLayer(ctx, t, -10);
    girl(ctx, t, Object.assign({}, FIELD_GIRL, { open: 1, look: [0.8, -0.5], wind: 1 }));
    drift(ctx, RISE, t, mouthOf(FIELD_GIRL), { life: 6, wind: 56, lift: 30, scale: 0.75, pitchScale: 6, ox: 20, oy: -20 });
  }

  // 7: the coda; the camera draws back, the light settles, a ring leaves the sun on each low note
  function shotCoda(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [560, 500, 0.96], [540, 470, 0.86], B[6] - 1.2, DURATION);
    K.camera(ctx, k, cx, cy, z);
    crayon([[-200, -200], [1300, -200], [1300, 640], [-200, 640]], SKY, { alpha: 0.5, dx: 0, dy: 0, seed: 82 });
    crayon([[-200, -200], [1300, -200], [1300, 640], [-200, 640]], C.yellow, { alpha: 0.24, dx: 0, dy: 0, seed: 83 });
    for (const n of between(low, B[6] - 0.1, DURATION)) {
      const a = t - n.t;
      if (a < 0 || a > 3.2) continue;
      ctx.strokeStyle = Pen.INK; ctx.globalAlpha = 0.5 * (1 - a / 3.2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(720, 330, 150 + a * 90, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    sun(ctx, 720, 330, 108, t, RISE.length * 1.2, 1);
    fieldLayer(ctx, t, -10, { cloudDrift: 0.6 });
    girl(ctx, t, Object.assign({}, FIELD_GIRL, { open: 1 - smooth(seg(t, 76, 78.5)), look: [0.6, -0.6], wind: lerp(1, 0.4, seg(t, B[6], DURATION)) }));
    drift(ctx, between(mel, B[6] - 2, DURATION), t, mouthOf(FIELD_GIRL), { life: 7, wind: 34, lift: 24, scale: 0.7, pitchScale: 5, ox: 20, oy: -20 });
  }

  const frame = K.film([
    { start: -1, draw: shotLine, caption: 'one line, early in the morning,' },
    { start: B[1], draw: shotFace, caption: 'a girl with flaxen hair,' },
    { start: B[2], draw: shotField, caption: 'humming a tune she had always known,' },
    { start: B[3], draw: shotLark, caption: 'a lark went up to hear it,' },
    { start: B[4], draw: shotReturn, caption: 'and the tune came round to her again,' },
    { start: B[5], draw: shotSunrise, caption: 'warm enough to bring the sun up.' },
    { start: B[6], draw: shotCoda },
  ], {
    duration: DURATION, strip: null, dissolve: 1.2,
    final: { at: 75.6, title: 'la fille aux cheveux de lin.', size: 54, credit: 'Claude Debussy, Preludes I, no. 8 (abridged)   /   Luis Kolodin, piano (CC BY-SA 4.0)' },
  });

  window.Film = { frame, DURATION };
})();
