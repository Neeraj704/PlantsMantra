import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { getProxiedUrl } from '@/integrations/supabase/client';

export const CartDrawer = () => {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getSubtotal, 
    isCartOpen, 
    setCartOpen 
  } = useCart();
  
  const navigate = useNavigate();

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setCartOpen(false);
    navigate('/cart');
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 font-serif text-xl">
            <ShoppingBag className="w-5 h-5" />
            Your Cart ({items.reduce((acc, item) => acc + item.quantity, 0)})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-16 h-16 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Looks like you haven't added any beautiful plants yet.
            </p>
            <Button onClick={() => { setCartOpen(false); navigate('/shop'); }}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const imgSrc = getProxiedUrl(item.product.main_image_url) || '/placeholder.svg';
                  const price = (item.product.sale_price || item.product.base_price) + (item.variant?.price_adjustment || 0);

                  return (
                    <div key={`${item.product.id}-${item.variant?.id}`} className="flex gap-4 bg-background">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img src={imgSrc} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <Link 
                              to={`/product/${item.product.slug}`} 
                              onClick={() => setCartOpen(false)}
                              className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                            >
                              {item.product.name}
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 -mt-1 -mr-1"
                              onClick={() => removeItem(item.product.id, item.variant?.id)}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>
                          )}
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <div className="flex items-center border rounded-md">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-none"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-none"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-sm">₹{(price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t p-4 bg-muted/20">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold text-lg">₹{getSubtotal().toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Shipping and taxes calculated at checkout.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={handleViewCart}>
                  View Cart
                </Button>
                <Button className="w-full gradient-hero" onClick={handleCheckout}>
                  Checkout
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
