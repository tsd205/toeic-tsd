// Copy the Project URL and anon/publishable key from Supabase > Project Settings > API.
// Safe to expose the publishable/anon key in browser code ONLY when RLS is enabled.
// NEVER put the service_role or secret key in this file.
window.TOEIC_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_PROJECT_URL",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
