import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Coupon } from '@/types/database';
import { Plus, Search, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { CouponModal } from '@/components/admin/CouponModal';

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('coupons' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setCoupons(data as unknown as Coupon[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    const { error } = await supabase
      .from('coupons' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete coupon');
    } else {
      toast.success('Coupon deleted');
      fetchCoupons();
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold">Coupons</h1>
        <Button className="gradient-hero" onClick={() => { setSelectedCoupon(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search coupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading coupons...</p>
      ) : (
        <div className="bg-background rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Code</th>
                  <th className="text-left p-4 font-semibold">Discount</th>
                  <th className="text-left p-4 font-semibold">Min Purchase</th>
                  <th className="text-left p-4 font-semibold">Usage</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <span className="font-mono font-semibold">{coupon.code}</span>
                    </td>
                    <td className="p-4">
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%` 
                        : `$${coupon.discount_value}`}
                    </td>
                    <td className="p-4">
                      ${coupon.min_purchase.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {coupon.used_count} / {coupon.max_uses || '∞'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={coupon.is_active ? 'default' : 'destructive'}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedCoupon(coupon); setModalOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(coupon.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CouponModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        coupon={selectedCoupon}
        onSuccess={fetchCoupons}
      />
    </div>
  );
};

export default Coupons;
