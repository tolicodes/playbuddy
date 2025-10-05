import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_HOST!;
const supabaseAdminKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export { supabaseClient };
