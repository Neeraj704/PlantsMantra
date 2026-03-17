import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Filter, Trash2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReviewCard } from '@/components/ReviewCard';
import { AdminReviewModal } from '@/components/admin/AdminReviewModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminProductReviews = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sortBy, setSortBy] = useState('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  // 1. Fetch product details
  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // 2. Fetch all reviews for this product
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews', productId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('reviews' as any)
        .select('*, review_images(*)')
        .eq('product_id', productId);

      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      if (sortBy === 'highest') query = query.order('rating', { ascending: false });
      if (sortBy === 'lowest') query = query.order('rating', { ascending: true });
      if (sortBy === 'hidden') query = query.eq('is_hidden', true).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!productId,
  });

  // 3. Mutations
  const toggleHiddenMutation = useMutation({
    mutationFn: async ({ id, is_hidden }: { id: string; is_hidden: boolean }) => {
      const { error } = await supabase
        .from('reviews' as any)
        .update({ is_hidden: !is_hidden })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews', productId] });
      toast.success('Review visibility updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reviews' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews', productId] });
      toast.success('Review deleted permanently');
    },
  });

  const handleDelete = (id: string) => {
    setReviewToDelete(id);
  };

  const confirmDelete = () => {
    if (reviewToDelete) {
      deleteMutation.mutate(reviewToDelete);
      setReviewToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/reviews')}
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold">
              {product?.name || 'Product'} Reviews
            </h1>
            <p className="text-gray-500">Manage all customer feedback for this item</p>
          </div>
        </div>
        <Button className="gradient-hero" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Add Manual Review
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm font-medium">Filter & Sort:</span>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Rated</SelectItem>
            <SelectItem value="lowest">Lowest Rated</SelectItem>
            <SelectItem value="hidden">Hidden Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showAdminControls
                onToggleHidden={(id, current) => toggleHiddenMutation.mutate({ id, is_hidden: current })}
                onDelete={handleDelete}
              />
            ))}

          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
            <p className="text-gray-500">Try changing the filters or add a manual review.</p>
          </div>
        )}
      </div>

      <AdminReviewModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productId!}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-reviews', productId] });
        }}
      />

      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the review and any associated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProductReviews;
