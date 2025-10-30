import { createSupabaseServerClient } from "../../../lib/supabase-server";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/auth/logout
 *
 * Sign out current user and clear auth session
 * Uses server-side Supabase client to properly manage auth cookies
 *
 * Security:
 * - Server-side only (cookies httpOnly, secure, sameSite)
 * - Clears all auth-related cookies
 * - Invalidates JWT token
 *
 * @returns 200 - Logout successful
 * @returns 400 - Logout failed
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Create server-side Supabase client
    const supabase = createSupabaseServerClient(request, cookies);

    // Step 2: Sign out user
    const { error } = await supabase.auth.signOut();

    // Step 3: Handle sign out errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error.message);

      return new Response(
        JSON.stringify({
          error: "Logout failed",
          message: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return success response
    return new Response(
      JSON.stringify({
        message: "Wylogowano pomyślnie",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/logout:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
