/**
 * Where each week sits on the wall poster (src/components/WallPoster.tsx).
 * Pure, so it's tested: every week gets a slot inside the wall area, in
 * columns of 13 (a quarter), oldest at the top left, reading down.
 */
export type PosterWeek = 'kept' | 'frozen' | 'open' | 'paused';

export const WEEKS_PER_COLUMN = 13;

export interface PosterLayout {
  slots: { x: number; y: number; w: number; h: number }[];
  columns: number;
  /** The family name's size: smaller for a long name. */
  titleSize: (chars: number) => number;
}

export function posterLayout(count: number, width: number, height: number): PosterLayout {
  const side = 150;
  const top = 430;
  const bottom = height - 400;
  const columns = Math.max(1, Math.ceil(count / WEEKS_PER_COLUMN));
  const colGap = columns > 8 ? 16 : 36;
  const colW = Math.min(420, (width - side * 2 - colGap * (columns - 1)) / columns);
  const wallW = colW * columns + colGap * (columns - 1);
  const left = (width - wallW) / 2;
  const rowGap = 16;
  const h = Math.min(72, (bottom - top - rowGap * (WEEKS_PER_COLUMN - 1)) / WEEKS_PER_COLUMN);
  const wallH = h * WEEKS_PER_COLUMN + rowGap * (WEEKS_PER_COLUMN - 1);
  const y0 = top + (bottom - top - wallH) / 2;
  const slots = Array.from({ length: count }, (_, i) => {
    const col = Math.floor(i / WEEKS_PER_COLUMN);
    const row = i % WEEKS_PER_COLUMN;
    return { x: left + col * (colW + colGap), y: y0 + row * (h + rowGap), w: colW, h };
  });
  return {
    slots,
    columns,
    titleSize: (chars) => (chars > 22 ? 84 : chars > 14 ? 104 : 128),
  };
}
