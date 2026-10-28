---
name: line-drawn-music-film
description: Make short hand-drawn-looking animated films set to a piece of music, where every frame is drawn in JavaScript on a canvas (ballpoint lines, crayon fills, handwritten captions) in the style of Kevin T. Ngo's "Claude drew every frame" films, with cuts, notes and motion timed to the real recording and score. Use this whenever the user wants a music video, animated short, visualizer or "video for this song/piece" made with code or canvas, wants something "like Kevin's films", line-art / doodle / ballpoint / crayon animation, a film for a classical piece (Bach, Goldberg, Chopin...), notes flowing out of an instrument, or asks to redo/extend the "aria" film in this repo, even if they don't say "skill" or name the style. 中文触发：用线条/手绘/圆珠笔/蜡笔风格做视频、给某首曲子做短片、像 Kevin 那样用 JavaScript 画每一帧、配乐动画、音符跟着音乐弹出。
---

# Line-drawn music films

A ~30 second square film: cream paper, navy ballpoint lines that draw themselves on, crayon
colour, one handwritten caption per shot, and a story that *is* the structure of the music.
Every cut lands on a downbeat, every note on screen is a real note of the score appearing the
moment it's played. Everything is code: a page draws frame `t`, headless Chromium renders the
frames, ffmpeg adds the audio.

Films made this way in this repo, for worked examples:
- `goldberg/`: Bach's Aria, bars 1-7 + 32, 35 s, eight shots, notes from a Mutopia score.
- `flaxen/`: Debussy's "La fille aux cheveux de lin", 32 s, six shots, notes transcribed from
  the recording (no open score), a melody line drawn as its pitch contour.

## What's in here

- `assets/template/`: a working project. Copy it to start. `index.html` (player + `?render=1`
  mode), `js/engine.js` (pen, crayon, hatching, handwriting), `js/kit.js` (staff and notes,
  keyboard, bass stones, eyes, pendulum, shot sequencer with dissolves, captions, bass strip,
  closing card), `js/film.js` (a 4-shot example), `js/fonts.js`, example `js/score.js` and
  `audio/example.mp3`.
- `scripts/`
  - `study_reference.py`: study a reference film (contact sheet, consecutive frames, frame-diff
    stats, on-twos detection, palette).
  - `analyze_audio.py`: bar lines and onsets from a recording.
  - `align_score.py`: MIDI notes timed to the recording, written to `score.js`.
  - `transcribe.py`: no score? Notes straight from the recording (basic-pitch, ONNX), in film
    time, top line as the melody, written to `score.js`.
  - `build_fonts.py`: rebuild `fonts.js` if you need other single-stroke fonts.
  - `stills.cjs`: a contact sheet of chosen moments in seconds. Use it after every change.
  - `render.cjs`: full render to mp4.
  - `qa.py`: flicker, too-fast motion, contact sheet, audio level.
- `references/`
  - `kevin-style.md`: what Kevin's films look like and measure like, and how that maps to code.
  - `music-and-sync.md`: legal recordings and scores, choosing and splicing an excerpt, timing.
  - `shot-design.md`: finding the idea, one shot per bar, cut types, camera speed, captions.
  - `pitfalls.md`: every problem hit on the first film and its fix. Skim it before you start.

## Workflow

### 1. Pin down the brief

Get, or decide sensibly and state: the piece and which part, target length (default ~30 s; the
first attempt at a full 5-minute piece was not wanted), format (1080x1080, 24 fps), the feeling
or story, any reference style, and where the project folder goes. If the user is away or says
"decide for me", choose and say what you chose.

### 2. Study the reference, if there is one

Look before imitating. Download a few of the reference films and run
`python scripts/study_reference.py film.mp4 out/` on each; look at `sheet.jpg`, `sequence.jpg`
and `diff.jpg`. For Kevin's style read `references/kevin-style.md`. It already holds the
measurements, and the one that matters most is that **crayon texture does not change between
frames**.

If the sandbox can't reach the site, say which host is blocked and ask the user to allow it.
Work from notes in the meantime, and say that you are.

### 3. Music and timing

Follow `references/music-and-sync.md`:

1. Get a CC0/public-domain recording (archive.org first) and a MIDI of the score (Mutopia).
2. Run `analyze_audio.py`, with `--bass` if you know the bass line. Check `bass_hits`.
3. Choose the excerpt in whole bars that end on a cadence. Splice at matching downbeats if
   needed, and cut the audio with ffmpeg.
4. Write `slots.json` and run `align_score.py`. That gives `js/score.js`. No score you can
   download? Run `transcribe.py` on the recording instead (see "No score?" in the same reference).
   For a piece in flats, pass `--flats` (or set `SCORE.spelling = 'flat'`) so notes sit on the
   right staff lines.

Python deps go in a venv: `python3 -m venv venv && venv/bin/pip install librosa pretty_midi pillow`.
Playwright's Chromium and ffmpeg are usually preinstalled. Don't reinstall Playwright.

### 4. Idea and storyboard

Read `references/shot-design.md`. Find what in the music stays and what moves, and make that
the story. Write the film as one sentence split into one short caption per shot. Then make a
shot table, one row per bar: start time (`SCORE.bars[i]`), bass note, shot type, what moves on
the beat, and the caption. Mix source, insert, cross-section, tracking, bookend and wide shots.
Plan at least one match cut. Share the table in a few lines if the user is around; don't wait
on it if they've said to go ahead.

### 5. Build

Copy `assets/template/` to the project folder, replace `js/score.js` and the audio, set the
audio file name in `index.html` and `DURATION` in `js/film.js`, then write the shots.

Engine (`window.Pen`), all in 1080x1080 page units:
- `stroke(points, {wobble})`: a polyline with hand wobble.
- `ink(stroke, {prog, w, color, alpha})` and `inkGroup(group, prog, opts)`: draw a stroke or
  group, revealed by `prog` from 0 to 1.
- `guide(...)`: the same, as pale-blue construction lines.
- `pts.line/ellipse/arc/rect/curve`: point helpers. `curve` is Catmull-Rom.
- `crayon(polygon, color, {prog, dx, dy, alpha, seed})` and `crayonEllipse(...)`: a waxy fill
  nudged off the outline. Keep the outline in ink.
- `hatch(polygon, {angle, gap})`: returns short pen strokes to `group` and ink.
- `text(str, 'tech' | 'allure', x, y, size, {align})` with `write(group, prog)`: handwriting.
  ASCII only.
- `seg(t, a, b)`, `smooth`, `ease`, `lerp`, `clamp`, `noise`, `rng`: timing and math helpers.

Kit (`window.Kit`):
- `beatAt(t)` and `press(t, voice)`: musical time, and a 0-1 pulse after each note.
- `path(points, wander)`, `staff(ctx, P, t, {offset})`, `riders(ctx, P, t, {born, offset})`,
  `clef(...)`: notes on a staff at their real pitch, moving at constant speed. Use `born: true`
  when the instrument is in frame.
- `keys(ctx, t, {t0, lo, hi})`: a keyboard from above. Keys light while their notes sound, and
  notes rise off them.
- `ground(ctx, t, {t0, current, names, contour})`: the bass as stepping stones. The current one
  lands on the downbeat; later ones are already pencilled in.
- `eye(ctx, x, y, r, open, look)`, `pendulum(ctx, x, y, len, r, beat)`.
- `camera(ctx, k, cx, cy, zoom)`, `camLerp(...)`.
- `film(shots, {strip, final})`: returns `frame(canvas, t)`. Each shot is
  `{start, draw(ctx, t, k), caption}`. It handles dissolves, captions, the bass strip and the
  closing card.

Habits that keep it looking right:
- Draw a place on quickly (guides, then ink, then crayon, over 1-2 s) the first time it's seen.
  Gate everything with `seg(t, ...)`.
- Fill characters' heads with paper colour before inking so lines behind them don't show.
- Anything rhythmic reads from `beatAt` or the note times, never from wall-clock guesses.
- Never use per-frame randomness. Movement comes from `t` only, so every frame is reproducible
  and nothing strobes.

### 6. Look, fix, look again

`node scripts/stills.cjs --project <dir> --out stills.png --t "<one or two times per shot>"`
takes seconds. Look at the image yourself and fix what's off: overlaps, missing heads, caption
collisions, anything that reads wrong (hands, gestures). Repeat. Only render the whole film once
the stills are right.

### 7. Render, check, deliver

```
node scripts/render.cjs --project <dir> --audio audio/<excerpt>.mp3 --out out/film.mp4
python scripts/qa.py out/film.mp4 out/qa --score <dir>/js/score.js
```

You want no flicker frames, the biggest motion only at cuts or planned moves, and audio present.
Look at `out/qa/sheet.jpg`. A clean 35 s film is ~13 MB at crf 20; a much bigger file usually
means something is changing every frame.

Then send the mp4 to the user. Commit the code and data but not `out/` (gitignore it). Write a
short README in the project with the idea, shot list, how to re-render, and the credits and
licences for the recording, the score (CC BY-SA if from Mutopia), and the fonts (OFL / MIT).

When you report back, be specific about what you measured (flicker frames, length, file size)
and about anything you chose for the user, such as an excerpt longer than asked because the
phrase needed it.
