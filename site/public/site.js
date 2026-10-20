// Loaded in <head>, before the first paint. Marks the page as running JS so
// the settle can start from its still frame, then waits for the fonts and
// one painted frame before anything moves.
const root = document.documentElement;
root.classList.add('js');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The first settle. Nothing moves until the fonts are ready (or 1.5 s has
// passed, so a slow font never holds the page). Then wait for a painted
// frame, and start on the one after it.
const fontsReady = Promise.race([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((resolve) => setTimeout(resolve, 1500)),
]);
const domReady = new Promise((resolve) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resolve, { once: true });
  else resolve();
});
Promise.all([fontsReady, domReady]).then(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('go')));
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
        // Wait for the first settle so two moves never overlap.
        const land = () => wall.classList.add('in');
        root.classList.contains('go') ? land() : setTimeout(land, 400);
      }, { threshold: 0.35 });
      seen.observe(wall);
    }
  }
});
