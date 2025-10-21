import { PublicLinksService } from "../../../lib/services/public-links.service";
import { uuidSchema } from "../../../lib/validators/shared.schemas";
import type { PublicNoteDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/public/{token}
 *
 * Get public note summary via public link token
 * Anonymous access - no authentication required
 *
 * Security considerations:
 * - Returns limited data only (summary_text, meeting_date, goal_status, created_at)
 * - Does NOT return: original_content, id, user_id, tag info, AI metadata
 * - Only works if link is enabled (is_enabled = true)
 * - Returns 404 for all access denial cases (don't reveal why)
 * - SEO protection headers (noindex, nofollow)
 * - No caching (private, no-cache)
 *
 * @param params.token - Public link token (UUID v4)
 * @returns 200 - Public note summary
 * @returns 404 - Token not found, link disabled, or invalid token format
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    // Step 1: Validate token parameter
    const token = params.token;

    if (!token) {
      // Don't reveal that token is missing - return generic 404
      return new Response(
        JSON.stringify({
          error: "Not found",
          message: "Public link not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate token format (must be UUID v4)
    const tokenValidation = uuidSchema.safeParse(token);

    if (!tokenValidation.success) {
      // Don't reveal validation error details - return generic 404
      return new Response(
        JSON.stringify({
          error: "Not found",
          message: "Public link not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Fetch public note via service (uses supabaseAdmin internally)
    // Note: PublicLinksService constructor requires a client, but getPublicNote
    // uses supabaseAdmin internally and doesn't use the instance client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicLinksService = new PublicLinksService({} as any);

    let result: PublicNoteDTO | null;

    try {
      result = await publicLinksService.getPublicNote(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log error for debugging (server-side only)
      // eslint-disable-next-line no-console
      console.error("PublicLinksService.getPublicNote error:", {
        token,
        error: errorMessage,
      });

      // Don't reveal internal errors - return generic 500
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch public note",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Handle not found (null result)
    if (!result) {
      // Token doesn't exist, link disabled, or other access denial
      // Return same 404 for all cases (security best practice)
      return new Response(
        JSON.stringify({
          error: "Not found",
          message: "Public link not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return successful response with security headers
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // SEO protection - prevent search engines from indexing
        "X-Robots-Tag": "noindex, nofollow",
        // No caching - ensure fresh data and respect is_enabled changes
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/public/[token]:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
