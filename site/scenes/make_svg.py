"""Draws the landing page's landscape layers as SVG, one file per layer.

The same hills at dawn and at dusk. Ridges come from seeded value noise, so
they're organic but the same every run. bake.mjs turns these into the WebP
layers in ../public/scenes/. Run: python3 make_svg.py && node bake.mjs
"""
import math, random, os

W, H = 2400, 600
HERE = os.path.dirname(os.path.abspath(__file__))


def noise1d(seed, n=64):
    rnd = random.Random(seed)
    vals = [rnd.random() * 2 - 1 for _ in range(n + 1)]
    def f(x):  # x in 0..1, smooth (cosine) interpolation, loops
        p = (x % 1) * n
        i = int(p)
        t = (1 - math.cos((p - i) * math.pi)) / 2
        return vals[i] * (1 - t) + vals[i + 1] * t
    return f


def ridge(base, octaves, seed, trees=0.0, step=3):
    """octaves: list of (period_px, amplitude_px). trees adds a fine,
    uneven canopy edge."""
    fs = [noise1d(seed * 31 + k, max(4, int(W / p) + 2)) for k, (p, _) in enumerate(octaves)]
    tree = noise1d(seed * 97, W // 9)
    tree2 = noise1d(seed * 53, W // 4)
    pts = []
    for x in range(0, W + step, step):
        y = base
        for f, (p, a) in zip(fs, octaves):
            y += f(x / W) * a
        if trees:
            # canopies: sharp-ish bumps, taller in clumps
            clump = (noise1d(seed * 7, 30)(x / W) + 1) / 2
            y -= abs(tree(x / W)) * trees * (0.4 + clump) + abs(tree2(x / W)) * trees * 0.5
        pts.append((x, y))
    d = 'M0 %.1f ' % pts[0][1] + ' '.join('L%d %.1f' % p for p in pts[1:])
    return d + ' L%d %d L0 %d Z' % (W, H, H)


PAL = {
    'dawn': dict(
        sky_top='#F5F1E8', sky_low='#F4DFC9', haze='#F1E3D3',
        sun=(1870, 330), sun_core='#FFF7EC', sun_glow='#FBE2C6', sun_r=34,
        far=('#D8D0C8', '#EADFD3'), mid=('#AFB6A3', '#DCD6C6'),
        near=('#7F8E74', '#93A086'), track=('#D6C9B2', '#C4B69C'),
    ),
    'dusk': dict(
        sky_top='#F5F1E8', sky_low='#EEC3A2', haze='#ECCBB2',
        sun=(560, 372), sun_core='#FCE1C4', sun_glow='#F0A679', sun_r=52,
        far=('#C9B3A4', '#E2C3AC'), mid=('#9C987F', '#CDBBA2'),
        near=('#6E7563', '#7F8571'), track=('#C9B59A', '#B49F84'),
    ),
}

GEO = {
    'far':  dict(base=330, oct=[(1400, 60), (520, 26), (170, 7)], seed=3, trees=2.5, blur=1.6),
    'mid':  dict(base=410, oct=[(1600, 46), (600, 22), (190, 8)], seed=8, trees=7, blur=0.7),
    'near': dict(base=492, oct=[(1900, 30), (700, 12), (230, 4)], seed=13, trees=3, blur=0.3),
}

TEXTURE = '''<filter id="tex" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="{fx} {fy}" numOctaves="4" seed="{seed}"/>
  <feColorMatrix type="matrix" values="0 0 0 0 {r}  0 0 0 0 {g}  0 0 0 0 {b}  0 0 0 {a} 0"/>
</filter>'''


def svg(body, defs=''):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
            '<defs>%s</defs>%s</svg>') % (W, H, W, H, defs, body)


def sky(p):
    sx, sy = p['sun']
    defs = f'''
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="{p['sky_top']}" stop-opacity="0"/>
  <stop offset="0.38" stop-color="{p['sky_top']}" stop-opacity="0.9"/>
  <stop offset="0.75" stop-color="{p['sky_low']}"/>
  <stop offset="1" stop-color="{p['haze']}"/>
</linearGradient>
<radialGradient id="glow" cx="{sx}" cy="{sy}" r="620" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="{p['sun_core']}" stop-opacity="1"/>
  <stop offset="0.08" stop-color="{p['sun_glow']}" stop-opacity="0.85"/>
  <stop offset="0.35" stop-color="{p['sun_glow']}" stop-opacity="0.32"/>
  <stop offset="1" stop-color="{p['sun_glow']}" stop-opacity="0"/>
</radialGradient>
<filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="cloud" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.0012 0.009" numOctaves="4" seed="21"/>
  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.93  0 0 0 1.1 -0.52"/>
  <feGaussianBlur stdDeviation="2"/>
</filter>
<linearGradient id="cloudmask" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0.2" stop-color="#fff" stop-opacity="0"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.8"/><stop offset="0.8" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="cm"><rect width="{W}" height="{H}" fill="url(#cloudmask)"/></mask>'''
    body = (f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
            f'<rect width="{W}" height="{H}" filter="url(#cloud)" mask="url(#cm)" opacity="0.55"/>'
            f'<rect width="{W}" height="{H}" fill="url(#glow)"/>'
            f'<circle cx="{sx}" cy="{sy}" r="{p["sun_r"]}" fill="{p["sun_core"]}" filter="url(#soft)"/>')
    return svg(body, defs)


def hill(p, name, layer):
    g = GEO[layer]
    top, low = p[layer]
    d = ridge(g['base'], g['oct'], g['seed'], g['trees'])
    tex_seed = g['seed'] + 40
    # fields: long horizontal streaks, darker toward the front
    strength = {'far': 0.10, 'mid': 0.22, 'near': 0.34}[layer]
    defs = f'''
<linearGradient id="fill" gradientUnits="userSpaceOnUse" x1="0" y1="{g['base']-70}" x2="0" y2="{H}">
  <stop offset="0" stop-color="{top}"/>
  <stop offset="1" stop-color="{low}"/>
</linearGradient>
<clipPath id="clip"><path d="{d}"/></clipPath>
<filter id="edge"><feGaussianBlur stdDeviation="{g['blur']}"/></filter>
{TEXTURE.format(fx=0.0016 if layer != 'near' else 0.0022, fy=0.05 if layer != 'near' else 0.11, seed=tex_seed, r=0.16, g=0.17, b=0.12, a=strength)}
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="{p['haze']}" stop-opacity="0"/>
  <stop offset="1" stop-color="{p['haze']}" stop-opacity="{0.75 if layer=='far' else 0.5 if layer=='mid' else 0.0}"/>
</linearGradient>'''
    # a lit edge along the ridge facing the sun
    body = (f'<g filter="url(#edge)"><path d="{d}" fill="url(#fill)"/></g>'
            f'<g clip-path="url(#clip)">'
            f'<rect width="{W}" height="{H}" filter="url(#tex)"/>'
            f'<rect y="{g["base"]-40}" width="{W}" height="{H-g["base"]+40}" fill="url(#mist)"/>')
    if layer == 'near':
        tl, tr = p['track']
        defs += f'''<linearGradient id="trk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{tl}" stop-opacity="0.35"/><stop offset="1" stop-color="{tr}" stop-opacity="0.85"/></linearGradient>
<filter id="trkblur"><feGaussianBlur stdDeviation="1.4"/></filter>'''
        cx = 1250
        body += (f'<path d="M{cx-150} {H} C {cx-60} 575, {cx+120} 556, {cx+70} 540 S {cx+120} 515, {cx+170} 505 '
                 f'L {cx+178} 505 C {cx+140} 517, {cx+100} 528, {cx+132} 542 S {cx+40} 580, {cx+60} {H} Z" '
                 f'fill="url(#trk)" filter="url(#trkblur)"/>')
    body += '</g>'
    return svg(body, defs)


for name, p in PAL.items():
    open(os.path.join(HERE, f'{name}-sky.svg'), 'w').write(sky(p))
    for layer in ('far', 'mid', 'near'):
        open(os.path.join(HERE, f'{name}-{layer}.svg'), 'w').write(hill(p, name, layer))
print('wrote', sorted(f for f in os.listdir(HERE) if f.endswith('.svg')))
