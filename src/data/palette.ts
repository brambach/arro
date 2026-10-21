/**
 * The member colors the server hands out in join order (API.md, create_family):
 * lake, brass, heather, moss, lingonberry, ember. Mirrored from the database so
 * the phone can color people it made up itself (someone invited by name, the
 * preview family). The values live with the other colors in src/theme/.
 */
import { memberPalette } from '../theme/tokens';

export const MEMBER_PALETTE = memberPalette;

export function paletteColor(index: number): string {
  return MEMBER_PALETTE[((index % MEMBER_PALETTE.length) + MEMBER_PALETTE.length) % MEMBER_PALETTE.length];
}
