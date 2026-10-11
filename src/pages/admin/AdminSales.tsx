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
  Tag,
  Upload,
  Image as ImageIcon,
  X,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/utils/image';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';
const LOCAL_STORAGE_KEY = 'plantsmantra_campaign_settings';

export const BANNER_PRESETS = [
  {
    id: 'none',
    name: '💎 Minimalist Emerald',
    description: 'Clean dark gradient (No photo)',
    url: '',
  },
  {
    id: 'diwali',
    name: '🪔 Diwali Festive Glow',
    description: 'Warm golden bokeh & fairy lights',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'rainforest',
    name: '🌿 Lush Tropical Jungle',
    description: 'Deep emerald monstera & palm foliage',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'succulent',
    name: '🌵 Desert Succulent Garden',
    description: 'Exotic cacti & succulent collection',
    url: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'monsoon',
    name: '🌧️ Monsoon Fresh Nursery',
    description: 'Vibrant dewy botanical leaves',
    url: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1920&q=80',
  },
];

export const SQL_MIGRATION_SNIPPET = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  banner_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  end_type TEXT DEFAULT 'manual',
  end_date TIMESTAMP WITH TIME ZONE,
  banner_image_url TEXT,
  banner_overlay_opacity NUMERIC DEFAULT 0.65,
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
ON CONFLICT (id) DO NOTHING;

-- Also add required columns to products table and campaign_settings if missing
ALTER TABLE public.campaign_settings ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
ALTER TABLE public.campaign_settings ADD COLUMN IF NOT EXISTS banner_overlay_opacity NUMERIC DEFAULT 0.65;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scarcity_status TEXT DEFAULT 'none';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS scarcity_value INTEGER DEFAULT 0;`;

const PROMO_OPTIONS = [
  { value: 'none', label: 'None (No Promo)' },
  { value: 'B4G1', label: 'B4G1 – Buy 4 Get 1 Free' },
  { value: 'B6G2', label: 'B6G2 – Buy 6 Get 2 Free' },
  { value: 'B4G1, B6G2', label: 'B4G1 & B6G2 – Tiered: Buy 4 Get 1, Buy 6 Get 2' },
  { value: 'B2G2, B4G1, B6G2', label: 'B2G2, B4G1, B6G2 – Multi-Tier (Best Deal Auto-Applied)' },
  { value: 'B1G1', label: 'B1G1 – Buy 1 Get 1 Free' },
  { value: 'B2G1', label: 'B2G1 – Buy 2 Get 1 Free' },
  { value: 'B2G2', label: 'B2G2 – Buy 2 Get 2 Free' },
  { value: 'B3G1', label: 'B3G1 – Buy 3 Get 1 Free' },
  { value: 'B3G2', label: 'B3G2 – Buy 3 Get 2 Free' },
  { value: 'BOGO 50%', label: 'BOGO 50% – 50% Off 2nd' },
  { value: 'Combo Deal', label: 'Combo Deal' },
  { value: 'Special Offer', label: 'Special Offer' },
  { value: 'custom', label: '✍️ Custom Offer (e.g. B2G2, B4G1, B6G2)...' },
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
    banner_image_url: null,
    banner_overlay_opacity: 0.65,
    created_at: '',
  });

  // Helper days selector & banner uploading state
  const [daysDuration, setDaysDuration] = useState('5');
  const [isCustomName, setIsCustomName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Row-level product changes state
  const [productChanges, setProductChanges] = useState<Record<string, {
    scarcity_status: 'none' | 'limited_stock' | 'sold_out';
    scarcity_value: number;
    promo_tag: string; // 'none' | 'B1G1' | 'B2G1' | custom offer
    sale_price_input: string; // client-chosen sale price
    is_on_sale?: boolean;
    is_custom_promo?: boolean;
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
        if (data.end_date) {
          const diffMs = new Date(data.end_date).getTime() - Date.now();
          const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          setDaysDuration(String(diffDays));
        }
      }
    } catch (e: any) {
      setShowSqlHelper(true);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCampaign(parsed);
        if (parsed.end_date) {
          const diffMs = new Date(parsed.end_date).getTime() - Date.now();
          const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          setDaysDuration(String(diffDays));
        }
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
        const normalizedPromo = currentPromo === 'B4G1+B6G2' ? 'B4G1, B6G2' : currentPromo;
        const isPredefined = PROMO_OPTIONS.some(opt => opt.value === normalizedPromo);

        // Also extract fallback scarcity / hype from tags if dedicated columns are not present
        const tagScarcity = p.tags?.find(t => t.startsWith('urgent:'))?.replace('urgent:', '');
        const tagHype = p.tags?.find(t => t.startsWith('hype:'))?.replace('hype:', '');
        const resolvedScarcity = (p.scarcity_status as any) || tagScarcity || 'none';
        const resolvedHype = p.scarcity_value || (tagHype ? parseInt(tagHype) : 0);

        initialChanges[p.id] = {
          scarcity_status: resolvedScarcity,
          scarcity_value: resolvedHype,
          promo_tag: normalizedPromo,
          sale_price_input: p.sale_price ? String(p.sale_price) : '',
          is_on_sale: p.sale_price !== null && p.sale_price < p.base_price,
          is_custom_promo: !isPredefined && normalizedPromo !== 'none',
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBanner(true);
      let uploadFile = file;
      try {
        const compressed = await compressImage(file, 1920, 1080, 0.85);
        uploadFile = new File([compressed], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      } catch (cErr) {
        console.warn('Compression error:', cErr);
      }

      const fileName = `sale-banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, uploadFile);

      if (uploadError) {
        console.warn('Storage upload error, using local data URL fallback:', uploadError);
        const reader = new FileReader();
        reader.onload = (re) => {
          const dataUrl = re.target?.result as string;
          setCampaign(prev => ({ ...prev, banner_image_url: dataUrl }));
          toast.success('Banner image selected successfully!');
        };
        reader.readAsDataURL(uploadFile);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      setCampaign(prev => ({ ...prev, banner_image_url: publicUrl }));
      toast.success('Banner image uploaded successfully!');
    } catch (err: any) {
      console.error('Error uploading banner:', err);
      toast.error('Failed to upload image. You can also paste an image URL directly.');
    } finally {
      setUploadingBanner(false);
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
        banner_image_url: campaign.banner_image_url || null,
        banner_overlay_opacity: campaign.banner_overlay_opacity ?? 0.65,
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
      const cleanPromo = (changes.promo_tag || '').trim();
      const isPromoActive = cleanPromo !== '' && cleanPromo !== 'none' && cleanPromo !== 'custom';

      // Update tags array: remove old promo, urgent, and hype tags
      const currentTags = (product?.tags || []).filter(t => 
        !t.startsWith('promo:') && 
        !t.startsWith('urgent:') && 
        !t.startsWith('hype:')
      );

      if (isPromoActive) {
        currentTags.push(`promo:${cleanPromo}`);
      }
      if (changes.scarcity_status && changes.scarcity_status !== 'none') {
        currentTags.push(`urgent:${changes.scarcity_status}`);
      }
      if (changes.scarcity_value && changes.scarcity_value > 0) {
        currentTags.push(`hype:${changes.scarcity_value}`);
      }

      // Parse client-chosen sale price
      let chosenSalePrice: number | null = null;
      if (changes.sale_price_input && changes.sale_price_input.trim() !== '') {
        const val = parseFloat(changes.sale_price_input.trim());
        if (!isNaN(val) && val > 0) {
          chosenSalePrice = val;
        }
      }

      // Attempt update with dedicated columns first
      let updateError: any = null;
      try {
        const { error } = await supabase
          .from('products')
          .update({
            scarcity_status: changes.scarcity_status,
            scarcity_value: changes.scarcity_value,
            tags: currentTags,
            sale_price: chosenSalePrice,
          })
          .eq('id', productId);
        updateError = error;
      } catch (colErr: any) {
        updateError = colErr;
      }

      // Fallback if scarcity_status column doesn't exist in Supabase schema (PGRST204)
      if (updateError && (updateError.message?.includes('scarcity_status') || updateError.code === 'PGRST204')) {
        const { error: fallbackError } = await supabase
          .from('products')
          .update({
            tags: currentTags,
            sale_price: chosenSalePrice,
          })
          .eq('id', productId);
        if (fallbackError) throw fallbackError;
      } else if (updateError) {
        throw updateError;
      }

      // Update local product state
      setProducts(prev => prev.map(p => p.id === productId ? { 
        ...p, 
        tags: currentTags,
        sale_price: chosenSalePrice,
        scarcity_status: changes.scarcity_status,
        scarcity_value: changes.scarcity_value,
      } : p));

      toast.success(`Saved "${product?.name}"!`);
    } catch (e: any) {
      console.error('Error saving product sales settings:', e);
      toast.error(e?.message || 'Failed to update plant settings');
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

              {/* Row 2: Banner Text + Duration Settings */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-1">
                {/* Banner Text */}
                <div className="md:col-span-6 space-y-1">
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
                <div className="md:col-span-6 space-y-1">
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
                          max="365"
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
              </div>

              {/* Row 3: Banner Background Image & Theme Section */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-800" /> Banner Background Image & Visual Theme
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Pick a curated sale backdrop, paste any web image link, or upload your own picture for the sale hero banner.
                    </p>
                  </div>

                  {campaign.banner_image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCampaign(prev => ({ ...prev, banner_image_url: null }))}
                      className="text-[11px] text-red-600 hover:text-red-700 h-7 px-2 gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Revert to Gradient
                    </Button>
                  )}
                </div>

                {/* Curated Preset Background Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {BANNER_PRESETS.map((preset) => {
                    const isSelected = preset.url 
                      ? campaign.banner_image_url === preset.url 
                      : !campaign.banner_image_url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCampaign(prev => ({ ...prev, banner_image_url: preset.url || null }))}
                        className={`relative rounded-lg p-2 text-left border transition-all text-xs overflow-hidden group ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/50 shadow-xs'
                            : 'border-gray-200 hover:border-emerald-300 bg-white'
                        }`}
                      >
                        {preset.url ? (
                          <div 
                            className="h-12 w-full rounded mb-1.5 bg-cover bg-center border border-black/10 relative"
                            style={{ backgroundImage: `url(${preset.url})` }}
                          >
                            <div className="absolute inset-0 bg-black/40 rounded" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-12 w-full rounded mb-1.5 bg-gradient-to-r from-emerald-950 via-[#13301a] to-teal-950 border border-black/10 relative">
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="font-semibold text-[11px] truncate text-gray-900">{preset.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom URL + File Upload + Darkness Tint */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                  <div className="sm:col-span-6 space-y-1">
                    <Label htmlFor="custom-banner-url" className="text-[11px] font-semibold text-gray-700">
                      Or Paste Custom Image URL
                    </Label>
                    <Input
                      id="custom-banner-url"
                      type="url"
                      placeholder="https://images.unsplash.com/... or https://..."
                      value={campaign.banner_image_url || ''}
                      onChange={(e) => setCampaign(prev => ({ ...prev, banner_image_url: e.target.value || null }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700 block">
                      Upload from Device
                    </Label>
                    <label className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{uploadingBanner ? 'Uploading...' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingBanner}
                        onChange={handleBannerUpload}
                      />
                    </label>
                  </div>

                  {/* Dark Overlay Tint Selector */}
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700 flex justify-between">
                      <span>Dark Overlay Tint</span>
                      <span className="font-bold text-emerald-800">{Math.round((campaign.banner_overlay_opacity ?? 0.65) * 100)}%</span>
                    </Label>
                    <div className="flex border border-gray-200 rounded-md overflow-hidden bg-gray-50 text-[11px] h-8">
                      {[
                        { label: 'Light', val: 0.45 },
                        { label: 'Medium', val: 0.65 },
                        { label: 'Deep', val: 0.85 },
                      ].map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => setCampaign(prev => ({ ...prev, banner_overlay_opacity: t.val }))}
                          className={`flex-1 font-semibold transition-colors ${
                            (campaign.banner_overlay_opacity ?? 0.65) === t.val
                              ? 'bg-emerald-800 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Interactive Preview Box */}
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-300 shadow-xs">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between text-[11px] text-gray-600 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <Eye className="w-3.5 h-3.5 text-emerald-700" /> Live Sale Banner Preview
                    </span>
                    <span className="text-[10px] text-gray-500">Live preview of how customers will see your banner on /sale</span>
                  </div>

                  <div 
                    className="p-4 sm:p-6 md:p-8 text-white text-center relative overflow-hidden bg-cover bg-center min-h-[140px] sm:min-h-[170px] flex flex-col items-center justify-center transition-all duration-300"
                    style={{
                      backgroundImage: campaign.banner_image_url ? `url(${campaign.banner_image_url})` : undefined,
                      backgroundColor: '#062314',
                    }}
                  >
                    {!campaign.banner_image_url && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-[#13301a] to-teal-950" />
                    )}
                    <div 
                      className="absolute inset-0 bg-black transition-opacity duration-300"
                      style={{ opacity: campaign.banner_image_url ? (campaign.banner_overlay_opacity ?? 0.65) : 0.2 }}
                    />
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                    <div className="relative z-10 max-w-lg mx-auto space-y-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest border border-amber-400/30">
                        <Flame className="w-3 h-3 text-amber-400" /> Limited Period Offer
                      </span>
                      <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                        {isCustomName ? (customNameInput || 'Your Sale Title') : campaign.campaign_name}
                      </h3>
                      <p className="text-xs text-emerald-100/90 line-clamp-2">
                        {campaign.banner_text || 'Exclusive limited-period discounts on handpicked live plants'}
                      </p>

                      {/* Mini Preview Countdown */}
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        {['02 DAYS', '14 HOURS', '34 MINS', '16 SECS'].map((txt, i) => (
                          <div key={i} className="bg-black/50 backdrop-blur-xs border border-white/10 rounded px-2 py-1 text-[10px] font-mono font-bold text-amber-300">
                            {txt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-2 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={savingCampaign} 
                    className="gradient-hero text-xs font-semibold h-9 px-6 shadow-sm gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingCampaign ? 'Saving Campaign...' : 'Save Campaign Settings'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const changes = productChanges[product.id] || {
                  scarcity_status: 'none',
                  scarcity_value: 0,
                  promo_tag: 'none',
                  sale_price_input: '',
                };
                const isSaving = savingProductIds.includes(product.id);
                const imgSrc = getProxiedUrl(product.main_image_url) || '/placeholder.svg';

                return (
                  <div 
                    key={product.id}
                    className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    {/* Plant Header */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 min-w-[48px] max-w-[48px] h-12 min-h-[48px] max-h-[48px] rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                        <img 
                          src={imgSrc} 
                          alt={product.name} 
                          className="w-full h-full object-cover rounded-lg" 
                          loading="lazy"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-800">₹{product.base_price}</span>
                          {product.sale_price && (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Sale: ₹{product.sale_price}
                            </span>
                          )}
                          {product.botanical_name && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]">
                              {product.botanical_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls Section */}
                    <div className="pt-2.5 border-t border-gray-100 space-y-2.5 text-xs">
                      {/* 1. Promo Offer Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-700 block uppercase tracking-wider">Promo Offer</label>
                        <select
                          value={
                            changes.is_custom_promo
                              ? 'custom'
                              : PROMO_OPTIONS.some(o => o.value === changes.promo_tag)
                              ? changes.promo_tag
                              : (changes.promo_tag && changes.promo_tag !== 'none' ? 'custom' : 'none')
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              handleProductChange(product.id, 'is_custom_promo', true);
                              if (PROMO_OPTIONS.some(o => o.value === changes.promo_tag && o.value !== 'custom')) {
                                handleProductChange(product.id, 'promo_tag', '');
                              }
                            } else {
                              handleProductChange(product.id, 'is_custom_promo', false);
                              handleProductChange(product.id, 'promo_tag', val);
                            }
                          }}
                          className={`w-full text-xs rounded-lg px-2.5 py-1.5 font-medium border transition-colors ${
                            changes.promo_tag !== 'none' 
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' 
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          {PROMO_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {/* Custom Offer Text Input */}
                        {Boolean(
                          changes.is_custom_promo ||
                          (changes.promo_tag && !PROMO_OPTIONS.some(o => o.value === changes.promo_tag) && changes.promo_tag !== 'none')
                        ) && (
                          <Input
                            type="text"
                            placeholder="Type custom offer (e.g. Free Pot)"
                            value={changes.promo_tag === 'custom' ? '' : changes.promo_tag}
                            onChange={(e) => handleProductChange(product.id, 'promo_tag', e.target.value)}
                            className="h-8 text-xs mt-1.5 bg-white border-emerald-400 px-2.5 font-medium"
                          />
                        )}
                      </div>

                      {/* 2. Three Inputs: Sale Price, Urgency, Hype Stock */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Sale Price */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-700 block truncate">Sale Price ₹</label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Regular"
                            value={changes.sale_price_input || ''}
                            onChange={(e) => handleProductChange(product.id, 'sale_price_input', e.target.value)}
                            className={`h-8 text-xs text-center font-bold px-1 rounded-md ${
                              changes.sale_price_input 
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800' 
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          />
                        </div>

                        {/* Urgency */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-700 block truncate">Urgency</label>
                          <select
                            value={changes.scarcity_status}
                            onChange={(e) => handleProductChange(product.id, 'scarcity_status', e.target.value)}
                            className="w-full text-xs bg-white border border-gray-200 rounded-md px-1.5 py-1 text-gray-700 h-8"
                          >
                            <option value="none">Normal</option>
                            <option value="limited_stock">🔥 Limited</option>
                            <option value="sold_out">🔴 Sold Out</option>
                          </select>
                        </div>

                        {/* Hype Stock */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-700 block text-center truncate">Hype Stock</label>
                          <Input
                            type="number"
                            min="0"
                            value={changes.scarcity_value}
                            onChange={(e) => handleProductChange(product.id, 'scarcity_value', parseInt(e.target.value) || 0)}
                            disabled={changes.scarcity_status !== 'limited_stock'}
                            className="h-8 text-xs text-center font-bold px-1 rounded-md"
                          />
                        </div>
                      </div>

                      {/* 3. Full Width Save Button */}
                      <Button
                        size="sm"
                        onClick={() => handleSaveProductRow(product.id)}
                        disabled={isSaving}
                        className="w-full h-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs gap-1.5 transition-all mt-1"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Plant Settings</span>
                          </>
                        )}
                      </Button>
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
