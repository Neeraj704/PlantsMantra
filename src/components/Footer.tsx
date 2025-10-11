import { Link } from 'react-router-dom';
import { Leaf, Instagram, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logo from '@/assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            {/* Logo */}
            <Link to="/" className="flex items-center group mb-5">
              <img 
                src={logo} 
                alt="PlantsMantra Logo" 
                className="h-10 md:h-12 w-auto transition-smooth group-hover:scale-105"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Your Urban Jungle, Delivered. Premium plants for every space and every soul.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Shop All Plants
                </Link>
              </li>
              <li>
                <Link to="/care-guides" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Care Guides
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="font-serif font-semibold mb-4">Customer Care</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shipping" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/guarantee" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                  7-Day Guarantee
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-serif font-semibold mb-4">Stay Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get plant care tips and exclusive offers delivered to your inbox.
            </p>
            <div className="flex gap-2">
              <Input placeholder="Your email" className="flex-1" />
              <Button className="gradient-hero">Subscribe</Button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-t border-border">
          <div className="text-center">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-sm font-medium">Sustainable Packaging</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">💚</div>
            <p className="text-sm font-medium">Plant Care Support</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-sm font-medium">Secure Checkout</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-sm font-medium">7-Day Guarantee</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 PlantsMantra. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
