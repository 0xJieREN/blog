// "butterfly": fourteen specimens from Claude.mp4, each remade as a print, cut on the notes of an
// accelerating piece. 42 tiles: every species three times, each time in another craft and on
// another ground built from its own wings. The first pass (tiles 1-14) gives every species its
// signature print while the music is still slow; the next two passes come faster and faster.
// Seven tiles are negative prints (pale specimen, dark ground) so the order can alternate pale
// and dark figures; it also alternates warm and cool, and never repeats a craft back to back.
(() => {
  const M = window.Media;
  // [species, ground variant, craft, 'neg' for the negative print]
  const ORDER = [
    ['wasp', 0, 'screen'], ['glasswing', 0, 'engrave'], ['greenband', 0, 'lino'], ['burnet', 0, 'halftone'],
    ['blue', 0, 'scales'], ['darkspot', 0, 'stitch'], ['lime', 0, 'mosaic', 'neg'], ['clearwing', 0, 'stipple'],
    ['heliconius', 0, 'screen'], ['oleander', 0, 'satin'], ['hawk', 0, 'dabs'], ['redslate', 0, 'lino'],
    ['creamfleck', 0, 'engrave'], ['sulphur', 0, 'halftone'],
    ['lime', 1, 'stitch'], ['glasswing', 1, 'dabs'], ['burnet', 1, 'mosaic', 'neg'], ['oleander', 1, 'engrave'],
    ['clearwing', 1, 'screen'], ['wasp', 1, 'lino'], ['redslate', 1, 'satin', 'neg'], ['blue', 1, 'halftone'],
    ['creamfleck', 1, 'scales', 'neg'], ['heliconius', 1, 'stipple'], ['sulphur', 1, 'mosaic'], ['darkspot', 1, 'engrave'],
    ['greenband', 1, 'satin', 'neg'], ['hawk', 1, 'stitch'],
    ['burnet', 2, 'scales', 'neg'], ['sulphur', 2, 'dabs'], ['wasp', 2, 'mosaic'], ['heliconius', 2, 'lino'],
    ['clearwing', 2, 'satin'], ['lime', 2, 'halftone'], ['greenband', 2, 'scales', 'neg'], ['blue', 2, 'engrave'],
    ['oleander', 2, 'stitch'], ['darkspot', 2, 'screen'], ['glasswing', 2, 'stipple'], ['creamfleck', 2, 'dabs'],
    ['hawk', 2, 'halftone'], ['redslate', 2, 'screen'],
  ];

  const TILES = ORDER.map(([id, v, craft, neg], i) => ({
    name: `${id} ${craft}${neg ? ' neg' : ''}`, id, v, craft, neg: !!neg,
    draw(ctx) { Crafts.tile(ctx, Species.byId[id], v, craft, 1000 + i * 37, !!neg); },
  }));

  // Cut times from js/beats.js (tools/music.py): each is the attack of a real note. A cut lands
  // on the frame that contains its note, never after it.
  const B = window.BEATS, FPS = 30;
  const CUTS = B.cuts.map((t) => Math.floor(t * FPS + 0.5) / FPS);
  const N = CUTS.length - 1;
  if (N !== TILES.length) console.warn(`${N} cuts but ${TILES.length} tiles`);
  const DURATION = CUTS[N];

  function tileAt(t) { let i = 0; while (i < N - 1 && t >= CUTS[i + 1] - 1e-6) i++; return i; }
  function frame(canvas, t) {
    const ctx = canvas.getContext('2d'), i = tileAt(t);
    ctx.drawImage(M.tileBitmap(TILES[i], i), 0, 0, canvas.width, canvas.height);
  }

  window.Film = { TILES, CUTS, DURATION, frame, tileAt };
})();
