import SEOTags from '@/components/SEOTags';

const ShippingInfo = () => {
  return (
    <>
      <SEOTags
        title="Shipping Information | PlantsMantra"
        description="Learn about our shipping policies, delivery times, and rates for plant orders."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Shipping Information</h1>
            <p className="text-lg text-muted-foreground mb-12">Everything you need to know about our delivery process</p>
            
            <div className="space-y-8">
              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">🚚</span>
                  Delivery Times
                </h2>
                <p className="text-muted-foreground mb-4">
                  We process and ship orders within 1-2 business days. Standard delivery takes 3-7 business days depending on your location.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Metro cities:</strong> 3-5 business days</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Other locations:</strong> 5-7 business days</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Remote areas:</strong> 7-10 business days</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">💰</span>
                  Shipping Rates
                </h2>
                <p className="text-muted-foreground mb-4">
                  We offer competitive shipping rates based on your order value:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Orders above ₹999:</strong> FREE shipping</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Orders below ₹999:</strong> ₹99 shipping fee</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">📦</span>
                  Packaging
                </h2>
                <p className="text-muted-foreground">
                  All plants are carefully packaged with protective materials to ensure they arrive in perfect condition. We use eco-friendly packaging materials whenever possible.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">📍</span>
                  Tracking
                </h2>
                <p className="text-muted-foreground">
                  Once your order ships, you'll receive a tracking number via email to monitor your delivery status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShippingInfo;
