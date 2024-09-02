import { createClient } from "@supabase/supabase-js";
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://bsslnznasebtdktzxjqu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2xuem5hc2VidGRrdHp4anF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzYwNzgsImV4cCI6MjA0MDM1MjA3OH0.rdfoT5OTyOy5Pd5-b-pde7RXvmlza8JM-BM4DENKx9M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});