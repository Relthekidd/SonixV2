// Re-export the Supabase client created in the AuthProvider so that all
// services share the same instance and therefore the same auth session.
export { supabase } from '../providers/AuthProvider';
