import { Share } from 'react-native';

/**
 * Placeholder invite link. arrofamily.com is agreed but not bought yet, and universal
 * links arrive in phase 5. The join code in the message works on its own.
 */
export function inviteLink(code: string): string {
  return `https://arrofamily.com/join/${code}`;
}

export function inviteMessage(senderName: string, familyName: string, code: string): string {
  return (
    `${senderName} invited you to ${familyName} on Arro. We keep one daily streak by moving a little, any way we like. ` +
    `Join here: ${inviteLink(code)} or open Arro and enter the code ${code}.`
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
