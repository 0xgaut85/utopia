"""Convert logoutopia.png (dark mark on white) into a tightly cropped transparent PNG.

Alpha is derived from luminance so the mark's antialiased edges survive without
white fringing, then the canvas is cropped to the mark's bounding box.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "logoutopia.png"
DEST = ROOT / "banner" / "logo-utopia-mark.png"

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
luminance = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

darkest = float(luminance.min())
alpha = np.clip((255.0 - luminance) / (255.0 - darkest), 0.0, 1.0)
# Kill near-white sensor noise so the bounding box reflects the mark itself.
alpha[alpha < 0.04] = 0.0

mark_colour = rgb[luminance < darkest + 12].mean(axis=0)

height, width = luminance.shape
out = np.empty((height, width, 4), dtype=np.uint8)
out[..., 0] = round(float(mark_colour[0]))
out[..., 1] = round(float(mark_colour[1]))
out[..., 2] = round(float(mark_colour[2]))
out[..., 3] = (alpha * 255.0).round().astype(np.uint8)

image = Image.fromarray(out, "RGBA")
bbox = image.getbbox()
image = image.crop(bbox)

DEST.parent.mkdir(parents=True, exist_ok=True)
image.save(DEST)

hex_colour = "#{:02X}{:02X}{:02X}".format(*(round(float(c)) for c in mark_colour))
print(f"mark colour : {hex_colour}")
print(f"source bbox : {bbox}")
print(f"written     : {DEST.relative_to(ROOT)} at {image.size[0]}x{image.size[1]}")
