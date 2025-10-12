import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import SEOTags from '@/components/SEOTags';

type Question = {
  id: string;
  question: string;
  options: { label: string; value: string; emoji: string }[];
};

const questions: Question[] = [
  {
    id: 'experience',
    question: "What's your plant care experience?",
    options: [
      { label: 'Complete Beginner', value: 'beginner', emoji: '🌱' },
      { label: 'Some Experience', value: 'intermediate', emoji: '🌿' },
      { label: 'Expert Plant Parent', value: 'expert', emoji: '🌳' },
    ],
  },
  {
    id: 'light',
    question: 'How much natural light does your space get?',
    options: [
      { label: 'Bright & Sunny', value: 'bright', emoji: '☀️' },
      { label: 'Medium Light', value: 'medium', emoji: '⛅' },
      { label: 'Low Light', value: 'low', emoji: '🌙' },
    ],
  },
  {
    id: 'maintenance',
    question: 'How much time can you dedicate to plant care?',
    options: [
      { label: 'Very Little - Low Maintenance', value: 'low', emoji: '⏱️' },
      { label: 'Moderate - Weekly Care', value: 'medium', emoji: '📅' },
      { label: 'Lots - Daily Attention', value: 'high', emoji: '💚' },
    ],
  },
  {
    id: 'pets',
    question: 'Do you have pets at home?',
    options: [
      { label: 'Yes', value: 'yes', emoji: '🐕' },
      { label: 'No', value: 'no', emoji: '🚫' },
    ],
  },
  {
    id: 'purpose',
    question: 'What do you want from your plant?',
    options: [
      { label: 'Air Purification', value: 'air-purifying', emoji: '🌬️' },
      { label: 'Low Maintenance Beauty', value: 'succulents', emoji: '🌵' },
      { label: 'Indoor Greenery', value: 'indoor-plants', emoji: '🏠' },
      { label: 'Statement Piece', value: 'snake', emoji: '🐍' },
    ],
  },
];

const PlantFinder = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    
    if (isLastQuestion) {
      const category = determineBestCategory(newAnswers, value);
      navigate(`/shop?category=${category}`);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const determineBestCategory = (prevAnswers: Record<string, string>, lastAnswer: string) => {
    if (['air-purifying', 'succulents', 'indoor-plants', 'snake'].includes(lastAnswer)) return lastAnswer;
    if (prevAnswers.maintenance === 'low' || prevAnswers.experience === 'beginner') return 'succulents';
    if (prevAnswers.light === 'low') return 'snake';
    if (prevAnswers.pets === 'yes') return 'pet-friendly';
    return 'indoor-plants';
  };

  return (
    <>
      <SEOTags
        title="Find Your Perfect Plant - Plant Quiz | Plants Mantra"
        description="Take our plant finder quiz to discover the perfect plants for your home. Get personalized recommendations based on your space, experience, and lifestyle."
      />
      <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-primary/5 via-background to-accent/5 mt-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Find Your Perfect Plant
            </h1>
            <p className="text-muted-foreground text-lg">
              Answer a few quick questions and we'll recommend the best plants for you
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Question {currentStep + 1} of {questions.length}</span>
              <span>{Math.round(((currentStep + 1) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-hover border-2">
              <CardContent className="p-8">
                <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-8 text-center">
                  {currentQuestion.question}
                </h2>

                <div className="grid gap-4">
                  {currentQuestion.options.map((option, index) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => handleAnswer(option.value)}
                        className="w-full h-auto py-6 px-6 text-left hover:border-primary hover:bg-primary/5 transition-all group
                                   flex flex-col md:flex-row md:items-center md:justify-start md:gap-4 gap-2"
                      >
                        {/* Emoji on left for desktop, top for mobile */}
                        <span className="text-3xl md:mr-4 md:mb-0 mb-2 flex-shrink-0 group-hover:scale-110 transition-transform">
                          {option.emoji}
                        </span>
                        <span className="text-lg font-medium break-words text-center md:text-left">
                          {option.label}
                        </span>
                        <ArrowRight className="ml-auto w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Navigation */}
          {currentStep > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mt-6"
            >
              <Button
                variant="ghost"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Question
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};

export default PlantFinder;
