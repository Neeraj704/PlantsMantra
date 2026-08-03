// src/pages/admin/AdminFarmerPayouts.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Edit2, 
  X, 
  Plus, 
  Check, 
  RefreshCw,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AdminFarmerPayouts = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'cancelled'>('all');
  
  // Status Update Dialog States
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newPayoutStatus, setNewPayoutStatus] = useState<'paid' | 'unpaid' | 'cancelled'>('unpaid');
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>('Order Cancelled');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  // Date filter (Year and Month)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

  // Products state for Cost Manager
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editBasePrice, setEditBasePrice] = useState<string>('');
  const [editActualPrice, setEditActualPrice] = useState<string>('');
  const [newPlant, setNewPlant] = useState({
    name: '',
    slug: '',
    base_price: '',
    actual_price: '',
  });

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      toast.error('Failed to load products list');
    } finally {
      setProductsLoading(false);
    }
  };

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

  const handleOpenStatusDialog = (order: Order) => {
    setSelectedOrderForStatus(order);
    setNewPayoutStatus((order.farmer_payout_status as any) || 'unpaid');
    const reason = order.farmer_payout_cancel_reason;
    if (reason === 'Order Cancelled' || reason === 'Customer Returned' || reason === 'Test Order') {
      setCancelReasonPreset(reason);
      setCustomCancelReason('');
    } else if (reason) {
      setCancelReasonPreset('Custom');
      setCustomCancelReason(reason);
    } else {
      setCancelReasonPreset('Order Cancelled');
      setCustomCancelReason('');
    }
    setIsStatusDialogOpen(true);
  };

  const handleSavePayoutStatusDetail = async () => {
    if (!selectedOrderForStatus) return;
    setStatusUpdating(true);

    let reason: string | null = null;
    if (newPayoutStatus === 'cancelled') {
      reason = cancelReasonPreset === 'Custom' ? customCancelReason.trim() : cancelReasonPreset;
      if (!reason) {
        toast.error('Please specify an exclusion/cancellation reason');
        setStatusUpdating(false);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('orders' as any)
        .update({ 
          farmer_payout_status: newPayoutStatus,
          farmer_payout_cancel_reason: reason
        } as any)
        .eq('id', selectedOrderForStatus.id);

      if (error) throw error;

      toast.success('Payout status updated successfully');
      
      // Update state locally
      setOrders(orders.map(o => o.id === selectedOrderForStatus.id ? { 
        ...o, 
        farmer_payout_status: newPayoutStatus, 
        farmer_payout_cancel_reason: reason 
      } : o));
      
      setIsStatusDialogOpen(false);
    } catch (e: any) {
      console.error('Failed to update payout status details:', e);
      toast.error(e.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStartEdit = (product: any) => {
    setEditingProductId(product.id);
    setEditBasePrice(product.base_price.toString());
    setEditActualPrice((product.actual_price || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
  };

  const handleSavePrices = async (productId: string) => {
    const base = parseFloat(editBasePrice);
    const actual = parseFloat(editActualPrice);

    if (isNaN(base) || isNaN(actual)) {
      toast.error('Prices must be valid numbers');
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          base_price: base,
          actual_price: actual
        })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Prices updated successfully');
      setEditingProductId(null);
      
      // Update state locally
      setProducts(products.map(p => p.id === productId ? { ...p, base_price: base, actual_price: actual } : p));
      
      // Reload payouts to reflect changes if necessary
      fetchPayouts();
    } catch (e: any) {
      console.error('Error updating prices:', e);
      toast.error('Failed to update plant prices');
    }
  };

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlant.name || !newPlant.base_price || !newPlant.actual_price) {
      toast.error('Name, Base Price, and Farmer Payout are required');
      return;
    }

    const base = parseFloat(newPlant.base_price);
    const actual = parseFloat(newPlant.actual_price);

    if (isNaN(base) || isNaN(actual)) {
      toast.error('Prices must be valid numbers');
      return;
    }

    // Auto-generate slug
    const slug = newPlant.slug || newPlant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: newPlant.name,
          slug,
          base_price: base,
          actual_price: actual,
          status: 'active',
          stock_status: 'in_stock',
          description: `Fresh, high-quality agricultural plant: ${newPlant.name}`,
          is_featured: false
        }]);

      if (error) throw error;

      toast.success('New plant added successfully');
      setNewPlant({ name: '', slug: '', base_price: '', actual_price: '' });
      fetchProducts();
    } catch (e: any) {
      console.error('Error adding product:', e);
      toast.error(e.message || 'Failed to add new plant');
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
      (statusFilter === 'unpaid' && (!order.farmer_payout_status || order.farmer_payout_status === 'unpaid'));

    return matchesSearch && matchesStatus;
  });

  // Exclude cancelled payouts from financial calculations
  const nonCancelledOrders = filteredOrders.filter(o => o.farmer_payout_status !== 'cancelled');

  const totalSales = nonCancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPayoutOwed = nonCancelledOrders
    .filter(o => o.farmer_payout_status !== 'paid')
    .reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  const totalPayoutPaid = nonCancelledOrders
    .filter(o => o.farmer_payout_status === 'paid')
    .reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  
  const totalPayoutAll = nonCancelledOrders.reduce((sum, o) => sum + Number(o.farmer_payout_total || 0), 0);
  const netProfit = totalSales - totalPayoutAll;

  const filteredProducts = products.filter((product) => 
    product.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (product.botanical_name || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (product.slug || '').toLowerCase().includes(productSearchQuery.toLowerCase())
  );

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

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-80 grid-cols-2 mb-4">
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="costs">Plant Cost Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6 mt-4">
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
                <option value="cancelled">Excluded / Cancelled</option>
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

                      const isCancelled = order.farmer_payout_status === 'cancelled';

                      return (
                        <tr 
                          key={order.id} 
                          className={`hover:bg-muted/10 transition-colors ${
                            isCancelled ? 'opacity-60 bg-muted/5' : ''
                          }`}
                        >
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
                          <td className={`px-6 py-4 text-right font-serif whitespace-nowrap font-medium text-emerald-800 ${isCancelled ? 'line-through' : ''}`}>
                            ₹{(order.total || 0).toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 text-right font-serif whitespace-nowrap font-semibold text-amber-700 ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                            ₹{payout.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 text-right font-serif whitespace-nowrap font-semibold text-primary ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                            ₹{share.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <Badge className={
                                isPaid 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : isCancelled
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }>
                                {isPaid ? 'Paid' : isCancelled ? 'Excluded' : 'Unpaid'}
                              </Badge>
                              {isCancelled && order.farmer_payout_cancel_reason && (
                                <span className="text-[10px] text-muted-foreground mt-1 max-w-[120px] truncate" title={order.farmer_payout_cancel_reason}>
                                  {order.farmer_payout_cancel_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenStatusDialog(order)}
                              className="text-primary border-primary hover:bg-primary/5 h-8"
                            >
                              Update Status
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
        </TabsContent>

        <TabsContent value="costs" className="space-y-6 mt-4">
          {/* Quick-Add Form */}
          <Card className="p-6 bg-card border-dashed">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary" /> Add New Plant to Catalog
            </h2>
            <form onSubmit={handleCreatePlant} className="grid gap-4 md:grid-cols-4 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Plant Name *</label>
                <Input
                  value={newPlant.name}
                  onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                  placeholder="e.g. Aeonium Kiwi"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Website Price (INR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPlant.base_price}
                  onChange={(e) => setNewPlant({ ...newPlant, base_price: e.target.value })}
                  placeholder="e.g. 249"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Farmer Payout (INR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPlant.actual_price}
                  onChange={(e) => setNewPlant({ ...newPlant, actual_price: e.target.value })}
                  placeholder="e.g. 40"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Add Plant
              </Button>
            </form>
          </Card>

          {/* Catalog Cost Editing Table */}
          <Card className="bg-card overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <h3 className="font-semibold text-sm">Consolidated Pricing & Farmer Payout Catalog</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search plant by name..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs w-full"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={fetchProducts} className="text-xs h-8">
                  <RefreshCw className="w-3 h-3 mr-1" /> Reload
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
                  <tr>
                    <th className="px-6 py-4">Plant Name</th>
                    <th className="px-6 py-4 text-right">Website Price (INR)</th>
                    <th className="px-6 py-4 text-right">Farmer Payout Cost (INR)</th>
                    <th className="px-6 py-4 text-right">Your Profit (INR)</th>
                    <th className="px-6 py-4 text-center">Profit Margin (%)</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                        Loading pricing catalog...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        {products.length === 0 ? "No plants found in the database." : "No matching plants found."}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const isEditing = editingProductId === product.id;
                      
                      // Live math based on inputs or database state
                      const retail = isEditing ? parseFloat(editBasePrice) : product.base_price;
                      const payout = isEditing ? parseFloat(editActualPrice) : (product.actual_price || 0);
                      const profit = (retail || 0) - (payout || 0);
                      const margin = retail > 0 ? (profit / retail) * 100 : 0;

                      return (
                        <tr key={product.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {product.name}
                            {product.botanical_name && (
                              <span className="block text-xs text-muted-foreground italic font-normal">
                                {product.botanical_name}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 ml-auto text-right"
                                value={editBasePrice}
                                onChange={(e) => setEditBasePrice(e.target.value)}
                              />
                            ) : (
                              <span className="font-serif font-medium">₹{product.base_price.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 ml-auto text-right"
                                value={editActualPrice}
                                onChange={(e) => setEditActualPrice(e.target.value)}
                              />
                            ) : (
                              <span className="font-serif font-semibold text-amber-700">₹{(product.actual_price || 0).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-serif font-semibold text-primary">
                            ₹{isNaN(profit) ? '0.00' : profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge className={
                              margin > 25 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : margin > 15 
                                  ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                            }>
                              {isNaN(margin) ? '0.0%' : `${margin.toFixed(1)}%`}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSavePrices(product.id)}
                                  className="h-8 w-8 p-0 text-green-700 hover:text-green-800 hover:bg-green-50"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-8 w-8 p-0 text-red-700 hover:text-red-800 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(product)}
                                className="h-8"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Update Payout Status</DialogTitle>
            <DialogDescription>
              Adjust payment settlement or exclude this order from farmer calculations.
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForStatus && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <p><strong>Order ID:</strong> #{selectedOrderForStatus.id}</p>
                <p><strong>Customer Name:</strong> {selectedOrderForStatus.customer_name}</p>
                <p><strong>Order Total:</strong> ₹{(selectedOrderForStatus.total || 0).toFixed(2)}</p>
                <p><strong>Farmer Payout:</strong> ₹{(selectedOrderForStatus.farmer_payout_total || 0).toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">Select Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={newPayoutStatus === 'paid' ? 'default' : 'outline'}
                    onClick={() => setNewPayoutStatus('paid')}
                    className={newPayoutStatus === 'paid' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Paid
                  </Button>
                  <Button
                    type="button"
                    variant={newPayoutStatus === 'unpaid' ? 'default' : 'outline'}
                    onClick={() => setNewPayoutStatus('unpaid')}
                    className={newPayoutStatus === 'unpaid' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  >
                    <AlertCircle className="w-4 h-4 mr-1.5" /> Unpaid
                  </Button>
                  <Button
                    type="button"
                    variant={newPayoutStatus === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => setNewPayoutStatus('cancelled')}
                    className={newPayoutStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Exclude
                  </Button>
                </div>
              </div>

              {newPayoutStatus === 'cancelled' && (
                <div className="space-y-3 p-3 border rounded-lg bg-red-50/50">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-red-800 block">Exclusion Reason</label>
                    <select
                      value={cancelReasonPreset}
                      onChange={(e) => setCancelReasonPreset(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm"
                    >
                      <option value="Order Cancelled">Order Cancelled</option>
                      <option value="Customer Returned">Customer Returned</option>
                      <option value="Test Order">Test Order</option>
                      <option value="Custom">Custom Reason...</option>
                    </select>
                  </div>

                  {cancelReasonPreset === 'Custom' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground block">Write Custom Reason</label>
                      <Input
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        placeholder="e.g. Returned due to damage"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={statusUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePayoutStatusDetail}
              disabled={statusUpdating}
              className="bg-primary hover:bg-primary/95 text-white"
            >
              {statusUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFarmerPayouts;
