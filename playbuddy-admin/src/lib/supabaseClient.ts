import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_HOST!;
const supabaseAdminKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

console.log('REACT_APP_SUPABASE_HOST', process.env.REACT_APP_SUPABASE_HOST);
console.log('REACT_APP_SUPABASE_ANON_KEY', process.env.REACT_APP_SUPABASE_ANON_KEY);

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

export { supabaseClient };
