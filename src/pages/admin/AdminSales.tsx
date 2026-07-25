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
  Layers 
} from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';

const AdminSales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingProductIds, setSavingProductIds] = useState<string[]>([]);

  // Campaign settings state
  const [campaign, setCampaign] = useState<CampaignSettings>({
    id: CAMPAIGN_ID,
    campaign_name: 'B1G1',
    banner_text: 'Buy 1 Get 1 Free on all indoor plants!',
    is_active: false,
    end_type: 'manual',
    end_date: null,
    created_at: '',
  });

  // Helper days selector
  const [daysDuration, setDaysDuration] = useState('5');

  // Custom campaign name field
  const [isCustomName, setIsCustomName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  // Row-level product changes state
  const [productChanges, setProductChanges] = useState<Record<string, {
    scarcity_status: 'none' | 'limited_stock' | 'sold_out';
    scarcity_value: number;
    is_b1g1: boolean;
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

      if (error) throw error;
      if (data) {
        setCampaign(data as CampaignSettings);
        // Pre-fill custom name state if not in presets
        const presets = ['B1G1', 'Stock Clearance Sale', 'End of Monsoon Sale', 'Diwali Festive Sale'];
        if (!presets.includes(data.campaign_name)) {
          setIsCustomName(true);
          setCustomNameInput(data.campaign_name);
        }
      }
    } catch (e: any) {
      console.error('Error fetching campaign settings:', e);
      toast.error('Failed to load sales campaign settings');
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

      // Initialize changes mapping
      const initialChanges: typeof productChanges = {};
      (data || []).forEach(p => {
        initialChanges[p.id] = {
          scarcity_status: (p.scarcity_status as any) || 'none',
          scarcity_value: p.scarcity_value || 0,
          is_b1g1: !!p.is_b1g1,
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
        // Set end date to X days from now
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

      const { error } = await supabase
        .from('campaign_settings' as any)
        .upsert({ id: CAMPAIGN_ID, ...updateData });

      if (error) throw error;

      setCampaign(prev => ({ ...prev, ...updateData, campaign_name: finalName }));
      toast.success('Campaign settings saved successfully!');
    } catch (e: any) {
      console.error('Error saving campaign:', e);
      toast.error(e.message || 'Failed to update campaign settings');
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

      const { error } = await supabase
        .from('products')
        .update({
          scarcity_status: changes.scarcity_status,
          scarcity_value: changes.scarcity_value,
          is_b1g1: changes.is_b1g1
        })
        .eq('id', productId);

      if (error) throw error;
      toast.success('Product sales settings updated');
    } catch (e: any) {
      console.error('Error saving product scarcity:', e);
      toast.error('Failed to update product details');
    } finally {
      setSavingProductIds(prev => prev.filter(id => id !== productId));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.botanical_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-primary" /> Sales & Scarcity Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure live discounts, auto-expiry timer banners, and manual plant stock scarcity hype.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Campaign Settings: 5 columns */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary" /> Active Sales Campaign
              </CardTitle>
              <CardDescription>Configure site-wide headers and timers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaign ? (
                <div className="py-8 text-center text-muted-foreground animate-pulse">Loading campaign details...</div>
              ) : (
                <form onSubmit={handleSaveCampaign} className="space-y-4">
                  {/* Campaign Status Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label htmlFor="campaign-active" className="text-sm font-semibold">Enable Sales Campaign</Label>
                      <p className="text-xs text-muted-foreground">Toggles the promo banner on the live website</p>
                    </div>
                    <Switch
                      id="campaign-active"
                      checked={campaign.is_active}
                      onCheckedChange={(val) => setCampaign({ ...campaign, is_active: val })}
                    />
                  </div>

                  {/* Campaign Name selector */}
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Sale Preset</Label>
                    <select
                      id="campaign-preset"
                      value={isCustomName ? 'custom' : campaign.campaign_name}
                      onChange={(e) => handleCampaignPresetChange(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                    >
                      <option value="B1G1">Buy 1 Get 1 Free (B1G1)</option>
                      <option value="Stock Clearance Sale">Stock Clearance Sale</option>
                      <option value="End of Monsoon Sale">End of Monsoon Sale</option>
                      <option value="Diwali Festive Sale">Diwali Festive Sale</option>
                      <option value="custom">Custom Sale Campaign...</option>
                    </select>
                  </div>

                  {isCustomName && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="custom-campaign-name">Custom Sale Name</Label>
                      <Input
                        id="custom-campaign-name"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="e.g. Mid-Summer Clearance"
                      />
                    </div>
                  )}

                  {/* Banner text */}
                  <div className="space-y-2">
                    <Label htmlFor="banner-text">Announcement Banner Text</Label>
                    <Input
                      id="banner-text"
                      value={campaign.banner_text}
                      onChange={(e) => setCampaign({ ...campaign, banner_text: e.target.value })}
                      placeholder="e.g. 🌾 Monsoon Clearance Sale is LIVE! Grab B1G1 free now!"
                    />
                  </div>

                  {/* Expire settings */}
                  <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-semibold">Campaign Duration</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex items-center space-x-2 border rounded-md p-2 bg-background cursor-pointer" onClick={() => setCampaign({ ...campaign, end_type: 'manual' })}>
                        <input
                          type="radio"
                          id="end-manual"
                          checked={campaign.end_type === 'manual'}
                          onChange={() => setCampaign({ ...campaign, end_type: 'manual' })}
                          className="text-primary focus:ring-primary"
                        />
                        <Label htmlFor="end-manual" className="cursor-pointer">Manual Stop</Label>
                      </div>

                      <div className="flex items-center space-x-2 border rounded-md p-2 bg-background cursor-pointer" onClick={() => setCampaign({ ...campaign, end_type: 'timer' })}>
                        <input
                          type="radio"
                          id="end-timer"
                          checked={campaign.end_type === 'timer'}
                          onChange={() => setCampaign({ ...campaign, end_type: 'timer' })}
                          className="text-primary focus:ring-primary"
                        />
                        <Label htmlFor="end-timer" className="cursor-pointer">Timer Countdown</Label>
                      </div>
                    </div>
                  </div>

                  {campaign.end_type === 'timer' && (
                    <div className="space-y-2 p-3 bg-muted/20 rounded-md border border-dashed animate-in fade-in">
                      <Label htmlFor="days-duration" className="flex items-center gap-1.5 text-xs text-amber-800">
                        <Calendar className="w-3.5 h-3.5" /> End Campaign automatically after (Days):
                      </Label>
                      <Input
                        id="days-duration"
                        type="number"
                        min="1"
                        value={daysDuration}
                        onChange={(e) => setDaysDuration(e.target.value)}
                        placeholder="e.g. 5"
                        className="mt-1"
                      />
                      {campaign.end_date && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Current timer expires on: {new Date(campaign.end_date).toLocaleDateString()} at {new Date(campaign.end_date).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}

                  <Button type="submit" disabled={savingCampaign} className="w-full mt-4 gradient-hero">
                    {savingCampaign ? 'Saving settings...' : 'Save Campaign Settings'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product Scarcity: 7 columns */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Catalog Hype & Urgency Controls</CardTitle>
                <CardDescription>Manually toggle scarcity stats and deduction counts</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchProducts} className="h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search catalog plants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>

              <div className="border rounded-md overflow-hidden bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold border-b">
                      <tr>
                        <th className="px-4 py-3">Plant Name</th>
                        <th className="px-4 py-3 w-28 text-center">Hype Stock</th>
                        <th className="px-4 py-3 text-center">Scarcity Style</th>
                        <th className="px-4 py-3 text-center">B1G1</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loadingProducts ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground animate-pulse">
                            Loading plant details...
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                            No plants match search.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => {
                          const changes = productChanges[product.id] || {
                            scarcity_status: 'none',
                            scarcity_value: 0,
                            is_b1g1: false
                          };
                          const isSaving = savingProductIds.includes(product.id);

                          return (
                            <tr key={product.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-xs leading-none">{product.name}</p>
                                <span className="text-[10px] text-muted-foreground font-serif">₹{product.base_price} Retail</span>
                              </td>
                              
                              {/* Scarcity Countdown Input */}
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  className="w-20 mx-auto text-center h-8 text-xs font-semibold"
                                  value={changes.scarcity_value}
                                  onChange={(e) => handleProductChange(product.id, 'scarcity_value', parseInt(e.target.value) || 0)}
                                  disabled={changes.scarcity_status !== 'limited_stock'}
                                />
                              </td>

                              {/* Scarcity Status option */}
                              <td className="px-4 py-3">
                                <select
                                  value={changes.scarcity_status}
                                  onChange={(e) => handleProductChange(product.id, 'scarcity_status', e.target.value)}
                                  className="mx-auto block text-xs bg-background border border-input rounded-md px-2 py-1"
                                >
                                  <option value="none">Normal Stock</option>
                                  <option value="limited_stock">🔥 Limited Stock</option>
                                  <option value="sold_out">🔴 Sold Out</option>
                                </select>
                              </td>

                              {/* B1G1 Toggle */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={changes.is_b1g1}
                                  onChange={(e) => handleProductChange(product.id, 'is_b1g1', e.target.checked)}
                                  className="w-4 h-4 rounded text-primary border-input focus:ring-primary"
                                />
                              </td>

                              {/* Row action save */}
                              <td className="px-4 py-3 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveProductRow(product.id)}
                                  disabled={isSaving}
                                  className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-50"
                                >
                                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
