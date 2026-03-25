import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddressFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

const AddressForm = ({ onSubmit, onCancel }: AddressFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name?.trim() || formData.full_name.trim().length < 3) {
      toast.error('Please enter a valid full name (at least 3 characters).');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone?.trim() || '')) {
      toast.error('Please enter a valid 10-digit Indian phone number (without spaces or +91).');
      return;
    }
    if (!formData.address_line1?.trim() || formData.address_line1.trim().length < 5) {
      toast.error('Please enter a valid address line 1 (at least 5 characters).');
      return;
    }
    if (!formData.city?.trim() || formData.city.trim().length < 2) {
      toast.error('Please enter a valid city.');
      return;
    }
    if (!formData.state?.trim() || formData.state.trim().length < 2) {
      toast.error('Please enter a valid state.');
      return;
    }
    if (!/^\d{6}$/.test(formData.postal_code?.trim() || '')) {
      toast.error('Please enter a valid 6-digit PIN code.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('addresses' as any)
        .insert({
          ...formData,
          user_id: user?.id
        } as any);

      if (error) throw error;

      toast.success('Address added successfully!');
      onSubmit();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line1">Address Line 1</Label>
        <Input
          id="address_line1"
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
        <Input
          id="address_line2"
          value={formData.address_line2}
          onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, is_default: checked as boolean })
          }
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          Set as default address
        </Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1 gradient-hero" disabled={loading}>
          {loading ? 'Adding...' : 'Add Address'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default AddressForm;
