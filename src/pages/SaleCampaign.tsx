import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sparkles, Clock, ArrowRight, ShieldCheck, Flame, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { getProductPricing } from '@/utils/pricing';
import { getProductPromoRules } from '@/utils/promoDiscounts';
import { fetchPromoProductsConfig } from '@/utils/promoProductsConfig';

export const SaleCampaign = () => {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [campaignTitle, setCampaignTitle] = useState('Festive Flash Sale');
  const [bannerText, setBannerText] = useState('Exclusive limited-period discounts on handpicked live plants');
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [bannerOverlayOpacity, setBannerOverlayOpacity] = useState<number>(0.65);
  
  // Countdown Timer: 2 days 14 hours default or dynamic
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 36,
    seconds: 45,
  });

  useEffect(() => {
    fetchCampaignAndProducts();
  }, [slug]);

  // Smooth scroll to plants if navigated with #sale-plants
  useEffect(() => {
    if (window.location.hash === '#sale-plants' && !loading) {
      setTimeout(() => {
        document.getElementById('sale-plants')?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    }
  }, [loading]);

  // Live ticking countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCampaignAndProducts = async () => {
    try {
      setLoading(true);

      // 1. Try to load active campaign settings
      try {
        const { data: campaignData } = await supabase
          .from('campaign_settings' as any)
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        const applyCampaign = (campaignObj: any) => {
          if (campaignObj.campaign_name) setCampaignTitle(campaignObj.campaign_name);
          if (campaignObj.banner_text) setBannerText(campaignObj.banner_text);
          if (campaignObj.banner_image_url) setBannerImageUrl(campaignObj.banner_image_url);
          if (campaignObj.banner_overlay_opacity !== undefined && campaignObj.banner_overlay_opacity !== null) {
            setBannerOverlayOpacity(Number(campaignObj.banner_overlay_opacity));
          }
          if (campaignObj.end_date) {
            const end = new Date(campaignObj.end_date).getTime();
            const now = Date.now();
            const diff = Math.max(0, end - now);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
          }
        };

        let targetCampaign = campaignData;
        if (!targetCampaign) {
          const { data: latestRow } = await supabase
            .from('campaign_settings' as any)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          targetCampaign = latestRow;
        }

        if (targetCampaign) {
          applyCampaign(targetCampaign);
        } else {
          // Check localStorage fallback
          const stored = localStorage.getItem('plantsmantra_campaign_settings');
          if (stored) {
            try {
              applyCampaign(JSON.parse(stored));
            } catch (e) {}
          }
        }
      } catch (err) {
        // Safe fallback if table doesn't exist
        const stored = localStorage.getItem('plantsmantra_campaign_settings');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.campaign_name) setCampaignTitle(parsed.campaign_name);
            if (parsed.banner_text) setBannerText(parsed.banner_text);
            if (parsed.banner_image_url) setBannerImageUrl(parsed.banner_image_url);
            if (parsed.banner_overlay_opacity !== undefined) setBannerOverlayOpacity(Number(parsed.banner_overlay_opacity));
            if (parsed.end_date) {
              const end = new Date(parsed.end_date).getTime();
              const now = Date.now();
              const diff = Math.max(0, end - now);
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              setTimeLeft({ days, hours, minutes, seconds });
            }
          } catch (e) {}
        }
      }

      // 2. Fetch all products and active promo overrides
      const [productsRes, promoConfig] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('priority', { ascending: true, nullsFirst: false }),
        fetchPromoProductsConfig(),
      ]);

      if (productsRes.error) throw productsRes.error;
      const allActive = productsRes.data || [];

      // Merge active promo overrides from promoConfig
      const enrichedProducts = allActive.map((p: any) => {
        const override = promoConfig[p.id];
        if (!override) return p;

        let updatedTags = (p.tags || []).filter(
          (t: string) => !t.startsWith('promo:') && !t.startsWith('urgent:') && !t.startsWith('hype:')
        );

        if (override.promo_tag && override.promo_tag !== 'none') {
          updatedTags.push(`promo:${override.promo_tag}`);
        }
        if (override.scarcity_status && override.scarcity_status !== 'none') {
          updatedTags.push(`urgent:${override.scarcity_status}`);
        }
        if (override.scarcity_value && override.scarcity_value > 0) {
          updatedTags.push(`hype:${override.scarcity_value}`);
        }

        return {
          ...p,
          tags: updatedTags,
          sale_price: override.sale_price !== undefined && override.sale_price !== null ? override.sale_price : p.sale_price,
          scarcity_status: override.scarcity_status || p.scarcity_status,
          scarcity_value: override.scarcity_value !== undefined ? override.scarcity_value : p.scarcity_value,
        };
      });

      if (enrichedProducts.length > 0) {
        // Only include products specifically assigned by the admin to promo offers, B1G1, or stock urgency
        // Combos or plants with None (No Promo) are explicitly excluded!
        const campaignSelectedItems = enrichedProducts.filter((p: any) => {
          const hasPromoTag = p.tags && Array.isArray(p.tags) && p.tags.some((t: string) => {
            if (!t.startsWith('promo:')) return false;
            const clean = t.replace('promo:', '').trim();
            return clean !== '' && clean !== 'none';
          });
          const isB1G1 = Boolean(p.is_b1g1);
          const isUrgent = p.scarcity_status === 'limited_stock' || (p.tags && Array.isArray(p.tags) && p.tags.includes('urgent:limited_stock'));
          return hasPromoTag || isB1G1 || isUrgent;
        });

        // Deduplicate plants with identical names in database (keeps best deal / lowest price)
        const deduplicateList = (items: any[]) => {
          const map = new Map<string, any>();
          items.forEach((p) => {
            const norm = (p.name || '').replace(/[\u201c\u201d\u2018\u2019"']/g, '').trim().toLowerCase();
            if (!map.has(norm)) {
              map.set(norm, p);
            } else {
              const existing = map.get(norm);
              const existingPrice = existing.sale_price !== null && existing.sale_price !== undefined ? existing.sale_price : existing.base_price;
              const currentPrice = p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.base_price;
              if (currentPrice < existingPrice) {
                map.set(norm, p);
              }
            }
          });
          return Array.from(map.values());
        };

        setProducts(deduplicateList(campaignSelectedItems));
      } else {
        setProducts([]);
      }
    } catch (e: any) {
      console.error('Error loading sale campaign products:', e);
      try {
        const { data: fallback } = await supabase
          .from('products')
          .select('id, name, slug, base_price, sale_price, main_image_url, tags')
          .eq('status', 'active');
        const promoFallback = (fallback || []).filter((p: any) => 
          p.tags && Array.isArray(p.tags) && p.tags.some((t: string) => t.startsWith('promo:') && !t.includes('none'))
        );
        setProducts(promoFallback);
      } catch (fallbackErr) {
        console.error('Fallback fetch failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, undefined, 1);
    toast.success(`${product.name} added to cart!`);
  };

  // Dynamic promo tags detection from loaded products (NO DUPLICATE PILLS!)
  const promoTagsMap = products.reduce((acc: Record<string, { count: number; label: string; icon: string }>, p) => {
    const rules = getProductPromoRules(p as any);
    
    // Track unique rule keys on this product so we only count once per product
    const countedKeys = new Set<string>();
    rules.forEach((rule) => {
      if (!countedKeys.has(rule.key)) {
        if (!acc[rule.key]) {
          acc[rule.key] = {
            count: 0,
            label: rule.label,
            icon: rule.icon,
          };
        }
        acc[rule.key].count += 1;
        countedKeys.add(rule.key);
      }
    });

    // ONLY add raw custom tag (e.g. 'Special Offer') if the product had NO structured BOGO rules parsed!
    if (rules.length === 0) {
      (p.tags || []).forEach((t: string) => {
        if (t.startsWith('promo:')) {
          const raw = t.replace('promo:', '').trim();
          if (raw && raw !== 'none' && !countedKeys.has(raw)) {
            if (!acc[raw]) {
              acc[raw] = {
                count: 0,
                label: raw,
                icon: '🏷️',
              };
            }
            acc[raw].count += 1;
            countedKeys.add(raw);
          }
        }
      });
    }

    return acc;
  }, {});

  const under199Count = products.filter(
    (p) => (p.sale_price || p.base_price) <= 199
  ).length;

  // Filtered items: distinct products per offer pill!
  const filteredProducts = products.filter((p) => {
    if (filterType === 'all') return true;
    if (filterType === 'under199') {
      const price = p.sale_price || p.base_price;
      return price <= 199;
    }
    const rules = getProductPromoRules(p as any);
    if (rules.some((r) => r.key.toUpperCase() === filterType.toUpperCase())) {
      return true;
    }
    const tags = (p.tags || []).map((t: string) => t.replace('promo:', '').trim().toLowerCase());
    return tags.includes(filterType.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      {/* Hero Banner with Countdown */}
      <section 
        className="text-white py-12 sm:py-16 px-4 relative overflow-hidden bg-cover bg-center transition-all duration-300"
        style={{
          backgroundImage: bannerImageUrl ? `url(${bannerImageUrl})` : undefined,
          backgroundColor: '#062314',
        }}
      >
        {/* Fallback rich gradient when no photo is set */}
        {!bannerImageUrl && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-[#13301a] to-teal-950" />
        )}

        {/* Dynamic Dark Tint Overlay for ultra-crisp typography */}
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-300"
          style={{ opacity: bannerImageUrl ? bannerOverlayOpacity : 0.2 }}
        />

        {/* Subtle decorative dot pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3 border border-amber-400/30">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Limited Period Offer
          </span>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold mb-3 tracking-tight">
            {campaignTitle}
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 max-w-xl mx-auto mb-6">
            {bannerText}
          </p>

          {/* Countdown Clock */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Mins', value: timeLeft.minutes },
              { label: 'Secs', value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 min-w-[58px] sm:min-w-[68px]"
              >
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
                  {String(unit.value).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 text-xs text-emerald-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Free Shipping Above ₹599
            </span>
            <span>•</span>
            <span>Extra 10% Off Prepaid</span>
          </div>

          {/* Call to action button */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('sale-plants');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              <span>Explore Sale Deals</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* Filter Tabs & Products Grid */}
      <div id="sale-plants" className="container mx-auto px-4 py-8 scroll-mt-20">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Sale Plants ({products.length})
          </button>

          {/* Dynamically list buttons for each active promo tag (B1G1, B2G1, B2G2, B4G1, B6G2, etc.) */}
          {Object.entries(promoTagsMap).map(([tagKey, meta]) => {
            const isActive = filterType === tagKey;
            return (
              <button
                key={tagKey}
                onClick={() => setFilterType(tagKey)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{meta.icon}</span> {meta.label} ({meta.count})
              </button>
            );
          })}

          {under199Count > 0 && (
            <button
              onClick={() => setFilterType('under199')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'under199'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Under ₹199 Deals ({under199Count})
            </button>
          )}
        </div>

        {/* 5-Column Compact Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            Loading special offers...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No plants found for this offer filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
            {filteredProducts.map((product, index) => {
              const imgSrc = getProxiedUrl(product.main_image_url) || '/placeholder.svg';
              const pricing = getProductPricing(product);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex flex-col h-full"
                >
                  <Link
                    to={`/product/${product.slug}`}
                    className="group flex flex-col h-full bg-white rounded-xl border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100 relative">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {pricing.hasDiscount && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            -{pricing.discountPercent}%
                          </span>
                        )}
                        {(() => {
                          const promoTag = product.tags?.find(t => t.startsWith('promo:'))?.replace('promo:', '');
                          if (promoTag) {
                            return (
                              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {promoTag}
                              </span>
                            );
                          }
                          if (product.is_b1g1) {
                            return (
                              <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                B1G1 FREE
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {(() => {
                        const isLimited = product.scarcity_status === 'limited_stock' || product.tags?.includes('urgent:limited_stock');
                        const tagHype = product.tags?.find(t => t.startsWith('hype:'))?.replace('hype:', '');
                        const hypeVal = product.scarcity_value || (tagHype ? parseInt(tagHype) : 0);
                        if (isLimited && hypeVal > 0) {
                          return (
                            <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                              🔥 {hypeVal} left!
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-serif font-medium text-xs sm:text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                          {product.name}
                        </h3>
                        {product.botanical_name && (
                          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                            {product.botanical_name}
                          </p>
                        )}
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-baseline gap-1.5 mb-2.5">
                          <span className="text-sm sm:text-base font-bold text-gray-900">
                            ₹{pricing.displayPrice.toFixed(2)}
                          </span>
                          {pricing.hasDiscount && (
                            <span className="text-[11px] text-muted-foreground line-through">
                              ₹{pricing.cutPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs font-semibold rounded-lg border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white transition-all flex items-center justify-center gap-1"
                          onClick={(e) => handleQuickAdd(e, product)}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </Button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleCampaign;
