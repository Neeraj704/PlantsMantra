import SEOTags from '@/components/SEOTags';

const PrivacyPolicy = () => {
  return (
    <>
      <SEOTags
        title="Privacy Policy | Verdant"
        description="Learn how we collect, use, and protect your personal information."
      />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold mb-8">Privacy Policy</h1>
        
        <div className="max-w-3xl space-y-8">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              At Verdant, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you visit our website or make a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Information We Collect</h2>
            <p className="text-muted-foreground mb-4">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address</li>
              <li><strong>Payment Information:</strong> Processed securely through our payment partners</li>
              <li><strong>Order Information:</strong> Products purchased, order history, preferences</li>
              <li><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent on pages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders</li>
              <li>Send promotional emails (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your personal information. All payment transactions are encrypted using SSL technology. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Data Sharing</h2>
            <p className="text-muted-foreground mb-4">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Shipping partners to deliver your orders</li>
              <li>Payment processors to handle transactions</li>
              <li>Service providers who assist in our operations</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies to improve your browsing experience, analyze site traffic, and personalize content. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our services are not intended for children under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy or wish to exercise your rights, please contact us through our Contact page.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
