"""Study a reference film before imitating its style.

    python study_reference.py <film.mp4> <out dir> [--at 3.0] [--crop x,y,w,h]

Writes:
  sheet.jpg     16 frames across the whole film (story, framing, how scenes change)
  sequence.jpg  8 consecutive frames from --at, cropped (how lines are drawn on, whether
                the image boils, whether it animates on ones or on twos)
  diff.jpg      what changed between two consecutive frames (dark = changed)
and prints, per frame: share of pixels that changed overall and inside coloured areas,
"on twos" if every other frame is identical, and the dominant palette.
Needs: numpy, pillow, ffmpeg on PATH.
"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('film'); ap.add_argument('out')
ap.add_argument('--at', type=float, default=3.0); ap.add_argument('--crop', default='')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', a.film], capture_output=True, text=True).stdout)
W, H = info['streams'][0]['width'], info['streams'][0]['height']
dur = float(info['format']['duration'])
num, den = map(int, info['streams'][0]['r_frame_rate'].split('/'))
print(f'{W}x{H}, {num / den:g} fps, {dur:.1f}s')


def frames(t, n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', a.film, '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.film, '-vf', f'fps={16 / dur},scale=480:-1,tile=4x4:padding=6:color=white', '-frames:v', '1', os.path.join(a.out, 'sheet.jpg')])

f = frames(a.at, 12).astype(np.int16)
x, y, w, h = map(int, a.crop.split(',')) if a.crop else (W // 4, H // 4, W // 2, H // 2)
seq = Image.new('RGB', (4 * 330, 2 * 330), 'white')
for i in range(8):
    seq.paste(Image.fromarray(f[i, y:y + h, x:x + w].astype(np.uint8)).resize((326, 326)), ((i % 4) * 330, (i // 4) * 330))
seq.save(os.path.join(a.out, 'sequence.jpg'), quality=88)
dd = np.abs(f[1] - f[0]).sum(-1).clip(0, 255).astype(np.uint8)
Image.fromarray(255 - dd).save(os.path.join(a.out, 'diff.jpg'), quality=88)

coloured = (f[0].max(-1) - f[0].min(-1)) > 60
d = np.abs(np.diff(f, axis=0)).sum(-1) > 30
allc = [round(100 * float(x.mean()), 1) for x in d]
colc = [round(100 * float((x & coloured).sum()) / max(1, int(coloured.sum())), 1) for x in d]
print('changed pixels per frame, % overall :', allc)
print('changed pixels per frame, % coloured:', colc)
if all(v < 0.5 for v in allc):
    print('-> held frame: nothing moves here')
elif all(v < 0.5 for v in allc[0::2]) or all(v < 0.5 for v in allc[1::2]):
    print('-> animates on twos (every other frame repeats)')

# hard cuts over the whole film, and how much moves between them
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.film, '-vf', 'scale=270:270', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
g = np.frombuffer(raw, np.uint8).reshape(-1, 270, 270).astype(np.int16)
ch = (np.abs(np.diff(g, axis=0)) > 25).mean((1, 2)) * 100
cuts = [i + 1 for i, c in enumerate(ch) if c > 30]
if cuts:
    iv = np.diff([0] + cuts) / (num / den)
    between = [c for i, c in enumerate(ch) if i + 1 not in cuts]
    print(f'hard cuts: {len(cuts)}, at', ', '.join(f'{c / (num / den):.2f}' for c in cuts[:30]), '...' if len(cuts) > 30 else '')
    print(f'shot length: mean {iv.mean():.3f}s, min {iv.min():.3f}s, max {iv.max():.3f}s; motion between cuts: max {max(between, default=0):.1f}% of pixels')
    if iv.std() < 0.05 * iv.mean() and max(between, default=0) < 1:
        print(f'-> held pictures cut on a steady grid ({60 / iv.mean():.0f} cuts a minute): a pattern series, see references/pattern-series.md')

# dominant colours (tiny k-means)
px = f[0, ::6, ::6].reshape(-1, 3).astype(float)
rng = np.random.default_rng(0)
cent = px[rng.choice(len(px), 8, replace=False)]
for _ in range(12):
    lab = np.argmin(((px[:, None] - cent[None]) ** 2).sum(-1), 1)
    cent = np.array([px[lab == k].mean(0) if (lab == k).any() else cent[k] for k in range(8)])
share = np.bincount(lab, minlength=8) / len(lab)
order = np.argsort(share)[::-1]
print('palette:', ', '.join(f"#{int(c[0]):02x}{int(c[1]):02x}{int(c[2]):02x} {100 * share[k]:.0f}%" for k, c in ((k, cent[k]) for k in order)))
print('wrote', ', '.join(os.path.join(a.out, n) for n in ('sheet.jpg', 'sequence.jpg', 'diff.jpg')))
