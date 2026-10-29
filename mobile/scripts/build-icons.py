"""Draws the app's icons and splash from the brand mark: the rose opening quote
(“) in DM Serif Display on paper, the same mark as the website's favicon.

Usage (pip install pillow), from mobile/:
  python scripts/build-icons.py

Writes assets/images/:
  icon.png                     1024², paper with the mark (the classic icon)
  android-icon-foreground.png  1024², transparent; the mark inside the adaptive-icon safe zone
  android-icon-background.png  1024², paper
  android-icon-monochrome.png  1024², the mark in white (Android 13+ themed icons)
  splash-icon.png              1024², transparent; the mark, shown on paper at launch
  favicon.png                  the website's favicon (web preview only)
and store/icon-512.png (the Google Play listing icon) and store/feature-graphic.png
(1024×500, cut from the website's link preview, public/og.png).
"""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "assets/fonts/dmserif-400.ttf"
OUT = ROOT / "assets/images"
PAPER = (255, 246, 247, 255)
ROSE = (232, 54, 95, 255)
WHITE = (255, 255, 255, 255)
MARK = "“"


def mark(size: int, width: float, color, background=None) -> Image.Image:
    """The mark, `width` of the canvas wide, centred on its own ink (a glyph's
    box includes the line height, which would push the mark to the top)."""
    big = Image.new("RGBA", (4000, 4000), (0, 0, 0, 0))
    ImageDraw.Draw(big).text((500, 500), MARK, font=ImageFont.truetype(str(FONT), 2400), fill=color)
    ink = big.crop(big.getchannel("A").getbbox())
    w = round(size * width)
    ink = ink.resize((w, round(ink.height * w / ink.width)), Image.LANCZOS)
    img = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    img.alpha_composite(ink, ((size - ink.width) // 2, (size - ink.height) // 2))
    return img


def save(img: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("  ", path.relative_to(ROOT), img.size[0], "px")


save(mark(1024, 0.46, ROSE, PAPER), OUT / "icon.png")
# Adaptive icons are masked to a shape; only the middle 66% is always visible.
save(mark(1024, 0.34, ROSE), OUT / "android-icon-foreground.png")
save(Image.new("RGBA", (1024, 1024), PAPER), OUT / "android-icon-background.png")
save(mark(1024, 0.34, WHITE), OUT / "android-icon-monochrome.png")
# Android 12+ shows the splash image inside a circle, at about two thirds.
save(mark(1024, 0.5, ROSE), OUT / "splash-icon.png")
save(mark(512, 0.46, ROSE, PAPER).convert("RGB"), ROOT / "store/icon-512.png")
shutil.copyfile(ROOT.parent / "public/favicon.png", OUT / "favicon.png")
print("  ", "assets/images/favicon.png (copied from the website)")

# Play's feature graphic is 1024×500; og.png is 1200×630, so trim it to that
# shape (evenly top and bottom, where it's only paper) and scale.
og = Image.open(ROOT.parent / "public/og.png").convert("RGB")
h = round(og.width * 500 / 1024)
top = (og.height - h) // 2
save(og.crop((0, top, og.width, top + h)).resize((1024, 500), Image.LANCZOS), ROOT / "store/feature-graphic.png")
