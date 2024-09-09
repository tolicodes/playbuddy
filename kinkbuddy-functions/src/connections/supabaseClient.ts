import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_HOST!;
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY!;
console.log('supabaseUrl', supabaseUrl)

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

export { supabaseClient };
