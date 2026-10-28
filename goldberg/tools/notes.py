"""Align the score of the excerpt to the recording and write js/score.js.

The excerpt is bars 1-7 of the Aria followed by its last bar, 32 (both cadence on G
after a D bar), cut from Kimiko Ishizaka's recording:
    audio 1.20-31.80 s, then 292.30-297.2 s with a 30 ms crossfade.

Every note of the Mutopia MIDI (bwv-988-aria.mid) gets the moment it is actually played:
beats are placed between the bar lines found by analyze.py, then each note is snapped
to the nearest detected onset.

usage: python3 notes.py <bwv-988-aria.mid> <timing.json>
"""
import json, sys
from pathlib import Path
import pretty_midi

HERE = Path(__file__).resolve().parent.parent
mid, timing = sys.argv[1], sys.argv[2]
# (bar of the score, performed bar in the recording, audio seconds -> film seconds)
SLOTS = [(k, k, 1.20) for k in range(7)] + [(31, 63, 292.30 - 30.57)]

t = json.load(open(timing))
bars = t['bars']
onsets = [o for o in t['onsets'] if o[1] > 0.05]
on_t = [o[0] for o in onsets]


def nearest(x, win, strong=0.0):
    best = None
    for o in onsets:
        if abs(o[0] - x) <= win and o[1] >= strong and (best is None or abs(o[0] - x) < abs(best - x)):
            best = o[0]
    return best


# beat lines: bar starts are known; beats 2 and 3 snap to the closest clear onset
beats = []
for score_bar, k, off in SLOTS:
    b0, b1 = bars[k], bars[k + 1]
    if score_bar == 31:  # the final bar is held long: measure it from its last chord on beat 3
        b1 = b0 + (nearest(b0 + 2.4, 0.5) - b0) * 1.5
    row = [b0]
    for j in (1, 2):
        g = b0 + (b1 - b0) * j / 3
        row.append(nearest(g, 0.35, 0.15) or g)
    row.append(b1)
    beats.append(row)

m = pretty_midi.PrettyMIDI(mid)
notes = []
for voice, inst in enumerate(m.instruments):
    for n in inst.notes:
        b = n.start  # the MIDI runs at 60 bpm: one second per beat
        bar = int(b // 3)
        slot = next((i for i, s in enumerate(SLOTS) if s[0] == bar), None)
        if slot is None:
            continue
        k = slot
        beat = b - 3 * bar
        j = int(beat)
        g = beats[k][j] + (beats[k][j + 1] - beats[k][j]) * (beat - j)
        snap = nearest(g, 0.06 if beat % 1 else 0.2)
        tt = snap if snap is not None else g
        notes.append(dict(t=tt - SLOTS[k][2], pitch=n.pitch, dur=round(n.end - n.start, 3), voice=voice, bar=k, beat=round(beat, 3)))

# simultaneous notes share one time
notes.sort(key=lambda n: (n['bar'], n['beat'], n['voice']))
for a, b in zip(notes, notes[1:]):
    if (a['bar'], a['beat']) == (b['bar'], b['beat']):
        b['t'] = a['t']
for n in notes:
    n['t'] = round(n['t'], 3)

beats = [[round(x - SLOTS[i][2], 3) for x in row] for i, row in enumerate(beats)]
out = dict(bars=[row[0] for row in beats] + [beats[-1][-1]],
           beats=beats,
           notes=[[n['t'], n['pitch'], n['dur'], n['voice'], n['bar'], n['beat']] for n in notes])
(HERE / 'js/score.js').write_text(
    '// Bars 1-7 and 32 of the Aria. Notes from the Mutopia Project edition (JD Erickson, after the Bach-Gesellschaft,\n'
    '// CC BY-SA 3.0), timed to Kimiko Ishizaka\'s recording (CC0) by tools/notes.py.\n'
    '// bars/beats: seconds into the film; notes: [time, midi pitch, beats long, voice (0 upper, 1 lower), bar, beat]\n'
    'window.SCORE = ' + json.dumps(out, separators=(',', ':')) + ';\n')
for n in notes:
    if n['voice'] == 0:
        print(f"bar {n['bar'] + 1} beat {n['beat']:<5} {pretty_midi.note_number_to_name(n['pitch']):<4} t={n['t']:.2f}")
print('beats', out['beats'])
