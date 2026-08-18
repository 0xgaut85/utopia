"""Crop and magnify the four inner-frame corners so they can be checked closely."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "banner" / "preview.png"
DEST = ROOT / "banner" / "corner-check.png"

INSET = 200
WIDTH, HEIGHT = 1920, 1080
WINDOW = 70          # half-size of the crop box around each corner
SCALE = 4

corners = {
    "top-left": (INSET, INSET),
    "top-right": (WIDTH - INSET, INSET),
    "bottom-left": (INSET, HEIGHT - INSET),
    "bottom-right": (WIDTH - INSET, HEIGHT - INSET),
}

src = Image.open(SRC).convert("RGB")
tile = WINDOW * 2 * SCALE
sheet = Image.new("RGB", (tile * 2 + 12, tile * 2 + 12), (20, 20, 20))

for index, (name, (cx, cy)) in enumerate(corners.items()):
    crop = src.crop((cx - WINDOW, cy - WINDOW, cx + WINDOW, cy + WINDOW))
    crop = crop.resize((tile, tile), Image.NEAREST)
    col, row = index % 2, index // 2
    sheet.paste(crop, (col * (tile + 12), row * (tile + 12)))
    print(f"{name:<13} centre pixel {src.getpixel((cx, cy))}")

sheet.save(DEST)
print(f"written: {DEST.relative_to(ROOT)} at {sheet.size[0]}x{sheet.size[1]}")
