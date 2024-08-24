const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eevykpzkermogzscjglo.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnlrcHprZXJtb2d6c2NqZ2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA0NDQ5MzgsImV4cCI6MjAyNjAyMDkzOH0.NqwryNUnGBFWltW7csIod_WC6ZZ1r1RoSxykyquUllA';

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export { supabaseClient }