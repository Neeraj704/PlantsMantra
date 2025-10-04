import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const ADMIN_SECRET = 'verdant-admin-2024'; // In production, this should be in env

const AdminAuth = () => {
  const { user, isAdmin, signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    secretCode: ''
  });

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.secretCode !== ADMIN_SECRET) {
      toast.error('Invalid admin secret code');
      return;
    }

    setLoading(true);

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Get the current session to verify admin role
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast.error('Authentication failed');
      setLoading(false);
      return;
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles' as any)
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast.error('This account does not have admin privileges');
      await supabase.auth.signOut();
    } else {
      toast.success('Admin access granted!');
      navigate('/admin');
    }

    setLoading(false);
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
            <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-serif font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">Authorized Personnel Only</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Enter your credentials and admin secret code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@verdant.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretCode">Admin Secret Code</Label>
                  <Input
                    id="secretCode"
                    type="password"
                    placeholder="Enter admin secret"
                    value={formData.secretCode}
                    onChange={(e) => setFormData({ ...formData, secretCode: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gradient-hero" disabled={loading}>
                  {loading ? 'Authenticating...' : 'Access Admin Panel'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAuth;
