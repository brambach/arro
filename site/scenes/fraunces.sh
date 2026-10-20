#!/usr/bin/env bash
# Builds public/fonts/fraunces-soft.woff2: Fraunces pinned to the soft cut
# (SOFT 100, WONK 0), weight 400 to 600 and optical size 9 to 144 kept as
# variable axes, Latin only. About 35 KB.
#
# Needs fonttools and brotli (pip install fonttools brotli; a venv is fine).
# Usage: site/scenes/fraunces.sh path/to/Fraunces[SOFT,WONK,opsz,wght].ttf
# The source font is from https://github.com/google/fonts/tree/main/ofl/fraunces
# (SIL OFL 1.1, licence in public/licenses/Fraunces-OFL.txt).
set -euo pipefail
src="$1"
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
fonttools varLib.instancer -q "$src" SOFT=100 WONK=0 opsz=9:144 wght=400:600 -o "$tmp/inst.ttf"
pyftsubset "$tmp/inst.ttf" \
  --unicodes="U+0020-007E,U+00A0,U+00B0,U+00B7,U+00C4,U+00D6,U+00E4,U+00F6,U+2019,U+201C,U+201D,U+2026" \
  --layout-features="kern,liga,lnum,pnum,tnum" \
  --flavor=woff2 \
  --output-file="$here/../public/fonts/fraunces-soft.woff2"
rm -rf "$tmp"
ls -l "$here/../public/fonts/fraunces-soft.woff2"
