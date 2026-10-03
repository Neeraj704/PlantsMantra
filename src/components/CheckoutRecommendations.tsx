import { useState, useEffect } from 'react';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  main_image_url: string;
}

export const CheckoutRecommendations = () => {
  const [plants, setPlants] = useState<Product[]>([]);
  const [pots, setPots] = useState<Product[]>([]);
  const [soil, setSoil] = useState<Product[]>([]);
  const [hampers, setHampers] = useState<Product[]>([]);
  
  const { addItem } = useCart();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, base_price, sale_price, main_image_url, category_id, categories(name, slug)')
      .eq('status', 'active')
      .limit(20);

    if (data) {
      // Very simple sorting based on name or category if possible.
      // Assuming categories or names have matching keywords since schema categories are dynamic.
      const p: Product[] = [];
      const po: Product[] = [];
      const s: Product[] = [];
      const h: Product[] = [];

      data.forEach(item => {
        const catName = (item.categories as any)?.name?.toLowerCase() || '';
        const prodName = item.name.toLowerCase();

        if (catName.includes('pot') || prodName.includes('pot')) {
          po.push(item as any);
        } else if (catName.includes('hamper') || prodName.includes('hamper') || prodName.includes('combo')) {
          h.push(item as any);
        } else if (catName.includes('soil') || catName.includes('accessory') || prodName.includes('coco') || prodName.includes('peat')) {
          s.push(item as any);
        } else {
          p.push(item as any);
        }
      });

      setPlants(p.slice(0, 4));
      setPots(po.slice(0, 4));
      setSoil(s.slice(0, 4));
      setHampers(h.slice(0, 4));
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      product: {
        ...product,
        main_image_url: product.main_image_url
      } as any,
      quantity: 1
    });
    toast.success(`${product.name} added to your cart!`);
  };

  const Carousel = ({ title, items }: { title: string, items: Product[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mt-8">
        <h3 className="text-xl font-serif font-bold mb-4">{title}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {items.map(product => (
            <Card key={product.id} className="min-w-[200px] sm:min-w-[240px] max-w-[240px] flex-shrink-0 snap-start">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
                  <img 
                    src={getProxiedUrl(product.main_image_url)} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
                  <div className="text-sm font-semibold text-primary mt-auto mb-3">
                    ₹{(product.sale_price || product.base_price).toFixed(2)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-auto text-xs flex items-center justify-center gap-2"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (plants.length === 0 && pots.length === 0 && soil.length === 0 && hampers.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-serif font-bold text-center mb-2">You Might Also Like</h2>
      <p className="text-center text-muted-foreground text-sm mb-6">Complete your purchase with these perfect additions</p>
      
      <Carousel title="Trending Plants" items={plants} />
      <Carousel title="Beautiful Pots" items={pots} />
      <Carousel title="Cocoa Peat & Soil" items={soil} />
      <Carousel title="Gift Hampers" items={hampers} />
    </div>
  );
};
