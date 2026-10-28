"""Find the repeat structure, the 64 performed bar lines and the note onsets of the Aria.

The Aria is 32 bars (two halves of 16, each repeated: A A B B). Every bar sits on one
note of the ground bass, so the DP below snaps bar lines to low-register onsets whose
pitch class matches the expected bass note.
"""
import json, sys
import numpy as np
import librosa

path, out = sys.argv[1], sys.argv[2]
SR, HOP = 22050, 512
y, _ = librosa.load(path, sr=SR, mono=True)
fps = SR / HOP
dur = len(y) / SR

# --- ground bass, one pitch class per bar (G=7, F#=6, E=4, D=2, B=11, C=0, A=9)
G, Fs, E, D, B, C, A = 7, 6, 4, 2, 11, 0, 9
BASS = [G, Fs, E, D, B, C, D, G,  G, Fs, E, A, Fs, G, A, D,
        D, B, C, B, G, A, B, E,   C, B, A, D, G, C, D, G]

rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
thr = rms.max() * 0.02
loud = np.where(rms > thr)[0]
t_start, t_last = loud[0] / fps, loud[-1] / fps

# onset envelopes: full band and bass band
onset_env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
S = np.abs(librosa.stft(y, n_fft=4096, hop_length=HOP))
freqs = librosa.fft_frequencies(sr=SR, n_fft=4096)
low = S[(freqs > 40) & (freqs < 260)]
low_env = librosa.onset.onset_strength(S=librosa.amplitude_to_db(low, ref=np.max), sr=SR, hop_length=HOP)
low_env = low_env / (low_env.max() + 1e-9)

# bass chroma (C1..C4)
cqt = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=librosa.note_to_hz('C1'), n_bins=36, bins_per_octave=12))
bass_chroma = np.zeros((12, cqt.shape[1]))
for k in range(36):
    bass_chroma[k % 12] += cqt[k]
bass_chroma /= bass_chroma.max(axis=0, keepdims=True) + 1e-9

chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP)
chroma = chroma / (np.linalg.norm(chroma, axis=0, keepdims=True) + 1e-9)

def best_lag(t0, span, lo, hi):
    a0, a1 = int(t0 * fps), int((t0 + span) * fps)
    best, bl = -1, None
    for l in range(int(lo * fps), int(hi * fps)):
        if a1 + l >= chroma.shape[1]:
            break
        s = float(np.mean(np.sum(chroma[:, a0:a1] * chroma[:, a0 + l:a1 + l], axis=0)))
        if s > best:
            best, bl = s, l
    return bl / fps, best

L1, s1 = best_lag(t_start, 25, 45, 110)
a2 = t_start + L1
# B1 starts about one A-length after A2; B2 one B-length after B1
b1_guess = a2 + L1
L2, s2 = best_lag(b1_guess + 2, 25, 45, 110)

def bars_dp(t0, t1, notes, end_free=False):
    """Place len(notes) bar lines in [t0, t1); the first is pinned near t0."""
    n = len(notes)
    f0, f1 = int(t0 * fps), int(t1 * fps)
    mean = (f1 - f0) / n
    frames = np.arange(f0 - int(0.4 * fps), f1 + int(0.4 * fps))
    def score(f, pc):
        f = min(max(f, 0), len(low_env) - 1)
        return low_env[f] * (0.4 + bass_chroma[pc, min(f + 3, bass_chroma.shape[1] - 1)])
    # dp[i][f] = best score with bar i starting at frame f
    INF = -1e9
    dp = [dict() for _ in range(n)]
    bp = [dict() for _ in range(n)]
    frames = [int(f) for f in frames]
    for f in frames:
        if abs(f - f0) <= 0.4 * fps:
            dp[0][f] = score(f, notes[0]) - abs(f - f0) / fps
    for i in range(1, n):
        for f in frames:
            bestv, bestp = INF, None
            for pf, v in dp[i - 1].items():
                d = f - pf
                if d < 0.7 * mean or d > 1.45 * mean:
                    continue
                pen = 2.5 * ((d - mean) / mean) ** 2
                val = v + score(f, notes[i]) - pen
                if val > bestv:
                    bestv, bestp = val, pf
            if bestp is not None:
                dp[i][f] = bestv
                bp[i][f] = bestp
    # pick last bar so that the bar after it ends near t1
    lastc = {f: v - 1.5 * ((f1 - f) / mean - 1) ** 2 for f, v in dp[n - 1].items()}
    f = max(lastc, key=lastc.get)
    out = [f]
    for i in range(n - 1, 0, -1):
        f = bp[i][f]
        out.append(f)
    return [x / fps for x in reversed(out)]

secs = []
A_notes, B_notes = BASS[:16], BASS[16:]
bA1 = bars_dp(t_start, a2, A_notes)
# A2 ends where B1 begins: search B1 start as the D-bass onset near the guess
win = np.arange(int((b1_guess - 4) * fps), int((b1_guess + 4) * fps))
cand = [(low_env[f] * (0.4 + bass_chroma[D, f + 3]), f) for f in win]
b1 = max(cand)[1] / fps
bA2 = bars_dp(a2, b1, A_notes)
b2 = b1 + L2
win = np.arange(int((b2 - 3) * fps), int((b2 + 3) * fps))
cand = [(low_env[f] * (0.4 + bass_chroma[D, f + 3]), f) for f in win]
b2 = max(cand)[1] / fps
bB1 = bars_dp(b1, b2, B_notes)
# last section: ends when the final chord has rung for about a bar
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=SR, hop_length=HOP, units='frames', backtrack=False)
last_on = onsets[onsets / fps < t_last][-1] / fps
bar_len = (b2 - b1) / 16
end_guess = min(last_on + bar_len * 1.3, t_last)
bB2 = bars_dp(b2, end_guess, B_notes)
bars = bA1 + bA2 + bB1 + bB2 + [end_guess]

# check: how well does the bass pitch class at each bar line match the score?
hits = 0
for i, t in enumerate(bars[:-1]):
    f = int(t * fps) + 3
    pc = int(np.argmax(bass_chroma[:, f:f + 6].mean(axis=1)))
    hits += pc == BASS[i % 16 + (16 if i >= 32 else 0)]

on = []
strength = onset_env[onsets]
strength = strength / strength.max()
for f, s in zip(onsets, strength):
    t = f / fps
    if t < t_start - 0.1:
        continue
    pc = int(np.argmax(chroma[:, f:f + 4].mean(axis=1)))
    sl = S[:, f:f + 4].mean(axis=1)
    cent = float((freqs * sl).sum() / (sl.sum() + 1e-9))
    on.append([round(t, 3), round(float(s), 3), pc, round(cent)])

res = dict(duration=round(dur, 3), start=round(t_start, 3), last=round(t_last, 3),
           sections=[round(x, 3) for x in (t_start, a2, b1, b2, end_guess)],
           bars=[round(x, 3) for x in bars], onsets=on,
           check=dict(lagA=round(L1, 2), simA=round(s1, 3), lagB=round(L2, 2), simB=round(s2, 3), bass_hits=f"{hits}/64"))
json.dump(res, open(out, 'w'))
print(json.dumps({k: v for k, v in res.items() if k != 'onsets'}, indent=1))
print('onsets', len(on))
print('bar lengths', np.round(np.diff(bars), 2).tolist())
