"""The music for "butterfly": an original accelerando, synthesised note by note.

    python3 tools/music.py            # writes audio/music.wav, audio/music.mp3, js/beats.js

Why synthesise: the film needs a tempo that really rises (not just louder, not more
instruments) and a cut on a real note every time. A piece written for the cut list does both
exactly; it is ours, so there is no licence to check. Marimba, plucked bass, woodblock, shaker,
a soft kick and a glockenspiel, all additive / Karplus-Strong in numpy.

Tempo: 84 -> 138 bpm, exponential over 10 bars of 4/4 (40 beats), then a final chord.
Cuts, in eighth notes:
  bars 1-2   every 4 eighths (half notes)         4 tiles  ~1.4 s
  bars 3-5   3+3+2 eighths (tresillo accents)     9 tiles  ~0.95 / 0.6 s
  bars 6-8   every 2 eighths (beats)             12 tiles  ~0.5 s
  bars 9-10  every eighth                        16 tiles  ~0.24 s
  bar 11     the final chord, held               1 tile    ~1.6 s
Every cut has an accented attack on it (bass, woodblock or glock), so each cut is heard.
"""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T0, T1, BEATS = 84.0, 138.0, 40
R = T1 / T0
TAIL = 1.75                      # the final chord rings this long after its attack
rng = np.random.default_rng(5)


def beat_time(b):
    """seconds at beat b: tempo T(b) = T0 * R**(b / BEATS), integrated."""
    return 60 / T0 * BEATS / np.log(R) * (1 - R ** (-b / BEATS))


def et(e):                       # eighth-note index -> seconds
    return float(beat_time(e / 2))


def tempo_at(e):
    return T0 * R ** (e / 2 / BEATS)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


DUR = et(80) + TAIL
N = int(DUR * SR) + SR
mix = np.zeros((2, N))


def put(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    n = min(len(sig), N - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[0, i:i + n] += sig[:n] * gain * l * 1.41
    mix[1, i:i + n] += sig[:n] * gain * r * 1.41


def env(n, attack=0.002):
    a = max(1, int(attack * SR))
    e = np.ones(n)
    e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    return e


def marimba(m, dur=1.6, bright=1.0):
    f = hz(m)
    t = np.arange(int(dur * SR)) / SR
    tau = np.clip(0.55 * (440 / f) ** 0.6, 0.12, 1.1)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    s += 0.32 * bright * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / (tau * 0.28))
    s += 0.07 * bright * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / (tau * 0.1))
    click = rng.standard_normal(len(t)) * np.exp(-t / 0.0025) * 0.12 * bright
    return (s + click) * env(len(t), 0.0015)


def glock(m, dur=2.2):
    f = hz(m)
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for k, a, d in ((1, 1, 1.4), (2.76, 0.35, 0.5), (5.4, 0.16, 0.22), (8.93, 0.06, 0.1)):
        s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / d)
    return s * env(len(t), 0.001)


def pluck(m, dur=1.4, damp=0.996):
    """Karplus-Strong string with a sine under it for weight."""
    f = hz(m)
    p = int(round(SR / f))
    n = int(dur * SR)
    buf = np.zeros(n + p + 1)
    buf[:p + 1] = rng.uniform(-1, 1, p + 1)
    buf[:p + 1] -= buf[:p + 1].mean()
    i = p + 1
    while i < n + p + 1:      # vectorised one period at a time
        j = min(i + p, n + p + 1)
        buf[i:j] = damp * 0.5 * (buf[i - p:j - p] + buf[i - p - 1:j - p - 1])
        i = j
    s = buf[p + 1:n + p + 1]
    t = np.arange(n) / SR
    s = 0.6 * s + 0.55 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5)
    return s * env(n, 0.003)


def woodblock(f=1180, dur=0.12):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.028) + 0.5 * np.sin(2 * np.pi * f * 1.62 * t) * np.exp(-t / 0.016)
    s += rng.standard_normal(len(t)) * np.exp(-t / 0.002) * 0.3
    return s * env(len(t), 0.0005)


def shaker(dur=0.09, decay=0.03):
    t = np.arange(int(dur * SR)) / SR
    x = rng.standard_normal(len(t))
    x = np.diff(np.concatenate([[0], x]))          # tilt it bright
    return x * np.exp(-t / decay) * env(len(t), 0.006)


def kick(dur=0.45):
    t = np.arange(int(dur * SR)) / SR
    f = 48 + 75 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * env(len(t), 0.001)


# ---------------------------------------------------------------- the score
D2, F2, G1, A1, Bb1, C2, E2, G2, A2, Bb2, C3, D3 = 38, 41, 31, 33, 34, 36, 40, 43, 45, 46, 48, 50
notes = {n: m for n, m in zip(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], range(12))}


def p(s):  # 'D4' -> midi
    return 12 * (int(s[-1]) + 1) + notes[s[:-1]]


cut_e = [0, 4, 8, 12] + [16 + 8 * k + o for k in range(3) for o in (0, 3, 6)] + list(range(40, 64, 2)) + list(range(64, 80)) + [80]
assert len(cut_e) == 42, len(cut_e)
growth = lambda e: 0.55 + 0.45 * e / 80          # the whole piece crescendos gently

# bars 1-2: quarter-note arpeggio, bass and a tick on each half-bar cut
for e, m, acc in ((0, 'D4', 1), (2, 'A4', 0), (4, 'F4', 1), (6, 'A4', 0), (8, 'D4', 1), (10, 'F4', 0), (12, 'D5', 1), (14, 'F4', 0)):
    put(marimba(p(m)), et(e), 0.30 if acc else 0.2, -0.2)
put(marimba(p('A3'), 2), et(0), 0.16, 0.3)
put(marimba(p('Bb3'), 2), et(8), 0.16, 0.3)
for e, m in ((0, D2), (4, A1), (8, Bb1), (12, F2)):
    put(pluck(m), et(e), 0.5)
    put(woodblock(), et(e), 0.10, 0.35)
for e in range(9, 16, 2):
    put(shaker(), et(e), 0.03, 0.4)

# bars 3-5: eighth ostinato accented 3+3+2, bass and woodblock on the accents
bars35 = [('D4 F4 A4 D5 A4 F4 C5 A4', (D2, D3, A1)),
          ('Bb3 D4 F4 Bb4 F4 D4 A4 F4', (Bb1, Bb2, F2)),
          ('C4 E4 G4 C5 G4 E4 Bb4 G4', (C2, C3, G1))]
for k, (line, bass) in enumerate(bars35):
    e0 = 16 + 8 * k
    for i, m in enumerate(line.split()):
        acc = i in (0, 3, 6)
        put(marimba(p(m), 1.2), et(e0 + i), (0.30 if acc else 0.17) * growth(e0 + i), -0.25 if i % 2 else 0.1)
        put(shaker(), et(e0 + i), 0.035 if acc else 0.025, 0.45)
    for i, b in zip((0, 3, 6), bass):
        put(pluck(b, 1.0), et(e0 + i), 0.5)
        put(woodblock(1180 if i == 0 else 1320), et(e0 + i), 0.12 * growth(e0 + i), 0.35)
    put(kick(), et(e0), 0.35)

# bars 6-8: sixteenth ostinato, a beat on every cut
bars68 = [('D5 A4 F4 A4', (D2, D2, F2, A2), 'F3 A3 D4'),
          ('D5 Bb4 F4 Bb4', (Bb1, Bb1, D2, F2), 'F3 Bb3 D4'),
          ('E5 C5 G4 C5', (C2, C2, E2, G2), 'G3 C4 E4')]
for k, (cell, bass, chord) in enumerate(bars68):
    e0 = 40 + 8 * k
    for beat in range(4):
        e = e0 + 2 * beat
        for s, m in enumerate(cell.split()):
            put(marimba(p(m), 0.9), et(e + s / 2), (0.24 if s == 0 else 0.14) * growth(e), -0.3 if s % 2 else 0.15)
        put(pluck(bass[beat], 0.8), et(e), 0.48)
        put(kick(), et(e), 0.32)
        put(woodblock(1250), et(e), 0.10 * growth(e), 0.35)
        put(shaker(), et(e + 1), 0.04, 0.45)
    for m in chord.split():
        put(marimba(p(m), 2), et(e0), 0.12, 0.35)

# bars 9-10: a glock note on every eighth (every cut), sixteenths underneath, bass in eighths
glock9 = 'D5 F5 G5 Bb5 A5 G5 E5 C#5'.split()
glock10 = 'A4 C#5 E5 G5 A5 C#6 E6 G6'.split()
cell9 = ['G4 Bb4 D5 Bb4'] * 2 + ['G4 Bb4 D5 Bb4'] * 2 + ['A4 C#5 E5 C#5'] * 4
cell10 = ['A4 C#5 E5 G5'] * 8
bass9 = [G1, G2, G1, G2, A1, A2, A1, A2]
bass10 = [A1, A2, A1, A2, A1, A2, A1, E2]
for k, (gl, cells, bass) in enumerate(((glock9, cell9, bass9), (glock10, cell10, bass10))):
    e0 = 64 + 8 * k
    for i in range(8):
        e = e0 + i
        put(glock(p(gl[i]), 1.0), et(e), 0.16 * growth(e), 0.25 if i % 2 else -0.25)
        a, b = cells[i].split()[i % 2 * 2: i % 2 * 2 + 2]
        put(marimba(p(a), 0.6), et(e), 0.2 * growth(e), -0.3)
        put(marimba(p(b), 0.6), et(e + 0.5), 0.13 * growth(e), 0.2)
        put(pluck(bass[i], 0.5, 0.993), et(e), 0.42)
        put(shaker(0.06, 0.02), et(e), 0.045, 0.45)
        put(shaker(0.05, 0.015), et(e + 0.5), 0.03, 0.45)
        if i % 2 == 0:
            put(kick(), et(e), 0.34)
        put(woodblock(1320 if i % 2 else 1180), et(e), 0.07 * growth(e), 0.35)

# bar 11: the final chord on the downbeat, a short marimba roll that dies away
tf = et(80)
put(pluck(D2, 2.2, 0.998), tf, 0.6)
put(marimba(p('D3'), 2.4), tf, 0.35)
for m in 'D4 F4 A4 D5 E5'.split():
    put(marimba(p(m), 2.4), tf, 0.2, rng.uniform(-0.4, 0.4))
put(glock(p('D6'), 2.4), tf, 0.25, 0.1)
put(glock(p('A5'), 2.4), tf, 0.12, -0.2)
put(kick(), tf, 0.4)
roll_t = tf + 0.09
k = 0
while roll_t < tf + 1.15:
    put(marimba(p('A4' if k % 2 else 'D5'), 0.5, 0.6), roll_t, 0.07 * (1 - (roll_t - tf) / 1.2), -0.2 if k % 2 else 0.2)
    roll_t += 0.075
    k += 1

# ---------------------------------------------------------------- room, level, files
def reverb(x, secs=1.3, wet=0.16):
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = np.empty_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (secs / 5))
        ir = np.convolve(ir, np.ones(6) / 6, 'same')         # darker tail
        ir[: int(0.012 * SR)] = 0                           # small pre-delay
        L = len(x[ch]) + n
        F = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[ch], F) * np.fft.rfft(ir, F), F)[: len(x[ch])]
        out[ch] = x[ch] + wet * y / np.abs(ir).sum() * 140
    return out


mix = reverb(mix)
end = int(DUR * SR)
mix = mix[:, :end]
fade = int(0.45 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix /= np.abs(mix).max() / 0.7              # headroom for the AAC encode
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
wav = os.path.join(ROOT, 'audio', 'music.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
os.system(f'ffmpeg -v error -y -i "{wav}" -c:a libmp3lame -b:a 192k "{os.path.join(ROOT, "audio", "music.mp3")}"')

cuts = [round(et(e), 4) for e in cut_e] + [round(DUR, 4)]
beats = {
    'tempo': [T0, T1], 'cuts': cuts, 'eighths': cut_e,
    'tempoAtCut': [round(tempo_at(e), 1) for e in cut_e],
}
with open(os.path.join(ROOT, 'js', 'beats.js'), 'w') as f:
    f.write('// Written by tools/music.py: the cut times (seconds) are the attacks of real notes in\n')
    f.write('// audio/music.mp3, one per tile plus the end. Tempo rises 84 -> 138 bpm.\n')
    f.write('window.BEATS = ' + json.dumps(beats) + ';\n')
holds = np.diff(cuts)
print(f'{DUR:.2f} s, {len(cut_e)} tiles')
print('holds:', ' '.join(f'{h:.2f}' for h in holds))
