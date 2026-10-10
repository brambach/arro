// Loaded in <head>. Marks the page as running JS (so .reveal can start
// hidden), then plays each .reveal once when it scrolls into view.
document.documentElement.classList.add('js');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wrap each word of a [data-words] heading so it can rise from behind a
// clip. Keeps <em> and other inline tags around their words.
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.append(part); continue; }
          const word = document.createElement('span');
          word.className = 'word';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--i', i++);
          word.append(inner);
          frag.append(word);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(el);
}

// The day card acts out a day once it's in view: You, Dad and Nan check in,
// Mum still has today for a moment, then she moves and the streak goes up.
function prepareDay(card) {
  const rows = [...card.querySelectorAll('li')];
  card.classList.add('instant');
  rows.forEach((row) => row.classList.remove('is-kept'));
  void card.offsetWidth;
  card.classList.remove('instant');
  return rows;
}

function playDay(card, rows) {
  const at = (ms, fn) => setTimeout(fn, ms);
  const checkIn = (row) => {
    row.classList.add('is-kept', 'just');
    at(520, () => row.classList.remove('just'));
  };
  const mum = rows[rows.length - 1];
  at(900, () => checkIn(rows[0]));
  at(1500, () => checkIn(rows[1]));
  at(2100, () => checkIn(rows[2]));
  // Mum still has today. Hold here long enough to read it.
  at(4600, () => {
    mum.querySelector('.act')?.classList.add('on');
    checkIn(mum);
  });
  at(5300, () => card.querySelector('.roll')?.classList.add('on'));
  at(5800, () => {
    card.querySelector('.day-done')?.classList.add('on');
    card.setAttribute('aria-label', "An example family's day in Arro: everyone has moved, and the family streak is now 25 days.");
  });
}

// The contour map, alive. The same field as contours.svg (the still tile the
// page falls back to), traced afresh on a canvas fixed behind the page: each
// wave turns slowly, so the lines drift and reshape like a tide map. The
// field is sampled at page coordinates, so the map scrolls with the page.
// Around 20 frames a second while still, every frame while scrolling, and
// nothing while the tab is hidden. With Reduce Motion it never starts.
// FIELD start: written by scenes/contours.mjs, don't edit by hand.
const FIELD = {"size":960,"levels":18,"lo":-1.7487,"hi":2.283,"lineWidth":1.3,"indexWidth":2.2,"waves":[[-4,-1,0.09,1.6765,0.0232],[-1,1,0.5548,4.1273,0.0216],[-3,-4,0.0648,0.2381,0.0196],[3,-3,0.0857,3.5076,0.0372],[0,-4,0.0947,1.0077,0.0268],[1,-4,0.09,0.1451,0.0195],[-3,-3,0.0857,1.5862,-0.0243],[-4,2,0.0784,4.9719,-0.0263],[0,1,1,1.7335,-0.017],[4,-2,0.0784,0.6508,0.0417],[2,-2,0.1708,4.9471,-0.0203],[-3,-3,0.0857,6.1871,0.035],[4,-2,0.0784,6.1142,0.0426],[-4,2,0.0784,5.9543,-0.0312],[-3,-2,0.113,5.9977,0.0311],[-3,4,0.0648,4.11,-0.0307],[3,-2,0.113,1.8817,0.0224],[-1,2,0.2546,5.1819,0.0271],[-4,0,0.0947,2.8875,0.031],[2,2,0.1708,1.1416,-0.0364],[2,0,0.3078,3.4487,-0.018],[4,4,0.0526,3.0281,0.0299]]};
// FIELD end

// Marching squares: for each cell's corner pattern (bit 1 top-left, 2
// top-right, 4 bottom-right, 8 bottom-left above the level), the edges its
// line crosses, in pairs. Edges: 0 top, 1 right, 2 bottom, 3 left.
const CROSS = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2],
  [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], []];
// Loops with fewer points than this are specks where a bump just pokes over a
// level. They'd flicker in and out as the map moves, so they're left out.
const SPECK = 6;

// Traces every level of a grid of heights into whole lines: cell crossings
// chained end to end. Returns [level, closed, x0, y0, x1, y1, ...] for each.
function traceLines(grid, nx, ny, cell, yOff, lo, step, levels) {
  const at = new Map();
  const adj = new Map();
  const join = (p, q) => {
    const a = adj.get(p);
    if (a) a.push(q); else adj.set(p, [q]);
    const b = adj.get(q);
    if (b) b.push(p); else adj.set(q, [p]);
  };
  for (let j = 0; j < ny - 1; j++) {
    const o = j * nx;
    const y0 = j * cell - yOff;
    for (let i = 0; i < nx - 1; i++) {
      const a = grid[o + i];
      const b = grid[o + i + 1];
      const c = grid[o + nx + i + 1];
      const d = grid[o + nx + i];
      const from = Math.max(0, Math.ceil((Math.min(a, b, c, d) - lo) / step - 0.5));
      const to = Math.min(levels - 1, Math.ceil((Math.max(a, b, c, d) - lo) / step - 0.5) - 1);
      const x0 = i * cell;
      for (let k = from; k <= to; k++) {
        const v = lo + step * (k + 0.5);
        // Each crossing is keyed by its grid edge and level, so the two cells
        // either side of an edge find the same point.
        const point = (side) => {
          let key, x, y;
          switch (side) {
            case 0: key = (o + i) * 2; x = x0 + (cell * (v - a)) / (b - a); y = y0; break;
            case 1: key = (o + i + 1) * 2 + 1; x = x0 + cell; y = y0 + (cell * (v - b)) / (c - b); break;
            case 2: key = (o + nx + i) * 2; x = x0 + (cell * (v - d)) / (c - d); y = y0 + cell; break;
            default: key = (o + i) * 2 + 1; x = x0; y = y0 + (cell * (v - a)) / (d - a);
          }
          key = key * levels + k;
          if (!at.has(key)) at.set(key, [x, y]);
          return key;
        };
        const pairs = CROSS[(a > v) | ((b > v) << 1) | ((c > v) << 2) | ((d > v) << 3)];
        for (let e = 0; e < pairs.length; e += 2) join(point(pairs[e]), point(pairs[e + 1]));
      }
    }
  }
  const seen = new Set();
  const lines = [];
  const walk = (start, closed) => {
    const line = [start % levels, closed];
    let cur = start;
    while (cur !== undefined) {
      seen.add(cur);
      line.push(...at.get(cur));
      cur = adj.get(cur).find((n) => !seen.has(n));
    }
    if (!closed || line.length >= 2 + SPECK * 2) lines.push(line);
  };
  // Lines that run off the grid first (they have a loose end), then loops.
  for (const [key, ns] of adj) if (ns.length === 1 && !seen.has(key)) walk(key, false);
  for (const key of adj.keys()) if (!seen.has(key)) walk(key, true);
  return lines;
}

// Smooth curves through a line's points: quadratic curves between midpoints.
function curve(path, line) {
  const closed = line[1];
  const n = (line.length - 2) / 2;
  const x = (i) => line[2 + 2 * (i % n)];
  const y = (i) => line[3 + 2 * (i % n)];
  if (n < 3) {
    path.moveTo(x(0), y(0));
    for (let i = 1; i < n; i++) path.lineTo(x(i), y(i));
    return;
  }
  if (closed) {
    path.moveTo((x(n - 1) + x(0)) / 2, (y(n - 1) + y(0)) / 2);
    for (let i = 0; i < n; i++) path.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2);
    path.closePath();
    return;
  }
  path.moveTo(x(0), y(0));
  for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2);
  path.lineTo(x(n - 1), y(n - 1));
}

function liveMap() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx || !FIELD.waves) return;
  canvas.className = 'map';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  document.documentElement.classList.add('live-map');

  const { waves, lo, hi, levels } = FIELD;
  const step = (hi - lo) / levels;
  const TAU = Math.PI * 2;
  let w, h, dpr, tile, cell, nx, ny, sx, cx, grid, line, index;

  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // Same tile sizes as body::before in styles.css.
    tile = w >= 900 ? 720 : 520;
    cell = w >= 900 ? 9 : 7;
    line = (FIELD.lineWidth * tile) / FIELD.size;
    index = (FIELD.indexWidth * tile) / FIELD.size;
    nx = Math.ceil(w / cell) + 1;
    ny = Math.ceil(h / cell) + 2;
    // sin(X + Y) = sin X cos Y + cos X sin Y: the x half only changes with
    // the width, so it's worked out here once per wave.
    sx = waves.map(([kx]) => Float32Array.from({ length: nx }, (_, i) => Math.sin((TAU * kx * i * cell) / tile)));
    cx = waves.map(([kx]) => Float32Array.from({ length: nx }, (_, i) => Math.cos((TAU * kx * i * cell) / tile)));
    grid = new Float32Array(nx * ny);
  };

  const draw = (t) => {
    const top = Math.floor(scrollY / cell);
    const shift = scrollY - top * cell;
    grid.fill(0);
    waves.forEach(([, ky, a, p, s], k) => {
      const sxk = sx[k];
      const cxk = cx[k];
      for (let j = 0; j < ny; j++) {
        const y = TAU * ky * ((top + j) * cell) / tile + p + s * t;
        const ac = a * Math.cos(y);
        const as = a * Math.sin(y);
        const o = j * nx;
        for (let i = 0; i < nx; i++) grid[o + i] += ac * sxk[i] + as * cxk[i];
      }
    });

    const paths = [new Path2D(), new Path2D()];
    for (const l of traceLines(grid, nx, ny, cell, shift, lo, step, levels)) {
      curve(paths[l[0] % 4 === 3 ? 1 : 0], l);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#463219';
    ctx.lineCap = 'round';
    ctx.lineWidth = line;
    ctx.stroke(paths[0]);
    ctx.lineWidth = index;
    ctx.stroke(paths[1]);
  };

  size();
  let start = null;
  let last = -1e9;
  let moved = true;
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (start === null) start = now;
    if (!moved && now - last < 50) return;
    moved = false;
    last = now;
    draw((now - start) / 1000);
  };
  addEventListener('scroll', () => { moved = true; }, { passive: true });
  addEventListener('resize', () => { size(); moved = true; });
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  // Opened straight from the folder (file://), folder links like
  // "privacy/" show a directory, so point them at the index.html inside.
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href$="/"], a[href="./"]').forEach((a) => {
      a.setAttribute('href', a.getAttribute('href') + 'index.html');
    });
  }

  // The header turns to glass once the page has moved under it.
  const header = document.querySelector('.site-header');
  if (header) {
    const stick = () => header.classList.toggle('is-stuck', scrollY > 8);
    addEventListener('scroll', stick, { passive: true });
    stick();
  }

  const items = document.querySelectorAll('.reveal');
  const card = document.querySelector('.day');

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
  } else {
    document.querySelectorAll('[data-words]').forEach(splitWords);
    // Stagger index for groups that arrive as a wave.
    for (const sel of ['.steps li', '.feature', '.ticket-code i']) {
      document.querySelectorAll(sel).forEach((el, i) => el.style.setProperty('--i', i));
    }
    // The family week fills column by column, each row a beat behind.
    document.querySelectorAll('.fam-week .fw-row:not(.fw-days)').forEach((row, r) => {
      row.querySelectorAll('.c').forEach((cell, i) => {
        cell.style.setProperty('--i', i);
        cell.style.setProperty('--r', r);
      });
    });
    // A vignette's parts follow their card's own delay.
    document.querySelectorAll('.feature').forEach((f, i) => {
      [...f.querySelectorAll('.vignette > *')].forEach((el, j) => {
        el.style.setProperty('--i', i);
        el.style.setProperty('--j', j);
      });
    });
    const rows = card ? prepareDay(card) : null;

    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((el) => seen.observe(el));

    // The day plays once the card is mostly on screen, so on a phone it
    // waits until you've scrolled to it.
    if (card) {
      const watch = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        watch.disconnect();
        playDay(card, rows);
      }, { threshold: 0.9 });
      watch.observe(card);
    }
  }

  if (!reduce) liveMap();

  // Join page: show the code when the link carries one, as
  // /join/ABC234 (phase 5 invite links) or /join/?code=ABC234.
  const out = document.getElementById('invite-code');
  if (out) {
    const fromPath = location.pathname.match(/^\/join\/([A-Za-z0-9]{4,12})\/?$/);
    const raw = fromPath ? fromPath[1] : new URLSearchParams(location.search).get('code') || '';
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (code.length >= 4) {
      out.textContent = code;
      out.closest('[hidden]')?.removeAttribute('hidden');
    }
  }
});
