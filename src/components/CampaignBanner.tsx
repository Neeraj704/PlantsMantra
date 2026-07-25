// src/components/CampaignBanner.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignSettings } from '@/types/database';
import { Sparkles } from 'lucide-react';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';

export const CampaignBanner = () => {
  const [campaign, setCampaign] = useState<CampaignSettings | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { data, error } = await supabase
          .from('campaign_settings' as any)
          .select('*')
          .eq('id', CAMPAIGN_ID)
          .maybeSingle();

        if (!error && data) {
          setCampaign(data as CampaignSettings);
        }
      } catch (err) {
        console.warn('Could not load campaign banner:', err);
      }
    };

    fetchCampaign();
  }, []);

  if (!campaign || !campaign.is_active) return null;

  // If timed campaign, verify expiration
  if (campaign.end_type === 'timer' && campaign.end_date) {
    const now = new Date();
    const expiry = new Date(campaign.end_date);
    if (now >= expiry) {
      return null; // Expired, do not render banner
    }
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white text-center py-2.5 px-4 text-xs font-medium tracking-wider flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300 select-none">
      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
      <span className="font-sans font-semibold uppercase">{campaign.campaign_name}:</span>
      <span className="font-sans text-[11px] opacity-90">{campaign.banner_text}</span>
      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse hidden md:inline" />
    </div>
  );
};
