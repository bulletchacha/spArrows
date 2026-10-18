import { track } from './analytics';
import { confirmDialog } from './dialog';

/** Catalog from PRD §10. Prices shown are placeholders until real store prices load. */
export const PRODUCTS = {
  remove_ads: { kind: 'non_consumable', price: '$9.99' },
  hints_10: { kind: 'consumable', price: '$1.99' },
  refill_hearts: { kind: 'consumable', price: '$1.99' },
  streak_freezer: { kind: 'consumable', price: '$1.49' },
  streak_fixer: { kind: 'consumable', price: '$4.99' },
} as const;

export type ProductId = keyof typeof PRODUCTS;

/**
 * Purchase facade. This development stand-in asks for confirmation and then
 * grants the item, so the shop flows can be tested end to end. Replace with
 * Google Play Billing / StoreKit 2 (e.g. expo-iap) plus server-side receipt
 * validation before release.
 */
export const IS_TEST_STORE = true;

export const purchases = {
  async purchase(id: ProductId): Promise<boolean> {
    const ok = await confirmDialog('Test purchase', `Simulate buying "${id}" for ${PRODUCTS[id].price}? No money is charged.`, 'Buy');
    if (ok) track('iap_purchase', { product: id });
    return ok;
  },

  /** Non-consumables the store says this account owns. */
  async restore(): Promise<ProductId[]> {
    return [];
  },
};
