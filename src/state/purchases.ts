/**
 * In-app purchases behind one interface (spec, "Paid tier", "Where things live").
 *
 *   * PreviewPurchases: a fake for the Prototype preview, the web build, Jest and
 *     Expo Go. It can be told to succeed, fail, cancel, go pending (Ask to Buy),
 *     find nothing on restore, or be offline. The sheet shows "Preview, no real
 *     purchase" while it's in use.
 *   * RevenueCatPurchases: the real one, over react-native-purchases. It's only
 *     made, and the SDK only configured, when app_config.plus_enabled is true,
 *     the build has EXPO_PUBLIC_REVENUECAT_IOS_KEY, it's iOS and not Expo Go
 *     (createPurchases). With plus_enabled false nothing about purchases runs.
 *
 * The app never decides Plus from what this says. After a purchase or restore
 * it calls sync-plus and then family_plus (backend.ts); a "purchased" result only
 * lets the sheet say "Finishing up..." until the server agrees.
 */

export type PackageId = 'annual' | 'lifetime' | 'tip_small' | 'tip_medium' | 'tip_large';

export interface PlusPackage {
  id: PackageId;
  productId: string;
  /** From the offering, never hard-coded: "$24.99". */
  priceString: string;
}

export interface PlusOffering {
  annual: PlusPackage | null;
  lifetime: PlusPackage | null;
  tips: PlusPackage[];
}

export type PurchaseResult =
  | { status: 'purchased'; productId?: string }
  | { status: 'cancelled' }
  /** Ask to Buy: "Waiting for approval". */
  | { status: 'pending' }
  | { status: 'offline' }
  | { status: 'failed'; message: string };

export type RestoreResult = { status: 'restored' } | { status: 'nothing' } | { status: 'offline' } | { status: 'failed'; message: string };

export interface Purchases {
  /** RevenueCat's app user id is the Supabase auth user id. */
  logIn(userId: string): Promise<void>;
  logOut(): Promise<void>;
  /** Null when the App Store can't be reached ("Can't reach the App Store right now"). */
  getOffering(): Promise<PlusOffering | null>;
  /** The family the purchase is for, read by the webhook. Set just before buying. */
  setFamily(familyId: string): Promise<void>;
  purchase(packageId: PackageId): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
}

/** The small label on the Plus sheet while the fake store is in use. */
export const PREVIEW_LABEL = 'Preview, no real purchase';

/** What the preview's fake store does next. */
export type PreviewBehavior = 'succeed' | 'fail' | 'cancel' | 'pending' | 'nothingToRestore' | 'offline';

export const PREVIEW_OFFERING: PlusOffering = {
  annual: { id: 'annual', productId: 'saunafam.plus.annual', priceString: '$24.99' },
  lifetime: { id: 'lifetime', productId: 'saunafam.plus.lifetime', priceString: '$59.99' },
  tips: [
    { id: 'tip_small', productId: 'saunafam.tip.small', priceString: '$1.99' },
    { id: 'tip_medium', productId: 'saunafam.tip.medium', priceString: '$4.99' },
    { id: 'tip_large', productId: 'saunafam.tip.large', priceString: '$9.99' },
  ],
};

export class PreviewPurchases implements Purchases {
  readonly kind = 'preview' as const;
  userId: string | null = null;
  familyId: string | null = null;
  /** Packages bought in this preview, for restore. */
  owned = new Set<PackageId>();

  constructor(
    public behavior: PreviewBehavior = 'succeed',
    private delayMs = 0,
  ) {}

  setBehavior(behavior: PreviewBehavior): void {
    this.behavior = behavior;
  }

  /** How long each answer takes, so the loading and purchasing states can be seen. */
  setDelay(ms: number): void {
    this.delayMs = Math.max(0, ms);
  }

  private wait(): Promise<void> {
    return this.delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, this.delayMs)) : Promise.resolve();
  }

  async logIn(userId: string): Promise<void> {
    this.userId = userId;
  }

  async logOut(): Promise<void> {
    this.userId = null;
    this.owned.clear();
  }

  async getOffering(): Promise<PlusOffering | null> {
    await this.wait();
    return this.behavior === 'offline' ? null : PREVIEW_OFFERING;
  }

  async setFamily(familyId: string): Promise<void> {
    this.familyId = familyId;
  }

  async purchase(packageId: PackageId): Promise<PurchaseResult> {
    await this.wait();
    switch (this.behavior) {
      case 'cancel':
        return { status: 'cancelled' };
      case 'pending':
        return { status: 'pending' };
      case 'offline':
        return { status: 'offline' };
      case 'fail':
        return { status: 'failed', message: 'The purchase didn’t go through.' };
      default:
        if (!packageId.startsWith('tip_')) this.owned.add(packageId);
        return { status: 'purchased', productId: PREVIEW_OFFERING[packageId === 'annual' ? 'annual' : 'lifetime']?.productId };
    }
  }

  async restore(): Promise<RestoreResult> {
    await this.wait();
    if (this.behavior === 'offline') return { status: 'offline' };
    if (this.behavior === 'fail') return { status: 'failed', message: 'Couldn’t reach the App Store. Try again.' };
    if (this.behavior === 'nothingToRestore' || !this.owned.size) return { status: 'nothing' };
    return { status: 'restored' };
  }
}

// ─── RevenueCat ─────────────────────────────────────────────────────────────

/** The parts of react-native-purchases this file uses, so it can be loaded lazily (and faked in Jest). */
export interface RevenueCatSdk {
  configure(config: { apiKey: string; appUserID?: string | null }): void;
  logIn(appUserID: string): Promise<unknown>;
  logOut(): Promise<unknown>;
  isAnonymous(): Promise<boolean>;
  getOfferings(): Promise<{ all: Record<string, RcOffering | undefined>; current: RcOffering | null }>;
  setAttributes(attributes: Record<string, string | null>): Promise<void>;
  purchasePackage(pkg: RcPackage): Promise<{ productIdentifier: string; customerInfo: RcCustomerInfo }>;
  restorePurchases(): Promise<RcCustomerInfo>;
}
export interface RcPackage {
  identifier: string;
  product: { identifier: string; priceString: string };
}
export interface RcOffering {
  identifier: string;
  availablePackages: RcPackage[];
  annual: RcPackage | null;
  lifetime: RcPackage | null;
}
export interface RcCustomerInfo {
  entitlements: { active: Record<string, unknown> };
  activeSubscriptions: string[];
  nonSubscriptionTransactions: { productIdentifier: string }[];
}

/** RevenueCat's error codes the sheet tells apart (PURCHASES_ERROR_CODE). */
const RC = { cancelled: '1', storeProblem: '2', notAllowed: '3', network: '10', pending: '20', offline: '35' } as const;

/** The one entitlement, attached to both Plus products. Tips have none. */
export const PLUS_ENTITLEMENT = 'plus';
const PLUS_PRODUCTS = ['saunafam.plus.annual', 'saunafam.plus.lifetime'];

/** RevenueCat's standard package ids, and the plain ones the spec names. */
const PACKAGE_IDS: Record<PackageId, string[]> = {
  annual: ['annual', '$rc_annual'],
  lifetime: ['lifetime', '$rc_lifetime'],
  tip_small: ['tip_small'],
  tip_medium: ['tip_medium'],
  tip_large: ['tip_large'],
};

function codeOf(e: unknown): string | null {
  return e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : null;
}

/** Owns Plus on this Apple ID: the entitlement, or either product in the receipt. */
export function ownsPlus(info: RcCustomerInfo): boolean {
  if (info.entitlements.active[PLUS_ENTITLEMENT]) return true;
  if (info.activeSubscriptions.some((id) => PLUS_PRODUCTS.includes(id))) return true;
  return info.nonSubscriptionTransactions.some((t) => PLUS_PRODUCTS.includes(t.productIdentifier));
}

/**
 * The real store. Prices come only from the `default` offering. It never says
 * whether the family has Plus: AppState calls sync-plus after a purchase or a
 * restore, then family_plus.
 */
export class RevenueCatPurchases implements Purchases {
  readonly kind = 'store' as const;
  private offering: RcOffering | null = null;

  constructor(
    private sdk: RevenueCatSdk,
    apiKey: string,
    appUserId: string | null,
  ) {
    // The key is never logged or shown.
    sdk.configure({ apiKey, appUserID: appUserId });
  }

  async logIn(userId: string): Promise<void> {
    await this.sdk.logIn(userId);
  }

  async logOut(): Promise<void> {
    // logOut throws for an anonymous user; there's nothing to do then.
    if (await this.sdk.isAnonymous().catch(() => true)) return;
    await this.sdk.logOut();
  }

  async getOffering(): Promise<PlusOffering | null> {
    try {
      const all = await this.sdk.getOfferings();
      const o = all.all.default ?? all.current;
      if (!o) return null;
      this.offering = o;
      const find = (id: PackageId): PlusPackage | null => {
        const pkg = o.availablePackages.find((p) => PACKAGE_IDS[id].includes(p.identifier)) ?? (id === 'annual' ? o.annual : id === 'lifetime' ? o.lifetime : null);
        return pkg ? { id, productId: pkg.product.identifier, priceString: pkg.product.priceString } : null;
      };
      return {
        annual: find('annual'),
        lifetime: find('lifetime'),
        tips: (['tip_small', 'tip_medium', 'tip_large'] as const).map(find).filter((p): p is PlusPackage => !!p),
      };
    } catch {
      return null;
    }
  }

  async setFamily(familyId: string): Promise<void> {
    await this.sdk.setAttributes({ family_id: familyId });
  }

  async purchase(packageId: PackageId): Promise<PurchaseResult> {
    const pkg = this.offering?.availablePackages.find((p) => PACKAGE_IDS[packageId].includes(p.identifier));
    if (!pkg) return { status: 'offline' };
    try {
      const r = await this.sdk.purchasePackage(pkg);
      return { status: 'purchased', productId: r.productIdentifier };
    } catch (e) {
      const code = codeOf(e);
      if (code === RC.cancelled) return { status: 'cancelled' };
      if (code === RC.pending) return { status: 'pending' };
      if (code === RC.network || code === RC.offline) return { status: 'offline' };
      if (code === RC.notAllowed) return { status: 'failed', message: 'Purchases are turned off on this iPhone. You can allow them in Screen Time.' };
      return { status: 'failed', message: 'The purchase didn’t go through. You haven’t been charged.' };
    }
  }

  async restore(): Promise<RestoreResult> {
    try {
      const info = await this.sdk.restorePurchases();
      return ownsPlus(info) ? { status: 'restored' } : { status: 'nothing' };
    } catch (e) {
      const code = codeOf(e);
      if (code === RC.network || code === RC.offline || code === RC.storeProblem) return { status: 'offline' };
      return { status: 'failed', message: 'Couldn’t reach the App Store. Try again.' };
    }
  }
}

export type PurchasesKind = 'store' | 'preview';

export interface PurchasesEnv {
  plusEnabled: boolean;
  /** EXPO_PUBLIC_REVENUECAT_IOS_KEY. */
  apiKey?: string | null;
  platform: string;
  /** Expo Go has no native module: preview. */
  expoGo: boolean;
  /** The signed-in Supabase auth user, used as RevenueCat's app user id. */
  userId?: string | null;
  /** Loads react-native-purchases; null when the native module isn't in this build. */
  loadSdk: () => RevenueCatSdk | null;
}

/**
 * The purchases implementation for this phone. The real store only when Plus
 * is switched on and everything it needs is here; otherwise the preview fake.
 * With plus_enabled false, react-native-purchases is never loaded or
 * configured, so build 9 as shipped makes no RevenueCat call at all.
 */
export function createPurchases(env?: PurchasesEnv): Purchases & { kind: PurchasesKind } {
  if (!env || !env.plusEnabled || !env.apiKey || env.platform !== 'ios' || env.expoGo) return new PreviewPurchases();
  try {
    const sdk = env.loadSdk();
    return sdk ? new RevenueCatPurchases(sdk, env.apiKey, env.userId ?? null) : new PreviewPurchases();
  } catch {
    return new PreviewPurchases();
  }
}
