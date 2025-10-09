import SEOTags from '@/components/SEOTags';

const TermsOfService = () => {
  return (
    <>
      <SEOTags
        title="Terms of Service | Verdant"
        description="Read our terms and conditions for using Verdant's services and purchasing plants."
      />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold mb-8">Terms of Service</h1>
        
        <div className="max-w-3xl space-y-8">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Verdant's website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Use License</h2>
            <p className="text-muted-foreground mb-4">
              Permission is granted to temporarily access the materials on Verdant's website for personal, non-commercial use only. This license shall automatically terminate if you violate any of these restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Product Information</h2>
            <p className="text-muted-foreground mb-4">
              We strive to provide accurate product descriptions and images. However:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Plant sizes and appearances may vary naturally</li>
              <li>Colors may appear differently on different screens</li>
              <li>We reserve the right to limit quantities</li>
              <li>All prices are subject to change without notice</li>
              <li>We do not warrant that product descriptions are error-free</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Orders and Pricing</h2>
            <p className="text-muted-foreground mb-4">
              When you place an order:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>You agree to provide accurate and complete information</li>
              <li>We reserve the right to refuse or cancel orders</li>
              <li>Prices include applicable taxes unless stated otherwise</li>
              <li>Payment must be received before order processing</li>
              <li>We may cancel orders if pricing errors occur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Shipping and Delivery</h2>
            <p className="text-muted-foreground">
              Delivery times are estimates and not guaranteed. We are not responsible for delays caused by courier services, weather conditions, or other circumstances beyond our control. Risk of loss passes to you upon delivery to the carrier.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Returns and Refunds</h2>
            <p className="text-muted-foreground">
              Our return policy is outlined in our Returns & Exchanges page. We reserve the right to deny returns that do not meet our policy requirements. Refunds will be processed within 7-10 business days after receiving the returned item.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Plant Care Disclaimer</h2>
            <p className="text-muted-foreground">
              While we provide care instructions, plant health after delivery depends on proper care. We are not responsible for plant decline due to improper watering, lighting, temperature, or other care factors under your control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Verdant shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount you paid for the product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">User Conduct</h2>
            <p className="text-muted-foreground mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Use the site for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Transmit viruses or malicious code</li>
              <li>Interfere with other users' use of the site</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on this website, including text, graphics, logos, images, and software, is the property of Verdant and protected by copyright laws. Unauthorized use is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Modifications</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the site after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us through our Contact page.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
