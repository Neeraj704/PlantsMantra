// src/pages/admin/AdminCombos.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  Search, 
  Layers, 
  Info, 
  Plus, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

const AdminCombos = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected products for combo
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Combo form details
  const [comboDetails, setComboDetails] = useState({
    name: '',
    slug: '',
    description: '',
    sellingPrice: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch all active products that are NOT already combos
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .is('combo_product_ids', null); // only single items
      
      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      toast.error('Failed to load products list');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Calculations
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  
  // 1. Retail sum of individual plants
  const individualRetailSum = selectedProducts.reduce((sum, p) => sum + p.base_price, 0);
  
  // 2. Cost sum of individual payouts
  const individualCostSum = selectedProducts.reduce((sum, p) => sum + (p.actual_price || 0), 0);
  
  // 3. Selling price of combo
  const sellingPrice = parseFloat(comboDetails.sellingPrice) || 0;
  
  // 4. Client profit share (Revenue - Farmer Payout)
  const clientProfit = sellingPrice - individualCostSum;
  
  // 5. Margin Percentage
  const profitMarginPercent = sellingPrice > 0 ? (clientProfit / sellingPrice) * 100 : 0;
  
  // 6. Discount offered to customer
  const customerSavings = individualRetailSum > 0 ? individualRetailSum - sellingPrice : 0;
  const customerDiscountPercent = individualRetailSum > 0 ? (customerSavings / individualRetailSum) * 100 : 0;

  // Determine margin classification
  const getMarginClass = () => {
    if (profitMarginPercent >= 25) return { color: 'text-green-600 bg-green-50 border-green-200', glow: 'shadow-green-100', label: 'High Margin (Highly Profitable)' };
    if (profitMarginPercent >= 15) return { color: 'text-amber-600 bg-amber-50 border-amber-200', glow: 'shadow-amber-100', label: 'Medium Margin (Sustainable)' };
    return { color: 'text-red-600 bg-red-50 border-red-200', glow: 'shadow-red-100', label: 'Low Margin (Risk of Loss)' };
  };

  const marginClass = getMarginClass();

  const handlePublishCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboDetails.name || !comboDetails.sellingPrice) {
      toast.error('Combo Name and Combo Selling Price are required');
      return;
    }

    if (selectedProductIds.length < 2) {
      toast.error('Please select at least 2 plants to construct a combo');
      return;
    }

    const price = parseFloat(comboDetails.sellingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Selling price must be a valid positive number');
      return;
    }

    try {
      setPublishing(true);

      // Generate slug if not entered
      const slug = comboDetails.slug || comboDetails.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Create description listing items
      const plantsListStr = selectedProducts.map(p => p.name).join(', ');
      const desc = comboDetails.description || `Special premium combo bundle containing: ${plantsListStr}. Save big on this curated collection!`;

      const comboProductData = {
        name: comboDetails.name,
        slug,
        description: desc,
        base_price: price,
        sale_price: null,
        actual_price: individualCostSum, // The farmer payout total is the sum of individual plant payouts!
        status: 'active',
        stock_status: 'in_stock',
        is_featured: true,
        combo_product_ids: selectedProductIds, // Store constituent plant IDs
        main_image_url: selectedProducts[0]?.main_image_url || null, // default to first item's image
      };

      const { error } = await supabase
        .from('products')
        .insert([comboProductData]);

      if (error) throw error;

      toast.success(`Combo "${comboDetails.name}" published successfully!`);
      
      // Clear form
      setComboDetails({ name: '', slug: '', description: '', sellingPrice: '' });
      setSelectedProductIds([]);
    } catch (e: any) {
      console.error('Error publishing combo:', e);
      toast.error(e.message || 'Failed to publish combo');
    } finally {
      setPublishing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.botanical_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
          <Layers className="w-8 h-8 text-primary" /> Admin Combo Builder
        </h1>
        <p className="text-muted-foreground mt-1">
          Create curated plant bundle packages, configure selling prices, and inspect profit flow splits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Panel: 5 columns */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Combo Configuration</CardTitle>
              <CardDescription>Enter details to save as a new retail product bundle</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePublishCombo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="combo-name">Combo Name *</Label>
                  <Input
                    id="combo-name"
                    value={comboDetails.name}
                    onChange={(e) => setComboDetails({ ...comboDetails, name: e.target.value })}
                    placeholder="e.g. Air Purifier Trio Pack"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="combo-slug">Slug (Auto-generated)</Label>
                    <Input
                      id="combo-slug"
                      value={comboDetails.slug}
                      onChange={(e) => setComboDetails({ ...comboDetails, slug: e.target.value })}
                      placeholder="e.g. air-purifier-trio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="combo-price">Combo Selling Price (INR) *</Label>
                    <Input
                      id="combo-price"
                      type="number"
                      step="0.01"
                      value={comboDetails.sellingPrice}
                      onChange={(e) => setComboDetails({ ...comboDetails, sellingPrice: e.target.value })}
                      placeholder="e.g. 599"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="combo-desc">Description</Label>
                  <Textarea
                    id="combo-desc"
                    value={comboDetails.description}
                    onChange={(e) => setComboDetails({ ...comboDetails, description: e.target.value })}
                    placeholder="Describe the pack benefits and content details..."
                    rows={3}
                  />
                </div>

                <Separator className="my-4" />

                {/* Plant Selector */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Select Plants to Include ({selectedProductIds.length} selected)</Label>
                    {selectedProductIds.length > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedProductIds([])}
                        className="text-xs p-0 h-auto text-muted-foreground"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search plants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 text-sm h-9"
                    />
                  </div>

                  <div className="border rounded-md divide-y max-h-60 overflow-y-auto bg-background/50">
                    {loading ? (
                      <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading catalog plants...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No plants match search.</div>
                    ) : (
                      filteredProducts.map((product) => {
                        const isChecked = selectedProductIds.includes(product.id);
                        return (
                          <div 
                            key={product.id} 
                            onClick={() => handleProductToggle(product.id)}
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-sm hover:bg-muted/30 ${isChecked ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground font-serif">₹{product.base_price} Retail</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-amber-700">₹{(product.actual_price || 0)} payout</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={publishing || selectedProductIds.length < 2 || sellingPrice <= 0} 
                  className="w-full mt-4 gradient-hero"
                >
                  {publishing ? 'Publishing...' : 'Publish & Save Combo'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Flowchart & Profitability Panel: 7 columns */}
        <div className="lg:col-span-7 space-y-6">
          {/* Analysis Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground font-medium">Individual Retail Value</p>
                <p className="text-xl font-bold font-serif text-emerald-800 mt-1">₹{individualRetailSum.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sum of separate costs</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground font-medium">Combo Cost Price</p>
                <p className="text-xl font-bold font-serif text-amber-800 mt-1">₹{individualCostSum.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sum of farmer payouts</p>
              </CardContent>
            </Card>

            <Card className={`bg-card border col-span-2 md:col-span-1 shadow-sm ${marginClass.glow}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground font-medium">Net Profit Margin</p>
                <p className="text-xl font-bold font-serif text-primary mt-1">
                  ₹{clientProfit.toFixed(2)}
                </p>
                <Badge className={`text-[10px] py-0 px-1.5 mt-0.5 border ${marginClass.color}`}>
                  {profitMarginPercent.toFixed(1)}% Margin
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Cash Flow Diagram */}
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Combo Cash Flow split</CardTitle>
                {selectedProductIds.length > 0 && (
                  <Badge variant="outline" className={`border ${marginClass.color}`}>
                    {marginClass.label}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Visual flowchart of how revenue splits between customer discount, farmer payouts, and gross profit.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-6 bg-muted/10 rounded-b-lg border-t">
              {selectedProductIds.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto animate-bounce" />
                  <p className="text-sm text-muted-foreground font-medium">Select plants on the left to activate flow analysis.</p>
                </div>
              ) : (
                <div className="w-full max-w-xl">
                  {/* Flow SVG */}
                  <svg viewBox="0 0 500 280" className="w-full h-auto drop-shadow-sm font-sans">
                    {/* Definitions for arrow markers */}
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 10 5 L 0 8 z" className="fill-muted-foreground" />
                      </marker>
                      <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 10 5 L 0 8 z" className="fill-green-600" />
                      </marker>
                      <marker id="arrow-primary" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 10 5 L 0 8 z" className="fill-primary" />
                      </marker>
                    </defs>

                    {/* Nodes */}
                    
                    {/* 1. Retail Value Node */}
                    <rect x="20" y="20" width="130" height="45" rx="6" className="fill-background stroke-muted-foreground stroke-1" />
                    <text x="85" y="38" textAnchor="middle" className="text-[10px] font-medium fill-muted-foreground">Individual Retail Value</text>
                    <text x="85" y="56" textAnchor="middle" className="text-xs font-bold font-serif fill-emerald-800">₹{individualRetailSum.toFixed(2)}</text>

                    {/* 2. Customer Savings Node (Offset) */}
                    <rect x="190" y="20" width="120" height="45" rx="6" className="fill-orange-50/50 stroke-orange-200 stroke-1" />
                    <text x="250" y="38" textAnchor="middle" className="text-[10px] font-medium fill-orange-700">Customer Discount</text>
                    <text x="250" y="56" textAnchor="middle" className="text-xs font-bold font-serif fill-orange-800">₹{customerSavings.toFixed(2)}</text>
                    <text x="250" y="62" textAnchor="middle" className="text-[8px] fill-orange-600">({customerDiscountPercent.toFixed(0)}% Off)</text>

                    {/* 3. Selling Price Node (Main Hub) */}
                    <rect x="180" y="95" width="140" height="50" rx="8" className="fill-background stroke-primary stroke-2" />
                    <text x="250" y="114" textAnchor="middle" className="text-[11px] font-semibold fill-primary">Combo Retail Price</text>
                    <text x="250" y="134" textAnchor="middle" className="text-sm font-bold font-serif fill-emerald-900">₹{sellingPrice.toFixed(2)}</text>

                    {/* 4. Farmer Cost Node (Left branch) */}
                    <rect x="50" y="195" width="130" height="50" rx="6" className="fill-amber-50 stroke-amber-200 stroke-1" />
                    <text x="115" y="214" textAnchor="middle" className="text-[10px] font-medium fill-amber-700">Farmer Payout</text>
                    <text x="115" y="234" textAnchor="middle" className="text-sm font-bold font-serif fill-amber-900">₹{individualCostSum.toFixed(2)}</text>

                    {/* 5. Client Profit Node (Right branch) */}
                    <rect x="320" y="195" width="130" height="50" rx="6" className={profitMarginPercent >= 15 ? "fill-green-50 stroke-green-200 stroke-1" : "fill-red-50 stroke-red-200 stroke-1"} />
                    <text x="385" y="214" textAnchor="middle" className={profitMarginPercent >= 15 ? "text-[10px] font-medium fill-green-700" : "text-[10px] font-medium fill-red-700"}>Your Profit Share</text>
                    <text x="385" y="234" textAnchor="middle" className={profitMarginPercent >= 15 ? "text-sm font-bold font-serif fill-green-900" : "text-sm font-bold font-serif fill-red-900"}>₹{clientProfit.toFixed(2)}</text>

                    {/* Connectors (Paths) */}
                    
                    {/* Retail -> Combo Price */}
                    <path d="M 85 65 L 85 120 L 175 120" fill="none" className="stroke-muted-foreground stroke-1 stroke-dasharray-[3,3]" markerEnd="url(#arrow)" />
                    
                    {/* Retail -> Customer Savings */}
                    <path d="M 150 42.5 L 184 42.5" fill="none" className="stroke-orange-200 stroke-1" markerEnd="url(#arrow)" />

                    {/* Combo Price -> Farmer Payout (Left Branch Split) */}
                    <path d="M 210 145 C 210 170, 115 170, 115 190" fill="none" className="stroke-amber-400 stroke-1.5" markerEnd="url(#arrow)" />
                    <text x="145" y="172" className="text-[9px] fill-amber-600 font-semibold font-serif">₹{individualCostSum.toFixed(0)}</text>

                    {/* Combo Price -> Client Profit (Right Branch Split) */}
                    <path d="M 290 145 C 290 170, 385 170, 385 190" fill="none" className={profitMarginPercent >= 15 ? "stroke-green-500 stroke-1.5" : "stroke-red-500 stroke-1.5"} markerEnd={profitMarginPercent >= 15 ? "url(#arrow-green)" : "url(#arrow)"} />
                    <text x="320" y="172" className={profitMarginPercent >= 15 ? "text-[9px] fill-green-700 font-semibold font-serif" : "text-[9px] fill-red-700 font-semibold font-serif"}>₹{clientProfit.toFixed(0)}</text>
                  </svg>
                  
                  {/* Warning label if unprofitable */}
                  {profitMarginPercent < 15 && (
                    <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3 mt-4">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span><strong>Warning: Low Profit Margin!</strong> The current selling price of ₹{sellingPrice} is too close to your cost price (payout of ₹{individualCostSum}). Consider raising the price or changing the plant configuration.</span>
                    </div>
                  )}

                  {profitMarginPercent >= 25 && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-3 mt-4">
                      <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span><strong>Excellent Margin!</strong> Your profit share is ₹{clientProfit.toFixed(2)} ({profitMarginPercent.toFixed(0)}% markup), which leaves a strong buffer for operations and advertising.</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCombos;
