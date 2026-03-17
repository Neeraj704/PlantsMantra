import { useState, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight, MessageSquare, Filter } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewCard } from './ReviewCard';
import { WriteReviewDialog } from './WriteReviewDialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ReviewsSectionProps {
  productId: string;
  productName: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const ReviewsSection = ({ productId, productName }: ReviewsSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isWriteDialogOpen, setIsWriteDialogOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);

  // 1. Fetch review summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['review-summary', productId],
    queryFn: async () => {
      const { data, count, error } = await (supabase
        .from('reviews' as any)
        .select('rating', { count: 'exact' })
        .eq('product_id', productId)
        .eq('is_hidden', false) as any);

      if (error) throw error;


      const ratings = data as { rating: number }[];
      const total = count || 0;
      const counts = [0, 0, 0, 0, 0]; // 1-5 stars
      let sum = 0;

      ratings.forEach((r) => {
        counts[r.rating - 1]++;
        sum += r.rating;
      });

      const average = total > 0 ? (sum / total).toFixed(1) : '0.0';

      return {
        total,
        average: parseFloat(average),
        counts: counts.reverse(), // 5 to 1 stars
      };
    },
  });

  // 2. Fetch paginated reviews
  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', productId, page, pageSize, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('reviews' as any)
        .select('*, review_images(*)')
        .eq('product_id', productId)
        .eq('is_hidden', false);

      // Sorting
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      if (sortBy === 'highest') query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
      if (sortBy === 'lowest') query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // 3. User status query
  const { data: userStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['user-review-status', productId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Check if already reviewed
      const { data: existingReview } = await supabase
        .from('reviews' as any)
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user!.id)
        .maybeSingle();

      // Check if verified buyer
      const { data: orderItem } = await supabase
        .from('order_items' as any)
        .select('id, orders!inner(user_id, status)')
        .eq('product_id', productId)
        .eq('orders.user_id', user!.id)
        .not('orders.status', 'in', '("cancelled","pending")')
        .limit(1);

      return {
        hasReviewed: !!existingReview,
        isBuyer: !!orderItem && orderItem.length > 0,
      };
    },
  });

  const totalPages = summary ? Math.ceil(summary.total / pageSize) : 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSortChange = (val: SortOption) => {
    setSortBy(val);
    setPage(0);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(parseInt(val));
    setPage(0);
  };

  return (
    <section id="reviews-section" className="py-16 border-t border-gray-100 mt-16 scroll-mt-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif text-gray-900 mb-12 text-center md:text-left">
          Customer Reviews
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Panel: Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start space-y-8">
            <div className="bg-white rounded-2xl p-8 space-y-6 shadow-sm border border-gray-100">

              <div className="text-center md:text-left">
                <div className="flex items-end gap-3 justify-center md:justify-start">
                  <span className="text-5xl font-bold text-gray-900">
                    {isLoadingSummary ? <Skeleton className="h-12 w-16" /> : summary?.average}
                  </span>
                  <div className="pb-1 text-gray-500">out of 5</div>
                </div>
                <div className="flex items-center gap-1 mt-3 justify-center md:justify-start">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      fill={summary && summary.average >= i + 1 ? "currentColor" : (summary && summary.average > i ? "url(#partial-star)" : "none")}
                      className={summary && summary.average > i ? "text-yellow-400" : "text-gray-300"}
                    />
                  ))}
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="partial-star">
                        <stop offset={summary ? `${(summary.average % 1) * 100}%` : '0%'} stopColor="#facc15" />
                        <stop offset={summary ? `${(summary.average % 1) * 100}%` : '0%'} stopColor="#d1d5db" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Based on {summary?.total || 0} reviews
                </p>
              </div>

              <div className="space-y-3">
                {isLoadingSummary ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-2 flex-1" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))
                ) : (
                  summary?.counts.map((count, i) => {
                    const stars = 5 - i;
                    const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-10">
                          <span className="text-sm font-medium">{stars}</span>
                          <Star size={12} fill="currentColor" className="text-yellow-400" />
                        </div>
                        <Progress value={percentage} className="h-2 flex-1" />
                        <div className="text-sm text-gray-400 w-10 text-right">{count}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Share your thoughts</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Help others decide by sharing your experience with {productName}.
                </p>

                {user ? (
                  userStatus?.hasReviewed ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">
                      You've already reviewed this product.
                    </div>
                  ) : userStatus?.isBuyer ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-sm font-medium">Click a star to rate:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              onMouseEnter={() => setPendingRating(s)}
                              onMouseLeave={() => setPendingRating(0)}
                              onClick={() => {
                                setPendingRating(s);
                                setIsWriteDialogOpen(true);
                              }}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                size={22}
                                fill={pendingRating >= s ? "currentColor" : "none"}
                                className={pendingRating >= s ? "text-yellow-400" : "text-gray-300"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl"
                        onClick={() => setIsWriteDialogOpen(true)}
                      >
                        Write a Review
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm font-medium">
                      Only verified buyers can leave a review.
                    </div>
                  )
                ) : (
                  <Button 
                    className="w-full h-12 rounded-xl"
                    onClick={() => {
                      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
                    }}
                  >
                    Log in to Review
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Reviews List */}
          <div className="lg:col-span-8 space-y-8">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Sort:</span>
                </div>
                <Select value={sortBy} onValueChange={(val: SortOption) => handleSortChange(val)}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Rated</SelectItem>
                    <SelectItem value="lowest">Lowest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[80px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / pg</SelectItem>
                    <SelectItem value="10">10 / pg</SelectItem>
                    <SelectItem value="20">20 / pg</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={page === 0}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <span className="text-sm font-medium text-gray-600 px-2">
                    {page + 1} / {Math.max(1, totalPages)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={page >= totalPages - 1 || totalPages === 0}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="">

              {isLoadingReviews ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="py-8 space-y-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))
              ) : reviews && reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-600">
                    <MessageSquare size={32} />
                  </div>
                  <h3 className="text-xl font-serif text-gray-900">No reviews yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Be the first to share your experience with {productName}!
                  </p>
                  {userStatus?.isBuyer && !userStatus?.hasReviewed && (
                    <Button 
                      onClick={() => setIsWriteDialogOpen(true)}
                      className="mt-4"
                    >
                      Write the First Review
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <Button
                        key={i}
                        variant={page === i ? "default" : "ghost"}
                        size="sm"
                        className="w-9 h-9 p-0"
                        onClick={() => handlePageChange(i)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <WriteReviewDialog
        open={isWriteDialogOpen}
        onClose={() => setIsWriteDialogOpen(false)}
        productId={productId}
        initialRating={pendingRating}
        onSuccess={() => {
          setPendingRating(0);
          // Queries are already invalidated in the dialog
        }}
      />
    </section>
  );
};
