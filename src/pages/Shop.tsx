import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Filter, X } from 'lucide-react';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';
import { Product } from '@/types/database';

const Shop = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products', selectedCategories, priceRange, inStockOnly, onSaleOnly, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
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
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
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

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
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
          {/* Filters Sidebar */}
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

            {/* Categories */}
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

            {/* Price Range */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Price Range</h3>
              <Slider
                min={0}
                max={5000} 
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>

            {/* Availability */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Availability</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="in-stock" className="text-sm">In Stock Only</Label>
                <Switch
                  id="in-stock"
                  checked={inStockOnly}
                  onCheckedChange={setInStockOnly}
                />
              </div>
            </div>

            {/* Sale */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Special Offers</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="on-sale" className="text-sm">On Sale</Label>
                <Switch
                  id="on-sale"
                  checked={onSaleOnly}
                  onCheckedChange={setOnSaleOnly}
                />
              </div>
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedCategories([]);
                setPriceRange([0, 200]);
                setInStockOnly(false);
                setOnSaleOnly(false);
              }}
            >
              Clear All Filters
            </Button>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {products?.length || 0} plants found
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
                
                <Select value={sortBy} onValueChange={setSortBy}>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products?.map((product: Product, index: number) => {
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
                    <Link to={`/product/${product.slug}`}>
                      <Card className="overflow-hidden group cursor-pointer hover:shadow-hover transition-smooth">
                        <div className="aspect-square overflow-hidden bg-muted/50 relative">
                          <img
                            src={imgSrc}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                          />
                          {product.stock_status === 'low_stock' && (
                            <Badge
                              variant="secondary"
                              className="absolute top-2 right-2"
                            >
                              Low Stock
                            </Badge>
                          )}
                          {product.stock_status === 'out_of_stock' && (
                            <Badge
                              variant="destructive"
                              className="absolute top-2 right-2"
                            >
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          {hasDiscount && (
                            <Badge variant="destructive" className="mb-2">
                              Sale
                            </Badge>
                          )}
                          <h3 className="font-serif font-semibold text-lg mb-1">
                            {product.name}
                          </h3>
                          {product.botanical_name && (
                            <p className="text-xs text-muted-foreground italic mb-2">
                              {product.botanical_name}
                            </p>
                          )}
                           <div className="flex items-center gap-2">
                             <span className="text-lg font-bold">
                               ₹{displayPrice.toFixed(2)}
                             </span>
                             {hasDiscount && (
                               <span className="text-sm text-muted-foreground line-through">
                                 ₹{product.base_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {products && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No plants found matching your filters.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSelectedCategories([]);
                    setPriceRange([0, 200]);
                    setInStockOnly(false);
                    setOnSaleOnly(false);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter overlay */}
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
