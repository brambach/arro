/**
 * The Plus sheet's state machine (spec, "Every state of the Plus sheet").
 *
 * The phase is what this phone is doing right now: loading prices, buying,
 * waiting for Ask to Buy, waiting for the server, restoring. What the family
 * has comes from the server (view.plus) and wins: the sheet never shows Plus
 * as on because of a local purchase. A purchase only moves the sheet to
 * "Finishing up..." until family_plus agrees.
 *
 * `buyWith` and `restoreWith` run a purchase or a restore against any
 * `Purchases` (the preview fake in Jest), then ask the server through
 * `confirm` (sync-plus, then family_plus).
 */
import type { PlusProduct, PlusStatus } from '../data/types';
import { shortDate } from './dates';
import type { PackageId, PlusOffering, Purchases } from './purchases';

export type PlusPick = 'annual' | 'lifetime';

/** What sync-plus said after a purchase or restore. */
export type SyncOutcome =
  /** The family's plan is this purchase now (or will be, once family_plus shows it). */
  | 'applied'
  /** The family already had Plus from someone else: the two-payers message. */
  | 'alreadyHad'
  /** No purchase on this Apple ID. */
  | 'nothing'
  /** The server or RevenueCat couldn't be reached. Plus turns on when the webhook arrives. */
  | 'unconfirmed';

export type BuyOutcome =
  | { status: 'purchased'; tip: boolean; sync: SyncOutcome | null; product: PlusProduct | null }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'offline' }
  | { status: 'failed'; message: string };

export type RestoreOutcome = 'restored' | 'alreadyHad' | 'nothing' | 'offline';

export type PlusPhase =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; note?: 'restoreNothing' | 'restoreOffline' | 'restored' }
  | { kind: 'purchasing'; pick: PlusPick }
  | { kind: 'pending' }
  | { kind: 'finishing'; product: PlusProduct; replacingYearly: boolean; slow: boolean }
  | { kind: 'success'; replacedYearly: boolean }
  | { kind: 'failed'; message: string }
  | { kind: 'restoring' }
  | { kind: 'alreadyHad' };

const PRODUCT: Record<PlusPick, PlusProduct> = { annual: 'saunafam.plus.annual', lifetime: 'saunafam.plus.lifetime' };

export function isTip(pkg: PackageId): boolean {
  return pkg.startsWith('tip_');
}

/** Sets the family on the purchase (for the webhook), buys, then asks the server. */
export async function buyWith(
  store: Purchases,
  pkg: PackageId,
  familyId: string | null,
  confirm: () => Promise<SyncOutcome>,
): Promise<BuyOutcome> {
  if (familyId) await store.setFamily(familyId).catch(() => undefined);
  const r = await store.purchase(pkg);
  if (r.status !== 'purchased') return r;
  if (isTip(pkg)) return { status: 'purchased', tip: true, sync: null, product: null };
  const sync = await confirm().catch((): SyncOutcome => 'unconfirmed');
  return { status: 'purchased', tip: false, sync, product: pkg === 'lifetime' ? PRODUCT.lifetime : PRODUCT.annual };
}

/** Restores with the store, then asks the server whose plan the family has. */
export async function restoreWith(store: Purchases, confirm: () => Promise<SyncOutcome>): Promise<RestoreOutcome> {
  const r = await store.restore();
  if (r.status === 'nothing') return 'nothing';
  if (r.status !== 'restored') return 'offline';
  const sync = await confirm().catch((): SyncOutcome => 'unconfirmed');
  if (sync === 'nothing') return 'nothing';
  if (sync === 'alreadyHad') return 'alreadyHad';
  if (sync === 'unconfirmed') return 'offline';
  return 'restored';
}

/** After the offering loads (or doesn't). */
export function phaseAfterOffering(offering: PlusOffering | null): PlusPhase {
  return offering && (offering.annual || offering.lifetime) ? { kind: 'ready' } : { kind: 'unavailable' };
}

/**
 * After a Plus purchase. A cancel goes straight back to ready, with no message.
 * `hadYearly`: the family already had a yearly plan this person pays for (the
 * "Yearly, then Founding family" reminder).
 */
export function phaseAfterBuy(outcome: BuyOutcome, hadYearly = false): PlusPhase {
  switch (outcome.status) {
    case 'cancelled':
      return { kind: 'ready' };
    case 'pending':
      return { kind: 'pending' };
    case 'offline':
      return { kind: 'failed', message: PLUS_COPY.offlineBuy };
    case 'failed':
      return { kind: 'failed', message: outcome.message };
    case 'purchased':
      if (outcome.sync === 'alreadyHad') return { kind: 'alreadyHad' };
      return {
        kind: 'finishing',
        product: outcome.product ?? PRODUCT.annual,
        replacingYearly: hadYearly && outcome.product === PRODUCT.lifetime,
        slow: false,
      };
  }
}

export function phaseAfterRestore(outcome: RestoreOutcome): PlusPhase {
  switch (outcome) {
    case 'restored':
      return { kind: 'ready', note: 'restored' };
    case 'alreadyHad':
      return { kind: 'alreadyHad' };
    case 'nothing':
      return { kind: 'ready', note: 'restoreNothing' };
    default:
      return { kind: 'ready', note: 'restoreOffline' };
  }
}

/**
 * The server has spoken. "Finishing up..." becomes success once family_plus
 * shows the product that was bought (Founding family over yearly counts too).
 */
export function phaseWithServer(phase: PlusPhase, plus: Pick<PlusStatus, 'active' | 'product'>): PlusPhase {
  if (phase.kind !== 'finishing' || !plus.active) return phase;
  if (phase.product === PRODUCT.lifetime && plus.product !== PRODUCT.lifetime) return phase;
  return { kind: 'success', replacedYearly: phase.replacingYearly };
}

/** Still waiting for the server after a while: say so, and let them close it. */
export const FINISHING_SLOW_MS = 20_000;

/** Which block the sheet draws. Each one has a screenshot in INDEX.md. */
export type SheetState =
  | 'loading'
  | 'unavailable'
  | 'readyYearly'
  | 'readyFounding'
  | 'purchasing'
  | 'pending'
  | 'finishing'
  | 'success'
  | 'failed'
  | 'ownedByMe'
  | 'ownedByOther'
  | 'restoring'
  | 'restoreNothing'
  | 'lapsed'
  | 'alreadyHad';

export type PlusView = Pick<PlusStatus, 'active' | 'product' | 'status' | 'expiresAt' | 'payerName' | 'payerIsMe'>;

/** A plan that ended (or a refund): Settings' line, and the sheet's lapsed state. */
export function hasLapsed(plus: PlusView): boolean {
  return !plus.active && !!plus.status && plus.status !== 'trial' && plus.status !== 'active';
}

/**
 * The block to draw. The phone's own phase wins while something is in flight
 * (or just finished); otherwise what the family has decides: Plus from you,
 * Plus from someone else, a plan that lapsed, or the price choice.
 */
export function sheetState(phase: PlusPhase, plus: PlusView, pick: PlusPick): SheetState {
  switch (phase.kind) {
    case 'purchasing':
      return 'purchasing';
    case 'pending':
      return 'pending';
    case 'finishing':
      return 'finishing';
    case 'success':
      return 'success';
    case 'alreadyHad':
      return 'alreadyHad';
    case 'restoring':
      return 'restoring';
    default:
      break;
  }
  if (plus.active) return plus.payerIsMe ? 'ownedByMe' : 'ownedByOther';
  if (phase.kind === 'loading') return 'loading';
  if (phase.kind === 'unavailable') return 'unavailable';
  if (phase.kind === 'failed') return 'failed';
  if (phase.kind === 'ready' && phase.note === 'restoreNothing') return 'restoreNothing';
  if (hasLapsed(plus)) return 'lapsed';
  return pick === 'annual' ? 'readyYearly' : 'readyFounding';
}

/** Whether the price tiles and the buy button show. Hidden once the family has Plus. */
export function canBuy(state: SheetState): boolean {
  return ['readyYearly', 'readyFounding', 'purchasing', 'failed', 'restoreNothing', 'lapsed', 'finishing', 'loading', 'restoring'].includes(state);
}

/**
 * Every Plus string on the sheet. The spec's copy is used word for word where
 * it gives one ("Copy tone"); the rest follows it. Also in design/copy/app-copy.md.
 */
export const PLUS_COPY = {
  title: 'Saunafam Plus',
  lead: 'The streak is free, for everyone, for good. Plus is for families who’d like a little more from the wall.',
  covers: (family: string) => `One purchase covers everyone in ${family}. Nobody else pays.`,
  features: {
    woods: { title: 'Cedar, alder and charred pine walls', body: 'Pick the wood once and everyone’s wall changes.' },
    timerFace: { title: 'Coal and Brass timer faces', body: 'Each person picks their own.' },
    appIcon: { title: 'New app icons', body: 'Night stone, Cedar and Lake.' },
    everyWeek: { title: 'Every week you’ve kept', body: 'History back to your first week, not just the last 12.' },
    heatLog: { title: 'Your family’s heat log', body: 'Hours by month, where and how you sauna, your best run.' },
    poster: { title: 'A poster of your wall', body: 'Every week with your family’s name, ready to print.' },
  },
  yearlyName: 'Yearly',
  yearlyPrice: (price: string) => `${price} a year`,
  foundingName: 'Founding family',
  foundingPrice: (price: string) => `${price} once`,
  buy: (pick: PlusPick, price: string) => (pick === 'annual' ? `Get Plus for ${price} a year` : `Get Plus for ${price} once`),
  buying: 'Waiting for the App Store',
  finishing: 'Finishing up...',
  finishingSlow: 'Still finishing up. Plus turns on for everyone as soon as Apple confirms it, so you can close this.',
  notNow: 'Not now',
  smallPrintYearly: 'Renews every year until you cancel. Cancel anytime in Settings, Apple ID, Subscriptions.',
  smallPrintFounding: 'One payment. No renewal.',
  restore: 'Restore purchases',
  restoring: 'Restoring...',
  terms: 'Terms',
  privacy: 'Privacy',
  signOff: 'Saunafam is made by one person. Plus helps keep the heat on. Thank you. Bryce',
  unavailable: 'Can’t reach the App Store right now',
  unavailableBody: 'Everything else in Saunafam works as normal.',
  tryAgain: 'Try again',
  offlineBuy: 'Couldn’t reach the App Store. You haven’t been charged. Try again.',
  pendingTitle: 'Waiting for approval',
  pendingBody: 'Someone in your Apple family needs to approve this. Plus turns on for everyone once they do.',
  success: 'Thank you. The wall is yours.',
  successBody: (family: string) => `Everyone in ${family} has Plus now.`,
  replacedYearly:
    'Founding family replaces your yearly plan. Cancel the yearly one in Settings, Apple ID, Subscriptions, so it doesn’t renew.',
  done: 'Done',
  ownedByMe: (family: string) => `Plus is on for ${family}. You pay for it. Thank you.`,
  ownedByMeFounding: (family: string) => `${family} is a Founding family. Plus is yours for good. Thank you.`,
  renews: (date: string) => `Renews on ${date}.`,
  ends: (date: string) => `Ends on ${date}. It won’t renew.`,
  manage: 'Manage',
  makeFounding: (price: string) => `Make it Founding family, ${price} once`,
  ownedByOther: (name: string) => `Plus, from ${name}. Thank you.`,
  ownedByOtherNoName: (family: string) => `${family} has Plus. Thank you.`,
  restored: (family: string) => `Plus restored for ${family}.`,
  restoreNothing: 'No purchases found for this Apple ID.',
  restoreOffline: 'Couldn’t reach the App Store. Try again.',
  alreadyHad:
    'Your family already had Plus. You can cancel yours in Settings, Apple ID, Subscriptions, and ask Apple for a refund at reportaproblem.apple.com.',
  lapsed: (date: string) => `Plus ended on ${date}. The wall is back to birch. Everything you logged is still here.`,
  lapsedNoDate: 'Plus has ended. The wall is back to birch. Everything you logged is still here.',
  tipsTitle: 'Leave a tip',
  tipsBody: 'A thank you, nothing more. Tips don’t unlock anything.',
  tips: { tip_small: 'A ladle', tip_medium: 'A bucket', tip_large: 'An armful of birch' } as Record<'tip_small' | 'tip_medium' | 'tip_large', string>,
  tipThanks: 'Thank you. That means a lot.',
  tipFailed: 'That tip didn’t go through. You haven’t been charged.',
  close: 'Close',
};

/** The date line under "Plus is on", for the payer of a yearly plan. */
export function renewalLine(plus: PlusView): string | null {
  if (plus.product !== 'saunafam.plus.annual' || !plus.expiresAt) return null;
  const date = shortDate(plus.expiresAt.slice(0, 10));
  return plus.status === 'cancelled' ? PLUS_COPY.ends(date) : PLUS_COPY.renews(date);
}

/** The lapsed line: "Plus ended on Oct 3. ..." */
export function lapsedLine(plus: PlusView): string {
  return plus.expiresAt ? PLUS_COPY.lapsed(shortDate(plus.expiresAt.slice(0, 10))) : PLUS_COPY.lapsedNoDate;
}
