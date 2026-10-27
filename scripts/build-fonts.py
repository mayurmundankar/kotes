"""Builds static, Latin-subset WOFF2 files in src/fonts from Google's variable fonts.

Why: variable fonts rendered at their thinnest weight in WebKit (iPhone), and
Bodoni's optical-size axis erased its hairlines at headline sizes.

Usage (pip install fonttools brotli):
  1. Download into a folder, named as in JOBS below, from github.com/google/fonts (OFL):
     ofl/bodonimoda/BodoniModa[opsz,wght].ttf, BodoniModa-Italic[opsz,wght].ttf
     ofl/manrope/Manrope[wght].ttf
     ofl/cormorantgaramond/CormorantGaramond[wght].ttf, CormorantGaramond-Italic[wght].ttf
     (prefix each with its folder name, e.g. "manrope-Manrope[wght].ttf")
  2. python scripts/build-fonts.py <that folder> src/fonts
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src, out = Path(sys.argv[1]), Path(sys.argv[2])
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
         "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD")
OPSZ = 28  # Bodoni: enough contrast to feel like Bodoni, hairlines still visible on phones

JOBS = [
  ("bodonimoda-BodoniModa[opsz,wght].ttf", "bodoni", "normal", [400, 500, 600, 700]),
  ("bodonimoda-BodoniModa-Italic[opsz,wght].ttf", "bodoni", "italic", [400, 500]),
  ("manrope-Manrope[wght].ttf", "manrope", "normal", [400, 500, 600, 700]),
  ("cormorantgaramond-CormorantGaramond[wght].ttf", "cormorant", "normal", [400, 500, 600]),
  ("cormorantgaramond-CormorantGaramond-Italic[wght].ttf", "cormorant", "italic", [400, 500]),
]

for file, family, style, weights in JOBS:
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in TTFont(src / file)["fvar"].axes}
    print(file, axes)
    for w in weights:
        font = TTFont(src / file)
        loc = {"wght": w}
        if "opsz" in axes:
            loc["opsz"] = OPSZ
        static = instancer.instantiateVariableFont(font, loc, updateFontNames=False)
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
