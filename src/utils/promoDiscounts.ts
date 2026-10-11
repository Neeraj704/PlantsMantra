import { CartItem } from '@/types/database';

export interface PromoRule {
  key: string;
  label: string;
  buyCount: number;
  freeCount: number;
  threshold: number; // buyCount + freeCount
  isTiered?: boolean;
}

export interface PromoDiscountResult {
  totalPromoDiscount: number;
  appliedPromos: {
    rule: PromoRule;
    qualifyingCount: number;
    freeUnitsCount: number;
    discountAmount: number;
    nextTierNeeded: number; // e.g. 1 more plant needed to get 1 free
    nextTierFreeCount: number;
  }[];
  // Map of cart item key `${item.product.id}-${item.variant?.id || 'default'}` to how many units are free
  freeUnitsMap: Record<string, number>;
}

/**
 * Parses any promo string (like 'B4G1', 'B6G2', 'B4G1+B6G2', 'B1G1', 'B2G1')
 * into a structured PromoRule.
 */
export function parsePromoRule(promoStr?: string | null, isB1G1?: boolean | null): PromoRule | null {
  if (isB1G1) {
    return {
      key: 'B1G1',
      label: 'Buy 1 Get 1 Free',
      buyCount: 1,
      freeCount: 1,
      threshold: 2,
    };
  }

  if (!promoStr || promoStr === 'none') return null;

  const normalized = promoStr.trim();

  // Tiered combo: B4G1 + B6G2
  if (/b4g1.*b6g2|b6g2.*b4g1/i.test(normalized)) {
    return {
      key: 'B4G1+B6G2',
      label: 'Buy 4 Get 1 / Buy 6 Get 2 Free',
      buyCount: 4,
      freeCount: 1,
      threshold: 5,
      isTiered: true,
    };
  }

  // Match pattern B{X}G{Y} (e.g. B4G1, B1G1, B6G2, B2G2)
  const bxyMatch = normalized.match(/b\s*(\d+)\s*g\s*(\d+)/i);
  if (bxyMatch) {
    const buy = parseInt(bxyMatch[1], 10);
    const free = parseInt(bxyMatch[2], 10);
    if (buy > 0 && free > 0) {
      return {
        key: `B${buy}G${free}`,
        label: `Buy ${buy} Get ${free} Free`,
        buyCount: buy,
        freeCount: free,
        threshold: buy + free,
      };
    }
  }

  // Match text pattern "buy X get Y"
  const buyGetMatch = normalized.match(/buy\s*(\d+)\s*get\s*(\d+)/i);
  if (buyGetMatch) {
    const buy = parseInt(buyGetMatch[1], 10);
    const free = parseInt(buyGetMatch[2], 10);
    if (buy > 0 && free > 0) {
      return {
        key: `B${buy}G${free}`,
        label: `Buy ${buy} Get ${free} Free`,
        buyCount: buy,
        freeCount: free,
        threshold: buy + free,
      };
    }
  }

  return null;
}

/**
 * Extracts the active promo rule for a given product from its tags or flags.
 */
export function getProductPromoRule(product: CartItem['product']): PromoRule | null {
  if (product.is_b1g1) {
    return parsePromoRule(null, true);
  }

  if (product.tags && Array.isArray(product.tags)) {
    const promoTag = product.tags.find((t: string) => t.startsWith('promo:'));
    if (promoTag) {
      const cleanTag = promoTag.replace('promo:', '');
      return parsePromoRule(cleanTag);
    }
  }

  return null;
}

/**
 * Calculates promo discounts (e.g. Buy 4 Get 1 Free, Buy 6 Get 2 Free) across cart items.
 * The cheapest item(s) in each qualifying bundle of (Buy X + Y Free) are made 100% FREE.
 */
export function calculatePromoDiscounts(items: CartItem[]): PromoDiscountResult {
  const result: PromoDiscountResult = {
    totalPromoDiscount: 0,
    appliedPromos: [],
    freeUnitsMap: {},
  };

  if (!items || items.length === 0) return result;

  // 1. Group individual units by promo rule key
  interface UnitEntry {
    cartItemId: string; // productId + '-' + (variantId || 'default')
    price: number;
  }

  const promoGroups: Record<string, { rule: PromoRule; units: UnitEntry[] }> = {};

  items.forEach((item) => {
    const rule = getProductPromoRule(item.product);
    if (!rule) return;

    if (!promoGroups[rule.key]) {
      promoGroups[rule.key] = { rule, units: [] };
    }

    const price = (item.product.sale_price !== null && item.product.sale_price !== undefined
      ? item.product.sale_price
      : item.product.base_price) + (item.variant?.price_adjustment || 0);

    const itemKey = `${item.product.id}-${item.variant?.id || 'default'}`;

    for (let i = 0; i < item.quantity; i++) {
      promoGroups[rule.key].units.push({
        cartItemId: itemKey,
        price,
      });
    }
  });

  // 2. Evaluate each promo group
  Object.values(promoGroups).forEach(({ rule, units }) => {
    const totalUnits = units.length;
    let freeUnitsCount = 0;
    let nextTierNeeded = 0;
    let nextTierFreeCount = 1;

    if (rule.isTiered && rule.key === 'B4G1+B6G2') {
      // Tiered logic:
      // Every 8 items gives 2 free (B6G2).
      // If remainder >= 5, gives +1 free (B4G1).
      const eights = Math.floor(totalUnits / 8);
      const rem = totalUnits % 8;
      freeUnitsCount = eights * 2 + (rem >= 5 ? 1 : 0);

      if (totalUnits < 5) {
        nextTierNeeded = 5 - totalUnits;
        nextTierFreeCount = 1;
      } else if (rem < 5) {
        // Between an 8-multiple and 5-remainder
        nextTierNeeded = 5 - rem;
        nextTierFreeCount = 1;
      } else {
        // Between 5-remainder and next 8
        nextTierNeeded = 8 - rem;
        nextTierFreeCount = 1; // Unlocks the 2nd free unit in this 8 bundle
      }
    } else {
      // Standard B{X}G{Y} logic
      const qualifyingBundles = Math.floor(totalUnits / rule.threshold);
      freeUnitsCount = qualifyingBundles * rule.freeCount;
      const remainder = totalUnits % rule.threshold;

      if (totalUnits < rule.threshold) {
        nextTierNeeded = rule.threshold - totalUnits;
        nextTierFreeCount = rule.freeCount;
      } else if (remainder > 0) {
        nextTierNeeded = rule.threshold - remainder;
        nextTierFreeCount = rule.freeCount;
      } else {
        nextTierNeeded = rule.threshold;
        nextTierFreeCount = rule.freeCount;
      }
    }

    // Sort units ascending by price so the lowest priced items become free
    units.sort((a, b) => a.price - b.price);

    let groupDiscount = 0;
    for (let i = 0; i < freeUnitsCount; i++) {
      const freeUnit = units[i];
      groupDiscount += freeUnit.price;
      result.freeUnitsMap[freeUnit.cartItemId] = (result.freeUnitsMap[freeUnit.cartItemId] || 0) + 1;
    }

    result.totalPromoDiscount += groupDiscount;

    result.appliedPromos.push({
      rule,
      qualifyingCount: totalUnits,
      freeUnitsCount,
      discountAmount: groupDiscount,
      nextTierNeeded,
      nextTierFreeCount,
    });
  });

  return result;
}
