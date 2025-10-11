import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Heart, Users, Award } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: <Leaf className="w-8 h-8 text-primary" />,
      title: 'Sustainability',
      description: 'We use eco-friendly packaging and partner with sustainable nurseries.',
    },
    {
      icon: <Heart className="w-8 h-8 text-primary" />,
      title: 'Quality',
      description: 'Every plant is hand-picked and inspected to ensure the highest quality.',
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: 'Community',
      description: 'Join our growing community of plant parents and enthusiasts.',
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      title: 'Expertise',
      description: 'Our team of horticulturists provides lifetime care support.',
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">About PlantsMantra</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Bringing the beauty of nature into your home, one plant at a time
            </p>
          </div>

          {/* Story */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-serif font-bold mb-4">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Plants Mantra was born from a simple belief: everyone deserves to experience the joy and benefits of living with plants. Founded in 2020, we started as a small local nursery with a big vision—to make plant ownership accessible, enjoyable, and sustainable for everyone.
                  </p>
                  <p>
                    What began as weekend plant sales has blossomed into a thriving online community of over 50,000 plant parents. We've carefully curated our collection to include only the healthiest, most beautiful specimens, each one handpicked and nurtured by our team of expert horticulturists.
                  </p>
                  <p>
                    Today, we're proud to be one of the leading online plant retailers, but we've never forgotten our roots. Every plant we ship comes with the same care and attention we gave to our first customers—because we believe your plant journey should be as rewarding as ours has been.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Values */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-hover transition-smooth">
                    <CardContent className="p-6">
                      <div className="mb-4">{value.icon}</div>
                      <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-muted/30 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-serif font-bold mb-4 text-center">Our Mission</h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-6">
              To inspire and enable people to create thriving indoor gardens, one plant at a time. We're committed to providing not just plants, but education, community, and ongoing support to ensure every plant parent succeeds.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">50K+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">200+</div>
                <div className="text-sm text-muted-foreground">Plant Varieties</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">98%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Meet the Team</h2>
            <p className="text-center text-muted-foreground mb-8">
              Our passionate team of plant experts is here to help you every step of the way.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Sarah Green', role: 'Founder & Head Horticulturist', bio: '15 years of plant care expertise' },
                { name: 'Mike Bloom', role: 'Operations Manager', bio: 'Logistics & sustainability expert' },
                { name: 'Emma Leaf', role: 'Community Manager', bio: 'Helping plant parents thrive' },
              ].map((member, index) => (
                <Card key={member.name}>
                  <CardContent className="p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4"></div>
                    <h3 className="font-semibold mb-1">{member.name}</h3>
                    <p className="text-sm text-primary mb-2">{member.role}</p>
                    <p className="text-xs text-muted-foreground">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
