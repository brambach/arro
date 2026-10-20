import { useCallback, useState } from 'react';
import { useApp } from './AppState';
import { inviteLink, inviteMessage, shareInvite } from './invite';

/**
 * The invite step, shared by onboarding and the in-app Invite screen: open the share
 * sheet with the prefilled message, and remember who it was for (optional) as an
 * invited-but-not-joined member.
 */
export function useSendInvite() {
  const { session, view, draft, addInvite } = useApp();
  const [name, setName] = useState('');
  const [fallback, setFallback] = useState<string | null>(null);

  const sender = session && view ? view.me.name : draft.name || 'Someone';
  const family = session && view ? view.familyName : draft.familyName || 'our family';
  const code = session && view ? view.joinCode : draft.joinCode;
  const message = inviteMessage(sender, family, code);
  const link = inviteLink(code);

  /** Remember who the invite was for. */
  const commit = useCallback(async () => {
    if (name.trim()) await addInvite(name);
    setName('');
    setFallback(null);
  }, [name, addInvite]);

  /** Opens the share sheet. True once it was sent. Where there's no share sheet (web preview) it shows the message instead. */
  const send = useCallback(async () => {
    const result = await shareInvite(message, link);
    if (result === 'unavailable') {
      setFallback(`${message} ${link}`);
      return false;
    }
    if (result === 'dismissed') return false;
    await commit();
    return true;
  }, [message, link, commit]);

  return { name, setName, code, message, link, fallback, send, commit };
}
