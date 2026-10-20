import { Share } from 'react-native';

/**
 * The invite link. The site serves /join/<code>; the message leaves it out until
 * saunafam.com is live (spec, section 3, "Invites").
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

/** Opens the share sheet. 'unavailable' on web, where the preview has no share sheet. */
export async function shareInvite(message: string): Promise<'shared' | 'dismissed' | 'unavailable'> {
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'unavailable';
  }
}
