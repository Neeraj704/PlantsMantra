// src/components/CampaignBanner.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CampaignSettings } from '@/types/database';
import { Sparkles, ArrowRight } from 'lucide-react';

const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';
const LOCAL_STORAGE_KEY = 'plantsmantra_campaign_settings';

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
          return;
        }
      } catch (err) {
        // Table not ready or query failed
      }

      // Check fallback in localStorage
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setCampaign(JSON.parse(stored));
        }
      } catch (e) {
        // ignore
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
      return null;
    }
  }

  return (
    <Link 
      to="/sale" 
      className="block w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white text-center py-2 px-3 text-xs font-medium tracking-wide shadow-sm hover:opacity-95 transition-opacity cursor-pointer group"
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse flex-shrink-0" />
        <span className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs text-amber-300">
          {campaign.campaign_name}:
        </span>
        <span className="text-[11px] sm:text-xs opacity-90 truncate max-w-xs sm:max-w-none">
          {campaign.banner_text}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 group-hover:underline ml-1">
          Shop Sale <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
};
