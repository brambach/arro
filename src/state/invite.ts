import { Share } from 'react-native';

/**
 * The invite link for phase 5's universal links. arrofamily.com is agreed but not
 * bought yet, so the message leaves it out until the link opens something.
 */
export function inviteLink(code: string): string {
  return `https://arrofamily.com/join/${code}`;
}

export function inviteMessage(senderName: string, familyName: string, code: string): string {
  return (
    `${senderName} invited you to ${familyName} on Arro. We keep one daily streak by moving a little, any way we like. ` +
    `Open Arro, tap “I have an invite” and enter the code ${code}.`
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
