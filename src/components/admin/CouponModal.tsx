import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Coupon } from '@/types/database';
import { toast } from 'sonner';

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
  coupon?: Coupon | null;
  onSuccess: () => void;
}

export const CouponModal = ({ open, onClose, coupon, onSuccess }: CouponModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    max_uses: '',
    is_active: true,
  });

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value.toString(),
        min_purchase: coupon.min_purchase.toString(),
        max_uses: coupon.max_uses?.toString() || '',
        is_active: coupon.is_active,
      });
    } else {
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: '0',
        max_uses: '',
        is_active: true,
      });
    }
  }, [coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase: parseFloat(formData.min_purchase),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        is_active: formData.is_active,
      };

      if (coupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', coupon.id);
        if (error) throw error;
        toast.success('Coupon updated successfully');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        if (error) throw error;
        toast.success('Coupon created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Coupon Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="discount_type">Discount Type *</Label>
            <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="discount_value">
              Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
            </Label>
            <Input
              id="discount_value"
              type="number"
              step="0.01"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="min_purchase">Minimum Purchase ($)</Label>
            <Input
              id="min_purchase"
              type="number"
              step="0.01"
              value={formData.min_purchase}
              onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="max_uses">Maximum Uses (optional)</Label>
            <Input
              id="max_uses"
              type="number"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              placeholder="Unlimited"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : coupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
