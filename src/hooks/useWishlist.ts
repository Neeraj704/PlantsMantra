import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useWishlist = () => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlistItems([]);
      setLoading(false);
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('wishlist')
      .select('product_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching wishlist:', error);
    } else {
      setWishlistItems(data.map(item => item.product_id));
    }
    setLoading(false);
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return;
    }

    const isInWishlist = wishlistItems.includes(productId);

    if (isInWishlist) {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        toast.error('Failed to remove from wishlist');
      } else {
        setWishlistItems(prev => prev.filter(id => id !== productId));
        toast.success('Removed from wishlist');
      }
    } else {
      const { error } = await supabase
        .from('wishlist')
        .insert([{ user_id: user.id, product_id: productId }]);

      if (error) {
        toast.error('Failed to add to wishlist');
      } else {
        setWishlistItems(prev => [...prev, productId]);
        toast.success('Added to wishlist');
      }
    }
  };

  const isInWishlist = (productId: string) => wishlistItems.includes(productId);

  return { wishlistItems, toggleWishlist, isInWishlist, loading };
};
