"""Cut times for a pattern series: one tile every N beats, hard cuts on the beat.

    python beat_grid.py <audio> <project>/js/beats.js --tiles 20 --hold 2
        [--start 12.3] [--bpm 120] [--fps 30] [--trim <project>/audio/music.mp3] [--fade 1]

Finds the beats (librosa), starts on the first strong beat after --start (or the first beat),
and puts a cut every --hold beats for --tiles tiles. Cuts are rounded to whole frames at --fps,
so no tile is a frame short, and --lead seconds early (default 0.04): a detected beat sits a
little after the attack, and Kevin's cuts land a frame or two before the onsets the tracker finds. --bpm replaces the tracked beats with a steady grid from the first
beat, which is better when the music is steady and the tracker wobbles.

--trim writes the audio from the first cut to the last, so the first tile starts on frame 0,
with a fade over the last --fade seconds (Kevin's self-portraits fade the music out under the
last tile). The cut times written to beats.js are then relative to the trimmed audio.

Kevin's self-portraits: 120 bpm, a cut every 2 beats = 1.000 s, 20 tiles, 20.06 s, 30 fps.
Needs: librosa, numpy; ffmpeg on PATH.
"""
import argparse, json, subprocess
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('out')
ap.add_argument('--tiles', type=int, required=True)
ap.add_argument('--hold', type=float, default=2, help='beats per tile')
ap.add_argument('--start', type=float, default=0)
ap.add_argument('--bpm', type=float)
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--lead', type=float, default=0.04, help='cut this much before each detected beat')
ap.add_argument('--trim'); ap.add_argument('--fade', type=float, default=1.0)
a = ap.parse_args()

sr = 22050  # decode with ffmpeg so mp4 / m4a / video files work too
y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', a.audio, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32)
dur = len(y) / sr
onset = librosa.onset.onset_strength(y=y, sr=sr)
tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, units='frames')
tempo = float(np.atleast_1d(tempo)[0])
beats = librosa.frames_to_time(frames, sr=sr)
strength = onset[frames] / (onset.max() + 1e-9)
print(f'{dur:.2f}s, tracked tempo {tempo:.1f} bpm, {len(beats)} beats')

cand = [i for i, t in enumerate(beats) if t >= a.start - 0.05]
if not cand:
    raise SystemExit('no beats after --start')
first = next((i for i in cand[:8] if strength[i] > 0.3), cand[0])  # a strong beat, not a pickup
t0 = beats[first]

if a.bpm:
    step = 60 / a.bpm
    grid = [t0 + k * step for k in range(int(a.tiles * a.hold) + 1)]
else:
    grid = list(beats[first:])
    step = float(np.median(np.diff(grid))) if len(grid) > 1 else 60 / tempo
    while len(grid) < a.tiles * a.hold + 1:        # run out of tracked beats: extend steadily
        grid.append(grid[-1] + step)
# a cut every `hold` beats; fractional holds interpolate between beats
cuts = [max(0.0, float(np.interp(k * a.hold, np.arange(len(grid)), grid)) - a.lead) for k in range(a.tiles + 1)]
if cuts[-1] > dur + 0.01:
    print(f'warning: the last cut ({cuts[-1]:.2f}s) is past the end of the audio ({dur:.2f}s): fewer tiles or a shorter hold')

offset = cuts[0] if a.trim else 0.0
rel = [round(round((c - offset) * a.fps) / a.fps, 4) for c in cuts]
holds = np.diff(rel)
print(f'first cut {cuts[0]:.3f}s, hold {np.mean(holds):.3f}s (min {holds.min():.3f}, max {holds.max():.3f}), film {rel[-1]:.2f}s')

with open(a.out, 'w') as f:
    f.write('// Written by scripts/beat_grid.py: one cut per tile plus the end, in seconds.\n')
    f.write('window.BEATS = ' + json.dumps({'tempo': round(60 / step, 2), 'hold': a.hold, 'cuts': rel}) + ';\n')
print('wrote', a.out)

if a.trim:
    length = cuts[-1] - cuts[0]
    fade = min(a.fade, length / 2)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{cuts[0]:.3f}', '-t', f'{length:.3f}', '-i', a.audio,
                    '-af', f'afade=t=out:st={length - fade:.3f}:d={fade:.3f}', '-b:a', '192k', a.trim], check=True)
    print('wrote', a.trim, f'({length:.2f}s, starts on the first cut)')
