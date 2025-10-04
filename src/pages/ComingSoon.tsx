import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-serif font-bold mb-4">Coming Soon</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We're working hard to bring you this feature. Stay tuned for updates!
        </p>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
