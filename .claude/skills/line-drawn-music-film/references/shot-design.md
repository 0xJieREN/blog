# Story and shots for a ~30 second music film

## Find the idea in the music, not next to it

The film lands when its story *is* the structure of the music. Read the piece first:

- What stays and what moves? (Goldberg Aria: a ground bass, one note a bar, under a wandering
  ornamented melody. Idea: a restless mind finds something steady to lean on.)
- What does the excerpt do harmonically? (Bars 1-7 then the last bar: the opening phrase walks
  straight into the ending.)
- Is there a story attached to the piece? (Forkel's anecdote: Count Keyserlingk's insomnia,
  young Goldberg playing in the next room. Say "as the story goes" if it's legend.)

Write the whole film as one sentence split across the shots, one short line each, e.g.
"one night in Dresden, / a count could not sleep. / next door, a boy was playing. / (keys) /
the tune wandered, / but the bass beneath it held still, / something steady to lean on, /
and the Count slept." Then a closing card ("aria.") and a small credit.

## Let the music set the pace

Match the cutting to the character of the piece, not to a fixed rule. The Goldberg Aria takes
one shot per bar (4.4 s) and that felt right; the same rate on Debussy's "Très calme et
doucement expressif" felt rushed. For slow, tender music: shots of 10-15 s, one per phrase,
dissolves of 1-1.5 s (`Kit.film(..., { dissolve: 1.2 })`), cameras that only drift, and motion
that is continuous in time. Ask for, or allow, the length the piece needs (60-90 s for a slow
piece); don't squeeze a mood into 30 s.

## Bookend with one shape

The strongest ending so far: the opening line (a melody drawn by the pen) bends into a shape
(her profile) and pales into pencil exactly where that shape hangs in the next shot, so it
survives the dissolve. Through the film the notes go and wait on the pencilled shape; at the
end the ink joins them, note by note with the music, and it is her. Make the end shape the
same drawing as the character, so it reads as "her". Bend the line by resampling both curves
to the same number of points and easing each point from one to the other, staggered from the
first note to the last (`flaxen/js/film.js`, `bentAt`).

## One shot per bar (or per phrase)

- Cut **exactly on downbeats** taken from `SCORE.bars`. A cut that lands on the bass note feels
  like the music caused it.
- Soft cut: the next shot dissolves in over ~0.22 s ending on the downbeat (`Kit.film` does
  this). Hard cuts are fine for a jolt, but dissolves read calmer with slow music.
- 8 bars -> 8 shots works for a 4-5 s bar. With a fast piece, use one shot per phrase.
- Vary the kind of shot, so the cut itself is interesting:
  - **source**: where the sound comes from (player at the instrument); notes pop at birth.
  - **insert**: a big close-up of one object (a clock face, a candle, keys from above).
  - **cross-section**: under the floor, inside the wall, a dollhouse cut of the building.
  - **tracking**: drift with the music through the space (music room -> wall -> bedroom).
  - **bookend**: return to the first framing near the end with one thing changed (eyes closed).
  - **wide**: pull back to the whole sheet for the ending.
- **Match cuts** make the edit feel designed: end one shot by pushing into a round thing (an
  eye) and open the next on another round thing in the same place (a clock face). Keep the
  centre point identical across the cut.
- Put rhythm inside shots too: a pendulum through the middle on every beat, a second hand
  ticking per beat, eyelids closing one step per beat in the last bar, a stone landing on the
  downbeat, keys lighting for exactly as long as each note sounds.

## Camera

- Line art judders when it moves fast at 24 fps. Keep pans under ~8 px per frame on screen
  (zoom x world speed / 24). Following a note at full speed was too fast; drifting at half the
  notes' speed and letting them overtake the camera looked right.
- Gentle push-ins (3-10% over a shot) keep a still frame alive.
- Do fast moves only as deliberate transitions (the dive into the eye over 0.75 s).
- Check with `scripts/qa.py`: big changes away from a cut mean a move is too fast.

## Drawing on

- First time a place is seen, draw it on quickly (1-2 s, guides first, then ink, then crayon),
  so every new shot starts with motion. When you return to it, it's already drawn.
- Things that will happen later can already be there in pale guide colour (the bass stones still
  to come, pencilled in). It says "this is already written" without a caption.

## Captions

- One line, bottom centre, written out at ~16 characters per second, from 0.1 s after the cut,
  fading 0.3 s before the next cut. Lower case, no full stop until the last line.
- Keep the bottom ~190 px clear (`Kit.margin` fades the drawing out there) for the caption and
  the bass strip above it.
- A shot with no caption gives the music room (the keyboard insert).
- The single-stroke fonts only have ASCII: no `·`, no umlauts, no CJK. Use `/` or `,`.
