import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Search } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setCustomers(data as unknown as Profile[]);
    setLoading(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold">Customers</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading customers...</p>
      ) : (
        <div className="bg-background rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Phone</th>
                  <th className="text-left p-4 font-semibold">Joined</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <p className="font-medium">{customer.full_name || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{customer.phone || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="default">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
