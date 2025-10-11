import SEOTags from '@/components/SEOTags';

const Returns = () => {
  return (
    <>
      <SEOTags
        title="Returns & Exchanges | PlantsMantra"
        description="Learn about our return and exchange policy for plants and plant products."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Returns & Exchanges</h1>
            <p className="text-lg text-muted-foreground mb-12">We're here to ensure your complete satisfaction</p>
            
            <div className="space-y-8">
              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">💚</span>
                  Our Promise
                </h2>
                <p className="text-muted-foreground">
                  We want you to be completely satisfied with your purchase. If you're not happy with your plants, we're here to help.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">↩️</span>
                  Return Policy
                </h2>
                <p className="text-muted-foreground mb-4">
                  You can return your plants within 7 days of delivery if:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">The plant arrived damaged or diseased</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">You received the wrong plant</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">The plant doesn't match the description</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">📋</span>
                  Return Process
                </h2>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-semibold">1.</span>
                    <span className="text-muted-foreground">Contact our support team within 7 days of delivery</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-semibold">2.</span>
                    <span className="text-muted-foreground">Provide photos of the plant and packaging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-semibold">3.</span>
                    <span className="text-muted-foreground">Our team will review and approve your return</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-semibold">4.</span>
                    <span className="text-muted-foreground">Ship the plant back using our prepaid label</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-semibold">5.</span>
                    <span className="text-muted-foreground">Receive a full refund once we receive the plant</span>
                  </li>
                </ol>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">🔄</span>
                  Exchanges
                </h2>
                <p className="text-muted-foreground">
                  We're happy to exchange plants if you'd like a different variety. Simply follow the return process and let us know which plant you'd prefer instead.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                  <span className="text-3xl">⚠️</span>
                  Non-Returnable Items
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Plants damaged due to improper care after delivery</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Sale or clearance items</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Gift cards</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Returns;
