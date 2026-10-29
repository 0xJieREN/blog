# Kevin T. Ngo's films: what they look like and how they are likely made

Kevin T. Ngo (kevintngo.com, X @kevin_t_ngo) posts short films, generative art and games made
with Claude. His own line for the films is "Claude Opus drew every frame of this animation in
JavaScript." Nothing below is his published method; it is what frame-by-frame study of the
films shows (October 2026). Re-check against the films if a detail matters.

Films are served as plain mp4s: `https://kevintngo.com/films/<name>.mp4` for answer, dew, loves,
nib, still-here, orizuru, honey-bearer, kind, fable, still. watermelon is on video.twimg.com (the
link is in its work page). The "wall" pages (/still/, /kind/, /fable/, /borrowed-light/) are
pre-rendered webp tiles, not live code, so there is no source to read; study the videos.
Run `scripts/study_reference.py` on any of them.

## Format

- 1080x1080 square, 24 fps (two are 60 fps), 27-70 seconds, with music.
- One story per film, told fast: "a fruit fly's whole life in twenty-seven seconds", "the
  history of the dinosaurs on one sheet of paper", "an ant plants a watermelon seed ... and
  shares the fruit". A whole span of time compressed into under a minute.
- Ends on a short handwritten line ("still here.") and often a small signature ("claude",
  "opus 5") on the paper.

## The look that suits a line-drawn music film (still here, nib, watermelon)

- **Paper**: flat warm cream, measured about `#f4eee4`, with very faint grain. No vignette.
- **Ink**: one navy ballpoint colour, measured about `#393f75` (this project uses `#27368c`,
  a little bluer). Lines are about 3 px at 1080, slightly uneven in width, a little wobbly,
  circles overshoot where the pen closes them.
- **Crayon fills**: waxy scribble texture with paper showing through, in a few saturated colours
  (yellow about `#eab645`, orange, teal, red, pink, green). The fill is deliberately *offset*
  from the ink outline, as if coloured in afterwards. Sun = crayon disc plus an ink ring that
  doesn't quite match.
- **Hatching**: short parallel pen strokes for shade (under the egg, under the bed).
- **Ground line**: a single long horizontal ink line across the frame, with a few short dashes
  beneath it.
- **Construction lines**: thin pale-blue guides (circles, crosshairs, motion arcs, arrows)
  appear first and stay faintly, like an animator's layout; then ink goes over them
  (watermelon, nib). Tally marks count days.
- **Drawing on**: lines are revealed along their length as you watch; captions are written out
  stroke by stroke.
- **Captions**: one line, bottom centre, a rounded hand-written sans (~40 px), changing per
  chapter ("230 million years ago" -> "160 million years ago").
- **Characters**: very simple round bodies with big googly eyes: ink ring, crayon iris, solid
  navy pupil with two white highlights. Blush dots.

## Motion and stability (measured)

- Crayon textures are **stable between frames**. In still here the sun's texture is identical
  frame to frame; only the ink drifts very slightly. This is the main reason the films don't
  shimmer. (The first version of this project re-randomised the texture every two frames, and
  every coloured area strobed; frame-to-frame change in coloured areas was ~50%, Kevin's static
  moments are near 0%.)
- watermelon and nib animate **on twos**: every other frame repeats exactly (12 drawings per
  second). still here is on ones with slow continuous drift. Either works; what never works is
  random texture changes.
- Cameras push in, pan across the sheet, or cut between scenes on the beat of the story.
  Moves are gentle.

## Other styles in the same body of work (for range)

- **answer**: risograph look: two-colour halftone dots (pink + blue), misregistered, dot on
  paper calling out as concentric rings; ends "opus 5 · claude".
- **what do you love?**: torn-paper collage, paper-cut shapes with white torn edges, dark navy
  night sky, notebook paper with handwriting.
- **orizuru**: flat vector with soft grain, origami crane, aerial landscapes.
- **nib**: a visible fountain pen in frame drawing the scene, dense cross-hatching, dark crayon
  sky, a construction grid under the drawing.
- **drawing desk / self-portraits**: still generative images (design sheets, star charts).

## Characters (what worked, what didn't)

- Round faces, big googly eyes, blush, tiny nose: reads as Kevin-like and cute.
- Hair as one stiff band, or as a five-line staff, read as a braid or a ribbon. Thick crayon
  locks read as coarse; a separate hair cap looked stuck on. What worked: ~50-70 fine strands
  interpolated between two curves (the hairline and the outer outline of the hair), so the hair
  and the head are one shape; a faint flax underlay; strands ending at slightly different
  lengths; and a breeze wave travelling root to tip, growing toward the tip, neighbouring
  strands in phase (`flaxen/js/film.js`, `hairPt`).
- A front-facing girl with a full bust read as odd and out of scale next to a piano. A full
  figure in side view, drawn in centimetres at real proportions (keys 72 cm, seated head top
  ~130 cm, grand piano ~2 m), read as a person playing. Profile only: forehead, nose, lips,
  chin, a jaw line that rises toward the ear, a closed eye as one lash curve.
- A raised single finger reads as rude; small circles next to eyes read as more eyes.

## Turning this into code (what worked here)

- Canvas 2D, everything redrawn every frame from a time `t`; the page exposes
  `window.__frame(t)` so headless Chromium can render exact frames.
- Strokes are resampled polylines with a fixed per-stroke hand wobble baked in, plus a sub-pixel
  drift that is a *continuous* function of time (`noise(len/40 + t*0.6)`), never a per-frame
  random value.
- Crayon = a pre-generated, seamless scribble tile per colour (short strokes plus knocked-out
  paper tooth) used as a `CanvasPattern`, clipped to the shape, nudged off the outline. One tile
  per colour, generated once.
- Handwriting = single-stroke fonts (Hershey / EMS fonts) revealed by cumulative stroke length.
- All of this is `assets/template/js/engine.js`.
