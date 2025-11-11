/**
 * Mock for astro:env/server module in Vitest tests
 * Provides environment variables from process.env for server-side code
 *
 * Note: These are getter functions to allow vi.stubEnv() to work dynamically.
 * Direct const exports would freeze values at import time.
 */

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || "test-openrouter-key";
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// Re-export as named exports for compatibility
export const OPENROUTER_API_KEY = getOpenRouterApiKey();
export const SUPABASE_SERVICE_ROLE_KEY = getSupabaseServiceRoleKey();
