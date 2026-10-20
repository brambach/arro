#!/usr/bin/env python3
"""
Builds Saunafam's display type from the Fraunces variable font (SIL OFL).

    python3 scripts/brand/build-fonts.py

Needs Python fontTools (pip install fonttools). Writes:

- assets/fonts/FrauncesSoft-Regular.ttf and FrauncesSoft-SemiBold.ttf: static
  instances of the soft cut (SOFT 100, WONK 0) at weights 400 and 600, optical
  size 48 (between the 34 pt titles and the 96 pt timer). The expo-font plugin
  embeds them; iOS names them by the PostScript names below.
- src/theme/fontMetrics.ts: the digit and colon advance widths, so changing
  numbers can sit in fixed-width boxes (Fraunces has no tabular figures).
- assets/brand/wordmark.svg and src/components/brand/wordmarkPaths.ts: the
  lowercase "saunafam" outlined to paths, one path per letter with its x
  offset, so the splash can settle the letter spacing on the UI thread.

The source is assets/fonts/source/Fraunces-VF.ttf, from github.com/google/fonts
(ofl/fraunces). Run this again only if the source or the settings change.
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/fonts/source/Fraunces-VF.ttf"
OPSZ = 48
FAMILY = "Fraunces Soft"
INSTANCES = [
    # (weight, style name, PostScript name)
    (400, "Regular", "FrauncesSoft-Regular"),
    (600, "SemiBold", "FrauncesSoft-SemiBold"),
]
WORDMARK = "saunafam"
WORDMARK_WEIGHT = 600


def instance(weight: int) -> TTFont:
    font = TTFont(SOURCE)
    return instancer.instantiateVariableFont(
        font, {"opsz": OPSZ, "wght": weight, "SOFT": 100, "WONK": 0}, updateFontNames=False
    )


def rename(font: TTFont, style: str, ps: str) -> None:
    name = font["name"]
    # Drop the variable font's leftovers (named instances, STAT names) so the
    # static file only carries its own family and style.
    name.names = [r for r in name.names if r.nameID < 256]
    regular = style == "Regular"
    legacy_family = FAMILY if regular else f"{FAMILY} {style}"
    for pid, eid, lid in ((3, 1, 0x409), (1, 0, 0)):
        name.setName(legacy_family, 1, pid, eid, lid)
        name.setName("Regular", 2, pid, eid, lid)
        name.setName(f"{FAMILY} {style}", 4, pid, eid, lid)
        name.setName(ps, 6, pid, eid, lid)
        name.setName(f"{ps};opsz{OPSZ};SOFT100;WONK0", 3, pid, eid, lid)
        if not regular:
            name.setName(FAMILY, 16, pid, eid, lid)
            name.setName(style, 17, pid, eid, lid)
        else:
            name.removeNames(nameID=16)
            name.removeNames(nameID=17)
    for table in ("STAT", "fvar", "avar"):
        if table in font:
            del font[table]


def cmap_glyph(font: TTFont, ch: str) -> str:
    return font.getBestCmap()[ord(ch)]


def pair_kern(font: TTFont, left: str, right: str) -> int:
    """Horizontal kerning between two glyphs from the GPOS 'kern' feature (PairPos)."""
    gpos = font["GPOS"].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            lookups.update(fr.Feature.LookupListIndex)
    total = 0
    for li in sorted(lookups):
        lookup = gpos.LookupList.Lookup[li]
        subtables = lookup.SubTable
        if lookup.LookupType == 9:
            subtables = [s.ExtSubTable for s in subtables]
        for st in subtables:
            if getattr(st, "LookupType", 2) != 2 or left not in st.Coverage.glyphs:
                continue
            value = None
            if st.Format == 1:
                idx = st.Coverage.glyphs.index(left)
                for pvr in st.PairSet[idx].PairValueRecord:
                    if pvr.SecondGlyph == right:
                        value = pvr.Value1
                        break
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs.get(left, 0)
                c2 = st.ClassDef2.classDefs.get(right, 0)
                value = st.Class1Record[c1].Class2Record[c2].Value1
            if value is not None:
                total += getattr(value, "XAdvance", 0) or 0
                break  # first matching subtable wins within a lookup
    return total


def main() -> None:
    metrics = {}
    for weight, style, ps in INSTANCES:
        font = instance(weight)
        rename(font, style, ps)
        out = ROOT / f"assets/fonts/{ps}.ttf"
        font.save(out)
        upm = font["head"].unitsPerEm
        hmtx = font["hmtx"]
        digits = [hmtx[cmap_glyph(font, d)][0] for d in "0123456789"]
        metrics[style] = {
            "digit": max(digits) / upm,
            "colon": hmtx[cmap_glyph(font, ":")][0] / upm,
            "ascender": font["hhea"].ascent / upm,
            "descender": -font["hhea"].descent / upm,
        }
        print(f"wrote {out.relative_to(ROOT)}")

    write_metrics(metrics)
    write_wordmark()


def write_metrics(metrics: dict) -> None:
    lines = [
        "// Generated by scripts/brand/build-fonts.py. Don't edit by hand; run that instead.",
        "// Advance widths as a fraction of the font size, for fixed-width numerals.",
        "",
        "export const frauncesMetrics = {",
    ]
    for style, m in metrics.items():
        key = "regular" if style == "Regular" else "semibold"
        lines.append(
            f"  {key}: {{ digit: {m['digit']:.4f}, colon: {m['colon']:.4f}, "
            f"ascender: {m['ascender']:.4f}, descender: {m['descender']:.4f} }},"
        )
    lines += ["} as const;", ""]
    path = ROOT / "src/theme/fontMetrics.ts"
    path.write_text("\n".join(lines))
    print(f"wrote {path.relative_to(ROOT)}")


def write_wordmark() -> None:
    from fontTools.pens.boundsPen import BoundsPen

    font = instance(WORDMARK_WEIGHT)
    upm = font["head"].unitsPerEm
    glyphs = font.getGlyphSet()
    hmtx = font["hmtx"]
    scale = 100.0 / upm  # path units: 100 per em
    names = [cmap_glyph(font, ch) for ch in WORDMARK]

    # Pen positions in font units, kerning included.
    pens = []
    x = 0
    for i, gname in enumerate(names):
        pens.append(x)
        advance = hmtx[gname][0]
        if i + 1 < len(names):
            advance += pair_kern(font, gname, names[i + 1])
        x += advance

    # Ink box of the whole word, so the outputs crop tight.
    xs, ys = [], []
    for gname, px in zip(names, pens):
        bp = BoundsPen(glyphs)
        glyphs[gname].draw(bp)
        if bp.bounds:
            xs += [px + bp.bounds[0], px + bp.bounds[2]]
            ys += [bp.bounds[1], bp.bounds[3]]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    width = round((x1 - x0) * scale, 2)
    height = round((y1 - y0) * scale, 2)
    baseline = round(y1 * scale, 2)  # distance from the top of the ink box

    def num(v: float) -> str:
        return f"{v:.2f}".rstrip("0").rstrip(".")

    letters = []
    for ch, gname, px in zip(WORDMARK, names, pens):
        pen = SVGPathPen(glyphs, ntos=num)
        # Letter-local coordinates: flipped to y down, top of the ink box at 0.
        glyphs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, 0, y1 * scale)))
        letters.append({"ch": ch, "x": round((px - x0) * scale, 2), "d": pen.getCommands()})

    paths = "\n".join(f'    <path transform="translate({num(l["x"])} 0)" d="{l["d"]}"/>' for l in letters)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(width)} {num(height)}" '
        f'width="{width * 4:.0f}" height="{height * 4:.0f}">\n'
        f"  <title>saunafam</title>\n"
        f'  <g fill="#221F1C">\n{paths}\n  </g>\n</svg>\n'
    )
    out = ROOT / "assets/brand/wordmark.svg"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg)
    print(f"wrote {out.relative_to(ROOT)}")

    ts = [
        "// Generated by scripts/brand/build-fonts.py. Don't edit by hand; run that instead.",
        f'// The wordmark "{WORDMARK}" in Fraunces Soft {WORDMARK_WEIGHT}, outlined, cropped to its ink.',
        "// Units: 100 per em. Each letter is its own path at its own x, so the splash",
        "// can settle the letter spacing on the UI thread.",
        "",
        "export const wordmark = {",
        f"  width: {num(width)},",
        f"  height: {num(height)},",
        "  /** Baseline, down from the top of the ink box. */",
        f"  baseline: {num(baseline)},",
        "  /** Units per em, so a size in points converts: scale = fontSize / em. */",
        "  em: 100,",
        "  letters: [",
    ]
    for l in letters:
        ts.append(f"    {{ ch: '{l['ch']}', x: {num(l['x'])}, d: '{l['d']}' }},")
    ts += ["  ],", "} as const;", ""]
    tsp = ROOT / "src/components/brand/wordmarkPaths.ts"
    tsp.parent.mkdir(parents=True, exist_ok=True)
    tsp.write_text("\n".join(ts))
    print(f"wrote {tsp.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
