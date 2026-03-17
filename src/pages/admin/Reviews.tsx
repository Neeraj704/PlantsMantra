import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Eye, MessageSquare, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Reviews = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('most_reviews');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-product-review-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          main_image_url,
          slug,
          reviews (
            rating,
            is_hidden
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      return (data || []).map((product: any) => {
        const reviews = product.reviews || [];
        const totalReviews = reviews.length;
        const hiddenReviews = reviews.filter((r: any) => r.is_hidden).length;
        const sumRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        const avgRating = totalReviews > 0 ? (sumRating / totalReviews).toFixed(1) : '0.0';

        return {
          ...product,
          totalReviews,
          hiddenReviews,
          visibleReviews: totalReviews - hiddenReviews,
          avgRating: parseFloat(avgRating),
        };
      });
    },
  });

  const filteredProducts = products
    ?.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'most_reviews') return b.totalReviews - a.totalReviews;
      if (sortBy === 'fewest_reviews') return a.totalReviews - b.totalReviews;
      if (sortBy === 'avg_rating_desc') return b.avgRating - a.avgRating;
      if (sortBy === 'avg_rating_asc') return a.avgRating - b.avgRating;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif font-bold">Reviews Management</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_reviews">Most Reviews</SelectItem>
                <SelectItem value="fewest_reviews">Fewest Reviews</SelectItem>
                <SelectItem value="avg_rating_desc">Highest Average Rating</SelectItem>
                <SelectItem value="avg_rating_asc">Lowest Average Rating</SelectItem>
                <SelectItem value="name_asc">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading products...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Product</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Total Reviews</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Avg. Rating</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Hidden</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts?.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                        />
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-gray-400" />
                        <span>{product.totalReviews}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-yellow-400">
                          <Star size={14} fill="currentColor" />
                        </div>
                        <span className="font-semibold">{product.avgRating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.hiddenReviews > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle size={12} />
                          {product.hiddenReviews} Hidden
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/reviews/${product.id}`)}
                      >
                        <Eye size={16} className="mr-2" />
                        View Reviews
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredProducts?.length && (
            <div className="text-center py-20 text-gray-500">
              No products found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reviews;
