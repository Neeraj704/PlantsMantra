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
import BannerCarousel from '@/components/BannerCarousel';

const Home = () => {
  // Define the exact 5 categories to show
  const displayCategories = [
    { slug: 'succulents', name: 'Succulents', description: 'Low maintenance desert', emoji: '🎍' },
    { slug: 'cactus', name: 'Cactus', description: 'Hardy and resilient plants', emoji: '🌵' },
    { slug: 'snake', name: 'Snake Plants', description: 'Perfect for low light spaces', emoji: '🐍' },
    { slug: 'indoor-plants', name: 'Indoor Plants', description: 'Lush greenery for your home', emoji: '🪴' },
    { slug: 'air-purifying', name: 'Air Purifying', description: 'Clean your air naturally', emoji: '🌬️' },
  ];

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
          <source src="https://cdn.pixabay.com/video/2023/06/09/166394-834930270_large.mp4" type="video/mp4" />
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
              <Link to="/plant-finder">Find Your Perfect Plant</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Categories */}
      <section className="py-20 container mx-auto px-4 mt-[-100px]">
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {displayCategories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/shop?category=${category.slug}`}>
                <Card className="hover:shadow-hover transition-smooth overflow-hidden group cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-smooth">
                      {category.emoji}
                    </div>
                    <h3 className="font-serif font-semibold text-base mb-1">{category.name}</h3>
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
              const imgSrc = product.main_image_url || productImages[product.slug] || monsteraImg;
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
                          <span className="text-lg font-bold">₹{displayPrice.toFixed(2)}</span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{product.base_price.toFixed(2)}
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

      {/* Features */}
      <section className="py-16">
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
            See what our community is saying about their PlantsMantra plants
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              rating: "⭐⭐⭐⭐⭐ (5/5)",
              name: "Riya Patel, Lucknow",
              content: `I bought the Fairy Castle Cactus and a few Echinopsis varieties from Plants Mantra. The plants arrived fresh and well-hydrated, even after a long-distance shipment. The soil mix suggestions on their care guide really helped me maintain them properly. I’ve been recommending this site to all my friends who love indoor gardening. It’s like having a trusted local nursery online.`,
              img: "https://media.istockphoto.com/id/2156062809/photo/headshot-closeup-portrait-middle-eastern-israel-businesswoman-business-lady-standing-isolated.jpg?s=612x612&w=0&k=20&c=SrsOr7hFwcm7O2xr1hbx0ZVkB_eJPLScCc7CPNW7pZQ=",
            },
            {
              rating: "⭐⭐⭐⭐⭐ (5/5)",
              name: "Arjun Sharma, Haldwani",
              content: `Plants Mantra is easily the best online nursery I’ve tried so far. The plants are healthy, affordable, and exactly as shown in the pictures. What I loved most was their “bare-rooted” cactus collection clean, pest-free, and easy to pot. Delivery was faster than expected, and they even replaced one damaged plant without any hassle. Great customer service and premium quality!`,
              img: "https://img.freepik.com/free-photo/cheerful-indian-businessman-smiling-closeup-portrait-jobs-career-campaign_53876-129416.jpg",
            },
            {
              rating: "⭐⭐⭐⭐⭐ (5/5)",
              name: "Neha Joshi, Dehradun",
              content: `I recently ordered a few succulents and indoor plants from Plants Mantra, and I’m genuinely impressed! The packaging was super secure not a single leaf was damaged. Each plant came with a small care note, which was very helpful for a beginner like me. Within a week, my cactus started showing new growth! You can tell they really care about plant quality and customer satisfaction!`,
              img: "https://static.vecteezy.com/system/resources/previews/039/334/804/non_2x/ai-generated-indian-female-student-free-photo.jpg",
            },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="text-accent mb-4">{t.rating}</div>
                  <p className="text-sm mb-4 text-muted-foreground">{t.content}</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={t.img}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
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
