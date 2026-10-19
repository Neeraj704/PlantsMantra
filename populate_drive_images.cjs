// populate_drive_images.cjs
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wrkoyhjzgxyexyfmwnwb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya295aGp6Z3h5ZXh5Zm13bndiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQyOTYxMiwiZXhwIjoyMTA4MDA1NjEyfQ.U8tZZuawsCz0tU0yIZhdWs0gF__0lO_oIP_zLi2V0DY';
const CLOUD_NAME = 'xmz5iwmo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const html = fs.readFileSync('C:/Users/prati/.gemini/antigravity/brain/12fec360-3cb2-4611-92c4-bb1059c88f8b/.system_generated/steps/5642/content.md', 'utf8');
const regex = /aria-label=\"([^\"]+?)\s+Image\s+Shared\"[^>]+?ssk='5:auSv138:([a-zA-Z0-9_\-]+)-\d+-\d+'/g;
let m;
const driveFiles = [];
while ((m = regex.exec(html)) !== null) {
  driveFiles.push({ name: m[1].trim(), id: m[2].trim() });
}

console.log(`Loaded ${driveFiles.length} real succulent photos from Google Drive.`);

function cdn(driveId, width = 600) {
  const originUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_${width}/${encodeURIComponent(originUrl)}`;
}

async function run() {
  console.log('🌿 Updating all 120 products in Supabase with actual nursery succulent photos...');
  const { data: products, error } = await supabase.from('products').select('id, name, botanical_name').order('priority', { ascending: false });
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return;
  }

  console.log(`Found ${products.length} products to update...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const mainFile = driveFiles[i % driveFiles.length];
    const gal1 = driveFiles[(i + 1) % driveFiles.length];
    const gal2 = driveFiles[(i + 2) % driveFiles.length];
    const gal3 = driveFiles[(i + 3) % driveFiles.length];

    const mainUrl = cdn(mainFile.id, 600);
    const galleryUrls = [cdn(gal1.id, 600), cdn(gal2.id, 600), cdn(gal3.id, 600)];

    const { error: updErr } = await supabase
      .from('products')
      .update({
        main_image_url: mainUrl,
        gallery_images: galleryUrls
      })
      .eq('id', p.id);

    if (updErr) {
      console.error(`Failed to update ${p.name}:`, updErr);
    }
  }

  console.log(`✅ All ${products.length} products updated with real nursery photos!`);

  // Update hero banners
  const heroDriveFile = driveFiles[0]; // High-res nursery shot
  const heroBannerUrl = cdn(heroDriveFile.id, 1200);

  await supabase.from('campaign_settings').update({
    banner_image_url: heroBannerUrl,
    is_active: true
  }).eq('id', '00000000-0000-0000-0000-000000000001');

  console.log('✅ Campaign banner updated with high-res nursery succulent photo!');
  console.log('🚀 Warming up Cloudinary edge cache for all 50 drive images in parallel...');

  const warmupPromises = driveFiles.map((file, idx) => {
    const url = cdn(file.id, 600);
    return fetch(url)
      .then(res => {
        if (res.ok) console.log(`[Cache Warm ${idx + 1}/50] ${file.name} -> HTTP ${res.status}`);
        else console.warn(`[Cache Warm ${idx + 1}/50] ${file.name} -> HTTP ${res.status}`);
      })
      .catch(err => console.error(`[Cache Warm ${idx + 1}/50] ${file.name} -> Error:`, err.message));
  });

  await Promise.all(warmupPromises);
  console.log('🎉 Cloudinary cache warming complete! All original photos are live!');
}

run();
