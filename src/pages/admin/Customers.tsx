// src/pages/admin/Customers.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Calendar, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";

interface CustomerData {
  id: string;               // email is our unique id for guests
  email: string;
  full_name: string | null;
  phone: string | null;
  first_order_date: string;
  last_order_date: string;
  order_count: number;
  total_spent: number;
}

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      // Fetch all NON-CANCELLED orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, customer_email, customer_name, customer_phone, total, created_at, status"
        )
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!orders) return [];

      // Group customers by email (this supports guests)
      const map = new Map<string, CustomerData>();

      orders.forEach((order) => {
        const email = order.customer_email?.toLowerCase() || "unknown";

        if (!map.has(email)) {
          map.set(email, {
            id: email,
            email,
            full_name: order.customer_name || null,
            phone: order.customer_phone || null,
            first_order_date: order.created_at,
            last_order_date: order.created_at,
            order_count: 0,
            total_spent: 0,
          });
        }

        const customer = map.get(email)!;

        customer.order_count += 1;
        customer.total_spent += Number(order.total || 0);

        // Update last order
        if (new Date(order.created_at) > new Date(customer.last_order_date)) {
          customer.last_order_date = order.created_at;
        }
      });

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.last_order_date).getTime() -
          new Date(a.last_order_date).getTime()
      );
    },
  });

  const filtered = customers?.filter((c) => {
    return (
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
    );
  });

  return (
    <div>
      <h1 className="text-3xl font-serif font-bold mb-8">Customers</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
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
        <p className="text-center text-muted-foreground">Loading customers…</p>
      ) : (
        <div className="grid gap-4">
          {filtered?.map((customer) => (
            <Card
              key={customer.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* LEFT SIDE */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {customer.full_name?.charAt(0) ||
                          customer.email.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {customer.full_name || "Guest User"}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </div>

                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        First Order:{" "}
                        {format(new Date(customer.first_order_date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="flex gap-10 md:gap-16">
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm mb-1 flex items-center gap-1 justify-center">
                        <ShoppingBag className="w-4 h-4" /> Orders
                      </div>
                      <p className="text-2xl font-bold">{customer.order_count}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        Total Spent
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(customer.total_spent)}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        Last Order
                      </p>
                      <p className="text-sm font-medium">
                        {format(new Date(customer.last_order_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {customer.order_count === 1 && (
                    <Badge variant="secondary">New Customer</Badge>
                  )}
                  {customer.order_count >= 5 && (
                    <Badge variant="default">Loyal Customer</Badge>
                  )}
                  {customer.total_spent > 5000 && (
                    <Badge className="bg-accent text-white">VIP</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No customers found.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Customers;
