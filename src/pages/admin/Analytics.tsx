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
  TrendingDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  ResponsiveContainer,
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
    avgOrderValue: 0,
  });
  const [salesTrends, setSalesTrends] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [orderFulfillment, setOrderFulfillment] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch orders (EXCLUDING cancelled)
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .neq('status', 'cancelled') as any;

    // Fetch all customers
    const { data: allCustomers } = await supabase
      .from('profiles')
      .select('id, created_at') as any;

    // Fetch order items with product info (we will later filter by non-cancelled orders)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, product_name, product_id, quantity, subtotal')
      .gte('created_at', startDate.toISOString()) as any;

    if (orders) {
      // Calculate KPIs - all based ONLY on non-cancelled orders
      const totalRevenue = orders.reduce(
        (sum: number, order: any) => sum + parseFloat(order.total || 0),
        0
      );
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate new vs returning customers
      const newCustomersInPeriod =
        allCustomers?.filter(
          (c: any) => new Date(c.created_at) >= startDate
        ).length || 0;

      const uniqueCustomers = new Set(
        orders.map((o: any) => o.user_id).filter(Boolean)
      );
      const returningRate =
        uniqueCustomers.size > 0
          ? ((uniqueCustomers.size - newCustomersInPeriod) /
              uniqueCustomers.size) *
            100
          : 0;

      setStats({
        totalRevenue,
        totalOrders,
        newCustomers: newCustomersInPeriod,
        returningCustomers: returningRate,
        conversionRate: 3.2, // Mock data - would need traffic analytics
        avgOrderValue,
      });

      // Sales trends by day
      const trendMap = new Map<string, { date: string; revenue: number; orders: number }>();
      orders.forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString();
        const current = trendMap.get(date) || { date, revenue: 0, orders: 0 };
        current.revenue += parseFloat(order.total || 0);
        current.orders += 1;
        trendMap.set(date, current);
      });
      setSalesTrends(Array.from(trendMap.values()).slice(-14));

      // Order fulfillment status (non-cancelled only)
      const statusMap = new Map<string, number>();
      orders.forEach((order: any) => {
        const status = order.status || 'pending';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      setOrderFulfillment(
        Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Payment methods (non-cancelled only)
      const paymentMap = new Map<string, number>();
      orders.forEach((order: any) => {
        const method = order.payment_method || 'Unknown';
        paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
      });
      setPaymentMethods(
        Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }))
      );
    }

    if (orderItems && orders) {
      // Only include items from NON-cancelled orders
      const validOrderIds = new Set(orders.map((o: any) => o.id));
      const filteredOrderItems = orderItems.filter((item: any) =>
        validOrderIds.has(item.order_id)
      );

      // Top products
      const productMap = new Map<
        string,
        { name: string; units: number; revenue: number }
      >();
      filteredOrderItems.forEach((item: any) => {
        const key = item.product_id;
        const current =
          productMap.get(key) || {
            name: item.product_name,
            units: 0,
            revenue: 0,
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

      // Category performance from filtered order items (non-cancelled)
      const categoryMap = new Map<string, number>();
      filteredOrderItems.forEach((item: any) => {
        const product = products?.find((p: any) => p.id === item.product_id);
        const categoryName = product?.categories?.name || 'Uncategorized';
        const current = categoryMap.get(categoryName) || 0;
        categoryMap.set(
          categoryName,
          current + parseFloat(item.subtotal || 0)
        );
      });
      setCategoryPerformance(
        Array.from(categoryMap.entries()).map(([name, value]) => ({
          name,
          value,
        }))
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
      ['Avg Order Value', stats.avgOrderValue],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
  ];

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      trend: '+12.5%',
      positive: true,
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      trend: '+8.2%',
      positive: true,
    },
    {
      title: 'New Customers',
      value: stats.newCustomers.toString(),
      icon: Users,
      trend: '+15.3%',
      positive: true,
    },
    {
      title: 'Returning Customers',
      value: `${stats.returningCustomers.toFixed(1)}%`,
      icon: RotateCcw,
      trend: '-2.1%',
      positive: false,
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: Percent,
      trend: '+0.5%',
      positive: true,
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(stats.avgOrderValue),
      icon: Package,
      trend: '+5.2%',
      positive: true,
    },
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
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className="text-2xl font-bold mt-2">{card.value}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      card.positive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {card.positive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {card.trend}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Sales & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: 'Revenue',
                },
                orders: {
                  label: 'Orders',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="hsl(var(--accent))"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Volume (Last {timeRange} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ orders: { label: 'Orders', color: 'hsl(var(--primary))' } }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Products & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough data to show top products.
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.units} units sold
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(product.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough data to show category performance.
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: 'Revenue', color: 'hsl(var(--primary))' } }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={categoryPerformance}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {categoryPerformance.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fulfillment & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <BarChart data={orderFulfillment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
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
              <div className="text-3xl font-bold text-primary">
                {stats.newCustomers}
              </div>
              <div className="text-sm text-muted-foreground">New Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">
                {stats.returningCustomers.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Returning Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">
                {stats.totalOrders}
              </div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
