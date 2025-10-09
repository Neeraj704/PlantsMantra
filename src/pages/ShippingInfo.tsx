import SEOTags from '@/components/SEOTags';

const ShippingInfo = () => {
  return (
    <>
      <SEOTags
        title="Shipping Information | Verdant"
        description="Learn about our shipping policies, delivery times, and rates for plant orders."
      />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold mb-8">Shipping Information</h1>
        
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Delivery Times</h2>
            <p className="text-muted-foreground mb-4">
              We process and ship orders within 1-2 business days. Standard delivery takes 3-7 business days depending on your location.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Metro cities: 3-5 business days</li>
              <li>Other locations: 5-7 business days</li>
              <li>Remote areas: 7-10 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Shipping Rates</h2>
            <p className="text-muted-foreground mb-4">
              We offer competitive shipping rates based on your order value:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Orders above ₹999: FREE shipping</li>
              <li>Orders below ₹999: ₹99 shipping fee</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Packaging</h2>
            <p className="text-muted-foreground">
              All plants are carefully packaged with protective materials to ensure they arrive in perfect condition. We use eco-friendly packaging materials whenever possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Tracking</h2>
            <p className="text-muted-foreground">
              Once your order ships, you'll receive a tracking number via email to monitor your delivery status.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default ShippingInfo;
