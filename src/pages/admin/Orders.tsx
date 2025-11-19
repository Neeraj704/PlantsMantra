// src/pages/admin/Orders.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Search, Eye, Download, X } from 'lucide-react';
import { toast } from 'sonner';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'created_at' | 'total' | 'customer_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processingCancelId, setProcessingCancelId] = useState<string | null>(null);
  const [downloadingAwb, setDownloadingAwb] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setOrders(data as unknown as Order[]);
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders' as any)
      .update({ status: newStatus } as any)
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success('Order status updated');
      fetchOrders();
    }
  };

  const handleSort = (field: 'created_at' | 'total' | 'customer_name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownloadLabel = async (awb: string | null) => {
    if (!awb) {
      toast.error('AWB missing');
      return;
    }

    setDownloadingAwb(awb);
    try {
      // Use raw fetch for binary label download as specified.
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delhivery-get-label?awb=${encodeURIComponent(awb)}`;

      const res = await fetch(funcUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch label' }));
        toast.error(err?.message || 'Failed to download label');
        setDownloadingAwb(null);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${awb}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Label downloaded');
    } catch (e: any) {
      toast.error('Failed to download label');
    } finally {
      setDownloadingAwb(null);
    }
  };

  const handleCancelShipment = async (order: Order) => {
    if (!order.awb) {
      toast.error('No AWB assigned');
      return;
    }
    setProcessingCancelId(order.id);
    try {
      // Use Supabase Functions invoke via supabase client (handles URL + auth)
      const resp = await supabase.functions.invoke('delhivery-cancel', {
        method: 'POST',
        body: JSON.stringify({ awb: order.awb }),
      });

      if (resp.error) {
        toast.error((resp.error as any).message || 'Failed to cancel shipment');
      } else {
        // resp.data contains JSON string or object depending on edge function
        toast.success('Shipment cancelled');
        fetchOrders();
      }
    } catch (e: any) {
      toast.error('Failed to cancel shipment');
    } finally {
      setProcessingCancelId(null);
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch =
        (order.customer_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'customer_name') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by email, name or id" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-4">Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">AWB</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">{order.id}</td>
                    <td className="p-4">
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                    </td>
                    <td className="p-4">₹{Number(order.total).toFixed(2)}</td>
                    <td className="p-4">
                      <Badge className={getStatusColor(order.status || 'pending')}>{order.status}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="font-mono">{order.awb || '—'}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button variant="outline" size="sm" disabled={!order.awb || downloadingAwb === order.awb} onClick={() => handleDownloadLabel(order.awb || null)}>
                          <Download className="w-4 h-4" />
                          {downloadingAwb === order.awb ? 'Downloading...' : 'Label'}
                        </Button>

                        <Button variant="destructive" size="sm" disabled={!order.awb || processingCancelId === order.id} onClick={() => handleCancelShipment(order)}>
                          <X className="w-4 h-4" />
                          {processingCancelId === order.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;