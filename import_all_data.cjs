// import_all_data.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wrkoyhjzgxyexyfmwnwb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya295aGp6Z3h5ZXh5Zm13bndiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQyOTYxMiwiZXhwIjoyMTA4MDA1NjEyfQ.U8tZZuawsCz0tU0yIZhdWs0gF__0lO_oIP_zLi2V0DY';
const CLOUDINARY_CLOUD_NAME = 'xmz5iwmo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const DOWNLOADS = 'C:\\Users\\prati\\Downloads';

// Helper to parse CSV properly handling quoted newlines and commas
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(f => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx] !== undefined ? row[idx] : null;
      if (val === '') val = null;
      obj[h] = val;
    });
    return obj;
  });
}

function convertToCloudinary(url) {
  if (!url) return url;
  if (url.includes('supabase.co/storage')) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto,w_600/${encodeURIComponent(url)}`;
  }
  return url;
}

function parseArrayField(val) {
  if (!val) return null;
  val = val.trim();
  if (val.startsWith('{') && val.endsWith('}')) {
    const inner = val.slice(1, -1);
    if (!inner) return [];
    return inner.split(',').map(s => s.replace(/^"|"$/g, '').trim());
  }
  if (val.startsWith('[') && val.endsWith(']')) {
    try {
      return JSON.parse(val);
    } catch (_) {}
  }
  return [val];
}

async function run() {
  console.log('🚀 Starting automated data migration into new Supabase project...');

  // 1. Categories
  try {
    const file = path.join(DOWNLOADS, 'categories_rows.csv');
    if (fs.existsSync(file)) {
      console.log('Importing categories...');
      const records = parseCSV(fs.readFileSync(file, 'utf-8'));
      const cleaned = records.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        image_url: convertToCloudinary(r.image_url),
        created_at: r.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('categories').upsert(cleaned, { onConflict: 'name' });
      if (error) console.error('Categories error:', error);
      else console.log(`✅ Categories imported: ${cleaned.length} rows`);
    }
  } catch (e) {
    console.error('Error in categories:', e);
  }

  // 2. Products
  try {
    const file = path.join(DOWNLOADS, 'products_rows.csv');
    if (fs.existsSync(file)) {
      console.log('Importing products...');
      const records = parseCSV(fs.readFileSync(file, 'utf-8'));
      const cleaned = records.map(r => {
        const gallery = parseArrayField(r.gallery_images);
        const tags = parseArrayField(r.tags);
        const galleryAlt = parseArrayField(r.gallery_alt_texts);
        const comboIds = parseArrayField(r.combo_product_ids);

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          botanical_name: r.botanical_name,
          description: r.description,
          care_guide: r.care_guide,
          category_id: r.category_id || null,
          main_image_url: convertToCloudinary(r.main_image_url),
          gallery_images: gallery ? gallery.map(convertToCloudinary) : null,
          base_price: r.base_price ? parseFloat(r.base_price) : 0,
          sale_price: r.sale_price ? parseFloat(r.sale_price) : null,
          stock_status: r.stock_status || 'in_stock',
          status: r.status || 'active',
          is_featured: r.is_featured === 'true' || r.is_featured === 't',
          tags: tags,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
          seo_title: r.seo_title,
          meta_description: r.meta_description,
          main_image_alt: r.main_image_alt,
          gallery_alt_texts: galleryAlt,
          priority: r.priority ? parseInt(r.priority) : 0,
          actual_price: r.actual_price ? parseFloat(r.actual_price) : null,
          combo_product_ids: comboIds,
          scarcity_status: r.scarcity_status || 'none',
          scarcity_value: r.scarcity_value ? parseInt(r.scarcity_value) : 0,
        };
      });

      // Batch insert in chunks of 50
      for (let i = 0; i < cleaned.length; i += 50) {
        const chunk = cleaned.slice(i, i + 50);
        const { error } = await supabase.from('products').upsert(chunk);
        if (error) console.error(`Products chunk ${i} error:`, error);
      }
      console.log(`✅ Products imported: ${cleaned.length} rows`);
    }
  } catch (e) {
    console.error('Error in products:', e);
  }

  // 3. Campaign Settings
  try {
    const file = path.join(DOWNLOADS, 'campaign_settings_rows.csv');
    if (fs.existsSync(file)) {
      console.log('Importing campaign settings...');
      const records = parseCSV(fs.readFileSync(file, 'utf-8'));
      const cleaned = records.map(r => ({
        id: r.id,
        campaign_name: r.campaign_name,
        banner_text: r.banner_text,
        is_active: r.is_active === 'true' || r.is_active === 't',
        end_type: r.end_type || 'manual',
        end_date: r.end_date || null,
        created_at: r.created_at || new Date().toISOString(),
        banner_image_url: convertToCloudinary(r.banner_image_url),
        banner_overlay_opacity: r.banner_overlay_opacity ? parseFloat(r.banner_overlay_opacity) : 0.65
      }));
      const { error } = await supabase.from('campaign_settings').upsert(cleaned);
      if (error) console.error('Campaign settings error:', error);
      else console.log(`✅ Campaign settings imported: ${cleaned.length} rows`);
    }
  } catch (e) {
    console.error('Error in campaign settings:', e);
  }

  // 4. Banners
  try {
    const file = path.join(DOWNLOADS, 'banners_rows.csv');
    if (fs.existsSync(file)) {
      console.log('Importing banners...');
      const records = parseCSV(fs.readFileSync(file, 'utf-8'));
      const cleaned = records.map(r => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        image_url: convertToCloudinary(r.image_url),
        link_url: r.link_url,
        button_text: r.button_text,
        display_order: r.display_order ? parseInt(r.display_order) : 0,
        is_active: r.is_active === 'true' || r.is_active === 't',
        created_at: r.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('banners').upsert(cleaned);
      if (error) console.error('Banners error:', error);
      else console.log(`✅ Banners imported: ${cleaned.length} rows`);
    }
  } catch (e) {
    console.error('Error in banners:', e);
  }

  // 5. Coupons
  try {
    const file = path.join(DOWNLOADS, 'coupons_rows.csv');
    if (fs.existsSync(file)) {
      console.log('Importing coupons...');
      const records = parseCSV(fs.readFileSync(file, 'utf-8'));
      const cleaned = records.map(r => ({
        id: r.id,
        code: r.code,
        discount_type: r.discount_type,
        discount_value: r.discount_value ? parseFloat(r.discount_value) : 0,
        min_purchase: r.min_purchase ? parseFloat(r.min_purchase) : 0,
        max_uses: r.max_uses ? parseInt(r.max_uses) : null,
        used_count: r.used_count ? parseInt(r.used_count) : 0,
        valid_from: r.valid_from || new Date().toISOString(),
        valid_until: r.valid_until || null,
        is_active: r.is_active === 'true' || r.is_active === 't',
        created_at: r.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('coupons').upsert(cleaned);
      if (error) console.error('Coupons error:', error);
      else console.log(`✅ Coupons imported: ${cleaned.length} rows`);
    }
  } catch (e) {
    console.error('Error in coupons:', e);
  }

  console.log('🎉 Core data import completed successfully!');
}

run();
