import type { Database } from "../../db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Authentication result
 */
export interface AuthResult {
  /** Authenticated user ID */
  userId: string;
  /** User email */
  email: string;
}

/**
 * Authentication error response
 */
export interface AuthError {
  error: string;
  message: string;
}

/**
 * Require authentication for API endpoint
 *
 * Validates JWT token and extracts user information
 * Returns 401 Unauthorized if token is missing or invalid
 *
 * @param supabase - Supabase client (from context.locals)
 * @returns AuthResult with user ID and email
 * @throws Response with 401 if authentication fails
 *
 * @example
 * ```typescript
 * export const GET: APIRoute = async ({ locals }) => {
 *   const { userId, email } = await requireAuth(locals.supabase);
 *   // ... continue with authenticated user
 * };
 * ```
 */
export async function requireAuth(supabase: SupabaseClient<Database>): Promise<AuthResult> {
  try {
    // Get user from JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Check for authentication errors
    if (error) {
      throw new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: error.message,
        } satisfies AuthError),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if user exists
    if (!user) {
      throw new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Missing or invalid authentication token",
        } satisfies AuthError),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate user has required fields
    if (!user.email) {
      throw new Response(
        JSON.stringify({
          error: "Invalid user data",
          message: "User email not found",
        } satisfies AuthError),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return {
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    // If error is already a Response, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    // Otherwise, create a generic authentication error
    throw new Response(
      JSON.stringify({
        error: "Authentication failed",
        message: "An unexpected error occurred during authentication",
      } satisfies AuthError),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Optional authentication - returns user ID if authenticated, null otherwise
 * Does not throw errors - useful for endpoints that support both authenticated and anonymous access
 *
 * @param supabase - Supabase client (from context.locals)
 * @returns User ID if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * export const GET: APIRoute = async ({ locals }) => {
 *   const userId = await optionalAuth(locals.supabase);
 *   // userId will be string | null
 * };
 * ```
 */
export async function optionalAuth(supabase: SupabaseClient<Database>): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    // Silently fail - return null for anonymous access
    return null;
  }
}
