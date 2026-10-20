import { Share } from 'react-native';

/**
 * The invite link. The site serves /join/<code> with a link preview (M13). The
 * share sheet sends it as the link beside the message, so iMessage unfurls it.
 */
export function inviteLink(code: string): string {
  return `https://saunafam.com/join/${code}`;
}

export function inviteMessage(senderName: string, familyName: string, code: string): string {
  return (
    `${senderName} invited you to ${familyName} on Saunafam. We keep a weekly sauna streak together. ` +
    `Get Saunafam, tap ‘I have an invite’ and enter the code ${code}.`
  );
}

/** Opens the share sheet with the message and the join link. 'unavailable' on web, where the preview has no share sheet. */
export async function shareInvite(message: string, url?: string): Promise<'shared' | 'dismissed' | 'unavailable'> {
  try {
    const result = await Share.share(url ? { message, url } : { message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
