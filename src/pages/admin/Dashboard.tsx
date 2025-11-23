import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';

const Dashboard = () => {
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
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Customers count (profiles)
    const { count: customersCount } = await supabase
      .from('profiles' as any)
      .select('*', { count: 'exact', head: true });

    // Orders & revenue (EXCLUDING cancelled)
    const { data: ordersData } = await supabase
      .from('orders' as any)
      .select('id, total, status, customer_name, created_at')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    const orders = ordersData || [];

    const ordersCount = orders.length;
    const revenue =
      orders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0) || 0;

    // Recent orders (non-cancelled only)
    setRecentOrders(orders.slice(0, 5));

    // Order status summary (non-cancelled only)
    const statusMap = new Map<string, number>();
    orders.forEach((order: any) => {
      const status = order.status || 'pending';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statusArray = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));
    setOrderStatusSummary(statusArray);

    setStats({
      products: productsCount || 0,
      orders: ordersCount,
      customers: customersCount || 0,
      revenue,
    });
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.products,
      icon: Package,
      color: 'text-blue-600',
    },
    {
      title: 'Active Orders',
      value: stats.orders,
      icon: ShoppingCart,
      color: 'text-green-600',
    },
    {
      title: 'Total Customers',
      value: stats.customers,
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600',
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
    <div>
      <h1 className="text-3xl font-serif font-bold mb-8">Dashboard</h1>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title}>
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

      {/* New working sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent orders yet.
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

        {/* Order Status Overview (non-cancelled) */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active orders to display.
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
    </div>
  );
};

export default Dashboard;
