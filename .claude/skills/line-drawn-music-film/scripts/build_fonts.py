"""Build fonts.js: single-stroke fonts (EMS Tech, EMS Allure) and the Hershey treble clef.

usage: python3 build_fonts.py <hersheytext package dir> <out fonts.js>

Get the package with: npm pack hersheytext && tar xzf hersheytext-*.tgz   (dir = ./package)
A prebuilt fonts.js already ships in assets/template/js/; rebuild only to add fonts.
Other single-stroke fonts in the package: EMSReadability, EMSNixish, EMSFelix, EMSElfin, HersheyScript1.
"""
import html, json, re, sys
from pathlib import Path



def flatten(d):
    toks = re.findall(r'[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?', d)
    strokes, cur, cmd, i, pos = [], None, None, 0, (0, 0)

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in 'Zz' and cur:
                cur.append(cur[0])
            continue
        if cmd == 'M':
            pos = (num(), num()); cur = [pos]; strokes.append(cur); cmd = 'L'
        elif cmd == 'L':
            pos = (num(), num()); cur.append(pos)
        elif cmd == 'C':
            x1, y1, x2, y2, x3, y3 = [num() for _ in range(6)]
            x0, y0 = pos
            for k in range(1, 7):
                s = k / 6
                a, b, c, e = (1 - s) ** 3, 3 * (1 - s) ** 2 * s, 3 * (1 - s) * s * s, s ** 3
                cur.append((a * x0 + b * x1 + c * x2 + e * x3, a * y0 + b * y1 + c * y2 + e * y3))
            pos = (x3, y3)
        else:
            i += 1
    # font units are y-up; store y-down so glyphs can be drawn straight onto canvas
    return [[v for p in s for v in (round(p[0]), round(-p[1]))] for s in strokes if len(s) > 1]


def svg_font(path):
    src = Path(path).read_text()
    out = {}
    for m in re.finditer(r'<glyph\s([^>]*)/>', src):
        a = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
        u = html.unescape(a.get('unicode', ''))
        if len(u) == 1 and 32 <= ord(u) < 127:
            out[u] = [round(float(a.get('horiz-adv-x', 378))), flatten(a.get('d', ''))]
    return out


def treble_clef(hershey_json):
    d = json.load(open(hershey_json))['music']['chars'][26]['d']
    strokes = []
    for part in d.split('M')[1:]:
        nums = [float(v) for v in re.findall(r'-?\d+', part)]
        strokes.append([(nums[k], nums[k + 1]) for k in range(0, len(nums) - 1, 2)])
    xs = [p[0] for s in strokes for p in s]; ys = [p[1] for s in strokes for p in s]
    cx, cy, h = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(ys) - min(ys)
    return [[round(v, 4) for p in s for v in ((p[0] - cx) / h, (p[1] - cy) / h)] for s in strokes]


pkg = Path(sys.argv[1])
fonts = dict(
    tech=svg_font(pkg / 'svg_fonts/EMSTech.svg'),
    allure=svg_font(pkg / 'svg_fonts/EMSAllure.svg'),
    clef=treble_clef(pkg / 'hersheytext.json'),
)
Path(sys.argv[2]).write_text(
    '// Single-stroke fonts: EMS Tech and EMS Allure (SIL Open Font License, Sheldon B. Michaels / Windell H. Oskay),\n'
    '// and the Hershey treble clef, via the hersheytext package (MIT).\n'
    'window.FONTS = ' + json.dumps(fonts, separators=(',', ':')) + ';\n')

print('glyphs', len(fonts['tech']), len(fonts['allure']), 'clef strokes', len(fonts['clef']))
