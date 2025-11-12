import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { Database } from "../db/database.types";
import type { AstroCookies } from "astro";

/**
 * Creates a Supabase client for server-side use (SSR)
 * Reads and writes auth cookies from/to Astro request/response
 *
 * @param request - Astro.request object
 * @param cookies - Astro.cookies object from context
 * @param env - Optional runtime.env from Cloudflare (for production)
 * @returns Supabase client with session from cookies
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
  env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }
) {
  // For Cloudflare Pages, use runtime.env; for local dev, use import.meta.env
  const supabaseUrl = env?.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Parse cookies from request header and filter out undefined values
        const parsedCookies = parseCookieHeader(request.headers.get("Cookie") ?? "");
        return parsedCookies
          .filter((cookie): cookie is { name: string; value: string } => cookie.value !== undefined)
          .map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
