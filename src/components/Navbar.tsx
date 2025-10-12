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
import logo from '@/assets/logo.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const { items } = useCart();
  const { wishlistItems } = useWishlist();
  const { user } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-smooth ${
        isScrolled 
          ? 'bg-background/60 backdrop-blur-2xl shadow-lg border-b border-border/50' 
          : isHomePage 
            ? 'bg-transparent text-white' 
            : 'bg-background/60 backdrop-blur-2xl border-b border-border/50'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src={logo} 
              alt="PlantsMantra Logo" 
              className="h-10 md:h-12 w-auto transition-smooth group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-medium transition-smooth ${
              isHomePage && !isScrolled ? 'hover:text-white/80' : 'hover:text-primary'
            }`}>
              Home
            </Link>
            <Link to="/shop" className={`text-sm font-medium transition-smooth ${
              isHomePage && !isScrolled ? 'hover:text-white/80' : 'hover:text-primary'
            }`}>
              Shop
            </Link>
            <Link to="/care-guides" className={`text-sm font-medium transition-smooth ${
              isHomePage && !isScrolled ? 'hover:text-white/80' : 'hover:text-primary'
            }`}>
              Care Guides
            </Link>
            <Link to="/contact" className={`text-sm font-medium transition-smooth ${
              isHomePage && !isScrolled ? 'hover:text-white/80' : 'hover:text-primary'
            }`}>
              Contact
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div ref={searchRef} className="relative hidden md:block">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="w-5 h-5" />
              </Button>
              
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-[400px] bg-background/95 backdrop-blur-md border rounded-lg shadow-lg z-50"
                  >
                    <div className="p-4">
                      <Input
                        placeholder="Search plants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="mb-2"
                      />
                      {searchResults && searchResults.length > 0 && (
                        <div className="max-h-[400px] overflow-y-auto space-y-2 scrollbar-hide">
                          {searchResults.slice(0, 10).map((product) => (
                            <Link
                              key={product.id}
                              to={`/product/${product.slug}`}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
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
                          ))}
                        </div>
                      )}
                      {searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No plants found
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {wishlistItems.length}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </Link>
            
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartItemsCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </Link>

            <Link to={user ? "/account" : "/auth"}>
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
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
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border"
            >
              <div className="py-4 space-y-3">
                <Link
                  to="/"
                  className="block py-2 text-sm font-medium hover:text-primary transition-smooth"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  className="block py-2 text-sm font-medium hover:text-primary transition-smooth"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Shop
                </Link>
                <Link
                  to="/care-guides"
                  className="block py-2 text-sm font-medium hover:text-primary transition-smooth"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Care Guides
                </Link>
                <Link
                  to="/contact"
                  className="block py-2 text-sm font-medium hover:text-primary transition-smooth"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;