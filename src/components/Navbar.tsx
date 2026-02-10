import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, User, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackPixelEvent } from '@/utils/pixel';
import logo from '@/assets/logo.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const { items } = useCart();
  const { wishlistItems } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchActive(false);
      }
    };
    if (searchActive) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchActive]);

  // Determine navbar color mode
  const isDarkModeNavbar = isHomePage && !isScrolled && !searchActive;

  // Search results
  const { data: searchResults } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, main_image_url, base_price')
        .eq('status', 'active')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,care_guide.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Track search when results are shown (debounce could be better, but simple for now)
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      trackPixelEvent('Search', {
        search_string: searchQuery,
        content_ids: searchResults.map(p => p.id),
      });
    }
  }, [searchResults]);

  // Common class for text & icon color transitions
  const colorTransition = `transition-colors duration-500 ${isDarkModeNavbar ? 'text-white hover:text-white/80' : 'text-foreground hover:text-primary'
    }`;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled || !isHomePage
          ? 'bg-background/70 backdrop-blur-2xl shadow-md border-b border-border/50 text-foreground'
          : searchActive
            ? 'bg-background/70 backdrop-blur-2xl border-b border-border/50 text-foreground'
            : 'bg-transparent text-white'
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20 transition-all duration-500">
          {/* Logo */}
          <div className={`flex items-center transition-all duration-500 ${searchActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Link to="/" className="flex items-center group">
              <img src={logo} alt="PlantsMantra Logo" className="h-10 md:h-12 w-auto transition-transform duration-500 group-hover:scale-105" />
            </Link>
          </div>

          {/* Center: Search or Nav */}
          <div className="flex-1 flex justify-center transition-all duration-500" ref={searchRef}>
            <AnimatePresence mode="wait">
              {!searchActive ? (
                <motion.div
                  key="nav-links"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="hidden md:flex items-center gap-8"
                >
                  {['Home', 'Shop', 'Care Guides', 'Contact'].map((label, idx) => (
                    <Link
                      key={idx}
                      to={`/${label === 'Home' ? '' : label.toLowerCase().replace(' ', '-')}`}
                      className={colorTransition + ' text-sm font-medium'}
                    >
                      {label}
                    </Link>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="search-bar"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="w-full md:max-w-lg relative"
                >
                  <div className="relative flex items-center">
                    <Input
                      placeholder="Search plants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full rounded-full bg-muted text-foreground placeholder:text-muted-foreground pl-5 pr-12 py-2 shadow-md"
                      style={{
                        minWidth: window.innerWidth < 768 ? 'calc(100vw - 32px)' : undefined,
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 text-muted-foreground hover:text-primary transition-colors duration-500"
                      onClick={() => setSearchActive(false)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {searchQuery.length >= 2 && (
                    <div
                      className="absolute left-0 mt-3 w-full bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-xl z-50 max-h-[350px] overflow-y-auto no-scrollbar"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {searchResults && searchResults.length > 0 ? (
                        searchResults.slice(0, 10).map((product) => (
                          <Link
                            key={product.id}
                            to={`/product/${product.slug}`}
                            onClick={() => {
                              setSearchActive(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                          >
                            <img
                              src={product.main_image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ₹{product.base_price.toFixed(2)}
                              </p>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No plants found
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Icons */}
          <div
            className={`flex items-center gap-2 md:gap-4 transition-all duration-500 ${searchActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchActive(true)}
              className={colorTransition}
            >
              <Search className="w-5 h-5 transition-colors duration-500" />
            </Button>

            <Link to="/wishlist">
              <Button variant="ghost" size="icon" className={`relative ${colorTransition}`}>
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1">
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {wishlistItems.length}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </Link>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className={`relative ${colorTransition}`}>
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1">
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartItemsCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </Link>

            <Link to={user ? '/account' : '/auth'}>
              <Button variant="ghost" size="icon" className={colorTransition}>
                <User className="w-5 h-5" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && !searchActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background/95 backdrop-blur-md"
            >
              <div className="py-4 space-y-3">
                {['Home', 'Shop', 'Care Guides', 'Contact'].map((label, idx) => (
                  <Link
                    key={idx}
                    to={`/${label === 'Home' ? '' : label.toLowerCase().replace(' ', '-')}`}
                    className="block py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;