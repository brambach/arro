/* The page's backdrop, the way trydervo.com draws its own: a soft mesh of
   Arro's paper colours (warm cream, a little apricot, sage, a pale evening
   blue, all pulled toward paper) on one fixed canvas behind the whole page,
   drifting very slowly. Drawn with Paper Shaders
   (vendor/paper-shaders-0.0.81.min.js, Apache-2.0, licence in licenses/).
   Without WebGL or this script the page keeps its paper and warm light.
   Reduced motion keeps the mesh still, and a hidden tab doesn't draw at all.
   The app's Backdrop (src/components/Backdrop.tsx) uses the same colours. */
(() => {
  const P = window.PaperShaders;
  if (!P) return;
  const color = (c) => P.getShaderColorFromString(c);
  const sizing = { u_fit: 2, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0, u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const DRIFT = 0.06;

  const start = () => {
    const host = document.createElement('div');
    host.className = 'backdrop-mesh';
    host.setAttribute('aria-hidden', 'true');
    document.body.prepend(host);
    let mesh;
    try {
      mesh = new P.ShaderMount(host, P.meshGradientFragmentShader, {
        ...sizing,
        u_colors: ['#F5F1E8', '#ECEAE6', '#F3E5D6', '#E9ECE1', '#F5F1E8', '#EFE2D1'].map(color),
        u_colorsCount: 6,
        u_distortion: 0.55,
        u_swirl: 0.12,
        u_grainMixer: 0.06,
        u_grainOverlay: 0.05,
      }, { alpha: true, premultipliedAlpha: true }, reduced.matches ? 0 : DRIFT, 8000, 1, 1600 * 1000);
    } catch (e) {
      host.remove();
      return;
    }
    document.body.classList.add('has-mesh');
    const sync = () => mesh.setSpeed(reduced.matches || document.hidden ? 0 : DRIFT);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
