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
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .limit(30);

      if (error) throw error;

      if (data && data.length > 0) {
        const p: Product[] = [];
        const po: Product[] = [];
        const s: Product[] = [];
        const h: Product[] = [];

        data.forEach(item => {
          const prodName = item.name.toLowerCase();

          if (prodName.includes('pot') || prodName.includes('planter') || prodName.includes('ceramic')) {
            po.push(item as any);
          } else if (prodName.includes('hamper') || prodName.includes('combo') || prodName.includes('set')) {
            h.push(item as any);
          } else if (prodName.includes('soil') || prodName.includes('coco') || prodName.includes('peat') || prodName.includes('fertilizer')) {
            s.push(item as any);
          } else {
            p.push(item as any);
          }
        });

        // Ensure we always have plants and recommendations
        setPlants(p.slice(0, 5));
        setPots(po.length > 0 ? po.slice(0, 5) : data.slice(5, 10));
        setSoil(s.length > 0 ? s.slice(0, 5) : data.slice(10, 15));
        setHampers(h.length > 0 ? h.slice(0, 5) : data.slice(15, 20));
      }
    } catch (e) {
      console.warn('Error fetching checkout recommendations:', e);
    }
  };

  const handleAddToCart = (product: Product) => {
    // Correct argument signature: addItem(product, variant, quantity)
    addItem(product as any, undefined, 1);
    toast.success(`${product.name} added to your cart!`);
  };

  const Carousel = ({ title, items }: { title: string, items: Product[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mt-8">
        <h3 className="text-xl font-serif font-bold mb-4">{title}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {items.map(product => (
            <Card key={product.id} className="min-w-[190px] sm:min-w-[220px] max-w-[220px] flex-shrink-0 snap-start">
              <CardContent className="p-3.5 flex flex-col h-full">
                <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
                  <img 
                    src={getProxiedUrl(product.main_image_url) || '/placeholder.svg'} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1">{product.name}</h4>
                  <div className="text-sm font-semibold text-primary mt-auto mb-3">
                    ₹{(product.sale_price || product.base_price).toFixed(2)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-auto text-xs flex items-center justify-center gap-1.5"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
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

  if (plants.length === 0 && pots.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-serif font-bold text-center mb-1">You Might Also Like</h2>
      <p className="text-center text-muted-foreground text-xs sm:text-sm mb-6">Complete your plant parent collection</p>
      
      <Carousel title="🌿 Trending Plants" items={plants} />
      <Carousel title="🪴 Beautiful Pots & Planters" items={pots} />
      <Carousel title="🌱 Cocoa Peat & Nutrition" items={soil} />
      <Carousel title="🎁 Curated Plant Combos" items={hampers} />
    </div>
  );
};
