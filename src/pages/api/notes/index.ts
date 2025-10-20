import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { NotesService } from "../../../lib/services/notes.service";
import { notesListQuerySchema, type NotesListQueryInput } from "../../../lib/validators/notes.schemas";
import type { NotesListDTO } from "../../../types";
import type { APIRoute } from "astro";

// Disable prerendering - this is a dynamic API endpoint
export const prerender = false;

/**
 * GET /api/notes
 *
 * Get paginated list of user's notes with filtering and sorting
 * Authentication required via JWT Bearer token
 *
 * @param request.query - Query parameters for filtering, sorting, and pagination
 * @returns 200 - Paginated notes list with metadata
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
    const validationResult = notesListQuerySchema.safeParse(searchParams);

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

    const validatedQuery: NotesListQueryInput = validationResult.data;

    // Step 4: Get notes from service
    const notesService = new NotesService(locals.supabase);
    let result: NotesListDTO;

    try {
      result = await notesService.getNotes(userId, validatedQuery);
    } catch (error) {
      // Handle service errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // eslint-disable-next-line no-console
      console.error("NotesService error:", {
        userId,
        query: validatedQuery,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to fetch notes",
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
        "X-Total-Count": result.pagination.total.toString(),
      },
    });
  } catch (error) {
    // Catch authentication errors (thrown as Response by requireAuth)
    if (error instanceof Response) {
      return error;
    }

    // Catch-all for unexpected errors
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/notes:", error);

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
