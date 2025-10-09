import SEOTags from '@/components/SEOTags';

const TermsOfService = () => {
  return (
    <>
      <SEOTags
        title="Terms of Service | Verdant"
        description="Read our terms and conditions for using Verdant's services and purchasing plants."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Terms of Service</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-muted-foreground mb-12">Please read these terms carefully</p>
            
            <div className="space-y-6">
              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Agreement to Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using Verdant's website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this site.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Use License</h2>
                <p className="text-muted-foreground">
                  Permission is granted to temporarily access the materials on Verdant's website for personal, non-commercial use only. This license shall automatically terminate if you violate any of these restrictions.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Product Information</h2>
                <p className="text-muted-foreground mb-4">
                  We strive to provide accurate product descriptions and images. However:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Plant sizes and appearances may vary naturally</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Colors may appear differently on different screens</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">We reserve the right to limit quantities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">All prices are subject to change without notice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">We do not warrant that product descriptions are error-free</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Orders and Pricing</h2>
                <p className="text-muted-foreground mb-4">When you place an order:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">You agree to provide accurate and complete information</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">We reserve the right to refuse or cancel orders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Prices include applicable taxes unless stated otherwise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Payment must be received before order processing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">We may cancel orders if pricing errors occur</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Shipping and Delivery</h2>
                <p className="text-muted-foreground">
                  Delivery times are estimates and not guaranteed. We are not responsible for delays caused by courier services, weather conditions, or other circumstances beyond our control. Risk of loss passes to you upon delivery to the carrier.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Returns and Refunds</h2>
                <p className="text-muted-foreground">
                  Our return policy is outlined in our Returns & Exchanges page. We reserve the right to deny returns that do not meet our policy requirements. Refunds will be processed within 7-10 business days after receiving the returned item.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">User Conduct</h2>
                <p className="text-muted-foreground mb-4">You agree not to:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Use the site for any unlawful purpose</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Attempt to gain unauthorized access to our systems</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Transmit viruses or malicious code</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Interfere with other users' use of the site</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-destructive mt-1">✗</span>
                    <span className="text-muted-foreground">Impersonate any person or entity</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Intellectual Property</h2>
                <p className="text-muted-foreground">
                  All content on this website, including text, graphics, logos, images, and software, is the property of Verdant and protected by copyright laws. Unauthorized use is prohibited.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Governing Law</h2>
                <p className="text-muted-foreground">
                  These terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have questions about these Terms of Service, please contact us through our Contact page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
