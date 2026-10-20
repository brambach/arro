/**
 * The member colors the server hands out in join order (API.md, create_family):
 * lake, brass, heather, moss, lingonberry, ember. This is data, mirrored from the
 * database so the phone can color people it made up itself (someone invited by
 * name, the preview family). Styling colors live in src/theme/.
 */
export const MEMBER_PALETTE = ['#5F8794', '#B58A3C', '#7B6A93', '#6E7F5C', '#B66A78', '#C9542A'] as const;

export function paletteColor(index: number): string {
  return MEMBER_PALETTE[((index % MEMBER_PALETTE.length) + MEMBER_PALETTE.length) % MEMBER_PALETTE.length];
}
