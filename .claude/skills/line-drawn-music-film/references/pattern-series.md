# Pattern series: one silhouette, a new world on every beat

The second kind of Kevin film. Nothing moves and nothing is drawn on: twenty finished pictures,
each held for exactly two beats, hard cuts, music under it. Every picture is the same figure, a
plain head-and-shoulders silhouette, made out of a different pattern or craft. The variety *is*
the film.

Reference: Kevin T. Ngo, "self-portraits" ("Claude draws self-portraits."), kevintngo.com/work/
self-portraits/ (a wall of 20 tiles, 540 and 2160 px webp), and a 20 s film made from a second
set of 20 (studied here frame by frame, October 2026). What follows is measured from that film
and wall. The *process* is reconstructed from what the pictures show; Kevin hasn't published it.

## Contents
- What the film measures
- The process, reconstructed (8 steps)
- Five ways to split figure from ground
- Building it with the series template
- Variants worth offering
- Pitfalls

## What the film measures

| | Kevin's film |
|---|---|
| Format | 1080x1080, 30 fps, 20.06 s, AAC 44.1 kHz |
| Tiles | 20, each held **30 frames = 1.000 s**, cuts at exactly 1, 2, 3 ... 19 s |
| Music | about 120 bpm; onsets every 0.5 s; a cut **every second beat** |
| Inside a tile | nothing changes (frame-to-frame difference is codec noise, under 0.1% of pixels) |
| Transitions | none. No fade in (the first frame is already the first tile), no dissolve, no title, no caption, no end card. The music fades under the last tile |
| Loudness | builds from second 8, loudest at 12-15 s, drops at 16, fades over the last second |
| Silhouette | pixel-identical in all 20 tiles (an edge map summed over every tile is one crisp line) |
| Figure geometry (px) | head circle centre (540, 376), r 210, top at y 166; neck 230 wide at y ~590; shoulders widen to 850 by y ~1000 and run off the bottom; centred; 39% of the frame |
| Figure vs ground | mean luminance gap 78-116 (of 255) in every tile, never less |
| Which is lighter | 10 tiles light figure on dark ground, 10 dark on light; never more than three alike in a row |
| Outline | none. The edge of the figure is only where the treatment changes |
| Colour | two or three colours plus a neutral per tile; every tile a different palette |
| Surface | every tile is a hand medium: crayon, pencil hatching, linocut, stipple, gouache, paper collage, woodgrain print. Paper tooth shows through everywhere |
| Accent | a few tiles hide one tiny thing in another colour: a bee on the wheat figure, a red thread and a small red square on the last one, registration crosshairs on a plain one |

The wall's tile names are crafts and pattern traditions: espalier, penwork, one line, pillow
lace, between, battal, pleat, lamp rows, both hands, doublure, transit, phool patti,
metamorphosis, turing, phases, girih, glass, strings, level, grate.

The film's 20, as read from the frames: mosaic flame on pastel waves; egg-and-dart moulding;
paper fans; cement tiles (plain white figure, stitched edge, crosshairs); paper scraps; spoons;
Memphis squiggles; nested grey squares; pencil beans; tartan; seed pods; spirals; triangle
lattice; oak leaves; Greek key; linocut teeth; wheat with a bee; roof shingles; wood grain; ogee
lattice with a red thread.

## The process, reconstructed

### 1. One sentence that makes the variety mean something

"Claude draws self-portraits": a mind with no face draws itself, again and again, as the things
people make. The generic silhouette (the default avatar) says "someone with no face"; filling it
with lace, tiles, leaves and wood says "made of all this". Find your own sentence before drawing
anything: *the same X, made of a different Y every time*. Without it the film is a pattern
sampler.

### 2. Lock the constant

Choose one shape and never move it: same outline, same place, same size, every tile. The eye
holds onto it through the cuts, so each cut reads as "same someone, new world" instead of
"another picture". Make it simple and instantly legible at a glance (a figure, a house, a cat, a
hand, a tree). Let it run off the frame edge, as the shoulders do: it feels like a portrait, not
a sticker.

### 3. Write a vocabulary, wider than you need

List 30-40 candidate worlds, then keep 20 that differ on as many axes as possible:

- **tradition**: girih, Greek key, tartan, cement tiles, pillow lace, roof shingles, Memphis,
  phool patti appliqué, bookbinding doublure, egg-and-dart, espalier, wood grain, Turing
  reaction-diffusion, Escher metamorphosis
- **structure**: grid, lattice, brick rows, scatter, flow, concentric, one continuous line
- **medium**: crayon, pencil hatching, ballpoint, linocut, stipple/riso, gouache dabs, collage
- **palette**: warm / cool / earth / monochrome; light ground / dark ground

Give every tile a one- or two-word name. Naming forces a clear idea per tile, and the names are
the wall's captions.

### 4. One motif, two treatments

Each tile draws the whole sheet edge to edge, then draws the figure with *the same motif*
treated another way. That is what makes the silhouette appear without a line (see the five
ways below). Keep the figure-ground luminance gap at 80 or more. Allow one tiny accent in some
tiles, in a colour that appears nowhere else in it.

### 5. Write each tile as its own little program

One function per tile, sharing only the silhouette and a few media helpers. Everything seeded,
nothing random per frame. Each tile is rendered once and cached, so all its frames are identical.

### 6. Look at the wall, then cull

Lay all tiles out as one grid (`scripts/series_check.cjs`) and look at them together. Remove or
redo: two tiles with the same structure or palette; a tile whose silhouette doesn't pop at
thumbnail size; a tile that looks like clip art (too clean: add tooth, rough edges, hatching).
The wall is also a deliverable in its own right (Kevin publishes it).

### 7. Order for the cut, then for the arc

- Every cut must be a big change: alternate light and dark figures (runs of three at most),
  alternate warm and cool, never put two similar structures next to each other.
- Put the busiest, highest-contrast tiles where the music is loudest (in Kevin's film: Greek
  key, linocut teeth and wheat fall in the 12-16 s peak).
- Bookend: Kevin's film opens on a red figure and ends on the one tile with a red accent.
  End on a tile with a small story detail (the thread, the bee), so the last second has
  something to find.

### 8. Cut it to the beat

Steady music, ~100-130 bpm. A cut every two beats (1 s at 120 bpm). Exactly N tiles x hold =
the film; trim the audio to start on the first cut and fade it over the last tile. Render at
30 fps so 1 s cuts land on whole frames.

## Five ways to split figure from ground

1. **Value swap, motif continues through the edge.** The lattice, plaid or grid runs straight
   across; only its colours flip (green lattice with pale-blue figure; tartan; Greek key thin
   outside, heavy inside; wood grain pale outside, dark inside; shingles).
2. **Same scatter, new colour.** Draw the scatter with the same seed inside and out, so motifs
   that cross the edge change colour mid-shape (blue spirals on grey, white spirals on pale
   blue; red teeth, white teeth).
3. **Form swap.** Filled outside, outlined inside (oak leaves); or the motif turns into a
   relative (pods outside, seeds inside).
4. **Density swap.** Sparse outside, packed inside (paper scraps; fans; beans).
5. **Blank figure.** The figure is plain paper with one construction trace (crosshairs, a
   stitched dashed edge) against a dense ground. Use once; it's a rest.

## Building it with the series template

```
cp -r assets/series-template <project>          # index.html, js/media.js, js/series.js, js/beats.js
python scripts/beat_grid.py <music> <project>/js/beats.js --tiles 20 --hold 2 \
       [--start <s>] [--bpm 120] --trim <project>/audio/music.mp3
node scripts/series_check.cjs --project <project> --out <project>/wall.png
node scripts/render.cjs --project <project> --audio audio/music.mp3 --fps 30 --out out/film.mp4
python scripts/qa.py <project>/out/film.mp4 <project>/out/qa
```

- `js/media.js` (`window.Media`): `figure()` (the measured silhouette as a Path2D),
  `region(ctx, inside, fn)` to draw inside or around it, `paper`, `crayon`, `stipple`, `hatch`,
  `hatchShape`, `line(pts, {w, wobble, rough, fill, close})`, `scatter({dx, dy, jitter, brick,
  seed}, fn)`, motifs `spiral`, `leaf`, `scale`, `meander`, and `tooth` (paper tooth applied to
  every finished tile; set `tooth: 0` on a tile to skip it).
- `js/series.js`: eight example tiles (tartan, spirals, shingles, oak, meander, seeds with a
  bee, grain, lattice with a red thread), each 10-25 lines, showing the five splits. Replace them
  with your own; keep the light/dark alternation. `Film.frame` just blits the cached tile.
- `js/beats.js`: the cut times. The default is one cut a second.
- The example tiles are a starting kit, cleaner than Kevin's. His tiles are denser in medium:
  motifs themselves made of strokes (hatched leaves, crayon spirals with ragged edges), several
  layers per area. Push each tile until it would look at home on his wall.
- `qa.py` should show change only at the cuts and none inside tiles; `series_check.cjs` should
  print no warnings. A 20 s series is ~5-15 MB.

## Variants worth offering

These go beyond Kevin's film; offer them, don't assume them.

- **The user's own silhouette**: trace a photo's outline into `figure()` points (keep it
  simple, about 40 points), and the series becomes their portrait.
- **Another constant**: a house, a pet, a hand, a tree, a single letter.
- **Faster at the peak**: one-beat holds for the loudest bars, two elsewhere (beat_grid's
  `--hold` takes fractions; for mixed holds, write `cuts` by hand from the beat list).
- **A name per tile** in small handwriting (the wall's titles), or none: Kevin's film has none.
- **Wall as a second deliverable**: `series_check.cjs` writes it; bigger tiles with `--w 540`.

## Pitfalls

- A thin ink outline around the figure kills the effect: it becomes a sticker on wallpaper.
- Low contrast (gap under ~70) and the silhouette dissolves at 1 s per tile; the viewer never
  catches it.
- Clean vector strokes look like clip art next to Kevin's tiles: rough the edges, hatch inside
  shapes, let paper tooth through.
- Re-randomising anything per frame makes static tiles boil. Draw each tile once and cache it.
- The beat tracker can halve or double the tempo; check the printed bpm against your ear and
  pass `--bpm` if it's off.
- Cuts a frame late feel wrong; `beat_grid.py` cuts 0.04 s ahead of the detected beat by default.
