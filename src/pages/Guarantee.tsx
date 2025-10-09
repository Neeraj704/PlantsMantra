import SEOTags from '@/components/SEOTags';
import { Shield, Heart, Leaf, Package } from 'lucide-react';

const Guarantee = () => {
  return (
    <>
      <SEOTags
        title="7-Day Guarantee | Verdant"
        description="Our commitment to quality - all plants come with a 7-day health guarantee."
      />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-serif font-bold mb-4">7-Day Health Guarantee</h1>
            <p className="text-xl text-muted-foreground">
              Your satisfaction and plant health are our top priorities
            </p>
          </div>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-serif font-semibold mb-4">Our Commitment</h2>
              <p className="text-muted-foreground">
                We stand behind the quality of every plant we sell. Our 7-Day Health Guarantee ensures that your plants arrive in perfect condition and remain healthy during the critical first week in their new home.
              </p>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border rounded-lg">
                <Heart className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Quality Assured</h3>
                <p className="text-sm text-muted-foreground">
                  Every plant is hand-selected and inspected before shipping to ensure it meets our high standards.
                </p>
              </div>

              <div className="p-6 border rounded-lg">
                <Package className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Safe Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Plants are carefully packaged with protective materials to ensure they arrive safely at your doorstep.
                </p>
              </div>

              <div className="p-6 border rounded-lg">
                <Leaf className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Healthy Plants</h3>
                <p className="text-sm text-muted-foreground">
                  We guarantee that plants will be disease-free, pest-free, and in excellent health upon arrival.
                </p>
              </div>

              <div className="p-6 border rounded-lg">
                <Shield className="w-8 h-8 mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Full Protection</h3>
                <p className="text-sm text-muted-foreground">
                  If any issues arise within 7 days, we'll replace your plant or provide a full refund - no questions asked.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-semibold mb-4">What's Covered</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Plants that arrive damaged or diseased</li>
                <li>Plants that show signs of poor health within 7 days</li>
                <li>Incorrect plants or missing items</li>
                <li>Plants that don't match the product description</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-semibold mb-4">How to Claim</h2>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Contact us within 7 days of receiving your order</li>
                <li>Provide clear photos of the plant and any issues</li>
                <li>Our team will review your claim within 24 hours</li>
                <li>We'll arrange a replacement or issue a full refund</li>
              </ol>
            </section>

            <section className="bg-muted/50 p-6 rounded-lg">
              <h2 className="text-2xl font-serif font-semibold mb-4">Care Tips for Success</h2>
              <p className="text-muted-foreground mb-4">
                While we guarantee your plant's arrival health, following these tips will ensure continued success:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Unpack your plant immediately upon arrival</li>
                <li>Water according to the included care instructions</li>
                <li>Place in appropriate lighting conditions</li>
                <li>Avoid temperature extremes during the first week</li>
                <li>Contact us immediately if you notice any issues</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default Guarantee;
