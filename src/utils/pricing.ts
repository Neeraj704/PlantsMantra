// src/utils/pricing.ts
// Standardized pricing utility to ensure combos and products consistently display
// their true customer selling price alongside the crossed-out MRP (cut price).

const COMBO_MRP_MAP: Record<number, number> = {
  299: 499,   // 3-Plant Trio Pack
  379: 649,   // 4-Plant Desert Quartet
  399: 699,   // Beginner's Trio Pack
  449: 799,   // 5-Plant Bundle
  549: 999,   // 6-Plant Rosette Collection
  799: 1499,  // 9-Plant Deluxe Collection
  999: 1899,  // 12-Plant Grand Garden / Majestic Dozen
  1249: 2499, // 15-Plant Collector's Paradise
};

export interface PricingResult {
  displayPrice: number;
  cutPrice: number;
  hasDiscount: boolean;
  discountPercent: number;
}

export function getProductPricing(product: {
  base_price: number;
  sale_price: number | null;
  name?: string;
  category_id?: string | null;
}): PricingResult {
  const sellingPrice =
    product.sale_price !== null && product.sale_price !== undefined && product.sale_price > 0
      ? product.sale_price
      : product.base_price;

  let cutPrice = product.base_price;

  // When base_price and sale_price are equal (e.g. combo entered with base_price = 999, sale_price = 999)
  // or base_price <= sellingPrice, restore the original retail cut price / MRP.
  if (product.base_price <= sellingPrice) {
    const roundedSelling = Math.round(sellingPrice);
    cutPrice = COMBO_MRP_MAP[roundedSelling] || Math.round((sellingPrice * 1.8) / 10) * 10 - 1;
  }

  const hasDiscount = cutPrice > sellingPrice;
  const discountPercent = hasDiscount
    ? Math.round(((cutPrice - sellingPrice) / cutPrice) * 100)
    : 0;

  return {
    displayPrice: sellingPrice,
    cutPrice,
    hasDiscount,
    discountPercent,
  };
}
