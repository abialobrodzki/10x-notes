import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { UserService } from "../../../lib/services/user.service";
import type { UserStatsDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/user/stats
 *
 * Get current user's statistics
 * Returns aggregated metrics including:
 * - AI generation statistics (from user_generation_stats view)
 * - Total notes count
 * - Total tags count
 *
 * Performance: Executes 3 queries in parallel (~50ms P50, ~100ms P95)
 *
 * Authentication: Required (JWT Bearer token)
 * Rate limiting: 10000 requests per hour per user (very permissive for dashboard)
 * User can only access their own statistics
 *
 * @returns 200 - User statistics (flat structure with 7 fields)
 * @returns 401 - Missing or invalid authentication token
 * @returns 500 - Internal server error (database query failure)
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Fetch user statistics via service
    const userService = new UserService(locals.supabase);
    let result: UserStatsDTO;

    try {
      result = await userService.getUserStats(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log database errors for monitoring
      // eslint-disable-next-line no-console
      console.error("UserService.getUserStats error:", {
        userId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch user statistics",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Return successful response with statistics
    // Note: All null values have been coalesced to 0 in the service layer
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
    console.error("Unexpected error in GET /api/user/stats:", error);

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
