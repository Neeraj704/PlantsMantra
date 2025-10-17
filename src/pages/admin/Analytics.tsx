import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  RotateCcw, 
  Percent,
  DollarSign,
  Package,
  TrendingDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/lib/formatCurrency';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    newCustomers: 0,
    returningCustomers: 0,
    conversionRate: 0,
    avgOrderValue: 0
  });
  const [salesTrends, setSalesTrends] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [orderFulfillment, setOrderFulfillment] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString()) as any;

    // Fetch all customers
    const { data: allCustomers } = await supabase
      .from('profiles')
      .select('id, created_at') as any;

    // Fetch order items with product info
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, product_name, product_id, quantity, subtotal')
      .gte('created_at', startDate.toISOString()) as any;

    if (orders) {
      // Calculate KPIs
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate new vs returning customers
      const newCustomersInPeriod = allCustomers?.filter((c: any) => 
        new Date(c.created_at) >= startDate
      ).length || 0;

      const uniqueCustomers = new Set(orders.map((o: any) => o.user_id).filter(Boolean));
      const returningRate = uniqueCustomers.size > 0 
        ? ((uniqueCustomers.size - newCustomersInPeriod) / uniqueCustomers.size * 100)
        : 0;

      setStats({
        totalRevenue,
        totalOrders,
        newCustomers: newCustomersInPeriod,
        returningCustomers: returningRate,
        conversionRate: 3.2, // Mock data - would need traffic analytics
        avgOrderValue
      });

      // Sales trends by day
      const trendMap = new Map();
      orders.forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString();
        const current = trendMap.get(date) || { date, revenue: 0, orders: 0 };
        current.revenue += parseFloat(order.total || 0);
        current.orders += 1;
        trendMap.set(date, current);
      });
      setSalesTrends(Array.from(trendMap.values()).slice(-14));

      // Order fulfillment status
      const statusMap = new Map();
      orders.forEach((order: any) => {
        const status = order.status || 'pending';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      setOrderFulfillment(
        Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Payment methods
      const paymentMap = new Map();
      orders.forEach((order: any) => {
        const method = order.payment_method || 'Unknown';
        paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
      });
      setPaymentMethods(
        Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }))
      );
    }

    if (orderItems) {
      // Top products
      const productMap = new Map();
      orderItems.forEach((item: any) => {
        const key = item.product_id;
        const current = productMap.get(key) || {
          name: item.product_name,
          units: 0,
          revenue: 0
        };
        current.units += item.quantity;
        current.revenue += parseFloat(item.subtotal || 0);
        productMap.set(key, current);
      });
      const topProds = Array.from(productMap.values())
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(topProds);

      // Fetch products with categories for category performance
      const { data: products } = await supabase
        .from('products')
        .select('id, category_id, categories(name)') as any;

      // Category performance from order items
      const categoryMap = new Map();
      orderItems.forEach((item: any) => {
        const product = products?.find((p: any) => p.id === item.product_id);
        const categoryName = product?.categories?.name || 'Uncategorized';
        const current = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, current + parseFloat(item.subtotal || 0));
      });
      setCategoryPerformance(
        Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
      );
    }

    setLoading(false);
  };

  const exportCSV = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', stats.totalRevenue],
      ['Total Orders', stats.totalOrders],
      ['New Customers', stats.newCustomers],
      ['Avg Order Value', stats.avgOrderValue]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      trend: '+12.5%',
      positive: true
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      trend: '+8.2%',
      positive: true
    },
    {
      title: 'New Customers',
      value: stats.newCustomers.toString(),
      icon: Users,
      trend: '+15.3%',
      positive: true
    },
    {
      title: 'Returning Customers',
      value: `${stats.returningCustomers.toFixed(1)}%`,
      icon: RotateCcw,
      trend: '-2.1%',
      positive: false
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: Percent,
      trend: '+0.5%',
      positive: true
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats.avgOrderValue),
      icon: Package,
      trend: '+5.2%',
      positive: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold">Analytics Overview</h1>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <IconComponent className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`text-sm flex items-center gap-1 mt-1 ${
                  stat.positive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.trend}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sales Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
              orders: { label: 'Orders', color: 'hsl(var(--secondary))' }
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Revenue', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Revenue', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Order Fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle>Order Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Orders', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderFulfillment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {orderFulfillment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Orders', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats.newCustomers}</div>
              <div className="text-sm text-muted-foreground">New Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">{stats.returningCustomers.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Returning Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{stats.totalOrders}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
