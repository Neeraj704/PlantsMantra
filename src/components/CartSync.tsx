import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

export const CartSync = () => {
  const { user, loading } = useAuth();
  const { syncWithDatabase, isInitialized, setInitialized } = useCart();

  useEffect(() => {
    if (loading) return;

    const handleCartSync = async () => {
      if (user && !isInitialized) {
        // User just logged in, sync local cart with database
        await syncWithDatabase(user.id);
        setInitialized(true);
      } else if (!user) {
        // User logged out, reset initialization
        setInitialized(false);
      }
    };

    handleCartSync();
  }, [user, loading, isInitialized, syncWithDatabase, setInitialized]);

  return null;
};
