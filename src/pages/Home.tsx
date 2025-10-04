import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Leaf, Heart, Shield, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/hero-plants.jpg';
import monsteraImg from '@/assets/monstera.jpg';
import snakePlantImg from '@/assets/snake-plant.jpg';
import pothosImg from '@/assets/pothos.jpg';
import fiddleLeafImg from '@/assets/fiddle-leaf.jpg';

const Home = () => {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'active')
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const productImages: Record<string, string> = {
    'monstera-deliciosa': monsteraImg,
    'snake-plant': snakePlantImg,
    'pothos': pothosImg,
    'fiddle-leaf-fig': fiddleLeafImg,
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://cdn.pixabay.com/video/2019/10/25/28634-371094025_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-white px-4 max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
            Your Urban Jungle,<br />Delivered
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transform your space with our curated collection of premium indoor plants. 
            From low-maintenance succulents to statement tropical beauties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gradient-hero text-lg px-8">
              <Link to="/shop">
                Shop All Plants <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
              <Link to="/quiz">Find Your Perfect Plant</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">Sustainable</h3>
              <p className="text-sm text-muted-foreground">Eco-friendly packaging and practices</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">Expert Care</h3>
              <p className="text-sm text-muted-foreground">Lifetime plant care support</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">7-Day Guarantee</h3>
              <p className="text-sm text-muted-foreground">Happy plants or your money back</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-lg mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">Hand-picked healthy plants</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Shop by Category</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find the perfect plant for your space, lifestyle, and experience level
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories?.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/shop?category=${category.slug}`}>
                <Card className="hover:shadow-hover transition-smooth overflow-hidden group cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-smooth">
                      {index % 6 === 0 ? '🌿' : index % 6 === 1 ? '🐾' : index % 6 === 2 ? '🌬️' : index % 6 === 3 ? '🌸' : index % 6 === 4 ? '✨' : '🌵'}
                    </div>
                    <h3 className="font-serif font-semibold mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Bestsellers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our most loved plants, chosen by plant parents just like you
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts?.map((product, index) => {
              const imgSrc = productImages[product.slug] || monsteraImg;
              const displayPrice = product.sale_price || product.base_price;
              const hasDiscount = product.sale_price !== null;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/product/${product.slug}`}>
                    <Card className="overflow-hidden group cursor-pointer hover:shadow-hover transition-smooth">
                      <div className="aspect-square overflow-hidden bg-muted/50">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                        />
                      </div>
                      <CardContent className="p-4">
                        {hasDiscount && (
                          <Badge variant="destructive" className="mb-2">Sale</Badge>
                        )}
                        <h3 className="font-serif font-semibold text-lg mb-1">{product.name}</h3>
                        {product.botanical_name && (
                          <p className="text-xs text-muted-foreground italic mb-2">{product.botanical_name}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">${displayPrice.toFixed(2)}</span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${product.base_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild>
              <Link to="/shop">
                View All Plants <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Plant Parent Love</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See what our community is saying about their Verdant plants
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="text-accent mb-4">★★★★★</div>
                  <p className="text-sm mb-4 text-muted-foreground">
                    "My Monstera arrived in perfect condition and has been thriving ever since. 
                    The care guide was incredibly helpful for a beginner like me!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10" />
                    <div>
                      <p className="font-semibold text-sm">Sarah M.</p>
                      <p className="text-xs text-muted-foreground">Verified Buyer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
