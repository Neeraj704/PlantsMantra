// src/pages/OrderDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { toast } from 'sonner';
import { ChevronLeft, Package, Download } from 'lucide-react';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingLabel, setDownloadingLabel] = useState(false);

  useEffect(() => {
    if (user && orderId) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      // Fetch order (only for current user)
      const { data: orderData, error: orderError } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .single();

      if (orderError) {
        toast.error('Order not found');
        navigate('/account');
        return;
      }

      // Fetch order items
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (orderData) setOrder(orderData as unknown as Order);
      if (itemsData) setOrderItems(itemsData);
    } catch (e: any) {
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!order?.awb) {
      toast.error('No AWB assigned yet');
      return;
    }
    setDownloadingLabel(true);
    try {
      // Use raw fetch for binary label download as specified.
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delhivery-get-label?awb=${encodeURIComponent(
        order.awb
      )}`;

      const res = await fetch(funcUrl, {
        method: 'GET',
        headers: {
          // Use publishable anon key for client-side invoke
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!res.ok) {
        let errMsg = 'Failed to fetch label';
        try {
          const j = await res.json();
          errMsg = j?.message || j?.error || errMsg;
        } catch {
          // ignore
        }
        toast.error(errMsg);
        setDownloadingLabel(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${order.awb}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Label downloaded');
    } catch (e: any) {
      toast.error('Failed to download label');
    } finally {
      setDownloadingLabel(false);
    }
  };

  const handleTrack = () => {
    if (!order?.awb) {
      toast.error('No AWB assigned yet');
      return;
    }
    window.open(`https://track.delhivery.com/?waybill=${encodeURIComponent(order.awb)}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      'in transit': 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status?.toLowerCase?.() || ''] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || loading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!order) {
    return <div className="min-h-screen pt-24 flex items-center justify-center">Order not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ChevronLeft /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Order #{order.id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Shipping To</p>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-sm">{order.shipping_address?.address_line1 || order.shipping_address?.add}</p>
                <p className="text-sm">
                  {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pin}
                </p>
                <p className="text-sm">{order.customer_phone}</p>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p className="font-medium">{order.payment_status || 'Pending'}</p>

                <Separator className="my-3" />

                <p className="text-sm text-muted-foreground">Shipment</p>
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">AWB</p>
                    <p className="font-mono">{order.awb || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(order.shipment_status || 'pending') || ''}>
                      {(order.shipment_status || 'Pending').toString()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button onClick={handleTrack} variant="outline" size="sm">
                    Track Shipment
                  </Button>
                  <Button onClick={handleDownloadLabel} size="sm" disabled={!order.awb || downloadingLabel}>
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingLabel ? 'Downloading...' : 'Download Label'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && <p className="text-sm text-muted-foreground">{item.variant_name}</p>}
                    <p className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{item.subtotal.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrderDetail;