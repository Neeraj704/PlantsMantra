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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Orders count
    const { count: ordersCount } = await supabase
      .from('orders' as any)
      .select('*', { count: 'exact', head: true });

    // Customers count (profiles)
    const { count: customersCount } = await supabase
      .from('profiles' as any)
      .select('*', { count: 'exact', head: true });

    // Revenue calculation
    const { data: orders } = await supabase
      .from('orders' as any)
      .select('total');
    
    const revenue = orders?.reduce((sum: number, order: any) => sum + order.total, 0) || 0;

    setStats({
      products: productsCount || 0,
      orders: ordersCount || 0,
      customers: customersCount || 0,
      revenue: revenue
    });
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.products,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Total Orders',
      value: stats.orders,
      icon: ShoppingCart,
      color: 'text-green-600'
    },
    {
      title: 'Total Customers',
      value: stats.customers,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-serif font-bold mb-8">Dashboard</h1>
      
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recent orders and updates will appear here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Manage your store from the sidebar menu
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
