import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, DollarSign, Sparkles, CheckCircle2, Flame, Gift, ArrowUpRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Dashboard = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [orderStatusSummary, setOrderStatusSummary] = useState<
    { status: string; count: number }[]
  >([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all products with created_at to allow timeframe filtering
      const { data: productsData } = await supabase
        .from('products')
        .select('id, created_at');
      setAllProducts(productsData || []);

      // Fetch all non-cancelled orders with customer metadata
      const { data: ordersData } = await supabase
        .from('orders' as any)
        .select('id, total, status, customer_name, customer_email, created_at')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      setAllOrders(ordersData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a date falls within selected timeframe
  const isWithinTimeframe = (dateString: string | null | undefined) => {
    if (!dateString) return false;
    if (timeframe === 'all') return true;

    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeframe) {
      case 'day': {
        return date >= startOfToday;
      }
      case 'week': {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= oneWeekAgo;
      }
      case 'month': {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= oneMonthAgo;
      }
      case 'year': {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return date >= oneYearAgo;
      }
      case 'custom': {
        if (!customStartDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        
        const end = customEndDate ? new Date(customEndDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        return date >= start && date <= end;
      }
      default:
        return true;
    }
  };

  // Recalculate stats dynamically when timeframe or raw data changes
  useEffect(() => {
    const filteredProducts = allProducts.filter(p => isWithinTimeframe(p.created_at));
    const filteredOrders = allOrders.filter(o => isWithinTimeframe(o.created_at));

    const ordersCount = filteredOrders.length;
    const revenue = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    // Calculate unique customers based on unique customer emails in filtered orders
    const uniqueEmails = new Set(
      filteredOrders
        .map(o => o.customer_email?.trim().toLowerCase())
        .filter(Boolean)
    );
    const customersCount = uniqueEmails.size;

    // Recent orders in this timeframe
    setRecentOrders(filteredOrders.slice(0, 5));

    // Order status summary in this timeframe
    const statusMap = new Map<string, number>();
    filteredOrders.forEach((order: any) => {
      const status = order.status || 'pending';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusArray = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));
    setOrderStatusSummary(statusArray);

    setStats({
      products: filteredProducts.length,
      orders: ordersCount,
      customers: customersCount,
      revenue,
    });
  }, [timeframe, customStartDate, customEndDate, allProducts, allOrders]);

  const statCards = [
    {
      title: 'Total Products',
      value: stats.products,
      icon: Package,
      color: 'text-blue-600',
      link: '/admin/products',
    },
    {
      title: 'Active Orders',
      value: stats.orders,
      icon: ShoppingCart,
      color: 'text-green-600',
      link: '/admin/orders',
    },
    {
      title: 'Total Customers',
      value: stats.customers,
      icon: Users,
      color: 'text-purple-600',
      link: '/admin/customers',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600',
      link: '/admin/analytics',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalActiveOrders = orderStatusSummary.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header and Filter Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card 
              key={stat.title}
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => stat.link && navigate(stat.link)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <IconComponent className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent orders found in this timeframe.
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        {order.customer_name || 'Guest Customer'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        #{(order.id || '').slice(0, 8)} •{' '}
                        {order.created_at &&
                          new Date(order.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        ₹{Number(order.total || 0).toFixed(2)}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                          order.status || 'pending'
                        )}`}
                      >
                        {order.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active orders to display for this timeframe.
              </p>
            ) : (
              <div className="space-y-4">
                {orderStatusSummary.map(({ status, count }) => {
                  const percentage =
                    totalActiveOrders > 0
                      ? Math.round((count / totalActiveOrders) * 100)
                      : 0;

                  const barColor =
                    status === 'delivered'
                      ? 'bg-green-500'
                      : status === 'pending'
                      ? 'bg-yellow-500'
                      : status === 'processing'
                      ? 'bg-blue-500'
                      : status === 'shipped'
                      ? 'bg-purple-500'
                      : 'bg-gray-400';

                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Release & Admin Updates Section */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-950 font-serif">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              What's New & Recently Implemented
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive list of new features, storefront optimizations, and admin controls
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
            Version 2.4 Live
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Group 1 */}
            <div className="p-3.5 bg-white rounded-lg border border-gray-100 shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Sales & Urgency Manager</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Site-wide sales campaigns with auto-expiry countdown timers.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Independent Hype Stock marketing counts (separate from real inventory).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Promo tags (B1G1 / Offers) with 1-click catalog updates.</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/admin/sales')}
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5 pt-1 text-[11px]"
              >
                Open Sales Manager <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Group 2 */}
            <div className="p-3.5 bg-white rounded-lg border border-gray-100 shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Gamified Cart Drawer & Confetti</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Milestone progress bar (Free Ship at ₹599, Gift at ₹899, 10% Off at ₹1299).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Celebratory Confetti particle bursts upon crossing each milestone.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>In-drawer coupon input + personalized gift note + savings badge.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Mobile cross (X) button & native browser back-button drawer close.</span>
                </li>
              </ul>
            </div>

            {/* Group 3 */}
            <div className="p-3.5 bg-white rounded-lg border border-gray-100 shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Storefront UI & Catalog Grid</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Dedicated public Sale Campaign page at <code>/sale</code> with live countdown.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Compact 5-column product grid on desktop & 2-column on mobile.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Real category circles (Succulents, Cactus, Snake Plants, Combos, Pots).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Uniform height banner carousel preventing layout shifts.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Corporate bulk orders inquiry page at <code>/bulk-orders</code>.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
