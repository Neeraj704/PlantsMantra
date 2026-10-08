import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Leaf, Heart, Shield, Sparkles, ShoppingCart, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
import BannerCarousel from '@/components/BannerCarousel';
import { CategoryIconRow } from '@/components/CategoryIconRow';
import { MarqueeRibbon } from '@/components/MarqueeRibbon';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

const Home = () => {
  const { addItem } = useCart();

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'active')
        .order('priority', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: combos } = useQuery({
    queryKey: ['combo-products'],
    queryFn: async () => {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', 'combo')
        .maybeSingle();
      
      const query = supabase
        .from('products')
        .select('*')
        .eq('status', 'active');

      if (category) {
        query.eq('category_id', category.id);
      } else {
        query.ilike('name', '%combo%');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      return data;
    },
  });

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, undefined, 1);
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Category Circular Icons Row (PlantOrbit style) */}
      <CategoryIconRow />

      {/* 2. Compact, Shorter Hero Section */}
      <section className="relative h-[360px] sm:h-[400px] md:h-[440px] flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://cdn.pixabay.com/video/2023/06/09/166394-834930270_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center text-white px-4 max-w-3xl"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-3 tracking-tight">
            Bring Nature Home, Effortlessly
          </h1>
          <p className="text-xs sm:text-sm md:text-base mb-6 text-white/90 max-w-xl mx-auto font-sans leading-relaxed">
            Handpicked, healthy indoor plants & stylish ceramic planters delivered with 100% damage-proof packaging to your doorstep.
          </p>
          <div className="flex flex-row gap-3 justify-center items-center">
            <Button size="sm" sm-size="lg" asChild className="gradient-hero text-xs sm:text-sm px-6 h-10 shadow-lg">
              <Link to="/shop">
                Shop Plants <ArrowRight className="ml-1.5 w-4 h-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 text-xs sm:text-sm h-10">
              <Link to="/sale">
                Explore Deals 🔥
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* 3. Scrolling Marquee Ribbon */}
      <MarqueeRibbon />

      {/* 4. Banner Carousel */}
      <div className="py-6">
        <BannerCarousel />
      </div>

      {/* 5. Our Best Selling Products (5-Column Compact Grid) */}
      <section className="py-12 bg-gray-50/50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-2">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
                Our Best Selling Plants
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Customer-favorite indoor greens with proven air-purifying & mood-boosting qualities
              </p>
            </div>
            <Link to="/shop" className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 5-Column Grid on desktop, 2-column on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featuredProducts?.map((product, index) => {
              const imgSrc = getProxiedUrl(product.main_image_url) || productImages[product.slug] || monsteraImg;
              const displayPrice = product.sale_price || product.base_price;
              const hasDiscount = product.sale_price !== null && product.sale_price < product.base_price;
              const discountPercent = hasDiscount 
                ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100) 
                : 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col h-full"
                >
                  <Link to={`/product/${product.slug}`} className="group flex flex-col h-full bg-white rounded-xl border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
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
                            B1G1
                          </span>
                        )}
                      </div>

                      {product.scarcity_status === 'limited_stock' && product.scarcity_value && product.scarcity_value > 0 ? (
                        <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                          🔥 Only {product.scarcity_value} left!
                        </span>
                      ) : null}
                    </div>

                    <div className="p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-serif font-medium text-xs sm:text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                          {product.name}
                        </h3>
                        {product.botanical_name ? (
                          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                            {product.botanical_name}
                          </p>
                        ) : null}
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

                        {/* PlantOrbit Style Quick Add to Cart Button */}
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
        </div>
      </section>

      {/* 6. Combos & Hampers Section (5-Column Grid) */}
      {combos && combos.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
                  Customer Favourite Combos
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Value-packed pairings and curated gift sets designed to thrive together
                </p>
              </div>
              <Link to="/shop?category=combo" className="text-xs sm:text-sm font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1">
                View All Combos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {combos.map((product, index) => {
                const imgSrc = getProxiedUrl(product.main_image_url) || productImages[product.slug] || monsteraImg;
                const displayPrice = product.sale_price || product.base_price;
                const hasDiscount = product.sale_price !== null && product.sale_price < product.base_price;
                const discountPercent = hasDiscount 
                  ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100) 
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col h-full"
                  >
                    <Link to={`/product/${product.slug}`} className="group flex flex-col h-full bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className="aspect-square overflow-hidden bg-gray-100 relative">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="bg-emerald-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            COMBO
                          </span>
                          {hasDiscount && (
                            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                              -{discountPercent}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="font-serif font-medium text-xs sm:text-sm text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {product.name}
                          </h3>
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
          </div>
        </section>
      )}

      {/* 7. Features / Trust Points */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-700">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-semibold text-sm mb-1">Sustainable Care</h3>
              <p className="text-[11px] text-muted-foreground">Eco-friendly plant pots & packaging</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-700">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-semibold text-sm mb-1">Lifetime Support</h3>
              <p className="text-[11px] text-muted-foreground">WhatsApp consultation for any plant issue</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-700">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-semibold text-sm mb-1">7-Day Guarantee</h3>
              <p className="text-[11px] text-muted-foreground">Free replacement if plants arrive damaged</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
              <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-700">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-semibold text-sm mb-1">Premium Quality</h3>
              <p className="text-[11px] text-muted-foreground">Farm-fresh, rooted & pest-inspected</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
