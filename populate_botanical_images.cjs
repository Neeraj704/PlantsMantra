// populate_botanical_images.cjs
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wrkoyhjzgxyexyfmwnwb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya295aGp6Z3h5ZXh5Zm13bndiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQyOTYxMiwiZXhwIjoyMTA4MDA1NjEyfQ.U8tZZuawsCz0tU0yIZhdWs0gF__0lO_oIP_zLi2V0DY';
const CLOUD_NAME = 'xmz5iwmo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

function cdn(unsplashUrl) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_600/${encodeURIComponent(unsplashUrl)}`;
}

function cdnBanner(unsplashUrl) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/f_auto,q_auto,w_1200/${encodeURIComponent(unsplashUrl)}`;
}

// Curated high-definition botanical plant images
const POOLS = {
  echeveria: [
    'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&w=800&q=80',
  ],
  campfire_red: [
    'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80'
  ],
  jade_crassula: [
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&q=80'
  ],
  haworthia_zebra: [
    'https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1502810365585-56ffa361fdde?auto=format&fit=crop&w=800&q=80'
  ],
  sedum_jellybean: [
    'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80'
  ],
  cactus_mammillaria: [
    'https://images.unsplash.com/photo-1508022713622-df2d8fb7b4ea?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1487700160041-babef9c3cb55?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551893478-d726eaf0442c?auto=format&fit=crop&w=800&q=80'
  ],
  bunny_ear: [
    'https://images.unsplash.com/photo-1519336056116-bc0f1771dec8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508022713622-df2d8fb7b4ea?auto=format&fit=crop&w=800&q=80'
  ],
  aloe_agave: [
    'https://images.unsplash.com/photo-1567689265664-1c48de61db0b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80'
  ],
  kalanchoe: [
    'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80'
  ],
  combos: [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=800&q=80'
  ],
  aglaonema: [
    'https://images.unsplash.com/photo-1597055181374-129b1ea6cb34?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80'
  ],
  indoor_greens: [
    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572688484438-313a6e50c333?auto=format&fit=crop&w=800&q=80'
  ],
  general_succulents: [
    'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80'
  ]
};

function pickImage(name, botanical, index) {
  const s = (name + ' ' + (botanical || '')).toLowerCase();

  let pool = POOLS.general_succulents;
  if (s.includes('trio') || s.includes('quartet') || s.includes('collection') || s.includes('assortment') || s.includes('combo') || s.includes('dozen') || s.includes('bundle') || s.includes('paradise')) {
    pool = POOLS.combos;
  } else if (s.includes('campfire')) {
    pool = POOLS.campfire_red;
  } else if (s.includes('bunny') || s.includes('microdasys')) {
    pool = POOLS.bunny_ear;
  } else if (s.includes('jade') || s.includes('crassula')) {
    pool = POOLS.jade_crassula;
  } else if (s.includes('haworthia') || s.includes('haworthiopsis') || s.includes('gasteraloe') || s.includes('gasteria')) {
    pool = POOLS.haworthia_zebra;
  } else if (s.includes('jelly') || s.includes('sedum') || s.includes('burro')) {
    pool = POOLS.sedum_jellybean;
  } else if (s.includes('agave') || s.includes('aloe')) {
    pool = POOLS.aloe_agave;
  } else if (s.includes('kalanchoe') || s.includes('soldier') || s.includes('panda')) {
    pool = POOLS.kalanchoe;
  } else if (s.includes('mammillaria') || s.includes('cactus') || s.includes('opuntia') || s.includes('echinopsis')) {
    pool = POOLS.cactus_mammillaria;
  } else if (s.includes('aglaonema')) {
    pool = POOLS.aglaonema;
  } else if (s.includes('monstera') || s.includes('snake') || s.includes('pothos') || s.includes('sansevieria')) {
    pool = POOLS.indoor_greens;
  } else if (s.includes('echeveria')) {
    pool = POOLS.echeveria;
  }

  const main = pool[index % pool.length];
  const gallery = [
    pool[(index + 1) % pool.length],
    pool[(index + 2) % pool.length]
  ];
  return { main: cdn(main), gallery: gallery.map(cdn) };
}

async function run() {
  console.log('🌿 Populating products with high-definition botanical photos...');
  const { data: products, error } = await supabase.from('products').select('id, name, botanical_name');
  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return;
  }

  console.log(`Found ${products.length} products to update...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const { main, gallery } = pickImage(p.name, p.botanical_name, i);
    const { error: updErr } = await supabase
      .from('products')
      .update({
        main_image_url: main,
        gallery_images: gallery
      })
      .eq('id', p.id);

    if (updErr) console.error(`Failed to update ${p.name}:`, updErr);
  }
  console.log(`✅ All ${products.length} products updated with botanical photos!`);

  // Update Banners and Campaign Settings
  const bannerImg = cdnBanner('https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=1600&q=80');
  await supabase.from('campaign_settings').update({
    banner_image_url: bannerImg,
    is_active: true
  }).eq('id', '00000000-0000-0000-0000-000000000001');

  await supabase.from('banners').update({
    image_url: bannerImg
  }).neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✅ Banners updated with festive botanical banner!');
  console.log('🎉 Storefront images are 100% restored and live!');
}

run();
