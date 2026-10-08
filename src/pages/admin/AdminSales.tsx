// src/pages/admin/AdminSales.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, CampaignSettings } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Search, 
  Megaphone, 
  Percent, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Calendar, 
  Check, 
  Flame,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';
const LOCAL_STORAGE_KEY = 'plantsmantra_campaign_settings';

const SQL_MIGRATION_SNIPPET = `CREATE TABLE IF NOT EXISTS public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  banner_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  end_type TEXT DEFAULT 'manual',
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to campaign_settings" ON public.campaign_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to campaign_settings" ON public.campaign_settings FOR ALL USING (true);
INSERT INTO public.campaign_settings (id, campaign_name, banner_text, is_active, end_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Festive Sale', 'Buy 1 Get 1 Free on all indoor plants!', false, 'manual')
ON CONFLICT (id) DO NOTHING;`;

const AdminSales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingProductIds, setSavingProductIds] = useState<string[]>([]);
  const [showSqlHelper, setShowSqlHelper] = useState(false);

  // Campaign settings state
  const [campaign, setCampaign] = useState<CampaignSettings>({
    id: CAMPAIGN_ID,
    campaign_name: 'Diwali Festive Sale',
    banner_text: 'Buy 1 Get 1 Free on select indoor plants! Limited time only.',
    is_active: false,
    end_type: 'manual',
    end_date: null,
    created_at: '',
  });

  // Helper days selector
  const [daysDuration, setDaysDuration] = useState('5');
  const [isCustomName, setIsCustomName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  // Row-level product changes state
  const [productChanges, setProductChanges] = useState<Record<string, {
    scarcity_status: 'none' | 'limited_stock' | 'sold_out';
    scarcity_value: number;
    is_b1g1: boolean;
    is_on_sale: boolean;
  }>>({});

  useEffect(() => {
    fetchCampaign();
    fetchProducts();
  }, []);

  const fetchCampaign = async () => {
    try {
      setLoadingCampaign(true);
      const { data, error } = await supabase
        .from('campaign_settings' as any)
        .select('*')
        .eq('id', CAMPAIGN_ID)
        .maybeSingle();

      if (error) {
        // Table might not exist yet in schema cache
        console.warn('Could not find campaign_settings table. Using fallback storage.', error);
        setShowSqlHelper(true);
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setCampaign(JSON.parse(stored));
        }
      } else if (data) {
        setCampaign(data as CampaignSettings);
        const presets = ['B1G1', 'Stock Clearance Sale', 'End of Monsoon Sale', 'Diwali Festive Sale'];
        if (!presets.includes(data.campaign_name)) {
          setIsCustomName(true);
          setCustomNameInput(data.campaign_name);
        }
      }
    } catch (e: any) {
      console.warn('Fallback loading campaign from localStorage');
      setShowSqlHelper(true);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setCampaign(JSON.parse(stored));
      }
    } finally {
      setLoadingCampaign(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);

      const initialChanges: typeof productChanges = {};
      (data || []).forEach(p => {
        initialChanges[p.id] = {
          scarcity_status: (p.scarcity_status as any) || 'none',
          scarcity_value: p.scarcity_value || 0,
          is_b1g1: !!p.is_b1g1,
          is_on_sale: p.sale_price !== null && p.sale_price < p.base_price,
        };
      });
      setProductChanges(initialChanges);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      toast.error('Failed to load products list');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCampaignPresetChange = (preset: string) => {
    if (preset === 'custom') {
      setIsCustomName(true);
      setCampaign(prev => ({ ...prev, campaign_name: customNameInput }));
    } else {
      setIsCustomName(false);
      setCampaign(prev => ({ 
        ...prev, 
        campaign_name: preset,
        banner_text: preset === 'B1G1' 
          ? 'Buy 1 Get 1 Free on all plants!' 
          : `⚡ Special Live Sale: ${preset}! Limited period only.`
      }));
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCampaign(true);

      const finalName = isCustomName ? customNameInput : campaign.campaign_name;
      if (!finalName.trim()) {
        toast.error('Campaign Name is required');
        return;
      }

      let targetEndDate: string | null = null;
      if (campaign.end_type === 'timer') {
        const days = parseInt(daysDuration);
        if (isNaN(days) || days <= 0) {
          toast.error('Please enter a valid duration in days');
          return;
        }
        const date = new Date();
        date.setDate(date.getDate() + days);
        targetEndDate = date.toISOString();
      }

      const updateData = {
        campaign_name: finalName,
        banner_text: campaign.banner_text,
        is_active: campaign.is_active,
        end_type: campaign.end_type,
        end_date: targetEndDate,
      };

      // Always save to localStorage as reliable backup
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...campaign, ...updateData, campaign_name: finalName }));

      // Attempt to save to Supabase
      const { error } = await supabase
        .from('campaign_settings' as any)
        .upsert({ id: CAMPAIGN_ID, ...updateData });

      if (error) {
        console.warn('Supabase campaign_settings table missing:', error);
        setShowSqlHelper(true);
        toast.success('Campaign settings saved locally! (Copy SQL below to enable cloud sync)');
      } else {
        toast.success('Campaign settings saved to database!');
        setShowSqlHelper(false);
      }

      setCampaign(prev => ({ ...prev, ...updateData, campaign_name: finalName }));
    } catch (e: any) {
      console.error('Error saving campaign:', e);
      toast.success('Campaign saved locally.');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleProductChange = (productId: string, field: keyof typeof productChanges[string], value: any) => {
    setProductChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSaveProductRow = async (productId: string) => {
    const changes = productChanges[productId];
    if (!changes) return;

    try {
      setSavingProductIds(prev => [...prev, productId]);

      const product = products.find(p => p.id === productId);
      const updates: any = {
        scarcity_status: changes.scarcity_status,
        scarcity_value: changes.scarcity_value,
        is_b1g1: changes.is_b1g1,
      };

      // If toggled On Sale and product has no sale_price, default to 15% off base_price
      if (changes.is_on_sale && product && !product.sale_price) {
        updates.sale_price = Math.round(product.base_price * 0.85);
      } else if (!changes.is_on_sale && product && product.sale_price) {
        updates.sale_price = null;
      }

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;
      toast.success('Plant settings updated!');
    } catch (e: any) {
      console.error('Error saving product sales settings:', e);
      toast.error('Failed to update plant settings');
    } finally {
      setSavingProductIds(prev => prev.filter(id => id !== productId));
    }
  };

  const copySqlSnippet = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    toast.success('SQL snippet copied to clipboard! Paste it into Supabase SQL Editor.');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.botanical_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-2 text-gray-900">
            <Megaphone className="w-7 h-7 text-emerald-800" /> Sales & Hype Controls
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage live sale campaigns, choose participating plants, and set fake stock urgency hype.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9 gap-1 text-xs font-semibold">
          <a href="/sale" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" /> View Public Sale Page
          </a>
        </Button>
      </div>

      {/* SQL Migration Helper Banner (shown if table missing) */}
      {showSqlHelper && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              One-Time Setup: Create 'campaign_settings' in Supabase
            </h4>
            <p className="text-xs text-amber-800">
              The campaign table has not been created yet in your Supabase SQL editor. Your settings are currently saved in local memory safely.
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={copySqlSnippet}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap h-8 gap-1.5 shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" /> Copy SQL Query
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Campaign Settings: 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-700" /> Active Sales Campaign
              </CardTitle>
              <CardDescription className="text-xs">
                Configure site-wide countdowns and promo announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaign ? (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Loading campaign details...</div>
              ) : (
                <form onSubmit={handleSaveCampaign} className="space-y-4">
                  {/* Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/40 border-emerald-100">
                    <div className="space-y-0.5">
                      <Label htmlFor="campaign-active" className="text-xs font-semibold text-gray-900">Enable Live Campaign</Label>
                      <p className="text-[11px] text-muted-foreground">Activates banner across the store & enables /sale page</p>
                    </div>
                    <Switch
                      id="campaign-active"
                      checked={campaign.is_active}
                      onCheckedChange={(val) => setCampaign({ ...campaign, is_active: val })}
                    />
                  </div>

                  {/* Preset */}
                  <div className="space-y-1.5">
                    <Label htmlFor="campaign-preset" className="text-xs font-semibold">Sale Campaign Theme</Label>
                    <select
                      id="campaign-preset"
                      value={isCustomName ? 'custom' : campaign.campaign_name}
                      onChange={(e) => handleCampaignPresetChange(e.target.value)}
                      className="w-full bg-white border border-input rounded-md px-3 py-2 text-xs"
                    >
                      <option value="Diwali Festive Sale">🪔 Diwali Festive Sale</option>
                      <option value="B1G1">🌱 Buy 1 Get 1 Free (B1G1)</option>
                      <option value="Stock Clearance Sale">🔥 Stock Clearance Sale</option>
                      <option value="Monsoon Green Sale">🌧️ Monsoon Green Sale</option>
                      <option value="Weekend Flash Deals">⚡ Weekend Flash Deals</option>
                      <option value="custom">✍️ Custom Campaign Name...</option>
                    </select>
                  </div>

                  {isCustomName && (
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-name" className="text-xs font-semibold">Custom Sale Name</Label>
                      <Input
                        id="custom-name"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="e.g. Navratri Special"
                        className="text-xs h-9"
                      />
                    </div>
                  )}

                  {/* Banner text */}
                  <div className="space-y-1.5">
                    <Label htmlFor="banner-text" className="text-xs font-semibold">Announcement Text</Label>
                    <Input
                      id="banner-text"
                      value={campaign.banner_text}
                      onChange={(e) => setCampaign({ ...campaign, banner_text: e.target.value })}
                      placeholder="e.g. Flat 40% OFF + Free Gift on orders above ₹899!"
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs font-semibold">Campaign Duration</Label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div 
                        className={`flex items-center space-x-2 border rounded-md p-2.5 bg-white cursor-pointer transition-colors ${campaign.end_type === 'manual' ? 'border-emerald-600 bg-emerald-50/20' : ''}`}
                        onClick={() => setCampaign({ ...campaign, end_type: 'manual' })}
                      >
                        <input
                          type="radio"
                          id="end-manual"
                          checked={campaign.end_type === 'manual'}
                          onChange={() => setCampaign({ ...campaign, end_type: 'manual' })}
                          className="text-emerald-700"
                        />
                        <Label htmlFor="end-manual" className="cursor-pointer text-xs font-medium">Manual Stop</Label>
                      </div>

                      <div 
                        className={`flex items-center space-x-2 border rounded-md p-2.5 bg-white cursor-pointer transition-colors ${campaign.end_type === 'timer' ? 'border-emerald-600 bg-emerald-50/20' : ''}`}
                        onClick={() => setCampaign({ ...campaign, end_type: 'timer' })}
                      >
                        <input
                          type="radio"
                          id="end-timer"
                          checked={campaign.end_type === 'timer'}
                          onChange={() => setCampaign({ ...campaign, end_type: 'timer' })}
                          className="text-emerald-700"
                        />
                        <Label htmlFor="end-timer" className="cursor-pointer text-xs font-medium">Timer Countdown</Label>
                      </div>
                    </div>
                  </div>

                  {campaign.end_type === 'timer' && (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-dashed border-gray-200">
                      <Label htmlFor="days-duration" className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Auto-expire after (Days):
                      </Label>
                      <Input
                        id="days-duration"
                        type="number"
                        min="1"
                        value={daysDuration}
                        onChange={(e) => setDaysDuration(e.target.value)}
                        placeholder="e.g. 5"
                        className="text-xs h-8"
                      />
                      {campaign.end_date && (
                        <p className="text-[10px] text-muted-foreground">
                          Ends on: {new Date(campaign.end_date).toLocaleDateString()} at {new Date(campaign.end_date).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}

                  <Button type="submit" disabled={savingCampaign} className="w-full mt-3 gradient-hero text-xs h-9">
                    {savingCampaign ? 'Saving settings...' : 'Save Campaign Settings'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Catalog Hype & Scarcity Controls: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Product Hype & Sale Selection</CardTitle>
                <CardDescription className="text-xs">
                  Pick plants for the sale page and set artificial scarcity stock hype
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchProducts} className="h-8 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Reload
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search plants by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-semibold border-b">
                      <tr>
                        <th className="px-3 py-2.5">Plant Name</th>
                        <th className="px-3 py-2.5 text-center">Hype Stock</th>
                        <th className="px-3 py-2.5 text-center">Urgency Badge</th>
                        <th className="px-3 py-2.5 text-center">Promo Tag</th>
                        <th className="px-3 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingProducts ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground animate-pulse">
                            Loading plant inventory...
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                            No plants match search.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => {
                          const changes = productChanges[product.id] || {
                            scarcity_status: 'none',
                            scarcity_value: 0,
                            is_b1g1: false,
                            is_on_sale: false,
                          };
                          const isSaving = savingProductIds.includes(product.id);

                          return (
                            <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-3 py-2.5">
                                <p className="font-semibold text-xs text-gray-900 leading-tight">{product.name}</p>
                                <span className="text-[10px] text-muted-foreground">₹{product.base_price} Retail</span>
                              </td>
                              
                              {/* Hype Fake Stock Input */}
                              <td className="px-3 py-2.5 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  className="w-16 mx-auto text-center h-7 text-xs font-semibold"
                                  value={changes.scarcity_value}
                                  onChange={(e) => handleProductChange(product.id, 'scarcity_value', parseInt(e.target.value) || 0)}
                                  disabled={changes.scarcity_status !== 'limited_stock'}
                                />
                              </td>

                              {/* Scarcity Badge Style */}
                              <td className="px-3 py-2.5 text-center">
                                <select
                                  value={changes.scarcity_status}
                                  onChange={(e) => handleProductChange(product.id, 'scarcity_status', e.target.value)}
                                  className="text-[11px] bg-white border border-gray-200 rounded px-1.5 py-1"
                                >
                                  <option value="none">Normal Stock</option>
                                  <option value="limited_stock">🔥 Limited Stock</option>
                                  <option value="sold_out">🔴 Sold Out</option>
                                </select>
                              </td>

                              {/* Renamed Column: Promo Tag (previously B1G1) */}
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="checkbox"
                                    id={`b1g1-${product.id}`}
                                    checked={changes.is_b1g1}
                                    onChange={(e) => handleProductChange(product.id, 'is_b1g1', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-emerald-700 border-gray-300 focus:ring-emerald-700"
                                  />
                                  <label htmlFor={`b1g1-${product.id}`} className="text-[10px] font-medium text-gray-700 cursor-pointer">
                                    B1G1
                                  </label>
                                </div>
                              </td>

                              {/* Action Save button */}
                              <td className="px-3 py-2.5 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveProductRow(product.id)}
                                  disabled={isSaving}
                                  className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-50 rounded"
                                >
                                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSales;
