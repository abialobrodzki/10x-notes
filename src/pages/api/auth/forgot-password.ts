import { createSupabaseServerClient } from "../../../lib/supabase-server";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/auth/forgot-password
 *
 * Request password reset email
 * Anonymous endpoint - no authentication required
 *
 * Security:
 * - Rate limiting should be implemented in production
 * - Doesn't reveal if email exists (security best practice)
 * - Supabase sends password reset email with secure token
 *
 * @returns 200 - Email sent (or email doesn't exist - don't reveal)
 * @returns 400 - Validation error
 * @returns 429 - Too many requests
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate input
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          message: "Request body must be an object",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = body as { email?: string };

    if (!email) {
      return new Response(
        JSON.stringify({
          error: "Missing field",
          message: "Email is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Create server-side Supabase client
    const supabase = createSupabaseServerClient(request, cookies);

    // Step 4: Request password reset email from Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${new URL(request.url).origin}/reset-password`,
    });

    // Step 5: Handle errors
    // IMPORTANT: For security, don't reveal if email exists in database
    // Always return success even if email doesn't exist
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Password reset request error:", error.message);

      // Check for rate limiting
      if (error.message.includes("Email rate limit exceeded")) {
        return new Response(
          JSON.stringify({
            error: "Too many requests",
            message: "Zbyt wiele prób. Spróbuj ponownie za kilka minut.",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // For other errors, still return success (don't reveal details)
      // This prevents email enumeration attacks
    }

    // Step 6: Always return success (security best practice)
    return new Response(
      JSON.stringify({
        message:
          "Jeśli podany adres email istnieje w naszym systemie, wysłaliśmy link do resetowania hasła. Sprawdź swoją skrzynkę pocztową.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/forgot-password:", error);

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
