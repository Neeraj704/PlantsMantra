import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { Plus, Search, Edit, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { ProductModal } from '@/components/admin/ProductModal';

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to archive product');
    } else {
      toast.success('Product archived');
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.botanical_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      archived: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold">Products</h1>
        <Button className="gradient-hero" onClick={() => { setSelectedProduct(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading products...</p>
      ) : (
        <div className="bg-background rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Product</th>
                  <th className="text-left p-4 font-semibold">Price</th>
                  <th className="text-left p-4 font-semibold">Stock</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.botanical_name && (
                          <p className="text-sm text-muted-foreground italic">
                            {product.botanical_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        {product.sale_price ? (
                          <>
                            <span className="font-semibold">${product.sale_price.toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground line-through ml-2">
                              ${product.base_price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">${product.base_price.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={product.stock_status === 'in_stock' ? 'default' : 'destructive'}>
                        {product.stock_status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(product.status)}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedProduct(product); setModalOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(product.id)}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
