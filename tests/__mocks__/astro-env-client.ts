/**
 * Mock for astro:env/client module in Vitest tests
 * Provides environment variables from process.env for client-side code
 */

export const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "https://test.supabase.co";
export const PUBLIC_SUPABASE_KEY = process.env.PUBLIC_SUPABASE_KEY || "test-anon-key";
