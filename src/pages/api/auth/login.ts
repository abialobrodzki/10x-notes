import { createSupabaseServerClient } from "../../../lib/supabase-server";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/auth/login
 *
 * Authenticate user with email and password
 * Uses server-side Supabase client to properly manage auth cookies
 *
 * Security:
 * - Server-side only (cookies httpOnly, secure, sameSite)
 * - Validates email confirmation status
 * - Rate limiting should be implemented in production
 *
 * @returns 200 - Login successful
 * @returns 400 - Validation error or authentication failed
 * @returns 401 - Invalid credentials
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

    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: "Missing fields",
          message: "Email and password are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Create server-side Supabase client
    const supabase = createSupabaseServerClient(request, cookies);

    // Step 4: Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // Step 5: Handle authentication errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Login error:", error.message);

      // Return user-friendly error messages
      let errorMessage = error.message;
      let statusCode = 400;

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Nieprawidłowy email lub hasło";
        statusCode = 401;
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Potwierdź swój adres email przed zalogowaniem. Sprawdź swoją skrzynkę pocztową.";
        statusCode = 401;
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Zbyt wiele prób logowania. Spróbuj ponownie później.";
        statusCode = 429;
      }

      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: errorMessage,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Validate session
    if (!data.session) {
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: "Nie udało się utworzyć sesji",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Return success response
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        message: "Logowanie udane",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/login:", error);

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
