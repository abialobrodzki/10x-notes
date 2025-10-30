import { createSupabaseServerClient } from "../../../lib/supabase-server";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * POST /api/auth/register
 *
 * Register a new user with email and password
 * Uses server-side Supabase client to properly manage auth cookies
 *
 * Security:
 * - Server-side only (cookies httpOnly, secure, sameSite)
 * - Email confirmation required (Supabase sends confirmation link)
 * - Rate limiting should be implemented in production
 *
 * @returns 200 - Registration successful (check email for confirmation)
 * @returns 201 - Registration successful with immediate session (if email confirmation disabled)
 * @returns 400 - Validation error or registration failed
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

    // Step 4: Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Email redirect after confirmation
        emailRedirectTo: `${new URL(request.url).origin}/login`,
      },
    });

    // Step 5: Handle registration errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", error.message);

      // Return user-friendly error messages
      let errorMessage = error.message;

      if (error.message.includes("User already registered")) {
        errorMessage = "Ten adres email jest już zarejestrowany";
      } else if (error.message.includes("Password should be at least")) {
        errorMessage = "Hasło musi mieć co najmniej 8 znaków";
      } else if (error.message.includes("Unable to validate email")) {
        errorMessage = "Nieprawidłowy format adresu email";
      } else if (error.message.includes("Email rate limit exceeded")) {
        errorMessage = "Zbyt wiele prób rejestracji. Spróbuj ponownie później.";
      }

      return new Response(
        JSON.stringify({
          error: "Registration failed",
          message: errorMessage,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Check registration result
    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: "Registration failed",
          message: "Nie udało się utworzyć konta użytkownika",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Return success response
    // If session exists, user is logged in immediately (email confirmation disabled)
    // If no session, email confirmation is required
    if (data.session) {
      // Immediate session - email confirmation disabled in Supabase
      return new Response(
        JSON.stringify({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          session: true,
          message: "Rejestracja udana! Zostałeś automatycznie zalogowany.",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Email confirmation required
      return new Response(
        JSON.stringify({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          session: false,
          message:
            "Rejestracja udana! Sprawdź swoją skrzynkę email i kliknij link potwierdzający, aby aktywować konto.",
          requiresConfirmation: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/register:", error);

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
