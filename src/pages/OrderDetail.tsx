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
import { ChevronLeft, Package, MapPin, CreditCard, Truck, X, IndianRupee } from 'lucide-react'; // Added IndianRupee and removed Calendar

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user && orderId) {
      fetchOrderDetails();
    }
  }, [user, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    
    // Fetch order
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
    setLoading(false);
  };

  const handleCancelOrder = async () => {
    if (!order || !user) return;

    // Only allow cancellation for pending and processing orders
    if (order.status !== 'pending' && order.status !== 'processing') {
      toast.error('This order cannot be cancelled. Please contact us at +91-1234567890 for assistance.', {
        duration: 5000
      });
      return;
    }
    
    setCancelling(true);
    const { error } = await supabase
      .from('orders' as any)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelled by customer'
      } as any)
      .eq('id', order.id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to cancel order');
    } else {
      toast.success('Order cancelled successfully');
      fetchOrderDetails();
    }
    setCancelling(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const canCancelOrder = order.status === 'pending' || order.status === 'processing';
  const shippingAddress = order.shipping_address as any;
  const shippingCost = (order as any).shipping_cost || 0; // Read new field
  const discountAmount = order.discount_amount || 0; // Read new field

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/account')}
            className="mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-serif font-bold mb-2">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="text-muted-foreground">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{shippingAddress?.full_name}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {shippingAddress?.address_line1}
                  {shippingAddress?.address_line2 && `, ${shippingAddress.address_line2}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postal_code}
                </p>
                <p className="text-sm text-muted-foreground">{shippingAddress?.country}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Phone: {shippingAddress?.phone}
                </p>
              </CardContent>
            </Card>

            {/* Payment & Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Status</span>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status || 'Pending'}
                  </Badge>
                </div>
                {/* Payment Method - Added */}
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payment Method</span>
                    <Badge variant="secondary" className="capitalize">
                        {order.payment_method || 'N/A'}
                    </Badge>
                </div>
                {order.tracking_number && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tracking Number</span>
                    </div>
                    <p className="font-mono text-sm font-semibold">{order.tracking_number}</p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Order Date</span>
                  <span className="text-sm font-medium">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{item.subtotal.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">₹{item.unit_price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary - Updated to include Shipping Cost and Discount */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{order.subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  {shippingCost === 0 ? (
                      <span className="font-semibold text-green-600">FREE</span>
                  ) : (
                      <span className="font-semibold">₹{shippingCost.toFixed(2)}</span>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              {canCancelOrder && (
                <div className="mt-6">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <X className="w-4 h-4 mr-2" />
                        Cancel Order
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this order? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelOrder}
                          disabled={cancelling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderDetail;