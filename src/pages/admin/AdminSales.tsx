// src/pages/admin/AdminSales.tsx
import { useEffect, useState } from 'react';
import { supabase, getProxiedUrl } from '@/integrations/supabase/client';
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
  ExternalLink,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';
const LOCAL_STORAGE_KEY = 'plantsmantra_campaign_settings';

export const SQL_MIGRATION_SNIPPET = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  banner_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  end_type TEXT DEFAULT 'manual',
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to campaign_settings" ON public.campaign_settings;
CREATE POLICY "Allow public read access to campaign_settings" 
  ON public.campaign_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access to campaign_settings" ON public.campaign_settings;
CREATE POLICY "Allow admin write access to campaign_settings" 
  ON public.campaign_settings FOR ALL USING (true);

INSERT INTO public.campaign_settings (id, campaign_name, banner_text, is_active, end_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Festive Flash Sale', 'Buy 1 Get 1 Free on select indoor plants! Limited time only.', false, 'manual')
ON CONFLICT (id) DO NOTHING;`;

const PROMO_OPTIONS = [
  { value: 'none', label: 'None (No Promo)' },
  { value: 'B1G1', label: 'B1G1 – Buy 1 Get 1 Free' },
  { value: 'B2G1', label: 'B2G1 – Buy 2 Get 1 Free' },
  { value: 'B2G2', label: 'B2G2 – Buy 2 Get 2 Free' },
  { value: 'B3G1', label: 'B3G1 – Buy 3 Get 1 Free' },
  { value: 'B3G2', label: 'B3G2 – Buy 3 Get 2 Free' },
  { value: 'BOGO 50%', label: 'BOGO 50% – 50% Off 2nd' },
  { value: 'Combo Deal', label: 'Combo Deal' },
  { value: 'Special Offer', label: 'Special Offer' },
];

const AdminSales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPromoOnly, setFilterPromoOnly] = useState(false);
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
    promo_tag: string; // 'none' | 'B1G1' | 'B2G1' | etc.
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
        setShowSqlHelper(true);
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setCampaign(JSON.parse(stored));
        }
      } else if (data) {
        setCampaign(data as CampaignSettings);
        const presets = ['B1G1', 'Stock Clearance Sale', 'End of Monsoon Sale', 'Diwali Festive Sale', 'Weekend Flash Deals'];
        if (!presets.includes(data.campaign_name)) {
          setIsCustomName(true);
          setCustomNameInput(data.campaign_name);
        }
      }
    } catch (e: any) {
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
        // Extract promo tag from tags array if present (e.g. 'promo:B2G1') or check is_b1g1
        const foundPromo = p.tags?.find(t => t.startsWith('promo:'))?.replace('promo:', '');
        const currentPromo = foundPromo || (p.is_b1g1 ? 'B1G1' : 'none');

        initialChanges[p.id] = {
          scarcity_status: (p.scarcity_status as any) || 'none',
          scarcity_value: p.scarcity_value || 0,
          promo_tag: currentPromo,
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
        setShowSqlHelper(true);
        toast.success('Campaign settings saved locally! (Copy SQL query to sync cloud)');
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
      const isPromoActive = changes.promo_tag !== 'none';

      // Update tags array: remove old promo tags, add new one if active
      const currentTags = (product?.tags || []).filter(t => !t.startsWith('promo:'));
      if (isPromoActive) {
        currentTags.push(`promo:${changes.promo_tag}`);
      }

      const updates: any = {
        scarcity_status: changes.scarcity_status,
        scarcity_value: changes.scarcity_value,
        is_b1g1: isPromoActive, // maintains backward compatibility with sale page queries
        tags: currentTags,
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

      // Update local product state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
      toast.success(`Saved "${product?.name}"!`);
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.botanical_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterPromoOnly) {
      const changes = productChanges[p.id];
      return changes && changes.promo_tag !== 'none';
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold flex items-center gap-2 text-gray-900">
            <Megaphone className="w-7 h-7 text-emerald-800" /> Sales & Hype Controls
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage live sale campaigns, choose participating plants, and set fake stock urgency hype.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
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

      {/* 1. TOP CARD: Active Sales Campaign (Full Width) */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-950 font-serif">
              <Percent className="w-5 h-5 text-emerald-700" /> Active Sales Campaign
            </CardTitle>
            <CardDescription className="text-xs">
              Configure site-wide countdowns, promo banners, and auto-expiry duration
            </CardDescription>
          </div>
          
          {/* Active Status Badge */}
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            campaign.is_active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600'
          }`}>
            {campaign.is_active ? '● Campaign Live' : '○ Campaign Inactive'}
          </span>
        </CardHeader>

        <CardContent className="pt-4">
          {loadingCampaign ? (
            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading campaign details...</div>
          ) : (
            <form onSubmit={handleSaveCampaign} className="space-y-4">
              {/* Row 1: Enable Toggle + Theme Preset + Custom Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Toggle */}
                <div className="md:col-span-4 flex items-center justify-between p-3 rounded-lg border bg-emerald-50/40 border-emerald-100 h-full">
                  <div className="space-y-0.5">
                    <Label htmlFor="campaign-active" className="text-xs font-semibold text-gray-900 cursor-pointer">
                      Enable Live Campaign
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Activates banner across store & enables /sale</p>
                  </div>
                  <Switch
                    id="campaign-active"
                    checked={campaign.is_active}
                    onCheckedChange={(val) => setCampaign({ ...campaign, is_active: val })}
                  />
                </div>

                {/* Theme Preset */}
                <div className="md:col-span-4 space-y-1">
                  <Label htmlFor="campaign-preset" className="text-xs font-semibold">Sale Theme Preset</Label>
                  <select
                    id="campaign-preset"
                    value={isCustomName ? 'custom' : campaign.campaign_name}
                    onChange={(e) => handleCampaignPresetChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="Diwali Festive Sale">🪔 Diwali Festive Sale</option>
                    <option value="B1G1">🌱 Buy 1 Get 1 Free (B1G1)</option>
                    <option value="Stock Clearance Sale">🔥 Stock Clearance Sale</option>
                    <option value="Monsoon Green Sale">🌧️ Monsoon Green Sale</option>
                    <option value="Weekend Flash Deals">⚡ Weekend Flash Deals</option>
                    <option value="custom">✍️ Custom Campaign Name...</option>
                  </select>
                </div>

                {/* Custom Name (if selected) or Quick info */}
                <div className="md:col-span-4 space-y-1">
                  {isCustomName ? (
                    <>
                      <Label htmlFor="custom-name" className="text-xs font-semibold">Custom Sale Name</Label>
                      <Input
                        id="custom-name"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        placeholder="e.g. Navratri Special Deals"
                        className="text-xs h-9"
                      />
                    </>
                  ) : (
                    <>
                      <Label className="text-xs font-semibold text-gray-600">Active Name Preview</Label>
                      <div className="text-xs font-semibold text-emerald-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 truncate">
                        {campaign.campaign_name}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Banner Text + Duration Settings + Save Button */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-1">
                {/* Banner Text */}
                <div className="md:col-span-5 space-y-1">
                  <Label htmlFor="banner-text" className="text-xs font-semibold">Announcement Banner Text</Label>
                  <Input
                    id="banner-text"
                    value={campaign.banner_text}
                    onChange={(e) => setCampaign({ ...campaign, banner_text: e.target.value })}
                    placeholder="e.g. Buy 1 Get 1 Free on select indoor plants! Limited time only."
                    className="text-xs h-9"
                  />
                </div>

                {/* Countdown Duration Section */}
                <div className="md:col-span-5 space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Countdown & Duration</span>
                    {campaign.end_type === 'timer' && (
                      <span className="text-[10px] text-emerald-700 font-bold">● Timer Active</span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    {/* Manual vs Timer Toggle */}
                    <div className="flex border border-gray-200 rounded-md overflow-hidden bg-gray-50 text-xs">
                      <button
                        type="button"
                        onClick={() => setCampaign({ ...campaign, end_type: 'manual' })}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          campaign.end_type === 'manual' 
                            ? 'bg-emerald-800 text-white shadow-xs' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Manual Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => setCampaign({ ...campaign, end_type: 'timer' })}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          campaign.end_type === 'timer' 
                            ? 'bg-emerald-800 text-white shadow-xs' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Timer Clock
                      </button>
                    </div>

                    {/* Days input when Timer is chosen */}
                    {campaign.end_type === 'timer' ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          value={daysDuration}
                          onChange={(e) => setDaysDuration(e.target.value)}
                          placeholder="Days"
                          className="text-xs h-9 w-20 text-center font-bold"
                        />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">days auto-countdown</span>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center text-[11px] text-muted-foreground px-2 bg-gray-50 rounded border border-gray-200">
                        Runs continuously until you switch it off
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Campaign Button */}
                <div className="md:col-span-2">
                  <Button 
                    type="submit" 
                    disabled={savingCampaign} 
                    className="w-full gradient-hero text-xs font-semibold h-9 shadow-sm"
                  >
                    {savingCampaign ? 'Saving...' : 'Save Campaign'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 2. BOTTOM CARD: Product Hype & Sale Selection (Full Width with 2-Column Grid) */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 font-serif text-gray-900">
              <Sparkles className="w-5 h-5 text-emerald-700" /> Product Hype & Sale Selection
            </CardTitle>
            <CardDescription className="text-xs">
              Assign promo offers (B1G1, B2G1, etc.) and configure artificial scarcity stock hype.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterPromoOnly(!filterPromoOnly)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors flex items-center gap-1 ${
                filterPromoOnly 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Tag className="w-3 h-3" />
              {filterPromoOnly ? 'Showing Promo Only' : 'Filter Promos'}
            </button>

            <Button variant="outline" size="sm" onClick={fetchProducts} className="h-8 text-xs gap-1">
              <RefreshCw className="w-3 h-3" /> Reload
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search plants by name or botanical name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* 2-Column Grid Layout: Shows 2 products side-by-side to drastically reduce scrolling */}
          {loadingProducts ? (
            <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
              Loading plant catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No plants match your search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProducts.map((product) => {
                const changes = productChanges[product.id] || {
                  scarcity_status: 'none',
                  scarcity_value: 0,
                  promo_tag: 'none',
                  is_on_sale: false,
                };
                const isSaving = savingProductIds.includes(product.id);
                const imgSrc = getProxiedUrl(product.main_image_url) || '/placeholder.svg';

                return (
                  <div 
                    key={product.id}
                    className="p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-200 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5"
                  >
                    {/* Plant Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                        <img 
                          src={imgSrc} 
                          alt={product.name} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold text-gray-800">₹{product.base_price}</span>
                          {product.sale_price && (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                              Sale: ₹{product.sale_price}
                            </span>
                          )}
                          {product.botanical_name && (
                            <span className="text-[10px] text-muted-foreground italic truncate">
                              {product.botanical_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-gray-100 text-xs">
                      {/* 1. Promo Tag Dropdown (4 cols) */}
                      <div className="col-span-5 space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-600 block">Promo Offer</label>
                        <select
                          value={changes.promo_tag}
                          onChange={(e) => handleProductChange(product.id, 'promo_tag', e.target.value)}
                          className={`w-full text-[11px] rounded px-2 py-1 font-medium border transition-colors ${
                            changes.promo_tag !== 'none' 
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' 
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          {PROMO_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Urgency Badge (3 cols) */}
                      <div className="col-span-3 space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-600 block">Urgency</label>
                        <select
                          value={changes.scarcity_status}
                          onChange={(e) => handleProductChange(product.id, 'scarcity_status', e.target.value)}
                          className="w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-1 text-gray-700"
                        >
                          <option value="none">Normal</option>
                          <option value="limited_stock">🔥 Limited</option>
                          <option value="sold_out">🔴 Sold Out</option>
                        </select>
                      </div>

                      {/* 3. Hype Stock Count (2 cols) */}
                      <div className="col-span-2 space-y-0.5">
                        <label className="text-[10px] font-semibold text-gray-600 block text-center">Hype Stock</label>
                        <Input
                          type="number"
                          min="0"
                          value={changes.scarcity_value}
                          onChange={(e) => handleProductChange(product.id, 'scarcity_value', parseInt(e.target.value) || 0)}
                          disabled={changes.scarcity_status !== 'limited_stock'}
                          className="h-7 text-xs text-center font-bold px-1"
                        />
                      </div>

                      {/* 4. Explicit "Save" Button (2 cols) */}
                      <div className="col-span-2 flex justify-end items-end h-full pt-3">
                        <Button
                          size="sm"
                          onClick={() => handleSaveProductRow(product.id)}
                          disabled={isSaving}
                          className="h-7 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded shadow-xs"
                        >
                          {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSales;
