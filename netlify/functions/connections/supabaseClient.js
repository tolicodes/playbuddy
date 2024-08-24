const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eevykpzkermogzscjglo.supabase.co';
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

export { supabaseClient }