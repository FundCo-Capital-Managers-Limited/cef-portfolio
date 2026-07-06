const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Secret-key client for backend use only — never expose this key to the frontend.
// Bypasses RLS entirely, same role the old service_role key played.
const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
