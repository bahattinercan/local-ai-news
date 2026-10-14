"""Generate the site icon set (favicon.ico, apple-icon.png) from the radar mark.

Run:  python scripts/generate-icons.py
No third-party dependency beyond Pillow.
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT_DIR = Path("src/app")
SIZE = 256

BG = (7, 10, 16)
RING = (42, 53, 71)
ACCENT = (53, 208, 186)
WARN = (232, 176, 75)


def draw(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    c = size // 2
    scale = size / 64

    for radius in (23, 13):
        r = radius * scale
        draw.ellipse([c - r, c - r, c + r, c + r], outline=RING, width=max(1, int(2 * scale)))

    line_w = max(1, int(3 * scale))
    draw.line([c, c, c, 7 * scale], fill=ACCENT, width=line_w)
    draw.line([c, c, 53 * scale, 21 * scale], fill=ACCENT, width=line_w)

    dot = 4 * scale
    draw.ellipse([43 * scale - dot, 21 * scale - dot, 43 * scale + dot, 21 * scale + dot], fill=WARN)

    core = 3.5 * scale
    draw.ellipse([c - core, c - core, c + core, c + core], fill=ACCENT)
    return img


def main() -> None:
    master = draw(SIZE)
    master.save(OUT_DIR / "apple-icon.png")
    master.save(OUT_DIR / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"wrote {OUT_DIR / 'favicon.ico'} and {OUT_DIR / 'apple-icon.png'}")


if __name__ == "__main__":
    main()
