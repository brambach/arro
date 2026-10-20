/**
 * In-app purchases behind one interface (spec, "Paid tier", "Where things live").
 *
 *   * PreviewPurchases: a fake for the Prototype preview, the web build, Jest and
 *     Expo Go. It can be told to succeed, fail, cancel, go pending (Ask to Buy),
 *     find nothing on restore, or be offline.
 *   * RevenueCatPurchases: the real one, over react-native-purchases. It comes in
 *     M15. The seam is createPurchases() below: return it there when the native
 *     module is present and plus_enabled is on.
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
  | { status: 'purchased' }
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
        return { status: 'purchased' };
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

/**
 * The purchases implementation for this build. M15: return a RevenueCatPurchases
 * here when `react-native-purchases` is installed and its native module exists.
 */
export function createPurchases(): Purchases {
  return new PreviewPurchases();
}
