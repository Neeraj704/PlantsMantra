import { supabase } from '@/integrations/supabase/client';

export const PROMO_CONFIG_ROW_ID = '00000000-0000-0000-0000-000000000002';
export const PROMO_CONFIG_LOCAL_KEY = 'plantsmantra_promo_products_config';

export interface ProductPromoConfig {
  promo_tag: string; // e.g. 'B4G1', 'B6G2', 'B2G2, B4G1, B6G2', 'B1G1', 'none'
  sale_price?: number | null;
  scarcity_status?: 'none' | 'limited_stock' | 'sold_out';
  scarcity_value?: number;
}

export type PromoProductsMap = Record<string, ProductPromoConfig>;

/**
 * Loads the active promo products configuration from Supabase campaign_settings.
 * Falls back to localStorage if offline.
 */
export async function fetchPromoProductsConfig(): Promise<PromoProductsMap> {
  try {
    const { data, error } = await supabase
      .from('campaign_settings' as any)
      .select('banner_text')
      .eq('id', PROMO_CONFIG_ROW_ID)
      .maybeSingle();

    if (!error && data?.banner_text) {
      try {
        const parsed = JSON.parse(data.banner_text);
        if (parsed && typeof parsed === 'object') {
          try {
            localStorage.setItem(PROMO_CONFIG_LOCAL_KEY, data.banner_text);
          } catch (e) {}
          return parsed as PromoProductsMap;
        }
      } catch (jsonErr) {
        console.warn('Failed to parse promo config JSON:', jsonErr);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch promo config from Supabase:', err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(PROMO_CONFIG_LOCAL_KEY);
    if (local) {
      return JSON.parse(local) as PromoProductsMap;
    }
  } catch (e) {}

  return {};
}

/**
 * Saves the promo products configuration to Supabase campaign_settings and localStorage.
 */
export async function savePromoProductsConfig(config: PromoProductsMap): Promise<boolean> {
  const jsonStr = JSON.stringify(config);
  try {
    localStorage.setItem(PROMO_CONFIG_LOCAL_KEY, jsonStr);
  } catch (e) {}

  try {
    const { error } = await supabase
      .from('campaign_settings' as any)
      .upsert({
        id: PROMO_CONFIG_ROW_ID,
        campaign_name: '__PROMO_PRODUCTS_CONFIG__',
        banner_text: jsonStr,
        is_active: false,
      });

    if (error) {
      console.error('Failed to save promo products config to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving promo products config:', err);
    return false;
  }
}
