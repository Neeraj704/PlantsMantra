import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
}

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, created_at');

      if (profilesError) throw profilesError;

      // Get all orders with aggregates (EXCLUDING cancelled)
      const { data: orderStats, error: orderError } = await supabase
        .from('orders')
        .select('user_id, total, created_at, customer_email, status')
        .neq('status', 'cancelled');

      if (orderError) throw orderError;

      // Combine profiles with order stats
      const customerMap = new Map<string, CustomerData>();

      profiles?.forEach((profile) => {
        customerMap.set(profile.id, {
          id: profile.id,
          email: '',
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at,
          order_count: 0,
          total_spent: 0,
          last_order_date: null,
        });
      });

      orderStats?.forEach((order) => {
        if (order.user_id) {
          const customer = customerMap.get(order.user_id);
          if (customer) {
            customer.order_count += 1;
            customer.total_spent += Number(order.total);
            customer.email = order.customer_email;
            if (
              !customer.last_order_date ||
              new Date(order.created_at) >
                new Date(customer.last_order_date)
            ) {
              customer.last_order_date = order.created_at;
            }
          }
        }
      });

      return Array.from(customerMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    },
  });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
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
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading customers.</p>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers?.map((customer) => (
            <Card
              key={customer.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {customer.full_name?.charAt(0) ||
                            customer.email?.charAt(0) ||
                            '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {customer.full_name || 'Unknown'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {customer.email || 'No email'}
                        </div>
                      </div>
                    </div>

                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-15">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-15">
                      <Calendar className="w-4 h-4" />
                      Joined{' '}
                      {format(
                        new Date(customer.created_at),
                        'MMM dd, yyyy'
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                    <div className="text-center">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm">Orders</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {customer.order_count}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        Total Spent
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(customer.total_spent)}
                      </p>
                    </div>

                    {customer.last_order_date && (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Last Order
                        </p>
                        <p className="text-sm font-medium">
                          {format(
                            new Date(customer.last_order_date),
                            'MMM dd, yyyy'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {customer.order_count === 0 && (
                    <Badge variant="secondary">New Customer</Badge>
                  )}
                  {customer.order_count >= 5 && (
                    <Badge variant="default">Loyal Customer</Badge>
                  )}
                  {customer.total_spent > 5000 && (
                    <Badge className="bg-accent">VIP</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCustomers?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No customers found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Customers;
