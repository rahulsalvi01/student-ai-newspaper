import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

/**
 * Checks if Supabase connection environment variables are available.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Server-only Supabase client with service-role privileges.
 * 
 * Invariants:
 * - NEVER call this from client/browser components.
 * - Service-role key bypasses RLS for scheduled background runs and ingest.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: getSupabaseAdminClient must NEVER be invoked in the browser.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Public Supabase client using anon key.
 * Subject to Row Level Security (RLS) policies.
 */
export function getSupabasePublicClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, anonKey);
}
