# Problems hit while making "aria", and the fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Bright colours shimmer constantly | crayon tile re-randomised every 2 frames ("boil") | one fixed tile per colour; ink drift as a continuous function of time, never per-frame random |
| One frame pops mid-film | rendered in chunks encoded separately; quality jumps at the seam | render PNG frames, encode once (`scripts/render.cjs` does) |
| Heads/faces missing in close-ups | off-screen culling compared a local (translated) stroke box against world view bounds | cull using `ctx.getTransform()` on the box corners (engine does) |
| Lines show through a character | strokes have no fill, so the headboard/pillow behind shows | fill the head and hat with paper colour before inking; shorten lines that end behind |
| Character's hands read as a second pair of eyes | small circles next to the eyes | remove or move away from the face |
| A single raised finger looked rude | pressing finger much longer than the rest | four short fingers, the pressing one only slightly longer |
| Play button stays after pressing play | CSS `display:grid` overrides the `hidden` attribute | `#play[hidden] { display: none }` |
| Caption collides with drawing | content runs into the bottom band | `Kit.margin()` fade band; keep camera framings above y ~890 |
| Missing characters in captions | single-stroke fonts are ASCII only | avoid `·`, umlauts, CJK; compose or rephrase |
| Bar lines wrong for slow music | tempo estimation picks a subdivision | pass `--bass` (best) or `--bar-seconds`/`--end` to `analyze_audio.py` |
| Spliced excerpt has a drop-out | joined in a quiet sustained tail | join just before a downbeat attack at matching level, 20-40 ms crossfade |
| Notes look random | spawned on detected onsets with no pitch | align the real score; height = pitch, spacing = rhythm |
| Camera move stutters | pan too fast for line art at 24 fps | under ~8 px/frame on screen; let notes overtake the camera |
| 300 MB file for 5 minutes | noisy textures changing every frame defeat compression | fix the flicker (stable frames compress ~10x better); crf 20 is plenty |
| Reference site unreachable from the sandbox | network policy | ask the user to allow the host; meanwhile work from notes, and say so |
| upload.wikimedia.org returns 429 | shared egress rate limit | get the same file from archive.org |
| IMSLP score/MIDI download stops at a disclaimer | accepting it would be agreeing on the user's behalf | ask the user, or transcribe the recording instead |
| A melody line full of spikes | transcription ghost notes and a pitch scale that's too steep | drop notes within 0.15 s of the previous one, ~16 px per semitone, smooth the line (0.2 s) |
| Two hair/staff paths crossing in one shot | a character's own staff plus a scene staff | keep one stream per shot (`noHair`-style switch) |
| The ink falls behind the pen on steep parts of a line | stroke revealed by time while the pen moves by x | reveal to the arc length at the pen's x (`progAtX` in flaxen) |
| Crayon scribbles huge in a close-up | crayon drawn inside a scaled-up local frame scales its pattern too | pass `tex: 1 / scale` to `crayon` (engine) |
| A character drawn bigger than the things around her | each object drawn at its own convenient size | draw the scene in real units (cm) and place it with one scale per shot |
| `pkill -f <pattern>` killed the current shell | the pattern matched the command itself | don't pkill by a pattern that appears in your own command line |

Also worth remembering:

- A full-length film (5 min) was not what was wanted. Ask for the target length early; default
  to ~30 s.
- Show contact sheets of every shot before rendering the whole thing: each `tools/shots`-style
  still takes under a second, a full render takes minutes.
- Large renders (`out/`) don't belong in git; add them to `.gitignore`.
