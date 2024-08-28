const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

console.log('PROCESS ENV', process.env);
const supabaseUrl = process.env.SUPABASE_HOST;
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

module.exports = { supabaseClient };