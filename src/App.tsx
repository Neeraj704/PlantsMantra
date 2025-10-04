import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartSync } from "@/components/CartSync";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import OrderDetail from "./pages/OrderDetail";
import Checkout from "./pages/Checkout";
import CareGuides from "./pages/CareGuides";
import Contact from "./pages/Contact";
import About from "./pages/About";
import AdminAuth from "./pages/admin/AdminAuth";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import Categories from "./pages/admin/Categories";
import Coupons from "./pages/admin/Coupons";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartSync />
          <Routes>
            {/* Public Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/account" element={<Account />} />
              <Route path="/order/:orderId" element={<OrderDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/care-guides" element={<CareGuides />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/coupons" element={<Coupons />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
