#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.68.0", "brotli==1.2.1"]
# ///
"""Cut the site's web fonts down to what it uses. Run by hand; not part of the build.

    uv run scripts/subset-fonts.py          # rewrite app/fonts/, then commit it
    uv run scripts/subset-fonts.py --check  # exit 1 if the content outgrew app/fonts/

Rerun after any of these (see README):
- content adds a character outside Latin-1 / Latin Extended-A that the old
  fonts drew, such as € or π, or a Latin-1 letter that is not in the core file
  yet, such as é. `--check` catches both;
- CSS starts using a weight below 400;
- CSS or a component turns on an OpenType feature that is not in `features`.
"""

import hashlib
import io
import sys
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import OVERLAP_COMPOUND, flagOverlapSimple
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "fonts"
CACHE = ROOT / "node_modules" / ".cache" / "site-fonts"

# Scanned for characters. app/og draws with Satori's own font, so it is out.
CONTENT_GLOBS = ["app/**/*.mdx", "app/**/*.tsx", "app/**/*.ts", "app/**/*.css"]
CONTENT_SKIP = ("app/fonts/", "app/og/")

# The core file: what most pages draw, so it is what gets preloaded.
# U+2026 must stay here, in the file that holds the space. Browsers ask the primary
# font alone for an ellipsis (for text-overflow) and draw "..." if it has none.
# U+2010 is out on purpose. They ask the same way for a hyphen (for soft hyphens and
# `hyphens: auto`), and the old files had none, so they drew U+002D. Keeping U+2010
# would draw a different glyph.
CORE = {
    *range(0x20, 0x7F),  # ASCII
    0xA0,  # no-break space, no outline
    0x2013, 0x2014,  # en dash, em dash
    0x2018, 0x2019, 0x201C, 0x201D,  # curly quotes
    0x2026,  # ellipsis
}
ALWAYS_KEEP = {*range(0xA0, 0x100), *range(0x100, 0x180)}  # Latin-1, Latin Extended-A
# The old Latin file had no ā, but it had U+0304. HarfBuzz split ā into a + U+0304
# there, so ā kerned with its neighbours as a. Core needs the two marks to do the
# same, but they cost 3 KB, so they ship only for content that uses these letters.
SPLIT_LETTERS = {ord(letter) for letter in "ĀāĒēĪīŌōŪūŸ"}
SPLIT_MARKS = {0x304, 0x308}
# Browsers shape each file on its own, so kerning and calt stop at the core/extended
# boundary. The old Latin file held é next to ASCII, so "Café" kerned across it. A
# character the content draws from that file stays in core, to keep that kerning.


def parse_ranges(text: str) -> set[int]:
    codepoints: set[int] = set()
    for part in text.replace("U+", "").split(","):
        start, _, end = part.strip().partition("-")
        codepoints.update(range(int(start, 16), int(end or start, 16) + 1))
    return codepoints


# What the Google Fonts CSS let each family draw. A character outside these
# ranges falls through to system fonts today even though the source font has a
# glyph, so keeping it (→ in Inter, say) would change how it looks.
GF_LATIN = "U+0-FF,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
GF_LATIN_EXT = "U+100-2BA,U+2BD-2C5,U+2C7-2CC,U+2CE-2D7,U+2DD-2FF,U+304,U+308,U+329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF"
GF_VIETNAMESE = "U+102-103,U+110-111,U+128-129,U+168-169,U+1A0-1A1,U+1AF-1B0,U+300-301,U+303-304,U+308-309,U+323,U+329,U+1EA0-1EF9,U+20AB"
GF_GREEK = "U+370-377,U+37A-37F,U+384-38A,U+38C,U+38E-3A1,U+3A3-3FF,U+1F00-1FFF"
GF_CYRILLIC = "U+301,U+400-45F,U+490-491,U+4B0-4B1,U+2116,U+460-52F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F"

# The sources draw these and Google's files did not, despite the ranges above.
INTER_NOT_SERVED = "U+2000-2001,U+2003-2008,U+200A,U+2010-2012,U+2015-2017,U+201B,U+201F,U+2021,U+2023-2025,U+2027,U+202F-2031,U+2034-2038,U+203B-2043,U+2045-2055,U+2057,U+205F"
NEWSREADER_NOT_SERVED = "U+2010,U+2021,U+2030,U+2052"

GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts"

# The site uses wght 400-600 and opsz 14-16, but only this cut keeps the rendering
# exact. Nothing below 400 is used, and dropping it leaves the rest of the axis
# untouched. A lower maximum rescales every delta and rounds it to a font unit, and
# that moves glyphs across subpixel positions. See README for what that would save.
EXACT_AXES = {"wght": (400, 900)}


@dataclass
class Family:
    name: str  # file prefix, and the CSS variable is --font-<name>-core
    css_family: str  # the font-family both files share; the old CSS used the same one
    source: str  # URL, or a path relative to the repo
    sha256: str
    license: str
    style: str
    weight: str  # the @font-face descriptor; must match AXES
    features: list[str]
    coverage: set[int] | None = None  # None: every character in the source
    axes: dict[str, tuple[int, int]] = field(default_factory=dict)
    preload_core: bool = True
    flag_overlaps: bool = False
    head_bbox: dict[str, tuple[int, int, int, int]] = field(default_factory=dict)
    add_names: dict[int, str] = field(default_factory=dict)


FAMILIES = [
    # Google's Inter has no cv01 or ss03, so `font-feature-settings` on body does
    # nothing to it. This source does have them. Keeping them would change the
    # site. They stay out of `features` on purpose. Likewise locl, frac and tnum's
    # siblings: nothing in the CSS or the two page languages turns them on.
    Family(
        name="inter",
        css_family="Inter",
        source=f"{GOOGLE_FONTS}/0b58fb370093f9a9f4ff785d94405710b79de67c/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
        sha256="29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031",
        license=f"{GOOGLE_FONTS}/0b58fb370093f9a9f4ff785d94405710b79de67c/ofl/inter/OFL.txt",
        style="normal",
        weight="400 900",
        features=["calt", "ccmp", "kern", "mark", "mkmk", "tnum"],
        coverage=parse_ranges(",".join([GF_LATIN, GF_LATIN_EXT, GF_VIETNAMESE, GF_GREEK, GF_CYRILLIC]))
        - parse_ranges(INTER_NOT_SERVED),
        axes=EXACT_AXES,
    ),
    # The site asks for Newsreader italic 400, and Google answers with this static
    # instance. Its outlines match what the site served, to the unit; the variable
    # source pinned to the same place rounds them differently. It has no axes to
    # cut. `[lang='en'] .intro em` is the one rule that uses it, and it sets 400.
    Family(
        name="newsreader",
        css_family="Newsreader",
        source="https://fonts.gstatic.com/s/newsreader/v26/cY9kfjOCX1hbuyalUrK439vogqC9yFZCYg7oRZaLP4obnf7fTXglsMwoT-ZA.ttf",
        sha256="a7a0a9114e29fbf6e83a339ed930d5d8ae69fe4217c34fdd95386d995929d6e8",
        license=f"{GOOGLE_FONTS}/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/newsreader/OFL.txt",
        style="italic",
        weight="400",
        features=["kern", "liga", "mark", "mkmk"],
        coverage=parse_ranges(",".join([GF_LATIN, GF_LATIN_EXT, GF_VIETNAMESE]))
        - parse_ranges(NEWSREADER_NOT_SERVED),
        preload_core=False,  # only /en draws it, and it was never preloaded
        # The TTF lacks the overlap flags that the served woff2 had. FreeType reads
        # them to antialias overlapping contours.
        flag_overlaps=True,
        # Google recalculated these for its Latin and Latin Extended files. The TTF
        # has its own values. See reopen() for why they matter.
        head_bbox={"core": (-555, -519, 2132, 1791), "extended": (-431, -519, 2811, 2131)},
    ),
    # Tailwind's preflight sets `font-feature-settings: normal` on code and pre, so
    # body's ss03 does not reach this font, even though this font has an ss03.
    Family(
        name="geist-mono",
        css_family="GeistMono",
        source="node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
        sha256="f1cf3ffacae590e08da0a63167cb6a836f623e6189d0a67964afb4f747c32c4c",
        license="node_modules/geist/LICENSE.TXT",
        style="normal",
        weight="400 900",
        features=["ccmp", "liga", "mark", "mkmk"],
        axes=EXACT_AXES,
        # The upstream file has no copyright or license names. OFL wants them here.
        add_names={
            0: "Copyright (c) 2023 Vercel, in collaboration with basement.studio",
            13: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
            14: "https://openfontlicense.org",
        },
    ),
]


def fetch(location: str) -> bytes:
    if not location.startswith("https://"):
        return (ROOT / location).read_bytes()
    cached = CACHE / hashlib.sha256(location.encode()).hexdigest()[:16]
    if not cached.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(location, timeout=60) as response:
            cached.write_bytes(response.read())
    return cached.read_bytes()


def reopen(file: io.BytesIO) -> TTFont:
    # macOS reads head's bounding box when it draws text at 1x. Recalculating it for
    # the subset changes those pixels, even though every outline stays the same.
    return TTFont(file, recalcTimestamp=False, recalcBBoxes=False)


def load_source(family: Family) -> TTFont:
    data = fetch(family.source)
    digest = hashlib.sha256(data).hexdigest()
    if digest != family.sha256:
        sys.exit(f"{family.name}: source changed.\n  want {family.sha256}\n  got  {digest}\n"
                 "A new version may render differently. Pixel-diff it before updating the hash.")
    # OFL names reserved fonts in the header, above the license text. Keeping a
    # reserved name on a modified font breaks the license, so stop rather than ship it.
    header = fetch(family.license).decode().split("This Font Software is licensed")[0]
    if "reserved font name" in header.lower():
        sys.exit(f"{family.name}: the license reserves a font name. Rename the subset first.")
    return reopen(io.BytesIO(data))


def used_characters() -> set[int]:
    characters: set[int] = set()
    for pattern in CONTENT_GLOBS:
        for path in ROOT.glob(pattern):
            if not path.relative_to(ROOT).as_posix().startswith(CONTENT_SKIP):
                characters.update(map(ord, path.read_text(encoding="utf-8")))
    return characters


def split_marks(used: set[int]) -> set[int]:
    return SPLIT_MARKS if used & SPLIT_LETTERS else set()


def wanted(family: Family, source: TTFont, used: set[int]) -> set[int]:
    drawn_today = set(source.getBestCmap())
    if family.coverage is not None:
        drawn_today &= family.coverage
    return (CORE | ALWAYS_KEEP | used | split_marks(used)) & drawn_today


def core_characters(keep: set[int], used: set[int]) -> set[int]:
    return keep & (CORE | (used & parse_ranges(GF_LATIN)) | split_marks(used))


def cut(font: TTFont, unicodes: set[int], features: list[str], glyphs: tuple[str, ...] = ()) -> TTFont:
    options = subset.Options()
    options.layout_features = features
    options.hinting = False
    # Dropping glyph names saves about 2% and changes how macOS draws text at 1x,
    # with the same outlines. Placeholder names do the same, so real ones stay.
    options.glyph_names = True
    options.legacy_kern = False
    options.notdef_outline = False
    # STAT stays. Without it Safari treats a variable font as old TrueType GX and
    # maps CSS weights to the wrong wght values, so 500 and 600 draw as 400.
    options.drop_tables += ["DSIG"]
    # 0-6 identify the font; 0, 13 and 14 carry the notices OFL requires.
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_legacy = False
    options.name_languages = [0x409]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes, glyphs=glyphs)
    subsetter.subset(font)
    return font


def set_overlap_flags(font: TTFont) -> None:
    for glyph in font["glyf"].glyphs.values():
        glyph.expand(font["glyf"])
        if glyph.isComposite():
            glyph.components[0].flags |= OVERLAP_COMPOUND
        elif glyph.numberOfContours > 0:
            glyph.flags[0] |= flagOverlapSimple


def copy(font: TTFont) -> TTFont:
    buffer = io.BytesIO()
    font.save(buffer, reorderTables=False)
    buffer.seek(0)
    return reopen(buffer)


def css_range(codepoints: set[int]) -> str:
    runs: list[list[int]] = []
    for codepoint in sorted(codepoints):
        if runs and codepoint == runs[-1][1] + 1:
            runs[-1][1] = codepoint
        else:
            runs.append([codepoint, codepoint])
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in runs)


def camel(name: str, part: str) -> str:
    head, *rest = name.split("-")
    return head + "".join(word.title() for word in rest) + part.title()


def local_font(family: Family, part: str, unicode_range: str) -> str:
    # Both files are faces of one family, as Google's were. As two families, the
    # extended one sits in every font stack even when it is not loaded, and Safari
    # then stops cutting underlines around descenders. One family also leaves no
    # fallback face between the two files.
    preload = part == "core" and family.preload_core
    return f"""export const {camel(family.name, part)} = localFont({{
  src: './{family.name}-{part}.woff2',
  weight: '{family.weight}',
  style: '{family.style}',
  display: 'swap',
  variable: '--font-{family.name}-{part}',
  preload: {str(preload).lower()},
  adjustFontFallback: false,
  declarations: [
    {{ prop: 'font-family', value: '{family.css_family}' }},
    {{ prop: 'unicode-range', value: '{unicode_range}' }},
  ],
}})
"""


def build(family: Family, used: set[int]) -> str:
    source = load_source(family)
    keep = wanted(family, source, used)
    cut(source, keep, family.features)
    if family.axes:
        instancer.instantiateVariableFont(
            source,
            family.axes,
            inplace=True,
            overlap=instancer.OverlapMode.KEEP_AND_DONT_SET_FLAGS,
        )
        source["fvar"].instances = []  # browsers pick by axis value, not instance name
    if family.flag_overlaps:
        set_overlap_flags(source)
    for name_id, text in family.add_names.items():
        source["name"].setName(text, name_id, 3, 1, 0x409)

    declarations = []
    core = core_characters(keep, used)
    # macOS also reads the X glyph at 1x. Without it, accented letters render
    # differently. Core owns the character, so extended drops it from the cmap.
    x_glyph = source.getBestCmap()[ord("X")]
    for part, unicodes, glyphs in (("core", core, ()), ("extended", keep - core, (x_glyph,))):
        font = cut(copy(source), unicodes, family.features, glyphs)
        if glyphs:
            for table in font["cmap"].tables:
                table.cmap.pop(ord("X"), None)
        if part in family.head_bbox:
            head = font["head"]
            head.xMin, head.yMin, head.xMax, head.yMax = family.head_bbox[part]
        font.flavor = "woff2"
        path = OUT / f"{family.name}-{part}.woff2"
        font.save(path, reorderTables=False)
        # The range comes from the file, not the request: it lists only what the file holds.
        contains = set(TTFont(path).getBestCmap())
        if contains != unicodes:
            sys.exit(f"{path.name}: lost {css_range(unicodes - contains)}")
        declarations.append(local_font(family, part, css_range(contains)))
        print(f"{path.name:34} {path.stat().st_size:>7} bytes  "
              f"{font['maxp'].numGlyphs:>4} glyphs  {len(contains):>4} characters")
    # Core goes last, as Google's Latin file did. Declared first, it loses Safari's
    # underline gaps the same way two families do.
    return "\n".join(reversed(declarations))


def check(used: set[int]) -> int:
    missing = 0
    for family in FAMILIES:
        core, extended = (
            set(TTFont(OUT / f"{family.name}-{part}.woff2").getBestCmap())
            for part in ("core", "extended")
        )
        keep = wanted(family, load_source(family), used)
        lost = (keep - core - extended) | (core_characters(keep, used) - core)
        if lost:
            missing += len(lost)
            print(f"{family.name}: rerun, missing {css_range(lost)}")
    if not missing:
        print("app/fonts/ covers the content.")
    return 1 if missing else 0


def main() -> int:
    used = used_characters()
    if "--check" in sys.argv:
        return check(used)
    OUT.mkdir(exist_ok=True)
    sections = [build(family, used) for family in FAMILIES]
    names = ",\n  ".join(camel(f.name, part) for f in FAMILIES for part in ("core", "extended"))
    (OUT / "index.ts").write_text(
        "// Generated by scripts/subset-fonts.py. Edit the script, not this file.\n"
        "import localFont from 'next/font/local'\n\n"
        + "\n".join(sections)
        + f"\nexport const fontVariables = [\n  {names},\n]\n"
        "  .map((font) => font.variable)\n  .join(' ')\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
