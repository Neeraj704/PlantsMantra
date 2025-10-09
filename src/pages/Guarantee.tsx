import SEOTags from '@/components/SEOTags';
import { Shield, Heart, Leaf, Package } from 'lucide-react';

const Guarantee = () => {
  return (
    <>
      <SEOTags
        title="7-Day Guarantee | Verdant"
        description="Our commitment to quality - all plants come with a 7-day health guarantee."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">7-Day Health Guarantee</h1>
            <p className="text-xl text-muted-foreground">
              Your satisfaction and plant health are our top priorities
            </p>
          </div>
          
          <div className="space-y-8">
            <div className="bg-card p-8 rounded-2xl border shadow-sm">
              <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                <span className="text-3xl">🤝</span>
                Our Commitment
              </h2>
              <p className="text-muted-foreground">
                We stand behind the quality of every plant we sell. Our 7-Day Health Guarantee ensures that your plants arrive in perfect condition and remain healthy during the critical first week in their new home.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-smooth">
                <Heart className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-serif font-semibold text-xl mb-3">Quality Assured</h3>
                <p className="text-muted-foreground">
                  Every plant is hand-selected and inspected before shipping to ensure it meets our high standards.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-smooth">
                <Package className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-serif font-semibold text-xl mb-3">Safe Delivery</h3>
                <p className="text-muted-foreground">
                  Plants are carefully packaged with protective materials to ensure they arrive safely at your doorstep.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-smooth">
                <Leaf className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-serif font-semibold text-xl mb-3">Healthy Plants</h3>
                <p className="text-muted-foreground">
                  We guarantee that plants will be disease-free, pest-free, and in excellent health upon arrival.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-smooth">
                <Shield className="w-10 h-10 mb-4 text-primary" />
                <h3 className="font-serif font-semibold text-xl mb-3">Full Protection</h3>
                <p className="text-muted-foreground">
                  If any issues arise within 7 days, we'll replace your plant or provide a full refund - no questions asked.
                </p>
              </div>
            </div>

            <div className="bg-card p-8 rounded-2xl border shadow-sm">
              <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                <span className="text-3xl">✅</span>
                What's Covered
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Plants that arrive damaged or diseased</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Plants that show signs of poor health within 7 days</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Incorrect plants or missing items</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Plants that don't match the product description</span>
                </li>
              </ul>
            </div>

            <div className="bg-card p-8 rounded-2xl border shadow-sm">
              <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                <span className="text-3xl">📋</span>
                How to Claim
              </h2>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">1.</span>
                  <span className="text-muted-foreground">Contact us within 7 days of receiving your order</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">2.</span>
                  <span className="text-muted-foreground">Provide clear photos of the plant and any issues</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">3.</span>
                  <span className="text-muted-foreground">Our team will review your claim within 24 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">4.</span>
                  <span className="text-muted-foreground">We'll arrange a replacement or issue a full refund</span>
                </li>
              </ol>
            </div>

            <div className="bg-muted/50 p-8 rounded-2xl border">
              <h2 className="text-2xl font-serif font-semibold mb-4 flex items-center gap-2">
                <span className="text-3xl">🌱</span>
                Care Tips for Success
              </h2>
              <p className="text-muted-foreground mb-4">
                While we guarantee your plant's arrival health, following these tips will ensure continued success:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Unpack your plant immediately upon arrival</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Water according to the included care instructions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Place in appropriate lighting conditions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Avoid temperature extremes during the first week</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <span className="text-muted-foreground">Contact us immediately if you notice any issues</span>
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

export default Guarantee;
