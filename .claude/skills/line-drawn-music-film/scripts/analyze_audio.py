"""Find bar lines and note onsets in a recording, for timing a film to it.

    python analyze_audio.py <audio> <timing.json> --beats-per-bar 3 --bars 32
        [--start 1.7] [--end 298] [--bar-seconds 4.5] [--bass "G F# E D B C D G"]
        [--repeat-search]

Give the bar length if you can: --end (when the last bar ends) or --bar-seconds (play it,
time two downbeats). Otherwise it is estimated from how often bass onsets repeat.

Bar lines are placed by dynamic programming: each bar line should sit on a low-register
onset, bars should be about the same length, and (with --bass) the bass pitch at each bar
line should match the expected note. Without --end the last bar is left free.

--repeat-search prints the lag at which the opening comes back (chroma self-similarity),
which is how you find "A A B B" repeats before deciding --bars.

Output JSON: duration, start, bars (bars + 1 times), onsets [[t, strength 0-1, pitch class, centroid Hz]], check.
Needs: librosa, numpy (pip install librosa).
"""
import argparse, json
import numpy as np
import librosa

PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('out')
ap.add_argument('--beats-per-bar', type=int, default=4)
ap.add_argument('--bars', type=int, required=True)
ap.add_argument('--start', type=float); ap.add_argument('--end', type=float)
ap.add_argument('--bar-seconds', type=float)
ap.add_argument('--bass', default='')
ap.add_argument('--repeat-search', action='store_true')
a = ap.parse_args()

SR, HOP = 22050, 512
y, _ = librosa.load(a.audio, sr=SR, mono=True)
fps = SR / HOP
dur = len(y) / SR

rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
loud = np.where(rms > rms.max() * 0.02)[0]
t_start = a.start if a.start is not None else loud[0] / fps
t_last = loud[-1] / fps

onset_env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
S = np.abs(librosa.stft(y, n_fft=4096, hop_length=HOP))
freqs = librosa.fft_frequencies(sr=SR, n_fft=4096)
low_env = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[(freqs > 40) & (freqs < 260)], ref=np.max), sr=SR, hop_length=HOP)
low_env = low_env / (low_env.max() + 1e-9)
cqt = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=librosa.note_to_hz('C1'), n_bins=36, bins_per_octave=12))
bass_chroma = np.zeros((12, cqt.shape[1]))
for k in range(36):
    bass_chroma[k % 12] += cqt[k]
bass_chroma /= bass_chroma.max(axis=0, keepdims=True) + 1e-9
chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP)
chroma /= np.linalg.norm(chroma, axis=0, keepdims=True) + 1e-9

if a.repeat_search:
    a0, a1 = int(t_start * fps), int((t_start + 25) * fps)
    sims = []
    for l in range(int(20 * fps), min(int(200 * fps), chroma.shape[1] - a1)):
        sims.append((float(np.mean(np.sum(chroma[:, a0:a1] * chroma[:, a0 + l:a1 + l], axis=0))), l / fps))
    sims.sort(reverse=True)
    print('opening returns after (similarity, seconds):', [(round(s, 3), round(l, 2)) for s, l in sims[:5]])

if a.bar_seconds:
    bar_s = a.bar_seconds
elif a.end:
    bar_s = (a.end - t_start) / a.bars
elif a.bass:
    # try bar lengths and keep the one whose bar lines land on the expected bass notes
    bass_pc = [PC[x] for x in a.bass.split()]
    def fit(L):
        tot = 0
        for i in range(min(len(bass_pc), 8)):
            c = int((t_start + i * L) * fps); w = int(0.12 * L * fps)
            fr = np.arange(max(0, c - w), min(len(low_env) - 4, c + w + 1))
            tot += np.max(low_env[fr] * (0.2 + bass_chroma[bass_pc[i], fr + 3]))
        return tot
    cands = np.arange(1.0, 8.0, 0.02)
    bar_s = float(cands[int(np.argmax([fit(L) for L in cands]))])
    print(f'bar length that fits the bass line: {bar_s:.2f}s')
else:
    # without a bass line: how often low onsets repeat (often finds the beat, not the bar;
    # pass --bar-seconds when it does)
    seg_env = low_env[int(t_start * fps):int((t_start + 60) * fps)]
    seg_env = seg_env - seg_env.mean()
    ac = np.correlate(seg_env, seg_env, 'full')[len(seg_env) - 1:]
    lags = np.arange(int(1.2 * fps), min(len(ac), int(7 * fps)))
    bar_s = lags[np.argmax(ac[lags])] / fps
    print(f'onset period {bar_s:.2f}s, may be a beat rather than a bar; pass --bar-seconds if so')
print(f'bar length guess {bar_s:.2f}s')

bass = [PC[x] for x in a.bass.split()] if a.bass else []
mean = bar_s * fps
f0 = int(t_start * fps)
f1 = int((a.end if a.end else t_start + bar_s * a.bars) * fps)


def score(f, i):
    f = min(max(f, 0), len(low_env) - 1)
    s = low_env[f]
    if bass:
        s *= 0.4 + bass_chroma[bass[i % len(bass)], min(f + 3, bass_chroma.shape[1] - 1)]
    return s


frames = list(range(max(0, f0 - int(0.4 * fps)), min(len(low_env), f1 + int(0.6 * mean))))
dp = [dict() for _ in range(a.bars)]
bp = [dict() for _ in range(a.bars)]
for f in frames:
    if abs(f - f0) <= 0.4 * fps:
        dp[0][f] = score(f, 0) - abs(f - f0) / fps
for i in range(1, a.bars):
    prev = sorted(dp[i - 1].items())
    for f in frames:
        best, arg = -1e9, None
        for pf, v in prev:
            d = f - pf
            if d < 0.7 * mean or d > 1.45 * mean:
                continue
            val = v + score(f, i) - 2.5 * ((d - mean) / mean) ** 2
            if val > best:
                best, arg = val, pf
        if arg is not None:
            dp[i][f], bp[i][f] = best, arg
last = dp[a.bars - 1]
if a.end:
    last = {f: v - 1.5 * ((f1 - f) / mean - 1) ** 2 for f, v in last.items()}
f = max(last, key=last.get)
seq = [f]
for i in range(a.bars - 1, 0, -1):
    f = bp[i][f]
    seq.append(f)
bars = [float(x / fps) for x in reversed(seq)]
end = a.end if a.end else min(t_last, bars[-1] + np.mean(np.diff(bars)) if len(bars) > 1 else bars[-1] + bar_s)
bars.append(float(end))

hits = 0
if bass:
    for i, t in enumerate(bars[:-1]):
        fr = int(t * fps) + 3
        hits += int(np.argmax(bass_chroma[:, fr:fr + 6].mean(axis=1))) == bass[i % len(bass)]

on_f = librosa.onset.onset_detect(onset_envelope=onset_env, sr=SR, hop_length=HOP, units='frames')
st = onset_env[on_f] / onset_env[on_f].max()
onsets = []
for fr, s in zip(on_f, st):
    sl = S[:, fr:fr + 4].mean(axis=1)
    onsets.append([round(fr / fps, 3), round(float(s), 3), int(np.argmax(chroma[:, fr:fr + 4].mean(axis=1))), round(float((freqs * sl).sum() / (sl.sum() + 1e-9)))])

res = dict(duration=round(dur, 3), start=round(t_start, 3), bars=[round(x, 3) for x in bars], onsets=onsets,
           check=dict(bass_hits=f'{hits}/{a.bars}' if bass else None, bar_lengths=[round(x, 2) for x in np.diff(bars)]))
json.dump(res, open(a.out, 'w'))
print(json.dumps(res['check']))
print('bars', res['bars'])
