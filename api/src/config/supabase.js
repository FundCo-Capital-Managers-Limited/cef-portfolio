const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Service-role client for backend use only — never expose this key to the frontend.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
