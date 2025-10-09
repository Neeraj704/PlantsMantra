import SEOTags from '@/components/SEOTags';

const PrivacyPolicy = () => {
  return (
    <>
      <SEOTags
        title="Privacy Policy | Verdant"
        description="Learn how we collect, use, and protect your personal information."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-muted-foreground mb-12">Your privacy is important to us</p>
            
            <div className="space-y-6">
              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Introduction</h2>
                <p className="text-muted-foreground">
                  At Verdant, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website or make a purchase.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Information We Collect</h2>
                <p className="text-muted-foreground mb-4">We collect the following types of information:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Personal Information:</strong> Name, email address, phone number, shipping address</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Payment Information:</strong> Processed securely through our payment partners</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Order Information:</strong> Products purchased, order history, preferences</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Usage Data:</strong> IP address, browser type, pages visited, time spent on pages</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">We use your information to:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Process and fulfill your orders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Communicate with you about your orders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Send promotional emails (with your consent)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Improve our website and services</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Prevent fraud and ensure security</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Comply with legal obligations</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate security measures to protect your personal information. All payment transactions are encrypted using SSL technology. However, no method of transmission over the internet is 100% secure.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Data Sharing</h2>
                <p className="text-muted-foreground mb-4">We do not sell your personal information. We may share your data with:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Shipping partners to deliver your orders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Payment processors to handle transactions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Service providers who assist in our operations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">Law enforcement when required by law</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">You have the right to:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Access your personal data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Correct inaccurate data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Request deletion of your data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Opt-out of marketing communications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">✓</span>
                    <span className="text-muted-foreground">Withdraw consent at any time</span>
                  </li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm">
                <h2 className="text-2xl font-serif font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this privacy policy or wish to exercise your rights, please contact us through our Contact page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
