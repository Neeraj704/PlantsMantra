// src/pages/Auth.tsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Leaf } from 'lucide-react';
import { trackPixelEvent } from '@/utils/pixel';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Phone validation for sign up
    if (activeTab === 'signup') {
      if (!fullName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      if (!phone.trim()) {
        toast.error('Please enter your phone number');
        return;
      }
      // Simple Indian phone number format validation
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    }

    setLoading(true);

    try {
      const options: any = {
        shouldCreateUser: activeTab === 'signup',
      };

      // Add user metadata if signing up
      if (activeTab === 'signup') {
        options.data = {
          full_name: fullName.trim(),
          phone: phone.trim(),
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options,
      });

      if (error) throw error;

      toast.success('Verification code sent to your email!');
      setOtpSent(true);
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) throw error;

      toast.success('Signed in successfully!');
      if (activeTab === 'signup') {
        trackPixelEvent('CompleteRegistration', {
          content_name: 'Sign Up',
          status: 'success',
        });
      }
      navigate('/');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-gradient-subtle">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <Leaf className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-serif font-bold mb-2">Welcome to Plants Mantra</h1>
            <p className="text-muted-foreground">Your Urban Jungle, Delivered</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Account Access</CardTitle>
              <CardDescription>
                {otpSent ? 'Verify your email code' : 'Sign in or create a passwordless account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {otpSent ? (
                /* Verification Code Entry Form */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email-display">Verification Email</Label>
                    <Input
                      id="otp-email-display"
                      type="email"
                      value={email}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Verification Code</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-hero" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                  <div className="flex justify-between items-center text-xs">
                    <Button
                      type="button"
                      variant="link"
                      className="text-muted-foreground p-0 h-auto"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                    >
                      Change Email / Info
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="text-muted-foreground p-0 h-auto"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend Code
                    </Button>
                  </div>
                </form>
              ) : (
                /* Tabs for Sign In vs Sign Up */
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  {/* Sign In Form */}
                  <TabsContent value="signin">
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email Address</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full gradient-hero" disabled={loading}>
                        {loading ? 'Sending code...' : 'Send Login Code'}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Sign Up Form */}
                  <TabsContent value="signup">
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email Address</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone Number</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full gradient-hero" disabled={loading}>
                        {loading ? 'Creating account...' : 'Send Registration Code'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
