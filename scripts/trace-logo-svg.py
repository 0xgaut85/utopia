"""Vectorise public/logo-utopia.png into a clean SVG (public/logo-utopia.svg).

The mark is a flat, single-colour silhouette with a hole in the middle, which is
the ideal case for tracing. We build a smooth darkness field from the PNG, run
marching squares at the 0.5 iso-level to get sub-pixel contours, stitch the
segments into closed loops, simplify them with Ramer-Douglas-Peucker, and emit
an SVG whose outer loop + inner hole use fill-rule="evenodd" so three.js'
SVGLoader reconstructs the hole automatically.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "logo-utopia.png"
DEST = ROOT / "public" / "logo-utopia.svg"

MAX_DIM = 512          # downscale for speed; plenty of fidelity for extrusion
LEVEL = 0.5            # iso-level of the darkness field
RDP_EPSILON = 0.6      # simplification tolerance in (downscaled) pixels
VIEWBOX = 100.0        # final normalised coordinate space


def load_field() -> np.ndarray:
    img = Image.open(SRC).convert("RGBA")
    scale = min(1.0, MAX_DIM / max(img.size))
    if scale < 1.0:
        img = img.resize(
            (round(img.size[0] * scale), round(img.size[1] * scale)),
            Image.LANCZOS,
        )
    arr = np.asarray(img).astype(np.float32)
    rgb, alpha = arr[..., :3], arr[..., 3] / 255.0
    lum = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]) / 255.0
    # Darkness where the mark is, gated by alpha so transparent areas read as empty.
    field = (1.0 - lum) * alpha
    # pad with zeros so contours always close inside the grid
    return np.pad(field, 1, mode="constant", constant_values=0.0)


def interp(p_lo, p_hi, v_lo, v_hi):
    t = (LEVEL - v_lo) / (v_hi - v_lo) if v_hi != v_lo else 0.5
    return p_lo + t * (p_hi - p_lo)


def marching_squares(field: np.ndarray):
    h, w = field.shape
    segments = []
    for y in range(h - 1):
        row0, row1 = field[y], field[y + 1]
        for x in range(w - 1):
            tl, tr = row0[x], row0[x + 1]
            bl, br = row1[x], row1[x + 1]
            case = (
                (1 if tl > LEVEL else 0)
                | (2 if tr > LEVEL else 0)
                | (4 if br > LEVEL else 0)
                | (8 if bl > LEVEL else 0)
            )
            if case == 0 or case == 15:
                continue
            # Edge crossing points (top, right, bottom, left) in (x, y) space.
            top = (interp(x, x + 1, tl, tr), y)
            right = (x + 1, interp(y, y + 1, tr, br))
            bottom = (interp(x, x + 1, bl, br), y + 1)
            left = (x, interp(y, y + 1, tl, bl))

            if case in (1, 14):
                segments.append((left, top))
            elif case in (2, 13):
                segments.append((top, right))
            elif case in (3, 12):
                segments.append((left, right))
            elif case in (4, 11):
                segments.append((right, bottom))
            elif case in (6, 9):
                segments.append((top, bottom))
            elif case in (7, 8):
                segments.append((left, bottom))
            elif case == 5:
                center = (tl + tr + br + bl) / 4.0
                if center > LEVEL:
                    segments.append((left, top))
                    segments.append((right, bottom))
                else:
                    segments.append((left, bottom))
                    segments.append((top, right))
            elif case == 10:
                center = (tl + tr + br + bl) / 4.0
                if center > LEVEL:
                    segments.append((top, right))
                    segments.append((left, bottom))
                else:
                    segments.append((left, top))
                    segments.append((right, bottom))
    return segments


def stitch(segments, tol=1e-4):
    def key(pt):
        return (round(pt[0] / tol), round(pt[1] / tol))

    from collections import defaultdict

    adj = defaultdict(list)
    for a, b in segments:
        adj[key(a)].append((key(b), b))
        adj[key(b)].append((key(a), a))

    visited_edges = set()
    loops = []
    for a, b in segments:
        ka, kb = key(a), key(b)
        edge = tuple(sorted((ka, kb)))
        if edge in visited_edges:
            continue
        loop = [a]
        cur_k, cur_pt = ka, a
        prev_k = None
        while True:
            nxts = [(nk, np_) for nk, np_ in adj[cur_k] if nk != prev_k]
            if not nxts:
                break
            nk, npt = nxts[0]
            e = tuple(sorted((cur_k, nk)))
            if e in visited_edges:
                # try an unused edge instead
                fresh = [(k2, p2) for k2, p2 in adj[cur_k]
                         if tuple(sorted((cur_k, k2))) not in visited_edges]
                if not fresh:
                    break
                nk, npt = fresh[0]
                e = tuple(sorted((cur_k, nk)))
            visited_edges.add(e)
            loop.append(npt)
            prev_k, cur_k, cur_pt = cur_k, nk, npt
            if cur_k == ka:
                break
        if len(loop) >= 4:
            loops.append(loop)
    return loops


def rdp(points, eps):
    if len(points) < 3:
        return points
    start, end = np.array(points[0]), np.array(points[-1])
    line = end - start
    line_len = np.hypot(*line) or 1e-9
    dmax, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        p = np.array(points[i])
        d = abs(np.cross(line, p - start)) / line_len
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = rdp(points[: idx + 1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]


def rdp_closed(loop, eps):
    # RDP on a closed polygon: drop the duplicate closing vertex, split the ring
    # at the vertex farthest from the first, simplify both arcs, recombine.
    pts = loop[:-1] if len(loop) > 1 and loop[0] == loop[-1] else loop[:]
    if len(pts) < 4:
        return pts
    p0 = np.array(pts[0])
    far = max(range(len(pts)), key=lambda i: np.hypot(*(np.array(pts[i]) - p0)))
    arc1 = rdp(pts[: far + 1], eps)
    arc2 = rdp(pts[far:] + [pts[0]], eps)
    return arc1[:-1] + arc2[:-1]


def poly_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        a += x0 * y1 - x1 * y0
    return a / 2.0


def main():
    field = load_field()
    segs = marching_squares(field)
    loops = stitch(segs)
    loops = [rdp_closed(l, RDP_EPSILON) for l in loops]
    loops = [l for l in loops if len(l) >= 3 and abs(poly_area(l)) > 4.0]
    loops.sort(key=lambda l: abs(poly_area(l)), reverse=True)

    # Normalise to a centred VIEWBOX x VIEWBOX box, flipping Y for SVG.
    pts_all = np.concatenate([np.array(l) for l in loops])
    minxy = pts_all.min(axis=0)
    maxxy = pts_all.max(axis=0)
    span = (maxxy - minxy).max()
    scale = VIEWBOX / span
    off = (VIEWBOX - (maxxy - minxy) * scale) / 2.0

    def fmt(loop):
        d = []
        for i, (x, y) in enumerate(loop):
            nx = (x - minxy[0]) * scale + off[0]
            ny = (y - minxy[1]) * scale + off[1]
            d.append(f"{'M' if i == 0 else 'L'}{nx:.3f},{ny:.3f}")
        d.append("Z")
        return "".join(d)

    path_d = " ".join(fmt(l) for l in loops)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {VIEWBOX:.0f} {VIEWBOX:.0f}">'
        f'<path d="{path_d}" fill="#1c1c1c" fill-rule="evenodd"/></svg>'
    )
    DEST.write_text(svg, encoding="utf-8")
    print(f"loops kept   : {len(loops)} (points: {[len(l) for l in loops]})")
    print(f"written      : {DEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
