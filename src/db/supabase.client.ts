import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_URL environment variable. " + "Please add it to .env file (see .env.example)"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_KEY environment variable. " + "Please add it to .env file (see .env.example)"
  );
}

/**
 * Supabase client for CLIENT-SIDE use (browser)
 *
 * Uses @supabase/ssr's createBrowserClient which automatically:
 * - Stores auth session in cookies (not localStorage)
 * - Syncs session between tabs
 * - Works with SSR (server can read cookies)
 *
 * @example Client-side usage
 * ```tsx
 * import { supabaseClient } from "@/db/supabase.client";
 *
 * // Login form, client components, etc.
 * const { data, error } = await supabaseClient.auth.signInWithPassword({
 *   email, password
 * });
 * ```
 */
export const supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
