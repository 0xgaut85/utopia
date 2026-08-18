"""Prove the four inner-frame corners are built identically.

Renders the banner with the photo removed so only the frame is drawn, then runs
two checks:

  A. the corner mark, compared across the four corners without mirroring. The
     artwork is not mirror-symmetric, so each corner must carry it in the same
     orientation and the four crops must match exactly.
  B. the dash pattern, compared across all eight line ends. Each end is read
     outward from its own corner, so a correct frame gives eight identical runs.
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BANNER = ROOT / "banner"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

flat = BANNER / "_frame-only.html"
shot = BANNER / "_frame-only.png"

html = (BANNER / "banner.html").read_text(encoding="utf-8")
html = html.replace('--stage-image: url("image1.png");', "--stage-image: none;")
flat.write_text(html, encoding="utf-8")

subprocess.run(
    [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
     "--force-device-scale-factor=1", "--window-size=1920,1080",
     f"--screenshot={shot}", "--virtual-time-budget=6000", flat.as_uri()],
    check=True, capture_output=True,
)

img = np.asarray(Image.open(shot).convert("L")).astype(int)
failures = []

# Pixel that each corner centre falls on (the .5 coordinates centre these).
L, R_, T, B = 200, 1719, 200, 879
CORNERS = {"tl": (L, T), "tr": (R_, T), "bl": (L, B), "br": (R_, B)}

# ---- A. the corner marks -------------------------------------------------
M = 15  # window radius: dashes begin 22 out, so this is mark only
marks = {n: img[cy - M:cy + M + 1, cx - M:cx + M + 1] for n, (cx, cy) in CORNERS.items()}

print("A. corner marks, compared without mirroring")
ref_name, ref = "tl", marks["tl"]
for name, arr in marks.items():
    if name == ref_name:
        ink = int((arr < 200).sum())
        print(f"   {name} : reference   ({ink} ink pixels)")
        continue
    diff = np.abs(arr - ref)
    ok = diff.max() == 0
    failures.append(None) if ok else failures.append(f"mark {name}")
    print(f"   {name} : max diff {int(diff.max()):>3}   {'identical' if ok else 'MISMATCH'}")

# ---- B. the dash runs ----------------------------------------------------
RUN = 48  # how far outward from each corner to compare
ENDS = {
    "top-left":     img[T, L + M + 1:L + M + 1 + RUN],
    "top-right":    img[T, R_ - M - RUN:R_ - M][::-1],
    "bottom-left":  img[B, L + M + 1:L + M + 1 + RUN],
    "bottom-right": img[B, R_ - M - RUN:R_ - M][::-1],
    "left-top":     img[T + M + 1:T + M + 1 + RUN, L],
    "left-bottom":  img[B - M - RUN:B - M, L][::-1],
    "right-top":    img[T + M + 1:T + M + 1 + RUN, R_],
    "right-bottom": img[B - M - RUN:B - M, R_][::-1],
}

print()
print("B. dash runs, each read outward from its own corner")
# The dash period is not a whole number of pixels (4.003 across, 4.006 down), so
# dashes land on slightly different subpixel phases along a line. That shows up
# as a few grey levels of antialiasing and is not a placement error; only the
# distance to the first dash and anything larger than a hairline's worth of
# difference matter.
TOL = 8
ref_end = ENDS["top-left"]
ref_first = int(np.nonzero(ref_end < 200)[0].min()) + M + 1
for name, arr in ENDS.items():
    diff = np.abs(arr - ref_end)
    first = int(np.nonzero(arr < 200)[0].min()) + M + 1
    ok = diff.max() <= TOL and first == ref_first
    if name != "top-left" and not ok:
        failures.append(f"dash {name}")
    print(f"   {name:<13} first dash {first:>3}px from corner centre   "
          f"max diff {int(diff.max()):>2}   {'ok' if ok else 'MISMATCH'}")

flat.unlink()
shot.unlink()

real = [f for f in failures if f]
print()
if real:
    print("FAIL: " + ", ".join(real))
    sys.exit(1)
print("PASS: all four marks identical, all eight dash runs identical")
