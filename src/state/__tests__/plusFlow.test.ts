// Runs with TZ=America/Los_Angeles (package.json "test").
// The Plus sheet's state machine against PreviewPurchases: every one of the 16
// states in the spec ("Every state of the Plus sheet"), restore's three results,
// tips, and prices that only ever come from the offering.
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NO_PLUS } from '../backend';
import {
  PLUS_COPY,
  PlusPhase,
  PlusView,
  SyncOutcome,
  buyWith,
  canBuy,
  hasLapsed,
  lapsedLine,
  phaseAfterBuy,
  phaseAfterOffering,
  phaseAfterRestore,
  phaseWithServer,
  renewalLine,
  restoreWith,
  sheetState,
} from '../plusFlow';
import { PREVIEW_LABEL, PREVIEW_OFFERING, PreviewPurchases, PurchasesSwitch, RevenueCatPurchases, RevenueCatSdk, createPurchases } from '../purchases';
import { restoreLine } from '../../screens/SettingsScreen';

const none: PlusView = { ...NO_PLUS };
const yearlyMine: PlusView = { ...NO_PLUS, active: true, product: 'saunafam.plus.annual', status: 'active', expiresAt: '2027-05-24T00:00:00Z', payerName: 'Sam', payerIsMe: true };
const fromMaya: PlusView = { ...NO_PLUS, active: true, product: 'saunafam.plus.annual', status: 'active', expiresAt: '2027-05-24T00:00:00Z', payerName: 'Maya', payerIsMe: false };
const lapsed: PlusView = { ...NO_PLUS, active: false, product: 'saunafam.plus.annual', status: 'expired', expiresAt: '2026-10-03T12:00:00Z', payerName: 'Maya', payerIsMe: false };

const applied = async (): Promise<SyncOutcome> => 'applied';

/** Runs a purchase through the fake store and the phase rules, as the sheet does. */
async function buy(behavior: ConstructorParameters<typeof PreviewPurchases>[0], pkg: 'annual' | 'lifetime' = 'annual', confirm = applied) {
  const store = new PreviewPurchases(behavior);
  const outcome = await buyWith(store, pkg, 'fam', confirm);
  return { store, outcome, phase: phaseAfterBuy(outcome) };
}

describe('every state of the Plus sheet', () => {
  it('1. loading prices', () => {
    expect(sheetState({ kind: 'loading' }, none, 'annual')).toBe('loading');
  });

  it('2. prices failed or offline', async () => {
    const offering = await new PreviewPurchases('offline').getOffering();
    expect(offering).toBeNull();
    expect(sheetState(phaseAfterOffering(offering), none, 'annual')).toBe('unavailable');
  });

  it('3 and 4. ready, yearly or Founding family picked', async () => {
    const phase = phaseAfterOffering(await new PreviewPurchases().getOffering());
    expect(sheetState(phase, none, 'annual')).toBe('readyYearly');
    expect(sheetState(phase, none, 'lifetime')).toBe('readyFounding');
  });

  it('5. purchasing: the sheet can still be closed (canBuy keeps the tiles)', () => {
    const s = sheetState({ kind: 'purchasing', pick: 'annual' }, none, 'annual');
    expect(s).toBe('purchasing');
    expect(canBuy(s)).toBe(true);
  });

  it('6. pending, Ask to Buy', async () => {
    const { phase } = await buy('pending');
    expect(sheetState(phase, none, 'annual')).toBe('pending');
  });

  it('7 and 8. finishing up until the server agrees, then success', async () => {
    const { phase, store } = await buy('succeed');
    expect(store.familyId).toBe('fam');
    expect(sheetState(phase, none, 'annual')).toBe('finishing');
    // The server hasn't caught up: still finishing.
    expect(phaseWithServer(phase, none)).toBe(phase);
    const done = phaseWithServer(phase, yearlyMine);
    expect(sheetState(done, yearlyMine, 'annual')).toBe('success');
  });

  it('8. Founding family waits for the Founding family product, not a yearly plan already there', async () => {
    const outcome = await buyWith(new PreviewPurchases(), 'lifetime', 'fam', applied);
    const phase = phaseAfterBuy(outcome, true);
    expect(phase).toMatchObject({ kind: 'finishing', replacingYearly: true });
    expect(phaseWithServer(phase, yearlyMine)).toBe(phase);
    expect(phaseWithServer(phase, { ...yearlyMine, product: 'saunafam.plus.lifetime' })).toEqual({ kind: 'success', replacedYearly: true });
  });

  it('9. cancelled by the user: back to ready, no message', async () => {
    const { phase } = await buy('cancel');
    expect(phase).toEqual({ kind: 'ready' });
    expect(sheetState(phase, none, 'annual')).toBe('readyYearly');
  });

  it('10. failed: a plain error and Try again', async () => {
    const { phase } = await buy('fail');
    expect(sheetState(phase, none, 'annual')).toBe('failed');
    expect(phase.kind === 'failed' && phase.message).toBe('The purchase didn’t go through. You haven’t been charged.');
    const offline = await buy('offline');
    expect(offline.phase).toEqual({ kind: 'failed', message: PLUS_COPY.offlineBuy });
  });

  it('11. the family has Plus and you pay: Manage, and the renewal date', () => {
    expect(sheetState({ kind: 'ready' }, yearlyMine, 'annual')).toBe('ownedByMe');
    expect(renewalLine(yearlyMine)).toBe('Renews on May 24.');
    expect(renewalLine({ ...yearlyMine, status: 'cancelled' })).toBe('Ends on May 24. It won’t renew.');
    expect(renewalLine({ ...yearlyMine, product: 'saunafam.plus.lifetime', expiresAt: null })).toBeNull();
    expect(canBuy('ownedByMe')).toBe(false);
  });

  it('12. Plus from someone else', () => {
    expect(sheetState({ kind: 'ready' }, fromMaya, 'annual')).toBe('ownedByOther');
    expect(PLUS_COPY.ownedByOther('Maya')).toBe('Plus, from Maya. Thank you.');
    expect(canBuy('ownedByOther')).toBe(false);
  });

  it('13. restoring', () => {
    expect(sheetState({ kind: 'restoring' }, none, 'annual')).toBe('restoring');
  });

  it('14. restore found nothing', async () => {
    const outcome = await restoreWith(new PreviewPurchases(), applied);
    expect(outcome).toBe('nothing');
    expect(sheetState(phaseAfterRestore(outcome), none, 'annual')).toBe('restoreNothing');
  });

  it('15. lapsed', () => {
    expect(hasLapsed(lapsed)).toBe(true);
    expect(sheetState({ kind: 'ready' }, lapsed, 'annual')).toBe('lapsed');
    expect(lapsedLine(lapsed)).toBe('Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here.');
    expect(hasLapsed(yearlyMine)).toBe(false);
  });

  it('16. preview mode: the fake store says so', () => {
    expect(PREVIEW_LABEL).toBe('Preview, no real purchase');
    expect(new PurchasesSwitch().kind).toBe('preview');
  });

  it('two payers: the family already had Plus', async () => {
    const { phase } = await buy('succeed', 'annual', async () => 'alreadyHad');
    expect(sheetState(phase, fromMaya, 'annual')).toBe('alreadyHad');
  });

  it('the server can’t be reached after paying: it keeps finishing (the webhook turns it on)', async () => {
    const { outcome } = await buy('succeed', 'annual', async () => {
      throw new Error('502');
    });
    expect(outcome).toMatchObject({ status: 'purchased', sync: 'unconfirmed' });
  });
});

describe('restore, on the sheet and in Settings', () => {
  it('has three results: restored, nothing, couldn’t reach the App Store', async () => {
    const store = new PreviewPurchases();
    await store.purchase('lifetime');
    expect(await restoreWith(store, applied)).toBe('restored');
    expect(restoreLine('restored', 'Sunday sauna')).toBe('Plus restored for Sunday sauna.');

    store.setBehavior('nothingToRestore');
    expect(await restoreWith(store, applied)).toBe('nothing');
    expect(restoreLine('nothing', 'Sunday sauna')).toBe('No purchases found for this Apple ID.');

    store.setBehavior('offline');
    expect(await restoreWith(store, applied)).toBe('offline');
    expect(restoreLine('offline', 'Sunday sauna')).toBe('Couldn’t reach the App Store. Try again.');
  });

  it('the server has the last word', async () => {
    const store = new PreviewPurchases();
    await store.purchase('annual');
    expect(await restoreWith(store, async () => 'nothing')).toBe('nothing');
    expect(await restoreWith(store, async () => 'alreadyHad')).toBe('alreadyHad');
    expect(await restoreWith(store, async () => 'unconfirmed')).toBe('offline');
    expect(phaseAfterRestore('restored')).toEqual({ kind: 'ready', note: 'restored' });
  });

  it('remembers Founding family over yearly', async () => {
    const store = new PreviewPurchases();
    await store.purchase('annual');
    expect(store.ownedPlus()).toBe('saunafam.plus.annual');
    await store.purchase('lifetime');
    expect(store.ownedPlus()).toBe('saunafam.plus.lifetime');
  });
});

describe('tips', () => {
  it('buy nothing and skip the server', async () => {
    let asked = false;
    const outcome = await buyWith(new PreviewPurchases(), 'tip_medium', 'fam', async () => {
      asked = true;
      return 'applied';
    });
    expect(outcome).toEqual({ status: 'purchased', tip: true, sync: null, product: null });
    expect(asked).toBe(false);
  });

  it('are the three the spec names, priced by the offering', () => {
    expect(PREVIEW_OFFERING.tips.map((t) => [PLUS_COPY.tips[t.id as 'tip_small'], t.priceString])).toEqual([
      ['A ladle', '$1.99'],
      ['A bucket', '$4.99'],
      ['An armful of birch', '$9.99'],
    ]);
  });
});

describe('prices', () => {
  it('come from the offering, never from the code', () => {
    expect(PLUS_COPY.buy('annual', '€27,99')).toBe('Get Plus for €27,99 a year');
    expect(PLUS_COPY.buy('lifetime', '$59.99')).toBe('Get Plus for $59.99 once');
    expect(PLUS_COPY.yearlyPrice('A$39.99')).toBe('A$39.99 a year');
    // No dollar amount in the sheet, the Plus copy or the flow: only PreviewPurchases has them.
    for (const file of ['../../screens/PlusSheetScreen.tsx', '../plusFlow.ts', '../../screens/SettingsScreen.tsx', '../../screens/HeatLogScreen.tsx']) {
      expect(readFileSync(join(__dirname, file), 'utf8')).not.toMatch(/\$\d/);
    }
  });

  it('read RevenueCat’s offering, with its own price strings', async () => {
    const pkg = (identifier: string, id: string, priceString: string) => ({ identifier, product: { identifier: id, priceString } });
    const offering = {
      identifier: 'default',
      availablePackages: [
        pkg('$rc_annual', 'saunafam.plus.annual', '€27,99'),
        pkg('$rc_lifetime', 'saunafam.plus.lifetime', '€64,99'),
        pkg('tip_small', 'saunafam.tip.small', '€1,99'),
      ],
      annual: null,
      lifetime: null,
    };
    const calls: string[] = [];
    const sdk: RevenueCatSdk = {
      configure: () => calls.push('configure'),
      logIn: async () => calls.push('logIn'),
      logOut: async () => calls.push('logOut'),
      isAnonymous: async () => false,
      getOfferings: async () => ({ all: { default: offering }, current: offering }),
      setAttributes: async (a) => void calls.push(`family:${a.family_id}`),
      purchasePackage: async (p) => ({ productIdentifier: p.product.identifier, customerInfo: { entitlements: { active: {} }, activeSubscriptions: [], nonSubscriptionTransactions: [] } }),
      restorePurchases: async () => ({ entitlements: { active: { plus: {} } }, activeSubscriptions: [], nonSubscriptionTransactions: [] }),
    };
    const store = new RevenueCatPurchases(sdk, 'key', 'user-1');
    const o = await store.getOffering();
    expect(o?.annual?.priceString).toBe('€27,99');
    expect(o?.lifetime?.priceString).toBe('€64,99');
    expect(o?.tips.map((t) => t.id)).toEqual(['tip_small']);
    expect(await buyWith(store, 'lifetime', 'fam', applied)).toMatchObject({ status: 'purchased', product: 'saunafam.plus.lifetime' });
    expect(calls).toContain('family:fam');
    expect(await store.restore()).toEqual({ status: 'restored' });
  });

  it('turn RevenueCat errors into the sheet’s states', async () => {
    const fail = (code: string): RevenueCatSdk => ({
      configure: () => undefined,
      logIn: async () => undefined,
      logOut: async () => undefined,
      isAnonymous: async () => true,
      getOfferings: async () => ({ all: { default: { identifier: 'default', availablePackages: [{ identifier: '$rc_annual', product: { identifier: 'saunafam.plus.annual', priceString: '$24.99' } }], annual: null, lifetime: null } }, current: null }),
      setAttributes: async () => undefined,
      purchasePackage: async () => {
        throw Object.assign(new Error('no'), { code });
      },
      restorePurchases: async () => {
        throw Object.assign(new Error('no'), { code });
      },
    });
    const statusFor = async (code: string) => {
      const s = new RevenueCatPurchases(fail(code), 'key', null);
      await s.getOffering();
      return (await s.purchase('annual')).status;
    };
    expect(await statusFor('1')).toBe('cancelled');
    expect(await statusFor('20')).toBe('pending');
    expect(await statusFor('10')).toBe('offline');
    expect(await statusFor('3')).toBe('failed');
    expect(await new RevenueCatPurchases(fail('35'), 'key', null).restore()).toEqual({ status: 'offline' });
  });
});

describe('RevenueCat only when Plus is switched on', () => {
  const env = { plusEnabled: true, apiKey: 'key', platform: 'ios', expoGo: false, userId: 'u', loadSdk: () => null };
  it('stays the fake with plus_enabled false, no key, Expo Go, the web, or no native module', () => {
    let loaded = 0;
    const loadSdk = () => {
      loaded += 1;
      return null;
    };
    expect(createPurchases({ ...env, plusEnabled: false, loadSdk }).kind).toBe('preview');
    expect(createPurchases({ ...env, apiKey: null, loadSdk }).kind).toBe('preview');
    expect(createPurchases({ ...env, expoGo: true, loadSdk }).kind).toBe('preview');
    expect(createPurchases({ ...env, platform: 'web', loadSdk }).kind).toBe('preview');
    // react-native-purchases isn't even loaded until everything else says yes.
    expect(loaded).toBe(0);
    expect(createPurchases({ ...env, loadSdk }).kind).toBe('preview');
    expect(loaded).toBe(1);
  });

  it('switches once Plus is on, and back to the fake for a preview scenario', () => {
    let configured = 0;
    const sdk = { configure: () => (configured += 1) } as unknown as RevenueCatSdk;
    const sw = new PurchasesSwitch();
    sw.update({ ...env, plusEnabled: false, loadSdk: () => sdk }, false);
    expect([sw.kind, configured]).toEqual(['preview', 0]);
    sw.update({ ...env, loadSdk: () => sdk }, false);
    expect([sw.kind, configured]).toEqual(['store', 1]);
    sw.update({ ...env, loadSdk: () => sdk }, true);
    expect(sw.kind).toBe('preview');
    sw.update({ ...env, loadSdk: () => sdk }, false);
    expect([sw.kind, configured]).toEqual(['store', 1]);
  });
});

describe('phases', () => {
  it('an offering with neither plan is unavailable', () => {
    expect(phaseAfterOffering({ annual: null, lifetime: null, tips: [] })).toEqual({ kind: 'unavailable' });
  });
  it('the server never turns a phone-only state into success', () => {
    const ready: PlusPhase = { kind: 'ready' };
    expect(phaseWithServer(ready, yearlyMine)).toBe(ready);
  });
});
