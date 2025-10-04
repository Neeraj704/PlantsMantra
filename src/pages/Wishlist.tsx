import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShoppingCart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  main_image_url: string | null;
  stock_status: string;
}

const Wishlist = () => {
  const { wishlistItems, toggleWishlist, loading } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (wishlistItems.length > 0) {
      fetchProducts();
    }
  }, [wishlistItems]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, base_price, sale_price, main_image_url, stock_status')
      .in('id', wishlistItems);

    if (data) {
      setProducts(data);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem(product as any, null, 1);
    toast.success('Added to cart!');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-16">
            <p className="text-muted-foreground">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center py-16">
            <Heart className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
            <h1 className="text-3xl font-serif font-bold mb-4">Your Wishlist is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Save your favorite plants for later!
            </p>
            <Button size="lg" asChild className="gradient-hero">
              <Link to="/shop">Shop Plants</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-serif font-bold mb-8">My Wishlist</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const price = product.sale_price || product.base_price;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden bg-muted/50">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-smooth group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-4 right-4"
                        onClick={() => toggleWishlist(product.id)}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </div>

                    <div className="p-4">
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-serif font-semibold text-lg hover:text-primary transition-smooth block mb-2"
                      >
                        {product.name}
                      </Link>

                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-xl font-bold">₹{price.toFixed(2)}</p>
                          {product.sale_price && (
                            <p className="text-sm text-muted-foreground line-through">
                              ₹{product.base_price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        className="w-full gradient-hero"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_status !== 'in_stock'}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {product.stock_status === 'in_stock' ? 'Add to Cart' : 'Out of Stock'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
