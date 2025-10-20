import { requireAuth } from "../../../lib/middleware/auth.middleware";
import { NotesService } from "../../../lib/services/notes.service";
import {
  notesListQuerySchema,
  type NotesListQueryInput,
  createNoteSchema,
  type CreateNoteInput,
} from "../../../lib/validators/notes.schemas";
import type { NotesListDTO, NoteDTO } from "../../../types";
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

/**
 * POST /api/notes
 *
 * Create a new note with tag assignment
 * Supports XOR logic: exactly one of tag_id (existing) or tag_name (find/create)
 * Auto-sets is_ai_generated = false when summary_text is null
 *
 * @param request.body - Note creation data
 * @returns 201 - Created note with tag information
 * @returns 400 - Invalid request body or validation errors
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Tag not found or access denied
 * @returns 409 - Tag creation conflict (race condition)
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
    const validationResult = createNoteSchema.safeParse(body);

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

    const validatedInput: CreateNoteInput = validationResult.data;

    // Step 4: Create note via service
    const notesService = new NotesService(locals.supabase);
    let result: NoteDTO;

    try {
      result = await notesService.createNote(userId, validatedInput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Handle specific error cases
      if (errorMessage === "TAG_NOT_FOUND_OR_ACCESS_DENIED") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Tag not found or access denied",
            details: "The specified tag does not exist or you do not have permission to use it",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Handle race condition errors (tag creation conflict)
      if (errorMessage.includes("race condition") || errorMessage.includes("unique constraint")) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Tag creation conflict, please retry",
            details: "Another request created the tag simultaneously. Please retry your request.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("NotesService.createNote error:", {
        userId,
        input: { ...validatedInput, original_content: "[REDACTED]" }, // Don't log full content
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to create note",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return 201 Created with note data
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
    console.error("Unexpected error in POST /api/notes:", error);

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
