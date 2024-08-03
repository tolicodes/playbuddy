import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eevykpzkermogzscjglo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnlrcHprZXJtb2d6c2NqZ2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NzU5NDgsImV4cCI6MjAzNDE1MTk0OH0.m9Gk5k8aZ6rm84w7yAkO8TKJG6ZU4DWQCWYf7yOwhNE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);