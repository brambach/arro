// Loaded in <head>, before the first paint. Marks the page as running JS so
// the settle can start from its still frame, then waits for the fonts and
// one painted frame before anything moves.
const root = document.documentElement;
root.classList.add('js');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// .go starts the join and 404 settle and the ambient loops. Nothing moves
// until the fonts are ready (or 1.5 s has passed, so a slow font never
// holds the page). Then wait for a painted frame, hold for a beat, and go.
const HOLD_MS = 200;
const fontsReady = Promise.race([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]);
const domReady = new Promise((resolve) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resolve, { once: true });
  else resolve();
});
Promise.all([fontsReady, domReady]).then(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setTimeout(() => root.classList.add('go'), reduce ? 0 : HOLD_MS);
  }));
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
