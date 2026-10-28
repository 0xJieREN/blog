// "aria": eight bars, eight shots, one night.
// The excerpt is bars 1-7 of the Aria and its last bar, 32. Every shot starts on a
// downbeat, every note is drawn on a staff at its real pitch at the moment it is played,
// and the bass of each bar is laid down underneath like a stepping stone.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, hatch, text, write, seg, smooth, ease, clamp, lerp, noise, rng } = Pen;
  const SC = window.SCORE, BEATS = SC.beats, BARS = SC.bars;
  const DURATION = 35.5;

  const C = {
    yellow: '#f2b33d', orange: '#ee7d33', teal: '#2f9d8e', red: '#d9493c', pink: '#f19c9c', brown: '#b5703c',
    blue: '#6683cf', green: '#5ea65a', wig: '#cfc8bd', roof: '#cc5f3f', sky: '#8592d6', stone: '#a7a097', soil: '#c9a27a', glow: '255,196,92',
  };
  // one colour per pitch name, so the same note always looks the same
  const PC_COLOR = { 7: C.yellow, 9: C.orange, 11: C.pink, 0: C.teal, 1: C.teal, 2: C.blue, 4: C.green, 5: C.red, 6: C.red };
  const BASS = ['G', 'F#', 'E', 'D', 'B', 'C', 'D', 'G'];
  const BASS_PC = [7, 6, 4, 2, 11, 0, 2, 7];
  const CONTOUR = [7, 6, 5, 4, 2, 3, 4, 0];

  // ---------- musical time ----------
  function beatAt(t) {
    if (t < BEATS[0][0]) return (t - BEATS[0][0]) / (BEATS[0][1] - BEATS[0][0]);
    let k = 0;
    while (k < 7 && t >= BEATS[k + 1][0]) k++;
    const row = BEATS[k];
    for (let j = 0; j < 3; j++) if (t < row[j + 1] || j === 2) return k * 3 + j + (t - row[j]) / (row[j + 1] - row[j]);
  }
  const beatLen = (k) => (BEATS[k][3] - BEATS[k][0]) / 3;
  const notes = SC.notes.map(([t, pitch, dur, voice, bar, beat], i) => {
    const pc = pitch % 12, letter = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc];
    return { t, pitch, dur, voice, bar, beat, i, color: PC_COLOR[pc] || C.teal, step: Math.floor(pitch / 12 - 1) * 7 + letter - 30, len: dur * beatLen(bar) };
  });
  const melody = notes.filter((n) => n.voice === 0);
  // how hard each hand is pressing right now
  function press(t, voice) {
    let v = 0;
    for (const n of notes) if (n.voice === voice && t >= n.t && t - n.t < 0.6) v = Math.max(v, Math.exp(-(t - n.t) / 0.14));
    return v;
  }

  // ---------- the house (world coordinates) ----------
  const S = {};
  function build() {
    const st = (p, o) => stroke(p, o);
    S.floor = st([[-1000, 762], [3200, 758]]);
    S.floorDash = group([[[-260, 776], [-60, 776]], [[120, 779], [460, 779]], [[700, 776], [980, 776]], [[1240, 778], [1700, 778]],
      [[1900, 776], [2120, 776]], [[300, 792], [520, 792]], [[1450, 792], [1620, 792]], [[2350, 778], [2700, 778]]], { wobble: 0.8 });
    S.ceiling = st([[-40, 140], [2200, 140]]);
    S.wall = group([[[1068, 140], [1068, 760]], [[1092, 140], [1092, 760]]]);
    S.wallHatch = group(hatch([[1068, 140], [1092, 140], [1092, 760], [1068, 760]], { angle: -0.8, gap: 11, seed: 3 }), { wobble: 0.4 });
    S.sideWalls = group([[[-40, 140], [-40, 760]], [[2200, 140], [2200, 760]]]);

    // bedroom
    S.bed = group([
      pts.curve([[296, 760], [294, 620], [298, 545], [322, 516], [348, 536], [352, 566]]),
      pts.curve([[812, 760], [812, 650], [818, 600], [838, 590], [854, 604], [852, 760]]),
      [[298, 690], [852, 690]], [[300, 700], [850, 700]],
    ]);
    S.bedShade = group(hatch([[316, 704], [836, 704], [836, 756], [316, 756]], { angle: 1.25, gap: 13, ragged: 0.3, seed: 8 }), { wobble: 0.6 });
    S.pillow = st(pts.ellipse(380, 630, 60, 22, Math.PI, 1.05));
    S.blanketTop = [[426, 612], [470, 600], [540, 588], [620, 592], [700, 604], [770, 618], [818, 640]];
    S.blanketPoly = pts.curve(S.blanketTop, 6).concat([[822, 690], [430, 690]]);
    S.blanket = group([pts.curve(S.blanketTop, 8), [[818, 640], [822, 690]], [[430, 688], [426, 612]],
      pts.curve([[520, 600], [560, 640], [580, 688]]), pts.curve([[690, 608], [700, 650], [720, 688]])]);
    S.blanketDots = group([[600, 640], [650, 662], [760, 650], [500, 655], [540, 670]].map(([x, y]) => [[x - 4, y - 4], [x + 4, y + 4], [x, y], [x + 4, y - 4], [x - 4, y + 4]]), { wobble: 0.3 });
    S.head = st(pts.ellipse(0, 0, 44, 42, -0.3, 1.05));
    S.ear = st(pts.arc(-32, 6, 8, 11, 1.2, 4.8));
    S.nose = st(pts.curve([[40, 0], [52, 6], [44, 14]]));
    S.mouth = st(pts.curve([[18, 24], [26, 28], [34, 25]]));
    S.capPoly = pts.curve([[-34, -26], [-44, -52], [-62, -74], [-80, -82]], 6).concat(pts.curve([[-80, -82], [-36, -72], [0, -58], [38, -40]], 6));
    S.cap = group([S.capPoly, pts.curve([[-36, -24], [0, -38], [40, -38]]), pts.curve([[-52, -62], [-10, -54]]), pts.curve([[-64, -75], [-36, -68]])]);
    S.pompom = st(pts.ellipse(-86, -84, 10, 10, 0, 1.05));
    S.rod = group([[[540, 236], [830, 236]], pts.ellipse(536, 236, 6, 6, 0, 1), pts.ellipse(834, 236, 6, 6, 0, 1)]);
    S.curtainL = [[556, 238], [606, 238], [594, 320], [610, 400], [600, 472], [552, 472], [562, 380], [550, 300]];
    S.curtainR = [[764, 238], [816, 238], [822, 300], [812, 380], [820, 472], [772, 472], [762, 400], [776, 320]];
    S.curtains = group([pts.curve(S.curtainL.concat([S.curtainL[0]]), 4), pts.curve(S.curtainR.concat([S.curtainR[0]]), 4),
      pts.curve([[576, 250], [570, 360], [578, 466]]), pts.curve([[796, 250], [800, 360], [794, 466]])]);
    S.window = group([pts.rect(600, 252, 780, 452), [[690, 252], [690, 452]], [[600, 352], [780, 352]], [[584, 458], [796, 458]], [[588, 468], [792, 468]]]);
    S.winGuide = group([[[590, 252], [790, 252]], [[600, 240], [600, 462]], [[780, 240], [780, 462]]]);
    S.moonSmall = st(pts.ellipse(0, 0, 26, 26, -1.2, 1.08));
    S.winStars = [[622, 278], [645, 410], [758, 404], [618, 332], [742, 380], [655, 300]];
    S.clockGuide = group([pts.ellipse(200, 330, 56, 56, 0, 1), [[132, 330], [268, 330]], [[200, 262], [200, 398]]], { wobble: 0.5 });
    S.clock = group([pts.ellipse(200, 330, 50, 50, -1.4, 1.06), pts.ellipse(200, 330, 42, 42, 1.2, 1.04),
      ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [[200 + Math.cos(a) * 34, 330 + Math.sin(a) * 34], [200 + Math.cos(a) * 40, 330 + Math.sin(a) * 40]]; }),
      pts.rect(178, 382, 222, 478), pts.curve([[182, 284], [200, 270], [218, 284]])]);
    S.table = group([[[112, 640], [248, 640]], [[118, 648], [242, 648]], [[128, 648], [126, 760]], [[232, 648], [234, 760]], [[128, 708], [232, 708]]]);
    S.glass = group([[[148, 602], [152, 638]], [[176, 602], [172, 638]], [[152, 638], [172, 638]], [[150, 614], [174, 614]]]);
    S.books = group([pts.rect(190, 626, 236, 638), pts.rect(194, 614, 230, 626)]);

    // music room
    S.caseOutline = [[1335, 548], [1880, 548], [1894, 564], [1892, 612], [1876, 626], [1335, 626]];
    S.lidPoly = pts.curve([[1352, 546], [1600, 446], [1830, 362], [1866, 392], [1884, 470], [1888, 546]], 6);
    S.lidInner = pts.curve([[1380, 540], [1620, 448], [1836, 376], [1864, 410], [1876, 540]], 6);
    S.harpsGuide = group([[[1300, 548], [1910, 548]], [[1335, 520], [1335, 640]], [[1880, 340], [1880, 640]], pts.arc(1352, 546, 520, 520, -0.42, -0.2)], { wobble: 0.4 });
    S.harps = group([
      S.caseOutline.concat([[1335, 548]]), [[1340, 566], [1888, 566]], [[1340, 606], [1890, 606]],
      [[1296, 556], [1335, 556]], [[1294, 572], [1335, 572]], [[1294, 556], [1294, 604]], [[1294, 604], [1335, 604]],
      S.lidPoly, S.lidInner, [[1700, 548], [1716, 432]],
      ...[1390, 1620, 1856].map((x) => pts.curve([[x, 626], [x - 8, 658], [x + 6, 694], [x - 4, 730], [x, 760]])),
      [[1390, 738], [1856, 738]],
    ]);
    S.keys = group(Array.from({ length: 8 }, (_, i) => [[1298 + i * 4.6, 556], [1298 + i * 4.6, 566]]), { wobble: 0.2 });
    S.strings = group([[[1396, 540], [1846, 398]], [[1430, 541], [1800, 420]], [[1470, 543], [1740, 452]], [[1520, 544], [1680, 486]]], { wobble: 0.4 });
    S.rose = st(pts.ellipse(1700, 500, 14, 9, 0, 1.05));
    S.stand = group([[[1398, 546], [1404, 500]], pts.rect(1386, 482, 1440, 536)]);
    S.sheetLines = group([0, 1, 2, 3, 4].map((i) => [[1392, 496 + i * 7], [1434, 496 + i * 7]]), { wobble: 0.3 });
    S.sheetTitle = text('Aria', 'allure', 1413, 528, 22, { align: 'center' });
    S.candleBase = group([pts.ellipse(1500, 546, 18, 4, 0, 1.05), [[1490, 543], [1492, 532]], [[1510, 543], [1508, 532]], pts.ellipse(1500, 532, 11, 3, 0, 1.05)]);
    S.smoke = stroke(pts.curve([[0, 0], [8, -20], [-6, -44], [10, -70], [-4, -98], [6, -130]]), { wobble: 0.6 });
    S.stool = group([pts.rect(1206, 598, 1294, 612), [[1218, 612], [1212, 760]], [[1282, 612], [1288, 760]], [[1214, 716], [1286, 716]]]);
    S.coatPoly = [[1250, 492], [1236, 504], [1226, 560], [1218, 600], [1300, 600], [1294, 556], [1282, 504], [1268, 492]];
    S.coat = group([S.coatPoly.concat([S.coatPoly[0]]), [[1272, 504], [1278, 598]]]);
    S.buttons = [[1282, 524], [1284, 546], [1286, 568]];
    S.legs = group([pts.curve([[1276, 598], [1300, 600], [1326, 604]]), pts.curve([[1326, 604], [1324, 680], [1322, 754]]), [[1316, 758], [1346, 760]],
      pts.curve([[1262, 600], [1290, 606], [1312, 612]]), pts.curve([[1312, 612], [1310, 690], [1306, 754]]), [[1300, 758], [1328, 760]]]);
    S.gHead = st(pts.ellipse(0, 0, 32, 32, -2.2, 1.05));
    S.wig = group([pts.arc(-2, -2, 38, 38, -3.0, -0.5), pts.ellipse(-30, 14, 9, 9, 0, 1.6), pts.ellipse(-26, 34, 8, 8, 0, 1.6),
      pts.curve([[-36, 8], [-46, 30], [-52, 58]]), pts.curve([[-44, 20], [-56, 16], [-52, 28], [-44, 20]])]);
    S.wigPoly = pts.arc(-2, -2, 40, 40, -3.05, -0.45).concat([[8, -10], [-14, 4], [-22, 46], [-40, 46]]);
    S.gNose = st(pts.curve([[30, -4], [40, 4], [31, 10]]));
    S.gMouth = st(pts.curve([[18, 18], [24, 21]]));
    S.portrait = group([pts.ellipse(1880, 300, 46, 58, -1.5, 1.05), pts.ellipse(1880, 300, 38, 50, 1.5, 1.04),
      pts.ellipse(1880, 300, 16, 18, 0, 1.05), pts.ellipse(1858, 290, 8, 10, 0, 1.6), pts.ellipse(1902, 290, 8, 10, 0, 1.6),
      pts.ellipse(1857, 310, 7, 9, 0, 1.6), pts.ellipse(1903, 310, 7, 9, 0, 1.6), pts.curve([[1873, 306], [1880, 310], [1887, 306]]),
      [[1874, 296], [1875, 298]], [[1886, 296], [1885, 298]], pts.curve([[1866, 326], [1880, 340], [1894, 326]]), [[1880, 358], [1880, 372]], pts.ellipse(1880, 214, 5, 5, 0, 1)]);

    // outside
    S.roofA = [[-60, 140], [540, -170], [1120, 140]];
    S.roofB = [[1040, 140], [1620, -150], [2220, 140]];
    S.roofs = group([S.roofA, S.roofB]);
    S.tiles = group([...hatch(S.roofA, { angle: 0, gap: 26, seed: 21, ragged: 0.02 }), ...hatch(S.roofB, { angle: 0, gap: 26, seed: 22, ragged: 0.02 })], { wobble: 1 });
    S.chimneyPoly = [[1780, -68], [1780, -232], [1840, -232], [1840, -38]];
    S.chimney = group([S.chimneyPoly, [[1770, -232], [1850, -232]], [[1770, -246], [1850, -246]], [[1770, -246], [1770, -232]], [[1850, -246], [1850, -232]]]);
    S.houses = [
      { x0: -700, x1: -150, eave: 300, peak: 40, wins: [[-620, 380], [-470, 380], [-320, 380], [-620, 540], [-320, 540]], door: [-480, 600] },
      { x0: 2300, x1: 2820, eave: 280, peak: 30, wins: [[2370, 360], [2520, 360], [2670, 360], [2370, 530], [2670, 530]], door: [2510, 590] },
    ].map((h) => {
      const mid = (h.x0 + h.x1) / 2;
      h.roofPoly = [[h.x0 - 30, h.eave], [mid, h.peak], [h.x1 + 30, h.eave]];
      h.lines = group([h.roofPoly, [[h.x0, h.eave], [h.x0, 760]], [[h.x1, h.eave], [h.x1, 760]],
        ...h.wins.map(([x, y]) => pts.rect(x, y, x + 70, y + 90)), ...h.wins.map(([x, y]) => [[x + 35, y], [x + 35, y + 90]]),
        pts.rect(h.door[0], h.door[1], h.door[0] + 66, 760)]);
      return h;
    });
    S.skyPoly = [[-1100, -1700], [3300, -1700], [3300, 300], [2850, 300], [2560, 30], [2220, 140], [1620, -150], [1040, 140], [1120, 140], [540, -170], [-60, 140], [-180, 300], [-425, 40], [-760, 300], [-1100, 300]];
    S.moon = st(pts.ellipse(420, -560, 80, 80, -2.0, 1.07));
    S.craters = group([pts.ellipse(392, -584, 12, 10, 0, 1.05), pts.ellipse(448, -540, 9, 8, 0, 1.05), pts.ellipse(410, -520, 6, 6, 0, 1.05)]);
    const r = rng(77);
    S.stars = [];
    while (S.stars.length < 40) {
      const x = -900 + r() * 4000, y = -1350 + r() * 1150;
      if (Math.hypot(x - 420, y + 560) < 150) continue;
      S.stars.push([x, y, 4 + r() * 6, r() * 6.28]);
    }
    S.z = text('z', 'tech', 0, 0, 30, { align: 'center' });

    // the stream: one staff that carries every note from the harpsichord to the Count's ear
    S.streamWorld = path(pts.curve([[1652, 476], [1590, 380], [1470, 300], [1300, 250], [1080, 214], [860, 196], [690, 212], [560, 280], [500, 400], [458, 532]], 14), 16);
  }

  // ---------- the stream ----------
  const SP = 13, SPEED = 250; // staff spacing, travel in px per second
  function path(points, wander) {
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
    if (ny > 0) { nx = -nx; ny = -ny; }
    const w = P.wander * Math.sin(d / 120 + 0.6) + 0.3 * P.wander * Math.sin(d / 43);
    return [lerp(P.xs[lo], P.xs[hi], k) + nx * w, lerp(P.ys[lo], P.ys[hi], k) + ny * w, nx, ny];
  }
  // the staff is drawn by the first note as it travels
  function staff(ctx, P, t, o = {}) {
    const lead = o.full ? P.L : clamp(SPEED * (t - melody[0].t) - (o.offset || 0) + 40, 0, P.L);
    if (lead <= 0) return;
    ctx.save();
    ctx.strokeStyle = Pen.INK; ctx.lineWidth = o.w || 1.4; ctx.lineCap = 'round';
    for (let l = -2; l <= 2; l++) {
      ctx.beginPath();
      for (let d = 0; d <= lead; d += 8) {
        const [x, y, nx, ny] = at(P, d), off = l * SP + 0.4 * noise(d / 50 + Pen.clock * 0.6, l + 9);
        const fade = Math.min(1, d / 60, (P.L - d) / 90);
        ctx.globalAlpha = 0.5 * fade * (o.alpha == null ? 1 : o.alpha);
        d ? ctx.lineTo(x + nx * off, y + ny * off) : ctx.moveTo(x + nx * off, y + ny * off);
        if (d % 48 === 0) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + nx * off, y + ny * off); }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // draw every note that is riding this staff right now
  function riders(ctx, P, t, o = {}) {
    const born = o.born || 0, offset = o.offset || 0, scale = o.scale || 1;
    for (const n of melody) {
      if (t < n.t) break;
      const d = SPEED * (t - n.t) - offset;
      if (d < -20 || d > P.L) continue;
      const [x, y, nx, ny] = at(P, Math.max(0, d));
      const fade = Math.min(1, (P.L - d) / 90) * (born ? 1 : clamp((d + 20) / 60));
      const pop = born ? 1 + 0.6 * Math.exp(-(t - n.t) / 0.09) * (t - n.t < 0.5 ? 1 : 0) : 1;
      if (born && t - n.t < 0.35) burst(ctx, x, y, t - n.t, n.color);
      noteGlyph(ctx, x, y, Math.atan2(-nx, ny), n, scale * pop, fade, nx, ny);
    }
  }
  function burst(ctx, x, y, age, color) {
    const k = age / 0.35;
    ctx.save(); ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = Pen.INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.3, r0 = 14 + 16 * k, r1 = r0 + 8;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }
  // a note on the staff: height from its pitch, stem and flags from its length
  function noteGlyph(ctx, x, y, ang, n, scale, alpha, nx, ny) {
    if (alpha <= 0) return;
    const off = (n.step - 4) * SP / 2;
    ctx.save();
    ctx.translate(x + nx * off, y + ny * off); ctx.rotate(ang);
    const grace = n.dur < 0.15, s = scale * (grace ? 0.66 : 1), rx = 7.4 * s, ry = 5.4 * s;
    ctx.globalAlpha = alpha; ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
    // ledger lines
    ctx.lineWidth = 1.5;
    for (let L = 10; L <= n.step; L += 2) { const yy = -(L - n.step) * SP / 2; ctx.beginPath(); ctx.moveTo(-rx * 1.7, yy); ctx.lineTo(rx * 1.7, yy); ctx.stroke(); }
    for (let L = -2; L >= n.step; L -= 2) { const yy = -(L - n.step) * SP / 2; ctx.beginPath(); ctx.moveTo(-rx * 1.7, yy); ctx.lineTo(rx * 1.7, yy); ctx.stroke(); }
    const hollow = n.dur >= 1.5;
    if (!hollow) crayon(pts.ellipse(0, 0, rx * 1.05, ry * 1.05, 0, 1).map(([a, b]) => [a * 0.95 + b * 0.3, b - a * 0.3]), n.color, { alpha: 0.95 * alpha, dx: 1.5, dy: -1, seed: 7 + n.i });
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, -0.32, 0, Math.PI * 2); ctx.stroke();
    if (hollow) crayon(pts.ellipse(0, 0, rx * 0.5, ry * 0.5, 0, 1), n.color, { alpha: 0.9 * alpha, dx: 0, dy: 0, seed: 7 + n.i });
    const up = n.step < 4, sx = up ? rx * 0.92 : -rx * 0.92, len = 3.3 * SP * s, sy = up ? -len : len;
    ctx.beginPath(); ctx.moveTo(sx, up ? -1 : 1); ctx.lineTo(sx, sy); ctx.stroke();
    const flags = n.dur <= 0.26 ? 2 : n.dur <= 0.5 ? 1 : 0;
    for (let f = 0; f < flags; f++) {
      const fy = sy + (up ? 1 : -1) * f * 6 * s;
      ctx.beginPath(); ctx.moveTo(sx, fy); ctx.quadraticCurveTo(sx + 9 * s, fy + (up ? 7 : -7) * s, sx + 7 * s, fy + (up ? 16 : -16) * s); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function clef(ctx, P, alpha) {
    const [x, y, nx, ny] = at(P, 26);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(-nx, ny)); ctx.scale(SP * 7.2, SP * 7.2);
    ctx.globalAlpha = alpha; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4 / (SP * 7.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of window.FONTS.clef) { ctx.beginPath(); for (let i = 0; i < s.length; i += 2) i ? ctx.lineTo(s[i], s[i + 1] + 0.05) : ctx.moveTo(s[i], s[i + 1] + 0.05); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------- characters ----------
  function eye(ctx, x, y, r, open, look) {
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
  // the Count: wide awake, then the lids come down one beat at a time in bar 7
  function countOpen(t) {
    if (t >= BARS[7]) return 0;
    let o = 1;
    if (t >= BEATS[6][0]) {
      const steps = [0.72, 0.46, 0.22], b = BEATS[6];
      o = 1;
      for (let j = 0; j < 3; j++) if (t >= b[j]) o = lerp(j ? steps[j - 1] : 1, steps[j], ease(clamp((t - b[j]) / 0.4)));
      o = lerp(o, 0.08, seg(t, b[3] - 0.6, b[3]));
    }
    for (const bl of [2.7, 7.6, 20.8]) { const d = Math.abs(t - bl); if (d < 0.09) o *= d / 0.09; }
    return o;
  }

  // ---------- the house, drawn on the first time each room is seen ----------
  const REVEAL = { bed: 0.05, music: 9.15, out: 30.45 };
  const rv = (t, key, a, b, span) => seg(t, REVEAL[key] + a * span, REVEAL[key] + b * span);

  function bedroom(ctx, t) {
    const R = (a, b) => rv(t, 'bed', a / 6, b / 6, 1.9);
    ink(S.ceiling, { prog: R(0.1, 1.4) });
    guide(S.clockGuide[0], { prog: R(3.0, 3.3), alpha: 0.7 * (1 - R(4.4, 5.4)) });
    inkGroup(group(S.clockGuide.slice(1)), R(3.05, 3.3), { w: 1.2, color: Pen.GUIDE, alpha: 0.7 * (1 - R(4.4, 5.4)), boil: 0.2 });
    inkGroup(S.clock, R(3.2, 4.1));
    if (R(3.9, 4) > 0) {
      const b = beatAt(t), hours = (2 + b / 600) / 12 * Math.PI * 2 - Math.PI / 2, minutes = (b / 60) * Math.PI * 2 - Math.PI / 2 + 0.4;
      ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(200, 330); ctx.lineTo(200 + Math.cos(hours) * 22, 330 + Math.sin(hours) * 22); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(200, 330); ctx.lineTo(200 + Math.cos(minutes) * 33, 330 + Math.sin(minutes) * 33); ctx.stroke();
      pendulum(ctx, 200, 388, 70, 9, b);
    }
    inkGroup(S.table, R(4.0, 4.5));
    inkGroup(S.glass, R(4.3, 4.6));
    crayon([[152, 616], [172, 616], [171, 636], [153, 636]], C.blue, { prog: R(4.5, 4.8), alpha: 0.6, dx: 1, dy: 1 });
    inkGroup(S.books, R(4.4, 4.8));
    crayon([[190, 626], [236, 626], [236, 638], [190, 638]], C.red, { prog: R(4.7, 5.0), alpha: 0.8 });
    crayon([[194, 614], [230, 614], [230, 626], [194, 626]], C.teal, { prog: R(4.8, 5.1), alpha: 0.8 });

    inkGroup(S.winGuide, R(1.8, 2.1), { w: 1.2, color: Pen.GUIDE, alpha: 0.6 * (1 - R(3.5, 4.5)), boil: 0.2 });
    ctx.save();
    ctx.beginPath(); ctx.rect(602, 254, 176, 196); ctx.clip();
    ctx.translate(lerp(742, 700, t / DURATION), 300);
    crayonEllipse(0, 0, 25, 25, C.yellow, { prog: R(2.9, 3.3), dx: 6, dy: -4 });
    ink(S.moonSmall, { prog: R(2.6, 3.0) });
    ctx.restore();
    inkGroup(S.window, R(2.0, 2.8));
    ctx.fillStyle = Pen.INK;
    S.winStars.forEach(([x, y], i) => { if (R(3 + i * 0.12, 3.1 + i * 0.12) > 0) { ctx.beginPath(); ctx.arc(x, y, 2.2 + (i % 2), 0, Math.PI * 2); ctx.fill(); } });
    inkGroup(S.rod, R(2.4, 2.6));
    crayon(S.curtainL, C.pink, { prog: R(2.8, 3.2), dx: 4, dy: 2, seed: 4 });
    crayon(S.curtainR, C.pink, { prog: R(2.9, 3.3), dx: -3, dy: 3, seed: 6 });
    inkGroup(S.curtains, R(2.6, 3.1));

    inkGroup(S.bed, R(0.0, 1.0));
    inkGroup(S.bedShade, R(0.8, 1.6), { w: 1.8 });
    ink(S.pillow, { prog: R(0.4, 0.9) });
    crayon(S.blanketPoly, C.teal, { prog: R(1.6, 2.4), dx: 6, dy: -2, seed: 9 });
    inkGroup(S.blanket, R(1.0, 1.8));
    inkGroup(S.blanketDots, R(2.3, 2.7), { w: 2.2 });

    const o = countOpen(t);
    const turn = -0.05 * smooth(seg(t, 3.6, 4.6)) + 0.07 * smooth(seg(t, BARS[6], BARS[7])) + 0.01 * Math.sin(t * 0.7);
    ctx.save();
    ctx.translate(404, 596 + 3 * smooth(seg(t, BARS[6], BARS[7]))); ctx.rotate(turn);
    if (R(0.7, 0.8) > 0) {
      ctx.fillStyle = Pen.PAPER;
      ctx.beginPath(); ctx.ellipse(0, 0, 43, 41, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); S.capPoly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
    }
    crayon(S.capPoly, C.red, { prog: R(1.2, 1.7), dx: 5, dy: -3, seed: 13 });
    inkGroup(S.cap, R(0.9, 1.4));
    crayonEllipse(-86, -84, 10, 10, C.yellow, { prog: R(1.5, 1.7), dx: 2, dy: -2 });
    ink(S.pompom, { prog: R(1.4, 1.6) });
    ink(S.head, { prog: R(0.7, 1.1) });
    ink(S.ear, { prog: R(1.0, 1.2) });
    ink(S.nose, { prog: R(1.1, 1.3) });
    ink(S.mouth, { prog: R(1.2, 1.4), w: 2.4 });
    crayonEllipse(28, 12, 8, 5, C.pink, { prog: R(1.6, 1.8), alpha: 0.75, dx: 0, dy: 0 });
    if (R(1.3, 1.4) > 0) {
      // he watches the music come in, then stares at the ceiling
      const look = t < 3.4 ? [0.2, -0.8] : t < BARS[6] ? [0.75, -0.55] : [0.3, -0.7];
      const oo = o * smooth(R(1.3, 1.6));
      eye(ctx, 8, -10, 15, oo, look);
      eye(ctx, 38, -16, 12.5, oo, look);
    }
    ctx.restore();

    if (t > BARS[7] + 0.4) {
      for (let i = 0; i < 3; i++) {
        const k = ((t - BARS[7] - 0.4) / 2.6 + i / 3) % 1, a = clamp(k / 0.15) * clamp((1 - k) / 0.3) * seg(t, BARS[7] + 0.4, BARS[7] + 1.2);
        ctx.save();
        ctx.translate(470 + k * 70 + 8 * Math.sin(k * 7 + i), 540 - k * 140);
        const s = 0.6 + k * 0.7; ctx.scale(s, s);
        write(S.z, 1, { alpha: a, w: 2.8 / s });
        ctx.restore();
      }
    }
  }

  // a pendulum swings through the middle on every beat
  function pendulum(ctx, x, y, len, r, b) {
    const a = 0.34 * Math.sin(Math.PI * b), bx = x + Math.sin(a) * len, by = y + Math.cos(a) * len;
    ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.2, r * 0.24); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();
    crayonEllipse(bx, by, r, r, C.yellow, { dx: r * 0.2, dy: -r * 0.1 });
    ctx.lineWidth = Math.max(2.4, r * 0.18); ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
  }

  function musicRoom(ctx, t) {
    const R = (a, b) => rv(t, 'music', (a - 6.6) / 4, (b - 6.6) / 4, 1.0);
    crayon(pts.ellipse(1880, 300, 46, 58, 0, 1), C.yellow, { prog: R(10.0, 10.4), alpha: 0.55, dx: 3, dy: -3 });
    crayon(pts.ellipse(1880, 300, 38, 50, 0, 1), Pen.PAPER, { prog: R(10.0, 10.4), alpha: 1, dx: 0, dy: 0 });
    crayon(pts.ellipse(1880, 296, 30, 30, 0, 1), C.wig, { prog: R(10.2, 10.5), alpha: 0.7 });
    inkGroup(S.portrait, R(9.4, 10.3), { w: 2.4 });

    inkGroup(S.harpsGuide, R(6.6, 7.1), { w: 1.2, color: Pen.GUIDE, alpha: 0.65 * (1 - R(9, 10.6)), boil: 0.2 });
    crayon(S.lidPoly, C.green, { prog: R(8.0, 8.4), dx: 4, dy: -3, seed: 31, alpha: 0.85 });
    crayon(S.caseOutline, C.brown, { prog: R(7.9, 8.6), dx: 6, dy: -3, seed: 33 });
    crayon(S.lidInner, C.yellow, { prog: R(8.2, 8.6), dx: 3, dy: -2, seed: 35, alpha: 0.8 });
    inkGroup(S.strings, R(8.4, 8.7), { w: 1.4, alpha: 0.6 });
    ink(S.rose, { prog: R(8.6, 8.8), w: 2 });
    inkGroup(S.harps, R(6.9, 8.3));
    inkGroup(S.keys, R(8.1, 8.3), { w: 1.6 });
    inkGroup(S.stand, R(8.6, 8.9));
    inkGroup(S.sheetLines, R(8.8, 9.0), { w: 1.2, alpha: 0.7 });
    write(S.sheetTitle, R(8.9, 9.1), { w: 1.6 });

    // the candle goes out once the last chord has rung
    const OUT = 33.9;
    inkGroup(S.candleBase, R(8.5, 8.8));
    const top = 532 - lerp(64, 50, t / DURATION);
    const a = R(8.6, 8.9);
    if (a > 0) {
      crayon([[1494, 532], [1494, top], [1506, top], [1506, 532]], '#f6e7c8', { alpha: a, dx: 1, dy: 0 });
      ctx.globalAlpha = a; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1494, 532); ctx.lineTo(1494, top); ctx.quadraticCurveTo(1500, top - 3, 1506, top); ctx.lineTo(1506, 532); ctx.stroke();
      ctx.globalAlpha = 1;
      if (t < OUT) {
        const fl = 1 + 0.08 * noise(t * 2.2, 2) + 0.1 * Math.max(press(t, 0), press(t, 1));
        const g = ctx.createRadialGradient(1500, top - 14, 4, 1500, top - 14, 170 * fl);
        g.addColorStop(0, `rgba(${C.glow},${0.3 * a})`); g.addColorStop(1, `rgba(${C.glow},0)`);
        ctx.fillStyle = g; ctx.fillRect(1320, top - 190, 360, 360);
        const sway = 2.2 * noise(t * 1.4, 5);
        const flame = pts.curve([[1500, top - 2], [1508, top - 10], [1503 + sway, top - 22 * fl], [1500 + sway * 1.6, top - 30 * fl], [1497 + sway, top - 22 * fl], [1492, top - 10], [1500, top - 2]], 4);
        crayon(flame, C.yellow, { dx: 1, dy: -1, alpha: a });
        crayon(flame.map(([x, y]) => [1500 + (x - 1500) * 0.5, top - 4 + (y - top + 4) * 0.55]), C.orange, { dx: 0, dy: 0, alpha: a });
        ctx.globalAlpha = a; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2;
        ctx.beginPath(); flame.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        const k = clamp((t - OUT) / 1.6);
        ctx.save(); ctx.translate(1500 + 3 * Math.sin(t * 2), top - 4);
        ink(S.smoke, { prog: clamp(k * 2), w: 1.8, alpha: 0.8 * (1 - k * 0.7) });
        ctx.restore();
      }
    }

    // young Goldberg; his hands come down with the notes, his head sways with the bar
    const sway = 3 * Math.sin(Math.PI * 2 * beatAt(t) / 3);
    inkGroup(S.stool, R(7.6, 8.1));
    crayon([[1208, 600], [1292, 600], [1292, 610], [1208, 610]], C.red, { prog: R(8.0, 8.2) });
    inkGroup(S.legs, R(7.8, 8.4));
    crayon(S.coatPoly, C.red, { prog: R(8.3, 8.8), dx: 4, dy: -2, seed: 41 });
    inkGroup(S.coat, R(7.7, 8.3));
    ctx.fillStyle = Pen.INK;
    if (R(8.5, 8.6) > 0) S.buttons.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); });
    const ha = R(8.0, 8.4);
    if (ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      for (const [ox, dy] of [[-10, press(t, 1) * 5], [0, press(t, 0) * 7]]) {
        const hx = 1320 + ox, hy = 552 + dy;
        ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1264 + ox * 0.4, 510); ctx.quadraticCurveTo(1280 + ox, 556, hx - 8, hy - 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx, hy, 7, 5.5, 0.4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(1262 + sway * 0.4, 456 + Math.abs(sway) * 0.3); ctx.rotate(0.02 * sway);
    crayon(S.wigPoly, C.wig, { prog: R(8.0, 8.5), dx: 3, dy: -2, seed: 45, alpha: 0.75 });
    ink(S.gHead, { prog: R(7.6, 7.9) });
    inkGroup(S.wig, R(7.8, 8.4), { w: 2.6 });
    ink(S.gNose, { prog: R(7.9, 8.0) });
    ink(S.gMouth, { prog: R(8.0, 8.1), w: 2.2 });
    crayonEllipse(16, 8, 6, 4, C.pink, { prog: R(8.3, 8.5), alpha: 0.7, dx: 0, dy: 0 });
    if (R(7.9, 8.0) > 0) eye(ctx, 14, -6, 11, smooth(R(7.9, 8.2)) * (t < OUT ? 1 : 0.6), [0.6, 0.8]);
    ctx.restore();
  }

  function outside(ctx, t) {
    if (t < REVEAL.out) return;
    const R = (a, b) => rv(t, 'out', (a - 15.2) / 4, (b - 15.2) / 4, 1.6);
    crayon(S.skyPoly, C.sky, { prog: R(16.6, 18.8), alpha: 0.22, dx: 0, dy: 0, seed: 51 });
    crayon(S.roofA, C.roof, { prog: R(15.9, 16.6), dx: 6, dy: -4, seed: 53, alpha: 0.8 });
    crayon(S.roofB, C.roof, { prog: R(16.0, 16.7), dx: 6, dy: -4, seed: 55, alpha: 0.8 });
    crayon(S.chimneyPoly, C.brown, { prog: R(16.3, 16.6), dx: 4, dy: -3 });
    inkGroup(S.roofs, R(15.2, 16.2));
    inkGroup(S.tiles, R(16.0, 17.0), { w: 1.8, alpha: 0.7 });
    inkGroup(S.chimney, R(16.0, 16.4));
    inkGroup(S.sideWalls, R(15.4, 16.0));
    S.houses.forEach((h, i) => {
      const a = 15.8 + i * 0.4;
      crayon(h.roofPoly, C.roof, { prog: R(a + 0.6, a + 1.1), alpha: 0.7, seed: 60 + i });
      h.wins.forEach(([x, y], j) => {
        const lit = 1 - seg(t, 33.2 + (j * 2 + i) * 0.18, 33.5 + (j * 2 + i) * 0.18);
        if (lit > 0) crayon(pts.rect(x, y, x + 70, y + 90), C.yellow, { prog: R(a + 0.8 + j * 0.08, a + 1.2 + j * 0.08), alpha: 0.85 * lit, dx: 4, dy: -3, seed: 70 + j });
      });
      crayon(pts.rect(h.door[0], h.door[1], h.door[0] + 66, 760), C.teal, { prog: R(a + 1.0, a + 1.3), alpha: 0.8 });
      inkGroup(h.lines, R(a, a + 1.0));
    });
    crayonEllipse(420, -560, 78, 78, C.yellow, { prog: R(17.0, 17.6), dx: 9, dy: -6, seed: 81 });
    ink(S.moon, { prog: R(16.8, 17.3), w: 3.6 });
    inkGroup(S.craters, R(17.4, 17.7), { w: 2.2 });
    // stars come out and breathe slowly
    const sa = R(17.0, 18.6);
    ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
    S.stars.forEach(([x, y, s, ph], i) => {
      if (sa * S.stars.length < i) return;
      ctx.globalAlpha = 0.55 + 0.4 * Math.sin(t * 1.1 + ph);
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function world(ctx, t, cx, cy, z, k) {
    ctx.setTransform(k * z, 0, 0, k * z, k * (540 - cx * z), k * (540 - cy * z));
    outside(ctx, t);
    ink(S.floor, { prog: rv(t, 'bed', 0, 0.4, 1.9), w: 3.4 });
    inkGroup(S.floorDash, rv(t, 'bed', 0.1, 0.5, 1.9), { w: 2.2 });
    inkGroup(S.wall, rv(t, 'bed', 0.7, 0.9, 1.9));
    inkGroup(S.wallHatch, rv(t, 'bed', 0.8, 1, 1.9), { w: 1.6 });
    musicRoom(ctx, t);
    bedroom(ctx, t);
    staff(ctx, S.streamWorld, t);
    if (t > REVEAL.music) clef(ctx, S.streamWorld, rv(t, 'music', 0.5, 0.9, 1));
    riders(ctx, S.streamWorld, t, { born: true });
  }
  const camLerp = (t, a, b, k0, k1, ez = smooth) => { const k = ez(seg(t, k0, k1)); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), k))]; };

  // ---------- the eight shots ----------
  const EYE = [404 + 8 - 3, 596 - 10];
  const SHOTS = [
    // 1  G: the Count, wide awake. ends by falling into his eye
    function (ctx, t, k) {
      const t1 = BARS[1];
      let [cx, cy, z] = camLerp(t, [560, 470, 1.18], [520, 500, 1.26], 0, t1);
      const dive = Math.pow(seg(t, t1 - 0.75, t1), 2.2);
      if (dive > 0) {
        // keep the eye where the clock face will be
        const Z = lerp(z, 9, dive), sx = lerp(540 + (EYE[0] - cx) * z, 540, dive), sy = lerp(540 + (EYE[1] - cy) * z, 380, dive);
        cx = EYE[0] - (sx - 540) / Z; cy = EYE[1] - (sy - 540) / Z; z = Z;
      }
      world(ctx, t, cx, cy, z, k);
    },
    // 2  F#: the clock that will not let him sleep, ticking on every beat
    function (ctx, t, k) { clockShot(ctx, t, k); },
    // 3  E: next door, the source of the music
    function (ctx, t, k) {
      const [cx, cy, z] = camLerp(t, [1470, 470, 1.5], [1500, 470, 1.62], BARS[2], BARS[3]);
      world(ctx, t, cx, cy, z, k);
    },
    // 4  D: the keyboard from above; every key lights as it is played
    function (ctx, t, k) { keysShot(ctx, t, k); },
    // 5  B: drift with the music from the harpsichord, through the wall, toward the Count
    function (ctx, t, k) {
      const [cx, cy, z] = camLerp(t, [1480, 440, 1.15], [760, 420, 1.15], BARS[4] - 0.2, BARS[5]);
      world(ctx, t, cx, cy, z, k);
    },
    // 6  C: under the floor, the bass has been laid like stepping stones
    function (ctx, t, k) { groundShot(ctx, t, k); },
    // 7  D: back with the Count; his eyes close a beat at a time
    function (ctx, t, k) {
      const [cx, cy, z] = camLerp(t, [455, 520, 1.85], [440, 540, 2.05], BARS[6], BARS[7]);
      world(ctx, t, cx, cy, z, k);
    },
    // 8  G (the Aria's last bar): the whole house, asleep
    function (ctx, t, k) {
      const [cx, cy, z] = camLerp(t, [1060, 360, 0.52], [1080, 250, 0.45], BARS[7], DURATION);
      world(ctx, t, cx, cy, z, k);
    },
  ];
  const shotStart = (i) => (i === 0 ? -1 : BARS[i]);

  // --- 2: the clock ---
  const clockG = {};
  function clockShot(ctx, t, k) {
    const t0 = BARS[1], CX = 540, CY = 380;
    if (!clockG.face) {
      clockG.guide = group([pts.ellipse(CX, CY, 262, 262, 0, 1), [[CX - 300, CY], [CX + 300, CY]], [[CX, CY - 300], [CX, CY + 300]]], { wobble: 1 });
      clockG.face = group([pts.ellipse(CX, CY, 240, 240, -1.4, 1.05), pts.ellipse(CX, CY, 214, 214, 1.0, 1.04),
        ...Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 196 : 180; return [[CX + Math.cos(a) * r0, CY + Math.sin(a) * r0], [CX + Math.cos(a) * 206, CY + Math.sin(a) * 206]]; }),
        pts.rect(CX - 74, CY + 236, CX + 74, CY + 520)], { wobble: 1.6 });
      clockG.nums = [['XII', 0], ['III', 3], ['VI', 6], ['IX', 9]].map(([s, h]) => { const a = h / 12 * Math.PI * 2 - Math.PI / 2; return text(s, 'tech', CX + Math.cos(a) * 148, CY + Math.sin(a) * 148 + 15, 40, { align: 'center' }); });
      clockG.stream = path(pts.curve([[1200, 600], [900, 520], [620, 560], [320, 470], [-140, 420]], 14), 26);
    }
    const zoom = lerp(2.3, 1, ease(seg(t, t0 - 0.25, t0 + 0.7)));
    ctx.setTransform(k * zoom, 0, 0, k * zoom, k * (CX - CX * zoom), k * (CY - CY * zoom));
    const R = (a, b) => seg(t, t0 - 0.2 + a, t0 - 0.2 + b);
    inkGroup(clockG.guide, R(0, 0.3), { w: 1.4, color: Pen.GUIDE, alpha: 0.7 * (1 - R(1.6, 2.4)), boil: 0.2 });
    crayonEllipse(CX, CY, 238, 238, '#f7f1e2', { prog: R(0.2, 0.4), dx: 0, dy: 0, alpha: 1 });
    crayon(pts.ellipse(CX, CY, 240, 240, 0, 1).concat(pts.ellipse(CX, CY, 214, 214, 0, 1).reverse()), C.yellow, { prog: R(0.4, 0.9), dx: 6, dy: -4, alpha: 0.8 });
    inkGroup(clockG.face, R(0.05, 0.8), { w: 3.4 });
    clockG.nums.forEach((g, i) => write(g, R(0.6 + i * 0.08, 0.9 + i * 0.08), { w: 3 }));
    // hands: the second hand ticks on each beat
    const b = beatAt(t), tick = Math.floor(b) + ease(clamp((b % 1) / 0.18));
    const hands = [[(2 + 6 / 60) / 12, 112, 7], [6 / 60 + b / 3600, 172, 5], [tick / 60 + 0.3, 196, 2.4]];
    ctx.globalAlpha = R(0.7, 0.9); ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
    hands.forEach(([f, l, w]) => {
      const a = f * Math.PI * 2 - Math.PI / 2;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(CX - Math.cos(a) * l * 0.15, CY - Math.sin(a) * l * 0.15); ctx.lineTo(CX + Math.cos(a) * l, CY + Math.sin(a) * l); ctx.stroke();
    });
    crayonEllipse(CX, CY, 11, 11, C.red, { dx: 1, dy: -1 });
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX, CY, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(CX - 72, CY + 238, 144, 280); ctx.clip();
    pendulum(ctx, CX, CY + 236, 230, 30, b);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    staff(ctx, clockG.stream, t, { offset: 600 });
    riders(ctx, clockG.stream, t, { offset: 600 });
  }

  // --- 4: the keyboard from above ---
  const KEYS = { lo: 48, hi: 74, x0: -10, y0: 380, len: 400, w: 0 };
  function keyRect(p) {
    const white = [0, 2, 4, 5, 7, 9, 11], pc = p % 12, oct = Math.floor(p / 12);
    let n = 0;
    for (let q = KEYS.lo; q < p; q++) if (white.includes(q % 12)) n++;
    if (white.includes(pc)) return { x: KEYS.x0 + n * KEYS.w, w: KEYS.w, black: false, len: KEYS.len };
    return { x: KEYS.x0 + n * KEYS.w - KEYS.w * 0.3, w: KEYS.w * 0.6, black: true, len: KEYS.len * 0.62 };
  }
  const keysG = {}, handX = [null, null];
  function keysShot(ctx, t, k) {
    const t0 = BARS[3];
    if (!keysG.white) {
      let whites = 0;
      for (let q = KEYS.lo; q <= KEYS.hi; q++) if ([0, 2, 4, 5, 7, 9, 11].includes(q % 12)) whites++;
      KEYS.w = 1100 / whites;
      keysG.white = []; keysG.black = [];
      for (let q = KEYS.lo; q <= KEYS.hi; q++) {
        const r = keyRect(q);
        (r.black ? keysG.black : keysG.white).push([q, r, stroke(pts.rect(r.x, KEYS.y0, r.x + r.w, KEYS.y0 + r.len), { wobble: 1.1 })]);
      }
      keysG.rail = group([[[-20, KEYS.y0 - 40], [1100, KEYS.y0 - 40]], [[-20, KEYS.y0 - 4], [1100, KEYS.y0 - 4]]]);
      keysG.railHatch = group(hatch([[-20, KEYS.y0 - 40], [1100, KEYS.y0 - 40], [1100, KEYS.y0 - 4], [-20, KEYS.y0 - 4]], { angle: -0.9, gap: 12, seed: 61 }), { wobble: 0.4 });
    }
    const [cx, cy, z] = camLerp(t, [540, 520, 1.0], [560, 520, 1.06], t0, BARS[4]);
    ctx.setTransform(k * z, 0, 0, k * z, k * (540 - cx * z), k * (540 - cy * z));
    const R = (a, b) => seg(t, t0 - 0.2 + a, t0 - 0.2 + b);
    ctx.save(); ctx.translate(540, 520); ctx.rotate(-0.06); ctx.translate(-540, -520);
    crayon([[-20, KEYS.y0 - 40], [1100, KEYS.y0 - 40], [1100, KEYS.y0 - 4], [-20, KEYS.y0 - 4]], C.brown, { prog: R(0.1, 0.4), dx: 3, dy: -2 });
    inkGroup(keysG.rail, R(0, 0.25));
    inkGroup(keysG.railHatch, R(0.2, 0.5), { w: 1.6 });
    const sounding = (q) => {
      let v = 0, col = null;
      for (const n of notes) if (n.pitch === q && t >= n.t - 0.02 && t < n.t + n.len + 0.25) {
        const a = clamp((t - n.t + 0.02) / 0.06) * (1 - seg(t, n.t + n.len, n.t + n.len + 0.25));
        if (a > v) { v = a; col = n.color; }
      }
      return [v, col];
    };
    keysG.white.forEach(([q, r, s], i) => {
      const [v, col] = sounding(q);
      if (v > 0) crayon(pts.rect(r.x + 3, KEYS.y0 + 4, r.x + r.w - 3, KEYS.y0 + r.len - 4), col, { alpha: 0.9 * v, dx: 2, dy: 2, seed: q });
      ink(s, { prog: R(0.05 + i * 0.012, 0.3 + i * 0.012), w: 2.6 });
    });
    keysG.black.forEach(([q, r, s], i) => {
      const [v, col] = sounding(q);
      ctx.globalAlpha = R(0.3 + i * 0.012, 0.4 + i * 0.012);
      ctx.fillStyle = Pen.INK; ctx.fillRect(r.x, KEYS.y0, r.w, r.len);
      ctx.globalAlpha = 1;
      if (v > 0) crayon(pts.rect(r.x + 4, KEYS.y0 + 4, r.x + r.w - 4, KEYS.y0 + r.len - 6), col, { alpha: v, dx: 1, dy: 1, seed: q });
    });
    // two small hands follow the voices, sleeves coming in from the bottom of the frame
    for (const voice of [1, 0]) {
      let cur = null;
      for (const n of notes) if (n.voice === voice && n.t <= t + 0.12 && (!cur || n.t > cur.t)) cur = n;
      const ha = R(0.4, 0.7);
      if (!cur || ha <= 0) continue;
      const r = keyRect(cur.pitch), target = r.x + r.w / 2;
      handX[voice] = handX[voice] == null || Math.abs(handX[voice] - target) > 400 ? target : lerp(handX[voice], target, 0.35);
      const hx = handX[voice], push = press(t, voice), py = KEYS.y0 + KEYS.len * 0.86 + push * 6;
      ctx.save(); ctx.globalAlpha = ha; ctx.translate(hx, py);
      const palm = pts.curve([[-44, 10], [-40, -22], [-20, -36], [0, -40], [22, -36], [42, -20], [46, 12], [30, 40], [-30, 40], [-44, 10]], 5);
      crayon([[-40, 30], [40, 30], [44, 260], [-44, 260]], C.red, { dx: 3, dy: 0, seed: 95 + voice });
      crayon(palm, '#f3d9c4', { dx: 2, dy: -2, seed: 90 + voice, alpha: 1 });
      ctx.strokeStyle = Pen.INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); palm.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      // four short fingers; the second one reaches a little further to press the key
      [[-28, -26, -48], [-9, -36, -62 - push * 8], [10, -36, -54], [29, -28, -46]].forEach(([x, y0, y1], j) => {
        crayon([[x - 8, y0 + 4], [x - 8, y1 + 6], [x + 8, y1 + 6], [x + 8, y0 + 4]], '#f3d9c4', { dx: 0, dy: 0, alpha: 1, seed: 92 + j });
        ctx.beginPath(); ctx.moveTo(x - 8, y0); ctx.lineTo(x - 8, y1 + 8); ctx.quadraticCurveTo(x, y1 - 2, x + 8, y1 + 8); ctx.lineTo(x + 8, y0); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(-40, 34); ctx.lineTo(-44, 260); ctx.moveTo(40, 34); ctx.lineTo(44, 260); ctx.moveTo(-42, 52); ctx.lineTo(42, 52); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // notes rise off the keys they came from, like a piano roll read upwards
    for (const n of notes) {
      if (n.voice !== 0 || t < n.t || t - n.t > 3) continue;
      const r = keyRect(n.pitch), age = t - n.t, kx = r.x + r.w / 2, ky = KEYS.y0 - 60;
      const x = 540 + (kx - 540) * Math.cos(-0.06) - (ky - 520) * Math.sin(-0.06);
      const y0 = 520 + (kx - 540) * Math.sin(-0.06) + (ky - 520) * Math.cos(-0.06), y = y0 - age * 120;
      const nn = Object.assign({}, n, { step: 4 });
      noteGlyph(ctx, x, y, 0, nn, 1.7 * (1 + 0.5 * Math.exp(-age / 0.09)), clamp((y + 40) / 120), 0, -1);
      if (age < 0.35) burst(ctx, x, y0, age, n.color);
    }
  }

  // --- 6: the ground ---
  const groundG = {};
  function groundShot(ctx, t, k) {
    const t0 = BARS[5], FLOOR = 250;
    const stone = (i) => [140 + i * 114, 720 - CONTOUR[i] * 36];
    if (!groundG.floor) {
      groundG.floor = group([[[-20, FLOOR], [1100, FLOOR + 2]], [[-20, FLOOR + 12], [1100, FLOOR + 12]]]);
      groundG.legs = group([[[120, 120], [122, FLOOR]], [[380, 130], [378, FLOOR]], [[120, 190], [380, 190]],
        ...[700, 880, 1040].map((x) => pts.curve([[x, 100], [x - 8, 150], [x + 6, 200], [x, FLOOR]]))]);
      groundG.soil = [[-20, FLOOR + 12], [1100, FLOOR + 12], [1100, 900], [-20, 900]];
      const r = rng(9);
      groundG.strata = group(Array.from({ length: 34 }, () => { const x = r() * 1080, y = FLOOR + 40 + r() * 600, l = 20 + r() * 60; return [[x, y], [x + l, y + (r() - 0.5) * 4]]; }), { wobble: 0.8 });
      groundG.pebbles = group(Array.from({ length: 18 }, () => pts.ellipse(r() * 1080, FLOOR + 60 + r() * 560, 5 + r() * 6, 4 + r() * 3, r() * 6, 1.04)), { wobble: 0.5 });
      groundG.stones = CONTOUR.map((_, i) => { const [x, y] = stone(i); return stroke(pts.ellipse(x, y, 54, 42, -2.4 + i, 1.06), { wobble: 2 }); });
      groundG.path = group(CONTOUR.slice(1).map((_, i) => [stone(i), stone(i + 1)]), { wobble: 1.5 });
      groundG.letters = BASS.map((s, i) => { const [x, y] = stone(i); return text(s, 'tech', x, y + 16, 44, { align: 'center' }); });
      groundG.stream = path(pts.curve([[1200, 150], [860, 120], [560, 170], [260, 110], [-140, 150]], 14), 34);
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const R = (a, b) => seg(t, t0 - 0.2 + a, t0 - 0.2 + b);
    crayon(groundG.soil, C.soil, { prog: R(0, 0.5), alpha: 0.32, dx: 0, dy: 0, seed: 71 });
    inkGroup(groundG.floor, R(0, 0.3), { w: 3.2 });
    inkGroup(groundG.legs, R(0.1, 0.4));
    inkGroup(groundG.strata, R(0.2, 0.7), { w: 1.6, alpha: 0.7 });
    inkGroup(groundG.pebbles, R(0.3, 0.7), { w: 1.8 });
    // the path the bass walks, already written all the way to the end
    inkGroup(groundG.path, R(0.3, 0.8), { w: 1.6, color: Pen.GUIDE, alpha: 0.9 });
    CONTOUR.forEach((_, i) => {
      const [x, y] = stone(i);
      if (i < 5) {
        crayon(pts.ellipse(x, y, 54, 42, 0, 1), C.stone, { prog: R(0.1 + i * 0.06, 0.35 + i * 0.06), dx: 5, dy: -3, seed: 80 + i });
        ink(groundG.stones[i], { prog: R(0.05 + i * 0.06, 0.3 + i * 0.06), w: 3 });
        write(groundG.letters[i], R(0.3 + i * 0.06, 0.5 + i * 0.06), { w: 2.8 });
      } else if (i === 5) {
        // C lands on the downbeat
        const fall = ease(clamp((t - t0 + 0.05) / 0.32)), yy = lerp(y - 260, y, fall) - 10 * Math.sin(Math.PI * clamp((t - t0 - 0.27) / 0.22));
        if (t > t0 - 0.05) {
          crayonEllipse(x, yy, 64, 52, C.orange, { alpha: 0.55 * seg(t, t0 + 0.25, t0 + 0.5) * (1 - seg(t, t0 + 1.5, t0 + 3)), dx: 0, dy: 0, seed: 88 });
          crayon(pts.ellipse(x, yy, 54, 42, 0, 1), C.stone, { dx: 5, dy: -3, seed: 85 });
          ctx.save(); ctx.translate(0, yy - y); ink(groundG.stones[i], { w: 3 }); write(groundG.letters[i], 1, { w: 2.8 }); ctx.restore();
          const d = clamp((t - t0 - 0.27) / 0.5);
          if (d > 0 && d < 1) {
            ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2; ctx.globalAlpha = 1 - d;
            for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + s * (60 + d * 30), y + 30 - j * 12); ctx.lineTo(x + s * (74 + d * 44), y + 26 - j * 16); ctx.stroke(); }
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // the bars still to come are already there, in pencil
        guide(groundG.stones[i], { prog: R(0.5, 0.8), alpha: 0.9 });
        write(groundG.letters[i], R(0.6, 0.9), { w: 1.6, color: Pen.GUIDE, alpha: 0.9 });
      }
    });
    // above the floor the tune keeps wandering
    staff(ctx, groundG.stream, t, { offset: 300 });
    riders(ctx, groundG.stream, t, { offset: 300, scale: 0.9 });
  }

  // ---------- captions and the bass line along the bottom ----------
  const CAPTIONS = [
    [0.1, 'one night in Dresden,'],
    [BARS[1] + 0.1, 'a count could not sleep.'],
    [BARS[2] + 0.1, 'next door, a boy was playing.'],
    [BARS[3] + 0.1, ''],
    [BARS[4] + 0.1, 'the tune wandered,'],
    [BARS[5] + 0.1, 'but the bass beneath it held still,'],
    [BARS[6] + 0.1, 'something steady to lean on,'],
    [BARS[7] + 0.1, 'and the Count slept.'],
  ];
  const FINAL = 33.5;
  let captionGroups = null, finalText = null;
  function captions(ctx, t) {
    if (!captionGroups) captionGroups = CAPTIONS.map(([, s]) => text(s, 'tech', 540, 1026, 42, { align: 'center' }));
    let i = -1;
    for (let k = 0; k < CAPTIONS.length; k++) if (t >= CAPTIONS[k][0]) i = k;
    if (i < 0) return;
    const t0 = CAPTIONS[i][0], next = i + 1 < CAPTIONS.length ? CAPTIONS[i + 1][0] - 0.1 : FINAL;
    const fade = clamp((next - t) / 0.3);
    write(captionGroups[i], clamp((t - t0) / Math.max(0.8, CAPTIONS[i][1].length / 16)), { alpha: 0.95 * fade, w: 2.9 });
    if (!finalText) finalText = [text('aria.', 'tech', 540, 1010, 86, { align: 'center' }),
      text('J. S. Bach, Goldberg Variations, Aria (bars 1-7, 32)   /   Kimiko Ishizaka, piano', 'tech', 540, 1054, 18, { align: 'center' })];
    write(finalText[0], seg(t, FINAL, FINAL + 0.9), { w: 3.6 });
    write(finalText[1], seg(t, FINAL + 0.7, FINAL + 1.5), { w: 1.6, alpha: 0.85 });
  }
  const STRIP = CONTOUR.map((v, i) => [540 + (i - 3.5) * 46, 946 - v * 4.4]);
  let stripG = null;
  function strip(ctx, t) {
    if (!stripG) stripG = { links: STRIP.slice(1).map((q, i) => stroke([STRIP[i], q], { wobble: 0.3, step: 2 })), names: BASS.map((n, i) => text(n, 'tech', STRIP[i][0], 980, 18, { align: 'center', wobble: 0.2 })) };
    const a = 1 - seg(t, FINAL - 0.4, FINAL);
    if (a <= 0) return;
    let cur = -1;
    for (let i = 0; i < 8; i++) if (t >= BARS[i] - 0.02) cur = i;
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i <= cur; i++) {
      const [x, y] = STRIP[i], age = t - BARS[i];
      if (i > 0) ink(stripG.links[i - 1], { prog: clamp(age / 0.25), w: 1.6, alpha: 0.75 * a });
      if (i === cur) crayonEllipse(x, y, 10, 10, C.orange, { alpha: 0.9 * a, dx: 1, dy: -1, seed: 100 + i });
      ctx.fillStyle = Pen.INK;
      ctx.beginPath(); ctx.arc(x, y, 3.2 * (1 + 0.8 * Math.exp(-age / 0.12)), 0, Math.PI * 2); ctx.fill();
    }
    if (cur >= 0) write(stripG.names[cur], 1, { w: 1.8, alpha: 0.9 * a });
    ctx.restore();
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
  function margin(ctx) {
    if (!marginGrad) { marginGrad = ctx.createLinearGradient(0, 892, 0, 935); marginGrad.addColorStop(0, 'rgba(244,239,228,0)'); marginGrad.addColorStop(1, 'rgba(244,239,228,0.92)'); }
    ctx.fillStyle = marginGrad; ctx.fillRect(0, 892, 1080, 188);
  }

  // ---------- one frame ----------
  const DISSOLVE = 0.22;
  let off = null;
  function drawShot(canvas, i, t) {
    const ctx = canvas.getContext('2d'), k = canvas.width / 1080;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    Pen.begin(ctx, t);
    paper(ctx);
    SHOTS[i](ctx, t, k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
  }
  function frame(canvas, t) {
    let i = 0;
    while (i < 7 && t >= shotStart(i + 1)) i++;
    drawShot(canvas, i, t);
    const ctx = canvas.getContext('2d'), k = canvas.width / 1080;
    // soft cut: the next shot fades in just ahead of its downbeat
    if (i < 7 && t > shotStart(i + 1) - DISSOLVE) {
      if (!off || off.width !== canvas.width) { off = document.createElement('canvas'); off.width = off.height = canvas.width; }
      drawShot(off, i + 1, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = smooth((t - shotStart(i + 1) + DISSOLVE) / DISSOLVE);
      ctx.drawImage(off, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    Pen.begin(ctx, t);
    margin(ctx);
    strip(ctx, t);
    captions(ctx, t);
  }

  build();
  window.Film = { frame, DURATION };
})();
