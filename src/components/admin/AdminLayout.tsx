import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tag, 
  Ticket, 
  Settings, 
  Menu, 
  X,
  LogOut,
  Image,
  TrendingUp,
  Star,
  Coins,
  Layers,
  Megaphone
} from 'lucide-react';

import logo from '@/assets/logo.png';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Open sidebar by default only on desktop
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
    { icon: Star, label: 'Reviews', path: '/admin/reviews' },
    { icon: Coins, label: 'Farmer Payouts', path: '/admin/payouts' },
    { icon: Layers, label: 'Combo Builder', path: '/admin/combos' },
    { icon: Megaphone, label: 'Sales & Hype', path: '/admin/sales' },
    { icon: Users, label: 'Customers', path: '/admin/customers' },
    { icon: Tag, label: 'Categories', path: '/admin/categories' },
    { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
    { icon: Image, label: 'Banners', path: '/admin/banners' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-2xs">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-shrink-0 h-9 w-9 text-gray-700 hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Link to="/admin" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img src={logo} alt="PlantsMantra Logo" className="h-8 sm:h-9 w-auto flex-shrink-0" />
              <span className="text-base sm:text-lg font-serif font-bold text-gray-900 truncate">PlantsMantra Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              Welcome, {profile?.full_name || 'Admin'}
            </span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 px-2.5 sm:px-3 text-xs gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-16 bottom-0 bg-background border-r transition-all duration-300 z-40 overflow-y-auto overflow-x-hidden ${
            sidebarOpen 
              ? 'w-64 translate-x-0 shadow-xl lg:shadow-none' 
              : '-translate-x-full lg:translate-x-0 lg:w-0'
          }`}
        >
          <nav className="p-3 sm:p-4 space-y-1.5">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'hover:bg-muted text-gray-700 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 min-w-0 ${
            sidebarOpen ? 'lg:ml-64' : 'ml-0'
          }`}
        >
          <div className="p-3 sm:p-5 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
