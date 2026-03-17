import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, Heart, ShoppingCart, Zap, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
import { Product, CartItem } from '@/types/database';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { useBuyNow } from '@/hooks/useBuyNow';
import { toast } from 'sonner';
import { trackPixelEvent } from '@/utils/pixel';
import { useIsMobile } from '@/hooks/use-mobile';


const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const { setItemAndProceed } = useBuyNow();
  const isMobile = useIsMobile();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const categorySlug = searchParams.get('category');
    if (categorySlug && categories) {
      const category = categories.find((cat) => cat.slug === categorySlug);
      if (category) return [category.id];
    }
    const cats = searchParams.get('categories');
    return cats ? cats.split(',') : [];
  });

  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get('minPrice');
    const max = searchParams.get('maxPrice');
    const minVal = min ? parseInt(min, 10) : 0;
    const maxVal = max ? parseInt(max, 10) : 5000;
    return [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 5000 : maxVal];
  });

  const [inStockOnly, setInStockOnly] = useState<boolean>(() => searchParams.get('inStock') === 'true');
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(() => searchParams.get('onSale') === 'true');
  const [sortBy, setSortBy] = useState<string>(() => searchParams.get('sortBy') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = isMobile ? 20 : 30; // 10 rows: 10*2 for mobile, 10*3 for desktop

  // Sync state from URL params
  useEffect(() => {
    // Categories
    const categorySlug = searchParams.get('category');
    if (categorySlug && categories) {
      const category = categories.find((cat) => cat.slug === categorySlug);
      if (category) {
        setSelectedCategories([category.id]);
        return; // Don't process 'categories' if 'category' slug is present
      }
    }
    const cats = searchParams.get('categories');
    if (cats !== null) {
      setSelectedCategories(cats ? cats.split(',') : []);
    }

    // Price
    const min = searchParams.get('minPrice');
    const max = searchParams.get('maxPrice');
    if (min !== null || max !== null) {
      const minVal = min ? parseInt(min, 10) : 0;
      const maxVal = max ? parseInt(max, 10) : 5000;
      setPriceRange([isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 5000 : maxVal]);
    }

    // Toggles
    setInStockOnly(searchParams.get('inStock') === 'true');
    setOnSaleOnly(searchParams.get('onSale') === 'true');
    setSortBy(searchParams.get('sortBy') || 'newest');
  }, [searchParams, categories]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    }
    if (priceRange[0] !== 0) {
      params.set('minPrice', priceRange[0].toString());
    }
    if (priceRange[1] !== 5000) {
      params.set('maxPrice', priceRange[1].toString());
    }
    if (inStockOnly) {
      params.set('inStock', 'true');
    }
    if (onSaleOnly) {
      params.set('onSale', 'true');
    }
    if (sortBy !== 'newest') {
      params.set('sortBy', sortBy);
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }

    // Only update if something meaningful changed or we are on page 1
    // This effect is mostly for syncing internal state TO the URL for filtering
    const currentParamsStr = searchParams.toString();
    const newParamsStr = params.toString();
    
    if (currentParamsStr !== newParamsStr) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedCategories, priceRange, inStockOnly, onSaleOnly, sortBy, setSearchParams, currentPage, searchParams]);


  // Scroll to top when page changes
  useEffect(() => {
    // Immediate scroll to top
    window.scrollTo(0, 0);
    // Also scroll with a slight delay to ensure content has rendered
    const timeoutId = setTimeout(() => window.scrollTo(0, 0), 10);
    return () => clearTimeout(timeoutId);
  }, [currentPage]);


  const { data, isLoading, isFetching } = useQuery({

    queryKey: ['products', selectedCategories, priceRange, inStockOnly, onSaleOnly, sortBy, currentPage, pageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select('*, reviews(rating, is_hidden)', { count: 'exact' })
        .eq('status', 'active')
        .gte('base_price', priceRange[0])
        .lte('base_price', priceRange[1]);

      if (selectedCategories.length > 0) {
        query = query.in('category_id', selectedCategories);
      }

      if (inStockOnly) {
        query = query.eq('stock_status', 'in_stock');
      }

      if (onSaleOnly) {
        query = query.not('sale_price', 'is', null);
      }

      if (sortBy === 'price-asc') {
        query = query.order('base_price', { ascending: true });
      } else if (sortBy === 'price-desc') {
        query = query.order('base_price', { ascending: false });
      } else {
        query = query.order('priority', { ascending: true, nullsFirst: false })
                      .order('created_at', { ascending: false });
      }

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      
      const mappedProducts = (data as any[]).map(product => {
        const activeReviews = (product.reviews || []).filter((r: any) => !r.is_hidden);
        const total = activeReviews.length;
        const avg = total > 0 
          ? activeReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / total 
          : 0;
        return { ...product, avgRating: avg, totalReviews: total };
      });

      return { products: mappedProducts, count: count || 0 };
    },
  });

  const productList = data?.products || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', newPage.toString());
    }
    setSearchParams(params);
  };

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
    // Reset to page 1 when category changes
    handlePageChange(1);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 5000]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy('newest');
    handlePageChange(1);
  };

  const handleBuyNow = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const buyNowItem: CartItem = {
      product,
      quantity: 1,
    };

    setItemAndProceed(buyNowItem);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Shop Plants</h1>
          <p className="text-muted-foreground">
            Discover our complete collection of premium indoor and outdoor plants
          </p>
        </div>

        <div className="flex gap-8">
          <aside
            className={`
              fixed md:sticky top-20 left-0 z-40 w-64 h-[calc(100vh-5rem)] overflow-y-auto
              bg-background border-r border-border p-6 transition-transform
              ${showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif font-semibold text-lg">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowFilters(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Category</h3>
              <div className="space-y-2">
                {categories?.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Label htmlFor={category.id} className="text-sm cursor-pointer">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Price Range</h3>
              <div className="px-1">
                <Slider
                  min={0}
                  max={5000}
                  step={10}
                  value={priceRange}
                  onValueChange={(value) => {
                    setPriceRange(value as [number, number]);
                    handlePageChange(1);
                  }}
                  className="mb-3 mt-2"
                />
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Availability</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="in-stock" className="text-sm">In Stock Only</Label>
                <Switch
                  id="in-stock"
                  checked={inStockOnly}
                  onCheckedChange={(checked) => {
                    setInStockOnly(checked);
                    handlePageChange(1);
                  }}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">Special Offers</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="on-sale" className="text-sm">On Sale</Label>
                <Switch
                  id="on-sale"
                  checked={onSaleOnly}
                  onCheckedChange={(checked) => {
                    setOnSaleOnly(checked);
                    handlePageChange(1);
                  }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={clearFilters}
            >
              Clear All Filters
            </Button>
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {totalCount} plants found
              </p>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>

                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  handlePageChange(1);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {(isLoading || isFetching) ? (
                // Show skeletons while loading
                Array.from({ length: pageSize }).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))
              ) : productList.map((product: Product, index: number) => {

                const imgSrc = product.main_image_url || productImages[product.slug] || monsteraImg;
                const displayPrice = product.sale_price || product.base_price;
                const hasDiscount = product.sale_price !== null;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden group hover:shadow-hover transition-smooth relative flex flex-col">
                      <Button
                        variant={isInWishlist(product.id) ? 'default' : 'outline'}
                        size="icon"
                        className="absolute top-1 left-1 z-10 h-7 w-7 sm:h-9 sm:w-9 sm:top-2 sm:left-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product.id);
                          if (!isInWishlist(product.id)) {
                            trackPixelEvent('AddToWishlist', {
                              content_name: product.name,
                              content_ids: [product.id],
                              content_type: 'product',
                              value: product.sale_price || product.base_price,
                              currency: 'INR',
                            });
                          }
                        }}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <Link to={`/product/${product.slug}`} className="flex flex-col flex-grow">
                        <div className="aspect-square overflow-hidden bg-muted/50 relative">
                          <img
                            src={imgSrc}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                          />
                          {product.stock_status === 'low_stock' && (
                            <Badge
                              variant="secondary"
                              className="absolute top-1 right-1 sm:top-2 sm:right-2 text-[10px] sm:text-xs"
                            >
                              Low Stock
                            </Badge>
                          )}
                          {product.stock_status === 'out_of_stock' && (
                            <Badge
                              variant="destructive"
                              className="absolute top-1 right-1 sm:top-2 sm:right-2 text-[10px] sm:text-xs"
                            >
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-2.5 sm:p-4 flex flex-col flex-grow">
                          <div className="flex-grow">
                            {hasDiscount && (
                              <Badge variant="destructive" className="mb-1 sm:mb-2 text-[10px] sm:text-xs">
                                Sale
                              </Badge>
                            )}
                            <h3 className="font-serif font-semibold text-sm sm:text-lg mb-0.5 sm:mb-1 line-clamp-2">
                              {product.name}
                            </h3>
                            {product.botanical_name && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground italic mb-1 sm:mb-2 line-clamp-1">
                                {product.botanical_name}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-sm sm:text-lg font-bold">
                                  ₹{displayPrice.toFixed(2)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[10px] sm:text-sm text-muted-foreground line-through">
                                    ₹{product.base_price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              
                              {(product as any).avgRating > 0 && (
                                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-gray-700">
                                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                  <span>{(product as any).avgRating.toFixed(1)}</span>
                                  <span className="text-gray-400 font-normal">({(product as any).totalReviews})</span>
                                </div>
                              )}
                            </div>

                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 sm:mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] sm:text-sm h-7 sm:h-9 px-1 sm:px-3"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addItem(product);
                                trackPixelEvent('AddToCart', {
                                  content_name: product.name,
                                  content_ids: [product.id],
                                  content_type: 'product',
                                  value: product.sale_price || product.base_price,
                                  currency: 'INR',
                                });
                              }}
                              disabled={product.stock_status === 'out_of_stock'}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
                              Add
                            </Button>
                            <Button
                              size="sm"
                              className="gradient-hero text-[10px] sm:text-sm h-7 sm:h-9 px-1 sm:px-3"
                              onClick={(e) => {
                                handleBuyNow(product, e);
                                trackPixelEvent('AddToCart', {
                                  content_name: product.name,
                                  content_ids: [product.id],
                                  content_type: 'product',
                                  value: product.sale_price || product.base_price,
                                  currency: 'INR',
                                });
                              }}
                              disabled={product.stock_status === 'out_of_stock'}
                            >
                              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-2" />
                              Buy Now
                            </Button>
                          </div>

                        </CardContent>
                      </Link>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {(!isLoading && !isFetching && productList.length === 0) && (

              <div className="text-center py-12">
                <p className="text-muted-foreground">No plants found matching your filters.</p>
                <Button
                  variant="link"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => {
                      // Show first, last, and pages around current
                      return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                    })
                    .map((p, i, arr) => {
                      const showEllipsis = i > 0 && p - arr[i-1] > 1;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-muted-foreground px-1">...</span>}
                          <Button
                            variant={currentPage === p ? "default" : "outline"}
                            size="sm"
                            className="w-9 h-9"
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {showFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
};

export default Shop;