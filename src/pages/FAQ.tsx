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
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold mb-8">Frequently Asked Questions</h1>
        
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                How do I care for my new plant?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Each plant comes with specific care instructions. Generally, ensure proper lighting, watering schedule, and temperature. Check our Care Guides section for detailed information on each plant variety.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                What if my plant arrives damaged?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We take great care in packaging, but if your plant arrives damaged, please contact us within 48 hours with photos. We'll arrange a replacement or full refund immediately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Do you ship to all locations in India?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes, we ship across India. Delivery times may vary based on your location. Metro cities receive deliveries faster, typically within 3-5 business days.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                Can I track my order?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely! Once your order ships, you'll receive a tracking number via email. You can also track your order from your account dashboard.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment gateway.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Are your plants pet-friendly?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Some plants are toxic to pets. We clearly mark pet-safe plants in our product descriptions. If you have pets, please check the product details or contact us for recommendations.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left">
                Do you offer plant consultation services?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! Our plant experts are available to help you choose the right plants for your space and provide care advice. Contact us through the Contact page.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger className="text-left">
                What is your 7-day guarantee?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We guarantee that your plants will arrive healthy and thriving. If any issues arise within 7 days of delivery, we'll replace the plant or provide a full refund. See our 7-Day Guarantee page for details.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </>
  );
};

export default FAQ;
