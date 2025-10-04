import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

export const CartSync = () => {
  const { user, loading } = useAuth();
  const { syncWithDatabase, loadFromDatabase, isInitialized, setInitialized } = useCart();

  useEffect(() => {
    if (loading) return;

    const handleCartSync = async () => {
      if (user && !isInitialized) {
        // User just logged in, sync local cart with database
        await syncWithDatabase(user.id);
        setInitialized(true);
      } else if (user && isInitialized) {
        // User is already logged in, load from database
        await loadFromDatabase(user.id);
      } else if (!user) {
        // User logged out, reset initialization
        setInitialized(false);
      }
    };

    handleCartSync();
  }, [user, loading, isInitialized, syncWithDatabase, loadFromDatabase, setInitialized]);

  return null;
};
