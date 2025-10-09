import SEOTags from '@/components/SEOTags';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ = () => {
  return (
    <>
      <SEOTags
        title="Frequently Asked Questions | Verdant"
        description="Find answers to common questions about ordering plants, care instructions, shipping, and more."
      />
      <div className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-muted-foreground mb-12">Everything you need to know about Verdant</p>
            
            <div className="bg-card p-8 rounded-2xl border shadow-sm">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="item-1" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">How do I care for my new plant?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    Each plant comes with specific care instructions. Generally, ensure proper lighting, watering schedule, and temperature. Check our Care Guides section for detailed information on each plant variety.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">What if my plant arrives damaged?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    We take great care in packaging, but if your plant arrives damaged, please contact us within 48 hours with photos. We'll arrange a replacement or full refund immediately.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">Do you ship to all locations in India?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    Yes, we ship across India. Delivery times may vary based on your location. Metro cities receive deliveries faster, typically within 3-5 business days.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">Can I track my order?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    Absolutely! Once your order ships, you'll receive a tracking number via email. You can also track your order from your account dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">What payment methods do you accept?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment gateway.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">Are your plants pet-friendly?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    Some plants are toxic to pets. We clearly mark pet-safe plants in our product descriptions. If you have pets, please check the product details or contact us for recommendations.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7" className="border-b border-border pb-4">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">Do you offer plant consultation services?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    Yes! Our plant experts are available to help you choose the right plants for your space and provide care advice. Contact us through the Contact page.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8">
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth">
                    <span className="font-serif font-semibold">What is your 7-day guarantee?</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-2">
                    We guarantee that your plants will arrive healthy and thriving. If any issues arise within 7 days of delivery, we'll replace the plant or provide a full refund. See our 7-Day Guarantee page for details.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;
