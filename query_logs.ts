import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, shiprocket_response, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
  } else {
    console.dir(data, { depth: null });
  }
}

main();
