import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Phone, Mail, Package, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BulkOrders = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    requirements: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('contact_submissions').insert([
        {
          name: formData.name,
          email: formData.email,
          subject: `Bulk Order Inquiry - ${formData.company || 'Individual'}`,
          message: `Phone: ${formData.phone}\nRequirements: ${formData.requirements}`
        }
      ]);

      if (error) throw error;

      toast.success("Inquiry sent successfully! Our team will contact you soon.");
      setFormData({ name: '', email: '', phone: '', company: '', requirements: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Bulk Orders & Corporate Gifting
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you need 50 pots for an event or 500 plants for corporate gifting, we offer exclusive pricing and premium quality for large orders.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <Package className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Corporate Gifting</h3>
                  <p className="text-sm text-muted-foreground">Custom branded pots and curated plant sets for your employees or clients.</p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <Users className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Event Return Gifts</h3>
                  <p className="text-sm text-muted-foreground">Memorable living gifts for weddings, anniversaries, and parties.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Direct Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href="tel:+919876543210" className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Call Us Now</p>
                    <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                  </div>
                </a>
                
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:border-green-500 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Chat with our sales team</p>
                  </div>
                </a>

                <a href="mailto:sales@plantsmantra.com" className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="text-sm text-muted-foreground">sales@plantsmantra.com</p>
                  </div>
                </a>
              </CardContent>
            </Card>
          </motion.div>

          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-xl border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Request a Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company / Event Name (Optional)</Label>
                    <Input id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Your Company Ltd." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements & Quantity</Label>
                    <Textarea 
                      id="requirements" 
                      name="requirements" 
                      required 
                      rows={5}
                      value={formData.requirements} 
                      onChange={handleChange} 
                      placeholder="e.g. I need 200 Snake Plants in ceramic pots for a corporate event next month." 
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Sending Request..." : "Submit Inquiry"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BulkOrders;
