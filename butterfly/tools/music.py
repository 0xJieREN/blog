"""The music for "butterfly": marimba, pizzicato strings and woodblocks, written to the cut list.

    python3 tools/music.py            # writes audio/music.wav, audio/music.mp3, js/beats.js

Shape, taken from the score of Claude.mp4: a few sparse plucked notes with air between them,
then repeated notes that come faster and faster until they blur into a shimmer, a crescendo,
an abrupt cut-off, one last hit that rings. Minimal and repetitive (Reich-like), never epic,
no drums and no drop.

Every butterfly is one musical cell. Each cell starts with an accent (the cut) and its length
in eighth notes is the time the butterfly stays on screen:
  lap 1  (tiles 1-14)   cells of 4, then 3 eighths    marimba alone, then pizzicato joins
  lap 2  (tiles 15-28)  cells of 2 eighths            woodblocks on every cut, a second marimba
  lap 3  (tiles 29-41)  cells of 1 eighth             every eighth a cut; sixteenth repeated notes blur
  tile 42               the final chord, held 1.75 s
The pulse itself accelerates the whole time, 80 -> 160 bpm (quarter note), exponentially, so the
cells shrink twice over: shorter in notes and shorter in time. The three laps follow one chord
cycle each, the way the butterflies follow one trip round the colour wheel each.
Everything is synthesised here (additive marimba, Karplus-Strong strings and harpsichord, modal
woodblocks), so the piece is ours and needs no licence.
"""
import json, os, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- the cut list and the clock
CELLS = [4] * 5 + [3] * 9 + [2] * 14 + [1] * 13          # eighths per tile, tiles 1-41
E = sum(CELLS)                                           # tile 42 (final chord) starts here
T0, T1, TAIL = 80.0, 160.0, 1.75


def et(e):
    """seconds at eighth e: quarter tempo T(e) = T0 * (T1/T0)**(e/E), integrated."""
    k = np.log(T1 / T0) / E
    return 30 / T0 * (1 - np.exp(-k * e)) / k


def tempo(e):
    return T0 * (T1 / T0) ** (e / E)


starts = np.concatenate([[0], np.cumsum(CELLS)]).astype(int)   # eighth index of each cut, incl. final
DUR = et(E) + TAIL
N = int(DUR * SR) + SR
mix = np.zeros((2, N))
NAMES = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}


def p(s):
    return 12 * (int(s[-1]) + 1) + NAMES[s[:-1]]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def put(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    n = min(len(sig), N - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[0, i:i + n] += sig[:n] * gain * l * 1.41
    mix[1, i:i + n] += sig[:n] * gain * r * 1.41


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
    thump = rng.standard_normal(len(t)) * np.exp(-t / 0.002)
    thump = np.convolve(thump, np.ones(9) / 9, 'same') * 0.35 * bright
    return (s + thump) * attack(len(t), 0.0012)


def ks(f, dur, tau, bright=0.5, pos=0.2, excite=None):
    """Karplus-Strong string. tau: decay time (s); bright: 0 dark .. 1 bright loop filter; pos: pluck position."""
    P = max(2, int(round(SR / f)))
    n = int(dur * SR)
    ex = excite if excite is not None else rng.uniform(-1, 1, P + 1)
    ex = np.resize(ex, P + 1)
    ex = ex - ex.mean()
    d = int(pos * P)                                   # pluck position comb
    if d > 0:
        ex = ex - np.concatenate([np.zeros(d), ex[:-d]])
    buf = np.zeros(n + P + 1)
    buf[:P + 1] = ex[:P + 1]
    damp = np.exp(-P / (SR * tau))
    a, b = 0.5 + 0.5 * bright, 0.5 - 0.5 * bright
    i = P + 1
    while i < n + P + 1:
        j = min(i + P, n + P + 1)
        buf[i:j] = damp * (a * buf[i - P:j - P] + b * buf[i - P - 1:j - P - 1])
        i = j
    return buf[P + 1:n + P + 1]


def resonator_ir(freqs, qs, gains, n=2048):
    """impulse response of a few parallel two-pole resonators: a string instrument's wooden body."""
    out = np.zeros(n)
    t = np.arange(n) / SR
    for f, q, g in zip(freqs, qs, gains):
        bw = f / q
        out += g * np.exp(-np.pi * bw * t) * np.sin(2 * np.pi * f * t)
    out[0] += 1.0
    return out / np.abs(out).sum() * 6


VIOLIN_BODY = resonator_ir([290, 470, 1100, 2700], [12, 14, 9, 6], [1, 0.8, 0.7, 0.35])
CELLO_BODY = resonator_ir([110, 205, 380, 900], [10, 12, 10, 6], [1, 0.9, 0.6, 0.3])


def pizz(m, low=False):
    """pizzicato: a soft fleshy pluck, short decay, through a wooden body."""
    f = hz(m)
    tau = 0.55 if low else np.clip(0.32 * (440 / f) ** 0.4, 0.14, 0.5)
    ex = np.convolve(rng.uniform(-1, 1, int(SR / f) + 1), np.ones(4) / 4, 'same')   # finger, not plectrum
    s = ks(f, tau * 3.2, tau, bright=0.15, pos=0.13, excite=ex)
    s = np.convolve(s, CELLO_BODY if low else VIOLIN_BODY)[:len(s)]
    s *= attack(len(s), 0.004)
    return s / (np.abs(s).max() + 1e-9)


def harpsichord(m, hold=0.35):
    """bright plucked string (8' + a quiet 4'), damped when the key is released."""
    f = hz(m)
    n = int((hold + 0.25) * SR)
    s = ks(f, n / SR, 1.6, bright=0.9, pos=0.08) + 0.35 * ks(2 * f, n / SR, 1.1, bright=0.9, pos=0.08)
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


# ---------------------------------------------------------------- harmony: one chord per tile, one cycle per lap
# D dorian colours; each lap: Dm9 Dm9 Bbmaj7 Bbmaj7 C6/9 C6/9 Am7 Am7 Bbmaj7 Bbmaj7 C C Asus A
CHORDS = {
    'Dm9': ('D2', 'D4 F4 A4 C5 E5'), 'Bbmaj7': ('Bb1', 'D4 F4 A4 Bb4 D5'), 'C69': ('C2', 'E4 G4 A4 C5 D5'),
    'Am7': ('A1', 'E4 G4 A4 C5 E5'), 'C': ('C2', 'E4 G4 C5 D5 E5'), 'Asus': ('A1', 'D4 E4 A4 B4 D5'), 'A': ('A1', 'C#4 E4 A4 B4 C#5'),
}
CYCLE = ['Dm9', 'Dm9', 'Bbmaj7', 'Bbmaj7', 'C69', 'C69', 'Am7', 'Am7', 'Bbmaj7', 'Bbmaj7', 'C', 'C', 'Asus', 'A']
tile_chord = [CYCLE[i % 14] for i in range(41)]
CONTOUR = [0, 2, 1, 3, 2, 4, 3, 1]          # the repeating marimba figure, as indices into the chord


def chord_at(e):
    i = int(np.searchsorted(starts, e, side='right') - 1)
    return CHORDS[tile_chord[min(i, 40)]], i


def tone(ch, k, octave=0):
    notes = [p(n) for n in ch[1].split()]
    return notes[k % len(notes)] + 12 * (k // len(notes) + octave)


growth = lambda e: 0.5 + 0.5 * (e / E) ** 1.3            # one long crescendo

# ---------------------------------------------------------------- the score
for e in range(E - 1):                    # the last eighth is the breath, written below
    ch, tile = chord_at(e)
    pos = e - starts[tile]                                # position inside this butterfly's cell
    cut = pos == 0
    lap = 0 if tile < 14 else 1 if tile < 28 else 2
    t, h = et(e), et(e + 1) - et(e)                       # this eighth and its length
    g = growth(e)
    bass = p(ch[0])

    # marimba 1: the figure. Tiles 1-5 only on the cut and a quarter later (air between notes);
    # from tile 6 every eighth. The cut is accented and doubled an octave down.
    if tile >= 5 or pos in (0, 2):
        m = tone(ch, CONTOUR[e % 8])
        put(marimba(m, 1.3), t, (0.34 if cut else 0.2) * g, -0.25)
        if cut:
            put(marimba(m - 12, 1.6), t, 0.2 * g, -0.1)

    # pizzicato joins at tile 6: cello / bass on every cut, violins answering on the off-beats
    if tile >= 5:
        if cut:
            put(pizz(bass + (12 if lap == 2 and tile % 2 else 0), low=True), t, 0.5 * (0.7 + 0.3 * g), 0.05)
        elif lap == 0 and pos == 2:
            put(pizz(tone(ch, 3, 1)), t, 0.16 * g, 0.45)
    if lap == 1:                                          # violins on the and of every cell
        put(pizz(tone(ch, 4 + (tile % 2), 1)), t + h / 2, 0.15 * g, 0.5)
    if lap == 2:                                          # violins on every eighth
        put(pizz(tone(ch, 2 + e % 3, 1)), t, 0.14 * g, 0.5)

    # woodblocks: from lap 2 on every cut, two blocks alternating; lap 3 adds the sixteenth ghost
    if lap >= 1 and cut:
        put(woodblock(1020 if tile % 2 else 760), t, 0.2 * g, 0.3)
    if lap == 2:
        put(woodblock(1350, 0.08), t + h / 2, 0.06 * g, 0.35)

    # marimba 2 (from lap 2): the same figure a sixteenth late, then in lap 3 repeated sixteenths
    # on one note: the accelerating repeated notes that blur into a shimmer
    if lap == 1:
        put(marimba(tone(ch, CONTOUR[(e + 3) % 8] + 1), 0.9, 0.7), t + h / 2, 0.11 * g, 0.35)
    if lap == 2:
        top = tone(ch, 4)
        for s in range(2):
            put(marimba(top if s == 0 else top - 5, 0.6, 0.6), t + s * h / 2, 0.12 * g, 0.4)

    # harpsichord: a light thread of old-book colour, lap 2 only, the top of the figure on each cut
    if lap == 1 and cut:
        put(harpsichord(tone(ch, CONTOUR[e % 8], 1), h * 0.9), t, 0.09, -0.5)

# the last butterfly before the end: everything stops but one dry block and a pluck (the breath)
e_last = E - 1
put(woodblock(1350), et(e_last), 0.22, 0.3)
put(pizz(p('A2'), low=True), et(e_last), 0.35)

# the final chord on the downbeat: D major (a bright Picardy third after all that D minor),
# low pizz, marimba chord and a soft roll that dies away, a quick harpsichord spread
tf = et(E)
put(pizz(p('D2'), low=True), tf, 0.7)
put(pizz(p('D3'), low=True), tf, 0.4)
for m in ['D3', 'A3', 'F#4', 'A4', 'D5', 'E5']:
    put(marimba(p(m), 2.4), tf, 0.22, rng.uniform(-0.4, 0.4))
for k, m in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5']):
    put(harpsichord(p(m), 1.2), tf + k * 0.018, 0.08, -0.5)
put(woodblock(760), tf, 0.22, 0.3)
rt, k = tf + 0.1, 0
while rt < tf + 1.2:
    put(marimba(p('A4') if k % 2 else p('D5'), 0.5, 0.5), rt, 0.08 * (1 - (rt - tf) / 1.25), 0.25 if k % 2 else -0.25)
    rt += 0.07
    k += 1


# ---------------------------------------------------------------- room, level, files
def reverb(x, secs=1.4, wet=0.2):
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


mix = reverb(mix)
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
    f.write('// audio/music.mp3, one per tile plus the end. Tempo rises 80 -> 160 bpm.\n')
    f.write('window.BEATS = ' + json.dumps({'tempo': [T0, T1], 'cells': CELLS, 'cuts': cuts,
                                           'tempoAtCut': [round(tempo(int(s)), 1) for s in starts]}) + ';\n')
print(f'{DUR:.2f} s, {len(starts)} tiles, laps start at {cuts[0]:.2f} / {cuts[14]:.2f} / {cuts[28]:.2f} s, final at {cuts[41]:.2f} s')
print('holds:', ' '.join(f'{h:.2f}' for h in np.diff(cuts)))
