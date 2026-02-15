// src/pages/admin/AdminOrderDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Package, MapPin, CreditCard, Edit2, Check, X, Download, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // extra fields we attach after joining with products table
  product_slug?: string | null;
  product_image_url?: string | null;
  product_image_alt?: string | null;
}

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingAwb, setIsEditingAwb] = useState(false);
  const [newAwb, setNewAwb] = useState('');
  const [downloadingLabel, setDownloadingLabel] = useState(false);

  useEffect(() => {
    if (order) {
      setNewAwb(order.awb || '');
    }
  }, [order]);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ... fetchOrderDetails ...

  const handleUpdateAwb = async () => {
    if (!order) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ awb: newAwb || null } as any)
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Tracking number updated');
      setIsEditingAwb(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('Error updating AWB:', error);
      toast.error('Failed to update tracking number');
    }
  };

  const handleDownloadLabel = async () => {
    if (!order?.awb) {
      toast.error('No AWB assigned');
      return;
    }

    setDownloadingLabel(true);
    try {
      const funcUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delhivery-get-label?awb=${encodeURIComponent(order.awb)}`;

      const res = await fetch(funcUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch label' }));
        toast.error(err?.message || 'Failed to download label');
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
      console.error('Download label error:', e);
      toast.error('Failed to download label');
    } finally {
      setDownloadingLabel(false);
    }
  };

  const fetchOrderDetails = async () => {
    if (!id) return;
    setLoading(true);

    try {
      // Fetch the main order
      const { data: orderData, error: orderError } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (orderError || !orderData) {
        toast.error('Failed to load order');
        setOrder(null);
        setOrderItems([]);
        setLoading(false);
        return;
      }

      // Fetch the order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items' as any)
        .select('*')
        .eq('order_id', id);

      if (itemsError) {
        toast.error('Failed to load order items');
      }

      let items: OrderItem[] = (itemsData || []) as unknown as OrderItem[];

      // Collect product_ids for a join to products table
      const productIds = Array.from(
        new Set(
          items
            .map((item) => item.product_id)
            .filter((pid): pid is string => Boolean(pid))
        )
      );

      if (productIds.length > 0) {
        // Fetch only the fields we need from products
        const { data: productsData, error: productsError } = await supabase
          .from('products' as any)
          .select('id, slug, main_image_url, main_image_alt, name')
          .in('id', productIds);

        if (productsError) {
          toast.error('Failed to load product details for items');
        }

        if (productsData && Array.isArray(productsData)) {
          const productMap = new Map<string, any>(
            productsData.map((p: any) => [p.id, p])
          );

          items = items.map((item) => {
            const product = item.product_id
              ? productMap.get(item.product_id)
              : null;

            return {
              ...item,
              product_slug: product?.slug ?? null,
              product_image_url: product?.main_image_url ?? null,
              product_image_alt:
                product?.main_image_alt ?? product?.name ?? item.product_name,
            };
          });
        }
      }

      setOrder(orderData as unknown as Order);
      setOrderItems(items);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Something went wrong while loading order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;

    const { error } = await supabase
      .from('orders' as any)
      .update({ status: newStatus } as any)
      .eq('id', order.id);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success('Order status updated');
      fetchOrderDetails();
    }
  };

  const handlePaymentStatusUpdate = async (newStatus: string) => {
    if (!order) return;

    const { error } = await supabase
      .from('orders' as any)
      .update({ payment_status: newStatus } as any)
      .eq('id', order.id);

    if (error) {
      toast.error('Failed to update payment status');
    } else {
      toast.success('Payment status updated');
      setOrder({ ...order, payment_status: newStatus });
    }
  };

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

  const handleOpenProduct = (slug?: string | null) => {
    if (!slug) return;
    const url = `/product/${slug}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const shippingAddress = order.shipping_address as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground mt-1">
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Select value={order.status} onValueChange={handleStatusUpdate}>
          <SelectTrigger className="w-40">
            <SelectValue>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Customer & Shipping Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{order.customer_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{order.customer_phone || 'N/A'}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Shipping Address</p>
              <div className="text-sm space-y-1">
                <p className="font-medium">{shippingAddress?.full_name}</p>
                <p>{shippingAddress?.address_line1}</p>
                {shippingAddress?.address_line2 && (
                  <p>{shippingAddress?.address_line2}</p>
                )}
                <p>
                  {shippingAddress?.city}, {shippingAddress?.state}{' '}
                  {shippingAddress?.postal_code}
                </p>
                <p>{shippingAddress?.country}</p>
                <p className="mt-2">Phone: {shippingAddress?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment & Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
              <Select
                value={order.payment_status || 'checking'}
                onValueChange={handlePaymentStatusUpdate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Intent ID</p>
              <p className="font-mono text-sm">
                {order.payment_intent_id || 'N/A'}
              </p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Tracking Number</p>
                {order.awb && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDownloadLabel}
                    disabled={downloadingLabel}
                  >
                    {downloadingLabel ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    Label
                  </Button>
                )}
              </div>

              {isEditingAwb ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newAwb}
                    onChange={(e) => setNewAwb(e.target.value)}
                    placeholder="Enter AWB"
                    className="h-8"
                  />
                  <Button size="sm" className="h-8 w-8 p-0" onClick={handleUpdateAwb}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsEditingAwb(false);
                      setNewAwb(order.awb || '');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <p className="font-medium font-mono">
                    {order.awb || 'Not assigned'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditingAwb(true)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {order.status === 'cancelled' && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cancellation Reason
                  </p>
                  <p className="text-sm">
                    {(order as any).cancellation_reason || 'No reason provided'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancelled on{' '}
                    {(order as any).cancelled_at
                      ? new Date(
                        (order as any).cancelled_at
                      ).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between items-start py-3 border-b last:border-0 ${item.product_slug ? 'hover:bg-muted/40 cursor-pointer' : ''
                  }`}
                onClick={() => handleOpenProduct(item.product_slug)}
              >
                <div className="flex items-start gap-3 flex-1">
                  {item.product_image_url && (
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted/40 flex-shrink-0">
                      <img
                        src={item.product_image_url}
                        alt={item.product_image_alt || item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant_name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantity: {item.quantity}
                    </p>
                    {item.product_slug && (
                      <p className="text-xs text-primary mt-1 underline">
                        Open product page in new tab
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ₹{Number(item.subtotal).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ₹{Number(item.unit_price).toFixed(2)} each
                  </p>
                </div>
              </div>
            ))}

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Discount{' '}
                    {order.coupon_code && `(${order.coupon_code})`}
                  </span>
                  <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrderDetail;
