import { CartItem } from '@/types/database';

export interface PromoRule {
  key: string;
  label: string;
  icon: string;
  buyCount: number;
  freeCount: number;
  threshold: number; // buyCount + freeCount
}

export interface PromoDiscountResult {
  totalPromoDiscount: number;
  appliedPromos: {
    rule: PromoRule;
    bundlesApplied: number;
    freeUnitsCount: number;
    discountAmount: number;
    nextTierNeeded: number; // additional plants needed for next free unit
    nextTierFreeCount: number; // how many free units next tier unlocks
  }[];
  // Map of cart item key `${item.product.id}-${item.variant?.id || 'default'}` to how many units are free
  freeUnitsMap: Record<string, number>;
}

/**
 * Returns an appropriate emoji icon for a promo rule
 */
export function getPromoIcon(buy: number, free: number): string {
  if (free >= buy) return '🔥'; // 50% or more free
  if (buy === 1 && free === 1) return '✨';
  if (buy === 2) return '🎁';
  if (buy === 4) return '🎉';
  if (buy === 6) return '🎊';
  if (buy === 3) return '🍀';
  return '🌿';
}

/**
 * Parses ANY text or tags (single or multiple comma/space/slash separated offers)
 * into a list of structured PromoRules.
 * Examples:
 * - "B4G1" -> [B4G1]
 * - "B2G2, B4G1, B6G2" -> [B2G2, B4G1, B6G2]
 * - "b2g2 / b4g1 / b6g2" -> [B2G2, B4G1, B6G2]
 * - "Buy 4 Get 1 Free, Buy 6 Get 2 Free" -> [B4G1, B6G2]
 */
export function parseAllPromoRules(promoStr?: string | null, isB1G1?: boolean | null): PromoRule[] {
  const rules: PromoRule[] = [];
  const seenKeys = new Set<string>();

  if (isB1G1) {
    rules.push({
      key: 'B1G1',
      label: 'Buy 1 Get 1 Free',
      icon: '✨',
      buyCount: 1,
      freeCount: 1,
      threshold: 2,
    });
    seenKeys.add('B1G1');
  }

  if (!promoStr || promoStr.trim() === '' || promoStr === 'none') {
    return rules;
  }

  const str = promoStr.trim();

  // Pattern 1: B{X}G{Y} (e.g. B2G2, B4G1, B6G2)
  const bxyRegex = /b\s*(\d+)\s*g\s*(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = bxyRegex.exec(str)) !== null) {
    const buy = parseInt(match[1], 10);
    const free = parseInt(match[2], 10);
    const key = `B${buy}G${free}`;
    if (buy > 0 && free > 0 && !seenKeys.has(key)) {
      rules.push({
        key,
        label: `Buy ${buy} Get ${free} Free`,
        icon: getPromoIcon(buy, free),
        buyCount: buy,
        freeCount: free,
        threshold: buy + free,
      });
      seenKeys.add(key);
    }
  }

  // Pattern 2: "Buy X Get Y"
  const buyGetRegex = /buy\s*(\d+)\s*get\s*(\d+)/gi;
  while ((match = buyGetRegex.exec(str)) !== null) {
    const buy = parseInt(match[1], 10);
    const free = parseInt(match[2], 10);
    const key = `B${buy}G${free}`;
    if (buy > 0 && free > 0 && !seenKeys.has(key)) {
      rules.push({
        key,
        label: `Buy ${buy} Get ${free} Free`,
        icon: getPromoIcon(buy, free),
        buyCount: buy,
        freeCount: free,
        threshold: buy + free,
      });
      seenKeys.add(key);
    }
  }

  return rules;
}

/**
 * Returns single primary rule or null (backwards compatibility).
 */
export function parsePromoRule(promoStr?: string | null, isB1G1?: boolean | null): PromoRule | null {
  const all = parseAllPromoRules(promoStr, isB1G1);
  return all.length > 0 ? all[0] : null;
}

/**
 * Extracts all active promo rules for a given product from its tags or flags.
 */
export function getProductPromoRules(product: CartItem['product']): PromoRule[] {
  const rules: PromoRule[] = [];
  const seenKeys = new Set<string>();

  if (product.is_b1g1) {
    const b1g1 = parseAllPromoRules(null, true);
    b1g1.forEach(r => {
      if (!seenKeys.has(r.key)) {
        rules.push(r);
        seenKeys.add(r.key);
      }
    });
  }

  if (product.tags && Array.isArray(product.tags)) {
    product.tags.forEach((t: string) => {
      if (t.startsWith('promo:')) {
        const clean = t.replace('promo:', '');
        const parsedList = parseAllPromoRules(clean);
        parsedList.forEach(r => {
          if (!seenKeys.has(r.key)) {
            rules.push(r);
            seenKeys.add(r.key);
          }
        });
      }
    });
  }

  return rules;
}

/**
 * Helper to solve the optimal number of free units and rule bundles for N items
 * using Dynamic Programming. Maximizes free items for the customer.
 */
function solveOptimalPromoBundles(
  totalUnits: number,
  rules: PromoRule[]
): {
  maxFree: number;
  bundlesUsed: Record<string, { rule: PromoRule; count: number }>;
  nextTierNeeded: number;
  nextTierFreeCount: number;
} {
  if (totalUnits <= 0 || rules.length === 0) {
    return { maxFree: 0, bundlesUsed: {}, nextTierNeeded: 0, nextTierFreeCount: 0 };
  }

  // Pre-calculate DP table up to totalUnits + 15 (to find next tier easily)
  const maxSearch = totalUnits + 15;
  const dpFree: number[] = new Array(maxSearch + 1).fill(0);
  const dpRule: (PromoRule | null)[] = new Array(maxSearch + 1).fill(null);

  for (let i = 1; i <= maxSearch; i++) {
    // Option A: don't bundle item i
    dpFree[i] = dpFree[i - 1];
    dpRule[i] = null;

    // Option B: try each rule ending at item i
    for (const rule of rules) {
      if (i >= rule.threshold) {
        const candidate = dpFree[i - rule.threshold] + rule.freeCount;
        if (candidate > dpFree[i]) {
          dpFree[i] = candidate;
          dpRule[i] = rule;
        }
      }
    }
  }

  // Backtrack to find which bundles were used at totalUnits
  const bundlesUsed: Record<string, { rule: PromoRule; count: number }> = {};
  let curr = totalUnits;
  while (curr > 0) {
    const r = dpRule[curr];
    if (r) {
      if (!bundlesUsed[r.key]) {
        bundlesUsed[r.key] = { rule: r, count: 0 };
      }
      bundlesUsed[r.key].count += 1;
      curr -= r.threshold;
    } else {
      curr -= 1;
    }
  }

  // Find next tier upsell: smallest k > totalUnits where dpFree[k] > dpFree[totalUnits]
  let nextTierNeeded = 0;
  let nextTierFreeCount = 1;
  for (let k = totalUnits + 1; k <= maxSearch; k++) {
    if (dpFree[k] > dpFree[totalUnits]) {
      nextTierNeeded = k - totalUnits;
      nextTierFreeCount = dpFree[k] - dpFree[totalUnits];
      break;
    }
  }

  return {
    maxFree: dpFree[totalUnits],
    bundlesUsed,
    nextTierNeeded,
    nextTierFreeCount,
  };
}

/**
 * Calculates promo discounts across cart items.
 * Handles ANY single offer or MULTI-OFFER combination (e.g. B2G2 + B4G1 + B6G2).
 * Always awards the highest possible number of free items to the customer,
 * and discounts the lowest priced qualifying units to ₹0.00.
 */
export function calculatePromoDiscounts(items: CartItem[]): PromoDiscountResult {
  const result: PromoDiscountResult = {
    totalPromoDiscount: 0,
    appliedPromos: [],
    freeUnitsMap: {},
  };

  if (!items || items.length === 0) return result;

  interface UnitEntry {
    cartItemId: string; // productId + '-' + (variantId || 'default')
    price: number;
  }

  // 1. Group individual units by their shared promo rules signature
  const promoPools: Record<string, { rules: PromoRule[]; units: UnitEntry[] }> = {};

  items.forEach((item) => {
    const rules = getProductPromoRules(item.product);
    if (!rules || rules.length === 0) return;

    // Create a canonical group key sorted by rule key
    const poolKey = rules.map((r) => r.key).sort().join('_');

    if (!promoPools[poolKey]) {
      promoPools[poolKey] = { rules, units: [] };
    }

    const price =
      (item.product.sale_price !== null && item.product.sale_price !== undefined
        ? item.product.sale_price
        : item.product.base_price) + (item.variant?.price_adjustment || 0);

    const itemKey = `${item.product.id}-${item.variant?.id || 'default'}`;

    for (let i = 0; i < item.quantity; i++) {
      promoPools[poolKey].units.push({
        cartItemId: itemKey,
        price,
      });
    }
  });

  // 2. Evaluate each promo pool
  Object.values(promoPools).forEach(({ rules, units }) => {
    const totalUnits = units.length;
    const { maxFree, bundlesUsed, nextTierNeeded, nextTierFreeCount } = solveOptimalPromoBundles(
      totalUnits,
      rules
    );

    // Sort units ascending by price so the lowest priced items become free
    units.sort((a, b) => a.price - b.price);

    let groupDiscount = 0;
    for (let i = 0; i < maxFree; i++) {
      const freeUnit = units[i];
      groupDiscount += freeUnit.price;
      result.freeUnitsMap[freeUnit.cartItemId] =
        (result.freeUnitsMap[freeUnit.cartItemId] || 0) + 1;
    }

    result.totalPromoDiscount += groupDiscount;

    // Record each bundle applied
    Object.values(bundlesUsed).forEach(({ rule, count }) => {
      const freeForBundle = count * rule.freeCount;
      result.appliedPromos.push({
        rule,
        bundlesApplied: count,
        freeUnitsCount: freeForBundle,
        discountAmount: groupDiscount, // Pool discount
        nextTierNeeded,
        nextTierFreeCount,
      });
    });

    // If no bundle unlocked yet, still provide upsell to help customer unlock it
    if (maxFree === 0 && nextTierNeeded > 0) {
      result.appliedPromos.push({
        rule: rules[0],
        bundlesApplied: 0,
        freeUnitsCount: 0,
        discountAmount: 0,
        nextTierNeeded,
        nextTierFreeCount,
      });
    }
  });

  return result;
}
