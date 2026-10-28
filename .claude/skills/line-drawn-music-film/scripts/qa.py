"""Check a rendered film before showing it to anyone.

    python qa.py <film.mp4> <out dir> [--score js/score.js] [--every 1.4]

Writes <out>/sheet.jpg (a contact sheet) and prints:
  - flicker: frames that differ from both neighbours while the neighbours agree with each other
    (a texture or element that re-randomises for one frame). There should be none.
  - fastest motion: the biggest frame-to-frame changes, with the nearest cut. Big values away
    from a cut usually mean a camera move too fast for line art at 24 fps.
  - audio: whether there is an audio stream and how loud it is.
Needs: numpy, pillow, ffmpeg on PATH.
"""
import argparse, json, subprocess, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('film'); ap.add_argument('out')
ap.add_argument('--score'); ap.add_argument('--every', type=float, default=1.4)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', a.film], capture_output=True, text=True).stdout)
dur = float(probe['format']['duration'])
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
num, den = map(int, v['r_frame_rate'].split('/'))
fps = num / den
print(f"{v['width']}x{v['height']} {fps:g} fps, {dur:.2f}s, streams: {[s['codec_type'] for s in probe['streams']]}")

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.film, '-vf', 'scale=270:270', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, 270, 270).astype(np.int16)
d = np.abs(np.diff(f, axis=0)).mean((1, 2))
cuts = []
if a.score:
    s = open(a.score).read()
    cuts = json.loads(s[s.index('=') + 1:].strip().rstrip(';'))['bars']

flicker = []
for i in range(1, len(f) - 1):
    around = np.abs(f[i + 1] - f[i - 1]).mean()
    if d[i - 1] > 3 and around < 0.3 * d[i - 1]:
        flicker.append(round(i / fps, 2))
print('median change per frame', round(float(np.median(d)), 2))
print('flicker frames:', flicker or 'none')
print('fastest motion (time, change, nearest cut):')
for i in np.argsort(d)[::-1][:8]:
    t = (i + 1) / fps
    near = min(cuts, key=lambda c: abs(c - t)) if cuts else None
    print(f'  {t:6.2f}s  {d[i]:5.1f}' + (f'  cut {near:.2f} ({t - near:+.2f}s)' if near is not None else ''))

# contact sheet
times = np.arange(0.2, dur, a.every)
W = 270; cols = 6; rows = (len(times) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + 4), rows * (W + 4)), 'white')
for k, t in enumerate(times):
    img = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', a.film, '-frames:v', '1', '-vf', f'scale={W}:{W}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    if len(img) == W * W * 3:
        sheet.paste(Image.frombytes('RGB', (W, W), img), ((k % cols) * (W + 4), (k // cols) * (W + 4)))
sheet.save(os.path.join(a.out, 'sheet.jpg'), quality=85)
print('contact sheet:', os.path.join(a.out, 'sheet.jpg'))

vol = subprocess.run(['ffmpeg', '-v', 'info', '-i', a.film, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('audio:', ' '.join(l.split('] ')[-1] for l in vol.splitlines() if 'mean_volume' in l or 'max_volume' in l) or 'none')
