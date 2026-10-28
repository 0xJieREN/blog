// "la fille aux cheveux de lin": Debussy's prelude opens with a single unaccompanied line.
// Here that line is drawn by a pen, turns out to be a strand of her hair, the harmony brings
// the field and the colour, the rising arpeggio sings the sun up, and at the end her hair
// streams across the sky in the shape of the opening line.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, hatch, text, write, seg, smooth, ease, clamp, lerp, noise, rng } = Pen;
  const K = Kit, C = K.C, B = K.BARS;
  const DURATION = 32.3;
  const FLAX = '#ecc66e', ALFALFA = '#9b7fd1', DRESS = '#5b9fd6', SKY = '#f3c98b';
  const mel = K.melody, low = K.notes.filter((n) => n.voice === 1);

  // ---------- shot 1: the opening line, drawn as it is played ----------
  // height follows pitch; the pen moves right at a steady pace, so spacing is rhythm
  // ghost notes from the transcription (a weaker note right after another) don't steer the line
  const LINE_NOTES = mel.filter((n, i) => n.t < B[1] && (i === 0 || n.t - mel[i - 1].t > 0.15));
  const T0 = mel[0].t, LINE_END = B[1] + 0.05, PACE = 118;
  const lineY = (p) => 520 - (p - 68) * 16;
  const LINE = []; // the whole contour, sampled once and smoothed like a strand of hair
  {
    let y = lineY(LINE_NOTES[0].pitch), j = 0;
    for (let tau = T0; tau <= LINE_END; tau += 1 / 48) {
      while (j + 1 < LINE_NOTES.length && LINE_NOTES[j + 1].t <= tau) j++;
      y += (lineY(LINE_NOTES[j].pitch) - y) * (1 - Math.exp(-(1 / 48) / 0.2));
      LINE.push([100 + PACE * (tau - T0), y + 4 * Math.sin(tau * 2.6)]);
    }
  }
  function lineAt(tau) {
    const i = clamp(Math.round((tau - T0) * 48), 0, LINE.length - 1);
    return LINE[i];
  }
  const lineStroke = stroke(LINE, { seed: 42, wobble: 0.8, step: 2.5 });
  const strands = [-14, -7, 7, 14].map((o, i) => stroke(LINE.map(([x, y], j) => [x, y + o * (0.6 + 0.4 * Math.sin(j / 30 + i))]), { seed: 50 + i, wobble: 1, step: 3 }));
  function pen(ctx, x, y, lift) {
    ctx.save(); ctx.translate(x + lift * 40, y - lift * 60); ctx.rotate(-0.85);
    crayon([[14, -6], [180, -14], [180, 14], [14, 6]], '#c98f52', { dx: 2, dy: 0, seed: 7 });
    crayon([[6, -7], [22, -9], [22, 9], [6, 7]], '#b9b4aa', { dx: 0, dy: 0, seed: 8 });
    ctx.fillStyle = Pen.PAPER; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -6); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -6); ctx.lineTo(180, -14); ctx.lineTo(180, 14); ctx.lineTo(8, 6); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -9); ctx.lineTo(22, 9); ctx.moveTo(8, -6); ctx.lineTo(8, 6); ctx.stroke();
    ctx.restore();
  }
  function shotLine(ctx, t) {
    const drawn = clamp((t - T0) / (LINE_END - T0)), x = 100 + PACE * (Math.min(t, LINE_END) - T0);
    const hair = seg(t, 6.3, 7.5);
    if (hair > 0) {
      const band = LINE.map(([x, y]) => [x, y - 16]).concat(LINE.map(([x, y]) => [x, y + 16]).reverse());
      crayon(band, FLAX, { prog: hair, dx: 3, dy: -2, alpha: 0.8, seed: 61 });
      strands.forEach((s, i) => ink(s, { prog: seg(t, 6.3 + i * 0.12, 7.4 + i * 0.05), w: 1.5, alpha: 0.75 }));
    }
    ink(lineStroke, { prog: drawn, w: 3.2 });
    // each note leaves a small head where the line turned
    for (const n of LINE_NOTES) {
      if (n.t > Math.min(t, LINE_END)) break;
      const [nx, ny] = lineAt(n.t + 0.3);
      K.noteGlyph(ctx, nx, ny, 0, Object.assign({}, n, { step: 4 }), 0.85 * (1 + 0.5 * Math.exp(-(t - n.t) / 0.09)), 1);
    }
    if (t > T0 - 0.4) { const [px, py] = t < T0 ? lineAt(T0) : lineAt(Math.min(t, LINE_END)); pen(ctx, px, py, smooth(seg(t, 6.6, 7.4)) + (t < T0 ? (T0 - t) * 2 : 0)); }
  }

  // ---------- the girl (local units: head radius 150) ----------
  const GIRL = {
    head: stroke(pts.curve([[-60, -150], [40, -152], [130, -90], [150, 10], [110, 120], [20, 160], [-80, 140], [-120, 90], [-126, 60], [-146, 36], [-150, 14], [-138, 0], [-140, -60], [-60, -150]], 6), { wobble: 1.5 }),
    hairCap: pts.curve([[-128, -70], [-70, -150], [30, -172], [130, -120], [180, 0], [190, 140], [170, 260], [110, 250], [100, 120], [60, 10], [-20, -60], [-90, -60], [-128, -70]], 6),
    neck: group([[[-10, 150], [-14, 216]], [[60, 140], [70, 212]], pts.curve([[-40, 214], [-150, 300], [-260, 470]]), pts.curve([[80, 210], [170, 300], [260, 470]]), [[-120, 330], [-60, 420]], [[130, 330], [80, 420]]]),
    dress: [[-40, 214], [80, 210], [170, 300], [260, 470], [-260, 470], [-150, 300]],
    mouth: stroke(pts.ellipse(-118, 82, 9, 7, 0, 1.06), { wobble: 0.4 }),
    smile: stroke(pts.curve([[-126, 78], [-116, 86], [-104, 80]]), { wobble: 0.4 }),
    flower: [[60, -150], [78, -138], [96, -150], [80, -164], [62, -164]],
  };
  // the hair that flows out behind her head is a five-line staff
  const hairClose = K.path(pts.curve([[150, -60], [330, -40], [520, 10], [720, -20], [900, 30], [1100, 0]], 14), 18);
  const hairUp = K.path(pts.curve([[150, -60], [300, -140], [420, -300], [620, -380], [860, -470]], 14), 20);
  function girl(ctx, t, o) {
    const R = (a, b) => seg(t, B[1] - 0.1 + a, B[1] - 0.1 + b);
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s, o.s);
    const P = o.up ? hairUp : hairClose, ownHair = !o.noHair;
    // flowing hair, under everything
    const band = [];
    for (let d = 0; d <= P.L; d += 12) { const [x, y, nx, ny] = K.at(P, d); band.push([x + nx * 34, y + ny * 34]); }
    for (let d = P.L; d >= 0; d -= 12) { const [x, y, nx, ny] = K.at(P, d); band.push([x - nx * 34, y - ny * 34]); }
    if (ownHair) {
      crayon(band, FLAX, { prog: R(0.2, 0.9), dx: 4, dy: -3, alpha: 0.85, seed: 63 });
      K.staff(ctx, P, t, { full: true, w: 1.8, alpha: R(0.3, 0.9) * 1.6 });
    }
    crayon(GIRL.dress, DRESS, { prog: R(0.4, 0.8), dx: 5, dy: -3, seed: 64 });
    inkGroup(GIRL.neck, R(0.3, 0.5));
    ctx.fillStyle = Pen.PAPER; ctx.beginPath(); ctx.ellipse(0, 0, 146, 154, 0, 0, Math.PI * 2); ctx.fill();
    crayon(GIRL.hairCap, FLAX, { prog: R(0.3, 0.8), dx: 4, dy: -3, seed: 65 });
    ink(GIRL.head, { prog: R(0, 0.5), w: 3.4 / Math.sqrt(o.s) });
    ink(stroke(GIRL.hairCap, { seed: 66, wobble: 1.4 }), { prog: R(0.3, 0.7), w: 2.6 / Math.sqrt(o.s) });
    crayon(GIRL.flower, ALFALFA, { prog: R(0.7, 0.9), dx: 2, dy: -1, seed: 67 });
    crayonEllipse(-82, 48, 18, 11, C.pink, { prog: R(0.6, 0.8), alpha: 0.75, dx: 0, dy: 0 });
    // singing: the mouth opens with each note of the tune
    const sing = o.up ? 0.6 : K.press(t, 0);
    if (R(0.5, 0.6) > 0) {
      ctx.save(); ctx.translate(-118, 82); ctx.scale(0.6 + 0.6 * sing, 0.6 + 0.8 * sing); ctx.translate(118, -82);
      ink(GIRL.mouth, { w: 2.4 }); ctx.restore();
      if (o.up) K.eye(ctx, -64, -18, 26, 1, [-0.4, -0.85]);
      else { ctx.strokeStyle = Pen.INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-66, -26, 22, 0.35, Math.PI - 0.35); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-86, -6); ctx.lineTo(-92, 2); ctx.moveTo(-74, -2); ctx.lineTo(-77, 7); ctx.stroke(); }
    }
    if (ownHair) K.riders(ctx, P, t, { born: true, scale: 1.15 });
    ctx.restore();
  }

  // ---------- the field ----------
  const r = rng(11);
  // a flower blooms on every note of the harmony, in a fixed place
  const FLOWERS = low.map((n, i) => ({ t: n.t, x: 40 + ((i * 397) % 1000), y: 650 + ((i * 131) % 210), s: 0.7 + (n.pitch % 5) * 0.12, c: [ALFALFA, ALFALFA, C.pink, '#b79be0'][i % 4] }));
  const GRASS = Array.from({ length: 70 }, () => { const x = r() * 1080, y = 640 + r() * 250; return [[x, y], [x + (r() - 0.5) * 10, y - 18 - r() * 18]]; });
  const field = {
    horizon: stroke(pts.curve([[-40, 620], [240, 596], [520, 612], [800, 590], [1120, 608]], 10), { wobble: 1.4 }),
    hills: stroke(pts.curve([[-40, 640], [300, 620], [640, 640], [1120, 625]], 10), { wobble: 1.2 }),
    grass: group(GRASS, { wobble: 0.4 }),
  };
  function flower(ctx, f, t) {
    const k = ease(clamp((t - f.t) / 0.4));
    if (k <= 0) return;
    const s = f.s * k;
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + 2, f.y - 34 * s); ctx.stroke();
    for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; crayonEllipse(f.x + 2 + Math.cos(a) * 8 * s, f.y - 40 * s + Math.sin(a) * 7 * s, 6 * s, 6 * s, f.c, { dx: 0, dy: 0, seed: (j + f.x) | 0 }); }
    ctx.fillStyle = Pen.INK; ctx.beginPath(); ctx.arc(f.x + 2, f.y - 40 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  }
  function fieldLayer(ctx, t, t0) {
    const R = (a, b) => seg(t, t0 - 0.1 + a, t0 - 0.1 + b);
    crayon([[-40, 618], [1120, 606], [1120, 900], [-40, 900]], C.green, { prog: R(0.3, 0.9), alpha: 0.35, dx: 0, dy: 0, seed: 71 });
    ink(field.horizon, { prog: R(0, 0.4), w: 3.2 });
    ink(field.hills, { prog: R(0.1, 0.5), w: 2 });
    inkGroup(field.grass, R(0.3, 0.9), { w: 1.8, alpha: 0.8 });
    for (const f of FLOWERS) flower(ctx, f, t);
  }
  function sun(ctx, x, y, rad, t, rays) {
    crayonEllipse(x, y, rad, rad, C.yellow, { dx: 9, dy: -6, seed: 81 });
    crayonEllipse(x, y, rad * 0.55, rad * 0.55, C.orange, { dx: 4, dy: -3, seed: 82, alpha: 0.8 });
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - 3, y + 2, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.6;
    for (let i = 0; i < rays; i++) {
      const a = -Math.PI / 2 + (i - (rays - 1) / 2) * 0.26 + 0.015 * Math.sin(t * 1.3 + i), r0 = rad + 18, r1 = rad + 44 + (i % 2) * 14;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
    }
  }

  // ---------- shot 4: the rising arpeggio raises the sun, one note a step ----------
  const climb = mel.filter((n) => n.t >= B[3] - 0.01 && n.t < B[4] - 0.01);
  const stepY = (p) => 760 - (p - 66) * 15;
  function shotRise(ctx, t) {
    const t0 = B[3], R = (a, b) => seg(t, t0 - 0.1 + a, t0 - 0.1 + b);
    let k = 0;
    climb.forEach((n, i) => { k += ease(clamp((t - n.t) / 0.3)); });
    const sy = lerp(860, 470, k / climb.length);
    crayon([[-40, -40], [1120, -40], [1120, 700], [-40, 700]], SKY, { prog: R(0, 0.6), alpha: 0.18 + 0.2 * k / climb.length, dx: 0, dy: 0, seed: 72 });
    ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, 1160, 742); ctx.clip();
    sun(ctx, 720, sy, 110, t, Math.round(k));
    ctx.restore();
    crayon([[-40, 700], [1120, 700], [1120, 900], [-40, 900]], C.green, { prog: R(0, 0.5), alpha: 0.35, dx: 0, dy: 0, seed: 73 });
    ink(stroke([[-40, 702], [1120, 698]], { seed: 74 }), { prog: R(0, 0.4), w: 3.4 });
    // the notes stay where they were sung, a stair up to the sun
    climb.forEach((n, i) => {
      if (t < n.t) return;
      const age = t - n.t, x = 90 + i * 64, y = stepY(n.pitch);
      K.noteGlyph(ctx, x, y, 0, Object.assign({}, n, { step: 4 }), 1.5 * (1 + 0.5 * Math.exp(-age / 0.09)), 1);
      if (age < 0.35) K.burst(ctx, x, y, age);
    });
    girl(ctx, t, { x: 150, y: 790, s: 0.3, up: true });
  }

  // ---------- shots ----------
  const EYE = [-64, -18], CLOSE = { x: 380, y: 560, s: 1 };
  function shotClose(ctx, t) { girl(ctx, t, CLOSE); }
  function shotField(ctx, t, k) {
    const [cx, cy, z] = K.camLerp(t, [540, 560, 1.06], [540, 540, 1.0], B[2], B[3]);
    K.camera(ctx, k, cx, cy, z);
    // the sun's rim shows on the horizon with the chord at 13.7 s
    const dawn = seg(t, 13.6, 15.3);
    if (dawn > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, 1160, 640); ctx.clip(); sun(ctx, 760, lerp(700, 640, dawn), 100, t, 0); ctx.restore(); }
    fieldLayer(ctx, t, B[2]);
    girl(ctx, t, { x: 330, y: 560, s: 0.42 });
  }
  function shotLookUp(ctx, t, k) {
    const t1 = B[5], ex = 380 + EYE[0], ey = 610 + EYE[1];
    let [cx, cy, z] = K.camLerp(t, [560, 520, 1.0], [520, 540, 1.1], B[4], t1 - 0.7);
    // fall into her eye; the sun of the last shot opens in the same place
    const dive = Math.pow(seg(t, t1 - 0.7, t1), 2.2);
    if (dive > 0) {
      const Z = lerp(z, 8, dive), sx = lerp(540 + (ex - cx) * z, SUN[0], dive), sy = lerp(540 + (ey - cy) * z, SUN[1], dive);
      cx = ex - (sx - 540) / Z; cy = ey - (sy - 540) / Z; z = Z;
    }
    K.camera(ctx, k, cx, cy, z);
    crayon([[-200, -200], [1300, -200], [1300, 1300], [-200, 1300]], SKY, { alpha: 0.25, dx: 0, dy: 0, seed: 75 });
    girl(ctx, t, { x: 380, y: 610, s: 1, up: true });
  }
  // her hair across the sky takes the shape of the opening line
  const SUN = [760, 360];
  const skyHair = K.path([[360, 536], [410, 420], [450, 290], [470, 190]].concat(LINE.filter((_, i) => i % 4 === 0).map(([x, y]) => [480 + (x - 100) * 0.7, 120 + (y - 520) * 0.6])), 4);
  function shotSky(ctx, t, k) {
    const t0 = B[5], zoom = lerp(2.2, 1, ease(seg(t, t0 - 0.2, t0 + 1.1)));
    ctx.setTransform(k * zoom, 0, 0, k * zoom, k * (SUN[0] - SUN[0] * zoom), k * (SUN[1] - SUN[1] * zoom));
    crayon([[-40, -40], [1120, -40], [1120, 620], [-40, 620]], SKY, { alpha: 0.42, dx: 0, dy: 0, seed: 76 });
    // a ring goes out from the sun on each low note of the coda
    for (const n of low) {
      if (n.t < t0 - 0.05 || t < n.t || t - n.t > 2.4) continue;
      const a = t - n.t;
      ctx.strokeStyle = Pen.INK; ctx.globalAlpha = 0.6 * (1 - a / 2.4); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(SUN[0], SUN[1], 150 + a * 120, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    sun(ctx, SUN[0], SUN[1], 120, t, 11);
    fieldLayer(ctx, t, -10);
    ctx.save(); ctx.translate(0, 0);
    const band = [];
    for (let d = 0; d <= skyHair.L; d += 12) { const [x, y, nx, ny] = K.at(skyHair, d); band.push([x + nx * 30, y + ny * 30]); }
    for (let d = skyHair.L; d >= 0; d -= 12) { const [x, y, nx, ny] = K.at(skyHair, d); band.push([x - nx * 30, y - ny * 30]); }
    crayon(band, FLAX, { prog: seg(t, t0, t0 + 1.4), dx: 4, dy: -3, alpha: 0.8, seed: 77 });
    K.staff(ctx, skyHair, t, { full: true, w: 1.6, alpha: seg(t, t0, t0 + 1.2) * 1.6 });
    K.riders(ctx, skyHair, t, { offset: 0, scale: 0.95 });
    ctx.restore();
    girl(ctx, t, { x: 300, y: 560, s: 0.4, up: true, noHair: true });
  }

  const frame = K.film([
    { start: -1, draw: shotLine, caption: 'one line, early in the morning,' },
    { start: B[1], draw: shotClose, caption: 'then a strand of flaxen hair,' },
    { start: B[2], draw: shotField, caption: 'then a girl in the flowering fields,' },
    { start: B[3], draw: shotRise, caption: 'singing the sun up,' },
    { start: B[4], draw: shotLookUp },
    { start: B[5], draw: shotSky, caption: 'until the whole sky was gold.' },
  ], {
    duration: DURATION, strip: null,
    final: { at: 28.4, title: 'la fille aux cheveux de lin.', size: 54, credit: 'Claude Debussy, Preludes I, no. 8 (excerpt)   /   Luis Kolodin, piano (CC BY-SA 4.0)' },
  });

  window.Film = { frame, DURATION };
})();
