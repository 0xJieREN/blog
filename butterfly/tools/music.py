"""The music for "butterfly": marimba, pizzicato and bowed strings, woodblocks, written to the cut list.

    python3 tools/music.py            # writes audio/music.wav, audio/music.mp3, js/beats.js

Built the way the score of Claude.mp4 is built. Its tempo hardly moves: from the first big
downbeat it sits near 160 bpm, notes 0.09 s apart (sixteenths). What speeds up is everything
else: the notes get shorter (whole bars, then eighths, then sixteenths), layers pile up, it gets
louder and brighter, a low note swells into the first big downbeat, and at the top everything
stops dead before one last hit. So here the tempo is fixed at 160 bpm and the butterflies, not
the clock, get faster:

  bars 1-4    tiles 1-4     a bar each (1.50 s)   held chord, a few marimba notes, ticks; the bass swells
  bars 5-9    tiles 5-14    half a bar (0.75 s)   the launch: marimba eighths, pizzicato bass and violins
  bars 10-14  tiles 15-28   3+3+2 then 2 eighths  sixteenths everywhere, woodblocks on every cut
  bars 14-15  tiles 29-41   an eighth (0.19 s)    every eighth a cut, repeated notes blur, the peak
  last eighth               the breath: everything stops but one woodblock
  bar 16      tile 42       D major, held 1.75 s

Every cut has an accent on it. Under it all runs the harmony the first version lacked: a bowed
string chord that changes every bar (D dorian: Dm9 Bbmaj7 Gm9 C69 ... A7, ending on D major) and
a bass line, double-bass pizzicato on the cuts over a bowed bass that holds each root.
Everything is synthesised here (additive marimba, Karplus-Strong plucks, sawtooth string
ensemble, modal woodblocks), so the piece is ours and needs no licence.
"""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- the cut list and the clock
BPM, TAIL = 160.0, 1.75
EIGHTH = 30 / BPM
CELLS = [8] * 4 + [4] * 10 + [3, 3, 2] * 3 + [3, 2, 2, 2, 2] + [1] * 13   # eighths per tile, tiles 1-41
E = sum(CELLS)                                                            # 120 eighths = 15 bars
starts = np.concatenate([[0], np.cumsum(CELLS)]).astype(int)              # cut of each tile, incl. the final
LAP2, LAP3 = starts[14], starts[28]
et = lambda e: e * EIGHTH
DUR = et(E) + TAIL
N = int(DUR * SR) + SR
BUSES = {k: np.zeros((2, N)) for k in ('dry', 'strings', 'bass')}
NAMES = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}


def p(s):
    return 12 * (int(s[-1]) + 1) + NAMES[s[:-1]]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def put(sig, t, gain=1.0, pan=0.0, bus='dry'):
    i = int(round(t * SR))
    n = min(len(sig), N - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    BUSES[bus][0, i:i + n] += sig[:n] * gain * l * 1.41
    BUSES[bus][1, i:i + n] += sig[:n] * gain * r * 1.41


def attack(n, a):
    e = np.ones(n)
    k = max(1, int(a * SR))
    e[:k] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, k))
    return e


# ---------------------------------------------------------------- instruments
def marimba(m, dur=1.6, bright=1.0):
    """bar partials 1 : 3.93 : 9.2, the overtones dying much faster; a soft mallet thump."""
    f = hz(m)
    t = np.arange(int(dur * SR)) / SR
    tau = np.clip(0.6 * (440 / f) ** 0.65, 0.14, 1.2)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    s += 0.28 * bright * np.sin(2 * np.pi * f * 3.93 * t + 0.3) * np.exp(-t / (tau * 0.25))
    s += 0.06 * bright * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / (tau * 0.09))
    thump = np.convolve(rng.standard_normal(len(t)) * np.exp(-t / 0.002), np.ones(9) / 9, 'same') * 0.35 * bright
    return (s + thump) * attack(len(t), 0.0012)


def ks(f, dur, tau, bright=0.5, pos=0.2, excite=None):
    """Karplus-Strong string. tau: decay time (s); bright: 0 dark .. 1 bright loop filter; pos: pluck position."""
    P = max(2, int(round(SR / f)))
    n = int(dur * SR)
    ex = excite if excite is not None else rng.uniform(-1, 1, P + 1)
    ex = np.resize(ex, P + 1)
    ex = ex - ex.mean()
    d = int(pos * P)
    if d > 0:
        ex = ex - np.concatenate([np.zeros(d), ex[:-d]])
    buf = np.zeros(n + P + 1)
    buf[:P + 1] = ex
    damp = np.exp(-P / (SR * tau))
    a, b = 0.5 + 0.5 * bright, 0.5 - 0.5 * bright
    i = P + 1
    while i < n + P + 1:
        j = min(i + P, n + P + 1)
        buf[i:j] = damp * (a * buf[i - P:j - P] + b * buf[i - P - 1:j - P - 1])
        i = j
    return buf[P + 1:n + P + 1]


def resonator_ir(freqs, qs, gains, n=2048):
    """a few parallel two-pole resonators: a string instrument's wooden body."""
    out = np.zeros(n)
    t = np.arange(n) / SR
    for f, q, g in zip(freqs, qs, gains):
        out += g * np.exp(-np.pi * f / q * t) * np.sin(2 * np.pi * f * t)
    out[0] += 1.0
    return out / np.abs(out).sum() * 6


VIOLIN_BODY = resonator_ir([290, 470, 1100, 2700], [12, 14, 9, 6], [1, 0.8, 0.7, 0.35])
BASS_BODY = resonator_ir([70, 140, 260, 600], [8, 10, 10, 6], [1, 0.9, 0.6, 0.3])


def pizz(m, low=False):
    """pizzicato: a soft fleshy pluck through a wooden body; low = double bass, with a sine for weight."""
    f = hz(m)
    tau = 0.7 if low else np.clip(0.32 * (440 / f) ** 0.4, 0.14, 0.5)
    ex = np.convolve(rng.uniform(-1, 1, int(SR / f) + 1), np.ones(4) / 4, 'same')
    s = ks(f, tau * 3, tau, bright=0.12 if low else 0.18, pos=0.13, excite=ex)
    s = np.convolve(s, BASS_BODY if low else VIOLIN_BODY)[:len(s)]
    s = s / (np.abs(s).max() + 1e-9)
    if low:
        t = np.arange(len(s)) / SR
        s = 0.7 * s + 0.45 * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    return s * attack(len(s), 0.004)


def harpsichord(m, hold=0.35):
    """bright plucked string (8' + a quiet 4'), damped when the key is released."""
    f = hz(m)
    n = int((hold + 0.25) * SR)
    s = ks(f, n / SR, 1.6, bright=0.9, pos=0.08)[:n] + 0.35 * ks(2 * f, n / SR, 1.1, bright=0.9, pos=0.08)[:n]
    n = len(s)
    rel = np.ones(n)
    k = int(hold * SR)
    rel[k:] = np.exp(-np.arange(n - k) / (0.05 * SR))
    s = s * rel * attack(n, 0.0008)
    return s / (np.abs(s).max() + 1e-9)


def woodblock(f=900, dur=0.14):
    """temple / wood block: two inharmonic modes and a click, very short."""
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.035) + 0.45 * np.sin(2 * np.pi * f * 2.37 * t) * np.exp(-t / 0.014)
    s += 0.25 * np.sin(2 * np.pi * f * 4.1 * t) * np.exp(-t / 0.006)
    s += np.convolve(rng.standard_normal(len(t)) * np.exp(-t / 0.0015), np.ones(3) / 3, 'same') * 0.4
    return s * attack(len(t), 0.0004)


def bowed(m, dur, att=0.25, rel=0.35, swell=0.0):
    """one bowed string voice: three slightly detuned sawtooths with a slow vibrato; the bus is filtered dark.
    swell > 0 makes the note grow towards its end (a crescendo on one note)."""
    f = hz(m)
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0025 * np.sin(2 * np.pi * (4.8 + rng.uniform(-0.4, 0.4)) * t + rng.uniform(0, 6))
    s = np.zeros(n)
    for cents in (-7, 0, 6):
        ph = np.cumsum(f * 2 ** (cents / 1200) * vib) / SR + rng.uniform()
        s += 2 * (ph % 1) - 1
    env = np.clip(t / att, 0, 1) ** 1.5
    k = int(dur * SR)
    env[k:] *= np.exp(-(t[k:] - dur) / (rel / 3))
    if swell:
        env *= (1 + swell * (t / dur) ** 2) / (1 + swell)
    return s / 3 * env


def lowpass(x, cut, slope=4):
    """gentle FFT low-pass on a whole bus (both channels)."""
    F = np.fft.rfft(x, axis=1)
    f = np.fft.rfftfreq(x.shape[1], 1 / SR)
    return np.fft.irfft(F / np.sqrt(1 + (f / cut) ** (2 * slope)), x.shape[1], axis=1)


def highpass(x, cut):
    F = np.fft.rfft(x, axis=1)
    f = np.fft.rfftfreq(x.shape[1], 1 / SR)
    return np.fft.irfft(F * (f / cut) ** 2 / (1 + (f / cut) ** 2), x.shape[1], axis=1)


# ---------------------------------------------------------------- harmony: one chord a bar
# (bass root, string voicing, marimba chord tones). D dorian, resolving to D major at the end.
CH = {
    'Dm9': ('D2', 'F3 A3 C4 E4', 'D4 F4 A4 C5 E5'),
    'Bbmaj7': ('Bb1', 'F3 A3 Bb3 D4', 'D4 F4 A4 Bb4 D5'),
    'Gm9': ('G1', 'Bb3 D4 F4 A4', 'D4 F4 G4 Bb4 D5'),
    'C69': ('C2', 'E3 G3 A3 D4', 'E4 G4 A4 C5 D5'),
    'C': ('C2', 'E3 G3 C4 E4', 'E4 G4 C5 D5 E5'),
    'Asus': ('A1', 'E3 A3 D4 E4', 'D4 E4 A4 B4 D5'),
    'A7': ('A1', 'E3 G3 C#4 E4', 'C#4 E4 G4 A4 C#5'),
    'Fmaj7': ('F1', 'F3 A3 C4 E4', 'C4 E4 F4 A4 C5'),
    'D': ('D2', 'D3 F#3 A3 E4', 'D4 F#4 A4 D5 E5'),
}
# half-bar slots (two per bar), bars 1-16
SLOTS = (['Dm9'] * 4 + ['Bbmaj7'] * 2 + ['C69'] * 2 +                  # bars 1-4, the opening
         ['Dm9'] * 2 + ['Bbmaj7'] * 2 + ['Gm9'] * 2 + ['C69'] * 2 + ['Asus', 'A7'] +   # bars 5-9, lap 1
         ['Dm9'] * 2 + ['Bbmaj7'] * 2 + ['Gm9'] * 2 + ['C'] * 2 + ['Fmaj7', 'Bbmaj7'] +  # bars 10-14, lap 2
         ['Asus', 'A7'] + ['D'] * 2)                                     # bar 15 the peak, bar 16 the end
chord = lambda e: CH[SLOTS[min(int(e) // 4, len(SLOTS) - 1)]]
mar = lambda ch, k, o=0: [p(n) for n in ch[2].split()][k % 5] + 12 * (k // 5 + o)
CONTOUR = [0, 2, 1, 3, 2, 4, 3, 1]          # the repeating marimba figure, as indices into the chord
tile_of = lambda e: int(np.searchsorted(starts, e, side='right') - 1)
loud = lambda e: 0.75 + 0.25 * min(e, E) / E               # a little more weight as it goes; the dynamics are in DYNAMICS

# ---------------------------------------------------------------- strings and bass: the harmony
for slot in range(0, len(SLOTS) - 2):
    name = SLOTS[slot]
    if slot and SLOTS[slot - 1] == name:
        continue                                       # a chord held over two halves is one bow
    span = 1
    while slot + span < len(SLOTS) - 2 and SLOTS[slot + span] == name:
        span += 1
    e0, e1 = slot * 4, min((slot + span) * 4, E - 1)    # the strings stop for the breath before the end
    ch, d = CH[name], et(e1 - e0)
    g = loud(e0)
    for k, m in enumerate(ch[1].split()):
        put(bowed(p(m), d, att=0.35 if e0 < 32 else 0.12, rel=0.25), et(e0), 0.08 * g * (1.25 if e0 >= 32 else 0.8), (-0.5, -0.2, 0.2, 0.5)[k], 'strings')
    # bowed bass under it; in bars 2-4 one low D that swells into the launch at bar 5
    if e0 == 0:
        put(bowed(p('D2'), et(8), att=0.6, rel=0.1), 0, 0.12, 0, 'bass')
        put(bowed(p('D2'), et(24), att=0.4, rel=0.05, swell=3.5), et(8), 0.16, 0, 'bass')
        continue
    if e0 < 32:
        continue
    put(bowed(p(ch[0]), d, att=0.08, rel=0.2), et(e0), 0.12, 0, 'bass')
    put(bowed(p(ch[0]) + 12, d, att=0.08, rel=0.2), et(e0), 0.06 * g, 0.1, 'bass')

# ---------------------------------------------------------------- the eighth-note grid
for e in range(E - 1):                                    # the last eighth is the breath, below
    tile = tile_of(e)
    cut = starts[tile] == e
    ch, t, g = chord(e), et(e), loud(e)
    root = p(ch[0])
    bar, pos8 = divmod(e, 8)
    s16 = EIGHTH / 2

    # bars 1-4: a held chord plucked on each downbeat (harpsichord spread + pizzicato), a few marimba
    # notes with air between them, high ticks on the beats (the clicks in Claude.mp4's opening)
    if e < 32:
        if pos8 == 0:
            for k, m in enumerate(ch[2].split()[:4]):
                put(harpsichord(p(m), 0.9), t + k * 0.022, 0.06, -0.45)
                put(pizz(p(m)), t + k * 0.022, 0.1, 0.45)
            put(pizz(root, low=True), t, 0.55)
            put(marimba(mar(ch, 0) - 12, 1.8), t, 0.22, -0.2)
        if pos8 in (3, 4, 6) or (bar >= 2 and pos8 == 7):
            put(marimba(mar(ch, CONTOUR[e % 8]), 1.3), t, 0.18, -0.25)
        if pos8 % 2 == 0:
            put(woodblock(2400, 0.05), t, 0.035 + 0.01 * bar, 0.6)
        continue

    # from bar 5: marimba 1 plays the figure in eighths, the cut accented and doubled an octave down
    m = mar(ch, CONTOUR[e % 8])
    put(marimba(m, 1.2), t, (0.3 if cut else 0.17) * g, -0.25)
    if cut:
        put(marimba(m - 12, 1.4), t, 0.16 * g, -0.1)

    # double bass pizzicato: on every cut in lap 1, plus walking eighths in laps 2 and 3
    if e < LAP2:
        if cut:
            put(pizz(root if (e // 4) % 2 == 0 else root + 7, low=True), t, 0.55)
    else:
        walk = [0, 12, 7, 12][e % 4] if e >= LAP3 else [0, 0, 7, 12][e % 4]
        put(pizz(root + walk, low=True), t, (0.5 if cut else 0.32) * (0.8 + 0.2 * g))

    # violins pizzicato on the off-beats in lap 1, on every eighth after
    if e < LAP2:
        if pos8 % 2 == 1:
            put(pizz(mar(ch, 3 + (e // 2) % 3, 1)), t, 0.13 * g, 0.5)
    else:
        put(pizz(mar(ch, 2 + e % 3, 1)), t, 0.12 * g, 0.5)

    # marimba 2: sixteenths from bar 7 (a sixteenth behind marimba 1, Reich-style), in lap 3
    # repeated sixteenths on one note: the 0.09 s pulse that blurs into a shimmer
    if 48 <= e < LAP3:
        put(marimba(mar(ch, CONTOUR[(e + 3) % 8] + 1), 0.8, 0.7), t + s16, 0.11 * g, 0.35)
        if e >= LAP2:
            put(marimba(mar(ch, CONTOUR[(e + 5) % 8] + 2), 0.7, 0.6), t, 0.07 * g, 0.4)
    if e >= LAP3:
        top = mar(ch, 4)
        for s in range(2):
            put(marimba(top if s == 0 else top - 5, 0.6, 0.6), t + s * s16, 0.13 * g, 0.4)

    # woodblocks: from bar 5 on the cuts; lap 2 adds the sixteenth ghosts; lap 3 every eighth
    if cut:
        put(woodblock(1020 if tile % 2 else 760), t, (0.12 if e < LAP2 else 0.2) * g, 0.3)
    elif e >= LAP3:
        put(woodblock(1020 if e % 2 else 760), t, 0.16 * g, 0.3)
    if e >= LAP2:
        put(woodblock(1350, 0.07), t + s16, 0.05 * g, 0.35)

    # harpsichord: a light thread through lap 2, the top of the figure on each cut
    if LAP2 <= e < LAP3 and cut:
        put(harpsichord(mar(ch, CONTOUR[e % 8], 1), 0.3), t, 0.08, -0.5)

# the breath: the last butterfly before the end gets one dry block and nothing else
put(woodblock(1350), et(E - 1), 0.25, 0.3)

# the final chord on the downbeat: D major. Low pizz an octave apart, the strings and bowed bass
# return, a marimba chord and a soft roll that dies away, a quick harpsichord spread.
tf = et(E)
put(pizz(p('D2'), low=True), tf, 0.75)
put(pizz(p('D1') + 12, low=True), tf, 0.4)
for k, m in enumerate('D3 F#3 A3 E4 F#4'.split()):
    put(bowed(p(m), TAIL - 0.5, att=0.03, rel=0.9), tf, 0.1, (-0.5, -0.2, 0, 0.2, 0.5)[k], 'strings')
put(bowed(p('D2'), TAIL - 0.5, att=0.03, rel=0.9), tf, 0.2, 0, 'bass')
for m in ['D3', 'A3', 'F#4', 'A4', 'D5', 'E5']:
    put(marimba(p(m), 2.4), tf, 0.2, rng.uniform(-0.4, 0.4))
for k, m in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5']):
    put(harpsichord(p(m), 1.2), tf + k * 0.018, 0.08, -0.5)
put(woodblock(760), tf, 0.22, 0.3)
rt, k = tf + 0.1, 0
while rt < tf + 1.2:
    put(marimba(p('A4') if k % 2 else p('D5'), 0.5, 0.5), rt, 0.07 * (1 - (rt - tf) / 1.25), 0.25 if k % 2 else -0.25)
    rt += 0.07
    k += 1


# ---------------------------------------------------------------- buses, room, level, files
def reverb(x, secs=1.6, wet=0.22):
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = np.empty_like(x)
    for c in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / (secs / 5))
        ir = np.convolve(ir, np.ones(5) / 5, 'same')
        ir[: int(0.015 * SR)] = 0
        L = len(x[c]) + n
        F = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[c], F) * np.fft.rfft(ir, F), F)[: len(x[c])]
        out[c] = x[c] + wet * y / np.sqrt((ir ** 2).sum())
    return out


strings = highpass(lowpass(BUSES['strings'], 2300, 3), 140)      # a warm section, no fizz, no mud
bass = lowpass(BUSES['bass'], 650, 3)

# The conductor: one dynamic curve over everything (dB at eighth-note marks). Quiet opening,
# a step up at the launch (bar 5), a long crescendo through laps 1 and 2, the peak in lap 3,
# the final chord just under the peak. About 14 dB from the first bar to the top, like Claude.mp4.
DYNAMICS = [(0, -9.5), (31.5, -8.5), (32, -5.5), (LAP2 - 0.5, -4), (LAP2, -3), (LAP3, -1.5), (E - 1, 0.5), (E, -0.5), (E + 20, -0.5)]
tt = np.arange(N) / SR
ee, dd = zip(*DYNAMICS)
master = 10 ** (np.interp(tt / EIGHTH, ee, dd) / 20)
mix = reverb((BUSES['dry'] + strings + bass) * master)
end = int(DUR * SR)
mix = mix[:, :end]
fade = int(0.5 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix /= np.abs(mix).max() / 0.7                 # headroom for the AAC encode
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
wav = os.path.join(ROOT, 'audio', 'music.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
os.system(f'ffmpeg -v error -y -i "{wav}" -c:a libmp3lame -b:a 192k "{os.path.join(ROOT, "audio", "music.mp3")}"')

cuts = [round(et(int(s)), 4) for s in starts] + [round(DUR, 4)]
with open(os.path.join(ROOT, 'js', 'beats.js'), 'w') as f:
    f.write('// Written by tools/music.py: the cut times (seconds) are the attacks of real notes in\n')
    f.write('// audio/music.mp3, one per tile plus the end. Steady 160 bpm; the cells get shorter.\n')
    f.write('window.BEATS = ' + json.dumps({'tempo': BPM, 'cells': CELLS, 'cuts': cuts}) + ';\n')
print(f'{DUR:.2f} s, {len(starts)} tiles, laps start at {cuts[0]:.2f} / {cuts[14]:.2f} / {cuts[28]:.2f} s, final at {cuts[41]:.2f} s')
print('holds:', ' '.join(f'{h:.2f}' for h in np.diff(cuts)))
