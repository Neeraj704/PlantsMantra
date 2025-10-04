import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Sun, Thermometer, Scissors, Bug, Heart } from 'lucide-react';

const CareGuides = () => {
  const guides = [
    {
      icon: <Droplets className="w-8 h-8 text-primary" />,
      title: 'Watering',
      description: 'Learn the right watering techniques for different plant types. Overwatering is the #1 cause of plant death.',
      tips: [
        'Check soil moisture before watering',
        'Water thoroughly until it drains',
        'Let soil dry between waterings',
        'Use room temperature water',
      ],
    },
    {
      icon: <Sun className="w-8 h-8 text-primary" />,
      title: 'Light Requirements',
      description: 'Understanding your plant\'s light needs is crucial for healthy growth.',
      tips: [
        'Bright indirect: 4-6 hours filtered sun',
        'Medium light: Near north-facing windows',
        'Low light: Tolerates shade but grows slower',
        'Direct sun: Only for succulents & cacti',
      ],
    },
    {
      icon: <Thermometer className="w-8 h-8 text-primary" />,
      title: 'Temperature & Humidity',
      description: 'Most houseplants thrive in typical indoor conditions with some adjustments.',
      tips: [
        'Ideal temp: 65-75°F (18-24°C)',
        'Avoid cold drafts and heating vents',
        'Mist leaves for humidity',
        'Group plants to increase moisture',
      ],
    },
    {
      icon: <Scissors className="w-8 h-8 text-primary" />,
      title: 'Pruning & Maintenance',
      description: 'Regular pruning encourages healthy growth and keeps plants looking their best.',
      tips: [
        'Remove dead or yellow leaves',
        'Trim leggy growth for bushier plants',
        'Clean leaves to improve photosynthesis',
        'Rotate plants weekly for even growth',
      ],
    },
    {
      icon: <Bug className="w-8 h-8 text-primary" />,
      title: 'Pest Control',
      description: 'Catch and treat common pests early to prevent infestations.',
      tips: [
        'Inspect new plants before bringing inside',
        'Isolate infected plants immediately',
        'Use neem oil for most pests',
        'Wipe leaves with soapy water',
      ],
    },
    {
      icon: <Heart className="w-8 h-8 text-primary" />,
      title: 'Fertilizing',
      description: 'Feed your plants to promote vibrant growth and flowering.',
      tips: [
        'Fertilize during growing season (spring/summer)',
        'Use diluted liquid fertilizer',
        'Feed every 2-4 weeks when actively growing',
        'Reduce or stop feeding in winter',
      ],
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Plant Care Guides</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know to keep your plants thriving and happy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide, index) => (
              <motion.div
                key={guide.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-hover transition-smooth">
                  <CardHeader>
                    <div className="mb-4">{guide.icon}</div>
                    <CardTitle className="text-xl">{guide.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>
                    <ul className="space-y-2">
                      {guide.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-muted/30 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-serif font-bold mb-4">Pro Tips</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Common Mistakes to Avoid</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Overwatering (leads to root rot)</li>
                  <li>• Using tap water with high chlorine</li>
                  <li>• Placing plants in drafty areas</li>
                  <li>• Ignoring pest problems</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Signs of a Happy Plant</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• New growth and leaves</li>
                  <li>• Vibrant, firm foliage</li>
                  <li>• Strong stems</li>
                  <li>• No yellowing or browning</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CareGuides;
