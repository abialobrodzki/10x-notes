import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { TagsService } from "../../../lib/services/tags.service";
import {
  tagsListQuerySchema,
  type TagsListQueryInput,
  createTagSchema,
  type CreateTagInput,
} from "../../../lib/validators/tags.schemas";
import type { TagsListDTO, TagDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/tags
 *
 * Get list of user's tags with statistics
 * Returns owned tags and optionally shared tags (via tag_access)
 * Authentication required via JWT Bearer token
 *
 * @param request.query - Query parameters for filtering
 * @returns 200 - Tags list with statistics and X-Total-Count header
 * @returns 400 - Invalid query parameters
 * @returns 401 - Missing or invalid authentication token
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Parse URL search parameters
    const searchParams = Object.fromEntries(url.searchParams);

    // Step 3: Validate query parameters with Zod schema
    const validationResult = tagsListQuerySchema.safeParse(searchParams);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Invalid query parameters",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedQuery: TagsListQueryInput = validationResult.data;

    // Step 4: Get tags from service
    const tagsService = new TagsService(locals.supabase);
    let result: TagsListDTO;

    try {
      result = await tagsService.getTags(userId, validatedQuery);
    } catch (error) {
      // Handle service errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // eslint-disable-next-line no-console
      console.error("TagsService error:", {
        userId,
        query: validatedQuery,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch tags",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return successful response with X-Total-Count header
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Total-Count": result.tags.length.toString(),
      },
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/tags:", error);

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

/**
 * POST /api/tags
 *
 * Create a new tag for current user
 * Tag name must be unique within user's tags (case-insensitive)
 * Authentication required via JWT Bearer token
 *
 * @param request.body - Tag creation data (name)
 * @returns 201 - Created tag
 * @returns 400 - Invalid request body or validation errors
 * @returns 401 - Missing or invalid authentication token
 * @returns 409 - Tag with this name already exists
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Require authentication
    const { userId } = await requireAuth(locals.supabase);

    // Step 2: Parse request body
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

    // Step 3: Validate request body with Zod schema
    const validationResult = createTagSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: "Invalid request body",
          details: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedInput: CreateTagInput = validationResult.data;

    // Step 4: Create tag via service
    const tagsService = new TagsService(locals.supabase);
    let result: TagDTO;

    try {
      result = await tagsService.createTag(userId, validatedInput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error case: duplicate tag name
      if (errorMessage === "TAG_NAME_ALREADY_EXISTS") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Tag with this name already exists",
            details: "A tag with this name already exists in your account. Please use a different name.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagsService.createTag error:", {
        userId,
        input: validatedInput,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to create tag",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return 201 Created with tag data
    return new Response(JSON.stringify(result), {
      status: 201,
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
    console.error("Unexpected error in POST /api/tags:", error);

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
