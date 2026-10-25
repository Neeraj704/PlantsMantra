// src/pages/admin/AdminOrderDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { Order } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Package, MapPin, CreditCard, Edit2, Check, X, Download, Loader2, Phone, Coins, ExternalLink, Scale } from 'lucide-react';

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
  const [packageWeight, setPackageWeight] = useState<string>('0.5');
  const [packageLength, setPackageLength] = useState<string>('15');
  const [packageBreadth, setPackageBreadth] = useState<string>('15');
  const [packageHeight, setPackageHeight] = useState<string>('15');
  const [creatingShipment, setCreatingShipment] = useState<boolean>(false);

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
    if (!order) return;

    setDownloadingLabel(true);
    try {
      const funcUrl = `${SUPABASE_URL}/functions/v1/shiprocket-get-label?orderId=${encodeURIComponent(order.id)}`;

      const res = await fetch(funcUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
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
      a.download = `label_${order.shiprocket_awb || order.awb || order.id}.pdf`;
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

  const handleCreateShipment = async () => {
    if (!order) return;
    const w = parseFloat(packageWeight);
    const l = parseFloat(packageLength);
    const b = parseFloat(packageBreadth);
    const h = parseFloat(packageHeight);

    if (isNaN(w) || w <= 0) {
      toast.error('Please enter a valid package weight (kg)');
      return;
    }
    if (isNaN(l) || l <= 0 || isNaN(b) || b <= 0 || isNaN(h) || h <= 0) {
      toast.error('Please enter valid package dimensions (L x B x H in cm)');
      return;
    }

    setCreatingShipment(true);
    try {
      toast.info('Sending custom dimensions to Shiprocket...');
      const { data, error: funcError } = await supabase.functions.invoke('shiprocket-create', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          weight: w,
          length: l,
          breadth: b,
          height: h,
        }),
      });
      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      toast.success('Shiprocket shipment created successfully! Opening dashboard...');
      
      // Open Shiprocket Seller Orders Dashboard in a new tab
      window.open('https://app.shiprocket.in/seller/orders', '_blank');

      fetchOrderDetails();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create Shiprocket shipment');
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleResetShipmentData = async () => {
    if (!order) return;

    const confirmReset = window.confirm(
      "Are you sure you want to reset shipment data? This will clear the AWB, shipment timestamp, and Shiprocket data, allowing you to create a new shipment."
    );
    if (!confirmReset) return;

    try {
      const { error } = await supabase
        .from('orders' as any)
        .update({
          awb: null,
          courier: null,
          shipment_created_at: null,
          shiprocket_order_id: null,
          shiprocket_shipment_id: null,
          shiprocket_awb: null,
          shiprocket_label_url: null,
          shiprocket_tracking_url: null,
          shiprocket_response: null,
          delhivery_response: null,
          shipment_status: 'Pending'
        } as any)
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Shipment data reset successfully');
      fetchOrderDetails();
    } catch (error) {
      console.error('Error resetting shipment data:', error);
      toast.error('Failed to reset shipment data');
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
          .select('id, slug, main_image_url, main_image_alt, name, actual_price, stock_status')
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
              catalog_actual_price: product?.actual_price ?? null,
              catalog_stock_status: product?.stock_status ?? null,
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

  const handleCallConfirmationStatusUpdate = async (newStatus: string) => {
    if (!order) return;

    try {
      const updateData: any = { call_confirmation_status: newStatus };

      // Automatically update order status based on call confirmation
      if (newStatus === 'confirmed') {
        updateData.status = 'processing';
      } else if (newStatus === 'cancelled') {
        updateData.status = 'cancelled';
      }

      const { error } = await supabase
        .from('orders' as any)
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      toast.success(`Call status updated to ${newStatus}`);

      // Option A: Confirmed status allows admin to review and input exact box dimensions before push
      fetchOrderDetails();
    } catch (e: any) {
      console.error('Failed to update call status:', e);
      toast.error('Failed to update call status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-slate-100 text-slate-800',
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
            <SelectItem value="returned">Returned</SelectItem>
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
            {order.payment_method === 'cod' && (
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> COD Call Confirmation
                </p>
                <Select
                  value={order.call_confirmation_status || 'pending'}
                  onValueChange={handleCallConfirmationStatusUpdate}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">🟡 Pending Call</SelectItem>
                    <SelectItem value="confirmed">🟢 Confirmed (Send to Shiprocket)</SelectItem>
                    <SelectItem value="no_answer">🟠 No Answer / Busy</SelectItem>
                    <SelectItem value="cancelled">🔴 Customer Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Payment Intent ID</p>
              <p className="font-mono text-sm">
                {order.payment_intent_id || 'N/A'}
              </p>
            </div>
            <Separator />
            {!order.awb ? (
              <div className="pt-2 space-y-4">
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-primary" /> Package Dimensions & Weight
                    </p>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Vol: {((parseFloat(packageLength) || 0) * (parseFloat(packageBreadth) || 0) * (parseFloat(packageHeight) || 0) / 5000).toFixed(2)} kg
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Weight (kg)
                      </label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0.05"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(e.target.value)}
                        placeholder="0.5"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Length (cm)
                      </label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={packageLength}
                        onChange={(e) => setPackageLength(e.target.value)}
                        placeholder="15"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Breadth (cm)
                      </label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={packageBreadth}
                        onChange={(e) => setPackageBreadth(e.target.value)}
                        placeholder="15"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">
                        Height (cm)
                      </label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={packageHeight}
                        onChange={(e) => setPackageHeight(e.target.value)}
                        placeholder="15"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleCreateShipment} 
                    disabled={creatingShipment}
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    {creatingShipment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Pushing to Shiprocket...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-1" />
                        Create & Push to Shiprocket
                      </>
                    )}
                  </Button>
                  {(order.shipment_created_at || order.shiprocket_response || order.delhivery_response) && (
                    <Button
                      variant="outline"
                      onClick={handleResetShipmentData}
                      className="w-full text-destructive border-destructive hover:bg-destructive/10"
                    >
                      Reset Shipment Data
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Paste AWB from Shiprocket dashboard
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newAwb}
                      onChange={(e) => setNewAwb(e.target.value)}
                      placeholder="e.g. 1234567890123"
                      className="h-9 font-mono"
                    />
                    <Button
                      size="sm"
                      className="h-9 px-3 shrink-0"
                      disabled={!newAwb.trim()}
                      onClick={handleUpdateAwb}
                    >
                      <Check className="w-4 h-4 mr-1" /> Save AWB
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Courier & Tracking</p>
                  <Badge variant="secondary" className="mt-1 font-medium">
                    {order.shiprocket_courier_name
                      ? `${order.shiprocket_courier_name} (via Shiprocket)`
                      : (order.courier || (order.shiprocket_awb ? 'Shiprocket' : (order.delhivery_response ? 'Delhivery' : 'Shiprocket')))}
                  </Badge>
                </div>
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

              {/* Saved package dimensions info */}
              {(() => {
                const pkg = (order.shiprocket_response as any)?.package_dimensions;
                if (!pkg) return null;
                const vol = ((pkg.length * pkg.breadth * pkg.height) / 5000).toFixed(2);
                return (
                  <div className="mb-2 p-2 rounded bg-muted/40 text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                    <span>Box: {pkg.weight} kg ({pkg.length}×{pkg.breadth}×{pkg.height} cm)</span>
                    <span>Vol: {vol} kg</span>
                  </div>
                );
              })()}

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
                <div className="flex flex-col gap-1.5 group">
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    {order.awb && (
                      <a
                        href={
                          order.shiprocket_tracking_url ||
                          (order.courier === 'Delhivery'
                            ? `https://www.delhivery.com/track/package/${order.awb}`
                            : `https://shiprocket.co/tracking/${order.shiprocket_awb || order.awb}`)
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        Track Shipment <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <a
                      href="https://app.shiprocket.in/seller/orders"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Shiprocket Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
              {(order.shipment_created_at || order.shiprocket_response || order.delhivery_response) && (
                <div className="mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetShipmentData}
                    className="w-full text-destructive text-xs h-8 hover:bg-destructive/10"
                  >
                    Reset Shipment Data
                  </Button>
                </div>
              )}
            </div>
            )}
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

      {/* Farmer Payout Details Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Farmer Payout & Profit Splits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const isPayoutCancelled = order.farmer_payout_status === 'cancelled';
              const dynamicFarmerPayoutTotal = orderItems.reduce((sum, item: any) => {
                const isOutOfStock = item.catalog_stock_status === 'out_of_stock';
                const costPrice = isOutOfStock ? 0 : (item.catalog_actual_price !== null && item.catalog_actual_price !== undefined ? Number(item.catalog_actual_price) : Number(item.actual_price || 0));
                return sum + (costPrice * (item.quantity || 0));
              }, 0);
              const finalPayout = isPayoutCancelled ? 0 : dynamicFarmerPayoutTotal;
              const finalProfit = Number(order.total || 0) - finalPayout;

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Payout Status</p>
                      <p className="text-xs text-muted-foreground">Status of settlement with the farmer</p>
                    </div>
                    <Badge className={
                      order.farmer_payout_status === 'paid' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : order.farmer_payout_status === 'cancelled'
                          ? 'bg-gray-100 text-gray-800 border-gray-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                    }>
                      {order.farmer_payout_status === 'paid' 
                        ? 'Paid / Settled' 
                        : order.farmer_payout_status === 'cancelled'
                          ? 'Excluded / Cancelled'
                          : 'Unpaid / Owed'}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Customer Payment</span>
                      <span className="font-medium">₹{Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Farmer Payout (Cost Price)</span>
                      <span className="font-semibold text-amber-700">-₹{finalPayout.toFixed(2)}</span>
                    </div>
                    {isPayoutCancelled && (order as any).farmer_payout_cancel_reason && (
                      <div className="text-xs text-muted-foreground italic pl-3 border-l-2 border-muted">
                        Reason: {(order as any).farmer_payout_cancel_reason}
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold text-primary">
                      <span>Net Share (Your Profit)</span>
                      <span>₹{finalProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrderDetail;
