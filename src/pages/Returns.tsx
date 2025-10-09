import SEOTags from '@/components/SEOTags';

const Returns = () => {
  return (
    <>
      <SEOTags
        title="Returns & Exchanges | Verdant"
        description="Learn about our return and exchange policy for plants and plant products."
      />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold mb-8">Returns & Exchanges</h1>
        
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Our Promise</h2>
            <p className="text-muted-foreground">
              We want you to be completely satisfied with your purchase. If you're not happy with your plants, we're here to help.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Return Policy</h2>
            <p className="text-muted-foreground mb-4">
              You can return your plants within 7 days of delivery if:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>The plant arrived damaged or diseased</li>
              <li>You received the wrong plant</li>
              <li>The plant doesn't match the description</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Return Process</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Contact our support team within 7 days of delivery</li>
              <li>Provide photos of the plant and packaging</li>
              <li>Our team will review and approve your return</li>
              <li>Ship the plant back using our prepaid label</li>
              <li>Receive a full refund once we receive the plant</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Exchanges</h2>
            <p className="text-muted-foreground">
              We're happy to exchange plants if you'd like a different variety. Simply follow the return process and let us know which plant you'd prefer instead.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold mb-4">Non-Returnable Items</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Plants damaged due to improper care after delivery</li>
              <li>Sale or clearance items</li>
              <li>Gift cards</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default Returns;
