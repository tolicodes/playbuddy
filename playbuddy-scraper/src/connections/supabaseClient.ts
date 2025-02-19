import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

import { Client } from 'pg';

const supabaseUrl = process.env.SUPABASE_HOST!;
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY!;

const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

export { supabaseClient };

// Replace with your actual Supabase connection details
export const pgSupabaseClient = new Client({
    host: process.env.SUPABASE_HOST,
    port: 5432,
    user: 'postgres',
    password: 'jvz7bza9WEU_bct!pyv',
    database: 'postgres'
});

