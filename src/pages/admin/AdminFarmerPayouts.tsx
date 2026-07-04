// src/pages/admin/AdminFarmerPayouts.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coins, Search, ArrowUpDown, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminFarmerPayouts = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  
  // Date filter (Year and Month)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = [
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString(),
  ];

  useEffect(() => {
    fetchPayouts();
  }, [selectedYear, selectedMonth]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders' as any)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply month/year filtering
      if (selectedMonth !== 'all') {
        const startMonth = parseInt(selectedMonth).toString().padStart(2, '0');
        const startDate = `${selectedYear}-${startMonth}-01T00:00:00Z`;
        
        // Calculate end date (first day of next month)
        let endYear = parseInt(selectedYear);
        let endMonth = parseInt(selectedMonth) + 1;
        if (endMonth > 12) {
          endMonth = 1;
          endYear += 1;
        }
        const endMonthStr = endMonth.toString().padStart(2, '0');
        const endDate = `${endYear}-${endMonthStr}-01T00:00:00Z`;

        query = query
          .gte('created_at', startDate)
          .lt('created_at', endDate);
      } else {
        // If all months, filter by year
        const startDate = `${selectedYear}-01-01T00:00:00Z`;
        const endDate = `${parseInt(selectedYear) + 1}-01-01T00:00:00Z`;
        query = query
          .gte('created_at', startDate)
          .lt('created_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data || []) as unknown as Order[]);
    } catch (e: any) {
      console.error('Error fetching payouts:', e);
      toast.error('Failed to load farmer payouts data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayoutStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      const { error } = await supabase
        .from('orders' as any)
        .update({ farmer_payout_status: nextStatus } as any)
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Payout marked as ${nextStatus}`);
      
      // Update state locally
      setOrders(orders.map(o => o.id === orderId ? { ...o, farmer_payout_status: nextStatus } : o));
    } catch (e: any) {
      console.error('Failed to update payout status:', e);
      toast.error('Failed to update status');
    }
  };

  // Calculations
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'all' || 
      order.farmer_payout_status === statusFilter ||
      (statusFilter === 'unpaid' && !order.farmer_payout_status); // default is unpaid if blank

    return matchesSearch && matchesStatus;
  });

  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPayoutOwed = filteredOrders
    .filter(o => o.farmer_payout_status !== 'paid')
    .reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  const totalPayoutPaid = filteredOrders
    .filter(o => o.farmer_payout_status === 'paid')
    .reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  
  const totalPayoutAll = filteredOrders.reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  const netProfit = totalSales - totalPayoutAll;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
            <Coins className="w-8 h-8 text-primary" /> Farmer Payout Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track product cost distributions, profit splits, and payout settlements.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Revenue</CardTitle>
            <span className="text-muted-foreground text-sm font-semibold">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-emerald-800">
              ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For filtered month/year
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts Paid</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-emerald-700">
              ₹{totalPayoutPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Settled with farmer
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts Owed (Unpaid)</CardTitle>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-amber-700">
              ₹{totalPayoutOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs settlement
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Profit Share</CardTitle>
            <span className="text-primary text-sm font-bold">Net</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-primary">
              ₹{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross Sales - Total Cost Price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Filter Panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Month Select */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Payout Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-background border border-input rounded-md px-3 py-1.5 text-sm"
          >
            <option value="all">All Payout Statuses</option>
            <option value="unpaid">Unpaid Owed</option>
            <option value="paid">Paid Settled</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or ID..."
            className="pl-9"
          />
        </div>
      </Card>

      {/* Payouts Table */}
      <Card className="bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4 text-right">Order Total</th>
                <th className="px-6 py-4 text-right">Farmer Payout</th>
                <th className="px-6 py-4 text-right">Profit Share</th>
                <th className="px-6 py-4 text-center">Payout Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    Loading farmer payout data...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const payout = Number(order.farmer_payout_total || 0);
                  const share = (order.total || 0) - payout;
                  const isPaid = order.farmer_payout_status === 'paid';

                  return (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 uppercase text-xs whitespace-nowrap">
                        <Badge variant="secondary">{order.payment_method}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-serif whitespace-nowrap font-medium text-emerald-800">
                        ₹{(order.total || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-serif whitespace-nowrap font-semibold text-amber-700">
                        ₹{payout.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-serif whitespace-nowrap font-semibold text-primary">
                        ₹{share.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge className={isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePayoutStatus(order.id, order.farmer_payout_status || 'unpaid')}
                          className={isPaid ? 'text-amber-700 border-amber-600 hover:bg-amber-50' : 'text-emerald-700 border-emerald-600 hover:bg-emerald-50'}
                        >
                          {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminFarmerPayouts;
