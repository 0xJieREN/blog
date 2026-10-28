// Example film built from the kit. Replace the shots with your own story; keep the shape:
// one shot per bar (or per phrase), each starting exactly on a bar line from SCORE.bars.
(function () {
  const { stroke, pts, group, ink, guide, inkGroup, crayon, crayonEllipse, text, write, seg, smooth, clamp, lerp } = Pen;
  const K = Kit, B = K.BARS;
  const DURATION = 35.5;

  // ---- shot 1: a tune begins on an open page (the source is on screen, so notes pop) ----
  const book = {
    pages: group([pts.curve([[300, 700], [420, 660], [540, 690]]), pts.curve([[540, 690], [660, 660], [780, 700]]),
      [[300, 700], [300, 800]], [[780, 700], [780, 800]], pts.curve([[300, 800], [420, 770], [540, 800]]), pts.curve([[540, 800], [660, 770], [780, 800]]), [[540, 690], [540, 800]]]),
    guide: group([[[260, 690], [820, 690]], [[540, 620], [540, 840]]], { wobble: 0.5 }),
    lines: group([0, 1, 2, 3].map((i) => pts.curve([[330, 712 + i * 18], [430, 690 + i * 18], [520, 712 + i * 18]])).concat([0, 1, 2, 3].map((i) => pts.curve([[560, 712 + i * 18], [650, 690 + i * 18], [750, 712 + i * 18]]))), { wobble: 0.4 }),
    table: stroke([[-20, 812], [1100, 806]]),
    stream: K.path(pts.curve([[560, 690], [640, 560], [800, 470], [700, 300], [420, 260], [180, 330], [-140, 260]], 14), 18),
  };
  function shotPage(ctx, t) {
    const R = (a, b) => seg(t, a, b);
    inkGroup(book.guide, R(0, 0.4), { w: 1.3, color: Pen.GUIDE, alpha: 0.7 * (1 - R(2, 3)), boil: 0.2 });
    ink(book.table, { prog: R(0.1, 0.6), w: 3.4 });
    crayon([[300, 700], [540, 690], [780, 700], [780, 800], [300, 800]], '#f6eedb', { prog: R(0.4, 0.8), dx: 0, dy: 0, alpha: 1 });
    inkGroup(book.pages, R(0.2, 0.9));
    inkGroup(book.lines, R(0.7, 1.2), { w: 1.4, alpha: 0.6 });
    K.staff(ctx, book.stream, t);
    K.clef(ctx, book.stream, R(0.5, 0.9));
    K.riders(ctx, book.stream, t, { born: true });
  }

  // ---- shot 2: the keyboard from above ----
  const keysOpt = { t0: B[2] };
  const shotKeys = (ctx, t) => K.keys(ctx, t, keysOpt);

  // ---- shot 3: the bass underneath; the stone for this bar lands on the downbeat ----
  const groundOpt = { t0: B[4], current: 4, names: ['G', 'F#', 'E', 'D', 'B', 'C', 'D', 'G'], contour: [7, 6, 5, 4, 2, 3, 4, 0] };
  const topStream = K.path(pts.curve([[1200, 150], [860, 120], [560, 170], [260, 110], [-140, 150]], 14), 34);
  function shotGround(ctx, t) {
    K.ground(ctx, t, groundOpt);
    K.staff(ctx, topStream, t, { offset: 300 });
    K.riders(ctx, topStream, t, { offset: 300, scale: 0.9 });
  }

  // ---- shot 4: the tune climbs into a night sky; the camera drifts back ----
  const sky = {
    moon: stroke(pts.ellipse(760, 260, 80, 80, -2, 1.07)),
    moonGuide: group([pts.ellipse(760, 260, 92, 92, 0, 1), [[640, 260], [880, 260]], [[760, 140], [760, 380]]], { wobble: 0.5 }),
    hills: stroke(pts.curve([[-40, 760], [200, 700], [420, 740], [700, 690], [1120, 750]], 12)),
    stream: K.path(pts.curve([[1200, 820], [880, 700], [560, 640], [300, 470], [120, 300], [-160, 180]], 14), 24),
  };
  function shotSky(ctx, t, k) {
    const t0 = B[6], [cx, cy, z] = K.camLerp(t, [540, 540, 1.08], [540, 500, 0.96], t0, DURATION);
    K.camera(ctx, k, cx, cy, z);
    const R = (a, b) => seg(t, t0 - 0.2 + a, t0 - 0.2 + b);
    crayon([[-200, -100], [1300, -100], [1300, 720], [-200, 720]], K.C.sky, { prog: R(0.2, 1.0), alpha: 0.22, dx: 0, dy: 0 });
    inkGroup(sky.moonGuide, R(0, 0.3), { w: 1.3, color: Pen.GUIDE, alpha: 0.7 * (1 - R(1.5, 2.5)), boil: 0.2 });
    crayonEllipse(760, 260, 78, 78, K.C.yellow, { prog: R(0.4, 0.9), dx: 9, dy: -6 });
    ink(sky.moon, { prog: R(0.2, 0.6), w: 3.6 });
    ink(sky.hills, { prog: R(0, 0.5), w: 3.2 });
    K.staff(ctx, sky.stream, t, { offset: 900 });
    K.riders(ctx, sky.stream, t, { offset: 900 });
  }

  const frame = K.film([
    { start: -1, draw: shotPage, caption: 'a tune begins on the page,' },
    { start: B[2], draw: shotKeys },
    { start: B[4], draw: shotGround, caption: 'but the bass beneath it holds still,' },
    { start: B[6], draw: shotSky, caption: 'and the night goes quiet.' },
  ], {
    duration: DURATION,
    strip: { names: groundOpt.names, contour: groundOpt.contour },
    final: { at: 33.5, title: 'aria.', credit: 'J. S. Bach, Aria (bars 1-7, 32)   /   Kimiko Ishizaka, piano (CC0)' },
  });

  window.Film = { frame, DURATION };
})();
