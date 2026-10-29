"""Builds static, Latin-subset WOFF2 files in src/fonts from Google's variable fonts.

Why static: variable fonts rendered at their thinnest weight in WebKit (iPhone).
Why these faces: Bodoni Moda / Cormorant hairlines vanished on phone screens
("kotes" read as "koles"); DM Serif Display and EB Garamond hold up.

Usage (pip install fonttools brotli):
  1. Download into a folder, named as in JOBS below, from github.com/google/fonts (OFL):
     ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf, DMSerifDisplay-Italic.ttf
     ofl/ebgaramond/EBGaramond[wght].ttf, EBGaramond-Italic[wght].ttf
     ofl/manrope/Manrope[wght].ttf
     (prefix each with its folder name, e.g. "manrope-Manrope[wght].ttf")
  2. python scripts/build-fonts.py <that folder> src/fonts mobile/assets/fonts

Also writes src/fonts/og/*.ttf: TrueType copies of the faces the server uses to
draw share images (Next's image renderer reads TTF/OTF/WOFF, not WOFF2), and,
given a third folder, TTF copies of every web face for the Android app (Android
can't load WOFF2). Each app file is its own family, named after the file.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src, out = Path(sys.argv[1]), Path(sys.argv[2])
app = Path(sys.argv[3]) if len(sys.argv) > 3 else None
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
         "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD")

JOBS = [
  ("dmserifdisplay-DMSerifDisplay-Regular.ttf", "dmserif", "normal", [400]),
  ("dmserifdisplay-DMSerifDisplay-Italic.ttf", "dmserif", "italic", [400]),
  ("ebgaramond-EBGaramond[wght].ttf", "garamond", "normal", [400, 500]),
  ("ebgaramond-EBGaramond-Italic[wght].ttf", "garamond", "italic", [400, 500]),
  ("manrope-Manrope[wght].ttf", "manrope", "normal", [400, 500, 600, 700]),
]

# Faces the share-image renderer needs, as TTF.
OG_JOBS = [
  ("dmserifdisplay-DMSerifDisplay-Regular.ttf", "dmserif-400", None),
  ("dmserifdisplay-DMSerifDisplay-Italic.ttf", "dmserif-400-italic", None),
  ("ebgaramond-EBGaramond[wght].ttf", "garamond-500", 500),
  ("manrope-Manrope[wght].ttf", "manrope-600", 600),
]


def subset_font(font, flavor):
    opts = subset.Options()
    opts.flavor = flavor
    opts.layout_features = ["kern", "liga", "clig", "calt", "ccmp", "locl", "mark", "mkmk", "onum", "lnum", "pnum", "tnum"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(LATIN))
    sub.subset(font)
    font.flavor = flavor
    return font


for file, name, weight in OG_JOBS:
    font = TTFont(src / file)
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": weight}, updateFontNames=False)
    dest = out / "og" / f"{name}.ttf"
    dest.parent.mkdir(parents=True, exist_ok=True)
    subset_font(font, None).save(dest)
    print("  ", f"og/{dest.name}", dest.stat().st_size // 1024, "KB")

for file, family, style, weights in JOBS:
    variable = "fvar" in TTFont(src / file)
    for w in weights:
        font = TTFont(src / file)
        static = instancer.instantiateVariableFont(font, {"wght": w}, updateFontNames=False) if variable else font
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "liga", "clig", "calt", "ccmp", "locl", "mark", "mkmk", "onum", "lnum", "pnum", "tnum"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(LATIN))
        sub.subset(static)
        dest = out / family / f"{family}-{w}{'-italic' if style == 'italic' else ''}.woff2"
        dest.parent.mkdir(parents=True, exist_ok=True)
        static.flavor = "woff2"
        static.save(dest)
        print("  ", dest.name, dest.stat().st_size // 1024, "KB")
        if app:
            app.mkdir(parents=True, exist_ok=True)
            static.flavor = None
            ttf = app / dest.with_suffix(".ttf").name
            static.save(ttf)
            print("  ", f"app/{ttf.name}", ttf.stat().st_size // 1024, "KB")
