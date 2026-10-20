/**
 * Shared helpers for the brand scripts: render an SVG string to PNG with
 * resvg, and place a PNG inside another SVG (as an iOS-style rounded tile).
 */
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { repoRoot } from '../lib/load-theme.mjs';

export const fontFiles = [
  join(repoRoot, 'assets/fonts/FrauncesSoft-Regular.ttf'),
  join(repoRoot, 'assets/fonts/FrauncesSoft-SemiBold.ttf'),
];

/** Render an SVG string to a PNG buffer `size` pixels wide. */
export function png(svg, size) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles, loadSystemFonts: false },
  })
    .render()
    .asPng();
}

let clipId = 0;

/** An <image> of a PNG at (x, y), size x size, clipped to the iOS icon's rounded square (22.37% radius). */
export function rounded(pngBuffer, x, y, size, radiusShare = 0.2237) {
  const id = `ic${clipId++}`;
  const r = size * radiusShare;
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}"/></clipPath>` +
    `<image x="${x}" y="${y}" width="${size}" height="${size}" clip-path="url(#${id})" href="data:image/png;base64,${pngBuffer.toString('base64')}"/>`
  );
}

/** An <image> of a PNG, unclipped. */
export function image(pngBuffer, x, y, w, h) {
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${pngBuffer.toString('base64')}"/>`;
}
