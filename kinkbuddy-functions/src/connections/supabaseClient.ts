import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = "https://eevykpzkermogzscjglo.supabase.co";
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY!;

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

export { supabaseClient };
