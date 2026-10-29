"""Check the finished film: hard cuts (from the pictures), note attacks (from its own audio track),
and how far each cut is from the nearest attack. Also that nothing moves inside a tile.

    python3 tools/sync_check.py out/butterfly.mp4
"""
import json, subprocess, sys
import numpy as np

film = sys.argv[1]
S = 135
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', film, '-vf', f'scale={S}:{S}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, S, S).astype(np.int16)
ch = (np.abs(np.diff(v, axis=0)) > 25).mean((1, 2)) * 100
cuts = [(i + 1) / 30 for i, c in enumerate(ch) if c > 20]
still = max(c for c in ch if c <= 20)

sr = 22050
a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', film, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32)
hop = 64
frames = len(a) // hop
e = np.sqrt((a[:frames * hop].reshape(frames, hop) ** 2).mean(1) + 1e-12)
flux = np.maximum(0, np.diff(np.log(e + 1e-4), prepend=0))
peaks = [i for i in range(2, len(flux) - 2) if flux[i] > 0.6 and flux[i] == flux[i - 2:i + 3].max()]
onsets = np.array(peaks) * hop / sr
off = [float(onsets[np.argmin(np.abs(onsets - c))] - c) for c in cuts]
print(f'{len(v)} frames, {len(v) / 30:.2f} s, {len(cuts)} hard cuts (+ frame 0 = {len(cuts) + 1} tiles)')
print(f'largest change inside a tile: {still:.2f}% of pixels')
print('cut times :', ' '.join(f'{c:.2f}' for c in cuts))
print('audio attack minus cut (ms):', ' '.join(f'{o * 1000:+.0f}' for o in off))
print(f'max |offset| {max(abs(o) for o in off) * 1000:.0f} ms, mean {np.mean(off) * 1000:+.0f} ms')
print(f'audio peak {20 * np.log10(np.abs(a).max()):.1f} dBFS, rms {20 * np.log10(np.sqrt((a ** 2).mean())):.1f} dBFS')
