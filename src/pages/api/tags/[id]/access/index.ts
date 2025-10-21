import { requireAuth } from "../../../../../lib/middleware/auth.middleware";
import { TagAccessService } from "../../../../../lib/services/tag-access.service";
import {
  tagIdParamSchema,
  grantTagAccessSchema,
  type GrantTagAccessInput,
} from "../../../../../lib/validators/tags.schemas";
import type { TagAccessListDTO, TagAccessGrantedDTO } from "../../../../../types";
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

/**
 * POST /api/tags/{id}/access
 *
 * Grant access to a tag to another user by email
 * Only tag owner can grant access
 * Recipient must exist in the system with confirmed email
 * Authentication required via JWT Bearer token
 *
 * @param params.id - Tag ID (UUID)
 * @param request.body - Grant access data (recipient_email)
 * @returns 201 - Access granted successfully
 * @returns 400 - Invalid UUID format, invalid email, or email not confirmed
 * @returns 401 - Missing or invalid authentication token
 * @returns 403 - Not owner or attempting to share with self
 * @returns 404 - Tag not found or recipient user not found
 * @returns 409 - Recipient already has access to this tag
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

    const uuidValidation = tagIdParamSchema.safeParse({ id: tagId });

    if (!uuidValidation.success) {
      const errors = uuidValidation.error.errors.map((err) => ({
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

    // Step 3: Parse and validate request body
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

    const bodyValidation = grantTagAccessSchema.safeParse(body);

    if (!bodyValidation.success) {
      const errors = bodyValidation.error.errors.map((err) => ({
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

    const validatedInput: GrantTagAccessInput = bodyValidation.data;

    // Step 4: Grant tag access via service
    const tagAccessService = new TagAccessService(locals.supabase);
    let result: TagAccessGrantedDTO;

    try {
      result = await tagAccessService.grantTagAccess(userId, tagId, validatedInput.recipient_email);
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
            message: "Forbidden: Only tag owner can grant access",
            details: "You are not the owner of this tag",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "USER_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not found",
            message: "User with this email not found",
            details: "The recipient email address is not registered in the system",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "USER_EMAIL_NOT_CONFIRMED") {
        return new Response(
          JSON.stringify({
            error: "Bad request",
            message: "Recipient email not confirmed",
            details: "The recipient must confirm their email address before receiving access",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "CANNOT_SHARE_WITH_SELF") {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Cannot share tag with yourself",
            details: "You cannot grant access to your own email address",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (errorMessage === "DUPLICATE_ACCESS") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Recipient already has access to this tag",
            details: "This user already has access to the tag",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic service error
      // eslint-disable-next-line no-console
      console.error("TagAccessService.grantTagAccess error:", {
        userId,
        tagId,
        recipientEmail: validatedInput.recipient_email,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: "Failed to grant tag access",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return 201 Created with granted access details
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
    console.error("Unexpected error in POST /api/tags/[id]/access:", error);

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
