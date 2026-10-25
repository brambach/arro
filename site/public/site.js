// Loaded in <head>, before the first paint. Marks the page as running JS so
// the settle and the window can start from their still frame.
const root = document.documentElement;
root.classList.add('js');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Nothing moves until the fonts are ready and plate 1 is decoded, or 1.5 s
// has passed, so a slow font or image never holds the page. Then two
// frames, and html.lit lights the window and starts the steam. html.go
// starts the join and 404 settle a beat later.
const HOLD_MS = 200;
const domReady = new Promise((resolve) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resolve, { once: true });
  else resolve();
});
Promise.race([
  Promise.all([
    document.fonts && document.fonts.ready,
    domReady.then(() => document.querySelector('.plate img')?.decode().catch(() => {})),
  ]),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]).then(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('lit');
    setTimeout(() => root.classList.add('go'), reduce ? 0 : HOLD_MS);
  }));
});

// Ambient loops hold still while paused (html.still), while the tab is
// hidden (html.away) and while their section is off screen (.off).
document.addEventListener('visibilitychange', () => root.classList.toggle('away', document.hidden));
domReady.then(() => {
  const pause = document.querySelector('.pause');
  pause?.addEventListener('click', () => {
    pause.firstChild.textContent = root.classList.toggle('still') ? 'play' : 'pause';
  });
  if (!('IntersectionObserver' in window)) return;
  const shown = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('off', !e.isIntersecting);
  });
  for (const section of document.querySelectorAll('.loops')) shown.observe(section);
});

domReady.then(() => {
  // The wall's slats land once, the first time it's on screen.
  const wall = document.querySelector('.wall');
  if (wall) {
    if (reduce || !('IntersectionObserver' in window)) {
      wall.classList.add('in');
    } else {
      const seen = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        wall.classList.add('in');
      }, { threshold: 0.35 });
      seen.observe(wall);
    }
  }
});

// Waitlist forms post with fetch and answer in place. 200 and 201 read the
// same, so the page never says whether an email was already on the list.
// The error lines live once, in the page's #join-bad and #join-later (the
// no-JS path shows those with :target).
const SHARE = { title: 'Saunafam', text: 'Keep a sauna streak together.', url: 'https://saunafam.com' };
const outcome = (status) => (status === 200 || status === 201 ? 'done' : status === 400 ? 'bad' : 'later');

domReady.then(() => {
  for (const form of document.querySelectorAll('form.join')) {
    const { email, beta } = form.elements;
    const button = form.querySelector('[type=submit]');
    const error = form.querySelector('.join-error');
    const copied = form.querySelector('.join-copied');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = new URLSearchParams(new FormData(form));
      button.disabled = true;
      error.textContent = '';
      email.removeAttribute('aria-invalid');
      let result = 'later';
      try {
        const res = await fetch(form.action, { method: 'POST', body, headers: { Accept: 'application/json' } });
        result = outcome(res.status);
      } catch {}
      button.disabled = false;
      if (result === 'done') {
        form.querySelector('.join-beta').hidden = !beta.checked;
        form.classList.add('done');
        form.querySelector('.join-done-title').focus();
        return;
      }
      if (result === 'bad') email.setAttribute('aria-invalid', 'true');
      error.textContent = document.getElementById(`join-${result}`).textContent;
    });

    form.querySelector('.join-share').addEventListener('click', () => {
      if (navigator.share) return navigator.share(SHARE).catch(() => {});
      navigator.clipboard?.writeText(SHARE.url).then(() => { copied.textContent = 'Link copied'; }, () => {});
    });
  }
});
