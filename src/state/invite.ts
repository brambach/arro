import { Share } from 'react-native';

/**
 * The invite link. arrofamily.com/join/<code> shows the code and how to get Arro.
 * Once phase 5's universal links are set up, it opens the app straight to joining.
 */
export function inviteLink(code: string): string {
  return `https://arrofamily.com/join/${code}`;
}

/** The join code in an invite link (/join/ABC234 or ?code=ABC234), or null. */
export function joinCodeFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/join\/([A-Za-z0-9]{4,12})\/?(?:[?#].*)?$/) ?? url.match(/[?&]code=([A-Za-z0-9]{4,12})/);
  return m ? m[1].toUpperCase() : null;
}

export function inviteMessage(senderName: string, familyName: string, code: string): string {
  return (
    `${senderName} invited you to ${familyName} on Arro. We keep one daily streak by moving a little, any way we like.\n\n` +
    `Here’s how to join: ${inviteLink(code)}\n` +
    `Your code: ${code}`
  );
}

/** Opens the share sheet. 'unavailable' on web, where the preview has no share sheet. */
export async function shareInvite(message: string): Promise<'shared' | 'dismissed' | 'unavailable'> {
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
