import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { UserService } from "../../../lib/services/user.service";
import type { UserProfileDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/user/profile
 *
 * Get current user's profile information
 * Returns basic user data from Supabase Auth (id, email, created_at)
 *
 * Authentication: Required (JWT Bearer token)
 * User can only access their own profile
 *
 * @returns 200 - User profile
 * @returns 401 - Missing or invalid authentication token
 * @returns 404 - User not found (edge case - shouldn't happen for authenticated users)
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Fetch user profile via service
    const userService = new UserService(locals.supabase);
    let result: UserProfileDTO | null;

    try {
      result = await userService.getUserProfile(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "USER_ID_MISMATCH") {
        // Security violation - logged in user ID doesn't match session
        // eslint-disable-next-line no-console
        console.error("USER_ID_MISMATCH: Security violation detected!", {
          userId,
          error: errorMessage,
        });

        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Access denied",
            details: "User ID mismatch",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("UserService.getUserProfile error:", {
        userId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch user profile",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Handle not found (edge case - shouldn't happen for authenticated users)
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Not found",
          message: "User not found",
          details: "The authenticated user profile does not exist",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return successful response with user profile
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/user/profile:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
