"""Audit the inner dashed frame in the rendered banner.

Walks each of the four lines end to end and reports the dash/gap run lengths,
so the four corners can be compared numerically instead of by eye. A correct
frame has every line starting and ending on a dash, with the same leading and
trailing clearance on all eight ends.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
src = np.asarray(Image.open(ROOT / "banner" / "preview.png").convert("RGB")).astype(float)
lum = 0.2126 * src[..., 0] + 0.7152 * src[..., 1] + 0.0722 * src[..., 2]

# Lines are centred on .5 coordinates, so each fills the pixel below it.
TOP, BOTTOM, LEFT, RIGHT = 200, 879, 200, 1719
MARK_HALF = 14          # half height of the corner mark
CLEAR = 22              # where a line stops relative to its corner

LINES = {
    "top":    ("h", TOP, LEFT, RIGHT),
    "bottom": ("h", BOTTOM, LEFT, RIGHT),
    "left":   ("v", LEFT, TOP, BOTTOM),
    "right":  ("v", RIGHT, TOP, BOTTOM),
}


def run_lengths(mask):
    out = []
    for v in mask:
        if out and out[-1][0] == v:
            out[-1][1] += 1
        else:
            out.append([bool(v), 1])
    return out


print("line     lead  dashes  dash len   gap len   trail   ends on dash")
print("-" * 68)

for name, (axis, fixed, start, end) in LINES.items():
    lo, hi = start + MARK_HALF + 1, end - MARK_HALF
    strip = lum[fixed, lo:hi] if axis == "h" else lum[lo:hi, fixed]
    # Compare each pixel to the local background a few rows/cols away, since the
    # photo underneath is not uniform.
    if axis == "h":
        bg = (lum[fixed - 4, lo:hi] + lum[fixed + 4, lo:hi]) / 2
    else:
        bg = (lum[lo:hi, fixed - 4] + lum[lo:hi, fixed + 4]) / 2
    mask = (bg - strip) > 12

    runs = run_lengths(mask)
    lead = runs[0][1] if not runs[0][0] else 0
    trail = runs[-1][1] if not runs[-1][0] else 0
    dashes = [n for d, n in runs if d]
    gaps = [n for d, n in runs[1:-1] if not d]
    ends_on_dash = runs[0][0] or runs[-1][0]

    # lead/trail are measured from the mark edge; add MARK_HALF back for the
    # distance from the corner centre.
    print(f"{name:<8} {lead + MARK_HALF + 1:>4}  {len(dashes):>6}  "
          f"{min(dashes)}-{max(dashes):<7}  {min(gaps)}-{max(gaps):<6} "
          f"{trail + MARK_HALF:>4}   {'no (good)' if not ends_on_dash else 'trimmed'}")

print()
print("corner marks (dark pixels in a 60x60 box around each corner centre):")
for label, cx, cy in (("tl", LEFT, TOP), ("tr", RIGHT, TOP),
                      ("bl", LEFT, BOTTOM), ("br", RIGHT, BOTTOM)):
    win = lum[cy - 24:cy + 25, cx - 24:cx + 25]
    ys, xs = np.nonzero(win < np.median(win) - 40)
    print(f"  {label}: {xs.max() - xs.min() + 1}w x {ys.max() - ys.min() + 1}h   "
          f"offset from corner ({(xs.min() + xs.max()) / 2 - 24:+.1f}, "
          f"{(ys.min() + ys.max()) / 2 - 24:+.1f})   "
          f"ink {int((win < np.median(win) - 40).sum())}px")
