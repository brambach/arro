#!/usr/bin/env python3
"""Dither a grayscale render to a 1-bit palette PNG: index 0 paper (transparent), index 1 ink.

python3 site/scenes/dither.py --algo atkinson|bayer4 --ink '#7A4E2E' [--invert] [--paper '#EFE6D8'] in.png out.png

--invert maps dark source to paper, so the light parts of a night scene become ink.
"""
import argparse
import os
import sys

from PIL import Image

BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

# Atkinson spreads 6/8 of the error, so highlights stay clean and shadows go solid.
ATKINSON = [(1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)]


def atkinson(lum, w, h):
    buf = [v / 255 for v in lum]
    ink = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            old = buf[i]
            new = 1.0 if old >= 0.5 else 0.0
            ink[i] = 0 if new else 1
            err = (old - new) / 8
            for dx, dy in ATKINSON:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and ny < h:
                    buf[ny * w + nx] += err
    return ink


def bayer4(lum, w, h):
    ink = bytearray(w * h)
    for y in range(h):
        row = BAYER4[y % 4]
        for x in range(w):
            ink[y * w + x] = 1 if lum[y * w + x] < (row[x % 4] + 0.5) * 16 else 0
    return ink


ALGOS = {"atkinson": atkinson, "bayer4": bayer4}


def rgb(hex_color):
    h = hex_color.lstrip("#")
    if len(h) != 6:
        raise argparse.ArgumentTypeError(f"expected #RRGGBB, got {hex_color}")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--algo", choices=sorted(ALGOS), required=True)
    ap.add_argument("--ink", type=rgb, required=True)
    ap.add_argument("--paper", type=rgb, help="palette color under the transparent index (default birch, char with --invert)")
    ap.add_argument("--invert", action="store_true")
    ap.add_argument("src")
    ap.add_argument("dst")
    args = ap.parse_args()
    paper = args.paper or rgb("#221F1C" if args.invert else "#EFE6D8")

    src = Image.open(args.src).convert("L")
    w, h = src.size
    lum = list(src.tobytes())
    if args.invert:
        lum = [255 - v for v in lum]

    out = Image.frombytes("P", (w, h), bytes(ALGOS[args.algo](lum, w, h)))
    out.putpalette(paper + args.ink)
    out.save(args.dst, format="PNG", bits=1, optimize=True, transparency=0)
    print(f"{args.dst} {w}x{h} {os.path.getsize(args.dst)} bytes")


if __name__ == "__main__":
    sys.exit(main())
