// "aria": one night, one sheet of paper, one bass line.
// Time is measured in performed bars (p = 0..64, A A B B) taken from the recording,
// so the drawing moves with the music rather than with the clock.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, hatch, text, write, seg, smooth, ease, clamp, lerp, noise, rng } = Pen;
  const T = window.TIMING, B = T.bars, END = B[64];
  const HOLD = 6.5;
  const DURATION = T.duration + HOLD;

  const C = {
    yellow: '#f2b33d', orange: '#ee7d33', teal: '#2f9d8e', red: '#d9493c', pink: '#f19c9c', brown: '#b5703c',
    blue: '#6683cf', green: '#5ea65a', wig: '#cfc8bd', roof: '#cc5f3f', sky: '#8592d6', glow: '255,196,92',
  };
  const PC_COLOR = [C.teal, C.pink, C.orange, C.blue, C.teal, C.yellow, C.red, C.yellow, C.pink, C.orange, C.blue, C.green];

  // ground bass: letter names and a contour for drawing (diatonic steps above G2)
  const BASS = ['G', 'F#', 'E', 'D', 'B', 'C', 'D', 'G', 'G', 'F#', 'E', 'A', 'F#', 'G', 'A', 'D',
    'D', 'B', 'C', 'B', 'G', 'A', 'B', 'E', 'C', 'B', 'A', 'D', 'G', 'C', 'D', 'G'];
  const CONTOUR = [7, 6, 5, 4, 2, 3, 4, 0, 7, 6, 5, 8, 6, 7, 8, 4, 4, 2, 3, 2, 0, 1, 2, -2, 3, 2, 1, 4, 0, 3, 4, 0];

  // ---------- musical time ----------
  function pAt(t) {
    if (t < B[0]) return (t - B[0]) / (B[1] - B[0]);
    if (t >= END) return 64 + (t - END) / (END - B[63]);
    let lo = 0, hi = 64;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (B[m] <= t) lo = m; else hi = m; }
    return lo + (t - B[lo]) / (B[lo + 1] - B[lo]);
  }
  function tAt(p) {
    if (p < 0) return B[0] + p * (B[1] - B[0]);
    if (p >= 64) return END + (p - 64) * (END - B[63]);
    const k = Math.floor(p);
    return B[k] + (p - k) * (B[k + 1] - B[k]);
  }
  // performed bar -> bar of the score (0..31)
  const scoreBar = (k) => (k < 16 ? k : k < 32 ? k - 16 : k < 48 ? k - 16 : k - 32);
  const firstPass = (m) => (m < 16 ? m : m + 16);
  const secondPass = (m) => (m < 16 ? m + 16 : m + 32);

  // ---------- camera ----------
  const SHOTS = [
    [-1, 540, 520, 1.0], [3.2, 540, 520, 1.0], [6.0, 470, 592, 1.55], [7.0, 470, 592, 1.55],
    [8.8, 1600, 520, 1.0], [11.8, 1580, 520, 1.0], [13.6, 1430, 530, 1.4], [14.9, 1430, 530, 1.4],
    [16.8, 1080, 250, 0.5], [21.0, 1080, 270, 0.52], [23.2, 560, 520, 1.0], [26.2, 560, 520, 1.0],
    [29.0, 450, 588, 1.6], [30.4, 450, 588, 1.6], [33.4, 1300, -420, 0.72], [38.0, 1100, -820, 0.66],
    [45.2, 1060, -860, 0.62], [48.6, 560, 520, 1.0], [53.0, 560, 520, 1.0], [56.0, 440, 592, 1.5],
    [58.2, 440, 592, 1.5], [61.2, 1080, 260, 0.5], [64.0, 1080, 220, 0.47], [66.4, 1100, -230, 0.36],
  ];
  function camera(p) {
    if (p <= SHOTS[0][0]) return SHOTS[0].slice(1);
    for (let i = 0; i < SHOTS.length - 1; i++) {
      const a = SHOTS[i], b = SHOTS[i + 1];
      if (p < b[0]) {
        const k = smooth((p - a[0]) / (b[0] - a[0]));
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), k))];
      }
    }
    return SHOTS[SHOTS.length - 1].slice(1);
  }

  // ---------- the sheet ----------
  const S = {};
  function build() {
    const st = (p, o) => stroke(p, o);
    // floor and ceiling run the whole width of the sheet
    S.floorL = st([[560, 760], [-1000, 762]]);
    S.floorR = st([[560, 760], [3200, 758]]);
    S.floorDash = group([[[-260, 776], [-60, 776]], [[120, 779], [460, 779]], [[700, 776], [980, 776]], [[1240, 778], [1700, 778]],
      [[1900, 776], [2120, 776]], [[300, 792], [520, 792]], [[1450, 792], [1620, 792]], [[2350, 778], [2700, 778]]], { wobble: 0.8 });
    S.ceiling = st([[-40, 140], [2200, 140]]);
    S.wall = group([[[1068, 140], [1068, 760]], [[1092, 140], [1092, 760]]]);
    S.wallHatch = group(hatch([[1068, 140], [1092, 140], [1092, 760], [1068, 760]], { angle: -0.8, gap: 11, seed: 3 }), { wobble: 0.4 });
    S.sideWalls = group([[[-40, 140], [-40, 760]], [[2200, 140], [2200, 760]]]);

    // --- bedroom ---
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
    // the Count's head is drawn around (404, 596) so it can turn
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
    S.moonSmallGuide = group([pts.ellipse(0, 0, 30, 30, 0, 1), [[-42, 0], [42, 0]], [[0, -42], [0, 42]]], { wobble: 0.5 });
    S.moonSmall = st(pts.ellipse(0, 0, 26, 26, -1.2, 1.08));
    S.winStars = [[622, 278], [645, 410], [758, 404], [618, 332], [742, 380], [655, 300]];

    S.clockGuide = group([pts.ellipse(200, 330, 56, 56, 0, 1), [[132, 330], [268, 330]], [[200, 262], [200, 398]]], { wobble: 0.5 });
    S.clock = group([pts.ellipse(200, 330, 50, 50, -1.4, 1.06), pts.ellipse(200, 330, 42, 42, 1.2, 1.04),
      ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [[200 + Math.cos(a) * 34, 330 + Math.sin(a) * 34], [200 + Math.cos(a) * 40, 330 + Math.sin(a) * 40]]; }),
      pts.rect(178, 382, 222, 478), pts.curve([[182, 284], [200, 270], [218, 284]])]);
    S.table = group([[[112, 640], [248, 640]], [[118, 648], [242, 648]], [[128, 648], [126, 760]], [[232, 648], [234, 760]], [[128, 708], [232, 708]]]);
    S.glass = group([[[148, 602], [152, 638]], [[176, 602], [172, 638]], [[152, 638], [172, 638]], [[150, 614], [174, 614]]]);
    S.books = group([pts.rect(190, 626, 236, 638), pts.rect(194, 614, 230, 626)]);

    // --- music room ---
    S.caseOutline = [[1335, 548], [1880, 548], [1894, 564], [1892, 612], [1876, 626], [1335, 626]];
    // open lid, seen from a little in front: hinge along the top edge, the bentside sweeping back down
    S.lidPoly = pts.curve([[1352, 546], [1600, 446], [1830, 362], [1866, 392], [1884, 470], [1888, 546]], 6);
    S.harpsGuide = group([[[1300, 548], [1910, 548]], [[1335, 520], [1335, 640]], [[1880, 340], [1880, 640]], pts.arc(1352, 546, 520, 520, -0.42, -0.2)], { wobble: 0.4 });
    S.harps = group([
      S.caseOutline.concat([[1335, 548]]), [[1340, 566], [1888, 566]], [[1340, 606], [1890, 606]],
      [[1296, 556], [1335, 556]], [[1294, 572], [1335, 572]], [[1294, 556], [1294, 604]], [[1294, 604], [1335, 604]],
      S.lidPoly, pts.curve([[1380, 540], [1620, 448], [1836, 376], [1864, 410], [1876, 540]], 6),
      [[1700, 548], [1716, 432]],
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
    S.portraitGuide = group([pts.ellipse(1880, 300, 52, 64, 0, 1), [[1880, 220], [1880, 380]]], { wobble: 0.4 });
    S.portrait = group([pts.ellipse(1880, 300, 46, 58, -1.5, 1.05), pts.ellipse(1880, 300, 38, 50, 1.5, 1.04),
      pts.ellipse(1880, 300, 16, 18, 0, 1.05), pts.ellipse(1858, 290, 8, 10, 0, 1.6), pts.ellipse(1902, 290, 8, 10, 0, 1.6),
      pts.ellipse(1857, 310, 7, 9, 0, 1.6), pts.ellipse(1903, 310, 7, 9, 0, 1.6), pts.curve([[1873, 306], [1880, 310], [1887, 306]]),
      [[1874, 296], [1875, 298]], [[1886, 296], [1885, 298]], pts.curve([[1866, 326], [1880, 340], [1894, 326]]), [[1880, 358], [1880, 372]], pts.ellipse(1880, 214, 5, 5, 0, 1)]);
    S.portraitLabel = text('J. S. B.', 'tech', 1880, 392, 16, { align: 'center' });

    // --- outside ---
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
    S.moonGuide = group([pts.ellipse(420, -560, 92, 92, 0, 1), [[300, -560], [540, -560]], [[420, -680], [420, -440]]], { wobble: 0.5 });
    S.moon = st(pts.ellipse(420, -560, 80, 80, -2.0, 1.07));
    S.craters = group([pts.ellipse(392, -584, 12, 10, 0, 1.05), pts.ellipse(448, -540, 9, 8, 0, 1.05), pts.ellipse(410, -520, 6, 6, 0, 1.05)]);
    const r = rng(77);
    S.stars = [];
    while (S.stars.length < 46) {
      const x = -900 + r() * 4000, y = -1550 + r() * 1350;
      if (Math.hypot(x - 420, y + 560) < 150 || Math.hypot(x - 1000, y + 880) < 380) continue;
      S.stars.push([x, y, 4 + r() * 6]);
    }
    S.starStrokes = group(S.stars.map(([x, y, s]) => [[[x - s, y], [x + s, y]], [[x, y - s], [x, y + s]]]).flat(), { wobble: 0.3 });

    // --- the second half's constellation: a treble clef in sixteen stars ---
    const clef = window.FONTS.clef, CX = 1000, CY = -880, H = 640;
    S.clefGuide = group(clef.map((s) => { const o = []; for (let i = 0; i < s.length; i += 2) o.push([CX + s[i] * H, CY + s[i + 1] * H]); return o; }), { wobble: 0.6, step: 4 });
    const main = S.clefGuide[0];
    S.clefStars = [];
    for (let k = 0; k < 16; k++) {
      const target = (0.04 + 0.92 * k / 15) * main.L;
      let i = 0;
      while (i < main.N - 1 && main.len[i] < target) i++;
      S.clefStars.push([main.xs[i], main.ys[i]]);
    }
    S.clefLinks = S.clefStars.slice(1).map((s, k) => stroke([S.clefStars[k], s], { wobble: 1.2 }));

    // --- screen-space bits ---
    S.strip = CONTOUR.map((v, i) => [261 + i * 18, 938 - v * 3.4]);
    S.stripLinks = S.strip.slice(1).map((q, i) => stroke([S.strip[i], q], { wobble: 0.3, step: 2 }));
    S.noteNames = BASS.map((n, i) => text(n, 'tech', S.strip[i][0], 972, 16, { align: 'center', wobble: 0.2 }));
    S.z = text('z', 'tech', 0, 0, 30, { align: 'center' });
    S.smoke = stroke(pts.curve([[0, 0], [8, -20], [-6, -44], [10, -70], [-4, -98], [6, -130]]), { wobble: 0.6 });
  }

  // ---------- captions ----------
  const CAPTIONS = [
    [-0.2, 'Bach, Goldberg Variations: the Aria'],
    [3.0, 'one night in Dresden, as the story goes,'],
    [6.0, 'Count Keyserlingk could not sleep.'],
    [8.6, 'so young Goldberg played for him.'],
    [12.4, 'thirty-two bars, all on one bass line'],
    [16.0, 'the first half, once more from the top'],
    [21.6, 'the notes found their way next door'],
    [26.0, 'and his eyes grew heavy.'],
    [31.0, 'the second half climbed out the chimney,'],
    [37.0, 'leaned into E minor,'],
    [41.0, 'and found its way home to G.'],
    [48.0, 'then all of it again, softer,'],
    [54.0, 'until the Count was asleep.'],
    [60.5, ''],
    [64.15, 'after thirty variations, the aria returns.'],
  ];
  let captionGroups = null;
  function captions(p, t) {
    if (!captionGroups) captionGroups = CAPTIONS.map(([, s]) => text(s, 'tech', 540, 1024, 42, { align: 'center' }));
    let i = -1;
    for (let k = 0; k < CAPTIONS.length; k++) if (p >= CAPTIONS[k][0]) i = k;
    if (i < 0) return;
    const t0 = tAt(CAPTIONS[i][0]), dur = Math.max(1.2, CAPTIONS[i][1].length / 15);
    const next = i + 1 < CAPTIONS.length ? tAt(CAPTIONS[i + 1][0]) : 1e9;
    const fade = clamp((next - t) / 0.45);
    const fin = finale(t);
    write(captionGroups[i], clamp((t - t0) / dur), { alpha: 0.95 * fade * (1 - fin), w: 2.9 });
  }
  const finale = (t) => seg(t, END + 4.0, END + 4.6);

  // ---------- notes from the recording ----------
  const notes = T.onsets.map(([t, s, pc, cent], i) => {
    const r = rng(i * 31 + 7), p0 = pAt(t);
    const n = { t, s, color: PC_COLOR[pc], size: 9 + 15 * Math.sqrt(s), flag: s > 0.42, ph: r() * 6.28, spin: (r() - 0.5) * 0.8 };
    if (p0 < 31) {
      n.kind = 'drift';
      n.a = [1520 + r() * 240, 500 + r() * 40 - (cent > 900 ? 30 : 0)];
      n.b = p0 < 16 ? [440 + r() * 90, 540 + r() * 50] : [200 + r() * 700, 250 + r() * 330];
      n.dur = 6 + r() * 1.5; n.arch = 90 + r() * 120;
    } else if (p0 < 47.5) {
      n.kind = 'rise';
      n.a = [1810 + (r() - 0.5) * 30, -250];
      n.b = [clamp(1810 + (r() - 0.62) * 2200, -500, 2600), -380 - r() * 1150];
      n.dur = 4.5 + r() * 2; n.arch = 0;
    } else if (p0 < 64) {
      n.kind = 'fall';
      n.a = [1540 + r() * 260, 480 + r() * 40];
      n.b = [460 + r() * 360, 600 + r() * 40];
      n.dur = 7.5 + r() * 2; n.arch = 160 + r() * 80;
    } else n.kind = 'none';
    return n;
  });
  const firstNote = T.onsets[0][0];

  function noteGlyph(ctx, x, y, n, alpha, rot) {
    const sz = n.size;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    crayon(pts.ellipse(0, 0, sz * 0.62, sz * 0.44, 0, 1).map(([a, b]) => [a * 0.96 - b * 0.3, b + a * 0.3]), n.color, { alpha: 0.95 * alpha, dx: 2, dy: -1, seed: (n.t * 100) | 0 });
    const v = Pen.variant;
    ctx.globalAlpha = alpha; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.6, sz * 0.42, -0.32, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sz * 0.56, -sz * 0.12); ctx.lineTo(sz * 0.6 + v * 0.3, -sz * 2.3);
    if (n.flag) ctx.quadraticCurveTo(sz * 1.3, -sz * 1.7, sz * 1.05, -sz * 1.05);
    ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawNotes(ctx, t) {
    for (const n of notes) {
      if (n.kind === 'none' || t < n.t) continue;
      const e = (t - n.t) / n.dur;
      if (n.kind === 'rise' && e >= 1) continue; // drawn as a star instead
      if (e >= 1) continue;
      const k = ease(e);
      const x = lerp(n.a[0], n.b[0], k) + 10 * Math.sin(e * 9 + n.ph);
      const y = lerp(n.a[1], n.b[1], k) - n.arch * Math.sin(Math.PI * k) + 6 * Math.sin(e * 13 + n.ph);
      const alpha = clamp(e / 0.06) * clamp((1 - e) / (n.kind === 'rise' ? 0.12 : 0.3));
      noteGlyph(ctx, x, y, n, alpha, n.spin * Math.sin(e * 6 + n.ph));
    }
  }
  // the second half's notes stay in the sky as small stars
  function noteStars(ctx, t) {
    ctx.fillStyle = Pen.INK;
    for (const n of notes) {
      if (n.kind !== 'rise' || t < n.t + n.dur * 0.88) continue;
      const k = clamp((t - n.t - n.dur * 0.88) / 0.5), r = (1.4 + 2.6 * n.s) * (1 + 0.6 * Math.sin(Math.PI * k));
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(n.b[0], n.b[1], r, 0, Math.PI * 2); ctx.fill();
      if (n.s > 0.5) {
        ctx.lineWidth = 1.6; ctx.strokeStyle = Pen.INK;
        ctx.beginPath(); ctx.moveTo(n.b[0] - 7, n.b[1]); ctx.lineTo(n.b[0] + 7, n.b[1]); ctx.moveTo(n.b[0], n.b[1] - 7); ctx.lineTo(n.b[0], n.b[1] + 7); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  // a pulse on every onset, for hands and flame
  function pulse(t, decay = 0.16) {
    let v = 0;
    for (let i = onsetIndex(t); i >= 0 && t - notes[i].t < 0.8; i--) v += notes[i].s * Math.exp(-(t - notes[i].t) / decay);
    return Math.min(1.4, v);
  }
  function onsetIndex(t) {
    let lo = 0, hi = notes.length - 1;
    if (t < notes[0].t) return -1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (notes[m].t <= t) lo = m; else hi = m; }
    return notes[hi].t <= t ? hi : lo;
  }

  // ---------- pieces of the drawing ----------
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

  // how awake the Count is
  function countOpen(p, t) {
    let o = 1;
    if (p > 21) o = lerp(1, 0.55, seg(p, 21, 31));
    if (p > 47) o = lerp(0.5, 0, smooth(seg(p, 49, 55.5)));
    // blinks
    const blink = [2.6, 5.2, 9.5, 13.1, 18.4, 24.2, 27.4, 50.2, 52.5];
    for (const b of blink) { const d = Math.abs(p - b); if (d < 0.05) o *= d / 0.05; }
    return o;
  }

  function bedroom(ctx, p, t) {
    ink(S.ceiling, { prog: seg(p, 0.1, 1.4) });
    // clock: construction first, then ink
    guide(S.clockGuide[0], { prog: seg(p, 3.0, 3.3), alpha: 0.7 * (1 - seg(p, 4.4, 5)) });
    inkGroup(group(S.clockGuide.slice(1)), seg(p, 3.05, 3.3), { w: 1.2, color: Pen.GUIDE, alpha: 0.7 * (1 - seg(p, 4.4, 5)), boil: 0.2 });
    inkGroup(S.clock, seg(p, 3.2, 4.1));
    if (p > 3.9) {
      const minutes = (t / 75) * Math.PI * 2 - Math.PI / 2, hours = (1 + t / 75) / 12 * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = Pen.INK; ctx.lineCap = 'round';
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(200, 330); ctx.lineTo(200 + Math.cos(hours) * 22, 330 + Math.sin(hours) * 22); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(200, 330); ctx.lineTo(200 + Math.cos(minutes) * 33, 330 + Math.sin(minutes) * 33); ctx.stroke();
      // the pendulum ticks on every beat
      const a = 0.36 * Math.sin(Math.PI * p * 3), bx = 200 + Math.sin(a) * 70, by = 388 + Math.cos(a) * 70;
      ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(200, 388); ctx.lineTo(bx, by); ctx.stroke();
      crayonEllipse(bx, by, 9, 9, C.yellow, { dx: 2, dy: -1 });
      ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.stroke();
    }
    inkGroup(S.table, seg(p, 4.0, 4.5));
    inkGroup(S.glass, seg(p, 4.3, 4.6));
    crayon([[152, 616], [172, 616], [171, 636], [153, 636]], C.blue, { prog: seg(p, 4.5, 4.8), alpha: 0.6, dx: 1, dy: 1 });
    inkGroup(S.books, seg(p, 4.4, 4.8));
    crayon([[190, 626], [236, 626], [236, 638], [190, 638]], C.red, { prog: seg(p, 4.7, 5.0), alpha: 0.8 });
    crayon([[194, 614], [230, 614], [230, 626], [194, 626]], C.teal, { prog: seg(p, 4.8, 5.1), alpha: 0.8 });

    // window, curtains, the moon passing through the night
    inkGroup(S.winGuide, seg(p, 1.8, 2.1), { w: 1.2, color: Pen.GUIDE, alpha: 0.6 * (1 - seg(p, 3.5, 4)), boil: 0.2 });
    const mx = lerp(748, 628, clamp(p / 64)), my = lerp(300, 286, clamp(p / 64));
    ctx.save();
    ctx.beginPath(); ctx.rect(602, 254, 176, 196); ctx.clip();
    ctx.translate(mx, my);
    guide(S.moonSmallGuide[0], { prog: seg(p, 2.4, 2.7), alpha: 0.7 * (1 - seg(p, 3.6, 4.2)) });
    inkGroup(group(S.moonSmallGuide.slice(1)), seg(p, 2.45, 2.7), { w: 1.1, color: Pen.GUIDE, alpha: 0.7 * (1 - seg(p, 3.6, 4.2)), boil: 0.2 });
    crayonEllipse(0, 0, 25, 25, C.yellow, { prog: seg(p, 2.9, 3.3), dx: 6, dy: -4 });
    ink(S.moonSmall, { prog: seg(p, 2.6, 3.0) });
    ctx.restore();
    inkGroup(S.window, seg(p, 2.0, 2.8));
    ctx.fillStyle = Pen.INK;
    S.winStars.forEach(([x, y], i) => { if (p > 3 + i * 0.12) { ctx.beginPath(); ctx.arc(x, y, 2.2 + (i % 2), 0, Math.PI * 2); ctx.fill(); } });
    inkGroup(S.rod, seg(p, 2.4, 2.6));
    crayon(S.curtainL, C.pink, { prog: seg(p, 2.8, 3.2), dx: 4, dy: 2, seed: 4 });
    crayon(S.curtainR, C.pink, { prog: seg(p, 2.9, 3.3), dx: -3, dy: 3, seed: 6 });
    inkGroup(S.curtains, seg(p, 2.6, 3.1));

    // bed
    inkGroup(S.bed, seg(p, 0.0, 1.0));
    inkGroup(S.bedShade, seg(p, 0.8, 1.6), { w: 1.8 });
    ink(S.pillow, { prog: seg(p, 0.4, 0.9) });
    crayon(S.blanketPoly, C.teal, { prog: seg(p, 1.6, 2.4), dx: 6, dy: -2, seed: 9 });
    inkGroup(S.blanket, seg(p, 1.0, 1.8));
    inkGroup(S.blanketDots, seg(p, 2.3, 2.7), { w: 2.2 });

    // the Count, turning a little toward the music
    const turn = -0.06 * smooth(seg(p, 9, 11)) + 0.04 * smooth(seg(p, 49, 54)) + 0.012 * Math.sin(t * 0.7);
    ctx.save();
    ctx.translate(404, 596); ctx.rotate(turn);
    if (p > 0.7) {
      // head and cap sit in front of the headboard and pillow
      ctx.fillStyle = Pen.PAPER;
      ctx.beginPath(); ctx.ellipse(0, 0, 43, 41, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); S.capPoly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.fill();
    }
    crayon(S.capPoly, C.red, { prog: seg(p, 1.2, 1.7), dx: 5, dy: -3, seed: 13 });
    inkGroup(S.cap, seg(p, 0.9, 1.4));
    crayonEllipse(-86, -84, 10, 10, C.yellow, { prog: seg(p, 1.5, 1.7), dx: 2, dy: -2 });
    ink(S.pompom, { prog: seg(p, 1.4, 1.6) });
    ink(S.head, { prog: seg(p, 0.7, 1.1) });
    ink(S.ear, { prog: seg(p, 1.0, 1.2) });
    ink(S.nose, { prog: seg(p, 1.1, 1.3) });
    ink(S.mouth, { prog: seg(p, 1.2, 1.4), w: 2.4 });
    crayonEllipse(28, 12, 8, 5, C.pink, { prog: seg(p, 1.6, 1.8), alpha: 0.75, dx: 0, dy: 0 });
    if (p > 1.3) {
      const o = countOpen(p, t) * smooth(seg(p, 1.3, 1.6));
      const look = p < 8 ? [0.5, -0.6] : p < 47 ? [0.9, -0.1] : [0.3, -0.5];
      eye(ctx, 8, -10, 15, o, look);
      eye(ctx, 38, -16, 12.5, o, look);
    }
    ctx.restore();

    // asleep
    if (p > 55) {
      for (let i = 0; i < 3; i++) {
        const k = ((p - 55) / 1.8 + i / 3) % 1, a = clamp(k / 0.15) * clamp((1 - k) / 0.3) * seg(p, 55, 55.6);
        ctx.save();
        ctx.translate(470 + k * 70 + 8 * Math.sin(k * 7 + i), 540 - k * 140);
        const s = 0.6 + k * 0.7; ctx.scale(s, s);
        write(S.z, 1, { alpha: a, w: 2.8 / s });
        ctx.restore();
      }
    }
  }

  function musicRoom(ctx, p, t) {
    // portrait of the composer
    inkGroup(S.portraitGuide, seg(p, 9.2, 9.5), { w: 1.2, color: Pen.GUIDE, alpha: 0.6 * (1 - seg(p, 10.5, 11)), boil: 0.2 });
    crayon(pts.ellipse(1880, 300, 46, 58, 0, 1), C.yellow, { prog: seg(p, 10.0, 10.4), alpha: 0.55, dx: 3, dy: -3 });
    crayon(pts.ellipse(1880, 300, 38, 50, 0, 1), '#f4efe4', { prog: seg(p, 10.0, 10.4), alpha: 1, dx: 0, dy: 0 });
    crayon(pts.ellipse(1880, 296, 30, 30, 0, 1), C.wig, { prog: seg(p, 10.2, 10.5), alpha: 0.7 });
    inkGroup(S.portrait, seg(p, 9.4, 10.3), { w: 2.4 });
    write(S.portraitLabel, seg(p, 10.3, 10.6), { w: 1.8 });

    // the harpsichord
    inkGroup(S.harpsGuide, seg(p, 6.6, 7.1), { w: 1.2, color: Pen.GUIDE, alpha: 0.65 * (1 - seg(p, 9, 10)), boil: 0.2 });
    crayon(S.lidPoly, C.green, { prog: seg(p, 8.0, 8.4), dx: 4, dy: -3, seed: 31, alpha: 0.85 });
    crayon(S.caseOutline, C.brown, { prog: seg(p, 7.9, 8.6), dx: 6, dy: -3, seed: 33 });
    crayon(pts.curve([[1380, 540], [1620, 448], [1836, 376], [1864, 410], [1876, 540]], 6), C.yellow, { prog: seg(p, 8.2, 8.6), dx: 3, dy: -2, seed: 35, alpha: 0.8 });
    inkGroup(S.strings, seg(p, 8.4, 8.7), { w: 1.4, alpha: 0.6 });
    ink(S.rose, { prog: seg(p, 8.6, 8.8), w: 2 });
    inkGroup(S.harps, seg(p, 6.9, 8.3));
    inkGroup(S.keys, seg(p, 8.1, 8.3), { w: 1.6 });
    inkGroup(S.stand, seg(p, 8.6, 8.9));
    inkGroup(S.sheetLines, seg(p, 8.8, 9.0), { w: 1.2, alpha: 0.7 });
    write(S.sheetTitle, seg(p, 8.9, 9.1), { w: 1.6 });

    // candle: burns down across the whole Aria, goes out when it ends
    inkGroup(S.candleBase, seg(p, 8.5, 8.8));
    const h = lerp(68, 20, clamp(p / 64)), top = 532 - h;
    if (p > 8.6) {
      const a = seg(p, 8.6, 8.9);
      crayon([[1494, 532], [1494, top], [1506, top], [1506, 532]], '#f6e7c8', { alpha: a, dx: 1, dy: 0 });
      ctx.globalAlpha = a; ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1494, 532); ctx.lineTo(1494, top); ctx.quadraticCurveTo(1500, top - 3, 1506, top); ctx.lineTo(1506, 532); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(1497, top + 2); ctx.lineTo(1496, top + 12 + 6 * noise(p, 4)); ctx.stroke();
      ctx.globalAlpha = 1;
      const out = t > END + 1.0;
      if (!out) {
        const fl = 1 + 0.12 * noise(t * 7, 2) + 0.12 * pulse(t, 0.25);
        const g = ctx.createRadialGradient(1500, top - 14, 4, 1500, top - 14, 170 * fl);
        g.addColorStop(0, `rgba(${C.glow},0.30)`); g.addColorStop(1, `rgba(${C.glow},0)`);
        ctx.fillStyle = g; ctx.fillRect(1320, top - 190, 360, 360);
        const sway = 2.5 * noise(t * 3, 5);
        const flame = pts.curve([[1500, top - 2], [1508, top - 10], [1503 + sway, top - 22 * fl], [1500 + sway * 1.6, top - 30 * fl], [1497 + sway, top - 22 * fl], [1492, top - 10], [1500, top - 2]], 4);
        crayon(flame, C.yellow, { dx: 1, dy: -1, alpha: a });
        crayon(flame.map(([x, y]) => [1500 + (x - 1500) * 0.5, top - 4 + (y - top + 4) * 0.55]), C.orange, { dx: 0, dy: 0, alpha: a });
        ink(stroke(flame, { wobble: 0.2 }), { w: 2, alpha: a });
      } else {
        const k = clamp((t - END - 1.0) / 3.2);
        ctx.save(); ctx.translate(1500 + 3 * Math.sin(t * 2), top - 4);
        ink(S.smoke, { prog: clamp(k * 3), w: 1.8, alpha: 0.8 * (1 - k) });
        ctx.restore();
      }
    }

    // young Goldberg at the keys
    const pl = pulse(t), sway = 3 * Math.sin(Math.PI * 2 * (p % 1)) * (p < 64 ? 1 : 0);
    inkGroup(S.stool, seg(p, 7.6, 8.1));
    crayon([[1208, 600], [1292, 600], [1292, 610], [1208, 610]], C.red, { prog: seg(p, 8.0, 8.2) });
    inkGroup(S.legs, seg(p, 7.8, 8.4));
    crayon(S.coatPoly, C.red, { prog: seg(p, 8.3, 8.8), dx: 4, dy: -2, seed: 41 });
    inkGroup(S.coat, seg(p, 7.7, 8.3));
    ctx.fillStyle = Pen.INK;
    if (p > 8.5) S.buttons.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); });
    if (p > 8.0) {
      const a = seg(p, 8.0, 8.4);
      ctx.save(); ctx.globalAlpha = a;
      for (const [ox, dy] of [[-10, pl * 4], [0, pl * 7]]) {
        const hx = 1320 + ox, hy = 552 + dy;
        ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1264 + ox * 0.4, 510); ctx.quadraticCurveTo(1280 + ox, 556, hx - 8, hy - 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx, hy, 7, 5.5, 0.4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(1262 + sway * 0.4, 456 + Math.abs(sway) * 0.3); ctx.rotate(0.02 * sway);
    crayon(S.wigPoly, C.wig, { prog: seg(p, 8.0, 8.5), dx: 3, dy: -2, seed: 45, alpha: 0.75 });
    ink(S.gHead, { prog: seg(p, 7.6, 7.9) });
    inkGroup(S.wig, seg(p, 7.8, 8.4), { w: 2.6 });
    ink(S.gNose, { prog: seg(p, 7.9, 8.0) });
    ink(S.gMouth, { prog: seg(p, 8.0, 8.1), w: 2.2 });
    crayonEllipse(16, 8, 6, 4, C.pink, { prog: seg(p, 8.3, 8.5), alpha: 0.7, dx: 0, dy: 0 });
    if (p > 7.9) eye(ctx, 14, -6, 11, smooth(seg(p, 7.9, 8.2)) * (p < 64.2 ? 1 : 0.55), [0.6, 0.8]);
    ctx.restore();
  }

  function outside(ctx, p, t) {
    if (p < 14) return;
    crayon(S.skyPoly, C.sky, { prog: seg(p, 16.6, 18.8), alpha: 0.22, dx: 0, dy: 0, seed: 51 });
    crayon(S.roofA, C.roof, { prog: seg(p, 15.9, 16.6), dx: 6, dy: -4, seed: 53, alpha: 0.8 });
    crayon(S.roofB, C.roof, { prog: seg(p, 16.0, 16.7), dx: 6, dy: -4, seed: 55, alpha: 0.8 });
    crayon(S.chimneyPoly, C.brown, { prog: seg(p, 16.3, 16.6), dx: 4, dy: -3 });
    inkGroup(S.roofs, seg(p, 15.2, 16.2));
    inkGroup(S.tiles, seg(p, 16.0, 17.0), { w: 1.8, alpha: 0.7 });
    inkGroup(S.chimney, seg(p, 16.0, 16.4));
    inkGroup(S.sideWalls, seg(p, 15.4, 16.0));
    S.houses.forEach((h, i) => {
      const a = 15.8 + i * 0.4;
      crayon(h.roofPoly, C.roof, { prog: seg(p, a + 0.6, a + 1.1), alpha: 0.7, seed: 60 + i });
      h.wins.forEach(([x, y], j) => {
        const lit = p < 58 + j * 0.9 + i * 0.5;
        if (lit) crayon(pts.rect(x, y, x + 70, y + 90), C.yellow, { prog: seg(p, a + 0.8 + j * 0.08, a + 1.2 + j * 0.08), alpha: 0.85, dx: 4, dy: -3, seed: 70 + j });
      });
      crayon(pts.rect(h.door[0], h.door[1], h.door[0] + 66, 760), C.teal, { prog: seg(p, a + 1.0, a + 1.3), alpha: 0.8 });
      inkGroup(h.lines, seg(p, a, a + 1.0));
    });
    // moon over the town
    inkGroup(S.moonGuide, seg(p, 16.5, 16.9), { w: 1.3, color: Pen.GUIDE, alpha: 0.7 * (1 - seg(p, 19, 20)), boil: 0.2 });
    crayonEllipse(420, -560, 78, 78, C.yellow, { prog: seg(p, 17.0, 17.6), dx: 9, dy: -6, seed: 81 });
    ink(S.moon, { prog: seg(p, 16.8, 17.3), w: 3.6 });
    inkGroup(S.craters, seg(p, 17.4, 17.7), { w: 2.2 });
    inkGroup(S.starStrokes, seg(p, 17.0, 19.0), { w: 2.2 });

    // the clef, one star a bar through the second half
    inkGroup(S.clefGuide, seg(p, 44.3, 46.0), { w: 1.5, color: Pen.GUIDE, alpha: 0.85, boil: 0.25 });
    S.clefStars.forEach(([x, y], k) => {
      const p0 = 32 + k;
      if (p < p0) return;
      if (k > 0) ink(S.clefLinks[k - 1], { prog: seg(p, p0, p0 + 0.7), w: 2.2 });
      const pop = seg(p, p0, p0 + 0.25), r = 9 + 7 * Math.sin(Math.PI * pop) * (1 - pop) + 2 * (k % 3 === 0);
      crayonEllipse(x, y, r * 1.1, r * 1.1, C.yellow, { dx: 2, dy: -2, seed: 90 + k });
      ctx.strokeStyle = Pen.INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4 + 0.2 * Pen.variant, l = i % 2 ? r * 1.2 : r * 2.1;
        ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      ctx.stroke();
    });
    noteStars(ctx, t);
  }

  // ---------- screen-space: the bass line along the bottom ----------
  function strip(ctx, p, t) {
    const a = (1 - finale(t)) * seg(p, -0.3, 0.2);
    if (a <= 0) return;
    const k = Math.floor(p), cur = p >= 0 && p < 64 ? scoreBar(k) : -1;
    ctx.save(); ctx.globalAlpha = a;
    for (let m = 0; m < 32; m++) {
      const p1 = firstPass(m), p2 = secondPass(m);
      if (p < p1) continue;
      const [x, y] = S.strip[m];
      if (m > 0) ink(S.stripLinks[m - 1], { prog: seg(p, p1, p1 + 0.3), w: 1.5, alpha: 0.7 * a });
      if (m === cur) crayonEllipse(x, y, 9, 9, C.orange, { alpha: 0.9 * a, dx: 1, dy: -1, seed: 100 + m });
      ctx.fillStyle = Pen.INK;
      ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.fill();
      if (p >= p2) {
        ctx.strokeStyle = Pen.INK; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 5.6 * Math.min(1, (p - p2) / 0.2 + 0.2), 0, Math.PI * 2); ctx.stroke();
      }
    }
    if (cur >= 0) write(S.noteNames[cur], 1, { w: 1.6, alpha: 0.9 * a });
    ctx.restore();
  }

  // ---------- final card ----------
  let finalText = null;
  function finalCard(ctx, t) {
    const k = finale(t);
    if (k <= 0) return;
    if (!finalText) finalText = [text('aria.', 'tech', 540, 1004, 86, { align: 'center' }),
      text('J. S. Bach, Goldberg Variations, BWV 988   /   Kimiko Ishizaka, piano (CC0)', 'tech', 540, 1050, 19, { align: 'center' })];
    write(finalText[0], seg(t, END + 4.0, END + 5.2), { w: 3.6 });
    write(finalText[1], seg(t, END + 5.0, END + 6.0), { w: 1.6, alpha: 0.85 });
  }

  // ---------- paper ----------
  let grain = null;
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

  // the bottom of the sheet stays clear for the caption, like a margin
  let marginGrad = null;
  function margin(ctx) {
    if (!marginGrad) { marginGrad = ctx.createLinearGradient(0, 892, 0, 940); marginGrad.addColorStop(0, 'rgba(244,239,228,0)'); marginGrad.addColorStop(1, 'rgba(244,239,228,0.9)'); }
    ctx.fillStyle = marginGrad; ctx.fillRect(0, 892, 1080, 188);
  }

  // ---------- one frame ----------
  function frame(canvas, t) {
    const ctx = canvas.getContext('2d'), k = canvas.width / 1080;
    const p = pAt(t), v = Math.floor(t * 12) % 3;
    const [cx, cy, z] = camera(p);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    Pen.begin(ctx, v);
    paper(ctx);
    ctx.setTransform(k * z, 0, 0, k * z, k * (540 - cx * z), k * (540 - cy * z));
    Pen.begin(ctx, v);
    outside(ctx, p, t);
    ink(S.floorL, { prog: seg(p, -0.45, 0.5), w: 3.4 });
    ink(S.floorR, { prog: seg(p, -0.45, 0.5), w: 3.4 });
    inkGroup(S.floorDash, seg(p, 0.2, 1.2), { w: 2.2 });
    inkGroup(S.wall, seg(p, 4.6, 5.4));
    inkGroup(S.wallHatch, seg(p, 5.0, 5.9), { w: 1.6 });
    musicRoom(ctx, p, t);
    bedroom(ctx, p, t);
    drawNotes(ctx, t);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    Pen.begin(ctx, v);
    margin(ctx);
    strip(ctx, p, t);
    captions(p, t);
    finalCard(ctx, t);
  }

  build();
  window.Film = { frame, DURATION, pAt, tAt, firstNote };
})();
