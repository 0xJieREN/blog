// "butterfly": fourteen specimens from Claude.mp4, each remade as a print, cut on the notes of an
// accelerating piece. The order is one trip round the colour wheel, and every butterfly hands one
// of its colours to the next:
//   wasp moth (yellow, black) -> dogface sulphur (yellow) -> lime swallowtail (cream-yellow, black)
//   -> cream-flecked swallowtail (cream, olive) -> oleander hawk moth (olive green)
//   -> green-banded swallowtail (green, teal) -> clearwing (glass, green) -> common blue (blue)
//   -> dark day-flier (blue-black, orange, red) -> pale eyed satyr (cream, red flush)
//   -> red-olive hawk moth (crimson) -> postman (black, scarlet) -> burnet (red, black)
//   -> red-banded slate (red, slate), whose red leads back to the wasp moth's red body.
// The wheel turns three times, faster each time, with the music: lap 1 one butterfly per 4 then 3
// eighths, lap 2 per 2 eighths, lap 3 per eighth. It opens on the wasp moth, the first creature
// in the first frame of Claude.mp4 (and in its last), and ends, held, on the red-banded slate,
// the butterfly that flies into the lens at the climax of Claude.mp4.
// Every species is shown in its true colours first; some later tiles are negative prints (pale
// specimen, dark ground) so pale and dark figures alternate, never more than three alike running.
(() => {
  const M = window.Media;
  const WHEEL = ['wasp', 'sulphur', 'lime', 'creamfleck', 'oleander', 'greenband', 'clearwing', 'blue',
    'darkspot', 'glasswing', 'hawk', 'heliconius', 'burnet', 'redslate'];
  // craft for each lap, in wheel order; a species never repeats a craft, neighbours never share one
  const LAPS = [
    'screen halftone mosaic engrave satin lino stipple scales stitch engrave dabs screen halftone lino',
    'stitch mosaic halftone scales engrave satin screen halftone engrave dabs stitch stipple mosaic satin',
    'mosaic dabs stitch lino stitch scales satin engrave screen stipple halftone lino scales screen',
  ].map((l) => l.split(' '));
  const NEG = [[], ['wasp', 'creamfleck', 'greenband', 'burnet', 'redslate'], ['lime', 'greenband', 'burnet']];
  // [species, ground variant (= lap), craft, 'neg' for the negative print]
  const ORDER = LAPS.flatMap((crafts, lap) => WHEEL.map((id, k) => [id, lap, crafts[k], NEG[lap].includes(id) && !(lap === 2 && id === 'redslate') ? 'neg' : '']));

  // the held last tile: two small registration marks in red, the print run's sign-off
  function registration(ctx) {
    ctx.save(); ctx.strokeStyle = 'rgba(178,52,40,.85)'; ctx.lineWidth = 1.6;
    for (const [x, y] of [[70, 70], [1010, 1010]]) {
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 22); ctx.stroke();
    }
    ctx.restore();
  }

  const TILES = ORDER.map(([id, v, craft, neg], i) => ({
    name: `${id} ${craft}${neg ? ' neg' : ''}`, id, v, craft, neg: !!neg,
    draw(ctx) {
      Crafts.tile(ctx, Species.byId[id], v, craft, 1000 + i * 37, !!neg);
      if (i === ORDER.length - 1) registration(ctx);
    },
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
