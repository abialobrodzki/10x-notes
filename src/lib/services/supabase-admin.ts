import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

/**
 * Supabase admin client with service role key
 *
 * WARNING: This client has full access to the database and bypasses RLS policies.
 * Only use server-side for administrative operations like logging, migrations, etc.
 * NEVER expose this client or service role key to the client-side.
 */

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

/**
 * Admin client for server-side operations that require elevated privileges
 * Used for: LLM generation logging, user account deletion, service operations
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
