import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sparkles, Clock, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { toast } from 'sonner';

export const SaleCampaign = () => {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'b1g1' | 'under199'>('all');
  const [campaignTitle, setCampaignTitle] = useState('Festive Flash Sale');
  const [bannerText, setBannerText] = useState('Exclusive limited-period discounts on handpicked live plants');
  
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

        if (campaignData) {
          setCampaignTitle(campaignData.campaign_name || 'Festive Flash Sale');
          if (campaignData.banner_text) setBannerText(campaignData.banner_text);
          if (campaignData.end_date) {
            const end = new Date(campaignData.end_date).getTime();
            const now = Date.now();
            const diff = Math.max(0, end - now);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
          }
        }
      } catch (err) {
        // Safe fallback if table doesn't exist
      }

      // 2. Fetch products that are designated for sale / discount / B1G1
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .or('sale_price.not.is.null,is_b1g1.eq.true,scarcity_status.eq.limited_stock')
        .order('priority', { ascending: true, nullsFirst: false })
        .limit(40);

      if (error) throw error;

      // Fallback: If not enough explicitly on sale, fetch featured products
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .limit(20);
        setProducts(fallback || []);
      } else {
        setProducts(data);
      }
    } catch (e: any) {
      console.error('Error loading sale campaign products:', e);
      toast.error('Failed to load sale products');
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

  // Filtered items
  const filteredProducts = products.filter((p) => {
    if (filterType === 'b1g1') return p.is_b1g1;
    if (filterType === 'under199') {
      const price = p.sale_price || p.base_price;
      return price <= 199;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white pt-20 pb-16">
      {/* Hero Banner with Countdown */}
      <section className="bg-gradient-to-r from-emerald-950 via-[#1b3b22] to-teal-950 text-white py-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
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
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Sale Plants ({products.length})
          </button>
          <button
            onClick={() => setFilterType('b1g1')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
              filterType === 'b1g1'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" /> Buy 1 Get 1 Free
          </button>
          <button
            onClick={() => setFilterType('under199')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'under199'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Under ₹199 Deals
          </button>
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
              const displayPrice = product.sale_price || product.base_price;
              const hasDiscount = product.sale_price !== null && product.sale_price < product.base_price;
              const discountPercent = hasDiscount
                ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
                : 0;

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
                        {hasDiscount && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            -{discountPercent}%
                          </span>
                        )}
                        {product.is_b1g1 && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            B1G1 FREE
                          </span>
                        )}
                      </div>

                      {product.scarcity_status === 'limited_stock' && product.scarcity_value && product.scarcity_value > 0 ? (
                        <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                          🔥 {product.scarcity_value} left!
                        </span>
                      ) : null}
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
                            ₹{displayPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-muted-foreground line-through">
                              ₹{product.base_price.toFixed(2)}
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
