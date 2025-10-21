import { requireAuth } from "../../../../../lib/middleware/auth.middleware";
import { TagAccessService } from "../../../../../lib/services/tag-access.service";
import { tagIdParamSchema } from "../../../../../lib/validators/tags.schemas";
import type { TagAccessListDTO } from "../../../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/tags/{id}/access
 *
 * Get list of users with access to a tag
 * Only tag owner can view the access list
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Tag ID (UUID)
 * @returns 200 - List of recipients with access
 * @returns 400 - Invalid UUID format
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner (only tag owner can view access list)
 * @returns 404 - Tag not found
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Validate UUID parameter
    const tagId = params.id;

    if (!tagId) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Tag ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validationResult = tagIdParamSchema.safeParse({ id: tagId });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid tag ID format",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Get tag access list via service
    const tagAccessService = new TagAccessService(locals.supabase);
    let result: TagAccessListDTO;

    try {
      result = await tagAccessService.getTagAccess(userId, tagId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "TAG_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "Tag not found",
            details: "The requested tag does not exist",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "TAG_NOT_OWNED") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Forbidden: Only tag owner can view access list",
            details: "You are not the owner of this tag",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagAccessService.getTagAccess error:", {
        userId,
        tagId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch tag access list",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return 200 OK with access list
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
    console.error("Unexpected error in GET /api/tags/[id]/access:", error);

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
