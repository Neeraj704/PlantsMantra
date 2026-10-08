import { useState, useEffect } from 'react';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  main_image_url: string | null;
  category_id?: string | null;
}

export const DrawerRecommendations = () => {
  const [activeTab, setActiveTab] = useState<'plants' | 'pots' | 'accessories'>('plants');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCart();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, base_price, sale_price, main_image_url, category_id')
        .eq('status', 'active')
        .limit(16);

      if (!error && data) {
        setProducts(data);
      }
    } catch (e) {
      console.warn('Failed to load drawer recommendations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (product: ProductItem) => {
    // Correctly call addItem(product, variant, quantity)
    addItem(product as any, undefined, 1);
    toast.success(`${product.name} added to cart`);
  };

  if (loading || products.length === 0) return null;

  // Filter or partition products
  const filteredProducts = products.filter((p) => {
    const name = p.name.toLowerCase();
    if (activeTab === 'pots') {
      return name.includes('pot') || name.includes('planter') || name.includes('ceramic');
    }
    if (activeTab === 'accessories') {
      return name.includes('peat') || name.includes('soil') || name.includes('fertilizer') || name.includes('coco');
    }
    return !name.includes('pot') && !name.includes('peat') && !name.includes('soil');
  });

  // Fallback if specific tab doesn't have matches yet
  const displayList = filteredProducts.length > 0 ? filteredProducts.slice(0, 4) : products.slice(0, 4);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
          You May Also Like
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('plants')}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              activeTab === 'plants' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Plants
          </button>
          <button
            onClick={() => setActiveTab('pots')}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              activeTab === 'pots' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pots
          </button>
          <button
            onClick={() => setActiveTab('accessories')}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
              activeTab === 'accessories' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Soil/Care
          </button>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
        {displayList.map((product) => {
          const isAlreadyInCart = items.some((i) => i.product.id === product.id);
          const price = product.sale_price || product.base_price;
          const imgSrc = getProxiedUrl(product.main_image_url) || '/placeholder.svg';

          return (
            <div
              key={product.id}
              className="min-w-[140px] max-w-[140px] bg-gray-50/80 rounded-lg p-2 flex flex-col justify-between border border-gray-100 flex-shrink-0"
            >
              <div className="w-full aspect-square rounded-md overflow-hidden bg-white mb-1.5">
                <img
                  src={imgSrc}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h5 className="text-[11px] font-medium text-gray-900 line-clamp-1 leading-tight">
                {product.name}
              </h5>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-bold text-emerald-800">₹{price}</span>
                <Button
                  size="sm"
                  variant={isAlreadyInCart ? 'secondary' : 'outline'}
                  className="h-6 px-2 text-[10px] font-semibold"
                  onClick={() => handleAdd(product)}
                >
                  {isAlreadyInCart ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-0.5" /> Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
