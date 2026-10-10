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
